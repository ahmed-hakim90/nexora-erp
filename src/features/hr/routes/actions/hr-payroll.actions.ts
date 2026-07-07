"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrPayrollService } from "../../application/services/hr-payroll.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function payrollService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrPayrollService(supabase, context) };
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

export async function resetSeededPayrollSetupAction() {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.resetSeededPayrollSetup();
  revalidatePath("/erp/hr/payroll-readiness");
  revalidatePath("/erp/hr/settings");
}

export async function ensureDefaultPayrollSetupAction() {
  const { context, service } = await payrollService();
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  await service.ensureDefaultSetup();
  revalidatePath("/erp/hr/payroll-readiness");
  revalidatePath("/erp/hr/settings");
}
