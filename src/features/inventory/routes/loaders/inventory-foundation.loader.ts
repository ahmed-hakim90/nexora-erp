import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { getInventoryFoundationEntity, type InventoryFoundationDescriptor } from "../../application/foundation-entities";
import { resolveFoundationLookupProviderKey } from "@/platform/operator-experience/lookup-registry";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";
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

async function buildFoundationLookups(
  descriptor: InventoryFoundationDescriptor,
  records: readonly FoundationRow[],
) {
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

  const lookups: Record<string, InventoryFoundationLookupOption[]> = {};
  await Promise.all(
    [...idsByLookupKey.entries()].map(async ([lookupKey, ids]) => {
      const providerKey = resolveFoundationLookupProviderKey(lookupKey);
      if (!providerKey) return;
      lookups[lookupKey] = [...await hydrateLookupOptions(providerKey, [...ids])];
    }),
  );
  return lookups;
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

  const recordResult = await request.order("created_at", { ascending: false }).order("id", { ascending: false });

  if (recordResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not load ${descriptor.title}.`, cause: recordResult.error });
  }

  const records = (recordResult.data ?? []) as unknown as FoundationRow[];
  const visibleRecords = records.slice(0, pageSize);
  const resolvedLookups = await buildFoundationLookups(descriptor, visibleRecords);

  return {
    descriptor,
    lookups: resolvedLookups,
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
  const [recordResult] = await Promise.all([
    supabase
      .from(descriptor.table)
      .select(selectColumns(descriptor))
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
  ]);

  if (recordResult.error) {
    throw new ApplicationError({ code: "NOT_FOUND", message: `${descriptor.singular} was not found.`, cause: recordResult.error });
  }

  const record = recordResult.data as unknown as FoundationRow;
  const lookups = await buildFoundationLookups(descriptor, [record]);
  return { descriptor, lookups, record };
}
