import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { formatHrDisplayLabel, formatHrStatusLabel, HR_PERMISSIONS } from "@/features/hr/public-api";

import { HrAttendanceLeaveWorkspace } from "../_components/hr-attendance-leave-workspace";
import { HrShell } from "../_components/hr-shell";
import { leaveCalendarQueryRange, resolveLeaveCalendarMonth } from "../_components/hr-leave-calendar";

export default async function HrAttendanceLeavePage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const activeTab = params.tab ?? (params.action === "leave" ? "leave" : "leave");
  const highlightCreate = params.create === "1" || params.action === "leave";
  const calendarMonth = resolveLeaveCalendarMonth(params);
  const calendarRange = leaveCalendarQueryRange(calendarMonth.year, calendarMonth.month);

  let leaveRequest = supabase
    .from("hr_leave_requests")
    .select("id, employee_id, starts_on, ends_on, status, leave_type_id, quantity, approval_status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("starts_on", { ascending: false })
    .limit(50);

  if (params.employeeId) leaveRequest = leaveRequest.eq("employee_id", params.employeeId);
  if (params.status) leaveRequest = leaveRequest.eq("status", params.status);

  let calendarLeaveQuery = supabase
    .from("hr_leave_requests")
    .select("id, employee_id, starts_on, ends_on, status, leave_type_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .in("status", ["approved", "submitted", "under_review"])
    .lte("starts_on", calendarRange.to)
    .gte("ends_on", calendarRange.from)
    .order("starts_on", { ascending: true })
    .limit(200);

  if (params.employeeId) calendarLeaveQuery = calendarLeaveQuery.eq("employee_id", params.employeeId);

  let balanceQuery = supabase
    .from("hr_leave_balances")
    .select("id, employee_id, available_quantity, leave_type_id, as_of_date")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("as_of_date", { ascending: false })
    .limit(50);

  if (params.employeeId) balanceQuery = balanceQuery.eq("employee_id", params.employeeId);

  let punchesQuery = supabase
    .from("hr_attendance_punch_logs")
    .select("id, employee_id, punch_time, punch_type, source")
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("punch_time", { ascending: false })
    .limit(50);

  if (params.employeeId) punchesQuery = punchesQuery.eq("employee_id", params.employeeId);

  let daysQuery = supabase
    .from("hr_attendance_days")
    .select("id, employee_id, work_date, status, expected_vs_actual")
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("work_date", { ascending: false })
    .limit(50);

  if (params.employeeId) daysQuery = daysQuery.eq("employee_id", params.employeeId);
  if (params.status === "present") daysQuery = daysQuery.in("status", ["approved", "present", "complete"]);

  let exceptionsQuery = supabase
    .from("hr_attendance_exceptions")
    .select("id, employee_id, exception_type, status, created_at")
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.employeeId) exceptionsQuery = exceptionsQuery.eq("employee_id", params.employeeId);
  if (params.status === "open") exceptionsQuery = exceptionsQuery.eq("status", "open");

  const [leaveRequestsResult, balancesResult, leaveTypesResult, punchesResult, daysResult, exceptionsResult, calendarLeaveResult] =
    await Promise.all([
      leaveRequest,
      balanceQuery,
      supabase
        .from("hr_leave_types")
        .select("id, name, code")
        .eq("tenant_id", context.tenantId)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(100),
      punchesQuery,
      daysQuery,
      exceptionsQuery,
      calendarLeaveQuery,
    ]);

  const employeeIds = [
    ...new Set([
      ...(leaveRequestsResult.data ?? []).map((row) => String(row.employee_id)),
      ...(balancesResult.data ?? []).map((row) => String(row.employee_id)),
      ...(punchesResult.data ?? []).map((row) => String(row.employee_id)),
      ...(daysResult.data ?? []).map((row) => String(row.employee_id)),
      ...(exceptionsResult.data ?? []).map((row) => String(row.employee_id)),
      ...(calendarLeaveResult.data ?? []).map((row) => String(row.employee_id)),
    ]),
  ];
  const employeeNames = new Map<string, string>();
  if (employeeIds.length > 0) {
    const employees = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const employee of employees.data ?? []) {
      employeeNames.set(String(employee.id), `${employee.full_name} (${employee.employee_number})`);
    }
  }

  const leaveTypeNames = new Map((leaveTypesResult.data ?? []).map((row) => [String(row.id), String(row.name)]));
  const leaveTypes = (leaveTypesResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) }));

  const leaveRecords = (leaveRequestsResult.data ?? []).map((row) => ({
    approvalStatus: formatHrStatusLabel(String(row.approval_status)),
    days: String(row.quantity ?? "—"),
    employeeId: String(row.employee_id),
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    endsOn: String(row.ends_on),
    id: String(row.id),
    leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
    rawStatus: String(row.status),
    startsOn: String(row.starts_on),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const balanceRecords = (balancesResult.data ?? []).map((row) => ({
    asOfDate: String(row.as_of_date),
    availableQuantity: Number(row.available_quantity ?? 0),
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    id: String(row.id),
    leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
  }));

  const punchRecords = (punchesResult.data ?? []).map((row) => ({
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    id: String(row.id),
    punchTime: String(row.punch_time),
    punchType: String(row.punch_type),
    source: String(row.source),
  }));

  const dayRecords = (daysResult.data ?? []).map((row) => ({
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    id: String(row.id),
    status: formatHrStatusLabel(String(row.status)),
    workDate: String(row.work_date),
  }));

  const exceptionRecords = (exceptionsResult.data ?? []).map((row) => ({
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    exceptionType: String(row.exception_type),
    id: String(row.id),
    rawStatus: String(row.status),
    status: formatHrStatusLabel(String(row.status)),
    workDate: String(row.created_at).slice(0, 10),
  }));

  const calendarEntries = (calendarLeaveResult.data ?? []).map((row) => ({
    employee: employeeNames.get(String(row.employee_id)) ?? "Employee",
    endsOn: String(row.ends_on),
    id: String(row.id),
    leaveType: formatHrDisplayLabel(leaveTypeNames.get(String(row.leave_type_id)), "Leave"),
    startsOn: String(row.starts_on),
    status: String(row.status),
  }));

  const summary = {
    absent: exceptionRecords.filter((row) => row.rawStatus === "open").length,
    early: exceptionRecords.filter((row) => row.exceptionType === "early_departure").length,
    late: exceptionRecords.filter((row) => row.exceptionType === "late_arrival").length,
    leave: leaveRecords.length,
    overtime: dayRecords.filter((row) => {
      const metrics = (daysResult.data ?? []).find((day) => String(day.id) === row.id)?.expected_vs_actual;
      if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return false;
      return Number((metrics as { overtime_minutes?: number }).overtime_minutes ?? 0) > 0;
    }).length,
    payrollReady: dayRecords.filter((row) => ["approved", "complete", "present"].some((token) => row.status.toLowerCase().includes(token))).length,
    present: dayRecords.filter((row) => ["approved", "complete", "present"].some((token) => row.status.toLowerCase().includes(token))).length,
    workingDays: dayRecords.length,
  };

  return (
    <HrShell activeKey="attendance-leave">
      <HrAttendanceLeaveWorkspace
        data={{
          activeTab,
          balanceRecords,
          calendarEntries,
          calendarMonth,
          dayRecords,
          employeeId: params.employeeId,
          exceptionRecords,
          highlightCreate,
          leaveRecords,
          leaveTypes,
          punchRecords,
          summary,
        }}
        query={params}
      />
    </HrShell>
  );
}
