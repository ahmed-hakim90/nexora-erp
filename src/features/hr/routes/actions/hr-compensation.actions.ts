"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrCompensationComponentSchema,
  hrEmployeeBasicSalaryClearSchema,
  hrEmployeeBasicSalaryOverrideSchema,
  hrEmployeeSalaryAssignmentSchema,
  hrSalaryPackageLineArchiveSchema,
  hrSalaryPackageLineSchema,
  hrSalaryPackageLineUpdateSchema,
  hrSalaryPackageSchema,
} from "../../application/schemas/hr-compensation.schema";
import { HrEmployeeCompensationService } from "../../application/services/hr-employee-compensation.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function getCategoryId(supabase: ReturnType<typeof createRequestSupabaseClient>, categoryKey: string) {
  const { data } = await supabase.from("hr_compensation_categories").select("id").eq("category_key", categoryKey).maybeSingle();
  if (!data) throw new ApplicationError({ code: "VALIDATION_ERROR", message: `Compensation category ${categoryKey} not found.` });
  return String(data.id);
}

async function getOrCreateDefaultStructure(context: Awaited<ReturnType<typeof resolveBranchRequestContext>>, supabase: ReturnType<typeof createRequestSupabaseClient>) {
  const { data: existing } = await supabase
    .from("hr_compensation_structures")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("code", "STANDARD")
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return String(existing.id);

  const { data, error } = await supabase
    .from("hr_compensation_structures")
    .insert({
      code: "STANDARD",
      company_id: context.companyId,
      created_by: context.userId,
      name: "Standard Structure",
      status: "active",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create compensation structure.", cause: error });
  return String(data.id);
}

export async function createCompensationComponentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrCompensationComponentSchema.parse({
    categoryKey: formData.get("categoryKey") || "basic_salary",
    code: formData.get("code"),
    defaultAmount: formData.get("defaultAmount") || undefined,
    name: formData.get("name"),
  });

  const categoryId = await getCategoryId(supabase, parsed.categoryKey);
  const deductionCategories = new Set([
    "deduction",
    "loan",
    "advance",
    "insurance",
    "tax",
    "penalty",
    "employee_contribution",
  ]);
  const isDeduction = deductionCategories.has(parsed.categoryKey);
  const { data: component, error } = await supabase
    .from("hr_compensation_components")
    .insert({
      branch_id: context.branchId,
      category_id: categoryId,
      code: parsed.code,
      company_id: context.companyId,
      created_by: context.userId,
      name: parsed.name,
      status: "active",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (error || !component) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create compensation component.", cause: error });

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("hr_compensation_component_versions").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    component_id: component.id,
    created_by: context.userId,
    currency: "SAR",
    default_amount: parsed.defaultAmount ?? null,
    earning_or_deduction: isDeduction ? "deduction" : "earning",
    effective_from: today,
    fixed_or_formula: "fixed",
    included_in_gross_salary: !isDeduction,
    insurable: parsed.categoryKey === "basic_salary",
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
    version_no: 1,
  });

  revalidatePath("/erp/hr/compensation");
}

export async function archiveCompensationComponentAction(componentId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_compensation_components")
    .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId, status: "archived", updated_by: context.userId })
    .eq("tenant_id", context.tenantId)
    .eq("id", componentId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive component.", cause: error });
  revalidatePath("/erp/hr/compensation");
}

export async function createSalaryPackageAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.salaryPackagesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrSalaryPackageSchema.parse({
    code: formData.get("code"),
    effectiveFrom: formData.get("effectiveFrom"),
    name: formData.get("name"),
  });

  const structureId = await getOrCreateDefaultStructure(context, supabase);
  const { data: pkg, error } = await supabase
    .from("hr_salary_packages")
    .insert({
      branch_id: context.branchId,
      code: parsed.code,
      company_id: context.companyId,
      created_by: context.userId,
      name: parsed.name,
      status: "active",
      structure_id: structureId,
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (error || !pkg) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create salary package.", cause: error });

  await supabase.from("hr_salary_package_versions").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    effective_from: parsed.effectiveFrom,
    salary_package_id: pkg.id,
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
    version_no: 1,
  });

  revalidatePath("/erp/hr/compensation");
}

export async function archiveSalaryPackageAction(packageId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.salaryPackagesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_salary_packages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId, status: "archived", updated_by: context.userId })
    .eq("tenant_id", context.tenantId)
    .eq("id", packageId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive salary package.", cause: error });
  revalidatePath("/erp/hr/compensation");
}

export async function assignEmployeeSalaryPackageAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrEmployeeSalaryAssignmentSchema.parse({
    employeeId: formData.get("employeeId"),
    salaryPackageVersionId: formData.get("salaryPackageVersionId"),
  });

  const { data: profile } = await supabase
    .from("hr_employment_profiles")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("employee_id", parsed.employeeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!profile) throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee must have an active employment profile." });

  const compensationService = new HrEmployeeCompensationService(supabase, context);
  await compensationService.assertNoBasicSalaryConflictForPackageAssignment(parsed.employeeId, parsed.salaryPackageVersionId);

  const { error } = await supabase
    .from("hr_employment_profiles")
    .update({ salary_package_ref: parsed.salaryPackageVersionId, updated_by: context.userId })
    .eq("id", profile.id);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not assign salary package.", cause: error });

  revalidatePath("/erp/hr/compensation");
  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
}

