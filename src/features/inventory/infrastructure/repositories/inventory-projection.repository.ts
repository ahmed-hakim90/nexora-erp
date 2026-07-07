import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { CompanyRequestContext } from "@/platform/auth/authenticated-context";

import type { InventoryProjectionRepository, InventoryProjectionScope } from "../../application/ports/inventory-projection.repository";
import { buildProjectionAnchorKey } from "../../application/services/inventory-projection.engine";
import type { InventoryLedgerEntryDefinition } from "../../application/types/inventory-ledger";
import type {
  InventoryHandlingUnitIdentityProjection,
  InventoryProjectionRow,
  InventoryProjectionRuntimeState,
  InventorySerialIdentityProjection,
} from "../../application/types/inventory-projection";

const PROJECTION_COLUMNS = "id, tenant_id, company_id, branch_id, projection_kind, object_type, product_id, variant_id, lot_id, serial_id, handling_unit_id, warehouse_id, location_id, inventory_status, quantity, uom_id, custodian, derived_from_document_id, derived_from_ledger_entry_id, projection_version, projected_at, correlation_id, causation_id";
const RUNTIME_COLUMNS = "projection_version, last_processed_ledger_entry_id, last_processed_posting_timestamp, rebuild_status, rebuild_started_at, rebuild_completed_at, rebuild_metadata";
const LEDGER_COLUMNS = "id, inventory_object_type, product_id, variant_id, lot_id, serial_id, handling_unit_id, child_handling_unit_id, warehouse_id, location_id, inventory_status, quantity_delta, uom_id, movement_direction, movement_type, document_type, document_id, document_line_id, business_module, event_type, parent_entry_id, posting_timestamp, correlation_id, causation_id, event_metadata";

function mapLedgerEntry(row: Record<string, unknown>): InventoryLedgerEntryDefinition {
  const metadata = row.event_metadata;
  return {
    businessModule: row.business_module as InventoryLedgerEntryDefinition["businessModule"],
    causationId: row.causation_id as string | null,
    childHandlingUnitId: row.child_handling_unit_id as string | null,
    correlationId: row.correlation_id as string,
    documentId: row.document_id as string | null,
    documentLineId: row.document_line_id as string | null,
    documentType: row.document_type as string,
    eventMetadata: typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : {},
    eventType: row.event_type as InventoryLedgerEntryDefinition["eventType"],
    handlingUnitId: row.handling_unit_id as string | null,
    inventoryObjectType: row.inventory_object_type as InventoryLedgerEntryDefinition["inventoryObjectType"],
    inventoryStatus: row.inventory_status as string | null,
    ledgerEntryId: row.id as string,
    locationId: row.location_id as string | null,
    lotId: row.lot_id as string | null,
    movementDirection: row.movement_direction as InventoryLedgerEntryDefinition["movementDirection"],
    movementType: row.movement_type as InventoryLedgerEntryDefinition["movementType"],
    parentEntryId: row.parent_entry_id as string | null,
    postingTimestamp: row.posting_timestamp as string,
    productId: row.product_id as string | null,
    quantityDelta: Number(row.quantity_delta),
    serialId: row.serial_id as string | null,
    uomId: row.uom_id as string | null,
    variantId: row.variant_id as string | null,
    warehouseId: row.warehouse_id as string | null,
  };
}

function mapProjectionRow(row: Record<string, unknown>): InventoryProjectionRow {
  const custodian = row.custodian;
  return {
    anchorKey: buildProjectionAnchorKey({
      handlingUnitId: row.handling_unit_id as string | null,
      inventoryStatus: row.inventory_status as InventoryProjectionRow["inventoryStatus"],
      locationId: row.location_id as string | null,
      lotId: row.lot_id as string | null,
      objectType: row.object_type as InventoryProjectionRow["objectType"],
      productId: row.product_id as string | null,
      projectionKind: row.projection_kind as InventoryProjectionRow["projectionKind"],
      serialId: row.serial_id as string | null,
      variantId: row.variant_id as string | null,
      warehouseId: row.warehouse_id as string | null,
    }),
    causationId: row.causation_id as string | null,
    correlationId: row.correlation_id as string | null,
    custodian: typeof custodian === "object" && custodian !== null && !Array.isArray(custodian)
      ? custodian as Record<string, unknown>
      : {},
    derivedFromDocumentId: row.derived_from_document_id as string | null,
    derivedFromLedgerEntryId: row.derived_from_ledger_entry_id as string,
    handlingUnitId: row.handling_unit_id as string | null,
    inventoryStatus: row.inventory_status as InventoryProjectionRow["inventoryStatus"],
    locationId: row.location_id as string | null,
    lotId: row.lot_id as string | null,
    objectType: row.object_type as InventoryProjectionRow["objectType"],
    productId: row.product_id as string | null,
    projectedAt: row.projected_at as string,
    projectionKind: row.projection_kind as InventoryProjectionRow["projectionKind"],
    projectionVersion: Number(row.projection_version),
    quantity: Number(row.quantity),
    serialId: row.serial_id as string | null,
    uomId: row.uom_id as string | null,
    variantId: row.variant_id as string | null,
    warehouseId: row.warehouse_id as string | null,
  };
}

