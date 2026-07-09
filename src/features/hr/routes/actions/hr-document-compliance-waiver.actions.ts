"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrDocumentComplianceWaiverGrantSchema,
  hrDocumentComplianceWaiverRevokeSchema,
} from "../../application/schemas/hr-document-compliance-waiver.schema";
import { HrDocumentComplianceWaiverService } from "../../application/services/hr-document-compliance-waiver.service";
import { HrOnboardingDocumentSyncService } from "../../application/services/hr-onboarding-document-sync.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

function revalidateDocumentComplianceWaiverPaths(employeeId: string) {
  revalidatePath("/erp/hr/documents");
  revalidatePath("/erp/hr/dashboard");
  revalidatePath("/erp/hr/onboarding");
  revalidatePath("/erp/hr/payroll-readiness");
  revalidatePath(`/erp/hr/employees/${employeeId}`);
}

export async function grantHrDocumentComplianceWaiverAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrDocumentComplianceWaiverGrantSchema.parse({
    documentKind: formData.get("documentKind"),
    effectiveTo: formData.get("effectiveTo") || null,
    employeeId: formData.get("employeeId"),
    reason: formData.get("reason"),
  });

  const service = new HrDocumentComplianceWaiverService(supabase, context);
  await service.grantWaiver(parsed);
  await new HrOnboardingDocumentSyncService(supabase, context).syncAfterDocumentChange(parsed.employeeId);
  revalidateDocumentComplianceWaiverPaths(parsed.employeeId);
}

export async function revokeHrDocumentComplianceWaiverAction(formData: FormData) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.employeesManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const parsed = hrDocumentComplianceWaiverRevokeSchema.parse({
    revokeReason: formData.get("revokeReason") || undefined,
    waiverId: formData.get("waiverId"),
  });

  const { data: waiver, error } = await supabase
    .from("hr_document_compliance_waivers")
    .select("employee_id")
    .eq("tenant_id", context.tenantId)
    .eq("id", parsed.waiverId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !waiver) {
    throw new ApplicationError({ code: "NOT_FOUND", message: "Waiver not found." });
  }

  const service = new HrDocumentComplianceWaiverService(supabase, context);
  await service.revokeWaiver(parsed.waiverId, parsed.revokeReason);
  const employeeId = String(waiver.employee_id);
  await new HrOnboardingDocumentSyncService(supabase, context).syncAfterDocumentChange(employeeId);
  revalidateDocumentComplianceWaiverPaths(employeeId);
}
