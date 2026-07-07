import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

export class HrLateEarlyViolationEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async detectPatterns(input: {
    employeeId: string;
    violationKind: "late" | "early_leave";
    workDate: string;
    windowDays?: number;
  }): Promise<"repeated_late" | "repeated_early" | "habitual_late" | "habitual_early" | null> {
    const windowDays = input.windowDays ?? 30;
    const start = new Date(`${input.workDate}T12:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - windowDays);
    const periodStart = start.toISOString().slice(0, 10);

    const kindFilter = input.violationKind === "late" ? ["late", "repeated_late", "habitual_late"] : ["early_leave", "repeated_early", "habitual_early"];

    const { count } = await this.supabase
      .from("hr_late_early_violations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .in("violation_kind", kindFilter)
      .gte("work_date", periodStart)
      .lte("work_date", input.workDate)
      .not("status", "in", "(cancelled,rejected)")
      .is("deleted_at", null);

    const total = count ?? 0;
    if (total >= 8) return input.violationKind === "late" ? "habitual_late" : "habitual_early";
    if (total >= 3) return input.violationKind === "late" ? "repeated_late" : "repeated_early";
    return null;
  }
}
