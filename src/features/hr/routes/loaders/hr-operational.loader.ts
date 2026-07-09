import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { hydrateLookupOptions } from "@/shared/workspace/entity-lookup-runtime.server";

import { HR_DOCUMENT_TYPES, HR_REQUEST_TYPES } from "../../application/constants/hr-operational.constants";
import { formatHrDisplayLabel, formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export type HrDocumentRecord = Readonly<{
  documentType: string;
  employeeId: string;
  employeeLabel: string;
  expiresOn: string | null;
  fileName: string;
  id: string;
  previewReady: boolean;
  status: string;
  uploadedAt: string;
}>;

export type HrDocumentAlert = Readonly<{
  id: string;
  labelKey: "hr.documents.alert.expired" | "hr.documents.alert.expiring" | "hr.documents.alert.noDate";
  labelParams: Readonly<{ employee: string; fileName: string; date?: string }>;
  severity: "warning" | "error";
}>;

export type HrDocumentsWorkspaceData = Readonly<{
  alerts: readonly HrDocumentAlert[];
  records: readonly HrDocumentRecord[];
}>;

function readMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {} as Record<string, unknown>;
  return metadata as Record<string, unknown>;
}

function documentStatus(expiresOn: string | null): string {
  if (!expiresOn) return "active";
  const today = new Date().toISOString().slice(0, 10);
  if (expiresOn < today) return "expired";
  const soon = new Date();
  soon.setUTCDate(soon.getUTCDate() + 30);
  if (expiresOn <= soon.toISOString().slice(0, 10)) return "expiring_soon";
  return "active";
}

export async function loadHrDocumentsWorkspace(query: { employeeId?: string } = {}): Promise<HrDocumentsWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("file_attachments")
    .select("id, entity_id, file_name, metadata, created_at, storage_path")
    .eq("tenant_id", context.tenantId)
    .eq("module_key", "hr")
    .eq("entity_type", "hr_employee_document")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (query.employeeId) request = request.eq("entity_id", query.employeeId);

  const { data } = await request;

  const employeeIds = [...new Set((data ?? []).map((row) => String(row.entity_id)))];
  const employeeLabels = new Map<string, string>();
  if (employeeIds.length > 0) {
    const hydrated = await hydrateLookupOptions("hr.employees.lookup", employeeIds);
    for (const option of hydrated) employeeLabels.set(option.id, option.label);
  }

  const records: HrDocumentRecord[] = (data ?? []).map((row) => {
    const metadata = readMetadata(row.metadata);
    const expiresOn = metadata.expiry_date ? String(metadata.expiry_date) : null;
    const status = String(metadata.status ?? documentStatus(expiresOn));
    return {
      documentType: formatHrDisplayLabel(metadata.document_type, "Document"),
      employeeId: String(row.entity_id),
      employeeLabel: employeeLabels.get(String(row.entity_id)) ?? "Employee",
      expiresOn,
      fileName: formatHrDisplayLabel(row.file_name, "Document"),
      id: String(row.id),
      previewReady: Boolean(row.storage_path && !String(row.storage_path).includes("placeholder")),
      status: formatHrStatusLabel(status),
      uploadedAt: String(row.created_at),
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  const alerts: HrDocumentAlert[] = records
    .filter((record) => record.status.toLowerCase().includes("expir"))
    .slice(0, 5)
    .map((record) => {
      const expired = Boolean(record.expiresOn && record.expiresOn < today);
      const labelKey = record.expiresOn
        ? expired
          ? ("hr.documents.alert.expired" as const)
          : ("hr.documents.alert.expiring" as const)
        : ("hr.documents.alert.noDate" as const);
      return {
        id: record.id,
        labelKey,
        labelParams: {
          date: record.expiresOn ?? undefined,
          employee: record.employeeLabel,
          fileName: record.fileName,
        },
        severity: expired ? ("error" as const) : ("warning" as const),
      };
    });

  return { alerts, records };
}

export function listHrDocumentTypeOptions() {
  return HR_DOCUMENT_TYPES;
}

export async function getHrEmployeeForEdit(employeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, employee_number, attendance_code, full_name, national_id, passport_number, birth_date, gender, nationality, marital_status, contact_info, emergency_contact, metadata")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", employeeId)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new ApplicationError({ code: "NOT_FOUND", message: "Employee was not found.", cause: error });
  const contact = readMetadata(data.contact_info);
  const emergency = readMetadata(data.emergency_contact);
  const metadata = readMetadata(data.metadata);
  return {
    addressLine1: String(metadata.address_line1 ?? ""),
    addressLine2: String(metadata.address_line2 ?? ""),
    attendanceCode: data.attendance_code ? String(data.attendance_code) : "",
    birthDate: data.birth_date ? String(data.birth_date) : "",
    city: String(metadata.city ?? ""),
    email: String(contact.email ?? ""),
    emergencyContactName: String(emergency.name ?? ""),
    emergencyContactPhone: String(emergency.phone ?? ""),
    employeeNumber: String(data.employee_number),
    fullName: String(data.full_name),
    gender: data.gender ? String(data.gender) : "",
    id: String(data.id),
    maritalStatus: data.marital_status ? String(data.marital_status) : "",
    nationalId: data.national_id ? String(data.national_id) : "",
    nationality: data.nationality ? String(data.nationality) : "",
    passportNumber: data.passport_number ? String(data.passport_number) : "",
    phone: String(contact.phone ?? ""),
  };
}

export type HrRequestRecord = Readonly<{
  actionType: string;
  createdAt: string;
  documentNumber: string;
  employeeLabel: string;
  id: string;
  requestLabel: string;
  status: string;
}>;

export async function loadHrRequestsWorkspace(query: { employeeId?: string } = {}): Promise<readonly HrRequestRecord[]> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.actionsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  let request = supabase
    .from("hr_action_documents")
    .select("id, document_number, action_type, status, requested_on, employee_id, metadata")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .in(
      "action_type",
      HR_REQUEST_TYPES.map((item) => item.actionType),
    )
    .is("deleted_at", null)
    .order("requested_on", { ascending: false })
    .limit(100);

  if (query.employeeId) request = request.eq("employee_id", query.employeeId);

  const { data } = await request;

  const employeeIds = [...new Set((data ?? []).map((row) => String(row.employee_id)))];
  const employeeLabels = new Map<string, string>();
  if (employeeIds.length > 0) {
    const hydrated = await hydrateLookupOptions("hr.employees.lookup", employeeIds);
    for (const option of hydrated) employeeLabels.set(option.id, option.label);
  }

  return (data ?? []).map((row) => {
    const metadata = readMetadata(row.metadata);
    return {
      actionType: formatHrStatusLabel(String(row.action_type)),
      createdAt: String(row.requested_on),
      documentNumber: formatHrDisplayLabel(row.document_number, "Request"),
      employeeLabel: employeeLabels.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      requestLabel: formatHrDisplayLabel(metadata.request_label, "HR request"),
      status: formatHrStatusLabel(String(row.status)),
    };
  });
}

