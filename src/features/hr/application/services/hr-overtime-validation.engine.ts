import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import type { OvertimeConflictCode } from "../constants/hr-overtime-runtime.constants";

export type OvertimeConflictIssue = Readonly<{
  code: OvertimeConflictCode;
  message: string;
}>;

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

export class HrOvertimeValidationEngine {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async detectConflicts(input: {
    attendanceDayId?: string;
    durationMinutes: number;
    employeeId: string;
    excludeRequestId?: string;
    overtimeType?: string;
    workDate: string;
  }): Promise<readonly OvertimeConflictIssue[]> {
    const issues: OvertimeConflictIssue[] = [];

    const { data: employee } = await this.supabase
      .from("hr_employees")
      .select("status, hire_date, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.employeeId)
      .maybeSingle();

    if (!employee || !["active", "probation"].includes(String(employee.status))) {
      issues.push({ code: "inactive_employee", message: "Employee is not active for overtime." });
    } else if (String(employee.status) === "probation") {
      issues.push({ code: "probation_restriction", message: "Employee is on probation." });
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
      } else if (["locked", "exported_to_payroll"].includes(String(day.status))) {
        issues.push({ code: "payroll_locked", message: "Attendance day is locked for payroll." });
      }
    }

    let overlapQuery = this.supabase
      .from("hr_overtime_requests")
      .select("id, work_date, status, duration_minutes")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("work_date", input.workDate)
      .in("status", ["submitted", "under_review", "approved"])
      .is("deleted_at", null);

    if (input.excludeRequestId) overlapQuery = overlapQuery.neq("id", input.excludeRequestId);

    const { data: overlaps } = await overlapQuery;
    if ((overlaps ?? []).length > 0) {
      issues.push({ code: "existing_overtime_overlap", message: "Overtime request already exists for this date." });
      if ((overlaps ?? []).some((row) => Number(row.duration_minutes ?? 0) === input.durationMinutes)) {
        issues.push({ code: "duplicate_request", message: "Duplicate overtime request for the same duration." });
      }
    }

    const { count: leaveOverlap } = await this.supabase
      .from("hr_leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("status", "approved")
      .lte("starts_on", input.workDate)
      .gte("ends_on", input.workDate)
      .is("deleted_at", null);

    if ((leaveOverlap ?? 0) > 0) {
      issues.push({ code: "leave_conflict", message: "Employee is on approved leave for this date." });
    }

    const weekFrom = weekStart(input.workDate);
    const monthFrom = monthStart(input.workDate);

    const { data: weekRows } = await this.supabase
      .from("hr_overtime_requests")
      .select("duration_minutes")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .gte("work_date", weekFrom)
      .lte("work_date", input.workDate)
      .in("status", ["submitted", "under_review", "approved"])
      .is("deleted_at", null);

    const weekMinutes = (weekRows ?? []).reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0) + input.durationMinutes;
    if (weekMinutes > 720) {
      issues.push({ code: "max_weekly_hours", message: "Weekly overtime limit would be exceeded." });
    }

    const { data: monthRows } = await this.supabase
      .from("hr_overtime_requests")
      .select("duration_minutes")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .gte("work_date", monthFrom)
      .lte("work_date", input.workDate)
      .in("status", ["submitted", "under_review", "approved"])
      .is("deleted_at", null);

    const monthMinutes = (monthRows ?? []).reduce((sum, row) => sum + Number(row.duration_minutes ?? 0), 0) + input.durationMinutes;
    if (monthMinutes > 2400) {
      issues.push({ code: "max_monthly_hours", message: "Monthly overtime limit would be exceeded." });
    }

    if (input.durationMinutes > 240) {
      issues.push({ code: "max_daily_hours", message: "Daily overtime exceeds maximum allowed hours." });
    }

    return issues;
  }
}
