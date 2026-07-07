import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { inventoryLotListQuerySchema } from "../../application/schemas/inventory-lots.schema";
import { isLotIssueBlocked } from "../../application/schemas/inventory-lots.schema";
import type { InventoryLotRecord, InventoryLotWorkspaceData } from "../../application/types/inventory-lots";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export type { InventoryLotRecord, InventoryLotWorkspaceData } from "../../application/types/inventory-lots";

export const LOT_COLUMNS = [
  "id",
  "tenant_id",
  "company_id",
  "branch_id",
  "product_id",
  "product_variant_id",
  "lot_number",
  "source_type",
  "source_reference_type",
  "source_reference_id",
  "supplier_party_id",
  "supplier_lot_number",
  "manufacturing_date",
  "expiry_date",
  "received_date",
  "qc_status",
  "lifecycle_state",
  "status",
  "barcode",
  "qr_payload",
  "notes",
  "traceability_ready",
  "source_metadata",
  "created_at",
  "updated_at",
  "version",
].join(", ");

type LotRow = Record<string, unknown>;

function encodeCursor(record: LotRow | undefined) {
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

function mapLotRecord(
  row: LotRow,
  products: ReadonlyMap<string, { label: string; trackingMode: string; lotSupplierSupported: boolean; lotInternalSupported: boolean; lotExpirySupported: boolean; lotManufacturingDateSupported: boolean; lotQcRequired: boolean; name: string }>,
  variants: ReadonlyMap<string, string>,
  suppliers: ReadonlyMap<string, string>,
): InventoryLotRecord {
  const product = products.get(String(row.product_id));
  const lifecycleState = String(row.lifecycle_state ?? "draft") as InventoryLotRecord["lifecycleState"];
  const qcStatus = String(row.qc_status ?? "not_required") as InventoryLotRecord["qcStatus"];

  return {
    barcode: String(row.barcode ?? ""),
    branchId: typeof row.branch_id === "string" ? row.branch_id : null,
    companyId: String(row.company_id),
    createdAt: String(row.created_at),
    expiryDate: typeof row.expiry_date === "string" ? row.expiry_date : null,
    id: String(row.id),
    issueBlocked: isLotIssueBlocked({ lifecycleState, qcStatus }),
    lifecycleState,
    lotNumber: String(row.lot_number ?? ""),
    manufacturingDate: typeof row.manufacturing_date === "string" ? row.manufacturing_date : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    productId: String(row.product_id),
    productLabel: product?.label ?? "Product",
    productTrackingMode: product?.trackingMode ?? "none",
    productVariantId: typeof row.product_variant_id === "string" ? row.product_variant_id : null,
    qrPayload: row.qr_payload && typeof row.qr_payload === "object" && !Array.isArray(row.qr_payload) ? row.qr_payload as Record<string, unknown> : {},
    qcStatus,
    receivedDate: typeof row.received_date === "string" ? row.received_date : null,
    sourceMetadata: row.source_metadata && typeof row.source_metadata === "object" && !Array.isArray(row.source_metadata) ? row.source_metadata as Record<string, unknown> : {},
    sourceReferenceId: typeof row.source_reference_id === "string" ? row.source_reference_id : null,
    sourceReferenceType: typeof row.source_reference_type === "string" ? row.source_reference_type : null,
    sourceType: String(row.source_type ?? "internal") as InventoryLotRecord["sourceType"],
    status: String(row.status ?? "active") as InventoryLotRecord["status"],
    supplierLabel: lookupLabel(suppliers, row.supplier_party_id),
    supplierLotNumber: typeof row.supplier_lot_number === "string" ? row.supplier_lot_number : null,
    supplierPartyId: typeof row.supplier_party_id === "string" ? row.supplier_party_id : null,
    tenantId: String(row.tenant_id),
    traceabilityReady: row.traceability_ready === true,
    updatedAt: String(row.updated_at),
    variantLabel: lookupLabel(variants, row.product_variant_id),
    version: Number(row.version ?? 1),
  };
}

async function loadLookups(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const [productsResult, variantsResult, suppliersResult] = await Promise.all([
    supabase
      .from("inventory_products")
      .select("id, product_key, name, tracking_mode, lot_supplier_supported, lot_internal_supported, lot_expiry_supported, lot_manufacturing_date_supported, lot_qc_required")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("inventory_product_variants")
      .select("id, variant_key, name, product_id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("parties")
      .select("id, party_number, display_name")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("display_name"),
  ]);

  const failed = [productsResult, variantsResult, suppliersResult].find((result) => result.error);
  if (failed?.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load lot lookup data.", cause: failed.error });
  }

  const products = (productsResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.product_key as string} — ${row.name as string}`,
    lotExpirySupported: row.lot_expiry_supported as boolean,
    lotInternalSupported: row.lot_internal_supported as boolean,
    lotManufacturingDateSupported: row.lot_manufacturing_date_supported as boolean,
    lotQcRequired: row.lot_qc_required as boolean,
    lotSupplierSupported: row.lot_supplier_supported as boolean,
    name: row.name as string,
    trackingMode: row.tracking_mode as string,
  }));

  return {
    productMap: new Map(products.map((product) => [product.id, product])),
    products,
    supplierMap: new Map((suppliersResult.data ?? []).map((row) => [row.id as string, [row.party_number, row.display_name].filter(Boolean).join(" — ")])),
    suppliers: (suppliersResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: [row.party_number, row.display_name].filter(Boolean).join(" — "),
    })),
    variantMap: new Map((variantsResult.data ?? []).map((row) => [row.id as string, `${row.variant_key as string} — ${row.name as string}`])),
    variants: (variantsResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: `${row.variant_key as string} — ${row.name as string}`,
      productId: row.product_id as string,
    })),
  };
}

export async function loadInventoryLotsWorkspace(query: unknown = {}): Promise<InventoryLotWorkspaceData> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.lotsView });
  const parsed = inventoryLotListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);

  let request = supabase
    .from("inventory_lots")
    .select(LOT_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .limit(pageSize + 1);

  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.productId) request = request.eq("product_id", parsed.productId);
  if (parsed.sourceType) request = request.eq("source_type", parsed.sourceType);
  if (parsed.qcStatus) request = request.eq("qc_status", parsed.qcStatus);
  if (parsed.lifecycleState) request = request.eq("lifecycle_state", parsed.lifecycleState);

  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) {
      request = request.or(`lot_number.ilike.%${term}%,barcode.ilike.%${term}%,supplier_lot_number.ilike.%${term}%`);
    }
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const [recordResult, lookups] = await Promise.all([
    request.order("created_at", { ascending: false }).order("id", { ascending: false }),
    loadLookups(supabase, context),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory lots.", cause: recordResult.error });
  }

  const rows = recordResult.data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  return {
    nextCursor: hasMore ? encodeCursor(pageRows.at(-1) as unknown as LotRow) : null,
    pageSize,
    products: lookups.products,
    records: pageRows.map((row) => mapLotRecord(row as unknown as LotRow, lookups.productMap, lookups.variantMap, lookups.supplierMap)),
    suppliers: lookups.suppliers,
    variants: lookups.variants,
  };
}

export async function getInventoryLotRecord(id: string): Promise<InventoryLotRecord | null> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.lotsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const lookups = await loadLookups(supabase, context);
  const { data, error } = await supabase
    .from("inventory_lots")
    .select(LOT_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory lot.", cause: error });
  }

  return data ? mapLotRecord(data as unknown as LotRow, lookups.productMap, lookups.variantMap, lookups.supplierMap) : null;
}
