import { randomUUID } from "node:crypto";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";
import { defineAuditAction } from "@/platform/audit/public-api";
import { recordAuditEvent } from "@/platform/audit/server";
import {
  createDomainEvent,
  createEventMetadata,
  defineEventName,
  type EnqueueEventOutboxInput,
} from "@/platform/integration/public-api";
import { requirePermission } from "@/platform/permissions/server";

import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import type { InventoryFoundationRepository } from "../ports/inventory.repository";
import type {
  PostStockInput,
  ReverseStockPostingInput,
  StockLedgerDirection,
  StockLedgerEntryRecord,
  StockPostingBatchRecord,
  StockPostingLineInput,
  StockPostingRpcLine,
} from "../types";

const STOCK_POSTED_EVENT = defineEventName("inventory.stock_posted");
const STOCK_REVERSED_EVENT = defineEventName("inventory.stock_reversed");
const BALANCE_UPDATED_EVENT = defineEventName("inventory.balance_updated");
const STOCK_POST_AUDIT_ACTION = defineAuditAction("inventory.stock.posted");
const STOCK_REVERSE_AUDIT_ACTION = defineAuditAction("inventory.stock.reversed");
const INVENTORY_DOCUMENT_TYPES = new Set([
  "inventory_receipt",
  "inventory_issue",
  "inventory_adjustment",
  "inventory_transfer",
  "inventory_cycle_count",
]);

export type StockPostingOutbox = Readonly<{
  enqueue(input: EnqueueEventOutboxInput): Promise<unknown>;
}>;

