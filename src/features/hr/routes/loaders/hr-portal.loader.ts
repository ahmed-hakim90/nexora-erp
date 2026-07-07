import "server-only";

import { ApplicationError } from "@/core/errors";
import type { EmployeeRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";

import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveManagerDirectReportIds(
  context: EmployeeRequestContext,
  asOfDate: string = todayIsoDate(),
): Promise<readonly string[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_assignments")
    .select("employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("assignment_type", "manager")
    .eq("reference_entity_id", context.employeeId)
    .eq("reference_entity_type", "hr_employees")
    .in("assignment_status", ["active", "planned"])
    .lte("effective_from", asOfDate)
    .or(`effective_to.is.null,effective_to.gte.${asOfDate}`)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not resolve manager team scope.",
      cause: error,
    });
  }

  return [...new Set((data ?? []).map((row) => String(row.employee_id)))];
}

export type PortalPayslipRow = Readonly<{
  currency: string;
  grossAmount: number;
  id: string;
  netAmount: number;
  paymentDate: string | null;
  payslipId: string;
  periodLabel: string;
  publishedAt: string | null;
  status: string;
}>;

export async function loadPortalPayslips(context: EmployeeRequestContext): Promise<readonly PortalPayslipRow[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data: publications, error } = await supabase
    .from("hr_payslip_publications")
    .select("id, payslip_id, publishing_status, published_at, payroll_period_id")
    .eq("employee_id", context.employeeId)
    .eq("publishing_status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load published payslips.",
      cause: error,
    });
  }

  const payslipIds = [...new Set((publications ?? []).map((row) => String(row.payslip_id)))];
  const periodIds = [...new Set((publications ?? []).map((row) => String(row.payroll_period_id)).filter(Boolean))];

  const payslipMap = new Map<string, Record<string, unknown>>();
  if (payslipIds.length > 0) {
    const { data: payslips } = await supabase
      .from("hr_payslips")
      .select("id, net_amount_metadata, gross_amount_metadata, currency, runtime_payslip_status, payroll_period_id")
      .in("id", payslipIds)
      .eq("employee_id", context.employeeId)
      .is("deleted_at", null);
    for (const payslip of payslips ?? []) {
      payslipMap.set(String(payslip.id), payslip as Record<string, unknown>);
    }
  }

  const periodMap = new Map<string, Record<string, unknown>>();
  if (periodIds.length > 0) {
    const { data: periods } = await supabase
      .from("hr_payroll_periods")
      .select("id, period_name, period_code, payment_date")
      .in("id", periodIds)
      .is("deleted_at", null);
    for (const period of periods ?? []) {
      periodMap.set(String(period.id), period as Record<string, unknown>);
    }
  }

  return (publications ?? []).map((row) => {
    const payslip = payslipMap.get(String(row.payslip_id));
    const period = periodMap.get(String(row.payroll_period_id ?? payslip?.payroll_period_id ?? ""));
    const periodLabel = period
      ? formatHrDisplayLabel(period.period_name, formatHrDisplayLabel(period.period_code, "Pay period"))
      : "Pay period";
    return {
      currency: String(payslip?.currency ?? "EGP"),
      grossAmount: Number(payslip?.gross_amount_metadata ?? 0),
      id: String(row.id),
      netAmount: Number(payslip?.net_amount_metadata ?? 0),
      paymentDate: period?.payment_date ? String(period.payment_date) : null,
      payslipId: String(row.payslip_id),
      periodLabel,
      publishedAt: row.published_at ? String(row.published_at) : null,
      status: formatHrStatusLabel(String(payslip?.runtime_payslip_status ?? row.publishing_status ?? "published")),
    };
  });
}

export type PortalTeamMemberRow = Readonly<{
  employeeNumber: string;
  fullName: string;
  id: string;
  status: string;
}>;

export async function loadManagerTeamMembers(context: EmployeeRequestContext): Promise<readonly PortalTeamMemberRow[]> {
  const directReportIds = await resolveManagerDirectReportIds(context);
  if (directReportIds.length === 0) return [];

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, full_name, employee_number, status")
    .eq("tenant_id", context.tenantId)
    .in("id", [...directReportIds])
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load manager team members.",
      cause: error,
    });
  }

  return (data ?? []).map((row) => ({
    employeeNumber: formatHrDisplayLabel(row.employee_number, "Employee"),
    fullName: formatHrDisplayLabel(row.full_name, "Employee"),
    id: String(row.id),
    status: formatHrStatusLabel(String(row.status)),
  }));
}

export type PortalManagerLeaveApprovalRow = Readonly<{
  employeeName: string;
  endDate: string;
  id: string;
  startDate: string;
  status: string;
}>;

export async function loadManagerPendingLeaveApprovals(
  context: EmployeeRequestContext,
): Promise<readonly PortalManagerLeaveApprovalRow[]> {
  const directReportIds = await resolveManagerDirectReportIds(context);
  if (directReportIds.length === 0) return [];

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select("id, employee_id, starts_on, ends_on, status")
    .eq("tenant_id", context.tenantId)
    .eq("status", "submitted")
    .in("employee_id", [...directReportIds])
    .is("deleted_at", null)
    .order("starts_on", { ascending: true })
    .limit(30);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load manager leave approvals.",
      cause: error,
    });
  }

  const employeeIds = [...new Set((data ?? []).map((row) => String(row.employee_id)))];
  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from("hr_employees")
      .select("id, full_name")
      .in("id", employeeIds);
    for (const employee of employees ?? []) {
      employeeMap.set(String(employee.id), formatHrDisplayLabel(employee.full_name, "Employee"));
    }
  }

  return (data ?? []).map((row) => ({
    employeeName: employeeMap.get(String(row.employee_id)) ?? String(row.employee_id),
    endDate: String(row.ends_on),
    id: String(row.id),
    startDate: String(row.starts_on),
    status: formatHrStatusLabel(String(row.status)),
  }));
}

