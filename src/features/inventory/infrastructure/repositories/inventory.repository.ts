import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { InventoryFoundationRepository } from "../../application/ports/inventory.repository";
import type {
  CursorPage,
  InventoryEventDefinitionRecord,
  InventoryEventRouteRecord,
  InventoryIntegrationEndpointRecord,
  InventoryIntegrationMessageRecord,
  InventoryListQuery,
  StockBalanceRecord,
  StockLedgerDirection,
  StockLedgerEntryRecord,
  StockPostingBatchRecord,
  StockPostingBatchStatus,
  StockPostingRpcInput,
  StockPostingValidationContext,
} from "../../application/types";

const EVENT_DEFINITION_COLUMNS = "id, tenant_id, branch_id, event_key, name, direction, source_scope, is_active, created_at, updated_at, version";
const ENDPOINT_COLUMNS = "id, tenant_id, branch_id, endpoint_key, name, direction, transport, is_active, created_at, updated_at, version";
const ROUTE_COLUMNS = "id, tenant_id, branch_id, route_key, event_definition_id, endpoint_id, delivery_mode_placeholder, is_active, created_at, updated_at, version";
const MESSAGE_COLUMNS = "id, tenant_id, branch_id, message_key, event_definition_id, endpoint_id, direction, status, source_entity_type, source_entity_id, external_reference, is_active, created_at, updated_at, version";
const STOCK_LEDGER_COLUMNS = "id, tenant_id, branch_id, posting_batch_id, document_id, document_type_key, movement_type_key, product_id, warehouse_id, location_id, lot_id, serial_id, unit_id, quantity_delta, unit_cost, total_cost, direction, posted_at, posted_by, reversal_of_entry_id, correlation_id, causation_id, metadata, created_at";
const STOCK_BALANCE_COLUMNS = "id, tenant_id, product_id, warehouse_id, location_id, lot_id, serial_id, unit_id, quantity_on_hand, quantity_reserved, quantity_available, last_movement_at, metadata, created_at";
const STOCK_POSTING_BATCH_COLUMNS = "id, tenant_id, branch_id, document_id, status, posted_at, posted_by, reversed_at, reversed_by, idempotency_key, correlation_id, metadata, created_at";

