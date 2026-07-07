"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import type { PermissionKey } from "@/platform/permissions/public-api";

import { hrAttendanceLiveSupervisorActionSchema } from "../../application/schemas/hr-attendance-live.schema";
import { HrAttendanceLiveService } from "../../application/services/hr-attendance-live.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function liveService(requiredPermission: PermissionKey) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: requiredPermission });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrAttendanceLiveService(supabase, context) };
}

export async function executeHrAttendanceLiveSupervisorActionAction(formData: FormData) {
  const parsed = hrAttendanceLiveSupervisorActionSchema.parse({
    action: String(formData.get("action") ?? ""),
    employeeId: String(formData.get("employeeId") ?? ""),
    exceptionId: String(formData.get("exceptionId") ?? "") || undefined,
    reason: String(formData.get("reason") ?? ""),
  });

  const permission =
    parsed.action === "approve_missing_punch" || parsed.action === "ignore_warning"
      ? HR_PERMISSIONS.attendanceExceptionResolve
      : HR_PERMISSIONS.attendanceMonitorManage;

  const { service } = await liveService(permission);
  await service.executeSupervisorAction(parsed);
  revalidatePath("/erp/hr/attendance-live");
}

export async function scheduleHrAttendanceLiveMonitoringAction() {
  const { service } = await liveService(HR_PERMISSIONS.attendanceMonitorManage);
  return service.scheduleMonitoringJobs();
}
