import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import type { LeaveConflictCode } from "../constants/hr-leave-runtime.constants";

export type LeaveConflictIssue = Readonly<{
  code: LeaveConflictCode;
  message: string;
}>;

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

export class HrLeaveConflictEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async detectConflicts(input: {
    employeeId: string;
    endsOn: string;
    excludeRequestId?: string;
    leaveTypeId: string;
    quantity: number;
    startsOn: string;
  }): Promise<readonly LeaveConflictIssue[]> {
    const issues: LeaveConflictIssue[] = [];

    let overlapQuery = this.supabase
      .from("hr_leave_requests")
      .select("id, starts_on, ends_on, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .in("status", ["submitted", "under_review", "approved"])
      .lte("starts_on", input.endsOn)
      .gte("ends_on", input.startsOn)
      .is("deleted_at", null);

    if (input.excludeRequestId) overlapQuery = overlapQuery.neq("id", input.excludeRequestId);

    const { data: overlaps } = await overlapQuery;
    if ((overlaps ?? []).length > 0) {
      issues.push({ code: "existing_leave_overlap", message: "Overlapping leave request exists." });
      if ((overlaps ?? []).some((row) => row.starts_on === input.startsOn && row.ends_on === input.endsOn)) {
        issues.push({ code: "duplicate_request", message: "Duplicate leave request for the same period." });
      }
    }

    const { data: holidays } = await this.supabase
      .from("hr_holidays")
      .select("holiday_date, name")
      .eq("tenant_id", this.context.tenantId)
      .gte("holiday_date", input.startsOn)
      .lte("holiday_date", input.endsOn)
      .eq("status", "active")
      .is("deleted_at", null);

    if ((holidays ?? []).length > 0) {
      issues.push({ code: "holiday_overlap", message: "Leave period overlaps company holidays." });
    }

    if (isWeekend(input.startsOn) && isWeekend(input.endsOn)) {
      issues.push({ code: "weekend_overlap", message: "Leave request spans only weekends." });
    }

    const { count: attendanceOverlap } = await this.supabase
      .from("hr_attendance_days")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .gte("work_date", input.startsOn)
      .lte("work_date", input.endsOn)
      .in("status", ["locked", "exported_to_payroll"])
      .is("deleted_at", null);

    if ((attendanceOverlap ?? 0) > 0) {
      issues.push({ code: "payroll_closed_period", message: "Attendance is locked/exported for part of this period." });
    }

    const { data: balance } = await this.supabase
      .from("hr_leave_balances")
      .select("available_quantity, pending_quantity")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("leave_type_id", input.leaveTypeId)
      .is("deleted_at", null)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const available = Number(balance?.available_quantity ?? 0) - Number(balance?.pending_quantity ?? 0);
    if (available < input.quantity) {
      issues.push({ code: "insufficient_balance", message: "Insufficient leave balance for this request." });
    }

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("status, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.employeeId)
      .maybeSingle();

    if (employee && String(employee.status) === "probation") {
      issues.push({ code: "probation_restriction", message: "Employee is on probation." });
    }

    return issues;
  }
}
