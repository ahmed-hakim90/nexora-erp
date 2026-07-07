import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import { recordAuditEvent } from "@/platform/audit/server";
import { createBackgroundJob } from "@/platform/background-jobs/public-api";

import {
  ATTENDANCE_CLOSING_JOB,
  ATTENDANCE_EXPORT_CLEANUP_JOB,
  ATTENDANCE_EXPORT_JOB,
  ATTENDANCE_SNAPSHOT_JOB,
  HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS,
  HR_ATTENDANCE_PAYROLL_EVENT_KEYS,
  LOCKED_ATTENDANCE_DAY_STATUSES,
  type PayrollExportValidationCode,
} from "../constants/hr-attendance-payroll.constants";
import type {
  HrAttendanceClosingCreateInput,
  HrAttendanceExportExecuteInput,
  HrAttendanceExportFilterInput,
  HrAttendanceReopenInput,
} from "../schemas/hr-attendance-payroll-export.schema";
import { readAttendanceDayMetrics } from "./hr-attendance.service";
import { HrLateEarlyPayrollInputService, HrLateEarlyRuntimeService } from "./hr-late-early-runtime.service";
import { HrLeavePayrollInputService } from "./hr-leave-runtime.service";
import { HrOvertimePayrollInputService } from "./hr-overtime-runtime.service";

export type AttendancePayrollInputSnapshot = Readonly<{
  absenceDays: number;
  attendanceDayIds: readonly string[];
  earlyLeaveMinutes: number;
  employeeId: string;
  deductionMinutes: number;
  holidayDays: number;
  lateMinutes: number;
  leaveDays: number;
  nightHours: number;
  overtimeHours: number;
  paidDays: number;
  shiftCount: number;
  unpaidDays: number;
  weekendDays: number;
  workedDays: number;
  workedHours: number;
}>;

export type AttendanceEmployeeReadiness = Readonly<{
  blockers: readonly PayrollExportValidationCode[];
  employeeId: string;
  employeeLabel: string;
  payrollReady: boolean;
}>;

export type AttendanceExportValidationIssue = Readonly<{
  code: PayrollExportValidationCode;
  employeeId: string | null;
  employeeLabel: string | null;
  message: string;
  workDate: string | null;
}>;

export type AttendanceExportPreview = Readonly<{
  blockedEmployees: number;
  employees: readonly (AttendancePayrollInputSnapshot & { employeeLabel: string; payrollReady: boolean })[];
  issues: readonly AttendanceExportValidationIssue[];
  readyEmployees: number;
  totalEmployees: number;
}>;

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
}

