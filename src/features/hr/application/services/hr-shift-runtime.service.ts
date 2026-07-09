import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

import { HrShiftResolutionService } from "./hr-shift-resolution.service";

export type ShiftWindow = Readonly<{
  endTime: string;
  shiftCode: string;
  shiftId: string;
  shiftKind: string;
  shiftName: string;
  startTime: string;
}>;

export class HrShiftRuntimeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async createShiftDefinition(input: {
    code: string;
    name: string;
    shiftKind: string;
    startTime: string;
    endTime: string;
    crossesMidnight?: boolean;
  }) {
    const { data: shift, error: shiftError } = await this.supabase
      .from("hr_shift_definitions")
      .insert({
        branch_id: this.context.branchId,
        code: input.code.toUpperCase(),
        company_id: this.context.companyId,
        created_by: this.context.userId,
        metadata: { shift_runtime_implemented: true },
        name: input.name,
        shift_kind: input.shiftKind,
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (shiftError || !shift) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift.", cause: shiftError });
    }

    const [startH, startM] = input.startTime.split(":").map(Number);
    const [endH, endM] = input.endTime.split(":").map(Number);
    const plannedHours = Math.max(0, ((endH * 60 + (endM ?? 0)) - (startH * 60 + (startM ?? 0))) / 60);

    const { error: versionError } = await this.supabase.from("hr_shift_versions").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      crosses_midnight: Boolean(input.crossesMidnight),
      effective_from: new Date().toISOString().slice(0, 10),
      end_time: input.endTime,
      metadata: { shift_runtime_implemented: true },
      shift_id: shift.id,
      start_time: input.startTime,
      status: "active",
      tenant_id: this.context.tenantId,
      total_planned_hours: plannedHours,
      updated_by: this.context.userId,
      version_no: 1,
    });
    if (versionError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift version.", cause: versionError });
    }

    return { id: String(shift.id) };
  }

  async assignEmployeeShiftSchedule(input: {
    employeeId: string;
    employmentProfileId: string;
    shiftId: string;
    effectiveFrom: string;
    weekIndex?: number;
    dayOfWeek: number;
  }) {
    const { data: schedule, error: scheduleError } = await this.supabase
      .from("hr_shift_schedules")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: input.effectiveFrom,
        employee_id: input.employeeId,
        employment_profile_id: input.employmentProfileId,
        metadata: { shift_runtime_implemented: true },
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (scheduleError || !schedule) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift schedule.", cause: scheduleError });
    }

    const { data: version } = await this.supabase
      .from("hr_shift_versions")
      .select("id")
      .eq("shift_id", input.shiftId)
      .eq("tenant_id", this.context.tenantId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: lineError } = await this.supabase.from("hr_shift_schedule_lines").insert({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      day_of_week: input.dayOfWeek,
      effective_from: input.effectiveFrom,
      is_rest_day: false,
      metadata: { shift_runtime_implemented: true },
      shift_schedule_id: schedule.id,
      shift_version_id: version?.id ?? null,
      status: "active",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      week_index: input.weekIndex ?? 0,
    });
    if (lineError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift schedule line.", cause: lineError });
    }

    return { scheduleId: String(schedule.id) };
  }

  /** Sunday (0) through Thursday (4) — common working-week pattern in MENA operations. */
  static readonly DEFAULT_WORKING_WEEK_DAYS = [0, 1, 2, 3, 4] as const;

  async assignShiftWorkingWeekPattern(input: {
    dayOfWeek?: number;
    effectiveFrom: string;
    employeeId: string;
    employmentProfileId: string;
    applyWorkingDays?: boolean;
    shiftId: string;
    weekIndex?: number;
  }): Promise<{ scheduleId: string }> {
    const { data: schedule, error: scheduleError } = await this.supabase
      .from("hr_shift_schedules")
      .insert({
        branch_id: this.context.branchId,
        company_id: this.context.companyId,
        created_by: this.context.userId,
        effective_from: input.effectiveFrom,
        employee_id: input.employeeId,
        employment_profile_id: input.employmentProfileId,
        metadata: { shift_runtime_implemented: true, working_week_pattern: Boolean(input.applyWorkingDays !== false) },
        status: "active",
        tenant_id: this.context.tenantId,
        updated_by: this.context.userId,
      })
      .select("id")
      .single();
    if (scheduleError || !schedule) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift schedule.", cause: scheduleError });
    }

    const { data: version } = await this.supabase
      .from("hr_shift_versions")
      .select("id")
      .eq("shift_id", input.shiftId)
      .eq("tenant_id", this.context.tenantId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const days =
      input.applyWorkingDays === false && input.dayOfWeek !== undefined
        ? [input.dayOfWeek]
        : [...HrShiftRuntimeService.DEFAULT_WORKING_WEEK_DAYS];

    const lines = days.map((dayOfWeek) => ({
      branch_id: this.context.branchId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      day_of_week: dayOfWeek,
      effective_from: input.effectiveFrom,
      is_rest_day: false,
      metadata: { shift_runtime_implemented: true },
      shift_schedule_id: schedule.id,
      shift_version_id: version?.id ?? null,
      status: "active",
      tenant_id: this.context.tenantId,
      updated_by: this.context.userId,
      week_index: input.weekIndex ?? 0,
    }));

    const { error: lineError } = await this.supabase.from("hr_shift_schedule_lines").insert(lines);
    if (lineError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create shift schedule lines.", cause: lineError });
    }

    return { scheduleId: String(schedule.id) };
  }

  async resolveEmployeeShiftWindow(employeeId: string, workDate: string): Promise<ShiftWindow | null> {
    const shiftResolver = new HrShiftResolutionService(this.supabase, this.context);
    const resolved = await shiftResolver.resolveEmployeeShiftWindow({ employeeId, workDate });
    if (resolved.source === "policy_default" && !resolved.shiftId) return null;

    return {
      endTime: resolved.shiftEnd.slice(0, 5),
      shiftCode: resolved.shiftCode ?? "DEFAULT",
      shiftId: resolved.shiftId ?? "",
      shiftKind: resolved.isRestDay ? "rest" : "regular",
      shiftName: resolved.shiftName ?? "Resolved Shift",
      startTime: resolved.shiftStart.slice(0, 5),
    };
  }
}
