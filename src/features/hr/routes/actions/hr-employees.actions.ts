"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { hrAssignmentCreateSchema, hrAssignmentEndSchema, hrAssignmentUpdateSchema } from "../../application/schemas/hr-assignments.schema";
import { hrEmployeeWizardSchema } from "../../application/schemas/hr-employees.schema";
import { HrAssignmentConflictService } from "../../application/services/hr-assignment-conflicts.service";
import { HrAssignmentCacheService } from "../../application/services/hr-assignment-cache.service";
import {
  assertNoBlockingEmployeeValidationIssues,
  validateEmployeeUniqueness,
} from "../../application/services/hr-employee-validation.service";
import {
  validateEmployeeImportCsv,
  type HrEmployeeImportRow,
} from "../../application/services/hr-import.service";
import { HR_EMPLOYEE_EXPORT_COLUMNS } from "../../hr-production-readiness-foundation";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { formatHrDisplayLabel, readContactField } from "../../application/utils/hr-display";
import { HrAssignmentResolverService } from "../../application/services/hr-assignment-resolver.service";

async function createInitialAssignments(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  input: {
    departmentId: string;
    effectiveFrom: string;
    employeeId: string;
    employmentProfileId: string;
    managerEmployeeId?: string;
    positionId?: string;
  },
) {
  const base = {
    assignment_status: "active" as const,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    effective_from: input.effectiveFrom,
    employee_id: input.employeeId,
    employment_profile_id: input.employmentProfileId,
    tenant_id: context.tenantId,
    updated_by: context.userId,
  };

  const assignments = [
    {
      ...base,
      assignment_scope: "primary",
      assignment_type: "department",
      priority: 100,
      reference_entity_id: input.departmentId,
      reference_entity_type: "hr_org_units",
    },
  ];

  if (input.positionId) {
    assignments.push({
      ...base,
      assignment_scope: "primary",
      assignment_type: "position",
      priority: 100,
      reference_entity_id: input.positionId,
      reference_entity_type: "hr_positions",
    });
  }

  if (input.managerEmployeeId) {
    assignments.push({
      ...base,
      assignment_scope: "primary",
      assignment_type: "manager",
      priority: 100,
      reference_entity_id: input.managerEmployeeId,
      reference_entity_type: "hr_employees",
    });
  }

  const { error } = await supabase.from("hr_assignments").insert(assignments);
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create initial assignments.", cause: error });
  }
}

