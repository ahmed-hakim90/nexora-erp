"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HR_REQUEST_TYPES } from "../../application/constants/hr-operational.constants";
import { HrFileAttachmentService } from "../../application/services/hr-file-attachment.service";
import { HrAssignmentCacheService } from "../../application/services/hr-assignment-cache.service";
import { runHrExpiryNotificationScan } from "../../application/services/hr-notification-runtime.service";
import { hrEmployeeQuickEditSchema } from "../../application/schemas/hr-employees.schema";
import {
  assertNoBlockingEmployeeValidationIssues,
  validateEmployeeUniqueness,
} from "../../application/services/hr-employee-validation.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function resolveEmploymentProfileId(
  supabase: ReturnType<typeof createRequestSupabaseClient>,
  context: Awaited<ReturnType<typeof resolveBranchRequestContext>>,
  employeeId: string,
) {
  const { data, error } = await supabase
    .from("hr_employment_profiles")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("employee_id", employeeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Active employment profile was not found for this employee." });
  }
  return String(data.id);
}

function nextDocumentNumber(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export async function createHrEmployeeDocumentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "");
  const documentType = String(formData.get("documentType") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const expiryDate = String(formData.get("expiryDate") ?? "") || null;
  const file = formData.get("file");

  if (!employeeId || !documentType) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and document type are required." });
  }

  const fileService = new HrFileAttachmentService(supabase, context);

  if (file instanceof File && file.size > 0) {
    await fileService.uploadEmployeeDocument({ documentType, employeeId, expiryDate, file });
  } else if (fileName) {
    const storagePath = `hr/documents/${context.companyId}/${employeeId}/${Date.now()}-${fileName.replace(/\s+/g, "-").toLowerCase()}`;
    const { error } = await supabase.from("file_attachments").insert({
      attachment_kind: "document",
      created_by: context.userId,
      entity_id: employeeId,
      entity_type: "hr_employee_document",
      file_name: fileName,
      metadata: {
        document_type: documentType,
        expiry_date: expiryDate,
        status: "active",
        title: fileName,
      },
      mime_type: "application/octet-stream",
      module_key: "hr",
      size_bytes: 1,
      storage_path: storagePath,
      storage_version: 1,
      tenant_id: context.tenantId,
      updated_by: context.userId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not register employee document.", cause: error });
  } else {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "File or document title is required." });
  }

  revalidatePath("/erp/hr/documents");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function archiveHrEmployeeDocumentAction(documentId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { error } = await supabase
    .from("file_attachments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("id", documentId)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive document.", cause: error });
  revalidatePath("/erp/hr/documents");
}

export async function updateEmployeeQuickEditAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrEmployeeQuickEditSchema.parse({
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    attendanceCode: formData.get("attendanceCode") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    city: formData.get("city") || undefined,
    email: formData.get("email") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    employeeId: formData.get("employeeId"),
    employeeNumber: formData.get("employeeNumber"),
    fullName: formData.get("fullName"),
    gender: formData.get("gender") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
    nationalId: formData.get("nationalId") || undefined,
    nationality: formData.get("nationality") || undefined,
    passportNumber: formData.get("passportNumber") || undefined,
    phone: formData.get("phone") || undefined,
  });

  const uniquenessIssues = await validateEmployeeUniqueness(supabase, context, {
    attendanceCode: parsed.attendanceCode ?? null,
    employeeId: parsed.employeeId,
    employeeNumber: parsed.employeeNumber ?? null,
    nationalId: parsed.nationalId ?? null,
  });
  assertNoBlockingEmployeeValidationIssues(uniquenessIssues);

  const { data: existing, error: readError } = await supabase
    .from("hr_employees")
    .select("metadata, contact_info, emergency_contact")
    .eq("tenant_id", context.tenantId)
    .eq("id", parsed.employeeId)
    .single();
  if (readError || !existing) throw new ApplicationError({ code: "NOT_FOUND", message: "Employee was not found.", cause: readError });

  const metadata = typeof existing.metadata === "object" && existing.metadata && !Array.isArray(existing.metadata) ? { ...(existing.metadata as Record<string, unknown>) } : {};
  metadata.address_line1 = parsed.addressLine1 ?? null;
  metadata.address_line2 = parsed.addressLine2 ?? null;
  metadata.city = parsed.city ?? null;

  const { error } = await supabase
    .from("hr_employees")
    .update({
      attendance_code: parsed.attendanceCode ?? null,
      birth_date: parsed.birthDate || null,
      contact_info: {
        ...(typeof existing.contact_info === "object" && existing.contact_info && !Array.isArray(existing.contact_info) ? existing.contact_info : {}),
        email: parsed.email || null,
        phone: parsed.phone || null,
      },
      emergency_contact: {
        name: parsed.emergencyContactName || null,
        phone: parsed.emergencyContactPhone || null,
      },
      employee_number: parsed.employeeNumber,
      full_name: parsed.fullName,
      gender: parsed.gender || null,
      marital_status: parsed.maritalStatus || null,
      metadata,
      national_id: parsed.nationalId || null,
      nationality: parsed.nationality || null,
      passport_number: parsed.passportNumber || null,
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", parsed.employeeId)
    .is("deleted_at", null);

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update employee.", cause: error });

  revalidatePath("/erp/hr/employees");
  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
}

export async function createHrRequestAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.actionsSubmit });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "");
  const requestKey = String(formData.get("requestType") ?? "");
  const effectiveDate = String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10));
  const notes = String(formData.get("notes") ?? "") || null;
  const requestType = HR_REQUEST_TYPES.find((item) => `${item.actionType}:${"metadataType" in item ? item.metadataType ?? "" : ""}` === requestKey || item.actionType === requestKey);
  if (!employeeId || !requestType) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee and request type are required." });
  }

  const employmentProfileId = await resolveEmploymentProfileId(supabase, context, employeeId);
  const { error } = await supabase.from("hr_action_documents").insert({
    action_type: requestType.actionType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    document_number: nextDocumentNumber("HRQ"),
    effective_date: effectiveDate,
    employee_id: employeeId,
    employment_profile_id: employmentProfileId,
    metadata: {
      notes,
      request_label: requestType.label,
      request_type: "metadataType" in requestType && requestType.metadataType ? requestType.metadataType : requestType.actionType,
    },
    requested_by: context.userId,
    status: "draft",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create HR request.", cause: error });
  revalidatePath("/erp/hr/requests");
}

export async function transitionHrRequestAction(documentId: string, action: "submit" | "approve" | "reject" | "return" | "cancel") {
  const context = await resolveBranchRequestContext("erp");
  const permission =
    action === "submit"
      ? HR_PERMISSIONS.actionsSubmit
      : action === "approve"
        ? HR_PERMISSIONS.actionsApprove
        : HR_PERMISSIONS.actionsManage;
  await requirePermission({ context, permission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const statusMap = {
    approve: "approved",
    cancel: "cancelled",
    reject: "rejected",
    return: "draft",
    submit: "submitted",
  } as const;

  const { error } = await supabase
    .from("hr_action_documents")
    .update({ status: statusMap[action], updated_by: context.userId })
    .eq("tenant_id", context.tenantId)
    .eq("id", documentId)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update HR request.", cause: error });
  revalidatePath("/erp/hr/requests");
}

export async function createHrCustodyAssignmentAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.actionsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const employeeId = String(formData.get("employeeId") ?? "");
  const assetType = String(formData.get("assetType") ?? "");
  const assetLabel = String(formData.get("assetLabel") ?? "").trim();
  const effectiveDate = String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10));
  const notes = String(formData.get("notes") ?? "") || null;
  if (!employeeId || !assetType || !assetLabel) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee, asset type, and asset label are required." });
  }

  const employmentProfileId = await resolveEmploymentProfileId(supabase, context, employeeId);
  const { error } = await supabase.from("hr_action_documents").insert({
    action_type: "custody_assignment",
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    document_number: nextDocumentNumber("CUST"),
    effective_date: effectiveDate,
    employee_id: employeeId,
    employment_profile_id: employmentProfileId,
    metadata: { asset_label: assetLabel, asset_type: assetType, condition: "good", notes },
    requested_by: context.userId,
    status: "applied",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not assign custody.", cause: error });
  revalidatePath("/erp/hr/custody");
}

export async function transitionHrCustodyAction(documentId: string, action: "return" | "transfer" | "damaged" | "lost", formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.actionsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const reason = String(formData.get("reason") ?? "").trim();
  if ((action === "damaged" || action === "lost") && !reason) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Reason is required for damaged or lost custody events." });
  }

  const { data: source, error: readError } = await supabase
    .from("hr_action_documents")
    .select("employee_id, employment_profile_id, metadata")
    .eq("tenant_id", context.tenantId)
    .eq("id", documentId)
    .single();
  if (readError || !source) throw new ApplicationError({ code: "NOT_FOUND", message: "Custody record was not found.", cause: readError });

  const metadata = typeof source.metadata === "object" && source.metadata && !Array.isArray(source.metadata) ? (source.metadata as Record<string, unknown>) : {};
  const actionType = action === "return" ? "custody_return" : "custody_assignment";
  const { error } = await supabase.from("hr_action_documents").insert({
    action_type: actionType,
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    document_number: nextDocumentNumber("CUST"),
    effective_date: new Date().toISOString().slice(0, 10),
    employee_id: source.employee_id,
    employment_profile_id: source.employment_profile_id,
    metadata: {
      ...metadata,
      custody_event: action,
      previous_document_id: documentId,
      reason: reason || null,
    },
    requested_by: context.userId,
    status: "applied",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not record custody lifecycle event.", cause: error });
  revalidatePath("/erp/hr/custody");
}

export async function createHrContractAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { hrContractCreateSchema } = await import("../../application/schemas/hr-compensation.schema");
  const parsed = hrContractCreateSchema.parse({
    contractNumber: formData.get("contractNumber"),
    contractType: formData.get("contractType"),
    employeeId: formData.get("employeeId"),
    endsOn: formData.get("endsOn") || undefined,
    startsOn: formData.get("startsOn"),
  });

  const employmentProfileId = await resolveEmploymentProfileId(supabase, context, parsed.employeeId);

  const { error } = await supabase.from("hr_contracts").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    contract_number: parsed.contractNumber,
    contract_type: parsed.contractType,
    created_by: context.userId,
    employee_id: parsed.employeeId,
    employment_profile_id: employmentProfileId,
    ends_on: parsed.endsOn || null,
    starts_on: parsed.startsOn,
    status: "active",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create contract.", cause: error });

  revalidatePath("/erp/hr/contracts");
  revalidatePath(`/erp/hr/employees/${parsed.employeeId}`);
}

export async function transitionHrContractAction(contractId: string, action: "renew" | "amend" | "suspend" | "resume" | "terminate", formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.contractsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: contract, error: readError } = await supabase
    .from("hr_contracts")
    .select("id, employee_id, employment_profile_id, contract_number, contract_type, starts_on, ends_on, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", contractId)
    .single();
  if (readError || !contract) throw new ApplicationError({ code: "NOT_FOUND", message: "Contract was not found.", cause: readError });

  const reason = String(formData.get("reason") ?? "") || null;
  const effectiveDate = String(formData.get("effectiveDate") ?? new Date().toISOString().slice(0, 10));
  const endsOn = String(formData.get("endsOn") ?? "") || null;

  if (action === "terminate") {
    const { error } = await supabase
      .from("hr_contracts")
      .update({ ends_on: effectiveDate, status: "terminated", updated_by: context.userId })
      .eq("id", contractId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not terminate contract.", cause: error });
  } else if (action === "suspend") {
    if (contract.status !== "active") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only active contracts can be suspended." });
    const { error } = await supabase
      .from("hr_contracts")
      .update({ status: "suspended", metadata: { suspended_at: effectiveDate, suspension_reason: reason }, updated_by: context.userId })
      .eq("id", contractId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not suspend contract.", cause: error });
  } else if (action === "resume") {
    if (contract.status !== "suspended") throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Only suspended contracts can be resumed." });
    const { error } = await supabase
      .from("hr_contracts")
      .update({ status: "active", metadata: { resumed_at: effectiveDate, resume_reason: reason }, updated_by: context.userId })
      .eq("id", contractId);
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not resume contract.", cause: error });
  } else {
    const { error } = await supabase.from("hr_contracts").insert({
      branch_id: context.branchId,
      company_id: context.companyId,
      contract_number: `${contract.contract_number}-${action.toUpperCase()}`,
      contract_type: contract.contract_type,
      created_by: context.userId,
      employee_id: contract.employee_id,
      employment_profile_id: contract.employment_profile_id,
      ends_on: endsOn,
      metadata: { previous_contract_id: contractId, action, reason },
      starts_on: effectiveDate,
      status: action === "renew" ? "active" : "draft",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    });
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not ${action} contract.`, cause: error });
  }

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: contract.employee_id,
    event_type: action === "terminate" ? "lifecycle_changed" : "document_added",
    metadata: { action, contract_id: contractId, reason },
    source_document_type: "hr_contract_action",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr/contracts");
  revalidatePath(`/erp/hr/employees/${contract.employee_id}`);
}

export async function archiveEmployeeAction(employeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_employees")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive employee.", cause: error });

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: employeeId,
    event_type: "lifecycle_changed",
    metadata: { action: "archived" },
    source_document_type: "hr_employee_archive",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr/employees");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function restoreEmployeeAction(employeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { error } = await supabase
    .from("hr_employees")
    .update({
      deleted_at: null,
      deleted_by: null,
      status: "active",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", employeeId)
    .not("deleted_at", "is", null);

  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not restore employee.", cause: error });

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: employeeId,
    event_type: "lifecycle_changed",
    metadata: { action: "restored" },
    source_document_type: "hr_employee_restore",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr/employees");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function duplicateEmployeeAction(sourceEmployeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: source, error: readError } = await supabase
    .from("hr_employees")
    .select("full_name, gender, nationality, marital_status, notes")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", sourceEmployeeId)
    .is("deleted_at", null)
    .single();
  if (readError || !source) throw new ApplicationError({ code: "NOT_FOUND", message: "Source employee not found.", cause: readError });

  const newNumber = `EMP-COPY-${Date.now().toString().slice(-6)}`;
  const { data: newEmployee, error: insertError } = await supabase
    .from("hr_employees")
    .insert({
      branch_id: context.branchId,
      company_id: context.companyId,
      created_by: context.userId,
      employee_number: newNumber,
      full_name: `${source.full_name} (Copy)`,
      gender: source.gender,
      marital_status: source.marital_status,
      nationality: source.nationality,
      notes: source.notes,
      status: "draft",
      tenant_id: context.tenantId,
      updated_by: context.userId,
    })
    .select("id")
    .single();
  if (insertError || !newEmployee) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not duplicate employee.", cause: insertError });

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: String(newEmployee.id),
    event_type: "lifecycle_changed",
    metadata: { action: "duplicated_from", source_employee_id: sourceEmployeeId },
    source_document_type: "hr_employee_duplicate",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr/employees");
}

export async function updateEmployeePhotoAction(employeeId: string, formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const file = formData.get("file");
  if (!employeeId || !(file instanceof File) || file.size === 0) {
    throw new ApplicationError({ code: "VALIDATION_ERROR", message: "Employee ID and photo file are required." });
  }

  const fileService = new HrFileAttachmentService(supabase, context);
  const uploaded = await fileService.uploadEmployeePhoto({ employeeId, file });

  const { error } = await supabase
    .from("hr_employees")
    .update({
      photo_file_id: uploaded.attachmentId,
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", employeeId)
    .is("deleted_at", null);
  if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update employee photo.", cause: error });

  await supabase.from("hr_employee_timeline_events").insert({
    branch_id: context.branchId,
    company_id: context.companyId,
    created_by: context.userId,
    employee_id: employeeId,
    event_type: "lifecycle_changed",
    metadata: { action: "photo_updated", file_attachment_id: uploaded.attachmentId, storage_path: uploaded.storagePath },
    source_document_type: "hr_employee_photo",
    tenant_id: context.tenantId,
    updated_by: context.userId,
  });

  revalidatePath("/erp/hr/employees");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function rebuildAllEmployeeCachesAction() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.assignmentsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const { data: employees, error } = await supabase
    .from("hr_employees")
    .select("id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("status", "active")
    .is("deleted_at", null);
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employees for cache rebuild.", cause: error });
  }

  const cacheService = new HrAssignmentCacheService(supabase, context);
  let rebuilt = 0;
  for (const employee of employees ?? []) {
    await cacheService.rebuildEmploymentProfileCache(String(employee.id));
    rebuilt += 1;
  }

  revalidatePath("/erp/hr");
  revalidatePath("/erp/hr/employees");
  revalidatePath("/erp/hr/assignments");
  return { rebuilt, success: true as const };
}

export async function runHrExpiryNotificationScanAction() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.manage });
  const result = await runHrExpiryNotificationScan(context);
  revalidatePath("/erp/hr/settings");
  return result;
}

export async function runHrExpiryNotificationScanAndRedirectAction() {
  const result = await runHrExpiryNotificationScanAction();
  const { redirect } = await import("next/navigation");
  const next = new URLSearchParams({
    scanContracts: String(result.contracts),
    scanDocuments: String(result.documents),
    scanProbation: String(result.probation),
    scanTotal: String(result.total),
  });
  redirect(`/erp/hr/settings?${next.toString()}`);
}
