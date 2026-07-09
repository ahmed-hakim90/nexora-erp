import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { resolveHrLookupProviderKey } from "@/platform/operator-experience/lookup-registry";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";

import { getHrFoundationEntity, type HrFoundationDescriptor } from "../../application/foundation-entities";
import { hrFoundationListQuerySchema } from "../../application/schemas/hr-foundation.schema";
import { formatHrFoundationListValue, type HrFoundationLookupOption } from "../../application/utils/hr-foundation-display";
import { formatHrDisplayLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

type FoundationRow = Record<string, unknown>;

export type { HrFoundationLookupOption };
export { formatHrFoundationListValue };

export type HrFoundationWorkspaceData = Readonly<{
  descriptor: HrFoundationDescriptor;
  records: readonly FoundationRow[];
  nextCursor: string | null;
  pageSize: number;
  lookups: Readonly<Record<string, readonly HrFoundationLookupOption[]>>;
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

function selectColumns(descriptor: HrFoundationDescriptor) {
  const fieldColumns = descriptor.fields.map((field) => field.column);
  return Array.from(new Set([...BASE_COLUMNS.split(", "), ...fieldColumns])).join(", ");
}

async function buildFoundationLookups(descriptor: HrFoundationDescriptor, records: readonly FoundationRow[]) {
  const idsByLookupKey = new Map<string, Set<string>>();
  for (const record of records) {
    for (const field of descriptor.fields) {
      if (field.type !== "lookup" || !field.lookup) continue;
      const value = record[field.column];
      if (value === null || value === undefined || value === "") continue;
      const bucket = idsByLookupKey.get(field.lookup) ?? new Set<string>();
      bucket.add(String(value));
      idsByLookupKey.set(field.lookup, bucket);
    }
  }

  const lookups: Record<string, HrFoundationLookupOption[]> = {};
  await Promise.all(
    [...idsByLookupKey.entries()].map(async ([lookupKey, ids]) => {
      const providerKey = resolveHrLookupProviderKey(lookupKey);
      if (!providerKey) return;
      lookups[lookupKey] = [...(await hydrateLookupOptions(providerKey, [...ids]))];
    }),
  );
  return lookups;
}

export async function loadHrFoundationWorkspace(resource: string, query: unknown = {}): Promise<HrFoundationWorkspaceData> {
  const descriptor = getHrFoundationEntity(resource);
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: descriptor.viewPermission });
  const parsed = hrFoundationListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = parsed.pageSize;
  const cursor = decodeCursor(parsed.cursor);

  let request = supabase
    .from(descriptor.table)
    .select(selectColumns(descriptor))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (descriptor.fixedFilter) request = request.eq(descriptor.fixedFilter.column, descriptor.fixedFilter.value);
  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) request = request.or(descriptor.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(","));
  }
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const { data, error } = await request;
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not load ${descriptor.title}.`, cause: error });

  const rows = (data ?? []) as unknown as FoundationRow[];
  const visibleRecords = rows.slice(0, pageSize);
  const lookups = await buildFoundationLookups(descriptor, visibleRecords);

  return {
    descriptor,
    lookups,
    nextCursor: rows.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
    pageSize,
    records: visibleRecords,
  };
}

export async function getHrFoundationRecord(resource: string, id: string) {
  const descriptor = getHrFoundationEntity(resource);
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: descriptor.viewPermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from(descriptor.table)
    .select(selectColumns(descriptor))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (descriptor.fixedFilter) request = request.eq(descriptor.fixedFilter.column, descriptor.fixedFilter.value);

  const { data, error } = await request.single();
  if (error) throw new ApplicationError({ code: "NOT_FOUND", message: `${descriptor.singular} was not found.`, cause: error });

  const record = data as unknown as FoundationRow;
  const lookups = await buildFoundationLookups(descriptor, [record]);
  return { descriptor, lookups, record };
}

export async function loadHrOrgHierarchy() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.positionsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_org_units")
    .select("id, name, org_unit_key, kind, parent_org_unit_id, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load organization hierarchy.", cause: error });
  return (data ?? []).map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    label: formatHrDisplayLabel(row.name, "Unit"),
    parentId: row.parent_org_unit_id ? String(row.parent_org_unit_id) : null,
    status: String(row.status),
  }));
}