export async function createEmployeeWizardAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrEmployeeWizardSchema.parse({
    attendanceCode: formData.get("attendanceCode") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    branchId: formData.get("branchId") || undefined,
    contractNumber: formData.get("contractNumber") || undefined,
    contractStartsOn: formData.get("contractStartsOn") || undefined,
    contractType: formData.get("contractType") || undefined,
    departmentId: formData.get("departmentId"),
    effectiveFrom: formData.get("effectiveFrom"),
    email: formData.get("email") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    employeeNumber: formData.get("employeeNumber") || undefined,
    employmentType: formData.get("employmentType"),
    fullName: formData.get("fullName"),
    gender: formData.get("gender") || undefined,
    managerEmployeeId: formData.get("managerEmployeeId") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
    nationalId: formData.get("nationalId") || undefined,
    nationality: formData.get("nationality") || undefined,
    passportNumber: formData.get("passportNumber") || undefined,
    phone: formData.get("phone") || undefined,
    positionId: formData.get("positionId") || undefined,
    probationPeriodDays: formData.get("probationPeriodDays") || undefined,
    salaryPackageRef: formData.get("salaryPackageRef") || undefined,
    workLocationId: formData.get("workLocationId") || undefined,
  });

  const employeeNumber = parsed.employeeNumber;
  const uniquenessIssues = await validateEmployeeUniqueness(supabase, context, {
    attendanceCode: parsed.attendanceCode ?? null,
    employeeNumber,
    nationalId: parsed.nationalId ?? null,
  });
  assertNoBlockingEmployeeValidationIssues(uniquenessIssues);

  const { data: party, error: partyError } = await supabase
    .from("parties")
    .insert({
      created_by: context.userId,
      display_name: parsed.fullName,
      party_kind: "individual",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();

  if (partyError || !party) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employee party.", cause: partyError });
  }

  const { data: employee, error: employeeError } = await supabase
    .from("hr_employees")
    .insert({
      attendance_code: parsed.attendanceCode ?? null,
      birth_date: parsed.birthDate || null,
      branch_id: parsed.branchId ?? context.branchId,
      company_id: context.companyId,
      contact_info: {
        email: parsed.email || null,
        phone: parsed.phone || null,
      },
      created_by: context.userId,
      emergency_contact: {
        name: parsed.emergencyContactName || null,
        phone: parsed.emergencyContactPhone || null,
      },
      employee_number: employeeNumber,
      full_name: parsed.fullName,
      gender: parsed.gender || null,
      marital_status: parsed.maritalStatus || null,
      metadata: { created_via: "hr-employee-wizard" },
      national_id: parsed.nationalId || null,
      nationality: parsed.nationality || null,
      passport_number: parsed.passportNumber || null,
      party_id: party.id,
      status: "active",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employee.", cause: employeeError });
  }

  const { data: profile, error: profileError } = await supabase
    .from("hr_employment_profiles")
    .insert({
      branch_id: parsed.branchId ?? context.branchId,
      company_id: context.companyId,
      created_by: context.userId,
      department_id: parsed.departmentId,
      effective_from: parsed.effectiveFrom,
      employee_id: employee.id,
      employment_type: parsed.employmentType,
      metadata: { anchor_only: true, org_via_assignments: true },
      position_id: parsed.positionId || null,
      salary_package_ref: parsed.salaryPackageRef || null,
      status: "active",
      tenant_id: context.tenantId,
      updated_by: context.userId,
      work_location_id: parsed.workLocationId || null,
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employment profile.", cause: profileError });
  }

  await createInitialAssignments(supabase, context, {
    departmentId: parsed.departmentId,
    effectiveFrom: parsed.effectiveFrom,
    employeeId: String(employee.id),
    employmentProfileId: String(profile.id),
    managerEmployeeId: parsed.managerEmployeeId,
    positionId: parsed.positionId,
  });

  if (parsed.contractType && parsed.contractStartsOn) {
    const contractNumber = parsed.contractNumber?.trim().toUpperCase() || `CON-${employeeNumber}`;
    const { error: contractError } = await supabase.from("hr_contracts").insert({
      branch_id: parsed.branchId ?? context.branchId,
      company_id: context.companyId,
      contract_number: contractNumber,
      contract_type: parsed.contractType,
      created_by: context.userId,
      employee_id: employee.id,
      employment_profile_id: profile.id,
      metadata: { created_via: "hr-employee-wizard" },
      probation_period_days: parsed.probationPeriodDays ?? null,
      starts_on: parsed.contractStartsOn,
      status: "draft",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    });
    if (contractError) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create contract.", cause: contractError });
    }
  }

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: employee.id,
    event_type: "hired",
    metadata: { source: "hr-employee-wizard" },
    source_document_type: "hr_employee_wizard",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr");
  revalidatePath("/erp/hr/employees");
  return { employeeId: String(employee.id), success: true as const };
}

export async function createHrAssignmentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.assignmentsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrAssignmentCreateSchema.parse({
    assignmentScope: formData.get("assignmentScope") || "primary",
    assignmentType: formData.get("assignmentType"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo") || undefined,
    employeeId: formData.get("employeeId"),
    employmentProfileId: formData.get("employmentProfileId"),
    priority: formData.get("priority") || 100,
    reason: formData.get("reason") || undefined,
    referenceEntityId: formData.get("referenceEntityId"),
    referenceEntityType: formData.get("referenceEntityType"),
  });

  const conflictService = new HrAssignmentConflictService(supabase, context);
  const conflicts = await conflictService.detectConflicts(parsed);
  const blocking = conflicts.filter((conflict) => conflict.severity === "error");
  if (blocking.length > 0) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: blocking.map((conflict) => conflict.message).join(" "),
      details: { conflicts },
    });
  }

  const { error } = await supabase.from("hr_assignments").insert({
    assignment_scope: parsed.assignmentScope,
    assignment_status: "planned",
    assignment_type: parsed.assignmentType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    effective_from: parsed.effectiveFrom,
    effective_to: parsed.effectiveTo || null,
    employee_id: parsed.employeeId,
    employment_profile_id: parsed.employmentProfileId,
    metadata: { created_via: "hr-assignment-ui" },
    priority: parsed.priority,
    reason: parsed.reason || null,
    reference_entity_id: parsed.referenceEntityId,
    reference_entity_type: parsed.referenceEntityType,
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create assignment.", cause: error });
  }

  const cacheService = new HrAssignmentCacheService(supabase, context);
  await cacheService.rebuildEmploymentProfileCache(parsed.employeeId, parsed.effectiveFrom);

  revalidatePath("/erp/hr/assignments");
  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
}

