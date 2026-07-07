import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrLeaveService } from "../../application/services/hr-leave.service";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrLeaveRuntimeWorkspaceData = Readonly<{
  balances: readonly {
    approved: number;
    available: number;
    carriedForward: number;
    consumed: number;
    employeeLabel: string;
    expired: number;
    id: string;
    leaveType: string;
    negative: number;
    pending: number;
    projected: number;
    scheduled: number;
  }[];
  carryForwardRuns: readonly {
    employeeCount: number;
    id: string;
    scope: string;
    sourcePeriodEnd: string;
    status: string;
    targetPeriodStart: string;
    totalQuantityCarried: number;
  }[];
  dashboard: Readonly<{
    carryForwardDue: number;
    employeesCurrentlyAway: number;
    encashmentPending: number;
    leaveBalanceRisk: number;
    pendingApprovals: number;
    upcomingLeaveWindowEnd: string;
  }>;
  encashments: readonly {
    employeeLabel: string;
    id: string;
    requestedQuantity: number;
    status: string;
  }[];
  holidays: readonly { holidayDate: string; id: string; name: string; type: string }[];
  leaveTypes: readonly { id: string; name: string }[];
  ledger: readonly {
    asOfDate: string;
    balanceAfter: number;
    employeeLabel: string;
    id: string;
    movementKind: string;
    quantity: number;
  }[];
  teamCalendar: readonly {
    employee: string;
    endsOn: string;
    id: string;
    leaveType: string;
    startsOn: string;
    status: string;
  }[];
}>;

export async function loadHrLeaveRuntimeWorkspace(): Promise<HrLeaveRuntimeWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrLeaveService(supabase, context);

  const [balancesResult, ledgerResult, carryResult, encashmentResult, holidaysResult, teamLeaveResult, dashboard] = await Promise.all([
    supabase
      .from("hr_leave_balances")
      .select("id, employee_id, leave_type_id, available_quantity, pending_quantity, consumed_quantity, carried_forward_quantity, scheduled_quantity, expired_quantity, projected_quantity, metadata")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("as_of_date", { ascending: false })
      .limit(100),
    supabase
      .from("hr_leave_balance_ledger")
      .select("id, employee_id, movement_kind, quantity, balance_after, as_of_date")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("hr_leave_carry_forward_runs")
      .select("id, scope, source_period_end, target_period_start, status, employee_count, total_quantity_carried")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("hr_leave_encashment_requests")
      .select("id, employee_id, requested_quantity, status")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("hr_holidays")
      .select("id, name, holiday_date, holiday_type")
      .eq("tenant_id", context.tenantId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("holiday_date", { ascending: true })
      .limit(50),
    supabase
      .from("hr_leave_requests")
      .select("id, employee_id, starts_on, ends_on, status, leave_type_id")
      .eq("tenant_id", context.tenantId)
      .in("status", ["approved", "submitted", "under_review"])
      .is("deleted_at", null)
      .order("starts_on", { ascending: true })
      .limit(100),
    service.getRuntimeService().getDashboardMetrics(),
  ]);

  if (balancesResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load leave runtime workspace.", cause: balancesResult.error });
  }

  const employeeIds = [
    ...new Set([
      ...(balancesResult.data ?? []).map((r) => String(r.employee_id)),
      ...(ledgerResult.data ?? []).map((r) => String(r.employee_id)),
      ...(encashmentResult.data ?? []).map((r) => String(r.employee_id)),
      ...(teamLeaveResult.data ?? []).map((r) => String(r.employee_id)),
    ]),
  ];
  const leaveTypeIds = [
    ...new Set([
      ...(balancesResult.data ?? []).map((r) => String(r.leave_type_id)),
      ...(teamLeaveResult.data ?? []).map((r) => String(r.leave_type_id)),
    ]),
  ];

  const [employees, leaveTypes, allLeaveTypes] = await Promise.all([
    employeeIds.length
      ? supabase.from("hr_employees").select("id, full_name, employee_number").in("id", employeeIds)
      : Promise.resolve({ data: [] }),
    leaveTypeIds.length
      ? supabase.from("hr_leave_types").select("id, name").in("id", leaveTypeIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("hr_leave_types")
      .select("id, name")
      .eq("tenant_id", context.tenantId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const employeeMap = new Map((employees.data ?? []).map((e) => [String(e.id), `${e.full_name} (${e.employee_number})`]));
  const leaveTypeMap = new Map((leaveTypes.data ?? []).map((t) => [String(t.id), String(t.name)]));

  return {
    balances: (balancesResult.data ?? []).map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        approved: Number(row.consumed_quantity ?? 0),
        available: Number(row.available_quantity ?? 0),
        carriedForward: Number(row.carried_forward_quantity ?? 0),
        consumed: Number(row.consumed_quantity ?? 0),
        employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
        expired: Number(row.expired_quantity ?? 0),
        id: String(row.id),
        leaveType: formatHrDisplayLabel(leaveTypeMap.get(String(row.leave_type_id)), "Leave"),
        negative: Number(metadata.negative ?? 0),
        pending: Number(row.pending_quantity ?? 0),
        projected: Number(row.projected_quantity ?? row.available_quantity ?? 0),
        scheduled: Number(row.scheduled_quantity ?? 0),
      };
    }),
    carryForwardRuns: (carryResult.data ?? []).map((row) => ({
      employeeCount: Number(row.employee_count ?? 0),
      id: String(row.id),
      scope: formatHrStatusLabel(String(row.scope)),
      sourcePeriodEnd: String(row.source_period_end),
      status: formatHrStatusLabel(String(row.status)),
      targetPeriodStart: String(row.target_period_start),
      totalQuantityCarried: Number(row.total_quantity_carried ?? 0),
    })),
    dashboard,
    encashments: (encashmentResult.data ?? []).map((row) => ({
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      requestedQuantity: Number(row.requested_quantity ?? 0),
      status: formatHrStatusLabel(String(row.status)),
    })),
    holidays: (holidaysResult.data ?? []).map((row) => ({
      holidayDate: String(row.holiday_date ?? ""),
      id: String(row.id),
      name: String(row.name),
      type: formatHrStatusLabel(String(row.holiday_type)),
    })),
    leaveTypes: (allLeaveTypes.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
    })),
    ledger: (ledgerResult.data ?? []).map((row) => ({
      asOfDate: String(row.as_of_date),
      balanceAfter: Number(row.balance_after ?? 0),
      employeeLabel: employeeMap.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      movementKind: formatHrStatusLabel(String(row.movement_kind)),
      quantity: Number(row.quantity ?? 0),
    })),
    teamCalendar: (teamLeaveResult.data ?? []).map((row) => ({
      employee: employeeMap.get(String(row.employee_id)) ?? "Employee",
      endsOn: String(row.ends_on),
      id: String(row.id),
      leaveType: formatHrDisplayLabel(leaveTypeMap.get(String(row.leave_type_id)), "Leave"),
      startsOn: String(row.starts_on),
      status: formatHrStatusLabel(String(row.status)),
    })),
  };
}
