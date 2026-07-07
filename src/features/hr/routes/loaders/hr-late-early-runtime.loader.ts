import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { hasServerPermission, requirePermission } from "@/platform/permissions/server";

import { HrLateEarlyRuntimeService } from "../../application/services/hr-late-early-runtime.service";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrLateEarlyRuntimeWorkspaceData = Readonly<{
  approvalEvents: readonly { employeeLabel: string; eventKind: string; id: string; occurredAt: string; reason: string | null }[];
  dashboard: Readonly<{
    pendingApprovals: number;
    repeatedViolations: number;
    todayEarlyLeave: number;
    todayLate: number;
  }>;
  ledger: readonly {
    asOfDate: string;
    deductionMinutes: number;
    earlyLeaveMinutes: number;
    employeeLabel: string;
    id: string;
    lateMinutes: number;
    movementKind: string;
  }[];
  managerScopeActive: boolean;
  policyAssignments: readonly {
    assignmentScope: string;
    effectiveFrom: string;
    id: string;
    policyName: string;
    referenceEntityId: string | null;
  }[];
  policies: readonly {
    code: string;
    effectiveFrom: string;
    graceMinutes: number;
    id: string;
    name: string;
    status: string;
  }[];
  teamViolations: readonly {
    deductionMinutes: number;
    employeeLabel: string;
    id: string;
    status: string;
    violationKind: string;
    workDate: string;
  }[];
  timelineEvents: readonly {
    action: string;
    actor: string;
    category: "approval";
    key: string;
    source: string;
    timestamp: string;
  }[];
  violations: readonly {
    deductionMinutes: number;
    earlyLeaveMinutes: number;
    employeeLabel: string;
    graceApplied: number;
    id: string;
    lateMinutes: number;
    status: string;
    violationKind: string;
    workDate: string;
  }[];
}>;

export type HrLateEarlyReportsQuery = Readonly<{
  departmentId?: string;
  periodEnd?: string;
  periodStart?: string;
}>;

