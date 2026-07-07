import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext, type BranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { hrEmployeeListQuerySchema } from "../../application/schemas/hr-employees.schema";
import { HrAssignmentResolverService } from "../../application/services/hr-assignment-resolver.service";
import type { HrEmployeeAssignmentSnapshot, HrEmployeeListRow } from "../../application/types/hr-ui.types";
import { formatHrDisplayLabel, readContactField } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

type EmployeeRow = Readonly<Record<string, unknown>>;

function encodeCursor(record: EmployeeRow | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.created_at, id: record.id })).toString("base64url");
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export type HrEmployeesWorkspaceData = Readonly<{
  branchOptions: readonly { id: string; label: string }[];
  departmentOptions: readonly { id: string; label: string }[];
  managerOptions: readonly { id: string; label: string }[];
  nextCursor: string | null;
  pageSize: number;
  positionOptions: readonly { id: string; label: string }[];
  records: readonly HrEmployeeListRow[];
  statusOptions: readonly string[];
}>;

function withBranchLabel(
  assignment: HrEmployeeAssignmentSnapshot,
  branchLabel: string | null,
): HrEmployeeAssignmentSnapshot {
  return { ...assignment, branchLabel };
}

async function loadBranchLabels(
  supabase: SupabaseClient,
  context: BranchRequestContext,
  branchIds: readonly string[],
): Promise<readonly { id: string; label: string }[]> {
  if (branchIds.length === 0) return [];

  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("tenant_id", context.tenantId)
    .in("id", [...new Set(branchIds)])
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load branch labels.", cause: error });
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    label: formatHrDisplayLabel(row.name, "Branch"),
  }));
}