export async function updateHrAssignmentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.assignmentsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrAssignmentUpdateSchema.parse({
    assignmentId: formData.get("assignmentId"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo") || undefined,
    priority: formData.get("priority") || 100,
    reason: formData.get("reason") || undefined,
  });

  const { data: assignment } = await supabase
    .from("hr_assignments")
    .select("id, employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", parsed.assignmentId)
    .single();
  if (!assignment) throw new ApplicationError({ code: "NOT_FOUND", message: "Assignment not found." });

  const { error } = await supabase
    .from("hr_assignments")
    .update({
      effective_from: parsed.effectiveFrom,
      effective_to: parsed.effectiveTo || null,
      priority: parsed.priority,
      reason: parsed.reason || null,
      updated_by: context.userId,
    })
    .eq("id", parsed.assignmentId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update assignment.", cause: error });

  const cacheService = new HrAssignmentCacheService(supabase, context);
  await cacheService.rebuildEmploymentProfileCache(String(assignment.employee_id), parsed.effectiveFrom);

  revalidatePath("/erp/hr/assignments");
  revalidatePath(`/erp/hr/employees/${String(assignment.employee_id)}`);
}

export async function endHrAssignmentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.assignmentsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrAssignmentEndSchema.parse({
    assignmentId: formData.get("assignmentId"),
    effectiveTo: formData.get("effectiveTo"),
    reason: formData.get("reason") || undefined,
  });

  const { data: assignment } = await supabase
    .from("hr_assignments")
    .select("id, employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", parsed.assignmentId)
    .single();
  if (!assignment) throw new ApplicationError({ code: "NOT_FOUND", message: "Assignment not found." });

  const { error } = await supabase
    .from("hr_assignments")
    .update({
      assignment_status: "ended",
      effective_to: parsed.effectiveTo,
      reason: parsed.reason || null,
      updated_by: context.userId,
    })
    .eq("id", parsed.assignmentId);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not end assignment.", cause: error });

  const cacheService = new HrAssignmentCacheService(supabase, context);
  await cacheService.rebuildEmploymentProfileCache(String(assignment.employee_id), parsed.effectiveTo);

  revalidatePath("/erp/hr/assignments");
  revalidatePath(`/erp/hr/employees/${String(assignment.employee_id)}`);
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function nextImportEmployeeNumber(index: number) {
  return `EMP-IMPORT-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(3, "0")}`.toUpperCase();
}

async function resolveDefaultDepartmentId(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
) {
  const { data } = await supabase
    .from("hr_org_units")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("name")
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function insertImportedEmployee(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  row: HrEmployeeImportRow,
  index: number,
  departmentId: string,
) {
  const employeeNumber = row.employeeNumber?.trim().toUpperCase() || nextImportEmployeeNumber(index);

  const { data: party, error: partyError } = await supabase
    .from("parties")
    .insert({
      created_by: context.userId,
      display_name: row.fullName,
      party_kind: "individual",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (partyError || !party) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employee party.", cause: partyError });
  }

  const { data: employee, error: employeeError } = await supabase
    .from("hr_employees")
    .insert({
      attendance_code: row.attendanceCode ?? null,
      birth_date: row.birthDate || null,
      branch_id: context.branchId,
      company_id: context.companyId,
      contact_info: {
        email: row.email || null,
        phone: row.phone || null,
      },
      created_by: context.userId,
      employee_number: employeeNumber,
      full_name: row.fullName,
      gender: row.gender || null,
      metadata: { created_via: "hr-employee-import", import_row: row.row },
      national_id: row.nationalId || null,
      party_id: party.id,
      status: "draft",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (employeeError || !employee) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employee.", cause: employeeError });
  }

  const effectiveFrom = new Date().toISOString().slice(0, 10);
  const { error: profileError } = await supabase.from("hr_employment_profiles").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    department_id: departmentId,
    effective_from: effectiveFrom,
    employee_id: employee.id,
    employment_type: "full-time",
    metadata: { anchor_only: true, created_via: "hr-employee-import", org_via_assignments: false },
    status: "draft",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (profileError) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create employment profile.", cause: profileError });
  }

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: employee.id,
    event_type: "hired",
    metadata: { import_row: row.row, source: "hr-employee-import" },
    source_document_type: "hr_employee_import",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  return String(employee.id);
}

export async function importEmployeesCsvAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const file = formData.get("file");
  const csvText = file instanceof File ? await file.text() : String(formData.get("csv") ?? "");
  if (!csvText.trim()) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "CSV file is required." });
  }

  const validation = await validateEmployeeImportCsv(supabase, context, csvText);
  if (validation.accepted.length === 0) {
    return {
      acceptedCount: 0,
      createdEmployeeIds: [] as string[],
      rejected: validation.rejected,
      success: false as const,
    };
  }

  const departmentId = await resolveDefaultDepartmentId(supabase, context);
  if (!departmentId) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "At least one department must exist before importing employees.",
    });
  }

  const createdEmployeeIds: string[] = [];
  for (let index = 0; index < validation.accepted.length; index += 1) {
    const employeeId = await insertImportedEmployee(supabase, context, validation.accepted[index]!, index, departmentId);
    createdEmployeeIds.push(employeeId);
  }

  revalidatePath("/erp/hr");
  revalidatePath("/erp/hr/employees");

  return {
    acceptedCount: createdEmployeeIds.length,
    createdEmployeeIds,
    rejected: validation.rejected,
    success: true as const,
  };
}

