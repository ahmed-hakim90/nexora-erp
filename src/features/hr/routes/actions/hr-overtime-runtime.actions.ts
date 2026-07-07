"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrOvertimeApproveSchema,
  hrOvertimeCancelSchema,
  hrOvertimeCandidateActionSchema,
  hrOvertimeCreateSchema,
  hrOvertimePolicyCreateSchema,
  hrOvertimeRejectSchema,
  hrOvertimeReturnSchema,
  hrOvertimeSubmitSchema,
  hrOvertimeWithdrawSchema,
} from "../../application/schemas/hr-overtime-runtime.schema";
import { HrOvertimeRuntimeService } from "../../application/services/hr-overtime-runtime.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

const OVERTIME_PATHS = [
  "/erp/hr/overtime",
  "/erp/hr/overtime/reports",
  "/erp/hr/attendance-processing",
  "/erp/hr/attendance-leave",
  "/erp/hr",
] as const;

function revalidateOvertimePaths() {
  for (const path of OVERTIME_PATHS) revalidatePath(path);
}

async function overtimeContext(permission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrOvertimeRuntimeService(supabase, context) };
}

export async function createOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeCreateSchema.parse({
    attachmentRef: String(formData.get("attachmentRef") ?? "") || undefined,
    attendanceDayId: String(formData.get("attendanceDayId") ?? "") || undefined,
    compensationType: String(formData.get("compensationType") ?? "pay"),
    costCenter: String(formData.get("costCenter") ?? "") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    employeeId: String(formData.get("employeeId") ?? ""),
    endTime: String(formData.get("endTime") ?? "") || undefined,
    hours: formData.get("hours") || undefined,
    overtimeType: String(formData.get("overtimeType") ?? "normal"),
    payrollEligible: formData.get("payrollEligible") ?? true,
    priority: formData.get("priority") || undefined,
    projectRef: String(formData.get("projectRef") ?? "") || undefined,
    rateMultiplier: formData.get("rateMultiplier") || undefined,
    reason: String(formData.get("reason") ?? ""),
    shiftId: String(formData.get("shiftId") ?? "") || undefined,
    startTime: String(formData.get("startTime") ?? "") || undefined,
    workDate: String(formData.get("workDate") ?? ""),
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeRequest);
  await service.createRequest(parsed, true);
  revalidateOvertimePaths();
}

export async function submitOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeSubmitSchema.parse({ overtimeRequestId: String(formData.get("overtimeRequestId") ?? "") });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeRequest);
  await service.submitRequest(parsed.overtimeRequestId);
  revalidateOvertimePaths();
}

export async function approveOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeApproveSchema.parse({
    overtimeRequestId: String(formData.get("overtimeRequestId") ?? formData.get("requestId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeApprove);
  await service.approveRequest(parsed.overtimeRequestId, parsed.reason);
  revalidateOvertimePaths();
}

export async function rejectOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeRejectSchema.parse({
    overtimeRequestId: String(formData.get("overtimeRequestId") ?? formData.get("requestId") ?? ""),
    reason: String(formData.get("reason") ?? "Rejected"),
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeApprove);
  await service.rejectRequest(parsed.overtimeRequestId, parsed.reason);
  revalidateOvertimePaths();
}

export async function cancelOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeCancelSchema.parse({
    overtimeRequestId: String(formData.get("overtimeRequestId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeManage);
  await service.cancelRequest(parsed.overtimeRequestId, parsed.reason);
  revalidateOvertimePaths();
}

export async function withdrawOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeWithdrawSchema.parse({
    overtimeRequestId: String(formData.get("overtimeRequestId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeRequest);
  await service.withdrawRequest(parsed.overtimeRequestId, parsed.reason);
  revalidateOvertimePaths();
}

export async function returnOvertimeRequestAction(formData: FormData) {
  const parsed = hrOvertimeReturnSchema.parse({
    overtimeRequestId: String(formData.get("overtimeRequestId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeApprove);
  await service.returnRequest(parsed.overtimeRequestId, parsed.reason);
  revalidateOvertimePaths();
}

export async function resolveOvertimeCandidateAction(formData: FormData) {
  const parsed = hrOvertimeCandidateActionSchema.parse({
    action: String(formData.get("action") ?? ""),
    candidateId: String(formData.get("candidateId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeApprove);
  await service.resolveOvertimeCandidate(parsed);
  revalidateOvertimePaths();
}

export async function createOvertimePolicyAction(formData: FormData) {
  const parsed = hrOvertimePolicyCreateSchema.parse({
    code: String(formData.get("code") ?? ""),
    dailyLimitMinutes: formData.get("dailyLimitMinutes") || undefined,
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    effectiveTo: String(formData.get("effectiveTo") ?? "") || undefined,
    monthlyLimitMinutes: formData.get("monthlyLimitMinutes") || undefined,
    name: String(formData.get("name") ?? ""),
    overtimeType: String(formData.get("overtimeType") ?? "normal"),
    rateMultiplier: formData.get("rateMultiplier") || undefined,
    weeklyLimitMinutes: formData.get("weeklyLimitMinutes") || undefined,
  });
  const { service } = await overtimeContext(HR_PERMISSIONS.overtimeManage);
  await service.createPolicy(parsed);
  revalidateOvertimePaths();
}
