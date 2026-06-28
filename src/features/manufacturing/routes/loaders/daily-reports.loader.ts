import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { manufacturingDailyReportListQuerySchema } from "../../application/schemas/daily-reports.schema";
import type { ManufacturingDailyReportRecord, ManufacturingDailyReportWorkspaceData } from "../../application/types/daily-reports";
import { MANUFACTURING_PERMISSIONS } from "../../permissions/permission-registry";

export type { ManufacturingDailyReportRecord, ManufacturingDailyReportWorkspaceData } from "../../application/types/daily-reports";

export const REPORT_COLUMNS = "id, tenant_id, company_id, branch_id, report_key, report_date, shift_key, manufacturing_product_id, production_line_id, supervisor_ref_id, planned_quantity, actual_quantity, scrap_quantity, rework_quantity, downtime_minutes, worker_output, notes, status, is_active, created_at, created_by, updated_at, updated_by, version";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
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

function encodeCursor(record: ManufacturingDailyReportRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

function mapReport(row: Record<string, unknown>): ManufacturingDailyReportRecord {
  return {
    actualQuantity: toNumber(row.actual_quantity),
    branchId: row.branch_id as string,
    companyId: row.company_id as string,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | null,
    downtimeMinutes: toNumber(row.downtime_minutes),
    id: row.id as string,
    isActive: row.is_active as boolean,
    manufacturingProductId: row.manufacturing_product_id as string,
    notes: row.notes as string | null,
    plannedQuantity: toNumber(row.planned_quantity),
    productionLineId: row.production_line_id as string,
    reportDate: row.report_date as string,
    reportKey: row.report_key as string,
    reworkQuantity: toNumber(row.rework_quantity),
    scrapQuantity: toNumber(row.scrap_quantity),
    shiftKey: row.shift_key as string,
    status: row.status as ManufacturingDailyReportRecord["status"],
    supervisorRefId: row.supervisor_ref_id as string | null,
    tenantId: row.tenant_id as string,
    updatedAt: row.updated_at as string,
    updatedBy: row.updated_by as string | null,
    version: row.version as number,
    workerOutput: Array.isArray(row.worker_output) ? row.worker_output : [],
  };
}

export async function loadManufacturingDailyReportsWorkspace(query: unknown = {}): Promise<ManufacturingDailyReportWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: MANUFACTURING_PERMISSIONS.dailyReportsView });

  const parsed = manufacturingDailyReportListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);
  let request = supabase
    .from("manufacturing_daily_reports")
    .select(REPORT_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("branch_id", context.branchId)
    .is("deleted_at", null)
    .limit(pageSize + 1);

  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.reportDate) request = request.eq("report_date", parsed.reportDate);
  if (parsed.shiftKey) request = request.eq("shift_key", parsed.shiftKey);
  if (parsed.manufacturingProductId) request = request.eq("manufacturing_product_id", parsed.manufacturingProductId);
  if (parsed.productionLineId) request = request.eq("production_line_id", parsed.productionLineId);

  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) request = request.or(`report_key.ilike.%${term}%,shift_key.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const [reportResult, productResult, lineResult, workerResult] = await Promise.all([
    request.order("created_at", { ascending: false }).order("id", { ascending: false }),
    supabase
      .from("manufacturing_products")
      .select("id, product_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("manufacturing_lines")
      .select("id, line_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("manufacturing_profiles")
      .select("id, manufacturing_code, default_role")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("branch_id", context.branchId)
      .is("deleted_at", null)
      .order("manufacturing_code", { ascending: true }),
  ]);

  if (reportResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load daily production reports.", cause: reportResult.error });
  }

  if (productResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load manufacturing products.", cause: productResult.error });
  }

  if (lineResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load manufacturing lines.", cause: lineResult.error });
  }

  if (workerResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load manufacturing workers.", cause: workerResult.error });
  }

  const records = (reportResult.data ?? []).map((row) => mapReport(row as Record<string, unknown>));
  const visibleRecords = records.slice(0, pageSize);

  return {
    lines: (lineResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.line_key as string} — ${row.name as string}` })),
    nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
    pageSize,
    products: (productResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.product_key as string} — ${row.name as string}` })),
    records: visibleRecords,
    workers: (workerResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: `${row.manufacturing_code as string} — ${row.default_role as string}`,
    })),
  };
}