export async function bulkArchiveEmployeesAction(employeeIds: string[]) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Select at least one employee to archive." });
  }

  const archivedAt = new Date().toISOString();
  const { error } = await supabase
    .from("hr_employees")
    .update({
      deleted_at: archivedAt,
      deleted_by: context.userId,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .in("id", uniqueIds)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive selected employees.", cause: error });

  await supabase.from("hr_employee_timeline_events").insert(
    uniqueIds.map((employeeId) => ({
      branch_id: context.branchId,
      company_id: context.companyId,
      created_by: context.userId,
      employee_id: employeeId,
      event_type: "lifecycle_changed",
      metadata: { action: "archived", bulk: true },
      source_document_type: "hr_employee_archive",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })),
  );

  revalidatePath("/erp/hr/employees");
  for (const employeeId of uniqueIds) {
    revalidatePath(`/erp/hr/employees/${employeeId}`);
  }

  return { archivedCount: uniqueIds.length, success: true as const };
}

export async function bulkExportEmployeesAction(employeeIds: string[]): Promise<string> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Select at least one employee to export." });
  }

  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, employee_number, attendance_code, full_name, status, national_id, contact_info, branch_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .in("id", uniqueIds)
    .is("deleted_at", null)
    .order("full_name");
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not export selected employees.", cause: error });
  }

  const rows = data ?? [];
  const resolver = new HrAssignmentResolverService(supabase, context);
  const assignments = rows.length > 0 ? await resolver.resolveManyEmployeeAssignments(rows.map((row) => String(row.id))) : new Map();

  const contractStatusByEmployee = new Map<string, string>();
  if (rows.length > 0) {
    const contractsResult = await supabase
      .from("hr_contracts")
      .select("employee_id, status")
      .eq("tenant_id", context.tenantId)
      .in(
        "employee_id",
        rows.map((row) => row.id),
      )
      .is("deleted_at", null)
      .order("starts_on", { ascending: false });
    if (!contractsResult.error) {
      for (const contract of contractsResult.data ?? []) {
        const employeeId = String(contract.employee_id);
        if (!contractStatusByEmployee.has(employeeId)) {
          contractStatusByEmployee.set(employeeId, String(contract.status));
        }
      }
    }
  }

  const headers = HR_EMPLOYEE_EXPORT_COLUMNS.map((column) => column.label);
  const lines = [headers.join(",")];

  for (const row of rows) {
    const id = String(row.id);
    const assignment = assignments.get(id);
    const valuesByField: Record<string, string> = {
      attendanceCode: row.attendance_code ? String(row.attendance_code) : "",
      branchLabel: "",
      contractStatus: contractStatusByEmployee.get(id) ?? "",
      department: assignment?.department?.label ?? "",
      email: readContactField(row.contact_info, "email") ?? "",
      employeeNumber: formatHrDisplayLabel(row.employee_number, ""),
      employmentStatus: formatHrDisplayLabel(String(row.status), ""),
      fullName: formatHrDisplayLabel(row.full_name, ""),
      manager: assignment?.manager?.label ?? "",
      nationalId: row.national_id ? String(row.national_id) : "",
      phone: readContactField(row.contact_info, "phone") ?? "",
      position: assignment?.position?.label ?? "",
    };

    lines.push(
      HR_EMPLOYEE_EXPORT_COLUMNS.map((column) => csvEscape(valuesByField[column.field] ?? "")).join(","),
    );
  }

  return lines.join("\n");
}