export type HrCustodyRecord = Readonly<{
  assetLabel: string;
  assetType: string;
  condition: string;
  documentNumber: string;
  effectiveDate: string;
  employeeLabel: string;
  id: string;
  notes: string | null;
  status: string;
}>;

export async function loadHrCustodyWorkspace(query: { employeeId?: string } = {}): Promise<readonly HrCustodyRecord[]> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  let request = supabase
    .from("hr_action_documents")
    .select("id, document_number, action_type, status, effective_date, employee_id, metadata")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .in("action_type", ["custody_assignment", "custody_return"])
    .is("deleted_at", null)
    .order("effective_date", { ascending: false })
    .limit(100);

  if (query.employeeId) request = request.eq("employee_id", query.employeeId);

  const { data } = await request;

  const employeeIds = [...new Set((data ?? []).map((row) => String(row.employee_id)))];
  const employeeLabels = new Map<string, string>();
  if (employeeIds.length > 0) {
    const hydrated = await hydrateLookupOptions("hr.employees.lookup", employeeIds);
    for (const option of hydrated) employeeLabels.set(option.id, option.label);
  }

  return (data ?? []).map((row) => {
    const metadata = readMetadata(row.metadata);
    return {
      assetLabel: formatHrDisplayLabel(metadata.asset_label, "Asset"),
      assetType: formatHrDisplayLabel(metadata.asset_type, "Asset type"),
      condition: formatHrDisplayLabel(metadata.condition, "Good"),
      documentNumber: formatHrDisplayLabel(row.document_number, "Custody"),
      effectiveDate: String(row.effective_date),
      employeeLabel: employeeLabels.get(String(row.employee_id)) ?? "Employee",
      id: String(row.id),
      notes: metadata.notes ? String(metadata.notes) : null,
      status: formatHrStatusLabel(String(row.status)),
    };
  });
}
