import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { inventorySerialListQuerySchema } from "../../application/schemas/inventory-serials.schema";
import type { InventorySerialRecord, InventorySerialWorkspaceData } from "../../application/types/inventory-serials";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export type { InventorySerialRecord, InventorySerialWorkspaceData } from "../../application/types/inventory-serials";

export const SERIAL_COLUMNS = [
  "id", "tenant_id", "company_id", "branch_id", "product_id", "product_variant_id", "lot_id",
  "serial_number", "serial_source", "generation_method", "lifecycle_state", "serial_status",
  "verification_status", "verification_token_hash", "qr_payload", "barcode",
  "current_handling_unit_id", "current_warehouse_id", "current_location_id", "current_custodian",
  "warranty_ready", "service_ready", "first_activation_ready", "traceability_ready", "notes",
  "source_metadata", "policy_id", "sold_document_reference", "service_case_reference",
  "status", "created_at", "updated_at", "version",
].join(", ");

type SerialRow = Record<string, unknown>;

function encodeCursor(record: SerialRow | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.created_at, id: record.id })).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function lookupLabel(map: ReadonlyMap<string, string>, id: unknown) {
  if (typeof id !== "string" || id.length === 0) return null;
  return map.get(id) ?? null;
}

function mapSerialRecord(
  row: SerialRow,
  products: ReadonlyMap<string, { label: string; trackingMode: string }>,
  variants: ReadonlyMap<string, string>,
  lots: ReadonlyMap<string, string>,
  handlingUnits: ReadonlyMap<string, string>,
  warehouses: ReadonlyMap<string, string>,
  locations: ReadonlyMap<string, string>,
): InventorySerialRecord {
  const product = products.get(String(row.product_id));
  return {
    barcode: String(row.barcode ?? ""),
    branchId: typeof row.branch_id === "string" ? row.branch_id : null,
    companyId: String(row.company_id),
    createdAt: String(row.created_at),
    currentCustodian: row.current_custodian && typeof row.current_custodian === "object" && !Array.isArray(row.current_custodian) ? row.current_custodian as Record<string, unknown> : {},
    currentHandlingUnitId: typeof row.current_handling_unit_id === "string" ? row.current_handling_unit_id : null,
    currentLocationId: typeof row.current_location_id === "string" ? row.current_location_id : null,
    currentWarehouseId: typeof row.current_warehouse_id === "string" ? row.current_warehouse_id : null,
    firstActivationReady: row.first_activation_ready === true,
    generationMethod: String(row.generation_method ?? "manual_entry") as InventorySerialRecord["generationMethod"],
    handlingUnitLabel: lookupLabel(handlingUnits, row.current_handling_unit_id),
    id: String(row.id),
    lifecycleState: String(row.lifecycle_state ?? "draft") as InventorySerialRecord["lifecycleState"],
    locationLabel: lookupLabel(locations, row.current_location_id),
    lotId: typeof row.lot_id === "string" ? row.lot_id : null,
    lotLabel: lookupLabel(lots, row.lot_id),
    notes: typeof row.notes === "string" ? row.notes : null,
    policyId: typeof row.policy_id === "string" ? row.policy_id : null,
    productId: String(row.product_id),
    productLabel: product?.label ?? "Product",
    productTrackingMode: product?.trackingMode ?? "none",
    productVariantId: typeof row.product_variant_id === "string" ? row.product_variant_id : null,
    qrPayload: row.qr_payload && typeof row.qr_payload === "object" && !Array.isArray(row.qr_payload) ? row.qr_payload as Record<string, unknown> : {},
    serialNumber: String(row.serial_number ?? ""),
    serialSource: String(row.serial_source ?? "manual") as InventorySerialRecord["serialSource"],
    serialStatus: String(row.serial_status ?? "active") as InventorySerialRecord["serialStatus"],
    serviceCaseReference: typeof row.service_case_reference === "string" ? row.service_case_reference : null,
    serviceReady: row.service_ready === true,
    soldDocumentReference: typeof row.sold_document_reference === "string" ? row.sold_document_reference : null,
    sourceMetadata: row.source_metadata && typeof row.source_metadata === "object" && !Array.isArray(row.source_metadata) ? row.source_metadata as Record<string, unknown> : {},
    status: String(row.status ?? "active") as InventorySerialRecord["status"],
    tenantId: String(row.tenant_id),
    traceabilityReady: row.traceability_ready === true,
    updatedAt: String(row.updated_at),
    variantLabel: lookupLabel(variants, row.product_variant_id),
    verificationStatus: String(row.verification_status ?? "not_required") as InventorySerialRecord["verificationStatus"],
    verificationTokenHash: typeof row.verification_token_hash === "string" ? row.verification_token_hash : null,
    warehouseLabel: lookupLabel(warehouses, row.current_warehouse_id),
    warrantyReady: row.warranty_ready === true,
    version: Number(row.version ?? 1),
  };
}

