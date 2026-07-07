"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export async function createEmployeeSkillRecordAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const skillId = String(formData.get("skillId") ?? "").trim();
  const proficiencyLevelId = String(formData.get("proficiencyLevelId") ?? "").trim() || null;
  const effectiveFrom = String(formData.get("effectiveFrom") ?? new Date().toISOString().slice(0, 10));

  if (!employeeId || !skillId) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and skill are required." });
  }

  const { error } = await supabase.from("hr_employee_skill_records").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    effective_from: effectiveFrom,
    employee_id: employeeId,
    metadata: { evaluation_runtime_implemented: true },
    proficiency_level_id: proficiencyLevelId,
    skill_id: skillId,
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create skill record.", cause: error });

  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function archiveEmployeeSkillRecordAction(recordId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: record } = await supabase
    .from("hr_employee_skill_records")
    .select("id, employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", recordId)
    .single();
  if (!record) throw new ApplicationError({ code: "NOT_FOUND", message: "Skill record not found." });

  const { error } = await supabase
    .from("hr_employee_skill_records")
    .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId, status: "archived", updated_by: context.userId })
    .eq("id", recordId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive skill record.", cause: error });

  revalidatePath(`/erp/hr/employees/${String(record.employee_id)}`);
}