export async function countManagerPendingLeaveApprovals(context: EmployeeRequestContext): Promise<number> {
  const directReportIds = await resolveManagerDirectReportIds(context);
  if (directReportIds.length === 0) return 0;

  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { count, error } = await supabase
    .from("hr_leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId)
    .eq("status", "submitted")
    .in("employee_id", [...directReportIds])
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not count manager leave approvals.",
      cause: error,
    });
  }

  return count ?? 0;
}

export type PortalLeaveRequestRow = Readonly<{
  days: string;
  endsOn: string;
  id: string;
  leaveType: string;
  startsOn: string;
  status: string;
}>;

export type PortalLeaveBalanceRow = Readonly<{
  asOfDate: string;
  availableQuantity: number;
  id: string;
  leaveType: string;
}>;

export type PortalLeaveTypeOption = Readonly<{
  id: string;
  name: string;
}>;

export type PortalAttendanceDayRow = Readonly<{
  id: string;
  lateMinutes: number;
  status: string;
  workDate: string;
  workedMinutes: number;
}>;

function readAttendanceDayMetrics(value: unknown): { lateMinutes: number; workedMinutes: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { lateMinutes: 0, workedMinutes: 0 };
  }
  const metrics = value as { late_minutes?: number; worked_minutes?: number; total_worked_minutes?: number };
  return {
    lateMinutes: Number(metrics.late_minutes ?? 0),
    workedMinutes: Number(metrics.worked_minutes ?? metrics.total_worked_minutes ?? 0),
  };
}

export async function loadPortalLeaveTypes(context: EmployeeRequestContext): Promise<readonly PortalLeaveTypeOption[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_leave_types")
    .select("id, name")
    .eq("tenant_id", context.tenantId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(50);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load leave types.",
      cause: error,
    });
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: formatHrDisplayLabel(row.name, "Leave"),
  }));
}

export async function loadPortalLeaveRequests(context: EmployeeRequestContext): Promise<readonly PortalLeaveRequestRow[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select("id, starts_on, ends_on, status, leave_type_id, quantity")
    .eq("employee_id", context.employeeId)
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("starts_on", { ascending: false })
    .limit(30);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load leave requests.",
      cause: error,
    });
  }

  const leaveTypeIds = [...new Set((data ?? []).map((row) => String(row.leave_type_id)))];
  const leaveTypeMap = new Map<string, string>();
  if (leaveTypeIds.length > 0) {
    const { data: leaveTypes } = await supabase.from("hr_leave_types").select("id, name").in("id", leaveTypeIds);
    for (const leaveType of leaveTypes ?? []) {
      leaveTypeMap.set(String(leaveType.id), formatHrDisplayLabel(leaveType.name, "Leave"));
    }
  }

  return (data ?? []).map((row) => ({
    days: String(row.quantity ?? "—"),
    endsOn: String(row.ends_on),
    id: String(row.id),
    leaveType: leaveTypeMap.get(String(row.leave_type_id)) ?? "Leave",
    startsOn: String(row.starts_on),
    status: formatHrStatusLabel(String(row.status)),
  }));
}

export async function loadPortalLeaveBalances(context: EmployeeRequestContext): Promise<readonly PortalLeaveBalanceRow[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_leave_balances")
    .select("id, available_quantity, leave_type_id, as_of_date")
    .eq("employee_id", context.employeeId)
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("as_of_date", { ascending: false })
    .limit(20);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load leave balances.",
      cause: error,
    });
  }

  const leaveTypeIds = [...new Set((data ?? []).map((row) => String(row.leave_type_id)))];
  const leaveTypeMap = new Map<string, string>();
  if (leaveTypeIds.length > 0) {
    const { data: leaveTypes } = await supabase.from("hr_leave_types").select("id, name").in("id", leaveTypeIds);
    for (const leaveType of leaveTypes ?? []) {
      leaveTypeMap.set(String(leaveType.id), formatHrDisplayLabel(leaveType.name, "Leave"));
    }
  }

  return (data ?? []).map((row) => ({
    asOfDate: String(row.as_of_date),
    availableQuantity: Number(row.available_quantity ?? 0),
    id: String(row.id),
    leaveType: leaveTypeMap.get(String(row.leave_type_id)) ?? "Leave",
  }));
}

export async function loadPortalAttendanceDays(context: EmployeeRequestContext): Promise<readonly PortalAttendanceDayRow[]> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_attendance_days")
    .select("id, work_date, status, expected_vs_actual, total_worked_minutes")
    .eq("employee_id", context.employeeId)
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("work_date", { ascending: false })
    .limit(30);

  if (error) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not load attendance days.",
      cause: error,
    });
  }

  return (data ?? []).map((row) => {
    const metrics = readAttendanceDayMetrics(row.expected_vs_actual);
    return {
      id: String(row.id),
      lateMinutes: metrics.lateMinutes,
      status: formatHrStatusLabel(String(row.status)),
      workDate: String(row.work_date),
      workedMinutes: Number(row.total_worked_minutes ?? metrics.workedMinutes),
    };
  });
}
