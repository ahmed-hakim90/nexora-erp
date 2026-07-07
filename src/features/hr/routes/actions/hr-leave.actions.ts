"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { hrLeaveBalanceAdjustSchema, hrLeaveCreateSchema, hrLeavePolicyCreateSchema, hrLeavePolicyStatusSchema } from "../../application/schemas/hr-leave.schema";
import { DEFAULT_LEAVE_TYPE_SEEDS } from "../../application/constants/hr-leave-runtime.constants";
import { HrLeaveService } from "../../application/services/hr-leave.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function leaveService() {
  return resolveBranchRequestContext("erp").then(async (context) => {
    const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
    return { context, service: new HrLeaveService(supabase, context) };
  });
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

export async function ensureDefaultLeaveTypesAction() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { count } = await supabase
    .from("hr_leave_types")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) return;

  const defaults = DEFAULT_LEAVE_TYPE_SEEDS.map((item) => ({
    code: item.code,
    impacts_payroll: item.paid,
    name: item.name,
    paid: item.paid,
    requires_approval: true,
  }));

  for (const item of defaults) {
    const { error } = await supabase.from("hr_leave_types").insert({
      code: item.code,
      company_id: context.companyId,
      created_by: context.userId,
      impacts_payroll: item.paid,
      name: item.name,
      paid: item.paid,
      requires_approval: item.requires_approval,
      status: "active",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not seed leave types.", cause: error });
  }

  revalidatePath("/erp/hr/attendance-leave");
  revalidatePath("/erp/hr/settings");
}
