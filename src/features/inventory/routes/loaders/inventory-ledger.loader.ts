import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { inventoryLedgerListQuerySchema } from "../../application/schemas/inventory-ledger.schema";
import type { InventoryLedgerEntryRecord, InventoryLedgerWorkspaceData } from "../../application/types/inventory-ledger";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export type { InventoryLedgerEntryRecord, InventoryLedgerWorkspaceData } from "../../application/types/inventory-ledger";

export const LEDGER_COLUMNS = [
  "id", "tenant_id", "company_id", "branch_id", "inventory_object_type",
  "product_id", "variant_id", "lot_id", "serial_id", "handling_unit_id", "child_handling_unit_id",
  "warehouse_id", "location_id", "inventory_status", "quantity_delta", "uom_id",
  "movement_direction", "movement_type", "document_type", "document_id", "document_line_id",
  "business_module", "event_type", "parent_entry_id", "posting_timestamp", "correlation_id",
  "causation_id", "event_metadata", "created_by", "created_at",
].join(", ");

type LedgerRow = Record<string, unknown>;

function encodeCursor(record: LedgerRow | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ id: record.id, postingTimestamp: record.posting_timestamp })).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.id === "string" && typeof parsed.postingTimestamp === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function lookupLabel(map: ReadonlyMap<string, string>, id: unknown) {
  if (typeof id !== "string" || id.length === 0) return null;
  return map.get(id) ?? null;
}

function mapLedgerRecord(
  row: LedgerRow,
  products: ReadonlyMap<string, string>,
  lots: ReadonlyMap<string, string>,
  serials: ReadonlyMap<string, string>,
  handlingUnits: ReadonlyMap<string, string>,
  warehouses: ReadonlyMap<string, string>,
  locations: ReadonlyMap<string, string>,
): InventoryLedgerEntryRecord {
  const metadata = row.event_metadata && typeof row.event_metadata === "object" && !Array.isArray(row.event_metadata)
    ? row.event_metadata as Record<string, unknown>
    : {};

  return {
    branchId: typeof row.branch_id === "string" ? row.branch_id : null,
    businessModule: String(row.business_module ?? "inventory") as InventoryLedgerEntryRecord["businessModule"],
    causationId: typeof row.causation_id === "string" ? row.causation_id : null,
    childHandlingUnitId: typeof row.child_handling_unit_id === "string" ? row.child_handling_unit_id : null,
    companyId: String(row.company_id),
    correlationId: String(row.correlation_id ?? ""),
    createdAt: String(row.created_at),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    documentId: typeof row.document_id === "string" ? row.document_id : null,
    documentLineId: typeof row.document_line_id === "string" ? row.document_line_id : null,
    documentNumberSnapshot: typeof metadata.documentNumberSnapshot === "string" ? metadata.documentNumberSnapshot : null,
    documentType: String(row.document_type ?? ""),
    eventMetadata: metadata,
    eventType: String(row.event_type ?? "posted") as InventoryLedgerEntryRecord["eventType"],
    handlingUnitId: typeof row.handling_unit_id === "string" ? row.handling_unit_id : null,
    handlingUnitLabel: lookupLabel(handlingUnits, row.handling_unit_id),
    id: String(row.id),
    inventoryObjectType: String(row.inventory_object_type ?? "product_quantity") as InventoryLedgerEntryRecord["inventoryObjectType"],
    inventoryStatus: typeof row.inventory_status === "string" ? row.inventory_status : null,
    locationId: typeof row.location_id === "string" ? row.location_id : null,
    locationLabel: lookupLabel(locations, row.location_id),
    lotId: typeof row.lot_id === "string" ? row.lot_id : null,
    lotLabel: lookupLabel(lots, row.lot_id),
    movementDirection: String(row.movement_direction ?? "IN") as InventoryLedgerEntryRecord["movementDirection"],
    movementType: String(row.movement_type ?? "adjustment") as InventoryLedgerEntryRecord["movementType"],
    objectLabelSnapshot: typeof metadata.objectLabelSnapshot === "string" ? metadata.objectLabelSnapshot : null,
    parentEntryId: typeof row.parent_entry_id === "string" ? row.parent_entry_id : null,
    postingTimestamp: String(row.posting_timestamp ?? row.created_at),
    productId: typeof row.product_id === "string" ? row.product_id : null,
    productLabel: lookupLabel(products, row.product_id),
    quantityDelta: Number(row.quantity_delta ?? 0),
    serialId: typeof row.serial_id === "string" ? row.serial_id : null,
    serialLabel: lookupLabel(serials, row.serial_id),
    tenantId: String(row.tenant_id),
    uomId: typeof row.uom_id === "string" ? row.uom_id : null,
    variantId: typeof row.variant_id === "string" ? row.variant_id : null,
    warehouseId: typeof row.warehouse_id === "string" ? row.warehouse_id : null,
    warehouseLabel: lookupLabel(warehouses, row.warehouse_id),
  };
}

