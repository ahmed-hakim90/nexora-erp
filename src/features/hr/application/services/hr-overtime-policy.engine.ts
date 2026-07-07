import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import {
  DEFAULT_OVERTIME_POLICY_RULES,
  type OvertimePolicyRules,
} from "../constants/hr-overtime-runtime.constants";

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

export class HrOvertimePolicyEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async resolveActivePolicy(input: { overtimeType?: string; workDate: string }): Promise<{
    dailyLimitMinutes: number | null;
    id: string;
    monthlyLimitMinutes: number | null;
    overtimeType: string;
    policyRules: OvertimePolicyRules;
    rateMultiplier: number;
    weeklyLimitMinutes: number | null;
  }> {
    const { data } = await this.supabase
      .from("hr_overtime_policies")
      .select("id, overtime_type, rate_multiplier, daily_limit_minutes, weekly_limit_minutes, monthly_limit_minutes, policy_rules, effective_from, effective_to")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .lte("effective_from", input.workDate)
      .or(`effective_to.is.null,effective_to.gte.${input.workDate}`)
      .eq("overtime_type", input.overtimeType ?? "normal")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return {
        dailyLimitMinutes: DEFAULT_OVERTIME_POLICY_RULES.maxDailyMinutes ?? null,
        id: "default",
        monthlyLimitMinutes: DEFAULT_OVERTIME_POLICY_RULES.maxMonthlyMinutes ?? null,
        overtimeType: input.overtimeType ?? "normal",
        policyRules: DEFAULT_OVERTIME_POLICY_RULES,
        rateMultiplier: 1.5,
        weeklyLimitMinutes: DEFAULT_OVERTIME_POLICY_RULES.maxWeeklyMinutes ?? null,
      };
    }

    const rulesRaw = readMetadata(data.policy_rules);
    return {
      dailyLimitMinutes: data.daily_limit_minutes != null ? Number(data.daily_limit_minutes) : null,
      id: String(data.id),
      monthlyLimitMinutes: data.monthly_limit_minutes != null ? Number(data.monthly_limit_minutes) : null,
      overtimeType: String(data.overtime_type),
      policyRules: { ...DEFAULT_OVERTIME_POLICY_RULES, ...rulesRaw } as OvertimePolicyRules,
      rateMultiplier: Number(data.rate_multiplier ?? 1.5),
      weeklyLimitMinutes: data.weekly_limit_minutes != null ? Number(data.weekly_limit_minutes) : null,
    };
  }

  validateRequestAgainstPolicy(input: {
    durationMinutes: number;
    employeeHireDate?: string | null;
    employeeOnProbation?: boolean;
    policy: NonNullable<Awaited<ReturnType<HrOvertimePolicyEngine["resolveActivePolicy"]>>>;
  }): void {
    const rules = input.policy.policyRules;
    if (rules.minMinutes != null && input.durationMinutes < rules.minMinutes) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Minimum overtime is ${rules.minMinutes} minute(s).` });
    }
    const dailyLimit = input.policy.dailyLimitMinutes ?? rules.maxDailyMinutes;
    if (dailyLimit != null && input.durationMinutes > dailyLimit) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Daily overtime limit is ${dailyLimit} minute(s).` });
    }
    if (rules.eligibility?.probationRestricted && input.employeeOnProbation) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Overtime is restricted during probation per policy." });
    }
    if (rules.eligibility?.minimumServiceDays && input.employeeHireDate) {
      const hire = new Date(`${input.employeeHireDate}T00:00:00.000Z`);
      const days = Math.floor((Date.now() - hire.getTime()) / 86_400_000);
      if (days < rules.eligibility.minimumServiceDays) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Minimum service period not met for overtime." });
      }
    }
  }

  resolveOvertimeTypeForDate(workDate: string): string {
    if (isWeekend(workDate)) return "weekend";
    return "normal";
  }
}
