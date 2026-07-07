"use server";

import { revalidatePath } from "next/cache";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { HrAttendanceDeviceCommandService } from "../../application/services/hr-attendance-device-command.service";
import { HrWorkforceEnterpriseService } from "../../application/services/hr-workforce-enterprise.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";
import type { HrAttendanceRecalcReason, HrAttendanceReplayScope, HrDeviceCommandKey } from "../../application/types/hr-workforce-enterprise.types";

async function enterpriseContext() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return {
    commandService: new HrAttendanceDeviceCommandService(supabase, context),
    context,
    service: new HrWorkforceEnterpriseService(supabase, context),
    supabase,
  };
}

export async function executeHrDeviceCommandAction(formData: FormData) {
  const { commandService, context } = await enterpriseContext();
  const commandKey = String(formData.get("commandKey") ?? "") as HrDeviceCommandKey;
  const deviceId = String(formData.get("deviceId") ?? "");
  const confirmed = String(formData.get("confirmed") ?? "") === "true";

  if (["restart", "shutdown", "factory_reset"].includes(commandKey)) {
    await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesCommandRestart });
  } else {
    await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesCommandsRun });
  }

  const result = await commandService.executeCommand({ commandKey, confirmed, deviceId });
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function monitorHrDeviceHealthAction(deviceId: string) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesDiagnosticsView });
  const result = await service.monitorDeviceHealth(deviceId);
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function correctHrDeviceTimeDriftAction(deviceId: string) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesCommandsRun });
  const result = await service.correctTimeDrift(deviceId);
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function startHrAttendanceReplayAction(formData: FormData) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceReplayManage });
  const result = await service.startReplaySession({
    periodEnd: String(formData.get("periodEnd") ?? "") || undefined,
    periodStart: String(formData.get("periodStart") ?? "") || undefined,
    scopeKind: String(formData.get("scopeKind") ?? "company") as HrAttendanceReplayScope,
    scopeRef: String(formData.get("scopeRef") ?? context.companyId),
  });
  revalidatePath("/erp/hr/attendance-processing");
  return result;
}

export async function publishHrAttendanceReplayAction(sessionId: string) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceReplayManage });
  const result = await service.publishReplaySession(sessionId);
  revalidatePath("/erp/hr/attendance-processing");
  return result;
}

export async function startHrAttendanceRecalcAction(formData: FormData) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceRecalculateManage });
  const result = await service.startRecalcSession({
    periodEnd: String(formData.get("periodEnd") ?? "") || undefined,
    periodStart: String(formData.get("periodStart") ?? "") || undefined,
    reasonKey: String(formData.get("reasonKey") ?? "manual_adjustment") as HrAttendanceRecalcReason,
    reasonLabel: String(formData.get("reasonLabel") ?? "") || undefined,
    scopeKind: String(formData.get("scopeKind") ?? "company") as "employee" | "department" | "branch" | "company",
    scopeRef: String(formData.get("scopeRef") ?? context.companyId),
  });
  revalidatePath("/erp/hr/attendance-processing");
  return result;
}

export async function runHrBulkDeviceOperationAction(formData: FormData) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesCommandsRun });
  const deviceIds = String(formData.get("deviceIds") ?? "").split(",").filter(Boolean);
  const operationKey = String(formData.get("operationKey") ?? "sync");
  const result = await service.runBulkOperation({ deviceIds, operationKey });
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function simulateHrAttendanceRuleAction(formData: FormData) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceSimulationView });
  return service.simulateAttendanceRule({
    gracePeriodMinutes: Number(formData.get("gracePeriodMinutes") ?? 0) || undefined,
    lateRuleMinutes: Number(formData.get("lateRuleMinutes") ?? 0) || undefined,
    overtimeThresholdMinutes: Number(formData.get("overtimeThresholdMinutes") ?? 0) || undefined,
    policyLabel: String(formData.get("policyLabel") ?? "Policy"),
  });
}

export async function exportHrDeviceBackupAction(deviceId: string) {
  const { context, service } = await enterpriseContext();
  await requirePermission({ context, permission: HR_PERMISSIONS.workforceRecoveryManage });
  return service.exportDeviceBackup(deviceId);
}
