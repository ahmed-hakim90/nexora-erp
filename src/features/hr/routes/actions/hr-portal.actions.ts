"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import {
  resolveEmployeeRequestContext,
  type BranchRequestContext,
  type EmployeeRequestContext,
} from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { hrLeaveCreateSchema } from "../../application/schemas/hr-leave.schema";
import { HrLeaveService } from "../../application/services/hr-leave.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import { resolveManagerDirectReportIds } from "../loaders/hr-portal.loader";

const PORTAL_PATHS = ["/portal/leave", "/portal/manager/approvals", "/portal/manager"] as const;

function revalidatePortalPaths() {
  for (const path of PORTAL_PATHS) revalidatePath(path);
}

async function resolveBranchContextForEmployee(
  context: EmployeeRequestContext,
): Promise<BranchRequestContext> {
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_employees")
    .select("company_id, branch_id")
    .eq("id", context.employeeId)
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data?.company_id) {
    throw new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "Could not resolve employee company scope for portal action.",
      cause: error,
    });
  }

  if (!data.branch_id) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "Employee must be assigned to a branch before using HR self-service.",
    });
  }

  return {
    ...context,
    branchId: String(data.branch_id),
    companyId: String(data.company_id),
  };
}

async function leaveServiceForPortal(permission: (typeof HR_PERMISSIONS)[keyof typeof HR_PERMISSIONS]) {
  const employeeContext = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context: employeeContext, permission });
  const branchContext = await resolveBranchContextForEmployee(employeeContext);
  const supabase = createRequestSupabaseClient({ accessToken: employeeContext.accessToken });
  return { employeeContext, service: new HrLeaveService(supabase, branchContext) };
}

async function assertManagerCanActOnLeave(employeeContext: EmployeeRequestContext, leaveRequestId: string) {
  const directReportIds = await resolveManagerDirectReportIds(employeeContext);
  const supabase = createRequestSupabaseClient({ accessToken: employeeContext.accessToken });
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select("employee_id")
    .eq("id", leaveRequestId)
    .eq("tenant_id", employeeContext.tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: "Leave request was not found.",
      cause: error,
    });
  }

  if (!directReportIds.includes(String(data.employee_id))) {
    throw new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "You can only act on leave requests for your direct reports.",
    });
  }
}

export async function createPortalLeaveRequestAction(formData: FormData) {
  const { employeeContext, service } = await leaveServiceForPortal(HR_PERMISSIONS.leaveManageSelf);

  const parsed = hrLeaveCreateSchema.parse({
    employeeId: employeeContext.employeeId,
    endsOn: formData.get("endsOn"),
    leaveTypeId: formData.get("leaveTypeId"),
    notes: formData.get("notes") || undefined,
    startsOn: formData.get("startsOn"),
  });

  const { id } = await service.createLeaveRequest(parsed);
  await service.submitLeaveRequest(id);
  revalidatePortalPaths();
}

export async function approvePortalLeaveRequestAction(leaveRequestId: string) {
  const employeeContext = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context: employeeContext, permission: HR_PERMISSIONS.leaveApprove });
  await assertManagerCanActOnLeave(employeeContext, leaveRequestId);

  const branchContext = await resolveBranchContextForEmployee(employeeContext);
  const supabase = createRequestSupabaseClient({ accessToken: employeeContext.accessToken });
  const service = new HrLeaveService(supabase, branchContext);
  await service.approveLeaveRequest(leaveRequestId);
  revalidatePortalPaths();
}

export async function rejectPortalLeaveRequestAction(leaveRequestId: string, formData: FormData) {
  const employeeContext = await resolveEmployeeRequestContext("portal");
  await requirePermission({ context: employeeContext, permission: HR_PERMISSIONS.leaveApprove });
  await assertManagerCanActOnLeave(employeeContext, leaveRequestId);

  const reason = String(formData.get("reason") ?? "").trim() || "Rejected from manager portal";
  const branchContext = await resolveBranchContextForEmployee(employeeContext);
  const supabase = createRequestSupabaseClient({ accessToken: employeeContext.accessToken });
  const service = new HrLeaveService(supabase, branchContext);
  await service.rejectLeaveRequest(leaveRequestId, reason);
  revalidatePortalPaths();
}
