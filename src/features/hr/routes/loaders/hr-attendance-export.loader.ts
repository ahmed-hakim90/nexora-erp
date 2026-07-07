import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrAttendancePayrollExportService } from "../../application/services/hr-attendance-payroll-export.service";
import { formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrAttendanceExportHistoryRecord = Readonly<{
  createdAt: string;
  downloadedAt: string | null;
  employeeCount: number;
  id: string;
  periodEnd: string;
  periodStart: string;
  status: string;
}>;

export type HrAttendanceExportWorkspaceData = Readonly<{
  closings: readonly {
    blockedEmployeeCount: number;
    employeeCount: number;
    id: string;
    payrollReadyPercent: number;
    periodEnd: string;
    periodStart: string;
    readyEmployeeCount: number;
    scope: string;
    status: string;
  }[];
  defaultPeriodEnd: string;
  defaultPeriodStart: string;
  history: readonly HrAttendanceExportHistoryRecord[];
  metrics: Readonly<{
    employeesBlocked: number;
    employeesReady: number;
    exportedDays: number;
    lockedDays: number;
    openDays: number;
    payrollReadyPercent: number;
  }>;
}>;

function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    periodEnd: end.toISOString().slice(0, 10),
    periodStart: start.toISOString().slice(0, 10),
  };
}

export async function loadHrAttendanceExportWorkspace(): Promise<HrAttendanceExportWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceExport });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const bounds = monthBounds();

  const [
    closingsResult,
    historyResult,
    openDaysCount,
    lockedDaysCount,
    exportedDaysCount,
    readyDaysCount,
    blockedEmployeesResult,
  ] = await Promise.all([
    supabase
      .from("hr_attendance_closings")
      .select("id, scope, period_start, period_end, status, employee_count, ready_employee_count, blocked_employee_count, payroll_ready_percent")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_attendance_payroll_export_batches")
      .select("id, period_start, period_end, employee_count, status, created_at, downloaded_at")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["pending", "observed", "needs_review", "processing", "reopened"])
      .gte("work_date", bounds.periodStart)
      .lte("work_date", bounds.periodEnd)
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "locked")
      .gte("work_date", bounds.periodStart)
      .lte("work_date", bounds.periodEnd)
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "exported_to_payroll")
      .gte("work_date", bounds.periodStart)
      .lte("work_date", bounds.periodEnd)
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["approved", "ready_for_payroll", "locked", "exported_to_payroll"])
      .gte("work_date", bounds.periodStart)
      .lte("work_date", bounds.periodEnd)
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_closings")
      .select("blocked_employee_count, ready_employee_count")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["processing", "open"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (closingsResult.error || historyResult.error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load attendance export workspace.",
      cause: closingsResult.error ?? historyResult.error,
    });
  }

  const totalDays =
    (openDaysCount.count ?? 0) + (lockedDaysCount.count ?? 0) + (exportedDaysCount.count ?? 0) + (readyDaysCount.count ?? 0);
  const payrollReadyPercent = totalDays === 0 ? 0 : Math.round(((readyDaysCount.count ?? 0) / totalDays) * 10000) / 100;

  return {
    closings: (closingsResult.data ?? []).map((row) => ({
      blockedEmployeeCount: Number(row.blocked_employee_count ?? 0),
      employeeCount: Number(row.employee_count ?? 0),
      id: String(row.id),
      payrollReadyPercent: Number(row.payroll_ready_percent ?? 0),
      periodEnd: String(row.period_end),
      periodStart: String(row.period_start),
      readyEmployeeCount: Number(row.ready_employee_count ?? 0),
      scope: formatHrStatusLabel(String(row.scope)),
      status: formatHrStatusLabel(String(row.status)),
    })),
    defaultPeriodEnd: bounds.periodEnd,
    defaultPeriodStart: bounds.periodStart,
    history: (historyResult.data ?? []).map((row) => ({
      createdAt: String(row.created_at),
      downloadedAt: row.downloaded_at ? String(row.downloaded_at) : null,
      employeeCount: Number(row.employee_count ?? 0),
      id: String(row.id),
      periodEnd: String(row.period_end),
      periodStart: String(row.period_start),
      status: formatHrStatusLabel(String(row.status)),
    })),
    metrics: {
      employeesBlocked: Number(blockedEmployeesResult.data?.blocked_employee_count ?? 0),
      employeesReady: Number(blockedEmployeesResult.data?.ready_employee_count ?? 0),
      exportedDays: exportedDaysCount.count ?? 0,
      lockedDays: lockedDaysCount.count ?? 0,
      openDays: openDaysCount.count ?? 0,
      payrollReadyPercent,
    },
  };
}

export async function loadHrAttendanceExportPreview(filters: {
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
  payrollGroupId?: string;
  periodEnd: string;
  periodStart: string;
}) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceExport });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendancePayrollExportService(supabase, context);
  return service.previewExport(filters);
}
