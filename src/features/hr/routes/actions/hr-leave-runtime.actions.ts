"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrLeaveCarryForwardExecuteSchema,
  hrLeaveCarryForwardPreviewSchema,
  hrLeaveEncashmentActionSchema,
  hrLeaveEncashmentCreateSchema,
  hrLeaveHolidayCreateSchema,
  hrLeaveReturnSchema,
  hrLeaveWithdrawSchema,
} from "../../application/schemas/hr-leave-runtime.schema";
import { HrLeaveService } from "../../application/services/hr-leave.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

const LEAVE_PATHS = ["/erp/hr/attendance-leave", "/erp/hr/leave", "/erp/hr/leave/reports", "/erp/hr"] as const;

function revalidateLeavePaths() {
  for (const path of LEAVE_PATHS) revalidatePath(path);
}

async function leaveContext(permission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrLeaveService(supabase, context) };
}

export async function previewCarryForwardAction(formData: FormData) {
  const parsed = hrLeaveCarryForwardPreviewSchema.parse({
    scope: String(formData.get("scope") ?? "company_closing"),
    sourcePeriodEnd: String(formData.get("sourcePeriodEnd") ?? ""),
    targetPeriodStart: String(formData.get("targetPeriodStart") ?? ""),
  });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveCarryForward);
  await service.getRuntimeService().previewCarryForward(parsed);
  revalidateLeavePaths();
}

export async function executeCarryForwardAction(formData: FormData) {
  const parsed = hrLeaveCarryForwardExecuteSchema.parse({
    runId: String(formData.get("runId") ?? ""),
    scope: String(formData.get("scope") ?? "company_closing"),
    sourcePeriodEnd: String(formData.get("sourcePeriodEnd") ?? ""),
    targetPeriodStart: String(formData.get("targetPeriodStart") ?? ""),
  });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveCarryForward);
  await service.getRuntimeService().executeCarryForward(parsed.runId);
  revalidateLeavePaths();
}

export async function createEncashmentAction(formData: FormData) {
  const parsed = hrLeaveEncashmentCreateSchema.parse({
    employeeId: String(formData.get("employeeId") ?? ""),
    encashmentKind: String(formData.get("encashmentKind") ?? "partial"),
    leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
    maxPercentage: formData.get("maxPercentage") || undefined,
    requestedQuantity: formData.get("requestedQuantity"),
  });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveEncashment);
  await service.getRuntimeService().createEncashment(parsed);
  revalidateLeavePaths();
}

export async function approveEncashmentAction(formData: FormData) {
  const parsed = hrLeaveEncashmentActionSchema.parse({ encashmentId: String(formData.get("encashmentId") ?? "") });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveEncashment);
  await service.getRuntimeService().approveEncashment(parsed.encashmentId);
  revalidateLeavePaths();
}

export async function withdrawLeaveRequestAction(formData: FormData) {
  const parsed = hrLeaveWithdrawSchema.parse({
    leaveRequestId: String(formData.get("leaveRequestId") ?? ""),
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveManage);
  await service.withdrawLeaveRequest(parsed.leaveRequestId, parsed.reason);
  revalidateLeavePaths();
}

export async function returnLeaveRequestAction(formData: FormData) {
  const parsed = hrLeaveReturnSchema.parse({
    leaveRequestId: String(formData.get("leaveRequestId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  const { service } = await leaveContext(HR_PERMISSIONS.leaveApprove);
  await service.returnLeaveRequest(parsed.leaveRequestId, parsed.reason);
  revalidateLeavePaths();
}

export async function createHolidayAction(formData: FormData) {
  const parsed = hrLeaveHolidayCreateSchema.parse({
    holidayCalendarId: String(formData.get("holidayCalendarId") ?? ""),
    holidayDate: String(formData.get("holidayDate") ?? ""),
    holidayType: String(formData.get("holidayType") ?? "company"),
    name: String(formData.get("name") ?? ""),
  });
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.leaveCalendarManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  await supabase.from("hr_holidays").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    effective_from: parsed.holidayDate,
    holiday_calendar_id: parsed.holidayCalendarId,
    holiday_date: parsed.holidayDate,
    holiday_type: parsed.holidayType,
    metadata: { runtime_implemented: true },
    name: parsed.name,
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  revalidateLeavePaths();
}

export async function recalculateLeaveBalancesAction(employeeId: string) {
  const { service } = await leaveContext(HR_PERMISSIONS.leaveManage);
  await service.recalculateEmployeeBalances(employeeId);
  revalidateLeavePaths();
}
