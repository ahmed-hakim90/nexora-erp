import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatBusinessCodeSequence, normalizeBusinessCode, parseBusinessCodeSequence, type BusinessCodeConfig } from "./business-codes";

export type BusinessCodeSequenceTarget = Readonly<{
  column: string;
  config: BusinessCodeConfig;
  scope: Readonly<{
    tenantId: string;
    companyId?: string | null;
    branchId?: string | null;
  }>;
  table: string;
}>;

export async function generateNextBusinessCode(supabase: SupabaseClient, target: BusinessCodeSequenceTarget) {
  const storagePrefix = normalizeBusinessCode(target.config.prefix, target.config);
  let request = supabase
    .from(target.table)
    .select(target.column)
    .eq("tenant_id", target.scope.tenantId)
    .ilike(target.column, `${storagePrefix}-%`)
    .is("deleted_at", null)
    .order(target.column, { ascending: false })
    .limit(100);

  if (target.scope.companyId) {
    request = request.eq("company_id", target.scope.companyId);
  }

  if (target.config.scope === "branch" && target.scope.branchId) {
    request = request.eq("branch_id", target.scope.branchId);
  }

  const { data, error } = await request;
  if (error) throw error;

  const nextSequence = (data ?? []).reduce((max, row) => {
    const sequence = parseBusinessCodeSequence((row as unknown as Record<string, unknown>)[target.column], storagePrefix);
    return sequence && sequence > max ? sequence : max;
  }, 0) + 1;

  return formatBusinessCodeSequence(storagePrefix, nextSequence, target.config);
}

export function setGeneratedBusinessCode(input: Record<string, unknown>, fieldName: string, value: string) {
  const existing = input[fieldName];
  if (typeof existing !== "string" || existing.trim().length === 0) {
    input[fieldName] = value;
  }
}