function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export class HrAttendancePayrollExportService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async assertDayMutable(attendanceDayId: string): Promise<void> {
    const { data: day, error } = await this.supabase
      .from("hr_attendance_days")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", attendanceDayId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !day) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance day not found." });

    if (LOCKED_ATTENDANCE_DAY_STATUSES.includes(String(day.status) as (typeof LOCKED_ATTENDANCE_DAY_STATUSES)[number])) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Attendance day is locked for payroll. Reopen with hr.attendance.reopen permission before editing.",
      });
    }

    const { data: lock } = await this.supabase
      .from("hr_attendance_locks")
      .select("lock_level")
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_day_id", attendanceDayId)
      .eq("lock_level", "payroll_locked")
      .is("deleted_at", null)
      .maybeSingle();

    if (lock) {
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        message: "Attendance day has an active payroll lock. Reopen before making changes.",
      });
    }
  }

  private async writeNotification(input: {
    body: string;
    eventKey: string;
    idempotencyKey: string;
    severity: "info" | "warning" | "error";
    title: string;
  }) {
    await this.supabase.from("hr_operator_notifications").insert({
      body: input.body,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      event_key: input.eventKey,
      idempotency_key: input.idempotencyKey,
      severity: input.severity,
      tenant_id: this.context.tenantId,
      title: input.title,
      updated_by: this.context.userId,
    });
  }

  private async queueBackgroundJob(jobKey: string, payload: Record<string, unknown>, idempotencyKey: string) {
    const correlationId = crypto.randomUUID();
    const jobDefinition =
      jobKey === ATTENDANCE_CLOSING_JOB.key
        ? ATTENDANCE_CLOSING_JOB
        : jobKey === ATTENDANCE_SNAPSHOT_JOB.key
          ? ATTENDANCE_SNAPSHOT_JOB
          : jobKey === ATTENDANCE_EXPORT_CLEANUP_JOB.key
            ? ATTENDANCE_EXPORT_CLEANUP_JOB
            : ATTENDANCE_EXPORT_JOB;

    createBackgroundJob(jobDefinition, {
      actorType: "user",
      actorUserId: this.context.userId,
      branchId: this.context.branchId,
      companyId: this.context.companyId,
      correlationId,
      createdAt: new Date().toISOString(),
      experience: "erp",
      id: crypto.randomUUID(),
      idempotencyKey,
      jobKey,
      originatingApp: "hr",
      payload,
      principalId: this.context.userId,
      tenantId: this.context.tenantId,
    });

    const { data } = await this.supabase
      .from("background_jobs")
      .insert({
        created_by: this.context.userId,
        idempotency_key: idempotencyKey,
        job_key: jobKey,
        payload,
        priority: "normal",
        status: "queued",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    return { backgroundJobId: data?.id ? String(data.id) : null, correlationId };
  }

  private buildEmployeeFilterQuery(filters: HrAttendanceExportFilterInput) {
    let employeeQuery = this.supabase
      .from("hr_employees")
      .select("id, full_name, employee_number, status, branch_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (filters.employeeId) employeeQuery = employeeQuery.eq("id", filters.employeeId);
    if (filters.branchId) employeeQuery = employeeQuery.eq("branch_id", filters.branchId);
    else if (this.context.branchId) employeeQuery = employeeQuery.eq("branch_id", this.context.branchId);

    return employeeQuery;
  }

  async resolveEmployeeIds(filters: HrAttendanceExportFilterInput): Promise<
    readonly { branchId: string | null; employeeId: string; employeeLabel: string }[]
  > {
    const { data, error } = await this.buildEmployeeFilterQuery(filters);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve employees.", cause: error });

    let employees = (data ?? []).map((row) => ({
      branchId: row.branch_id ? String(row.branch_id) : null,
      employeeId: String(row.id),
      employeeLabel: `${row.full_name} (${row.employee_number})`,
    }));

    if (filters.departmentId) {
      const { data: assignments } = await this.supabase
        .from("hr_assignments")
        .select("employee_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("assignment_type", "department")
        .eq("reference_entity_id", filters.departmentId)
        .eq("assignment_status", "active")
        .is("deleted_at", null);
      const allowed = new Set((assignments ?? []).map((row) => String(row.employee_id)));
      employees = employees.filter((employee) => allowed.has(employee.employeeId));
    }

    return employees;
  }

  async validateExport(filters: HrAttendanceExportFilterInput): Promise<readonly AttendanceExportValidationIssue[]> {
    const employees = await this.resolveEmployeeIds(filters);
    const issues: AttendanceExportValidationIssue[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const employee of employees) {
      if (filters.branchId && employee.branchId && employee.branchId !== filters.branchId) {
        issues.push({
          code: "branch_mismatch",
          employeeId: employee.employeeId,
          employeeLabel: employee.employeeLabel,
          message: "Employee branch does not match export branch filter.",
          workDate: null,
        });
      }

      const { data: days } = await this.supabase
        .from("hr_attendance_days")
        .select("id, work_date, status, expected_vs_actual, metadata")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employee.employeeId)
        .gte("work_date", filters.periodStart)
        .lte("work_date", filters.periodEnd)
        .is("deleted_at", null);

      for (const day of days ?? []) {
        const metrics = readAttendanceDayMetrics(day.expected_vs_actual);
        const metadata = readMetadata(day.metadata);
        const workDate = String(day.work_date);
        const status = String(day.status);

        if (metrics.missingIn || metrics.missingOut) {
          issues.push({
            code: "missing_punches",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Missing punch detected.",
            workDate,
          });
        }

        if (["needs_review", "pending", "processing"].includes(status)) {
          issues.push({
            code: "pending_review",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Attendance day is not fully processed.",
            workDate,
          });
        }

        if (LOCKED_ATTENDANCE_DAY_STATUSES.includes(status as (typeof LOCKED_ATTENDANCE_DAY_STATUSES)[number]) && !metadata.reopened) {
          issues.push({
            code: "payroll_locked",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Attendance day is already locked or exported.",
            workDate,
          });
        }
      }

      const dayIds = (days ?? []).map((day) => String(day.id));
      if (dayIds.length > 0) {
        const { count: openExceptions } = await this.supabase
          .from("hr_attendance_exceptions")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", this.context.tenantId)
          .in("attendance_day_id", dayIds)
          .eq("status", "open")
          .is("deleted_at", null);

        if ((openExceptions ?? 0) > 0) {
          issues.push({
            code: "unapproved_exceptions",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Open attendance exceptions must be resolved before export.",
            workDate: null,
          });
        }

        const { count: pendingReview } = await this.supabase
          .from("hr_attendance_review_queue")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", this.context.tenantId)
          .eq("employee_id", employee.employeeId)
          .in("status", ["pending", "assigned", "in_review"])
          .is("deleted_at", null);

        if ((pendingReview ?? 0) > 0) {
          issues.push({
            code: "pending_review",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Pending review queue items block payroll export.",
            workDate: null,
          });
        }
      }

      const leaveInputService = new HrLeavePayrollInputService(this.supabase, this.context);
      const openLeave = await leaveInputService.countOpenLeaveOverlappingPeriod(
        employee.employeeId,
        filters.periodStart,
        filters.periodEnd,
      );

      if (openLeave > 0) {
        issues.push({
          code: "open_leave",
          employeeId: employee.employeeId,
          employeeLabel: employee.employeeLabel,
          message: "Open leave requests overlap the export period.",
          workDate: null,
        });
      }

      const overtimeInputService = new HrOvertimePayrollInputService(this.supabase, this.context);
      const openOvertime = await overtimeInputService.countOpenOvertimeOverlappingPeriod(
        employee.employeeId,
        filters.periodStart,
        filters.periodEnd,
      );

      if (openOvertime > 0) {
        issues.push({
          code: "open_overtime",
          employeeId: employee.employeeId,
          employeeLabel: employee.employeeLabel,
          message: "Open overtime requests must be approved before export.",
          workDate: null,
        });
      }

      const lateEarlyInputService = new HrLateEarlyPayrollInputService(this.supabase, this.context);
      const openLateEarly = await lateEarlyInputService.countOpenViolationsOverlappingPeriod(
        employee.employeeId,
        filters.periodStart,
        filters.periodEnd,
      );

      if (openLateEarly > 0) {
        issues.push({
          code: "open_late_early",
          employeeId: employee.employeeId,
          employeeLabel: employee.employeeLabel,
          message: "Open late/early violations must be approved before export.",
          workDate: null,
        });
      }

      const { data: punches } = await this.supabase
        .from("hr_attendance_punch_logs")
        .select("id, punch_time, status")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employee.employeeId)
        .gte("punch_time", `${filters.periodStart}T00:00:00.000Z`)
        .lte("punch_time", `${filters.periodEnd}T23:59:59.999Z`)
        .is("deleted_at", null);

      const seen = new Map<string, number>();
      for (const punch of punches ?? []) {
        const key = String(punch.punch_time);
        seen.set(key, (seen.get(key) ?? 0) + 1);
        if (String(punch.punch_time).slice(0, 10) > today) {
          issues.push({
            code: "future_punches",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Future-dated punch detected.",
            workDate: String(punch.punch_time).slice(0, 10),
          });
        }
        if ((seen.get(key) ?? 0) > 1 || String(punch.status) === "duplicate") {
          issues.push({
            code: "duplicate_punches",
            employeeId: employee.employeeId,
            employeeLabel: employee.employeeLabel,
            message: "Duplicate punch detected.",
            workDate: String(punch.punch_time).slice(0, 10),
          });
        }
      }
    }

    if (employees.length === 0) {
      issues.push({
        code: "inactive_employee",
        employeeId: null,
        employeeLabel: null,
        message: "No active employees matched the export filters.",
        workDate: null,
      });
    }

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportValidated,
      category: "data-access",
      context: this.context,
      entityType: "hr_attendance_payroll_export_batch",
      metadata: { issueCount: issues.length, periodEnd: filters.periodEnd, periodStart: filters.periodStart },
      module: "hr",
    });

    return issues;
  }

  private async aggregateEmployeePayrollInput(
    employeeId: string,
    filters: HrAttendanceExportFilterInput,
  ): Promise<AttendancePayrollInputSnapshot> {
    const { data: profile } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: days } = await this.supabase
      .from("hr_attendance_days")
      .select("id, work_date, status, expected_vs_actual, metadata")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .gte("work_date", filters.periodStart)
      .lte("work_date", filters.periodEnd)
      .is("deleted_at", null);

    let workedDays = 0;
    let workedMinutes = 0;
    let absenceDays = 0;
    let holidayDays = 0;
    let weekendDays = 0;
    let paidDays = 0;
    let unpaidDays = 0;
    let nightHours = 0;
    let shiftCount = 0;
    const attendanceDayIds: string[] = [];

    for (const day of days ?? []) {
      const metrics = readAttendanceDayMetrics(day.expected_vs_actual);
      const metadata = readMetadata(day.metadata);
      const workDate = String(day.work_date);
      attendanceDayIds.push(String(day.id));

      if (metrics.workedMinutes > 0 || ["approved", "locked", "exported_to_payroll", "ready_for_payroll"].includes(String(day.status))) {
        workedDays += 1;
        paidDays += 1;
        shiftCount += 1;
      } else if (metrics.missingIn && metrics.missingOut) {
        absenceDays += 1;
        unpaidDays += 1;
      }

      workedMinutes += metrics.workedMinutes;
      nightHours += Number(metadata.night_hours ?? metadata.nightHours ?? 0);
      if (Boolean(metadata.holiday)) holidayDays += 1;
      if (isWeekend(workDate)) weekendDays += 1;
    }

    const leaveInputService = new HrLeavePayrollInputService(this.supabase, this.context);
    const leaveInputs = await leaveInputService.getEmployeePayrollInputs(employeeId, filters.periodStart, filters.periodEnd);
    const leaveDays = leaveInputs.leaveDays;

    const overtimeInputService = new HrOvertimePayrollInputService(this.supabase, this.context);
    const overtimeInputs = await overtimeInputService.getEmployeePayrollInputs(employeeId, filters.periodStart, filters.periodEnd);

    const lateEarlyInputService = new HrLateEarlyPayrollInputService(this.supabase, this.context);
    const lateEarlyInputs = await lateEarlyInputService.getEmployeePayrollInputs(employeeId, filters.periodStart, filters.periodEnd);

    return {
      absenceDays,
      attendanceDayIds,
      deductionMinutes: lateEarlyInputs.approvedDeductionMinutes,
      earlyLeaveMinutes: lateEarlyInputs.earlyLeaveMinutes,
      employeeId,
      holidayDays,
      lateMinutes: lateEarlyInputs.lateMinutes,
      leaveDays,
      nightHours,
      overtimeHours: overtimeInputs.overtimeHours,
      paidDays: Math.max(0, paidDays + leaveInputs.paidLeaveDays),
      shiftCount,
      unpaidDays: Math.max(0, unpaidDays + leaveInputs.unpaidLeaveDays),
      weekendDays,
      workedDays,
      workedHours: minutesToHours(workedMinutes),
    };
  }

  async previewExport(filters: HrAttendanceExportFilterInput): Promise<AttendanceExportPreview> {
    const employees = await this.resolveEmployeeIds(filters);
    const issues = await this.validateExport(filters);
    const blockedEmployeeIds = new Set(issues.map((issue) => issue.employeeId).filter(Boolean) as string[]);

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const snapshot = await this.aggregateEmployeePayrollInput(employee.employeeId, filters);
        const payrollReady = !blockedEmployeeIds.has(employee.employeeId);
        return { ...snapshot, employeeLabel: employee.employeeLabel, payrollReady };
      }),
    );

    return {
      blockedEmployees: rows.filter((row) => !row.payrollReady).length,
      employees: rows,
      issues,
      readyEmployees: rows.filter((row) => row.payrollReady).length,
      totalEmployees: rows.length,
    };
  }

  async createClosing(input: HrAttendanceClosingCreateInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("hr_attendance_closings")
      .insert({
        branch_id: input.branchId ?? this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        department_id: input.departmentId ?? null,
        metadata: { runtime_implemented: true },
        payroll_group_id: input.payrollGroupId ?? null,
        period_end: input.periodEnd,
        period_start: input.periodStart,
        scope: input.scope,
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();

    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create attendance closing.", cause: error });

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.closingCreated,
      category: "data-access",
      context: this.context,
      entityId: String(data.id),
      entityType: "hr_attendance_closing",
      metadata: input,
      module: "hr",
    });

    return { id: String(data.id) };
  }

  async refreshClosingReadiness(closingId: string): Promise<void> {
    const closing = await this.getClosing(closingId);
    const filters: HrAttendanceExportFilterInput = {
      branchId: closing.branch_id ? String(closing.branch_id) : undefined,
      departmentId: closing.department_id ? String(closing.department_id) : undefined,
      payrollGroupId: closing.payroll_group_id ? String(closing.payroll_group_id) : undefined,
      periodEnd: String(closing.period_end),
      periodStart: String(closing.period_start),
    };

    const preview = await this.previewExport(filters);
    const payrollReadyPercent = preview.totalEmployees === 0 ? 0 : Math.round((preview.readyEmployees / preview.totalEmployees) * 10000) / 100;

    await this.supabase
      .from("hr_attendance_closings")
      .update({
        blocked_employee_count: preview.blockedEmployees,
        employee_count: preview.totalEmployees,
        metadata: { last_readiness_at: new Date().toISOString(), runtime_implemented: true },
        payroll_ready_percent: payrollReadyPercent,
        ready_employee_count: preview.readyEmployees,
        status: preview.blockedEmployees === 0 && preview.totalEmployees > 0 ? "ready_for_payroll" : "processing",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", closingId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.payrollReadyComputed,
      category: "data-access",
      context: this.context,
      entityId: closingId,
      entityType: "hr_attendance_closing",
      metadata: { blockedEmployees: preview.blockedEmployees, payrollReadyPercent, readyEmployees: preview.readyEmployees },
      module: "hr",
    });

    if (preview.blockedEmployees === 0 && preview.totalEmployees > 0) {
      await this.writeNotification({
        body: `${preview.readyEmployees} employees are payroll ready for ${filters.periodStart} to ${filters.periodEnd}.`,
        eventKey: HR_ATTENDANCE_PAYROLL_EVENT_KEYS.payrollReady,
        idempotencyKey: `payroll-ready:${closingId}:${Date.now()}`,
        severity: "info",
        title: "Attendance payroll ready",
      });
    }
  }

  async lockClosing(closingId: string): Promise<void> {
    const closing = await this.getClosing(closingId);
    if (["locked", "exported"].includes(String(closing.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Closing is already locked or exported." });
    }

    await this.refreshClosingReadiness(closingId);
    const refreshed = await this.getClosing(closingId);
    if (Number(refreshed.blocked_employee_count) > 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Cannot lock closing while employees are blocked." });
    }

    const filters: HrAttendanceExportFilterInput = {
      branchId: closing.branch_id ? String(closing.branch_id) : undefined,
      departmentId: closing.department_id ? String(closing.department_id) : undefined,
      payrollGroupId: closing.payroll_group_id ? String(closing.payroll_group_id) : undefined,
      periodEnd: String(closing.period_end),
      periodStart: String(closing.period_start),
    };
    const employees = await this.resolveEmployeeIds(filters);

    for (const employee of employees) {
      const { data: days } = await this.supabase
        .from("hr_attendance_days")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employee.employeeId)
        .gte("work_date", filters.periodStart)
        .lte("work_date", filters.periodEnd)
        .is("deleted_at", null);

      for (const day of days ?? []) {
        const dayId = String(day.id);
        await this.supabase
          .from("hr_attendance_days")
          .update({
            metadata: { locked_at: new Date().toISOString(), payroll_ready: true },
            status: "locked",
            updated_by: this.context.userId,
          })
          .eq("tenant_id", this.context.tenantId)
          .eq("id", dayId);

        const { data: existingLock } = await this.supabase
          .from("hr_attendance_locks")
          .select("id")
          .eq("tenant_id", this.context.tenantId)
          .eq("attendance_day_id", dayId)
          .is("deleted_at", null)
          .maybeSingle();

        const lockPayload = {
          attendance_day_id: dayId,
          branch_id: this.context.branchId,
          company_id: this.context.companyId,
          lock_level: "payroll_locked" as const,
          locked_at: new Date().toISOString(),
          locked_by: this.context.userId,
          metadata: { closing_id: closingId, runtime_implemented: true },
          updated_by: this.context.userId,
        };

        if (existingLock) {
          await this.supabase.from("hr_attendance_locks").update(lockPayload).eq("id", existingLock.id);
        } else {
          await this.supabase.from("hr_attendance_locks").insert({
            ...lockPayload,
            created_by: this.context.userId,
            tenant_id: this.context.tenantId,
          });
        }
      }
    }

    const { backgroundJobId } = await this.queueBackgroundJob(
      ATTENDANCE_CLOSING_JOB.key,
      { closingId },
      `attendance-closing:${closingId}`,
    );

    await this.supabase
      .from("hr_attendance_closings")
      .update({
        background_job_id: backgroundJobId,
        locked_at: new Date().toISOString(),
        locked_by: this.context.userId,
        status: "locked",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", closingId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.closingLocked,
      category: "data-access",
      context: this.context,
      entityId: closingId,
      entityType: "hr_attendance_closing",
      module: "hr",
    });

    await this.writeNotification({
      body: `Attendance closing locked for ${filters.periodStart} to ${filters.periodEnd}.`,
      eventKey: HR_ATTENDANCE_PAYROLL_EVENT_KEYS.attendanceLocked,
      idempotencyKey: `attendance-locked:${closingId}`,
      severity: "info",
      title: "Attendance locked",
    });
  }

  async executeExport(input: HrAttendanceExportExecuteInput): Promise<{ batchId: string }> {
    const preview = await this.previewExport(input);
    if (preview.issues.length > 0) {
      await recordAuditEvent({
        action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportFailed,
        category: "data-access",
        context: this.context,
        entityType: "hr_attendance_payroll_export_batch",
        metadata: { issueCount: preview.issues.length },
        module: "hr",
      });
      await this.writeNotification({
        body: `Export failed with ${preview.issues.length} validation issue(s).`,
        eventKey: HR_ATTENDANCE_PAYROLL_EVENT_KEYS.exportFailed,
        idempotencyKey: `export-failed:${input.periodStart}:${input.periodEnd}:${Date.now()}`,
        severity: "error",
        title: "Attendance export failed",
      });
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        details: { issues: preview.issues.slice(0, 20) },
        message: `Export blocked by ${preview.issues.length} validation issue(s).`,
      });
    }

    const { data: batch, error: batchError } = await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .insert({
        branch_id: input.branchId ?? this.context.branchId,
        closing_id: input.closingId ?? null,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        department_id: input.departmentId ?? null,
        employee_count: preview.totalEmployees,
        employee_id: input.employeeId ?? null,
        filters: input,
        metadata: { runtime_implemented: true },
        payroll_group_id: input.payrollGroupId ?? null,
        period_end: input.periodEnd,
        period_start: input.periodStart,
        status: "validating",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
        validation_report: { issueCount: 0, validatedAt: new Date().toISOString() },
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create export batch.", cause: batchError });
    }

    const batchId = String(batch.id);
    const { backgroundJobId } = await this.queueBackgroundJob(
      ATTENDANCE_EXPORT_JOB.key,
      { batchId },
      `attendance-export:${batchId}`,
    );

    for (const employee of preview.employees) {
      const { data: profile } = await this.supabase
        .from("hr_employment_profiles")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employee.employeeId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!profile) continue;

      await this.supabase.from("hr_attendance_payroll_snapshots").insert({
        absence_days: employee.absenceDays,
        attendance_day_ids: employee.attendanceDayIds,
        branch_id: input.branchId ?? this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        deduction_minutes: employee.deductionMinutes,
        early_leave_minutes: employee.earlyLeaveMinutes,
        employee_id: employee.employeeId,
        employment_profile_id: String(profile.id),
        export_batch_id: batchId,
        holiday_days: employee.holidayDays,
        late_minutes: employee.lateMinutes,
        leave_days: employee.leaveDays,
        metadata: { immutable: true, payroll_reads_snapshot_only: true },
        night_hours: employee.nightHours,
        overtime_hours: employee.overtimeHours,
        paid_days: employee.paidDays,
        payload: employee,
        period_end: input.periodEnd,
        period_start: input.periodStart,
        shift_count: employee.shiftCount,
        tenant_id: this.context.tenantId,
        unpaid_days: employee.unpaidDays,
        updated_by: this.context.userId,
        weekend_days: employee.weekendDays,
        worked_days: employee.workedDays,
        worked_hours: employee.workedHours,
      });

      for (const dayId of employee.attendanceDayIds) {
        await this.supabase
          .from("hr_attendance_days")
          .update({
            metadata: { exported_at: new Date().toISOString(), export_batch_id: batchId, payroll_ready: true },
            status: "exported_to_payroll",
            updated_by: this.context.userId,
          })
          .eq("tenant_id", this.context.tenantId)
          .eq("id", dayId);

        await this.supabase
          .from("hr_attendance_locks")
          .update({
            lock_level: "payroll_locked",
            metadata: { export_batch_id: batchId },
            payroll_export_ref: batchId,
            updated_by: this.context.userId,
          })
          .eq("tenant_id", this.context.tenantId)
          .eq("attendance_day_id", dayId);
      }
    }

    await this.queueBackgroundJob(ATTENDANCE_SNAPSHOT_JOB.key, { batchId }, `attendance-snapshot:${batchId}`);

    const lateEarlyRuntime = new HrLateEarlyRuntimeService(this.supabase, this.context);
    const exportedViolations = await lateEarlyRuntime.markViolationsExportedForPeriod({
      batchId,
      employeeIds: preview.employees.map((employee) => employee.employeeId),
      periodEnd: input.periodEnd,
      periodStart: input.periodStart,
    });

    await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .update({
        background_job_id: backgroundJobId,
        status: "completed",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", batchId);

    if (input.closingId) {
      await this.supabase
        .from("hr_attendance_closings")
        .update({
          exported_at: new Date().toISOString(),
          exported_by: this.context.userId,
          status: "exported",
          updated_by: this.context.userId,
        })
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.closingId);
    }

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportCompleted,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_attendance_payroll_export_batch",
      metadata: { employeeCount: preview.totalEmployees, exportedLateEarlyViolations: exportedViolations },
      module: "hr",
    });

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.snapshotCreated,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_attendance_payroll_snapshot",
      metadata: { employeeCount: preview.totalEmployees },
      module: "hr",
    });

    await this.writeNotification({
      body: `Exported attendance inputs for ${preview.totalEmployees} employees (${input.periodStart} to ${input.periodEnd}).`,
      eventKey: HR_ATTENDANCE_PAYROLL_EVENT_KEYS.attendanceExported,
      idempotencyKey: `attendance-exported:${batchId}`,
      severity: "info",
      title: "Attendance exported to payroll inputs",
    });

    return { batchId };
  }

  async reopenClosing(input: HrAttendanceReopenInput): Promise<void> {
    const closing = await this.getClosing(input.closingId);
    if (!["locked", "exported"].includes(String(closing.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only locked or exported closings can be reopened." });
    }

    const filters: HrAttendanceExportFilterInput = {
      branchId: closing.branch_id ? String(closing.branch_id) : undefined,
      departmentId: closing.department_id ? String(closing.department_id) : undefined,
      payrollGroupId: closing.payroll_group_id ? String(closing.payroll_group_id) : undefined,
      periodEnd: String(closing.period_end),
      periodStart: String(closing.period_start),
    };
    const employees = await this.resolveEmployeeIds(filters);

    for (const employee of employees) {
      const { data: days } = await this.supabase
        .from("hr_attendance_days")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", employee.employeeId)
        .gte("work_date", filters.periodStart)
        .lte("work_date", filters.periodEnd)
        .in("status", ["locked", "exported_to_payroll"])
        .is("deleted_at", null);

      for (const day of days ?? []) {
        const dayId = String(day.id);
        await this.supabase
          .from("hr_attendance_days")
          .update({
            metadata: { payroll_ready: false, reopen_reason: input.reason, reopened_at: new Date().toISOString() },
            status: "reopened",
            updated_by: this.context.userId,
          })
          .eq("tenant_id", this.context.tenantId)
          .eq("id", dayId);

        await this.supabase
          .from("hr_attendance_locks")
          .update({
            lock_level: "unlocked",
            locked_at: null,
            locked_by: null,
            metadata: { reopened_at: new Date().toISOString(), reopen_reason: input.reason },
            updated_by: this.context.userId,
          })
          .eq("tenant_id", this.context.tenantId)
          .eq("attendance_day_id", dayId);
      }
    }

    await this.supabase
      .from("hr_attendance_closings")
      .update({
        metadata: { payroll_warning: "Reopened attendance may invalidate prior payroll inputs. Payroll must consume new snapshots only." },
        reopen_reason: input.reason,
        reopened_at: new Date().toISOString(),
        reopened_by: this.context.userId,
        status: "reopened",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", input.closingId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.reopened,
      category: "data-access",
      context: this.context,
      entityId: input.closingId,
      entityType: "hr_attendance_closing",
      metadata: { payrollWarning: true, reason: input.reason },
      module: "hr",
    });

    await this.writeNotification({
      body: `Attendance reopened: ${input.reason}. Warning: payroll must not read live attendance; create a new export snapshot.`,
      eventKey: HR_ATTENDANCE_PAYROLL_EVENT_KEYS.attendanceReopened,
      idempotencyKey: `attendance-reopened:${input.closingId}:${Date.now()}`,
      severity: "warning",
      title: "Attendance reopened — payroll warning",
    });
  }

  async cancelExportBatch(batchId: string): Promise<void> {
    const batch = await this.getExportBatch(batchId);
    if (String(batch.status) === "cancelled") return;

    await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .update({
        cancelled_at: new Date().toISOString(),
        cancelled_by: this.context.userId,
        status: "cancelled",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", batchId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportCancelled,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_attendance_payroll_export_batch",
      module: "hr",
    });
  }

  async markExportDownloaded(batchId: string): Promise<void> {
    await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .update({
        downloaded_at: new Date().toISOString(),
        downloaded_by: this.context.userId,
        status: "downloaded",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", batchId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportDownloaded,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_attendance_payroll_export_batch",
      module: "hr",
    });
  }

  async reExportBatch(batchId: string): Promise<{ batchId: string }> {
    const batch = await this.getExportBatch(batchId);
    const filters = readMetadata(batch.filters) as HrAttendanceExportFilterInput;
    const result = await this.executeExport({
      ...filters,
      branchId: filters.branchId,
      closingId: batch.closing_id ? String(batch.closing_id) : undefined,
      confirmed: true,
      departmentId: filters.departmentId,
      employeeId: filters.employeeId,
      payrollGroupId: filters.payrollGroupId,
      periodEnd: String(batch.period_end),
      periodStart: String(batch.period_start),
    });

    await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .update({
        metadata: { re_exported_to: result.batchId },
        status: "re_exported",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", batchId);

    await recordAuditEvent({
      action: HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS.exportReExported,
      category: "data-access",
      context: this.context,
      entityId: batchId,
      entityType: "hr_attendance_payroll_export_batch",
      metadata: { newBatchId: result.batchId },
      module: "hr",
    });

    return result;
  }

  private async getClosing(closingId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_closings")
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", closingId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance closing not found." });
    return data;
  }

  private async getExportBatch(batchId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_payroll_export_batches")
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", batchId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Export batch not found." });
    return data;
  }
}