export async function loadHrEmployeesWorkspace(query: unknown = {}): Promise<HrEmployeesWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const parsed = hrEmployeeListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = parsed.pageSize;
  const cursor = decodeCursor(parsed.cursor);

  let request = supabase
    .from("hr_employees")
    .select("id, employee_number, attendance_code, full_name, status, branch_id, photo_file_id, national_id, contact_info, created_at")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.branchId) request = request.eq("branch_id", parsed.branchId);
  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) {
      request = request.or(`employee_number.ilike.%${term}%,full_name.ilike.%${term}%,national_id.ilike.%${term}%,attendance_code.ilike.%${term}%`);
    }
  }

  if (cursor) {
    request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const resolver = new HrAssignmentResolverService(supabase, context);

  const [employeesResult, departmentsResult, positionsResult] = await Promise.all([
    request,
    supabase
      .from("hr_org_units")
      .select("id, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name")
      .limit(100),
    supabase
      .from("hr_positions")
      .select("id, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name")
      .limit(100),
  ]);

  if (employeesResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load employees.", cause: employeesResult.error });
  }

  const rows = (employeesResult.data ?? []) as EmployeeRow[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const employeeIds = pageRows.map((row) => String(row.id));
  const branchIds = [...new Set(pageRows.map((row) => row.branch_id).filter(Boolean).map(String))];

  const [assignments, contractsResult, branchLabels] = await Promise.all([
    resolver.resolveManyEmployeeAssignments(employeeIds),
    employeeIds.length > 0
      ? supabase
          .from("hr_contracts")
          .select("employee_id, status")
          .eq("tenant_id", context.tenantId)
          .in("employee_id", employeeIds)
          .is("deleted_at", null)
          .order("starts_on", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    loadBranchLabels(supabase, context, branchIds),
  ]);

  const contractStatusByEmployee = new Map<string, string>();
  if (!contractsResult.error) {
    for (const contract of contractsResult.data ?? []) {
      const employeeId = String(contract.employee_id);
      if (!contractStatusByEmployee.has(employeeId)) {
        contractStatusByEmployee.set(employeeId, String(contract.status));
      }
    }
  }

  const branchLabelById = new Map(branchLabels.map((option) => [option.id, option.label]));

  let records: HrEmployeeListRow[] = pageRows.map((row) => {
    const id = String(row.id);
    const baseAssignment = assignments.get(id) ?? {
      asOfDate: new Date().toISOString().slice(0, 10),
      branchLabel: null,
      costCenter: null,
      department: null,
      employeeId: id,
      grade: null,
      manager: null,
      payrollGroup: null,
      payrollGroupLabel: null,
      position: null,
      section: null,
      shift: null,
      team: null,
      workLocation: null,
    };
    const branchLabel = row.branch_id ? branchLabelById.get(String(row.branch_id)) ?? null : null;

    return {
      assignment: withBranchLabel(baseAssignment, branchLabel),
      attendanceCode: row.attendance_code ? String(row.attendance_code) : null,
      branchId: row.branch_id ? String(row.branch_id) : null,
      branchLabel,
      contractStatus: contractStatusByEmployee.get(id) ?? null,
      email: readContactField(row.contact_info, "email"),
      employeeNumber: formatHrDisplayLabel(row.employee_number, "Employee"),
      employmentStatus: String(row.status),
      fullName: formatHrDisplayLabel(row.full_name, "Employee"),
      id,
      nationalId: row.national_id ? String(row.national_id) : null,
      phone: readContactField(row.contact_info, "phone"),
      photoFileId: row.photo_file_id ? String(row.photo_file_id) : null,
      status: String(row.status),
    };
  });

  if (parsed.departmentId) {
    records = records.filter((record) => record.assignment.department?.referenceEntityId === parsed.departmentId);
  }
  if (parsed.positionId) {
    records = records.filter((record) => record.assignment.position?.referenceEntityId === parsed.positionId);
  }
  if (parsed.managerId) {
    records = records.filter((record) => record.assignment.manager?.referenceEntityId === parsed.managerId);
  }
  if (parsed.contractStatus) {
    records = records.filter((record) => record.contractStatus === parsed.contractStatus);
  }

  return {
    branchOptions: branchLabels,
    departmentOptions: (departmentsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: formatHrDisplayLabel(row.name, "Department"),
    })),
    managerOptions: [],
    nextCursor: hasMore ? encodeCursor(pageRows.at(-1)) : null,
    pageSize,
    positionOptions: (positionsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: formatHrDisplayLabel(row.name, "Position"),
    })),
    records,
    statusOptions: ["draft", "active", "inactive", "suspended", "separated", "archived"],
  };
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export async function exportHrEmployeesCsv(query: unknown = {}): Promise<string> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.importExportManage });
  const parsed = hrEmployeeListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  let request = supabase
    .from("hr_employees")
    .select("id, employee_number, attendance_code, full_name, status, national_id, contact_info, branch_id")
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(5000);

  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) {
      request = request.or(`employee_number.ilike.%${term}%,full_name.ilike.%${term}%,national_id.ilike.%${term}%,attendance_code.ilike.%${term}%`);
    }
  }

  const { data, error } = await request;
  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not export employees.", cause: error });
  }

  const rows = data ?? [];
  const employeeIds = rows.map((row) => String(row.id));
  const resolver = new HrAssignmentResolverService(supabase, context);
  const assignments = employeeIds.length > 0 ? await resolver.resolveManyEmployeeAssignments(employeeIds) : new Map();

  const headers = ["Employee Number", "Attendance Code", "Full Name", "National ID", "Status", "Department", "Position", "Manager", "Email", "Phone"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    const id = String(row.id);
    const assignment = assignments.get(id);
    lines.push(
      [
        csvEscape(formatHrDisplayLabel(row.employee_number, "")),
        csvEscape(row.attendance_code ? String(row.attendance_code) : ""),
        csvEscape(formatHrDisplayLabel(row.full_name, "")),
        csvEscape(row.national_id ? String(row.national_id) : ""),
        csvEscape(formatHrDisplayLabel(String(row.status), "")),
        csvEscape(assignment?.department?.label ?? ""),
        csvEscape(assignment?.position?.label ?? ""),
        csvEscape(assignment?.manager?.label ?? ""),
        csvEscape(readContactField(row.contact_info, "email") ?? ""),
        csvEscape(readContactField(row.contact_info, "phone") ?? ""),
      ].join(","),
    );
  }

  return lines.join("\n");
}