export class StockPostingService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: InventoryFoundationRepository,
    private readonly outbox: StockPostingOutbox,
  ) {}

  async post(input: PostStockInput): Promise<StockPostingBatchRecord> {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockPost });

    const correlationId = input.correlationId ?? this.context.correlationId;
    const entries = await this.preparePostingEntries(input, correlationId);
    await this.assertNegativeStockRule(entries);

    const batch = await this.repository.postStockEntries({
      branchId: input.branchId ?? null,
      correlationId,
      documentId: input.documentId,
      entries,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? {},
    });

    await this.recordAudit(batch, STOCK_POST_AUDIT_ACTION, input.metadata);

    return batch;
  }

  async reverse(input: ReverseStockPostingInput): Promise<StockPostingBatchRecord> {
    await requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockReverse });

    const sourceEntries = await this.repository.listLedgerEntriesForBatch(input.postingBatchId);
    if (sourceEntries.length === 0) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: "Stock posting batch has no ledger entries to reverse.",
        correlationId: input.correlationId ?? this.context.correlationId,
      });
    }

    if (sourceEntries.some((entry) => entry.reversalOfEntryId)) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Reversal entries cannot be reversed by the Sprint 9 foundation.",
        correlationId: input.correlationId ?? this.context.correlationId,
      });
    }

    const branchId = sourceEntries[0]?.branchId ?? null;
    const correlationId = input.correlationId ?? this.context.correlationId;
    const entries = sourceEntries.map((entry) => this.createReversalEntry(entry));
    await this.assertPostingDocument(input.documentId, branchId);
    await this.assertNegativeStockRule(entries);

    const batch = await this.repository.postStockEntries({
      branchId,
      correlationId,
      documentId: input.documentId,
      entries,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        ...(input.metadata ?? {}),
        reversalOfPostingBatchId: input.postingBatchId,
      },
    });

    await this.recordAudit(batch, STOCK_REVERSE_AUDIT_ACTION, input.metadata);

    return batch;
  }

  private async preparePostingEntries(input: PostStockInput, correlationId: string): Promise<readonly StockPostingRpcLine[]> {
    if (!this.context.tenantId) {
      throw new ApplicationError({ code: "AUTHORIZATION_ERROR", message: "Stock posting requires tenant context.", correlationId });
    }

    if (!input.idempotencyKey.trim()) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting requires an idempotency key.", correlationId });
    }

    if (input.lines.length === 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting requires at least one line.", correlationId });
    }

    await this.assertPostingDocument(input.documentId, input.branchId ?? null);

    return Promise.all(input.lines.map((line) => this.preparePostingLine(line, input.branchId ?? null, correlationId)));
  }

  private async assertPostingDocument(documentId: string, branchId: string | null): Promise<void> {
    const validation = await this.repository.loadPostingValidationContext({ branchId, documentId });
    const document = validation.document;

    if (!document || document.sourceModule !== "inventory" || !INVENTORY_DOCUMENT_TYPES.has(document.documentTypeKey)) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Stock posting requires an active generic inventory business document.",
        correlationId: this.context.correlationId,
      });
    }
  }

  private async preparePostingLine(
    line: StockPostingLineInput,
    branchId: string | null,
    correlationId: string,
  ): Promise<StockPostingRpcLine> {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Stock posting quantities must be positive before conversion to ledger deltas.",
        correlationId,
      });
    }

    if (line.unitCost !== undefined && line.unitCost < 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Unit cost placeholder cannot be negative.", correlationId });
    }

    if (line.totalCost !== undefined && line.totalCost < 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Total cost placeholder cannot be negative.", correlationId });
    }

    const quantityDelta = this.toQuantityDelta(line.direction, line.quantity);

    await this.repository.validatePostingLineScope({
      branchId,
      locationId: line.locationId,
      productId: line.productId,
      unitId: line.unitId,
      warehouseId: line.warehouseId,
    });

    return {
      direction: line.direction,
      location_id: line.locationId,
      lot_id: line.lotId ?? null,
      metadata: line.metadata ?? {},
      movement_type_key: line.movementTypeKey,
      product_id: line.productId,
      quantity_delta: quantityDelta,
      serial_id: line.serialId ?? null,
      total_cost: line.totalCost ?? 0,
      unit_cost: line.unitCost ?? 0,
      unit_id: line.unitId,
      warehouse_id: line.warehouseId,
    };
  }

  private createReversalEntry(entry: StockLedgerEntryRecord): StockPostingRpcLine {
    const direction = this.reverseDirection(entry.direction);

    return {
      causation_id: entry.id,
      direction,
      location_id: entry.locationId,
      lot_id: entry.lotId,
      metadata: {
        reversalOfEntryId: entry.id,
      },
      movement_type_key: "adjustment",
      product_id: entry.productId,
      quantity_delta: -entry.quantityDelta,
      reversal_of_entry_id: entry.id,
      serial_id: entry.serialId,
      total_cost: entry.totalCost,
      unit_cost: entry.unitCost,
      unit_id: entry.unitId,
      warehouse_id: entry.warehouseId,
    };
  }

  private async assertNegativeStockRule(entries: readonly StockPostingRpcLine[]): Promise<void> {
    const validation = await this.repository.loadPostingValidationContext({ documentId: entries[0]?.causation_id ?? randomUUID() });
    if (validation.allowNegativeStock) return;

    const running = new Map<string, number>();

    for (const entry of entries) {
      const key = [
        entry.product_id,
        entry.warehouse_id,
        entry.location_id,
        entry.lot_id ?? "",
        entry.serial_id ?? "",
        entry.unit_id,
      ].join(":");
      const current =
        running.get(key) ??
        (await this.repository.readQuantityOnHand({
          locationId: entry.location_id,
          lotId: entry.lot_id,
          productId: entry.product_id,
          serialId: entry.serial_id,
          unitId: entry.unit_id,
          warehouseId: entry.warehouse_id,
        }));
      const next = current + entry.quantity_delta;

      if (next < 0) {
        throw new ApplicationError({
          code: "BUSINESS_RULE_VIOLATION",
          message: "Negative stock is disabled by inventory.allow_negative_stock.",
          correlationId: this.context.correlationId,
        });
      }

      running.set(key, next);
    }
  }

  private toQuantityDelta(direction: StockLedgerDirection, quantity: number): number {
    if (direction === "in") return quantity;
    if (direction === "out") return -quantity;

    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Neutral stock entries are reserved for future non-quantity posting rules.",
      correlationId: this.context.correlationId,
    });
  }

  private reverseDirection(direction: StockLedgerDirection): StockLedgerDirection {
    if (direction === "in") return "out";
    if (direction === "out") return "in";
    return "neutral";
  }

  private async publishStockPosted(
    batch: StockPostingBatchRecord,
    entries: readonly StockPostingRpcLine[],
    correlationId: string,
  ): Promise<void> {
    await this.enqueueInventoryEvent({
      aggregateId: batch.id,
      batch,
      correlationId,
      eventName: STOCK_POSTED_EVENT,
      idempotencyKey: `inventory.stock_posted:${batch.id}`,
      payload: {
        balanceKeys: entries.map((entry) => this.balanceKeyPayload(entry)),
        postingBatchId: batch.id,
      },
    });

    await this.enqueueInventoryEvent({
      aggregateId: batch.id,
      batch,
      correlationId,
      eventName: BALANCE_UPDATED_EVENT,
      idempotencyKey: `inventory.balance_updated:${batch.id}`,
      payload: {
        balanceKeys: entries.map((entry) => this.balanceKeyPayload(entry)),
        postingBatchId: batch.id,
      },
    });
  }

  private async publishStockReversed(
    batch: StockPostingBatchRecord,
    reversedPostingBatchId: string,
    entries: readonly StockPostingRpcLine[],
    correlationId: string,
  ): Promise<void> {
    await this.enqueueInventoryEvent({
      aggregateId: batch.id,
      batch,
      correlationId,
      eventName: STOCK_REVERSED_EVENT,
      idempotencyKey: `inventory.stock_reversed:${batch.id}`,
      payload: {
        balanceKeys: entries.map((entry) => this.balanceKeyPayload(entry)),
        postingBatchId: batch.id,
        reversedPostingBatchId,
      },
    });
  }

  private async enqueueInventoryEvent(input: {
    aggregateId: string;
    batch: StockPostingBatchRecord;
    correlationId: string;
    eventName: typeof STOCK_POSTED_EVENT;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const event = createDomainEvent({
      metadata: createEventMetadata({
        aggregateId: input.aggregateId,
        aggregateType: "stock_posting_batch",
        context: this.context,
        eventId: randomUUID(),
        eventKind: "domain",
        eventName: input.eventName,
        eventVersion: 1,
        idempotencyKey: input.idempotencyKey,
        sourceModule: "inventory",
      }),
      payload: {
        ...input.payload,
        documentId: input.batch.documentId,
        tenantId: this.context.tenantId,
      },
    });

    await this.outbox.enqueue({ event, idempotencyKey: input.idempotencyKey });
  }

  private async recordAudit(
    batch: StockPostingBatchRecord,
    action: ReturnType<typeof defineAuditAction>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await recordAuditEvent({
      action,
      context: this.context,
      entityId: batch.id,
      entityType: "stock_posting_batch",
      metadata: {
        ...metadata,
        documentId: batch.documentId,
        idempotencyKey: batch.idempotencyKey,
      },
      module: "inventory",
    });
  }

  private balanceKeyPayload(entry: StockPostingRpcLine): Record<string, unknown> {
    return {
      locationId: entry.location_id,
      lotId: entry.lot_id,
      productId: entry.product_id,
      serialId: entry.serial_id,
      unitId: entry.unit_id,
      warehouseId: entry.warehouse_id,
    };
  }
}
