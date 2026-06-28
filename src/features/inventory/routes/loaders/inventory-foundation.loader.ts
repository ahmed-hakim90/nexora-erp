import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { getInventoryFoundationEntity, type InventoryFoundationDescriptor } from "../../application/foundation-entities";
import { inventoryFoundationListQuerySchema } from "../../application/schemas/inventory-foundation.schema";

type FoundationRow = Record<string, unknown>;

export type InventoryFoundationLookupOption = Readonly<{
  id: string;
  label: string;
}>;

export type InventoryFoundationWorkspaceData = Readonly<{
  descriptor: InventoryFoundationDescriptor;
  records: readonly FoundationRow[];
  nextCursor: string | null;
  pageSize: number;
  lookups: Readonly<Record<string, readonly InventoryFoundationLookupOption[]>>;
}>;

const BASE_COLUMNS = "id, tenant_id, company_id, branch_id, status, is_active, created_at, created_by, updated_at, updated_by, version";

function encodeCursor(record: FoundationRow | undefined) {
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

function selectColumns(descriptor: InventoryFoundationDescriptor) {
  const fieldColumns = descriptor.fields.map((field) => field.column);
  return Array.from(new Set([...BASE_COLUMNS.split(", "), ...fieldColumns])).join(", ");
}

function lookupLabel(row: FoundationRow, keyColumn: string, nameColumn = "name") {
  const key = row[keyColumn];
  const name = row[nameColumn];
  return [key, name].filter((value) => typeof value === "string" && value.length > 0).join(" — ");
}

async function loadLookupData(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>,
) {
  const [branches, categories, locations, lots, products, uomCategories, variants, warehouses] = await Promise.all([
    supabase.from("branches").select("id, code, name").eq("tenant_id", context.tenantId).is("deleted_at", null).order("name"),
    supabase.from("inventory_product_categories").select("id, category_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_locations").select("id, location_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_lots").select("id, lot_key").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("lot_key"),
    supabase.from("inventory_products").select("id, product_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_uom_categories").select("id, category_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_product_variants").select("id, variant_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
    supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", context.tenantId).eq("company_id", context.companyId).is("deleted_at", null).order("name"),
  ]);

  const failed = [branches, categories, locations, lots, products, uomCategories, variants, warehouses].find((result) => result.error);
  if (failed?.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory lookup data.", cause: failed.error });
  }

  return {
    branches: (branches.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "code") })),
    categories: (categories.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "category_key") })),
    locations: (locations.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "location_key") })),
    lots: (lots.data ?? []).map((row) => ({ id: row.id as string, label: row.lot_key as string })),
    products: (products.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "product_key") })),
    uomCategories: (uomCategories.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "category_key") })),
    variants: (variants.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "variant_key") })),
    warehouses: (warehouses.data ?? []).map((row) => ({ id: row.id as string, label: lookupLabel(row as FoundationRow, "warehouse_key") })),
  };
}

export async function loadInventoryFoundationWorkspace(resource: string, query: unknown = {}): Promise<InventoryFoundationWorkspaceData> {
  const descriptor = getInventoryFoundationEntity(resource);
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: descriptor.viewPermission });

  const parsed = inventoryFoundationListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);

  let request = supabase
    .from(descriptor.table)
    .select(selectColumns(descriptor))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .limit(pageSize + 1);

  if (parsed.status) request = request.eq("status", parsed.status);

  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) request = request.or(descriptor.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(","));
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const [recordResult, lookups] = await Promise.all([
    request.order("created_at", { ascending: false }).order("id", { ascending: false }),
    loadLookupData(supabase, context),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not load ${descriptor.title}.`, cause: recordResult.error });
  }

  const records = (recordResult.data ?? []) as unknown as FoundationRow[];
  const visibleRecords = records.slice(0, pageSize);

  return {
    descriptor,
    lookups,
    nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
    pageSize,
    records: visibleRecords,
  };
}

export async function getInventoryFoundationRecord(resource: string, id: string) {
  const descriptor = getInventoryFoundationEntity(resource);
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: descriptor.viewPermission });

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [recordResult, lookups] = await Promise.all([
    supabase
      .from(descriptor.table)
      .select(selectColumns(descriptor))
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    loadLookupData(supabase, context),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "NOT_FOUND", message: `${descriptor.singular} was not found.`, cause: recordResult.error });
  }

  return { descriptor, lookups, record: recordResult.data as unknown as FoundationRow };
}
