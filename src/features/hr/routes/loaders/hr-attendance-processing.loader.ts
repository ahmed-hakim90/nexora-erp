import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { readAttendanceDayMetrics, HrAttendanceService } from "../../application/services/hr-attendance.service";
import { formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrAttendanceProcessingMetrics = Readonly<{
  approvedDays: number;
  employeesBlocked: number;
  employeesReady: number;
  exportedDays: number;
  lockedDays: number;
  needsReviewDays: number;
  openDays: number;
  openExceptions: number;
  payrollReadyDays: number;
  payrollReadyPercent: number;
  pendingReview: number;
}>;

export type HrAttendanceReviewQueueRecord = Readonly<{
  attendanceDayId: string | null;
  createdAt: string;
  employeeId: string;
  employeeLabel: string;
  exceptionId: string | null;
  id: string;
  itemType: string;
  itemTypeLabel: string;
  notes: string | null;
  priority: number;
  queueItemId: string | null;
  rawStatus: string;
  severity: string;
  severityLabel: string;
  source: "queue" | "exception";
  status: string;
  workDate: string;
}>;

export type HrAttendanceSummaryRecord = Readonly<{
  employeeId: string;
  employeeLabel: string;
  id: string;
  lateEarlyStatus: string | null;
  lateMinutes: number;
  missingIn: boolean;
  missingOut: boolean;
  overtimeMinutes: number;
  payrollReady: boolean;
  rawStatus: string;
  status: string;
  workDate: string;
  workedMinutes: number;
}>;

export type HrAttendanceProcessingWorkspaceData = Readonly<{
  metrics: HrAttendanceProcessingMetrics;
  queue: readonly HrAttendanceReviewQueueRecord[];
  summary: readonly HrAttendanceSummaryRecord[];
}>;

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function loadEmployeeMap(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  employeeIds: readonly string[],
) {
  const employeeMap = new Map<string, string>();
  if (employeeIds.length === 0) return employeeMap;
  const { data } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", [...employeeIds]);
  for (const employee of data ?? []) {
    employeeMap.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
  }
  return employeeMap;
}

export async function loadHrAttendanceProcessingWorkspace(): Promise<HrAttendanceProcessingWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceService(supabase, context);

  await service.syncOpenExceptionsToReviewQueue();

  const bounds = {
    periodEnd: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
    periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10),
  };

  const [
    queueResult,
    exceptionsResult,
    needsReviewCount,
    approvedCount,
    payrollReadyCount,
    daysResult,
    openDaysCount,
    lockedDaysCount,
    exportedDaysCount,
    latestClosing,
  ] = await Promise.all([
    supabase
      .from("hr_attendance_review_queue")
      .select(
        "id, employee_id, attendance_day_id, attendance_exception_id, item_type, status, priority, created_at, hr_attendance_exceptions(exception_type, severity, status, metadata), hr_attendance_days(work_date)",
      )
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["pending", "assigned", "in_review"])
      .is("deleted_at", null)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("hr_attendance_exceptions")
      .select("id, employee_id, attendance_day_id, exception_type, severity, status, metadata, created_at, hr_attendance_days(work_date)")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "needs_review")
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "approved")
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["approved", "locked", "exported_to_payroll"])
      .is("deleted_at", null),
    supabase
      .from("hr_attendance_days")
      .select("id, employee_id, work_date, status, expected_vs_actual, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(50),
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
      .from("hr_attendance_closings")
      .select("ready_employee_count, blocked_employee_count, payroll_ready_percent")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (queueResult.error || exceptionsResult.error || daysResult.error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load attendance processing workspace.",
      cause: queueResult.error ?? exceptionsResult.error ?? daysResult.error,
    });
  }

  const queueRows = queueResult.data ?? [];
  const exceptionRows = exceptionsResult.data ?? [];
  const dayRows = daysResult.data ?? [];

  const employeeIds = [
    ...new Set([
      ...queueRows.map((row) => String(row.employee_id)),
      ...exceptionRows.map((row) => String(row.employee_id)),
      ...dayRows.map((row) => String(row.employee_id)),
    ]),
  ];
  const employeeMap = await loadEmployeeMap(supabase, employeeIds);

  const queueExceptionIds = new Set(
    queueRows.map((row) => (row.attendance_exception_id ? String(row.attendance_exception_id) : null)).filter(Boolean),
  );

  const queueRecords: HrAttendanceReviewQueueRecord[] = queueRows.map((row) => {
    const exception = row.hr_attendance_exceptions as {
      exception_type?: string;
      metadata?: unknown;
      severity?: string;
      status?: string;
    } | null;
    const day = row.hr_attendance_days as { work_date?: string } | null;
    const metadata = readMetadata(exception?.metadata);
    return {
      attendanceDayId: row.attendance_day_id ? String(row.attendance_day_id) : null,
      createdAt: String(row.created_at),
      employeeId: String(row.employee_id),
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      exceptionId: row.attendance_exception_id ? String(row.attendance_exception_id) : null,
      id: String(row.id),
      itemType: String(row.item_type),
      itemTypeLabel: formatHrStatusLabel(String(row.item_type)),
      notes: metadata.notes ? String(metadata.notes) : null,
      priority: Number(row.priority ?? 100),
      queueItemId: String(row.id),
      rawStatus: String(row.status),
      severity: String(exception?.severity ?? "medium"),
      severityLabel: formatHrStatusLabel(String(exception?.severity ?? "medium")),
      source: "queue" as const,
      status: formatHrStatusLabel(String(row.status)),
      workDate: day?.work_date ? String(day.work_date) : "—",
    };
  });

  const fallbackExceptionRecords: HrAttendanceReviewQueueRecord[] = exceptionRows
    .filter((row) => !queueExceptionIds.has(String(row.id)))
    .map((row) => {
      const day = row.hr_attendance_days as { work_date?: string } | null;
      const metadata = readMetadata(row.metadata);
      return {
        attendanceDayId: row.attendance_day_id ? String(row.attendance_day_id) : null,
        createdAt: String(row.created_at),
        employeeId: String(row.employee_id),
        employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
        exceptionId: String(row.id),
        id: String(row.id),
        itemType: String(row.exception_type),
        itemTypeLabel: formatHrStatusLabel(String(row.exception_type)),
        notes: metadata.notes ? String(metadata.notes) : null,
        priority: 100,
        queueItemId: null,
        rawStatus: String(row.status),
        severity: String(row.severity ?? "medium"),
        severityLabel: formatHrStatusLabel(String(row.severity ?? "medium")),
        source: "exception" as const,
        status: formatHrStatusLabel(String(row.status)),
        workDate: day?.work_date ? String(day.work_date) : String(row.created_at).slice(0, 10),
      };
    });

  const queue = [...queueRecords, ...fallbackExceptionRecords].sort((left, right) => left.priority - right.priority);

  const dayIds = dayRows.map((row) => String(row.id));
  const violationMap = new Map<string, { lateMinutes: number; earlyMinutes: number; status: string }>();
  if (dayIds.length > 0) {
    const { data: violations } = await supabase
      .from("hr_late_early_violations")
      .select("attendance_day_id, late_minutes, early_leave_minutes, status")
      .eq("tenant_id", context.tenantId)
      .in("attendance_day_id", dayIds)
      .is("deleted_at", null);
    for (const row of violations ?? []) {
      violationMap.set(String(row.attendance_day_id), {
        earlyMinutes: Number(row.early_leave_minutes ?? 0),
        lateMinutes: Number(row.late_minutes ?? 0),
        status: String(row.status),
      });
    }
  }

  const summary: HrAttendanceSummaryRecord[] = dayRows.map((row) => {
    const metrics = readAttendanceDayMetrics(row.expected_vs_actual);
    const metadata = readMetadata(row.metadata);
    const rawStatus = String(row.status);
    const violation = violationMap.get(String(row.id));
    const lateEarlyStatus = violation
      ? violation.lateMinutes > 0 && violation.earlyMinutes > 0
        ? "Late + Early"
        : violation.lateMinutes > 0
          ? "Late"
          : violation.earlyMinutes > 0
            ? "Early"
            : formatHrStatusLabel(violation.status)
      : null;
    return {
      employeeId: String(row.employee_id),
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      lateEarlyStatus,
      lateMinutes: violation?.lateMinutes ?? metrics.lateMinutes,
      missingIn: metrics.missingIn,
      missingOut: metrics.missingOut,
      overtimeMinutes: metrics.overtimeMinutes,
      payrollReady: ["approved", "locked", "exported_to_payroll"].includes(rawStatus) || Boolean(metadata.payroll_ready),
      rawStatus,
      status: formatHrStatusLabel(rawStatus),
      workDate: String(row.work_date),
      workedMinutes: metrics.workedMinutes,
    };
  });

  const totalTrackedDays =
    (openDaysCount.count ?? 0) + (lockedDaysCount.count ?? 0) + (exportedDaysCount.count ?? 0) + (payrollReadyCount.count ?? 0);
  const payrollReadyPercent =
    totalTrackedDays === 0 ? 0 : Math.round(((payrollReadyCount.count ?? 0) / totalTrackedDays) * 10000) / 100;

  const metrics: HrAttendanceProcessingMetrics = {
    approvedDays: approvedCount.count ?? 0,
    employeesBlocked: Number(latestClosing.data?.blocked_employee_count ?? 0),
    employeesReady: Number(latestClosing.data?.ready_employee_count ?? 0),
    exportedDays: exportedDaysCount.count ?? 0,
    lockedDays: lockedDaysCount.count ?? 0,
    needsReviewDays: needsReviewCount.count ?? 0,
    openDays: openDaysCount.count ?? 0,
    openExceptions: exceptionRows.length,
    payrollReadyDays: payrollReadyCount.count ?? 0,
    payrollReadyPercent: Number(latestClosing.data?.payroll_ready_percent ?? payrollReadyPercent),
    pendingReview: queue.length,
  };

  return { metrics, queue, summary };
}
