import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

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

  async resolveEmployeeShiftWindow(employeeId: string, workDate: string): Promise<ShiftWindow | null> {
    const { data: schedule } = await this.supabase
      .from("hr_shift_schedules")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .lte("effective_from", workDate)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!schedule) return null;

    const dayOfWeek = new Date(`${workDate}T12:00:00.000Z`).getUTCDay();
    const { data: line } = await this.supabase
      .from("hr_shift_schedule_lines")
      .select("shift_version_id, is_rest_day")
      .eq("shift_schedule_id", schedule.id)
      .eq("day_of_week", dayOfWeek)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("week_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!line || line.is_rest_day || !line.shift_version_id) return null;

    const { data: version } = await this.supabase
      .from("hr_shift_versions")
      .select("id, start_time, end_time, shift_id, hr_shift_definitions!inner(code, name, shift_kind)")
      .eq("id", line.shift_version_id)
      .maybeSingle();
    if (!version) return null;

    const definition = version.hr_shift_definitions as unknown as { code: string; name: string; shift_kind: string };
    return {
      endTime: String(version.end_time).slice(0, 5),
      shiftCode: String(definition.code),
      shiftId: String(version.shift_id),
      shiftKind: String(definition.shift_kind),
      shiftName: String(definition.name),
      startTime: String(version.start_time).slice(0, 5),
    };
  }
}
