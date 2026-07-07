import "server-only";

import { ApplicationError } from "@/core/errors";
import type { CompanyRequestContext } from "@/platform/auth/authenticated-context";
import { requirePermission } from "@/platform/permissions/server";

import type { InventoryProjectionRepository, InventoryProjectionScope } from "../ports/inventory-projection.repository";
import {
  applyLedgerEntryToProjectionState,
  createEmptyProjectionEngineState,
  getAvailabilitySnapshot,
  getCurrentStock,
  getHandlingUnitCurrentState,
  getLedgerBackedCurrentState,
  getSerialCurrentState,
  processInventoryProjectionEvent,
  rebuildProjectionFromLedger,
} from "./inventory-projection.engine";
import type {
  InventoryAvailabilitySnapshotQuery,
  InventoryCurrentStockQuery,
  InventoryLedgerBackedCurrentStateQuery,
  InventoryProjectionEventInput,
  InventoryProjectionRebuildResult,
} from "../types/inventory-projection";
import type { InventoryLedgerEntryDefinition, InventoryLedgerProjectionEventName } from "../types/inventory-ledger";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export class InventoryProjectionService {
  constructor(
    private readonly context: CompanyRequestContext,
    private readonly repository: InventoryProjectionRepository,
  ) {}

  private scope(): InventoryProjectionScope {
    return {
      branchId: this.context.branchId ?? null,
      companyId: this.context.companyId,
      tenantId: this.context.tenantId,
    };
  }

  async processLedgerEvent(input: InventoryProjectionEventInput) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const scope = this.scope();
    if (await this.repository.isLedgerEntryApplied(input.ledgerEntry.ledgerEntryId)) {
      return { applied: false, skippedReason: "already_applied" as const };
    }

    const runtime = await this.repository.loadRuntimeState(scope);
    const state = createEmptyProjectionEngineState(runtime ?? undefined);
    const result = processInventoryProjectionEvent(state, input);
    if (!result.applied) return result;

    await this.persistApplyResult(scope, result, input.ledgerEntry);
    return result;
  }

  async applyLedgerEntry(entry: InventoryLedgerEntryDefinition) {
    return this.processLedgerEvent({ eventName: "LedgerPostingCompleted", ledgerEntry: entry });
  }

  async rebuildProjectionFromLedger(): Promise<InventoryProjectionRebuildResult> {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const scope = this.scope();
    const runtime = await this.repository.loadRuntimeState(scope);
    const entries = await this.repository.listLedgerEntriesForReplay(scope);

    await this.repository.clearProjections(scope);
    await this.repository.clearAppliedEntries(scope);

    const rebuild = rebuildProjectionFromLedger(entries, runtime ?? undefined);
    await this.repository.saveRuntimeState(scope, rebuild.state.runtime);
    await this.repository.upsertProjections([...rebuild.state.rows.values()], scope);
    await this.repository.updateSerialIdentityProjections([...rebuild.state.serialIdentity.values()], scope);
    await this.repository.updateHandlingUnitIdentityProjections([...rebuild.state.handlingUnitIdentity.values()], scope);

    for (const ledgerEntryId of rebuild.state.appliedLedgerEntryIds) {
      const entry = entries.find((candidate) => candidate.ledgerEntryId === ledgerEntryId);
      if (!entry) continue;
      await this.repository.markLedgerEntryApplied({
        causationId: entry.causationId ?? null,
        correlationId: entry.correlationId,
        ledgerEntryId,
        projectionVersion: rebuild.state.runtime.projectionVersion,
        scope,
      });
    }

    return rebuild;
  }

  async getCurrentStock(query: InventoryCurrentStockQuery = {}) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const state = await this.loadReadState();
    return getCurrentStock(state, query);
  }

  async getSerialCurrentState(serialId: string) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const state = await this.loadReadState();
    return getSerialCurrentState(state, serialId);
  }

  async getHandlingUnitCurrentState(handlingUnitId: string) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const state = await this.loadReadState();
    return getHandlingUnitCurrentState(state, handlingUnitId);
  }

  async getAvailabilitySnapshot(query: InventoryAvailabilitySnapshotQuery = {}) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const state = await this.loadReadState();
    return getAvailabilitySnapshot(state, query);
  }

  async getLedgerBackedCurrentState(query: InventoryLedgerBackedCurrentStateQuery = {}) {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockView });
    const state = await this.loadReadState();
    return getLedgerBackedCurrentState(state, query);
  }

  private async loadReadState() {
    const scope = this.scope();
    const [runtime, rows, entries] = await Promise.all([
      this.repository.loadRuntimeState(scope),
      this.repository.listProjectionRows(scope),
      this.repository.listLedgerEntriesForReplay(scope),
    ]);

    let state = createEmptyProjectionEngineState(runtime ?? undefined);
    const rowMap = new Map(rows.map((row) => [row.anchorKey, row]));
    state = { ...state, rows: rowMap };

    for (const entry of entries) {
      const result = applyLedgerEntryToProjectionState(state, entry);
      if (result.applied) state = result.state;
    }

    return state;
  }

  private async persistApplyResult(
    scope: InventoryProjectionScope,
    result: ReturnType<typeof applyLedgerEntryToProjectionState>,
    entry: InventoryLedgerEntryDefinition,
  ) {
    if (!result.applied) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        correlationId: this.context.correlationId,
        message: "Cannot persist a projection apply result that was not applied.",
      });
    }

    await this.repository.upsertProjections(result.updatedRows, scope);
    await this.repository.updateSerialIdentityProjections(result.serialIdentityUpdates, scope);
    await this.repository.updateHandlingUnitIdentityProjections(result.handlingUnitIdentityUpdates, scope);
    await this.repository.markLedgerEntryApplied({
      causationId: entry.causationId ?? null,
      correlationId: entry.correlationId,
      ledgerEntryId: entry.ledgerEntryId,
      projectionVersion: result.state.runtime.projectionVersion,
      scope,
    });
    await this.repository.saveRuntimeState(scope, result.state.runtime);
  }
}

export type InventoryProjectionEventHandlerInput = Readonly<{
  eventName: InventoryLedgerProjectionEventName;
  ledgerEntry: InventoryLedgerEntryDefinition;
}>;

export function createInventoryProjectionEventHandlers(service: InventoryProjectionService) {
  return {
    LedgerEntryCreated: (input: InventoryProjectionEventHandlerInput) => service.processLedgerEvent(input),
    LedgerEntryReversed: (input: InventoryProjectionEventHandlerInput) => service.processLedgerEvent(input),
    LedgerPostingCompleted: (input: InventoryProjectionEventHandlerInput) => service.processLedgerEvent(input),
  } as const;
}