async function resolveManagerTeamEmployeeIds(context: Awaited<ReturnType<typeof resolveBranchRequestContext>>, supabase: ReturnType<typeof createRequestSupabaseClient>) {
  const canManageAll = await hasServerPermission({ context, permission: HR_PERMISSIONS.lateManage });
  if (canManageAll) return null;

  const canApprove = await hasServerPermission({ context, permission: HR_PERMISSIONS.lateApprove });
  if (!canApprove) return null;

  const { data: managerEmployee } = await supabase
    .from("hr_employees")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("user_id", context.userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!managerEmployee) return [];

  const { data: assignments } = await supabase
    .from("hr_assignments")
    .select("employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("assignment_type", "manager")
    .eq("reference_entity_id", managerEmployee.id)
    .eq("reference_entity_type", "hr_employees")
    .in("assignment_status", ["active", "planned"])
    .is("deleted_at", null);

  return [...new Set((assignments ?? []).map((row) => String(row.employee_id)))];
}

export async function loadHrLateEarlyRuntimeWorkspace(query: HrLateEarlyReportsQuery = {}): Promise<HrLateEarlyRuntimeWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.lateView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrLateEarlyRuntimeService(supabase, context);
  const managerTeamIds = await resolveManagerTeamEmployeeIds(context, supabase);
  const managerScopeActive = managerTeamIds != null;

  let violationsQuery = supabase
    .from("hr_late_early_violations")
    .select("id, employee_id, work_date, violation_kind, late_minutes, early_leave_minutes, deduction_minutes, grace_applied_minutes, status")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("work_date", { ascending: false })
    .limit(100);

  if (query.periodStart) violationsQuery = violationsQuery.gte("work_date", query.periodStart);
  if (query.periodEnd) violationsQuery = violationsQuery.lte("work_date", query.periodEnd);
  if (managerTeamIds) violationsQuery = violationsQuery.in("employee_id", managerTeamIds);

  const [violationsResult, policiesResult, assignmentsResult, ledgerResult, approvalResult, dashboard] = await Promise.all([
    violationsQuery,
    supabase
      .from("hr_late_early_policies")
      .select("id, code, name, grace_minutes, effective_from, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(30),
    supabase
      .from("hr_late_early_policy_assignments")
      .select("id, policy_id, assignment_scope, reference_entity_id, effective_from")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(50),
    supabase
      .from("hr_late_early_violation_ledger")
      .select("id, employee_id, movement_kind, late_minutes_delta, early_leave_minutes_delta, deduction_minutes_delta, as_of_date")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_late_early_approval_events")
      .select("id, violation_id, event_kind, reason, created_at, actor_user_id")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    service.getDashboardMetrics(managerTeamIds ?? undefined),
  ]);

  if (violationsResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load late/early workspace.", cause: violationsResult.error });
  }

  const employeeIds = [
    ...new Set([
      ...(violationsResult.data ?? []).map((r) => String(r.employee_id)),
      ...(ledgerResult.data ?? []).map((r) => String(r.employee_id)),
    ]),
  ];

  const employeeMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds);
    for (const emp of employees ?? []) {
      employeeMap.set(String(emp.id), `${emp.full_name} (${emp.employee_number})`);
    }
  }

  const policyMap = new Map((policiesResult.data ?? []).map((row) => [String(row.id), String(row.name)]));
  const violationMap = new Map((violationsResult.data ?? []).map((row) => [String(row.id), String(row.employee_id)]));

  const violations = (violationsResult.data ?? []).map((row) => ({
    deductionMinutes: Number(row.deduction_minutes ?? 0),
    earlyLeaveMinutes: Number(row.early_leave_minutes ?? 0),
    employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
    graceApplied: Number(row.grace_applied_minutes ?? 0),
    id: String(row.id),
    lateMinutes: Number(row.late_minutes ?? 0),
    status: formatHrStatusLabel(String(row.status)),
    violationKind: formatHrStatusLabel(String(row.violation_kind)),
    workDate: String(row.work_date),
  }));

  return {
    approvalEvents: (approvalResult.data ?? []).map((row) => {
      const employeeId = violationMap.get(String(row.violation_id));
      return {
        employeeLabel: employeeId ? (employeeMap.get(employeeId) ?? "Employee") : "Employee",
        eventKind: formatHrStatusLabel(String(row.event_kind)),
        id: String(row.id),
        occurredAt: String(row.created_at),
        reason: row.reason ? String(row.reason) : null,
      };
    }),
    dashboard,
    ledger: (ledgerResult.data ?? []).map((row) => ({
      asOfDate: String(row.as_of_date),
      deductionMinutes: Number(row.deduction_minutes_delta ?? 0),
      earlyLeaveMinutes: Number(row.early_leave_minutes_delta ?? 0),
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      lateMinutes: Number(row.late_minutes_delta ?? 0),
      movementKind: formatHrStatusLabel(String(row.movement_kind)),
    })),
    managerScopeActive,
    policyAssignments: (assignmentsResult.data ?? []).map((row) => ({
      assignmentScope: formatHrStatusLabel(String(row.assignment_scope)),
      effectiveFrom: String(row.effective_from),
      id: String(row.id),
      policyName: formatHrDisplayLabel(policyMap.get(String(row.policy_id)), "Policy"),
      referenceEntityId: row.reference_entity_id ? String(row.reference_entity_id) : null,
    })),
    policies: (policiesResult.data ?? []).map((row) => ({
      code: String(row.code),
      effectiveFrom: String(row.effective_from),
      graceMinutes: Number(row.grace_minutes ?? 0),
      id: String(row.id),
      name: String(row.name),
      status: formatHrStatusLabel(String(row.status)),
    })),
    teamViolations: violations
      .filter((row) => row.status.toLowerCase().includes("submitted"))
      .map((row) => ({
        deductionMinutes: row.deductionMinutes,
        employeeLabel: row.employeeLabel,
        id: row.id,
        status: row.status,
        violationKind: row.violationKind,
        workDate: row.workDate,
      })),
    timelineEvents: (approvalResult.data ?? []).map((row) => ({
      action: formatHrStatusLabel(String(row.event_kind)),
      actor: row.actor_user_id ? String(row.actor_user_id).slice(0, 8) : "System",
      category: "approval" as const,
      key: String(row.id),
      source: "late-early",
      timestamp: String(row.created_at),
    })),
    violations,
  };
}
