"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrAttendanceDayApproveSchema,
  hrAttendanceMissingPunchSchema,
  hrAttendanceReviewActionSchema,
} from "../../application/schemas/hr-attendance-processing.schema";
import { HrAttendanceService } from "../../application/services/hr-attendance.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { resolveOvertimeCandidateAction } from "./hr-overtime-runtime.actions";

const ATTENDANCE_PATHS = ["/erp/hr/attendance-processing", "/erp/hr/attendance-leave", "/erp/hr/attendance-live", "/erp/hr/overtime"] as const;

function revalidateAttendancePaths() {
  for (const path of ATTENDANCE_PATHS) revalidatePath(path);
}

async function attendanceService(requiredPermission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: requiredPermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrAttendanceService(supabase, context) };
}

export async function recordAttendancePunchAction(formData: FormData) {
  const { service } = await attendanceService(HR_PERMISSIONS.leaveManage);

  await service.recordPunch({
    employeeId: String(formData.get("employeeId") ?? ""),
    punchTime: String(formData.get("punchTime") ?? "") || undefined,
    punchType: (String(formData.get("punchType") ?? "in") as "in" | "out"),
  });

  revalidateAttendancePaths();
}

export async function createAttendanceExceptionAction(formData: FormData) {
  const { service } = await attendanceService(HR_PERMISSIONS.leaveManage);

  await service.createAttendanceException({
    employeeId: String(formData.get("employeeId") ?? ""),
    exceptionType: String(formData.get("exceptionType") ?? "missing_punch_out"),
    notes: String(formData.get("notes") ?? "") || undefined,
    workDate: String(formData.get("workDate") ?? new Date().toISOString().slice(0, 10)),
  });

  revalidateAttendancePaths();
}

export async function resolveAttendanceExceptionAction(exceptionId: string) {
  const { service } = await attendanceService(HR_PERMISSIONS.leaveManage);
  await service.resolveAttendanceException(exceptionId);
  revalidateAttendancePaths();
}

export async function approveAttendanceReviewAction(formData: FormData) {
  const parsed = hrAttendanceReviewActionSchema.parse({
    exceptionId: String(formData.get("exceptionId") ?? "") || undefined,
    queueItemId: String(formData.get("queueItemId") ?? "") || undefined,
    reason: String(formData.get("reason") ?? "") || undefined,
  });

  const { service } = await attendanceService(HR_PERMISSIONS.attendanceReview);
  await service.approveReviewItem(parsed);
  revalidateAttendancePaths();
}

export async function dismissAttendanceReviewAction(formData: FormData) {
  const parsed = hrAttendanceReviewActionSchema.parse({
    exceptionId: String(formData.get("exceptionId") ?? "") || undefined,
    queueItemId: String(formData.get("queueItemId") ?? "") || undefined,
    reason: String(formData.get("reason") ?? "") || undefined,
  });

  const { service } = await attendanceService(HR_PERMISSIONS.attendanceReview);
  await service.dismissReviewItem(parsed);
  revalidateAttendancePaths();
}

export async function addMissingPunchAdjustmentAction(formData: FormData) {
  const parsed = hrAttendanceMissingPunchSchema.parse({
    employeeId: String(formData.get("employeeId") ?? ""),
    exceptionId: String(formData.get("exceptionId") ?? "") || undefined,
    punchTime: String(formData.get("punchTime") ?? ""),
    punchType: String(formData.get("punchType") ?? "in"),
    queueItemId: String(formData.get("queueItemId") ?? "") || undefined,
    reason: String(formData.get("reason") ?? "") || undefined,
    workDate: String(formData.get("workDate") ?? ""),
  });

  const { service } = await attendanceService(HR_PERMISSIONS.attendanceAdjust);
  await service.addMissingPunchAdjustment(parsed);
  revalidateAttendancePaths();
}

export async function approveAttendanceDayAction(attendanceDayId: string) {
  const parsed = hrAttendanceDayApproveSchema.parse({ attendanceDayId });
  const { service } = await attendanceService(HR_PERMISSIONS.attendanceReview);
  await service.approveAttendanceDay(parsed.attendanceDayId);
  revalidateAttendancePaths();
}

export { resolveOvertimeCandidateAction as resolveAttendanceOvertimeCandidateAction };