async function loadLookups(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const [productsResult, lotsResult, serialsResult, handlingUnitsResult, warehousesResult, locationsResult] = await Promise.all([
    supabase.from("inventory_products").select("id, product_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
    supabase.from("inventory_lots").select("id, lot_number").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
    supabase.from("inventory_serial_numbers").select("id, serial_number").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
    supabase.from("inventory_handling_units").select("id, hu_number").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
    supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
    supabase.from("inventory_locations").select("id, location_key, name, barcode").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null),
  ]);

  return {
    handlingUnits: new Map((handlingUnitsResult.data ?? []).map((row) => [row.id as string, row.hu_number as string])),
    locations: new Map((locationsResult.data ?? []).map((row) => [row.id as string, (row.barcode as string | null) || `${row.location_key as string} — ${row.name as string}`])),
    lots: new Map((lotsResult.data ?? []).map((row) => [row.id as string, row.lot_number as string])),
    products: new Map((productsResult.data ?? []).map((row) => [row.id as string, `${row.product_key as string} — ${row.name as string}`])),
    serials: new Map((serialsResult.data ?? []).map((row) => [row.id as string, row.serial_number as string])),
    warehouses: new Map((warehousesResult.data ?? []).map((row) => [row.id as string, `${row.warehouse_key as string} — ${row.name as string}`])),
  };
}

export async function loadInventoryLedgerWorkspace(query: unknown = {}): Promise<InventoryLedgerWorkspaceData> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.stockView });
  const parsed = inventoryLedgerListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);

  let request = supabase
    .from("inventory_ledger_entries")
    .select(LEDGER_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .limit(pageSize + 1);

  if (parsed.productId) request = request.eq("product_id", parsed.productId);
  if (parsed.lotId) request = request.eq("lot_id", parsed.lotId);
  if (parsed.serialId) request = request.eq("serial_id", parsed.serialId);
  if (parsed.handlingUnitId) request = request.eq("handling_unit_id", parsed.handlingUnitId);
  if (parsed.warehouseId) request = request.eq("warehouse_id", parsed.warehouseId);
  if (parsed.locationId) request = request.eq("location_id", parsed.locationId);
  if (parsed.documentId) request = request.eq("document_id", parsed.documentId);
  if (parsed.documentType) request = request.eq("document_type", parsed.documentType);
  if (parsed.movementType) request = request.eq("movement_type", parsed.movementType);
  if (parsed.businessModule) request = request.eq("business_module", parsed.businessModule);
  if (parsed.inventoryObjectType) request = request.eq("inventory_object_type", parsed.inventoryObjectType);
  if (parsed.correlationId) request = request.eq("correlation_id", parsed.correlationId);
  if (parsed.fromDate) request = request.gte("posting_timestamp", parsed.fromDate);
  if (parsed.toDate) request = request.lte("posting_timestamp", parsed.toDate);
  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) {
      request = request.or(`document_type.ilike.%${term}%,correlation_id.ilike.%${term}%,movement_type.ilike.%${term}%`);
    }
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) {
    request = request.or(`posting_timestamp.lt.${cursor.postingTimestamp},and(posting_timestamp.eq.${cursor.postingTimestamp},id.lt.${cursor.id})`);
  }

  const [recordResult, lookups] = await Promise.all([
    request.order("posting_timestamp", { ascending: false }).order("id", { ascending: false }),
    loadLookups(supabase, context),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory ledger entries.", cause: recordResult.error });
  }

  const rows = recordResult.data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    nextCursor: hasMore ? encodeCursor(pageRows.at(-1) as unknown as LedgerRow) : null,
    pageSize,
    records: pageRows.map((row) => mapLedgerRecord(
      row as unknown as LedgerRow,
      lookups.products,
      lookups.lots,
      lookups.serials,
      lookups.handlingUnits,
      lookups.warehouses,
      lookups.locations,
    )),
  };
}