export class SupabaseInventoryProjectionRepository implements InventoryProjectionRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: CompanyRequestContext,
  ) {}

  private async activateProjectionServiceGuard() {
    const { error } = await this.supabase.rpc("inventory_projection_service_guard");
    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        correlationId: this.context.correlationId,
        message: error.message,
      });
    }
  }

  private scopeFilters(scope: InventoryProjectionScope) {
    let query = this.supabase
      .from("inventory_current_state_projections")
      .select(PROJECTION_COLUMNS)
      .eq("tenant_id", scope.tenantId)
      .eq("company_id", scope.companyId)
      .is("deleted_at", null);

    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    else query = query.is("branch_id", null);

    return query;
  }

  async loadRuntimeState(scope: InventoryProjectionScope): Promise<InventoryProjectionRuntimeState | null> {
    let query = this.supabase
      .from("inventory_projection_runtime_state")
      .select(RUNTIME_COLUMNS)
      .eq("tenant_id", scope.tenantId)
      .eq("company_id", scope.companyId)
      .is("deleted_at", null);

    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    else query = query.is("branch_id", null);

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
    if (!data) return null;

    const row = data as Record<string, unknown>;
    const rebuildMetadata = row.rebuild_metadata;
    return {
      lastProcessedLedgerEntryId: row.last_processed_ledger_entry_id as string | null,
      lastProcessedPostingTimestamp: row.last_processed_posting_timestamp as string | null,
      projectionVersion: Number(row.projection_version),
      rebuildCompletedAt: row.rebuild_completed_at as string | null,
      rebuildMetadata: typeof rebuildMetadata === "object" && rebuildMetadata !== null && !Array.isArray(rebuildMetadata)
        ? rebuildMetadata as Record<string, unknown>
        : {},
      rebuildStartedAt: row.rebuild_started_at as string | null,
      rebuildStatus: row.rebuild_status as InventoryProjectionRuntimeState["rebuildStatus"],
    };
  }

  async saveRuntimeState(scope: InventoryProjectionScope, runtime: InventoryProjectionRuntimeState): Promise<void> {
    await this.activateProjectionServiceGuard();
    const payload = {
      branch_id: scope.branchId,
      company_id: scope.companyId,
      last_processed_ledger_entry_id: runtime.lastProcessedLedgerEntryId,
      last_processed_posting_timestamp: runtime.lastProcessedPostingTimestamp,
      projection_version: runtime.projectionVersion,
      rebuild_completed_at: runtime.rebuildCompletedAt,
      rebuild_metadata: runtime.rebuildMetadata,
      rebuild_started_at: runtime.rebuildStartedAt,
      rebuild_status: runtime.rebuildStatus,
      tenant_id: scope.tenantId,
      updated_by: this.context.userId,
    };

    const { error } = await this.supabase
      .from("inventory_projection_runtime_state")
      .upsert(payload, { onConflict: "tenant_id,company_id,branch_id" });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
  }

  async isLedgerEntryApplied(ledgerEntryId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("inventory_projection_applied_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("ledger_entry_id", ledgerEntryId)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }

    return (count ?? 0) > 0;
  }

  async markLedgerEntryApplied(input: {
    causationId?: string | null;
    correlationId?: string | null;
    ledgerEntryId: string;
    projectionVersion: number;
    scope: InventoryProjectionScope;
  }): Promise<void> {
    await this.activateProjectionServiceGuard();
    const { error } = await this.supabase.from("inventory_projection_applied_entries").insert({
      branch_id: input.scope.branchId,
      causation_id: input.causationId,
      company_id: input.scope.companyId,
      correlation_id: input.correlationId,
      created_by: this.context.userId,
      ledger_entry_id: input.ledgerEntryId,
      projection_version: input.projectionVersion,
      tenant_id: input.scope.tenantId,
    });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
  }

  async listLedgerEntriesForReplay(scope: InventoryProjectionScope): Promise<readonly InventoryLedgerEntryDefinition[]> {
    let query = this.supabase
      .from("inventory_ledger_entries")
      .select(LEDGER_COLUMNS)
      .eq("tenant_id", scope.tenantId)
      .eq("company_id", scope.companyId)
      .order("posting_timestamp", { ascending: true })
      .order("id", { ascending: true });

    if (scope.branchId) query = query.eq("branch_id", scope.branchId);

    const { data, error } = await query;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }

    return (data ?? []).map((row) => mapLedgerEntry(row as Record<string, unknown>));
  }

  async listProjectionRows(scope: InventoryProjectionScope): Promise<readonly InventoryProjectionRow[]> {
    const { data, error } = await this.scopeFilters(scope);
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
    return (data ?? []).map((row) => mapProjectionRow(row as Record<string, unknown>));
  }

  async upsertProjections(rows: readonly InventoryProjectionRow[], scope: InventoryProjectionScope): Promise<void> {
    if (rows.length === 0) return;
    await this.activateProjectionServiceGuard();

    const payload = rows.map((row) => ({
      branch_id: scope.branchId,
      causation_id: row.causationId,
      company_id: scope.companyId,
      correlation_id: row.correlationId,
      custodian: row.custodian,
      derived_from_document_id: row.derivedFromDocumentId,
      derived_from_ledger_entry_id: row.derivedFromLedgerEntryId,
      handling_unit_id: row.handlingUnitId,
      inventory_status: row.inventoryStatus,
      location_id: row.locationId,
      lot_id: row.lotId,
      object_type: row.objectType,
      product_id: row.productId,
      projected_at: row.projectedAt,
      projection_kind: row.projectionKind,
      projection_version: row.projectionVersion,
      quantity: row.quantity,
      serial_id: row.serialId,
      tenant_id: scope.tenantId,
      uom_id: row.uomId,
      updated_by: this.context.userId,
      variant_id: row.variantId,
      warehouse_id: row.warehouseId,
    }));

    const { error } = await this.supabase
      .from("inventory_current_state_projections")
      .upsert(payload, {
        onConflict: "tenant_id,company_id,branch_id,projection_kind,object_type,product_id,variant_id,lot_id,serial_id,handling_unit_id,warehouse_id,location_id,inventory_status",
      });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
  }

  async updateSerialIdentityProjections(
    updates: readonly InventorySerialIdentityProjection[],
    scope: InventoryProjectionScope,
  ): Promise<void> {
    if (updates.length === 0) return;
    await this.activateProjectionServiceGuard();

    for (const update of updates) {
      const { error } = await this.supabase
        .from("inventory_serial_numbers")
        .update({
          current_custodian: update.currentCustodian,
          current_handling_unit_id: update.currentHandlingUnitId,
          current_location_id: update.currentLocationId,
          current_warehouse_id: update.currentWarehouseId,
          updated_by: this.context.userId,
        })
        .eq("id", update.serialId)
        .eq("tenant_id", scope.tenantId)
        .eq("company_id", scope.companyId);

      if (error) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
      }
    }
  }

  async updateHandlingUnitIdentityProjections(
    updates: readonly InventoryHandlingUnitIdentityProjection[],
    scope: InventoryProjectionScope,
  ): Promise<void> {
    if (updates.length === 0) return;
    await this.activateProjectionServiceGuard();

    for (const update of updates) {
      const { error } = await this.supabase
        .from("inventory_handling_units")
        .update({
          current_custodian: update.currentCustodian,
          location_id: update.locationId,
          updated_by: this.context.userId,
          warehouse_id: update.warehouseId,
        })
        .eq("id", update.handlingUnitId)
        .eq("tenant_id", scope.tenantId)
        .eq("company_id", scope.companyId);

      if (error) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
      }
    }
  }

  async clearProjections(scope: InventoryProjectionScope): Promise<void> {
    await this.activateProjectionServiceGuard();
    let query = this.supabase
      .from("inventory_current_state_projections")
      .delete()
      .eq("tenant_id", scope.tenantId)
      .eq("company_id", scope.companyId);

    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    else query = query.is("branch_id", null);

    const { error } = await query;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
  }

  async clearAppliedEntries(scope: InventoryProjectionScope): Promise<void> {
    await this.activateProjectionServiceGuard();
    let query = this.supabase
      .from("inventory_projection_applied_entries")
      .delete()
      .eq("tenant_id", scope.tenantId)
      .eq("company_id", scope.companyId);

    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    else query = query.is("branch_id", null);

    const { error } = await query;
    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", correlationId: this.context.correlationId, message: error.message });
    }
  }
}
