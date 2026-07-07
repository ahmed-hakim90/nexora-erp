import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import type { HrAttendanceMissingPunchInput, HrAttendanceReviewActionInput } from "../schemas/hr-attendance-processing.schema";
import { LOCKED_ATTENDANCE_DAY_STATUSES } from "../constants/hr-attendance-payroll.constants";
import { STANDARD_WORK_MINUTES } from "../constants/hr-overtime-runtime.constants";
import { HrLateEarlyRuntimeService } from "./hr-late-early-runtime.service";
import { HrOvertimeRuntimeService } from "./hr-overtime-runtime.service";

const ATTENDANCE_PROCESSING_PATH = "/erp/hr/attendance-processing";

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function minutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

function mapExceptionToQueueItemType(exceptionType: string): string {
  switch (exceptionType) {
    case "missing_punch_in":
    case "missing_punch_out":
      return "missing_punch";
    case "overtime_requires_approval":
      return "overtime_approval_needed";
    case "holiday_work":
      return "holiday_work_approval_needed";
    case "device_mismatch":
      return "device_mismatch";
    case "profile_missing":
    case "schedule_missing":
      return "profile_schedule_mismatch";
    default:
      return "attendance_exception";
  }
}

function severityPriority(severity: string): number {
  switch (severity) {
    case "critical":
      return 10;
    case "high":
      return 25;
    case "medium":
      return 50;
    default:
      return 75;
  }
}

export class HrAttendanceService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  private async assertDayMutable(attendanceDayId: string): Promise<void> {
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

  private async getEmploymentProfileId(employeeId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("hr_employment_profiles")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active employment profile required for attendance." });
    return String(data.id);
  }

