import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

type TargetRecord = Readonly<Record<string, unknown> & { id: string; status: string; createdAt: string }>;
export type TargetLookupOption = Readonly<{
  id: string;
  label: string;
  meta?: string;
}>;

export type ManufacturingTargetsWorkspaceData = Readonly<{
  productTargets: readonly TargetRecord[];
  lineTargets: readonly TargetRecord[];
  workerTargets: readonly TargetRecord[];
  dailyReports: readonly TargetRecord[];
  lookups: Readonly<{
    lines: readonly TargetLookupOption[];
    plans: readonly TargetLookupOption[];
    products: readonly TargetLookupOption[];
    workers: readonly TargetLookupOption[];
  }>;
}>;

function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function mapRow(row: Record<string, unknown>): TargetRecord {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    record[toCamelCase(key)] = value;
  }
  return record as TargetRecord;
}

function mapLookup(
  row: Record<string, unknown>,
  labelKey: string,
  metaKey?: string,
): TargetLookupOption {
  const label = String(row[labelKey] ?? row.id);
  const meta = metaKey && row[metaKey] ? String(row[metaKey]) : undefined;

  return {
    id: String(row.id),
    label: meta ? `${meta} — ${label}` : label,
  };
}

async function assertNoError(error: unknown, message: string): Promise<void> {
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: error });
  }
}

export async function loadManufacturingTargetsWorkspace(): Promise<ManufacturingTargetsWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.targetsView });

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [
    productTargets,
    lineTargets,
    workerTargets,
    dailyReports,
    productLookup,
    lineLookup,
    planLookup,
    workerLookup,
  ] = await Promise.all([
    supabase
      .from("manufacturing_product_targets")
      .select("id, target_key, manufacturing_product_id, target_period, target_quantity, status, is_active, created_at, updated_at, version")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("manufacturing_line_targets")
      .select("id, target_key, plan_id, manufacturing_product_id, production_line_id, planned_quantity, actual_quantity, achievement_percent, status, is_active, created_at, updated_at, version")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("manufacturing_worker_targets")
      .select("id, target_key, plan_id, production_line_id, worker_ref_id, target_quantity, actual_quantity, achievement_percent, status, is_active, created_at, updated_at, version")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("manufacturing_daily_reports")
      .select("id, report_key, report_date, shift_key, planned_quantity, actual_quantity, scrap_quantity, rework_quantity, downtime_minutes, status, is_active, created_at, updated_at, version")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("report_date", { ascending: false })
      .limit(50),
    supabase
      .from("manufacturing_products")
      .select("id, product_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("manufacturing_lines")
      .select("id, line_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(100),
    supabase
      .from("manufacturing_plans")
      .select("id, plan_key, plan_date")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("plan_date", { ascending: false })
      .limit(100),
    supabase
      .from("manufacturing_profiles")
      .select("id, manufacturing_code, default_role")
      .eq("tenant_id", context.tenantId)
      .eq("branch_id", context.branchId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("manufacturing_code", { ascending: true })
      .limit(100),
  ]);

  await assertNoError(productTargets.error, "Could not load product targets.");
  await assertNoError(lineTargets.error, "Could not load line targets.");
  await assertNoError(workerTargets.error, "Could not load worker targets.");
  await assertNoError(dailyReports.error, "Could not load DPR achievement facts.");
  await assertNoError(productLookup.error, "Could not load product lookup.");
  await assertNoError(lineLookup.error, "Could not load line lookup.");
  await assertNoError(planLookup.error, "Could not load plan lookup.");
  await assertNoError(workerLookup.error, "Could not load worker lookup.");

  return {
    dailyReports: (dailyReports.data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    lineTargets: (lineTargets.data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    lookups: {
      lines: (lineLookup.data ?? []).map((row) => mapLookup(row as Record<string, unknown>, "name", "line_key")),
      plans: (planLookup.data ?? []).map((row) => mapLookup(row as Record<string, unknown>, "plan_key", "plan_date")),
      products: (productLookup.data ?? []).map((row) => mapLookup(row as Record<string, unknown>, "name", "product_key")),
      workers: (workerLookup.data ?? []).map((row) => mapLookup(row as Record<string, unknown>, "manufacturing_code", "default_role")),
    },
    productTargets: (productTargets.data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
    workerTargets: (workerTargets.data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
  };
}