async function loadLookups(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const [productsResult, variantsResult, lotsResult, policiesResult, handlingUnitsResult, warehousesResult, locationsResult] = await Promise.all([
    supabase.from("inventory_products").select("id, product_key, name, tracking_mode, serial_source, serial_generation_timing, serial_allow_manual_override, serial_duplicate_validation").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_product_variants").select("id, variant_key, name, product_id").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_lots").select("id, lot_number, product_id").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("lot_number"),
    supabase.from("inventory_serial_policies").select("id, policy_code, pattern, prefix, digits, reset_scope, start_number, allow_manual_override, duplicate_validation, generation_timing, product_id").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("policy_code"),
    supabase.from("inventory_handling_units").select("id, hu_number").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("hu_number"),
    supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_locations").select("id, location_key, name, barcode").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
  ]);

  const failed = [productsResult, variantsResult, lotsResult, policiesResult, handlingUnitsResult, warehousesResult, locationsResult].find((result) => result.error);
  if (failed?.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load serial lookup data.", cause: failed.error });
  }

  const products = (productsResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.product_key as string} — ${row.name as string}`,
    serialAllowManualOverride: row.serial_allow_manual_override as boolean,
    serialDuplicateValidation: row.serial_duplicate_validation as boolean,
    serialGenerationTiming: row.serial_generation_timing as string | null,
    serialSource: row.serial_source as string | null,
    trackingMode: row.tracking_mode as string,
  }));

  return {
    handlingUnits: (handlingUnitsResult.data ?? []).map((row) => ({ id: row.id as string, label: row.hu_number as string })),
    handlingUnitMap: new Map((handlingUnitsResult.data ?? []).map((row) => [row.id as string, row.hu_number as string])),
    locations: (locationsResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: (row.barcode as string | null) || `${row.location_key as string} — ${row.name as string}`,
    })),
    locationMap: new Map((locationsResult.data ?? []).map((row) => [row.id as string, (row.barcode as string | null) || `${row.location_key as string} — ${row.name as string}`])),
    lotMap: new Map((lotsResult.data ?? []).map((row) => [row.id as string, row.lot_number as string])),
    lots: (lotsResult.data ?? []).map((row) => ({ id: row.id as string, label: row.lot_number as string, productId: row.product_id as string })),
    policies: (policiesResult.data ?? []).map((row) => ({
      allowManualOverride: row.allow_manual_override as boolean,
      digits: Number(row.digits),
      duplicateValidation: row.duplicate_validation as boolean,
      generationTiming: row.generation_timing as string,
      id: row.id as string,
      label: row.policy_code as string,
      pattern: row.pattern as string,
      policyCode: row.policy_code as string,
      prefix: row.prefix as string | null,
      productId: row.product_id as string | null,
      resetScope: row.reset_scope as "global" | "company" | "branch" | "product" | "lot",
      startNumber: Number(row.start_number),
    })),
    productMap: new Map(products.map((product) => [product.id, product])),
    products,
    variantMap: new Map((variantsResult.data ?? []).map((row) => [row.id as string, `${row.variant_key as string} — ${row.name as string}`])),
    variants: (variantsResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.variant_key as string} — ${row.name as string}`, productId: row.product_id as string })),
    warehouseMap: new Map((warehousesResult.data ?? []).map((row) => [row.id as string, `${row.warehouse_key as string} — ${row.name as string}`])),
    warehouses: (warehousesResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.warehouse_key as string} — ${row.name as string}` })),
  };
}

export async function loadInventorySerialsWorkspace(query: unknown = {}): Promise<InventorySerialWorkspaceData> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.serialsView });
  const parsed = inventorySerialListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);

  let request = supabase.from("inventory_serial_numbers").select(SERIAL_COLUMNS).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).limit(pageSize + 1);
  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.productId) request = request.eq("product_id", parsed.productId);
  if (parsed.serialSource) request = request.eq("serial_source", parsed.serialSource);
  if (parsed.serialStatus) request = request.eq("serial_status", parsed.serialStatus);
  if (parsed.lifecycleState) request = request.eq("lifecycle_state", parsed.lifecycleState);
  if (parsed.verificationStatus) request = request.eq("verification_status", parsed.verificationStatus);
  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) request = request.or(`serial_number.ilike.%${term}%,barcode.ilike.%${term}%`);
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const [recordResult, lookups] = await Promise.all([
    request.order("created_at", { ascending: false }).order("id", { ascending: false }),
    loadLookups(supabase, context),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory serials.", cause: recordResult.error });
  }

  const rows = recordResult.data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    handlingUnits: lookups.handlingUnits,
    locations: lookups.locations,
    lots: lookups.lots,
    nextCursor: hasMore ? encodeCursor(pageRows.at(-1) as unknown as SerialRow) : null,
    pageSize,
    policies: lookups.policies,
    products: lookups.products,
    records: pageRows.map((row) => mapSerialRecord(row as unknown as SerialRow, lookups.productMap, lookups.variantMap, lookups.lotMap, lookups.handlingUnitMap, lookups.warehouseMap, lookups.locationMap)),
    variants: lookups.variants,
    warehouses: lookups.warehouses,
  };
}

export async function getInventorySerialRecord(id: string): Promise<InventorySerialRecord | null> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.serialsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const lookups = await loadLookups(supabase, context);
  const { data, error } = await supabase.from("inventory_serial_numbers").select(SERIAL_COLUMNS).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory serial.", cause: error });
  return data ? mapSerialRecord(data as unknown as SerialRow, lookups.productMap, lookups.variantMap, lookups.lotMap, lookups.handlingUnitMap, lookups.warehouseMap, lookups.locationMap) : null;
}
