"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrLeaveBalanceAdjustSchema,
  hrLeaveCreateSchema,
  hrLeavePolicyCreateSchema,
  hrLeavePolicyStatusSchema,
  hrLeavePolicyUpdateSchema,
  hrLeaveTypeArchiveSchema,
  hrLeaveTypeCreateSchema,
  hrLeaveTypeUpdateSchema,
} from "../../application/schemas/hr-leave.schema";
import { HrLeaveService } from "../../application/services/hr-leave.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function leaveService() {
  return resolveBranchRequestContext("erp").then(async (context) => {
    const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
    return { context, service: new HrLeaveService(supabase, context) };
  });
}

function revalidateLeaveSettings() {
  revalidatePath("/erp/hr/settings");
  revalidatePath("/erp/hr/attendance-leave");
  revalidatePath("/erp/hr/leave");
}

export async function createLeaveRequestAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeaveCreateSchema.parse({
    employeeId: formData.get("employeeId"),
    endsOn: formData.get("endsOn"),
    leaveTypeId: formData.get("leaveTypeId"),
    notes: formData.get("notes") || undefined,
    startsOn: formData.get("startsOn"),
  });

  const { id } = await service.createLeaveRequest(parsed);
  await service.submitLeaveRequest(id);

  revalidatePath("/erp/hr/attendance-leave");
  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
}

export async function approveLeaveRequestAction(leaveRequestId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveApprove });
  await service.approveLeaveRequest(leaveRequestId);
  revalidatePath("/erp/hr/attendance-leave");
  revalidatePath("/portal/manager/approvals");
}

export async function rejectLeaveRequestAction(leaveRequestId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveApprove });
  await service.rejectLeaveRequest(leaveRequestId);
  revalidatePath("/erp/hr/attendance-leave");
  revalidatePath("/portal/manager/approvals");
}

export async function cancelLeaveRequestAction(leaveRequestId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });
  await service.cancelLeaveRequest(leaveRequestId);
  revalidatePath("/erp/hr/attendance-leave");
}

export async function adjustLeaveBalanceAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeaveBalanceAdjustSchema.parse({
    availableQuantity: formData.get("availableQuantity"),
    balanceId: formData.get("balanceId"),
  });

  await service.adjustLeaveBalance(parsed.balanceId, parsed.availableQuantity);
  revalidatePath("/erp/hr/attendance-leave");
}

export async function createLeaveTypeAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeaveTypeCreateSchema.parse({
    code: formData.get("code"),
    impactsPayroll: formData.get("impactsPayroll") ?? undefined,
    name: formData.get("name"),
    paid: formData.get("paid") ?? undefined,
    requiresApproval: formData.get("requiresApproval") ?? undefined,
    status: formData.get("status") || "active",
  });

  await service.createLeaveType(parsed);
  revalidateLeaveSettings();
}

export async function updateLeaveTypeAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeaveTypeUpdateSchema.parse({
    code: formData.get("code"),
    impactsPayroll: formData.get("impactsPayroll") ?? undefined,
    leaveTypeId: formData.get("leaveTypeId"),
    name: formData.get("name"),
    paid: formData.get("paid") ?? undefined,
    requiresApproval: formData.get("requiresApproval") ?? undefined,
    status: formData.get("status") || "active",
  });

  await service.updateLeaveType(parsed);
  revalidateLeaveSettings();
}

export async function archiveLeaveTypeAction(leaveTypeId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });
  hrLeaveTypeArchiveSchema.parse({ leaveTypeId });
  await service.archiveLeaveType(leaveTypeId);
  revalidateLeaveSettings();
}

export async function createLeavePolicyAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeavePolicyCreateSchema.parse({
    annualEntitlement: formData.get("annualEntitlement"),
    carryForwardAllowed: formData.get("carryForwardAllowed") ?? undefined,
    entitlementUnit: formData.get("entitlementUnit") ?? "days",
    leaveTypeId: formData.get("leaveTypeId"),
  });

  await service.createLeavePolicy(parsed);
  revalidatePath("/erp/hr/settings");
}

export async function updateLeavePolicyAction(formData: FormData) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });

  const parsed = hrLeavePolicyUpdateSchema.parse({
    annualEntitlement: formData.get("annualEntitlement"),
    carryForwardAllowed: formData.get("carryForwardAllowed") ?? undefined,
    entitlementUnit: formData.get("entitlementUnit") ?? "days",
    policyId: formData.get("policyId"),
  });

  await service.updateLeavePolicy(parsed);
  revalidatePath("/erp/hr/settings");
}

export async function activateLeavePolicyAction(policyId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });
  hrLeavePolicyStatusSchema.parse({ policyId });
  await service.activateLeavePolicy(policyId);
  revalidatePath("/erp/hr/settings");
}

export async function archiveLeavePolicyAction(policyId: string) {
  const { context, service } = await leaveService();
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });
  hrLeavePolicyStatusSchema.parse({ policyId });
  await service.archiveLeavePolicy(policyId);
  revalidatePath("/erp/hr/settings");
}
