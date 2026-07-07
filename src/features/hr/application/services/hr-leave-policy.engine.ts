import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import { DEFAULT_POLICY_RULES, type LeavePolicyRules } from "../constants/hr-leave-runtime.constants";

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export class HrLeavePolicyEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async resolveActivePolicy(leaveTypeId: string): Promise<{
    annualEntitlement: number;
    carryForwardAllowed: boolean;
    entitlementUnit: string;
    id: string;
    policyRules: LeavePolicyRules;
  } | null> {
    const { data } = await this.supabase
      .from("hr_leave_policies")
      .select("id, annual_entitlement, carry_forward_allowed, entitlement_unit, policy_rules, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("leave_type_id", leaveTypeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const metadata = readMetadata(data.metadata);
    const rulesRaw = readMetadata(data.policy_rules ?? metadata.policy_rules);
    return {
      annualEntitlement: Number(data.annual_entitlement ?? 0),
      carryForwardAllowed: Boolean(data.carry_forward_allowed),
      entitlementUnit: String(data.entitlement_unit ?? "days"),
      id: String(data.id),
      policyRules: { ...DEFAULT_POLICY_RULES, ...rulesRaw } as LeavePolicyRules,
    };
  }

  validateRequestAgainstPolicy(input: {
    employeeHireDate?: string | null;
    employeeOnProbation?: boolean;
    policy: NonNullable<Awaited<ReturnType<HrLeavePolicyEngine["resolveActivePolicy"]>>>;
    quantity: number;
  }): void {
    const rules = input.policy.policyRules;
    if (rules.minRequestDays != null && input.quantity < rules.minRequestDays) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Minimum request is ${rules.minRequestDays} day(s).` });
    }
    if (rules.maxRequestDays != null && input.quantity > rules.maxRequestDays) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Maximum request is ${rules.maxRequestDays} day(s).` });
    }
    if (rules.eligibility?.probationRestricted && input.employeeOnProbation) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Leave is restricted during probation per policy." });
    }
    if (rules.eligibility?.minimumServiceDays && input.employeeHireDate) {
      const hire = new Date(`${input.employeeHireDate}T00:00:00.000Z`);
      const days = Math.floor((Date.now() - hire.getTime()) / 86_400_000);
      if (days < rules.eligibility.minimumServiceDays) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Minimum service period not met for this leave type." });
      }
    }
  }
}
