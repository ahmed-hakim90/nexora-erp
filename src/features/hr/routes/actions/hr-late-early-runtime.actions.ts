"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrLateEarlyPolicyAssignmentCreateSchema,
  hrLateEarlyPolicyCreateSchema,
  hrLateEarlyViolationApproveSchema,
  hrLateEarlyViolationCancelSchema,
  hrLateEarlyViolationOverrideSchema,
  hrLateEarlyViolationRejectSchema,
} from "../../application/schemas/hr-late-early-runtime.schema";
import { HrLateEarlyRuntimeService } from "../../application/services/hr-late-early-runtime.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

const LATE_EARLY_PATHS = [
  "/erp/hr/late-early",
  "/erp/hr/late-early/reports",
  "/erp/hr/attendance-processing",
  "/erp/hr/time-policies",
  "/erp/hr",
] as const;

function revalidateLateEarlyPaths() {
  for (const path of LATE_EARLY_PATHS) revalidatePath(path);
}

async function lateEarlyContext(permission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrLateEarlyRuntimeService(supabase, context) };
}

export async function createLateEarlyPolicyAction(formData: FormData) {
  const parsed = hrLateEarlyPolicyCreateSchema.parse({
    code: String(formData.get("code") ?? ""),
    dailyLimitMinutes: formData.get("dailyLimitMinutes") || undefined,
    deductionMethod: String(formData.get("deductionMethod") ?? "") || undefined,
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    effectiveTo: String(formData.get("effectiveTo") ?? "") || undefined,
    earlyLeaveThresholdMinutes: formData.get("earlyLeaveThresholdMinutes") || undefined,
    graceMinutes: formData.get("graceMinutes") || undefined,
    lateThresholdMinutes: formData.get("lateThresholdMinutes") || undefined,
    monthlyLimitMinutes: formData.get("monthlyLimitMinutes") || undefined,
    name: String(formData.get("name") ?? ""),
    weeklyLimitMinutes: formData.get("weeklyLimitMinutes") || undefined,
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.latePolicyManage);
  await service.createPolicy(parsed);
  revalidateLateEarlyPaths();
}

export async function createLateEarlyPolicyAssignmentAction(formData: FormData) {
  const parsed = hrLateEarlyPolicyAssignmentCreateSchema.parse({
    assignmentScope: String(formData.get("assignmentScope") ?? ""),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    effectiveTo: String(formData.get("effectiveTo") ?? "") || undefined,
    policyId: String(formData.get("policyId") ?? ""),
    referenceEntityId: String(formData.get("referenceEntityId") ?? "") || undefined,
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.latePolicyManage);
  await service.createPolicyAssignment(parsed);
  revalidateLateEarlyPaths();
}

export async function approveLateEarlyViolationAction(formData: FormData) {
  const parsed = hrLateEarlyViolationApproveSchema.parse({
    reason: String(formData.get("reason") ?? "") || undefined,
    violationId: String(formData.get("violationId") ?? ""),
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.lateApprove);
  await service.approveViolation(parsed.violationId, parsed.reason);
  revalidateLateEarlyPaths();
}

export async function rejectLateEarlyViolationAction(formData: FormData) {
  const parsed = hrLateEarlyViolationRejectSchema.parse({
    reason: String(formData.get("reason") ?? "Rejected"),
    violationId: String(formData.get("violationId") ?? ""),
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.lateApprove);
  await service.rejectViolation(parsed.violationId, parsed.reason);
  revalidateLateEarlyPaths();
}

export async function cancelLateEarlyViolationAction(formData: FormData) {
  const parsed = hrLateEarlyViolationCancelSchema.parse({
    reason: String(formData.get("reason") ?? "Cancelled"),
    violationId: String(formData.get("violationId") ?? ""),
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.lateManage);
  await service.cancelViolation(parsed.violationId, parsed.reason);
  revalidateLateEarlyPaths();
}

export async function overrideLateEarlyViolationAction(formData: FormData) {
  const parsed = hrLateEarlyViolationOverrideSchema.parse({
    deductionMinutes: formData.get("deductionMinutes"),
    earlyLeaveMinutes: formData.get("earlyLeaveMinutes"),
    lateMinutes: formData.get("lateMinutes"),
    reason: String(formData.get("reason") ?? ""),
    status: String(formData.get("status") ?? "") || undefined,
    violationId: String(formData.get("violationId") ?? ""),
  });
  const { service } = await lateEarlyContext(HR_PERMISSIONS.lateManage);
  await service.overrideViolation(parsed);
  revalidateLateEarlyPaths();
}