async function assertSalaryPackageVersionScope(
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  salaryPackageVersionId: string,
) {
  const { data, error } = await supabase
    .from("hr_salary_package_versions")
    .select("id, effective_from")
    .eq("id", salaryPackageVersionId)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Salary package version not found." });
  }
  return { effectiveFrom: String(data.effective_from), id: String(data.id) };
}

async function assertComponentVersionScope(
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  componentVersionId: string,
) {
  const { data, error } = await supabase
    .from("hr_compensation_component_versions")
    .select("id")
    .eq("id", componentVersionId)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Compensation component version not found or inactive." });
  }
}

export async function createSalaryPackageLineAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.salaryPackagesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrSalaryPackageLineSchema.parse({
    amount: formData.get("amount"),
    componentVersionId: formData.get("componentVersionId"),
    salaryPackageVersionId: formData.get("salaryPackageVersionId"),
  });

  const packageVersion = await assertSalaryPackageVersionScope(context, supabase, parsed.salaryPackageVersionId);
  await assertComponentVersionScope(context, supabase, parsed.componentVersionId);

  const compensationService = new HrEmployeeCompensationService(supabase, context);
  await compensationService.assertNoBasicSalaryConflictForPackageLine(parsed.salaryPackageVersionId, parsed.componentVersionId);

  const { data: duplicate } = await supabase
    .from("hr_salary_package_lines")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("salary_package_version_id", parsed.salaryPackageVersionId)
    .eq("component_version_id", parsed.componentVersionId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (duplicate) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "This component is already included in the selected salary package version.",
    });
  }

  const { data: existingLines } = await supabase
    .from("hr_salary_package_lines")
    .select("display_order")
    .eq("tenant_id", context.tenantId)
    .eq("salary_package_version_id", parsed.salaryPackageVersionId)
    .is("deleted_at", null)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextDisplayOrder = Number(existingLines?.[0]?.display_order ?? 0) + 10;

  const { error } = await supabase.from("hr_salary_package_lines").insert({
    amount_override: parsed.amount,
    branch_id: context.branchId,
    company_id: context.companyId,
    component_version_id: parsed.componentVersionId,
    created_by: context.userId,
    display_order: nextDisplayOrder,
    effective_from: packageVersion.effectiveFrom,
    metadata: {
      foundation_only: false,
      runtime_evaluation_implemented: true,
    },
    requirement: "required",
    salary_package_version_id: parsed.salaryPackageVersionId,
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not add salary package line.", cause: error });
  }

  revalidatePath("/erp/hr/compensation");
}

export async function updateSalaryPackageLineAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.salaryPackagesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrSalaryPackageLineUpdateSchema.parse({
    amount: formData.get("amount"),
    lineId: formData.get("lineId"),
  });

  const { data: line, error: lineError } = await supabase
    .from("hr_salary_package_lines")
    .select("id")
    .eq("id", parsed.lineId)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (lineError || !line) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Salary package line not found." });
  }

  const { error } = await supabase
    .from("hr_salary_package_lines")
    .update({ amount_override: parsed.amount, updated_by: context.userId })
    .eq("id", parsed.lineId)
    .eq("tenant_id", context.tenantId);
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update salary package line.", cause: error });
  }

  revalidatePath("/erp/hr/compensation");
}

export async function archiveSalaryPackageLineAction(lineId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.salaryPackagesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_salary_package_lines")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", lineId);
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive salary package line.", cause: error });
  }

  revalidatePath("/erp/hr/compensation");
}

export async function upsertEmployeeBasicSalaryAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationOverridesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrEmployeeBasicSalaryOverrideSchema.parse({
    basicSalary: formData.get("basicSalary"),
    effectiveFrom: formData.get("effectiveFrom") || undefined,
    employeeId: formData.get("employeeId"),
    reason: formData.get("reason") || undefined,
  });

  const compensationService = new HrEmployeeCompensationService(supabase, context);
  if (parsed.basicSalary === null) {
    await compensationService.clearBasicSalaryOverride(parsed.employeeId);
  } else {
    await compensationService.upsertBasicSalaryOverride({
      basicSalary: parsed.basicSalary,
      effectiveFrom: parsed.effectiveFrom,
      employeeId: parsed.employeeId,
      reason: parsed.reason ?? null,
    });
  }

  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
  revalidatePath("/erp/hr/compensation");
}

export async function clearEmployeeBasicSalaryAction(employeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.compensationOverridesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrEmployeeBasicSalaryClearSchema.parse({ employeeId });
  const compensationService = new HrEmployeeCompensationService(supabase, context);
  await compensationService.clearBasicSalaryOverride(parsed.employeeId);

  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
  revalidatePath("/erp/hr/compensation");
}