  private async getExceptionById(exceptionId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_exceptions")
      .select("id, employee_id, employment_profile_id, attendance_day_id, exception_type, severity, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", exceptionId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance exception not found." });
    return data;
  }

  private async getQueueItemById(queueItemId: string) {
    const { data, error } = await this.supabase
      .from("hr_attendance_review_queue")
      .select("id, employee_id, employment_profile_id, attendance_day_id, attendance_exception_id, item_type, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", queueItemId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Review queue item not found." });
    return data;
  }

  private async resolveLinkedQueueItems(exceptionId: string, status: "resolved" | "dismissed", reason?: string): Promise<void> {
    await this.supabase
      .from("hr_attendance_review_queue")
      .update({
        metadata: { resolution_reason: reason ?? null, resolved_at: new Date().toISOString(), runtime_implemented: true },
        status,
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_exception_id", exceptionId)
      .in("status", ["pending", "assigned", "in_review"]);
  }

  private async enqueueReviewQueueItem(input: {
    attendanceDayId: string;
    attendanceExceptionId: string;
    employeeId: string;
    employmentProfileId: string;
    exceptionType: string;
    severity?: string;
  }): Promise<void> {
    const { data: existing } = await this.supabase
      .from("hr_attendance_review_queue")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_exception_id", input.attendanceExceptionId)
      .in("status", ["pending", "assigned", "in_review"])
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) return;

    const { error } = await this.supabase.from("hr_attendance_review_queue").insert({
      attendance_day_id: input.attendanceDayId,
      attendance_exception_id: input.attendanceExceptionId,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: input.employeeId,
      employment_profile_id: input.employmentProfileId,
      item_type: mapExceptionToQueueItemType(input.exceptionType),
      metadata: { runtime_implemented: true, runtime_ui_implemented: true },
      priority: severityPriority(input.severity ?? "medium"),
      status: "pending",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not enqueue attendance review item.", cause: error });
  }

  private async markDayNeedsReview(attendanceDayId: string): Promise<void> {
    await this.supabase
      .from("hr_attendance_days")
      .update({ status: "needs_review", updated_by: this.context.userId })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", attendanceDayId)
      .in("status", ["pending", "observed"]);
  }

  private async refreshDayStatusAfterExceptionChange(attendanceDayId: string): Promise<void> {
    const { count } = await this.supabase
      .from("hr_attendance_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_day_id", attendanceDayId)
      .eq("status", "open")
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      await this.markDayNeedsReview(attendanceDayId);
      return;
    }

    const { data: day } = await this.supabase
      .from("hr_attendance_days")
      .select("status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", attendanceDayId)
      .maybeSingle();

    if (day && ["needs_review", "observed"].includes(String(day.status))) {
      await this.supabase
        .from("hr_attendance_days")
        .update({ status: "observed", updated_by: this.context.userId })
        .eq("tenant_id", this.context.tenantId)
        .eq("id", attendanceDayId);
    }
  }

  async syncOpenExceptionsToReviewQueue(): Promise<number> {
    const { data: openExceptions } = await this.supabase
      .from("hr_attendance_exceptions")
      .select("id, employee_id, employment_profile_id, attendance_day_id, exception_type, severity")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("status", "open")
      .is("deleted_at", null)
      .limit(100);

    let synced = 0;
    for (const row of openExceptions ?? []) {
      await this.enqueueReviewQueueItem({
        attendanceDayId: String(row.attendance_day_id),
        attendanceExceptionId: String(row.id),
        employeeId: String(row.employee_id),
        employmentProfileId: String(row.employment_profile_id),
        exceptionType: String(row.exception_type),
        severity: String(row.severity),
      });
      await this.markDayNeedsReview(String(row.attendance_day_id));
      synced += 1;
    }
    return synced;
  }

  async recordPunch(input: {
    employeeId: string;
    punchType: "in" | "out";
    punchTime?: string;
    source?: string;
  }): Promise<{ id: string }> {
    const employmentProfileId = await this.getEmploymentProfileId(input.employeeId);
    const punchTime = input.punchTime ?? new Date().toISOString();

    const { data, error } = await this.supabase
      .from("hr_attendance_punch_logs")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_id: input.employeeId,
        employment_profile_id: employmentProfileId,
        metadata: { runtime_implemented: true, source_path: ATTENDANCE_PROCESSING_PATH },
        punch_time: punchTime,
        punch_type: input.punchType,
        source: input.source ?? "manual_entry",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not record punch.", cause: error });

    await this.aggregateAttendanceDay(input.employeeId, employmentProfileId, punchTime.slice(0, 10));
    return { id: String(data.id) };
  }

  async aggregateAttendanceDay(employeeId: string, employmentProfileId: string, workDate: string): Promise<void> {
    const { data: punches } = await this.supabase
      .from("hr_attendance_punch_logs")
      .select("punch_type, punch_time")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .gte("punch_time", `${workDate}T00:00:00.000Z`)
      .lte("punch_time", `${workDate}T23:59:59.999Z`)
      .is("deleted_at", null)
      .order("punch_time");

    const inPunch = punches?.find((p) => p.punch_type === "in");
    const outPunch = [...(punches ?? [])].reverse().find((p) => p.punch_type === "out");
    const missingIn = !inPunch;
    const missingOut = Boolean(inPunch && !outPunch);
    const workedMinutes =
      inPunch?.punch_time && outPunch?.punch_time ? minutesBetween(String(inPunch.punch_time), String(outPunch.punch_time)) : 0;
    const overtimeMinutes = HrOvertimeRuntimeService.calculateOvertimeMinutes(workedMinutes, STANDARD_WORK_MINUTES);

    let status = "pending";
    if (inPunch && outPunch) status = "observed";
    else if (inPunch || outPunch) status = "needs_review";

    const { data: existing } = await this.supabase
      .from("hr_attendance_days")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("work_date", workDate)
      .maybeSingle();

    const payload = {
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      employee_id: employeeId,
      employment_profile_id: employmentProfileId,
      expected_vs_actual: {
        first_in_at: inPunch?.punch_time ?? null,
        last_out_at: outPunch?.punch_time ?? null,
        missing_in: missingIn,
        missing_out: missingOut,
        overtime_minutes: overtimeMinutes,
        runtime_calculation_implemented: true,
        worked_minutes: workedMinutes,
      },
      metadata: { aggregated_runtime: true },
      status,
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      work_date: workDate,
    };

    let attendanceDayId: string | null = existing ? String(existing.id) : null;

    if (existing) {
      await this.assertDayMutable(String(existing.id));
      const preservedStatus = ["approved", "locked", "exported_to_payroll", "rejected"].includes(String(existing.status))
        ? String(existing.status)
        : status;
      await this.supabase
        .from("hr_attendance_days")
        .update({ ...payload, status: preservedStatus })
        .eq("id", existing.id);
    } else {
      const { data: inserted } = await this.supabase
        .from("hr_attendance_days")
        .insert({ ...payload, created_by: this.context.userId })
        .select("id")
        .single();
      attendanceDayId = inserted ? String(inserted.id) : null;
    }

    if (overtimeMinutes > 0 && attendanceDayId) {
      const overtimeService = new HrOvertimeRuntimeService(this.supabase, this.context);
      await overtimeService.syncCandidateFromAttendance({
        attendanceDayId,
        employeeId,
        employmentProfileId,
        overtimeMinutes,
        workDate,
        workedMinutes,
      });
    }

    if (attendanceDayId) {
      const lateEarlyService = new HrLateEarlyRuntimeService(this.supabase, this.context);
      await lateEarlyService.evaluateAttendanceDay({
        attendanceDayId,
        employeeId,
        firstInAt: inPunch?.punch_time ? String(inPunch.punch_time) : null,
        lastOutAt: outPunch?.punch_time ? String(outPunch.punch_time) : null,
        missingIn,
        missingOut,
        workDate,
      });
    }
  }

  async createAttendanceException(input: {
    employeeId: string;
    workDate: string;
    exceptionType: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const employmentProfileId = await this.getEmploymentProfileId(input.employeeId);

    let { data: day } = await this.supabase
      .from("hr_attendance_days")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("work_date", input.workDate)
      .maybeSingle();

    if (!day) {
      await this.aggregateAttendanceDay(input.employeeId, employmentProfileId, input.workDate);
      const refreshed = await this.supabase
        .from("hr_attendance_days")
        .select("id")
        .eq("tenant_id", this.context.tenantId)
        .eq("employee_id", input.employeeId)
        .eq("work_date", input.workDate)
        .maybeSingle();
      day = refreshed.data;
    }
    if (!day) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance day not found for exception." });
    await this.assertDayMutable(String(day.id));

    const { data, error } = await this.supabase
      .from("hr_attendance_exceptions")
      .insert({
        attendance_day_id: day.id,
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        employee_id: input.employeeId,
        employment_profile_id: employmentProfileId,
        exception_type: input.exceptionType,
        metadata: { notes: input.notes ?? null, runtime_implemented: true },
        source: "manual_entry",
        status: "open",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id, severity")
      .single();
    if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create attendance exception.", cause: error });

    await this.markDayNeedsReview(String(day.id));
    await this.enqueueReviewQueueItem({
      attendanceDayId: String(day.id),
      attendanceExceptionId: String(data.id),
      employeeId: input.employeeId,
      employmentProfileId,
      exceptionType: input.exceptionType,
      severity: String(data.severity),
    });

    return { id: String(data.id) };
  }

  async resolveAttendanceException(exceptionId: string, reason?: string): Promise<void> {
    const exception = await this.getExceptionById(exceptionId);
    if (String(exception.status) !== "open") {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only open exceptions can be resolved." });
    }
    await this.assertDayMutable(String(exception.attendance_day_id));

    const { error } = await this.supabase
      .from("hr_attendance_exceptions")
      .update({
        metadata: { resolved_at: new Date().toISOString(), resolution_reason: reason ?? null },
        status: "resolved",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", exceptionId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resolve exception.", cause: error });

    await this.resolveLinkedQueueItems(exceptionId, "resolved", reason);
    await this.refreshDayStatusAfterExceptionChange(String(exception.attendance_day_id));
  }

  async dismissAttendanceException(exceptionId: string, reason?: string): Promise<void> {
    const exception = await this.getExceptionById(exceptionId);
    if (!["open", "in_review"].includes(String(exception.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Exception cannot be dismissed in its current state." });
    }
    await this.assertDayMutable(String(exception.attendance_day_id));

    const { error } = await this.supabase
      .from("hr_attendance_exceptions")
      .update({
        metadata: { dismissed_at: new Date().toISOString(), dismissed_reason: reason ?? null },
        status: "dismissed",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", exceptionId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not dismiss exception.", cause: error });

    await this.resolveLinkedQueueItems(exceptionId, "dismissed", reason);
    await this.refreshDayStatusAfterExceptionChange(String(exception.attendance_day_id));
  }

  async approveReviewItem(input: HrAttendanceReviewActionInput): Promise<void> {
    if (input.queueItemId) {
      const queueItem = await this.getQueueItemById(input.queueItemId);
      if (!["pending", "assigned", "in_review"].includes(String(queueItem.status))) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Review item is not pending approval." });
      }
      if (queueItem.attendance_exception_id) {
        await this.resolveAttendanceException(String(queueItem.attendance_exception_id), input.reason);
        return;
      }
      await this.supabase
        .from("hr_attendance_review_queue")
        .update({
          metadata: { approved_at: new Date().toISOString(), approval_reason: input.reason ?? null },
          status: "resolved",
          updated_by: this.context.userId,
        })
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.queueItemId);
      return;
    }

    if (input.exceptionId) {
      await this.resolveAttendanceException(input.exceptionId, input.reason);
    }
  }

  async dismissReviewItem(input: HrAttendanceReviewActionInput): Promise<void> {
    if (input.queueItemId) {
      const queueItem = await this.getQueueItemById(input.queueItemId);
      if (!["pending", "assigned", "in_review"].includes(String(queueItem.status))) {
        throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Review item cannot be dismissed in its current state." });
      }
      if (queueItem.attendance_exception_id) {
        await this.dismissAttendanceException(String(queueItem.attendance_exception_id), input.reason);
        return;
      }
      await this.supabase
        .from("hr_attendance_review_queue")
        .update({
          metadata: { dismissed_at: new Date().toISOString(), dismissed_reason: input.reason ?? null },
          status: "dismissed",
          updated_by: this.context.userId,
        })
        .eq("tenant_id", this.context.tenantId)
        .eq("id", input.queueItemId);
      return;
    }

    if (input.exceptionId) {
      await this.dismissAttendanceException(input.exceptionId, input.reason);
    }
  }

  async addMissingPunchAdjustment(input: HrAttendanceMissingPunchInput): Promise<void> {
    const punchTime = input.punchTime.includes("T") ? input.punchTime : `${input.workDate}T${input.punchTime}:00.000Z`;
    const employmentProfileId = await this.getEmploymentProfileId(input.employeeId);

    const { data: existingDay } = await this.supabase
      .from("hr_attendance_days")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("work_date", input.workDate)
      .maybeSingle();
    if (existingDay) await this.assertDayMutable(String(existingDay.id));

    const punch = await this.recordPunch({
      employeeId: input.employeeId,
      punchTime,
      punchType: input.punchType,
      source: "admin_correction",
    });

    const { data: day } = await this.supabase
      .from("hr_attendance_days")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("work_date", input.workDate)
      .maybeSingle();

    if (!day) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance day not found after punch correction." });

    const { error: adjustmentError } = await this.supabase.from("hr_attendance_adjustment_refs").insert({
      adjustment_type: "add_punch",
      attendance_day_id: day.id,
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      employee_id: input.employeeId,
      employment_profile_id: employmentProfileId,
      metadata: { reason: input.reason ?? null, runtime_implemented: true },
      punch_log_ref: punch.id,
      reason: input.reason ?? "Missing punch correction",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
    });
    if (adjustmentError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not record attendance adjustment.", cause: adjustmentError });
    }

    if (input.exceptionId) {
      await this.resolveAttendanceException(input.exceptionId, input.reason);
    } else if (input.queueItemId) {
      const queueItem = await this.getQueueItemById(input.queueItemId);
      if (queueItem.attendance_exception_id) {
        await this.resolveAttendanceException(String(queueItem.attendance_exception_id), input.reason);
      } else {
        await this.supabase
          .from("hr_attendance_review_queue")
          .update({ status: "resolved", updated_by: this.context.userId })
          .eq("tenant_id", this.context.tenantId)
          .eq("id", input.queueItemId);
      }
    }
  }

  async approveAttendanceDay(attendanceDayId: string): Promise<void> {
    const { data: day, error: dayError } = await this.supabase
      .from("hr_attendance_days")
      .select("id, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("id", attendanceDayId)
      .is("deleted_at", null)
      .maybeSingle();
    if (dayError || !day) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance day not found." });
    await this.assertDayMutable(attendanceDayId);

    if (!["observed", "needs_review", "pending", "ready_for_payroll", "reopened"].includes(String(day.status))) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Attendance day cannot be approved in its current state." });
    }

    const { count } = await this.supabase
      .from("hr_attendance_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("attendance_day_id", attendanceDayId)
      .eq("status", "open")
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Resolve open exceptions before approving the attendance day." });
    }

    const { error } = await this.supabase
      .from("hr_attendance_days")
      .update({
        metadata: { approved_at: new Date().toISOString(), payroll_ready: true },
        status: "approved",
        updated_by: this.context.userId,
      })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", attendanceDayId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not approve attendance day.", cause: error });
  }
}

export function readAttendanceDayMetrics(expectedVsActual: unknown) {
  const metadata = readMetadata(expectedVsActual);
  const firstInAt = metadata.first_in_at ? String(metadata.first_in_at) : metadata.actualFirstIn ? String(metadata.actualFirstIn) : null;
  const lastOutAt = metadata.last_out_at ? String(metadata.last_out_at) : metadata.actualLastOut ? String(metadata.actualLastOut) : null;
  const workedMinutes = Number(metadata.worked_minutes ?? metadata.workedMinutes ?? 0) ||
    (firstInAt && lastOutAt ? minutesBetween(firstInAt, lastOutAt) : 0);

  return {
    firstInAt,
    lastOutAt,
    lateMinutes: Number(metadata.late_minutes ?? metadata.lateMinutes ?? 0),
    missingIn: Boolean(metadata.missing_in ?? metadata.missingIn),
    missingOut: Boolean(metadata.missing_out ?? metadata.missingOut),
    overtimeMinutes: Number(metadata.overtime_minutes ?? metadata.overtimeMinutes ?? 0),
    workedMinutes,
  };
}
