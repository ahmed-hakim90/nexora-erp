import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrEmployeeDocumentComplianceService } from "../../application/services/hr-employee-document-compliance.service";
import { HrRequiredDocumentSetService } from "../../application/services/hr-required-document-set.service";
import { resolveDepartmentEmployeeIds } from "../../application/utils/hr-department-assignment.utils";
import { formatHrStatusLabel } from "../../application/utils/hr-display";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export async function loadEmployeeDocumentCompliance(employeeId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrEmployeeDocumentComplianceService(supabase, context);
  return service.evaluateEmployee(employeeId);
}

export async function loadCompanyDocumentComplianceMatrix(
  query: Readonly<{ departmentId?: string; status?: "complete" | "incomplete" }> = {},
) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrEmployeeDocumentComplianceService(supabase, context);
  let employeeIds: string[] | undefined;
  if (query.departmentId) {
    employeeIds = await resolveDepartmentEmployeeIds(supabase, context, query.departmentId);
  }
  return service.evaluateCompanyMatrix({ employeeIds, status: query.status });
}

export async function loadHrRequiredDocumentSetsForSettings() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.templatesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrRequiredDocumentSetService(supabase, context);
  const records = await service.listDocumentSets();
  return records.map((record) => ({
    code: record.code,
    documentKinds: [...record.documentKinds],
    id: record.id,
    name: record.name,
    status: formatHrStatusLabel(record.status),
    statusRaw: record.status,
  }));
}

export async function countEmployeesWithMissingDocuments() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrEmployeeDocumentComplianceService(supabase, context);
  return service.countIncompleteEmployees();
}
