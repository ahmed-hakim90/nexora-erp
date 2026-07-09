"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrPayrollCalendarArchiveSchema,
  hrPayrollCalendarCreateSchema,
  hrPayrollCalendarUpdateSchema,
  hrPayrollGroupArchiveSchema,
  hrPayrollGroupCreateSchema,
  hrPayrollGroupUpdateSchema,
  hrPayrollPeriodArchiveSchema,
  hrPayrollPeriodCreateSchema,
  hrPayrollPeriodUpdateSchema,
} from "../../application/schemas/hr-payroll-setup.schema";
import { HrPayrollPeriodLifecycleService } from "../../application/services/hr-payroll-period-lifecycle.service";
import { HrPayrollService } from "../../application/services/hr-payroll.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function payrollService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrPayrollService(supabase, context) };
}

async function periodLifecycleService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrPayrollPeriodLifecycleService(supabase, context) };
}

function revalidatePayrollSettings() {
  revalidatePath("/erp/hr/settings");
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function createPayrollRunAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });

  const result = await service.createPayrollRun({
    payrollGroupId: String(formData.get("payrollGroupId") ?? ""),
    payrollPeriodId: String(formData.get("payrollPeriodId") ?? ""),
  });

  revalidatePath("/erp/hr/payroll-readiness");
  void result;
}

export async function validatePayrollRunAction(payrollRunId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.validatePayrollRun(payrollRunId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function calculatePayrollRunAction(payrollRunId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.calculatePayrollRun(payrollRunId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function approvePayrollRunAction(payrollRunId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.approvePayrollRun(payrollRunId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function publishPayslipsAction(payrollRunId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payslipsPublish });
  await requirePermission({ context, permission: HR_PERMISSIONS.payslipsManage });
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollBatchesManage });
  await service.publishPayslips(payrollRunId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function deletePayrollRunAction(payrollRunId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.deletePayrollRun(payrollRunId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function validatePayrollPeriodAction(payrollPeriodId: string) {
  const { context, service } = await periodLifecycleService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollValidate });
  await service.validatePeriodForPayroll(payrollPeriodId);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function lockPayrollPeriodAction(formData: FormData) {
  const { context, service } = await periodLifecycleService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollLock });
  const payrollPeriodId = String(formData.get("payrollPeriodId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  await service.lockPeriod(payrollPeriodId, reason);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function closePayrollPeriodAction(formData: FormData) {
  const { context, service } = await periodLifecycleService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollClose });
  const payrollPeriodId = String(formData.get("payrollPeriodId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  await service.closePeriod(payrollPeriodId, reason);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function reopenPayrollPeriodAction(formData: FormData) {
  const { context, service } = await periodLifecycleService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollReopen });
  const payrollPeriodId = String(formData.get("payrollPeriodId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("Reopen reason is required.");
  }
  await service.reopenPeriod(payrollPeriodId, reason);
  revalidatePath("/erp/hr/payroll-readiness");
}

export async function createPayrollCalendarAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollCalendarCreateSchema.parse({
    code: formData.get("code"),
    effectiveFrom: formData.get("effectiveFrom"),
    frequency: formData.get("frequency"),
    name: formData.get("name"),
    status: formData.get("status") || "active",
  });
  await service.createPayrollCalendar(parsed);
  revalidatePayrollSettings();
}

export async function updatePayrollCalendarAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollCalendarUpdateSchema.parse({
    calendarId: formData.get("calendarId"),
    code: formData.get("code"),
    effectiveFrom: formData.get("effectiveFrom"),
    frequency: formData.get("frequency"),
    name: formData.get("name"),
    status: formData.get("status") || "active",
  });
  await service.updatePayrollCalendar(parsed);
  revalidatePayrollSettings();
}

export async function archivePayrollCalendarAction(calendarId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  hrPayrollCalendarArchiveSchema.parse({ calendarId });
  await service.archivePayrollCalendar(calendarId);
  revalidatePayrollSettings();
}

export async function createPayrollGroupAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollGroupCreateSchema.parse({
    code: formData.get("code"),
    name: formData.get("name"),
    payrollCalendarId: formData.get("payrollCalendarId"),
    payrollPolicyVersionId: formData.get("payrollPolicyVersionId"),
    status: formData.get("status") || "active",
  });
  await service.createPayrollGroup(parsed);
  revalidatePayrollSettings();
}

export async function updatePayrollGroupAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollGroupUpdateSchema.parse({
    code: formData.get("code"),
    groupId: formData.get("groupId"),
    name: formData.get("name"),
    payrollCalendarId: formData.get("payrollCalendarId"),
    payrollPolicyVersionId: formData.get("payrollPolicyVersionId"),
    status: formData.get("status") || "active",
  });
  await service.updatePayrollGroup(parsed);
  revalidatePayrollSettings();
}

export async function archivePayrollGroupAction(groupId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  hrPayrollGroupArchiveSchema.parse({ groupId });
  await service.archivePayrollGroup(groupId);
  revalidatePayrollSettings();
}

export async function createPayrollPeriodAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollPeriodCreateSchema.parse({
    endDate: formData.get("endDate"),
    paymentDate: formData.get("paymentDate") || undefined,
    payrollCalendarId: formData.get("payrollCalendarId"),
    periodCode: formData.get("periodCode"),
    periodName: formData.get("periodName"),
    startDate: formData.get("startDate"),
  });
  await service.createPayrollPeriod(parsed);
  revalidatePayrollSettings();
}

export async function updatePayrollPeriodAction(formData: FormData) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const parsed = hrPayrollPeriodUpdateSchema.parse({
    endDate: formData.get("endDate"),
    paymentDate: formData.get("paymentDate") || undefined,
    payrollCalendarId: formData.get("payrollCalendarId"),
    periodCode: formData.get("periodCode"),
    periodId: formData.get("periodId"),
    periodName: formData.get("periodName"),
    startDate: formData.get("startDate"),
  });
  await service.updatePayrollPeriod(parsed);
  revalidatePayrollSettings();
}

export async function archivePayrollPeriodAction(periodId: string) {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  hrPayrollPeriodArchiveSchema.parse({ periodId });
  await service.archivePayrollPeriod(periodId);
  revalidatePayrollSettings();
}
