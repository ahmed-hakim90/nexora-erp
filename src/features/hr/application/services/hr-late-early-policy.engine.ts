import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import {
  DEFAULT_LATE_EARLY_POLICY_RULES,
  type LateEarlyPolicyRules,
} from "../constants/hr-late-early-runtime.constants";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";
import { HrShiftResolutionService } from "./hr-shift-resolution.service";

const POLICY_SCOPE_PRECEDENCE = ["employee", "contract", "shift", "department", "branch", "company"] as const;

type PolicyScope = (typeof POLICY_SCOPE_PRECEDENCE)[number];

type PolicyRow = Readonly<{
  daily_limit_minutes: number | null;
  early_leave_threshold_minutes: number | null;
  effective_from: string;
  effective_to: string | null;
  grace_minutes: number | null;
  id: string;
  late_threshold_minutes: number | null;
  monthly_limit_minutes: number | null;
  name: string;
  policy_rules: unknown;
  weekly_limit_minutes: number | null;
}>;

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export type ResolvedLateEarlyPolicy = Readonly<{
  dailyLimitMinutes: number | null;
  earlyLeaveThresholdMinutes: number;
  graceMinutes: number;
  id: string;
  lateThresholdMinutes: number;
  monthlyLimitMinutes: number | null;
  name: string;
  policyRules: LateEarlyPolicyRules;
  weeklyLimitMinutes: number | null;
}>;