type Mapper<TRecord> = (row: Record<string, unknown>) => TRecord;

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function encodeCursor(record: { createdAt: string; id: string } | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

function mapEventDefinition(row: Record<string, unknown>): InventoryEventDefinitionRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    eventKey: row.event_key as string,
    name: row.name as string,
    direction: row.direction as string,
    sourceScope: row.source_scope as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapEndpoint(row: Record<string, unknown>): InventoryIntegrationEndpointRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    endpointKey: row.endpoint_key as string,
    name: row.name as string,
    direction: row.direction as string,
    transport: row.transport as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapRoute(row: Record<string, unknown>): InventoryEventRouteRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    routeKey: row.route_key as string,
    eventDefinitionId: row.event_definition_id as string,
    endpointId: row.endpoint_id as string,
    deliveryModePlaceholder: row.delivery_mode_placeholder as string,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function mapMessage(row: Record<string, unknown>): InventoryIntegrationMessageRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    messageKey: row.message_key as string,
    eventDefinitionId: row.event_definition_id as string | null,
    endpointId: row.endpoint_id as string | null,
    direction: row.direction as string,
    status: row.status as string,
    sourceEntityType: row.source_entity_type as string | null,
    sourceEntityId: row.source_entity_id as string | null,
    externalReference: row.external_reference as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function mapStockLedgerEntry(row: Record<string, unknown>): StockLedgerEntryRecord {
  return {
    branchId: row.branch_id as string | null,
    causationId: row.causation_id as string | null,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as string,
    direction: row.direction as StockLedgerDirection,
    documentId: row.document_id as string,
    documentTypeKey: row.document_type_key as string,
    id: row.id as string,
    locationId: row.location_id as string,
    lotId: row.lot_id as string | null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    movementTypeKey: row.movement_type_key as string,
    postedAt: row.posted_at as string,
    postedBy: row.posted_by as string,
    postingBatchId: row.posting_batch_id as string,
    productId: row.product_id as string,
    quantityDelta: toNumber(row.quantity_delta),
    reversalOfEntryId: row.reversal_of_entry_id as string | null,
    serialId: row.serial_id as string | null,
    tenantId: row.tenant_id as string,
    totalCost: toNumber(row.total_cost),
    unitCost: toNumber(row.unit_cost),
    unitId: row.unit_id as string,
    warehouseId: row.warehouse_id as string,
  };
}

function mapStockBalance(row: Record<string, unknown>): StockBalanceRecord {
  return {
    createdAt: row.created_at as string,
    id: row.id as string,
    lastMovementAt: row.last_movement_at as string | null,
    locationId: row.location_id as string,
    lotId: row.lot_id as string | null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    productId: row.product_id as string,
    quantityAvailable: toNumber(row.quantity_available),
    quantityOnHand: toNumber(row.quantity_on_hand),
    quantityReserved: toNumber(row.quantity_reserved),
    serialId: row.serial_id as string | null,
    tenantId: row.tenant_id as string,
    unitId: row.unit_id as string,
    warehouseId: row.warehouse_id as string,
  };
}

function mapStockPostingBatch(row: Record<string, unknown>): StockPostingBatchRecord {
  return {
    branchId: row.branch_id as string | null,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as string,
    documentId: row.document_id as string,
    id: row.id as string,
    idempotencyKey: row.idempotency_key as string,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    postedAt: row.posted_at as string,
    postedBy: row.posted_by as string,
    reversedAt: row.reversed_at as string | null,
    reversedBy: row.reversed_by as string | null,
    status: row.status as StockPostingBatchStatus,
    tenantId: row.tenant_id as string,
  };
}

export class SupabaseInventoryRepository implements InventoryFoundationRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async listEventDefinitions(query: InventoryListQuery): Promise<CursorPage<InventoryEventDefinitionRecord>> {
    return this.listTable("inventory_event_definitions", EVENT_DEFINITION_COLUMNS, query, mapEventDefinition, ["event_key", "name", "direction"]);
  }

  async listIntegrationEndpoints(query: InventoryListQuery): Promise<CursorPage<InventoryIntegrationEndpointRecord>> {
    return this.listTable("inventory_integration_endpoints", ENDPOINT_COLUMNS, query, mapEndpoint, ["endpoint_key", "name", "transport"]);
  }

  async listEventRoutes(query: InventoryListQuery): Promise<CursorPage<InventoryEventRouteRecord>> {
    return this.listTable("inventory_event_routes", ROUTE_COLUMNS, query, mapRoute, ["route_key", "delivery_mode_placeholder"]);
  }

  async listIntegrationMessages(query: InventoryListQuery): Promise<CursorPage<InventoryIntegrationMessageRecord>> {
    return this.listTable("inventory_integration_messages", MESSAGE_COLUMNS, query, mapMessage, ["message_key", "status", "external_reference"]);
  }

  async listStockLedgerEntries(query: InventoryListQuery): Promise<CursorPage<StockLedgerEntryRecord>> {
    return this.listTable("stock_ledger_entries", STOCK_LEDGER_COLUMNS, query, mapStockLedgerEntry, ["document_type_key", "movement_type_key", "correlation_id"]);
  }

  async listStockBalances(query: InventoryListQuery): Promise<CursorPage<StockBalanceRecord>> {
    return this.listTable("stock_balances", STOCK_BALANCE_COLUMNS, query, mapStockBalance, ["product_id", "warehouse_id", "location_id"]);
  }

  async listStockPostingBatches(query: InventoryListQuery): Promise<CursorPage<StockPostingBatchRecord>> {
    return this.listTable("stock_posting_batches", STOCK_POSTING_BATCH_COLUMNS, query, mapStockPostingBatch, ["status", "idempotency_key", "correlation_id"]);
  }

  async loadPostingValidationContext(input: { documentId: string; branchId?: string | null }): Promise<StockPostingValidationContext> {
    const { data, error } = await this.supabase
      .from("business_documents")
      .select("id, tenant_id, branch_id, document_type_key, source_module")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.documentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load posting document.", cause: error });
    }

    const allowNegativeStock = await this.readAllowNegativeStock();
    const document = data
      ? {
          branchId: data.branch_id as string | null,
          documentTypeKey: data.document_type_key as string,
          id: data.id as string,
          sourceModule: data.source_module as string,
          tenantId: data.tenant_id as string,
        }
      : null;

    if (document && (document.branchId ?? null) !== (input.branchId ?? null)) {
      return { allowNegativeStock, document: null };
    }

    return { allowNegativeStock, document };
  }

  async validatePostingLineScope(input: {
    branchId?: string | null;
    productId: string;
    warehouseId: string;
    locationId: string;
    unitId: string;
  }): Promise<void> {
    const [product, warehouse, location, unit] = await Promise.all([
      this.supabase
        .from("inventory_products")
        .select("id, product_kind")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.productId)
        .neq("product_kind", "service")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_warehouses")
        .select("id, branch_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.warehouseId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_locations")
        .select("id, branch_id, warehouse_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.locationId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
      this.supabase
        .from("inventory_uoms")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.unitId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    for (const result of [product, warehouse, location, unit]) {
      if (result.error) {
        throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not validate stock posting scope.", cause: result.error });
      }
    }

    if (!product.data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting product must be active and stockable.", correlationId: this.context.correlationId });
    }

    if (!warehouse.data || (warehouse.data.branch_id as string | null) !== (input.branchId ?? null)) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting warehouse must belong to the posting tenant and branch.", correlationId: this.context.correlationId });
    }

    if (
      !location.data ||
      (location.data.branch_id as string | null) !== (input.branchId ?? null) ||
      (location.data.warehouse_id as string) !== input.warehouseId
    ) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting location must belong to the posting warehouse and branch.", correlationId: this.context.correlationId });
    }

    if (!unit.data) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Stock posting unit must belong to the tenant.", correlationId: this.context.correlationId });
    }
  }

  async readQuantityOnHand(input: {
    productId: string;
    warehouseId: string;
    locationId: string;
    lotId?: string | null;
    serialId?: string | null;
    unitId: string;
  }): Promise<number> {
    let request = this.supabase
      .from("stock_balances")
      .select("quantity_on_hand")
      .eq("tenant_id", this.context.tenantId)
      .eq("product_id", input.productId)
      .eq("warehouse_id", input.warehouseId)
      .eq("location_id", input.locationId)
      .eq("unit_id", input.unitId)
      .is("deleted_at", null);

    request = input.lotId ? request.eq("lot_id", input.lotId) : request.is("lot_id", null);
    request = input.serialId ? request.eq("serial_id", input.serialId) : request.is("serial_id", null);

    const { data, error } = await request.maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read current stock balance cache.", cause: error });
    }

    return toNumber((data as Record<string, unknown> | null)?.quantity_on_hand);
  }

  async postStockEntries(input: StockPostingRpcInput): Promise<StockPostingBatchRecord> {
    const { data, error } = await this.supabase.rpc("post_stock_entries", {
      input_branch_id: input.branchId ?? null,
      input_correlation_id: input.correlationId,
      input_document_id: input.documentId,
      input_entries: input.entries,
      input_idempotency_key: input.idempotencyKey,
      input_metadata: input.metadata,
      input_tenant_id: this.context.tenantId,
    });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not post stock entries.", cause: error, correlationId: input.correlationId });
    }

    return mapStockPostingBatch(data as unknown as Record<string, unknown>);
  }

  async listLedgerEntriesForBatch(postingBatchId: string): Promise<readonly StockLedgerEntryRecord[]> {
    const { data, error } = await this.supabase
      .from("stock_ledger_entries")
      .select(STOCK_LEDGER_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("posting_batch_id", postingBatchId)
      .is("deleted_at", null)
      .order("posted_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load stock ledger entries for reversal.", cause: error });
    }

    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapStockLedgerEntry);
  }

  private async listTable<TRecord extends { id: string; createdAt: string }>(
    tableName: string,
    columns: string,
    query: InventoryListQuery,
    mapper: Mapper<TRecord>,
    searchColumns: readonly string[],
  ): Promise<CursorPage<TRecord>> {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.supabase
      .from(tableName)
      .select(columns)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .limit(pageSize + 1);

    if (query.isActive !== undefined) {
      request = request.eq("is_active", query.isActive);
    }

    if (query.status) {
      request = request.eq("status", query.status);
    }

    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term.length > 0) {
        request = request.or(searchColumns.map((column) => `${column}.ilike.%${term}%`).join(","));
      }
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    request = request.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error } = await request;

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not list ${tableName}.`, cause: error });
    }

    const records = ((data ?? []) as unknown as Record<string, unknown>[]).map(mapper);
    const visibleRecords = records.slice(0, pageSize);

    return {
      records: visibleRecords,
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
    };
  }

  private async readAllowNegativeStock(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("app_settings")
      .select("tenant_id, value")
      .eq("setting_key", "inventory.allow_negative_stock")
      .or(`tenant_id.eq.${this.context.tenantId},tenant_id.is.null`)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("tenant_id", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read inventory negative stock setting.", cause: error });
    }

    return Boolean((data?.[0] as Record<string, unknown> | undefined)?.value);
  }
}
