import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { countEmployeesWithMissingDocuments } from "./hr-document-compliance.loader";
import { HrLateEarlyRuntimeService } from "../../application/services/hr-late-early-runtime.service";
import { HrLeaveRuntimeService } from "../../application/services/hr-leave-runtime.service";
import { HrOvertimeRuntimeService } from "../../application/services/hr-overtime-runtime.service";
import type {
  HrDashboardActionQueueItem,
  HrDashboardAlert,
  HrDashboardAnniversary,
  HrDashboardBirthday,
  HrDashboardMetrics,
  HrTimelineEntry,
} from "../../application/types/hr-ui.types";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrDashboardData = Readonly<{
  actionQueue: readonly HrDashboardActionQueueItem[];
  alerts: readonly HrDashboardAlert[];
  metrics: HrDashboardMetrics;
  pendingApprovals: readonly { id: string; label: string; status: string }[];
  recentChanges: readonly HrTimelineEntry[];
  workAnniversaries: readonly HrDashboardAnniversary[];
  upcomingBirthdays: readonly HrDashboardBirthday[];
}>;

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 30;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetweenUtc(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function getNextBirthdayDate(birthDateValue: string, referenceDate: Date): Date {
  const birthDate = new Date(`${birthDateValue}T00:00:00.000Z`);
  const month = birthDate.getUTCMonth();
  const day = birthDate.getUTCDate();
  const year = referenceDate.getUTCFullYear();
  const referenceStart = startOfUtcDay(referenceDate);
  let nextBirthday = new Date(Date.UTC(year, month, day));
  if (nextBirthday < referenceStart) {
    nextBirthday = new Date(Date.UTC(year + 1, month, day));
  }
  return nextBirthday;
}

function getUpcomingBirthdayDaysUntil(birthDateValue: string, referenceDate: Date): number | null {
  const nextBirthday = getNextBirthdayDate(birthDateValue, referenceDate);
  const daysUntil = daysBetweenUtc(startOfUtcDay(referenceDate), nextBirthday);
  if (daysUntil < 0 || daysUntil > UPCOMING_BIRTHDAY_WINDOW_DAYS) {
    return null;
  }
  return daysUntil;
}

function countUpcomingBirthdays(
  employees: readonly { birth_date: string | null; id: string; status: string }[],
  referenceDate: Date,
): number {
  return employees.filter((row) => {
    if (row.status !== "active" || !row.birth_date) return false;
    return getUpcomingBirthdayDaysUntil(String(row.birth_date), referenceDate) !== null;
  }).length;
}

function buildUpcomingBirthdaySamples(
  employees: readonly { birth_date: string | null; full_name: string | null; id: string; status: string }[],
  referenceDate: Date,
): HrDashboardBirthday[] {
  return employees
    .flatMap((row) => {
      if (row.status !== "active" || !row.birth_date) return [];
      const birthDate = String(row.birth_date);
      const daysUntil = getUpcomingBirthdayDaysUntil(birthDate, referenceDate);
      if (daysUntil === null) return [];
      return [
        {
          birthDate,
          daysUntil,
          id: String(row.id),
          label: formatHrDisplayLabel(row.full_name, "Employee"),
        },
      ];
    })
    .sort((left, right) => left.daysUntil - right.daysUntil)
    .slice(0, 6);
}

function buildEmployeeHireDateMap(
  profiles: readonly { employee_id: string; effective_from: string }[],
): Map<string, string> {
  const hireDateByEmployeeId = new Map<string, string>();
  for (const profile of profiles) {
    const employeeId = String(profile.employee_id);
    const effectiveFrom = String(profile.effective_from);
    const existing = hireDateByEmployeeId.get(employeeId);
    if (!existing || effectiveFrom < existing) {
      hireDateByEmployeeId.set(employeeId, effectiveFrom);
    }
  }
  return hireDateByEmployeeId;
}

function countWorkAnniversariesThisMonth(
  employees: readonly { id: string; status: string }[],
  hireDateByEmployeeId: ReadonlyMap<string, string>,
): number {
  const currentMonth = new Date().getUTCMonth();
  return employees.filter((row) => {
    if (row.status !== "active") return false;
    const hireDateValue = hireDateByEmployeeId.get(String(row.id));
    if (!hireDateValue) return false;
    const hireDate = new Date(`${hireDateValue}T00:00:00.000Z`);
    return hireDate.getUTCMonth() === currentMonth;
  }).length;
}

function buildWorkAnniversarySamples(
  employees: readonly { full_name: string | null; id: string; status: string }[],
  hireDateByEmployeeId: ReadonlyMap<string, string>,
): HrDashboardAnniversary[] {
  const currentMonth = new Date().getUTCMonth();
  return employees
    .filter((row) => {
      if (row.status !== "active") return false;
      const hireDateValue = hireDateByEmployeeId.get(String(row.id));
      if (!hireDateValue) return false;
      const hireDate = new Date(`${hireDateValue}T00:00:00.000Z`);
      return hireDate.getUTCMonth() === currentMonth;
    })
    .slice(0, 6)
    .map((row) => ({
      hireDate: hireDateByEmployeeId.get(String(row.id)) ?? "",
      id: String(row.id),
      label: formatHrDisplayLabel(row.full_name, "Employee"),
    }));
}

async function loadOperationalMetrics(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  today: string,
): Promise<
  Pick<
    HrDashboardMetrics,
    | "employeesOnLeaveToday"
    | "openAttendanceExceptionsToday"
    | "openPayrollPeriods"
    | "pendingLateEarlyViolations"
    | "pendingLeaveApprovals"
    | "pendingOvertimeCandidates"
    | "temporaryAssignmentsActive"
  >
> {
  const leaveService = new HrLeaveRuntimeService(supabase, context);
  const overtimeService = new HrOvertimeRuntimeService(supabase, context);
  const lateEarlyService = new HrLateEarlyRuntimeService(supabase, context);

  const [leaveMetrics, overtimeMetrics, lateEarlyMetrics, todayDaysResult, openPeriodsResult, tempAssignmentsResult] =
    await Promise.all([
      leaveService.getDashboardMetrics().catch(() => ({
        carryForwardDue: 0,
        employeesCurrentlyAway: 0,
        encashmentPending: 0,
        leaveBalanceRisk: 0,
        pendingApprovals: 0,
        upcomingLeaveWindowEnd: today,
      })),
      overtimeService.getDashboardMetrics().catch(() => ({
        activePolicies: 0,
        approvedToday: 0,
        pendingApprovals: 0,
        pendingCandidates: 0,
      })),
      lateEarlyService.getDashboardMetrics().catch(() => ({
        pendingApprovals: 0,
        repeatedViolations: 0,
        todayEarlyLeave: 0,
        todayLate: 0,
      })),
      supabase
        .from("hr_attendance_days")
        .select("id")
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .eq("work_date", today)
        .is("deleted_at", null),
      supabase
        .from("hr_payroll_periods")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .in("status", ["open", "input_collection"])
        .is("deleted_at", null),
      supabase
        .from("hr_assignments")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .eq("company_id", context.companyId)
        .in("assignment_scope", ["temporary", "acting"])
        .eq("assignment_status", "active")
        .lte("effective_from", today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .is("deleted_at", null),
    ]);

  const todayDayIds = (todayDaysResult.data ?? []).map((row) => String(row.id));
  let openAttendanceExceptionsToday = 0;
  if (todayDayIds.length > 0) {
    const { count } = await supabase
      .from("hr_attendance_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "open")
      .in("attendance_day_id", todayDayIds)
      .is("deleted_at", null);
    openAttendanceExceptionsToday = count ?? 0;
  }

  return {
    employeesOnLeaveToday: leaveMetrics.employeesCurrentlyAway,
    openAttendanceExceptionsToday,
    openPayrollPeriods: openPeriodsResult.error ? 0 : openPeriodsResult.count ?? 0,
    pendingLateEarlyViolations: lateEarlyMetrics.pendingApprovals,
    pendingLeaveApprovals: leaveMetrics.pendingApprovals,
    pendingOvertimeCandidates: overtimeMetrics.pendingCandidates,
    temporaryAssignmentsActive: tempAssignmentsResult.error ? 0 : tempAssignmentsResult.count ?? 0,
  };
}

export async function loadHrDashboardWorkspace(): Promise<HrDashboardData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const today = todayIso();

  const [
    employeesResult,
    employmentProfilesResult,
    lifecycleResult,
    contractsResult,
    timelineResult,
    actionsResult,
    positionsResult,
    payrollExceptionsResult,
    payslipDraftResult,
    documentsResult,
    leaveRequestsResult,
    overtimeCandidatesResult,
    lateEarlyViolationsResult,
    operationalMetrics,
    employeesWithMissingDocuments,
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select("id, status, created_at, full_name, birth_date")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null),
    supabase
      .from("hr_employment_profiles")
      .select("employee_id, effective_from")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null),
    supabase
      .from("hr_employee_lifecycle_states")
      .select("id, lifecycle_state")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("lifecycle_state", "probation")
      .is("deleted_at", null),
    supabase
      .from("hr_contracts")
      .select("id, ends_on, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .lte("ends_on", addDaysIso(60))
      .gte("ends_on", today),
    supabase
      .from("hr_employee_timeline_events")
      .select("id, event_type, occurred_at, source_document_type")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(8),
    supabase
      .from("hr_action_documents")
      .select("id, action_type, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["submitted", "under_review"])
      .is("deleted_at", null)
      .limit(10),
    supabase
      .from("hr_positions")
      .select("id, vacancy_status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("vacancy_status", ["vacant", "partially-filled"])
      .is("deleted_at", null),
    supabase
      .from("hr_payroll_validation_results")
      .select("id, severity")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("severity", "error")
      .is("deleted_at", null)
      .limit(100),
    supabase
      .from("hr_payslip_publications")
      .select("id, publishing_status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .neq("publishing_status", "published")
      .is("deleted_at", null)
      .limit(100),
    supabase
      .from("file_attachments")
      .select("id, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("module_key", "hr")
      .eq("entity_type", "hr_employee_document")
      .is("deleted_at", null)
      .limit(200),
    supabase
      .from("hr_leave_requests")
      .select("id, status, starts_on, employee_id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .in("status", ["submitted", "under_review"])
      .is("deleted_at", null)
      .order("starts_on", { ascending: true })
      .limit(5),
    supabase
      .from("hr_overtime_candidates")
      .select("id, status, work_date, employee_id, candidate_minutes")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(3),
    supabase
      .from("hr_late_early_violations")
      .select("id, status, work_date, employee_id, violation_kind")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(3),
    loadOperationalMetrics(supabase, context, today),
    countEmployeesWithMissingDocuments(),
  ]);

  for (const result of [employeesResult, lifecycleResult, contractsResult, timelineResult, actionsResult, positionsResult]) {
    if (result.error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load HR dashboard.", cause: result.error });
    }
  }

  const employees = employeesResult.data ?? [];
  const referenceDate = new Date(`${today}T00:00:00.000Z`);
  const hireDateByEmployeeId = employmentProfilesResult.error
    ? new Map<string, string>()
    : buildEmployeeHireDateMap(employmentProfilesResult.data ?? []);
  const monthStart = startOfMonthIso();
  const documentsExpiringSoon = (documentsResult.data ?? []).filter((row) => {
    const metadata = row.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
    const expiry = (metadata as Record<string, unknown>).expiry_date;
    if (!expiry) return false;
    const expiryDate = String(expiry);
    return expiryDate >= today && expiryDate <= addDaysIso(30);
  }).length;

  const metrics: HrDashboardMetrics = {
    activeEmployees: employees.filter((row) => row.status === "active").length,
    contractsExpiringSoon: contractsResult.data?.length ?? 0,
    documentsExpiringSoon,
    employeesOnLeaveToday: operationalMetrics.employeesOnLeaveToday,
    employeesWithMissingDocuments,
    newHires: employees.filter((row) => String(row.created_at).slice(0, 10) >= monthStart).length,
    onProbation: lifecycleResult.data?.length ?? 0,
    openAttendanceExceptionsToday: operationalMetrics.openAttendanceExceptionsToday,
    openPayrollPeriods: operationalMetrics.openPayrollPeriods,
    openVacancies: positionsResult.data?.length ?? 0,
    payrollReadinessIssues:
      (payrollExceptionsResult.error ? 0 : payrollExceptionsResult.data?.length ?? 0) +
      (payslipDraftResult.error ? 0 : payslipDraftResult.data?.length ?? 0),
    pendingApprovals: actionsResult.data?.filter((row) => row.status === "under_review").length ?? 0,
    pendingHrRequests: actionsResult.data?.length ?? 0,
    pendingLateEarlyViolations: operationalMetrics.pendingLateEarlyViolations,
    pendingLeaveApprovals: operationalMetrics.pendingLeaveApprovals,
    pendingOvertimeCandidates: operationalMetrics.pendingOvertimeCandidates,
    temporaryAssignmentsActive: operationalMetrics.temporaryAssignmentsActive,
    totalEmployees: employees.length,
    upcomingBirthdays: countUpcomingBirthdays(employees, referenceDate),
    workAnniversariesThisMonth: countWorkAnniversariesThisMonth(employees, hireDateByEmployeeId),
  };

  const recentChanges: HrTimelineEntry[] = (timelineResult.data ?? []).map((row) => ({
    eventType: String(row.event_type),
    id: String(row.id),
    label: formatHrStatusLabel(String(row.event_type)),
    occurredAt: String(row.occurred_at),
    sourceDocumentType: row.source_document_type ? String(row.source_document_type) : null,
  }));

  const pendingApprovals = (actionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    label: formatHrDisplayLabel(row.action_type, "HR request"),
    status: formatHrStatusLabel(String(row.status)),
  }));

  const leaveEmployeeIds = [...new Set((leaveRequestsResult.data ?? []).map((row) => String(row.employee_id)))];
  const queueEmployeeIds = [
    ...new Set([
      ...leaveEmployeeIds,
      ...(overtimeCandidatesResult.data ?? []).map((row) => String(row.employee_id)),
      ...(lateEarlyViolationsResult.data ?? []).map((row) => String(row.employee_id)),
    ]),
  ];
  const queueEmployeeNames = new Map<string, string>();
  if (queueEmployeeIds.length > 0) {
    const { data: queueEmployees } = await supabase
      .from("hr_employees")
      .select("id, full_name")
      .eq("tenant_id", context.tenantId)
      .in("id", queueEmployeeIds)
      .is("deleted_at", null);
    for (const employee of queueEmployees ?? []) {
      queueEmployeeNames.set(String(employee.id), formatHrDisplayLabel(employee.full_name, "Employee"));
    }
  }

  const leaveQueueItems: HrDashboardActionQueueItem[] = (leaveRequestsResult.error ? [] : leaveRequestsResult.data ?? []).map(
    (row) => ({
      href: `/erp/hr/leave?edit=${String(row.id)}`,
      id: String(row.id),
      kind: "leave",
      labelKey: "hr.dashboard.queue.leave",
      labelParams: {
        date: String(row.starts_on),
        employee: queueEmployeeNames.get(String(row.employee_id)) ?? "Employee",
      },
      status: formatHrStatusLabel(String(row.status)),
    }),
  );

  const overtimeQueueItems: HrDashboardActionQueueItem[] = (overtimeCandidatesResult.error
    ? []
    : overtimeCandidatesResult.data ?? []
  ).map((row) => ({
    href: `/erp/hr/overtime?tab=candidates&edit=${String(row.id)}`,
    id: String(row.id),
    kind: "overtime",
    labelKey: "hr.dashboard.queue.overtime",
    labelParams: {
      date: String(row.work_date),
      employee: queueEmployeeNames.get(String(row.employee_id)) ?? "Employee",
    },
    status: formatHrStatusLabel(String(row.status)),
  }));

  const lateEarlyQueueItems: HrDashboardActionQueueItem[] = (lateEarlyViolationsResult.error
    ? []
    : lateEarlyViolationsResult.data ?? []
  ).map((row) => ({
    href: `/erp/hr/late-early?edit=${String(row.id)}`,
    id: String(row.id),
    kind: "late_early",
    labelKey: "hr.dashboard.queue.lateEarly",
    labelParams: {
      date: String(row.work_date),
      employee: queueEmployeeNames.get(String(row.employee_id)) ?? "Employee",
      violation: formatHrStatusLabel(String(row.violation_kind)),
    },
    status: formatHrStatusLabel(String(row.status)),
  }));

  const hrRequestQueueItems: HrDashboardActionQueueItem[] = pendingApprovals.map((row) => ({
    href: `/erp/hr/requests?edit=${row.id}`,
    id: row.id,
    kind: "hr_request",
    labelKey: "hr.dashboard.queue.hrRequest",
    labelParams: { requestType: row.label },
    status: row.status,
  }));

  const actionQueue = [...leaveQueueItems, ...overtimeQueueItems, ...lateEarlyQueueItems, ...hrRequestQueueItems].slice(0, 8);
  const workAnniversaries = buildWorkAnniversarySamples(employees, hireDateByEmployeeId);
  const upcomingBirthdays = buildUpcomingBirthdaySamples(employees, referenceDate);

  const alerts: HrDashboardAlert[] = [
    metrics.pendingLeaveApprovals > 0
      ? {
          href: "/erp/hr/leave",
          id: "leave-pending",
          labelKey: "hr.dashboard.alert.leavePending",
          labelParams: { count: metrics.pendingLeaveApprovals },
          severity: "warning",
        }
      : null,
    metrics.openAttendanceExceptionsToday > 0
      ? {
          href: "/erp/hr/attendance-live",
          id: "attendance-exceptions",
          labelKey: "hr.dashboard.alert.attendanceExceptions",
          labelParams: { count: metrics.openAttendanceExceptionsToday },
          severity: "warning",
        }
      : null,
    metrics.pendingOvertimeCandidates > 0
      ? {
          href: "/erp/hr/overtime?tab=candidates",
          id: "overtime-pending",
          labelKey: "hr.dashboard.alert.overtimePending",
          labelParams: { count: metrics.pendingOvertimeCandidates },
          severity: "info",
        }
      : null,
    metrics.pendingLateEarlyViolations > 0
      ? {
          href: "/erp/hr/late-early",
          id: "late-early-pending",
          labelKey: "hr.dashboard.alert.lateEarlyPending",
          labelParams: { count: metrics.pendingLateEarlyViolations },
          severity: "warning",
        }
      : null,
    metrics.contractsExpiringSoon > 0
      ? {
          href: "/erp/hr/contracts",
          id: "contracts-expiring",
          labelKey: "hr.dashboard.alert.contractsExpiring",
          labelParams: { count: metrics.contractsExpiringSoon },
          severity: "warning",
        }
      : null,
    metrics.documentsExpiringSoon > 0
      ? {
          href: "/erp/hr/documents",
          id: "documents-expiring",
          labelKey: "hr.dashboard.alert.documentsExpiring",
          labelParams: { count: metrics.documentsExpiringSoon },
          severity: "warning",
        }
      : null,
    metrics.employeesWithMissingDocuments > 0
      ? {
          href: "/erp/hr/documents?tab=compliance&complianceStatus=incomplete",
          id: "documents-missing",
          labelKey: "hr.dashboard.alert.documentsMissing",
          labelParams: { count: metrics.employeesWithMissingDocuments },
          severity: "warning",
        }
      : null,
    metrics.payrollReadinessIssues > 0
      ? {
          href: "/erp/hr/payroll-readiness",
          id: "payroll-readiness",
          labelKey: "hr.dashboard.alert.payrollReadiness",
          labelParams: { count: metrics.payrollReadinessIssues },
          severity: "error",
        }
      : null,
    metrics.openPayrollPeriods > 0
      ? {
          href: "/erp/hr/payroll-readiness",
          id: "open-payroll-periods",
          labelKey: "hr.dashboard.alert.openPayrollPeriods",
          labelParams: { count: metrics.openPayrollPeriods },
          severity: "info",
        }
      : null,
    metrics.openVacancies > 0
      ? {
          href: "/erp/hr/positions-jobs",
          id: "open-vacancies",
          labelKey: "hr.dashboard.alert.openVacancies",
          labelParams: { count: metrics.openVacancies },
          severity: "info",
        }
      : null,
  ].filter((item): item is HrDashboardAlert => item !== null);

  return { actionQueue, alerts, metrics, pendingApprovals, recentChanges, upcomingBirthdays, workAnniversaries };
}

export type HrExecutiveDashboardData = Readonly<{
  actionQueue: readonly HrDashboardActionQueueItem[];
  alerts: readonly HrDashboardAlert[];
  metrics: HrDashboardMetrics;
  payrollRuns: number;
}>;

export type HrDepartmentHeadcount = Readonly<{
  departmentId: string;
  headcount: number;
  label: string;
}>;

export type HrDepartmentDashboardData = Readonly<{
  activeEmployees: number;
  departments: readonly HrDepartmentHeadcount[];
  pendingLateEarlyViolations: number;
  pendingLeaveApprovals: number;
  pendingOvertimeCandidates: number;
  unassignedActiveEmployees: number;
}>;

export async function loadHrExecutiveDashboardWorkspace(): Promise<HrExecutiveDashboardData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const [dashboard, payrollRunsResult] = await Promise.all([
    loadHrDashboardWorkspace(),
    supabase
      .from("hr_payroll_runs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null),
  ]);

  return {
    actionQueue: dashboard.actionQueue,
    alerts: dashboard.alerts,
    metrics: dashboard.metrics,
    payrollRuns: payrollRunsResult.error ? 0 : payrollRunsResult.count ?? 0,
  };
}

export async function loadHrDepartmentDashboardWorkspace(): Promise<HrDepartmentDashboardData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.view });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const today = todayIso();
  const dashboard = await loadHrDashboardWorkspace();

  const [departmentsResult, assignmentsResult, activeEmployeesResult] = await Promise.all([
    supabase
      .from("hr_org_units")
      .select("id, name")
      .eq("kind", "department")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(50),
    supabase
      .from("hr_assignments")
      .select("employee_id, reference_entity_id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("assignment_type", "department")
      .eq("assignment_status", "active")
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .is("deleted_at", null),
    supabase
      .from("hr_employees")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  const headcountByDepartment = new Map<string, Set<string>>();
  const assignedActiveEmployeeIds = new Set<string>();
  for (const assignment of assignmentsResult.data ?? []) {
    const departmentId = String(assignment.reference_entity_id);
    const employeeId = String(assignment.employee_id);
    assignedActiveEmployeeIds.add(employeeId);
    const existing = headcountByDepartment.get(departmentId) ?? new Set<string>();
    existing.add(employeeId);
    headcountByDepartment.set(departmentId, existing);
  }

  const activeEmployeeIds = new Set((activeEmployeesResult.data ?? []).map((row) => String(row.id)));
  let unassignedActiveEmployees = 0;
  for (const employeeId of activeEmployeeIds) {
    if (!assignedActiveEmployeeIds.has(employeeId)) {
      unassignedActiveEmployees += 1;
    }
  }

  const departments: HrDepartmentHeadcount[] = (departmentsResult.data ?? []).map((dept) => ({
    departmentId: String(dept.id),
    headcount: headcountByDepartment.get(String(dept.id))?.size ?? 0,
    label: formatHrDisplayLabel(dept.name, "Department"),
  }));

  return {
    activeEmployees: dashboard.metrics.activeEmployees,
    departments,
    pendingLateEarlyViolations: dashboard.metrics.pendingLateEarlyViolations,
    pendingLeaveApprovals: dashboard.metrics.pendingLeaveApprovals,
    pendingOvertimeCandidates: dashboard.metrics.pendingOvertimeCandidates,
    unassignedActiveEmployees,
  };
}
