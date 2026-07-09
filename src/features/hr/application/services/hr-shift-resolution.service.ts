import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchRequestContext } from "@/platform/auth/server";

import {
  DEFAULT_SHIFT_END,
  DEFAULT_SHIFT_START,
  type LateEarlyPolicyRules,
} from "../constants/hr-late-early-runtime.constants";
import { HrAssignmentResolverService } from "./hr-assignment-resolver.service";

export type ResolvedShiftWindow = Readonly<{
  isRestDay: boolean;
  shiftCode: string | null;
  shiftDurationMinutes: number;
  shiftEnd: string;
  shiftId: string | null;
  shiftName: string | null;
  shiftStart: string;
  shiftVersionId: string | null;
  source: "schedule" | "policy_default";
}>;

function normalizeTime(value: string): string {
  const parts = value.split(":");
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
  return value;
}

function minutesBetweenTimes(start: string, end: string): number {
  const [sh, sm] = normalizeTime(start).split(":").map(Number);
  const [eh, em] = normalizeTime(end).split(":").map(Number);
  let minutes = eh * 60 + (em ?? 0) - (sh * 60 + (sm ?? 0));
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

function policyDefaultWindow(policyRules?: LateEarlyPolicyRules): ResolvedShiftWindow {
  const shiftStart = normalizeTime(policyRules?.expectedShiftStart ?? DEFAULT_SHIFT_START);
  const shiftEnd = normalizeTime(policyRules?.expectedShiftEnd ?? DEFAULT_SHIFT_END);
  return {
    isRestDay: false,
    shiftCode: null,
    shiftDurationMinutes: minutesBetweenTimes(shiftStart, shiftEnd),
    shiftEnd,
    shiftId: null,
    shiftName: null,
    shiftStart,
    shiftVersionId: null,
    source: "policy_default",
  };
}

export class HrShiftResolutionService {
  private readonly assignmentResolver: HrAssignmentResolverService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {
    this.assignmentResolver = new HrAssignmentResolverService(supabase, context);
  }

  /** Canonical shift resolution for attendance, late/early, and overtime engines. */
  async resolveEmployeeShiftWindow(input: {
    employeeId: string;
    policyRules?: LateEarlyPolicyRules;
    workDate: string;
  }): Promise<ResolvedShiftWindow> {
    const assignments = await this.assignmentResolver.resolveEmployeeAssignments(input.employeeId, input.workDate);
    const scheduleIds = new Set<string>();

    if (assignments.shift?.referenceEntityId) {
      scheduleIds.add(assignments.shift.referenceEntityId);
    }

    const { data: directSchedules } = await this.supabase
      .from("hr_shift_schedules")
      .select("id")
      .eq("tenant_id", this.context.tenantId)
      .eq("employee_id", input.employeeId)
      .eq("status", "active")
      .lte("effective_from", input.workDate)
      .or(`effective_to.is.null,effective_to.gte.${input.workDate}`)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(3);

    for (const row of directSchedules ?? []) scheduleIds.add(String(row.id));

    const dayOfWeek = new Date(`${input.workDate}T12:00:00.000Z`).getUTCDay();

    for (const scheduleId of scheduleIds) {
      const { data: line } = await this.supabase
        .from("hr_shift_schedule_lines")
        .select("shift_version_id, is_rest_day")
        .eq("tenant_id", this.context.tenantId)
        .eq("shift_schedule_id", scheduleId)
        .eq("day_of_week", dayOfWeek)
        .lte("effective_from", input.workDate)
        .or(`effective_to.is.null,effective_to.gte.${input.workDate}`)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("week_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!line) continue;
      if (line.is_rest_day) {
        return {
          ...policyDefaultWindow(input.policyRules),
          isRestDay: true,
          shiftDurationMinutes: 0,
          source: "schedule",
        };
      }
      if (!line.shift_version_id) continue;

      const { data: version } = await this.supabase
        .from("hr_shift_versions")
        .select("id, start_time, end_time, shift_id, hr_shift_definitions!inner(code, name)")
        .eq("tenant_id", this.context.tenantId)
        .eq("id", line.shift_version_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!version?.start_time || !version?.end_time) continue;

      const definition = version.hr_shift_definitions as unknown as { code: string; name: string };
      const shiftStart = normalizeTime(String(version.start_time));
      const shiftEnd = normalizeTime(String(version.end_time));

      return {
        isRestDay: false,
        shiftCode: String(definition.code),
        shiftDurationMinutes: minutesBetweenTimes(shiftStart, shiftEnd),
        shiftEnd,
        shiftId: String(version.shift_id),
        shiftName: String(definition.name),
        shiftStart,
        shiftVersionId: String(version.id),
        source: "schedule",
      };
    }

    return policyDefaultWindow(input.policyRules);
  }
}