export class HrLateEarlyPolicyEngine {
  private readonly assignmentResolver: HrAssignmentResolverService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.assignmentResolver = new HrAssignmentResolverService(supabase, context);
  }

  async resolveActivePolicy(input: { employeeId: string; workDate: string }): Promise<ResolvedLateEarlyPolicy> {
    const scopeRefs = await this.buildScopeReferences(input.employeeId, input.workDate);

    const { data: assignments } = await this.supabase
      .from("hr_late_early_policy_assignments")
      .select("policy_id, assignment_scope, reference_entity_id, effective_from")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .lte("effective_from", input.workDate)
      .or(`effective_to.is.null,effective_to.gte.${input.workDate}`)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false });

    for (const scope of POLICY_SCOPE_PRECEDENCE) {
      const refId = scopeRefs[scope];
      const match = (assignments ?? []).find((row) => {
        if (String(row.assignment_scope) !== scope) return false;
        if (scope === "company") {
          return !row.reference_entity_id || String(row.reference_entity_id) === this.context.companyId;
        }
        if (scope === "branch") {
          return refId != null && String(row.reference_entity_id) === refId;
        }
        return refId != null && String(row.reference_entity_id) === refId;
      });
      if (match?.policy_id) {
        const policy = await this.loadPolicy(String(match.policy_id), input.workDate);
        if (policy) return policy;
      }
    }

    return this.resolveCompanyDefaultPolicy(input.workDate);
  }

  async resolveExpectedShiftWindow(input: {
    employeeId: string;
    workDate: string;
    policyRules: LateEarlyPolicyRules;
  }): Promise<{ shiftEnd: string; shiftStart: string; shiftDurationMinutes: number }> {
    const shiftResolver = new HrShiftResolutionService(this.supabase, this.context);
    const resolved = await shiftResolver.resolveEmployeeShiftWindow({
      employeeId: input.employeeId,
      policyRules: input.policyRules,
      workDate: input.workDate,
    });

    return {
      shiftDurationMinutes: resolved.shiftDurationMinutes,
      shiftEnd: resolved.shiftEnd,
      shiftStart: resolved.shiftStart,
    };
  }

  applyRounding(minutes: number, rules: LateEarlyPolicyRules): number {
    let value = minutes;
    const roundUp = rules.roundUpMinutes ?? 0;
    const roundDown = rules.roundDownMinutes ?? 0;
    if (roundUp > 0) value = Math.ceil(value / roundUp) * roundUp;
    if (roundDown > 0) value = Math.floor(value / roundDown) * roundDown;
    return value;
  }

  computeDeductionMinutes(input: {
    deductionMethod: LateEarlyPolicyRules["deductionMethod"];
    earlyLeaveMinutes: number;
    lateMinutes: number;
    noDeduction?: boolean;
    shiftDurationMinutes: number;
  }): number {
    if (input.noDeduction) return 0;
    const method = input.deductionMethod ?? "minutes";
    if (method === "none") return 0;
    if (method === "half_day") return Math.ceil(input.shiftDurationMinutes / 2);
    if (method === "full_day") return input.shiftDurationMinutes;
    return input.lateMinutes + input.earlyLeaveMinutes;
  }

  async aggregateLedgerMinutes(input: {
    employeeId: string;
    workDate: string;
  }): Promise<{ daily: number; monthly: number; weekly: number }> {
    const weekFrom = weekStart(input.workDate);
    const monthFrom = monthStart(input.workDate);

    const { data: rows } = await this.supabase
      .from("hr_late_early_violation_ledger")
      .select("deduction_minutes_delta, as_of_date")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .gte("as_of_date", monthFrom)
      .lte("as_of_date", input.workDate)
      .is("deleted_at", null);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    for (const row of rows ?? []) {
      const minutes = Number(row.deduction_minutes_delta ?? 0);
      const asOfDate = String(row.as_of_date);
      monthly += minutes;
      if (asOfDate >= weekFrom) weekly += minutes;
      if (asOfDate === input.workDate) daily += minutes;
    }

    return { daily, monthly, weekly };
  }

  checkPeriodLimits(input: {
    aggregated: { daily: number; monthly: number; weekly: number };
    policy: ResolvedLateEarlyPolicy;
    proposedDeductionMinutes: number;
  }): string | null {
    const rules = input.policy.policyRules;
    const dailyLimit = input.policy.dailyLimitMinutes ?? rules.maxDailyMinutes ?? null;
    const weeklyLimit = input.policy.weeklyLimitMinutes ?? rules.maxWeeklyMinutes ?? null;
    const monthlyLimit = input.policy.monthlyLimitMinutes ?? rules.maxMonthlyMinutes ?? null;

    if (dailyLimit != null && input.aggregated.daily + input.proposedDeductionMinutes > dailyLimit) {
      return "daily";
    }
    if (weeklyLimit != null && input.aggregated.weekly + input.proposedDeductionMinutes > weeklyLimit) {
      return "weekly";
    }
    if (monthlyLimit != null && input.aggregated.monthly + input.proposedDeductionMinutes > monthlyLimit) {
      return "monthly";
    }
    return null;
  }

  private async buildScopeReferences(employeeId: string, workDate: string): Promise<Record<PolicyScope, string | null>> {
    const assignments = await this.assignmentResolver.resolveEmployeeAssignments(employeeId, workDate);
    const contractId = await this.resolveActiveContractId(employeeId, workDate);

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("branch_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", employeeId)
      .maybeSingle();

    return {
      branch: employee?.branch_id ? String(employee.branch_id) : this.context.branchId ?? null,
      company: this.context.companyId,
      contract: contractId,
      department: assignments.department?.referenceEntityId ?? null,
      employee: employeeId,
      shift: assignments.shift?.referenceEntityId ?? null,
    };
  }

  private async resolveActiveContractId(employeeId: string, workDate: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("hr_contracts")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .lte("starts_on", workDate)
      .or(`ends_on.is.null,ends_on.gte.${workDate}`)
      .is("deleted_at", null)
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? String(data.id) : null;
  }

  private async loadPolicy(policyId: string, workDate: string): Promise<ResolvedLateEarlyPolicy | null> {
    const { data } = await this.supabase
      .from("hr_late_early_policies")
      .select(
        "id, name, grace_minutes, late_threshold_minutes, early_leave_threshold_minutes, daily_limit_minutes, weekly_limit_minutes, monthly_limit_minutes, policy_rules, effective_from, effective_to, status",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("id", policyId)
      .eq("status", "active")
      .lte("effective_from", workDate)
      .or(`effective_to.is.null,effective_to.gte.${workDate}`)
      .is("deleted_at", null)
      .maybeSingle();

    return data ? this.mapPolicyRow(data as PolicyRow, workDate) : null;
  }

  private async resolveCompanyDefaultPolicy(workDate: string): Promise<ResolvedLateEarlyPolicy> {
    const { data } = await this.supabase
      .from("hr_late_early_policies")
      .select(
        "id, name, grace_minutes, late_threshold_minutes, early_leave_threshold_minutes, daily_limit_minutes, weekly_limit_minutes, monthly_limit_minutes, policy_rules, effective_from, effective_to",
      )
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .lte("effective_from", workDate)
      .or(`effective_to.is.null,effective_to.gte.${workDate}`)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return {
        dailyLimitMinutes: DEFAULT_LATE_EARLY_POLICY_RULES.maxDailyMinutes ?? null,
        earlyLeaveThresholdMinutes: DEFAULT_LATE_EARLY_POLICY_RULES.earlyLeaveThresholdMinutes ?? 1,
        graceMinutes: 15,
        id: "default",
        lateThresholdMinutes: DEFAULT_LATE_EARLY_POLICY_RULES.lateThresholdMinutes ?? 1,
        monthlyLimitMinutes: DEFAULT_LATE_EARLY_POLICY_RULES.maxMonthlyMinutes ?? null,
        name: "Default Late/Early Policy",
        policyRules: DEFAULT_LATE_EARLY_POLICY_RULES,
        weeklyLimitMinutes: DEFAULT_LATE_EARLY_POLICY_RULES.maxWeeklyMinutes ?? null,
      };
    }

    return this.mapPolicyRow(data as PolicyRow, workDate);
  }

  private mapPolicyRow(data: PolicyRow, workDate: string): ResolvedLateEarlyPolicy {
    const rulesRaw = readMetadata(data.policy_rules);
    let policyRules = { ...DEFAULT_LATE_EARLY_POLICY_RULES, ...rulesRaw } as LateEarlyPolicyRules;

    if (policyRules.weekendRules && isWeekend(workDate)) {
      policyRules = {
        ...policyRules,
        toleranceMinutes: (policyRules.toleranceMinutes ?? 0) + Number(data.grace_minutes ?? 15),
      };
    }

    return {
      dailyLimitMinutes: data.daily_limit_minutes != null ? Number(data.daily_limit_minutes) : null,
      earlyLeaveThresholdMinutes: Number(data.early_leave_threshold_minutes ?? 1),
      graceMinutes: Number(data.grace_minutes ?? 15),
      id: String(data.id),
      lateThresholdMinutes: Number(data.late_threshold_minutes ?? 1),
      monthlyLimitMinutes: data.monthly_limit_minutes != null ? Number(data.monthly_limit_minutes) : null,
      name: String(data.name),
      policyRules,
      weeklyLimitMinutes: data.weekly_limit_minutes != null ? Number(data.weekly_limit_minutes) : null,
    };
  }
}
