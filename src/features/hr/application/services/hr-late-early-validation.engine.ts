import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import { LOCKED_ATTENDANCE_DAY_STATUSES } from "../constants/hr-attendance-payroll.constants";
import type { LateEarlyConflictCode } from "../constants/hr-late-early-runtime.constants";

export type LateEarlyConflictIssue = Readonly<{
  code: LateEarlyConflictCode;
  message: string;
}>;

export class HrLateEarlyValidationEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async detectConflicts(input: {
    attendanceDayId?: string;
    employeeId: string;
    excludeViolationId?: string;
    workDate: string;
  }): Promise<readonly LateEarlyConflictIssue[]> {
    const issues: LateEarlyConflictIssue[] = [];

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("status, hire_date")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.employeeId)
      .maybeSingle();

    if (!employee || !["active", "probation"].includes(String(employee.status))) {
      issues.push({ code: "inactive_employee", message: "Employee is not active for late/early evaluation." });
    }

    if (input.attendanceDayId) {
      const { data: day } = await this.supabase
        .from("hr_attendance_days")
        .select("id, status")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.attendanceDayId)
        .maybeSingle();

      if (!day) {
        issues.push({ code: "attendance_missing", message: "Linked attendance day not found." });
      } else if (LOCKED_ATTENDANCE_DAY_STATUSES.includes(String(day.status) as (typeof LOCKED_ATTENDANCE_DAY_STATUSES)[number])) {
        issues.push({ code: "payroll_locked", message: "Attendance day is locked for payroll." });
      } else if (String(day.status) === "exported_to_payroll") {
        issues.push({ code: "attendance_exported", message: "Attendance day is already exported to payroll." });
      }
    }

    let overlapQuery = this.supabase
      .from("hr_late_early_violations")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("work_date", input.workDate)
      .not("status", "in", "(cancelled,rejected)")
      .is("deleted_at", null);

    if (input.excludeViolationId) overlapQuery = overlapQuery.neq("id", input.excludeViolationId);

    const { data: overlaps } = await overlapQuery;
    if ((overlaps ?? []).some((row) => ["exported_to_payroll"].includes(String(row.status)))) {
      issues.push({ code: "violation_exported", message: "Late/early violation is already exported to payroll." });
    }

    return issues;
  }
}
