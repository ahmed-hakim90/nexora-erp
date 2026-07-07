import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrOvertimeRuntimeService } from "../../application/services/hr-overtime-runtime.service";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrOvertimeRuntimeWorkspaceData = Readonly<{
  approvalEvents: readonly {
    employeeLabel: string;
    eventKind: string;
    id: string;
    occurredAt: string;
    reason: string | null;
  }[];
  candidates: readonly {
    candidateMinutes: number;
    employeeLabel: string;
    id: string;
    overtimeType: string;
    status: string;
    workDate: string;
  }[];
  dashboard: Readonly<{
    activePolicies: number;
    approvedToday: number;
    pendingApprovals: number;
    pendingCandidates: number;
  }>;
  policies: readonly {
    code: string;
    effectiveFrom: string;
    id: string;
    name: string;
    overtimeType: string;
    rateMultiplier: number;
    status: string;
  }[];
  requests: readonly {
    durationMinutes: number;
    employeeLabel: string;
    hours: number;
    id: string;
    overtimeType: string;
    payrollEligible: boolean;
    rateMultiplier: number;
    reason: string;
    status: string;
    workDate: string;
  }[];
  teamView: readonly {
    durationMinutes: number;
    employee: string;
    id: string;
    overtimeType: string;
    status: string;
    workDate: string;
  }[];
}>;

export async function loadHrOvertimeRuntimeWorkspace(): Promise<HrOvertimeRuntimeWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.overtimeView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrOvertimeRuntimeService(supabase, context);

  const [requestsResult, candidatesResult, policiesResult, approvalResult, dashboard] = await Promise.all([
    supabase
      .from("hr_overtime_requests")
      .select("id, employee_id, work_date, hours, duration_minutes, rate_multiplier, overtime_type, payroll_eligible, reason, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(100),
    supabase
      .from("hr_overtime_candidates")
      .select("id, employee_id, work_date, candidate_minutes, overtime_type, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("work_date", { ascending: false })
      .limit(50),
    supabase
      .from("hr_overtime_policies")
      .select("id, code, name, overtime_type, rate_multiplier, effective_from, status")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(30),
    supabase
      .from("hr_overtime_approval_events")
      .select("id, overtime_request_id, event_kind, reason, created_at")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    service.getDashboardMetrics(),
  ]);

  if (requestsResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load overtime runtime workspace.", cause: requestsResult.error });
  }

  const employeeIds = [
    ...new Set([
      ...(requestsResult.data ?? []).map((r) => String(r.employee_id)),
      ...(candidatesResult.data ?? []).map((r) => String(r.employee_id)),
    ]),
  ];

  const requestIds = [...new Set((approvalResult.data ?? []).map((r) => String(r.overtime_request_id)))];

  const [employees, requestEmployees] = await Promise.all([
    employeeIds.length
      ? supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds)
      : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase.from("hr_overtime_requests").select("id, employee_id").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const employeeMap = new Map((employees.data ?? []).map((e) => [String(e.id), `${e.full_name} (${e.employee_number})`]));
  const requestEmployeeMap = new Map((requestEmployees.data ?? []).map((r) => [String(r.id), String(r.employee_id)]));

  const requests = (requestsResult.data ?? []).map((row) => ({
    durationMinutes: Number(row.duration_minutes ?? 0) || Math.round(Number(row.hours ?? 0) * 60),
    employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
    hours: Number(row.hours ?? 0),
    id: String(row.id),
    overtimeType: formatHrStatusLabel(String(row.overtime_type ?? "normal")),
    payrollEligible: Boolean(row.payroll_eligible ?? true),
    rateMultiplier: Number(row.rate_multiplier ?? 1.5),
    reason: String(row.reason ?? ""),
    status: formatHrStatusLabel(String(row.status)),
    workDate: String(row.work_date),
  }));

  return {
    approvalEvents: (approvalResult.data ?? []).map((row) => {
      const employeeId = requestEmployeeMap.get(String(row.overtime_request_id));
      return {
        employeeLabel: employeeId ? (employeeMap.get(employeeId) ?? "Employee") : "Employee",
        eventKind: formatHrStatusLabel(String(row.event_kind)),
        id: String(row.id),
        occurredAt: String(row.created_at),
        reason: row.reason ? String(row.reason) : null,
      };
    }),
    candidates: (candidatesResult.data ?? []).map((row) => ({
      candidateMinutes: Number(row.candidate_minutes ?? 0),
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      overtimeType: formatHrStatusLabel(String(row.overtime_type)),
      status: formatHrStatusLabel(String(row.status)),
      workDate: String(row.work_date),
    })),
    dashboard,
    policies: (policiesResult.data ?? []).map((row) => ({
      code: String(row.code),
      effectiveFrom: String(row.effective_from),
      id: String(row.id),
      name: String(row.name),
      overtimeType: formatHrDisplayLabel(String(row.overtime_type), "Normal"),
      rateMultiplier: Number(row.rate_multiplier ?? 1.5),
      status: formatHrStatusLabel(String(row.status)),
    })),
    requests,
    teamView: requests
      .filter((row) => ["Submitted", "Under Review", "Approved"].some((s) => row.status.includes(s)))
      .map((row) => ({
        durationMinutes: row.durationMinutes,
        employee: row.employeeLabel,
        id: row.id,
        overtimeType: row.overtimeType,
        status: row.status,
        workDate: row.workDate,
      })),
  };
}
