"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrTalentRuntimeService, type HrTalentProgramType } from "../../application/services/hr-talent-runtime.service";
import { HrPayrollEgyptService } from "../../application/services/hr-payroll-egypt.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function talentService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrTalentRuntimeService(supabase, context) };
}

export async function createVacancyAction(formData: FormData) {
  const { context, service } = await talentService();
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  await service.createVacancy({
    departmentId: String(formData.get("departmentId") ?? ""),
    jobId: String(formData.get("jobId") ?? ""),
    positionId: String(formData.get("positionId") ?? ""),
    vacancyReason: String(formData.get("vacancyReason") ?? "new_position"),
  });
  revalidatePath("/erp/hr/recruitment");
}

export async function createHiringRequestAction(formData: FormData) {
  const { context, service } = await talentService();
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  await service.createHiringRequest({
    justification: String(formData.get("justification") ?? ""),
    positionId: String(formData.get("positionId") ?? ""),
    requiredDate: String(formData.get("requiredDate") ?? new Date().toISOString().slice(0, 10)),
    vacancyId: String(formData.get("vacancyId") ?? "") || undefined,
  });
  revalidatePath("/erp/hr/recruitment");
}

export async function createTalentProgramAction(formData: FormData) {
  const { context, service } = await talentService();
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const programType = String(formData.get("programType") ?? "onboarding") as HrTalentProgramType;
  await service.createTalentProgram({
    code: String(formData.get("code") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    employeeId: String(formData.get("employeeId") ?? "") || undefined,
    endsOn: String(formData.get("endsOn") ?? "") || undefined,
    programType,
    startsOn: String(formData.get("startsOn") ?? "") || undefined,
    title: String(formData.get("title") ?? ""),
  });
  const pathMap: Record<HrTalentProgramType, string> = {
    onboarding: "/erp/hr/onboarding",
    performance: "/erp/hr/performance",
    succession: "/erp/hr/succession",
    training: "/erp/hr/training",
  };
  revalidatePath(pathMap[programType] ?? "/erp/hr/talent");
}

export async function addTalentProgramItemAction(formData: FormData) {
  const { context, service } = await talentService();
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  await service.addTalentProgramItem({
    dueDate: String(formData.get("dueDate") ?? "") || undefined,
    itemKey: String(formData.get("itemKey") ?? ""),
    programId: String(formData.get("programId") ?? ""),
    title: String(formData.get("title") ?? ""),
  });
  revalidatePath("/erp/hr/onboarding");
  revalidatePath("/erp/hr/training");
  revalidatePath("/erp/hr/performance");
  revalidatePath("/erp/hr/succession");
}

export async function completeTalentProgramItemAction(itemId: string) {
  const { context, service } = await talentService();
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  await service.completeTalentProgramItem(itemId);
  revalidatePath("/erp/hr/onboarding");
}

export async function ensureEgyptPayrollPackAction() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.payrollManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrPayrollEgyptService(supabase, context);
  await service.ensureEgyptLocalizationPack();
  revalidatePath("/erp/hr/payroll-readiness");
}
