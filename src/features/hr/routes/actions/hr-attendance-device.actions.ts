"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ApplicationError } from "@/core/errors";
import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import {
  hrAttendanceDeviceCreateSchema,
  hrAttendanceDeviceEnterpriseSyncSchema,
  hrAttendanceDeviceImportDecisionSchema,
  hrAttendanceDeviceMappingSchema,
  hrAttendanceDeviceSyncModeSchema,
  hrAttendanceDeviceUpdateSchema,
} from "../../application/schemas/hr-attendance-device.schema";
import { HrAttendanceDeviceService } from "../../application/services/hr-attendance-device.service";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

async function deviceService() {
  const context = await resolveBranchRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, service: new HrAttendanceDeviceService(supabase, context) };
}

const DEVICE_FIELD_LABELS: Record<string, string> = {
  autoSyncInterval: "Auto sync interval",
  code: "Device code",
  commKey: "Communication key",
  deviceType: "Device type",
  firmwareVersion: "Firmware version",
  ipAddress: "IP address",
  name: "Device name",
  port: "Port",
  serialNumber: "Serial number",
  timezone: "Timezone",
  workLocationId: "Work location",
};

function parseAttendanceDeviceInput<T>(schema: z.ZodType<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields = [...new Set(error.issues.map((issue) => {
        const key = issue.path[0];
        return typeof key === "string" ? (DEVICE_FIELD_LABELS[key] ?? key) : null;
      }).filter(Boolean))];
      throw new ApplicationError({
        code: "VALIDATION_ERROR",
        cause: error,
        message: fields.length > 0
          ? `Please review: ${fields.join(", ")}.`
          : "Please review the device form values.",
      });
    }
    throw error;
  }
}

export async function createHrAttendanceDeviceAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const parsed = parseAttendanceDeviceInput(hrAttendanceDeviceCreateSchema, {
    autoSyncInterval: String(formData.get("autoSyncInterval") ?? "disabled"),
    code: String(formData.get("code") ?? ""),
    commKey: String(formData.get("commKey") ?? "") || undefined,
    deviceType: String(formData.get("deviceType") ?? "api_import"),
    firmwareVersion: String(formData.get("firmwareVersion") ?? "") || undefined,
    ipAddress: String(formData.get("ipAddress") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    port: formData.get("port") ? Number(formData.get("port")) : undefined,
    serialNumber: String(formData.get("serialNumber") ?? "") || undefined,
    timezone: String(formData.get("timezone") ?? "UTC"),
    workLocationId: String(formData.get("workLocationId") ?? "") || undefined,
  });
  await service.createDevice(parsed);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function updateHrAttendanceDeviceAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const parsed = parseAttendanceDeviceInput(hrAttendanceDeviceUpdateSchema, {
    autoSyncInterval: String(formData.get("autoSyncInterval") ?? "") || undefined,
    clearCommKey: formData.get("clearCommKey") === "true",
    code: String(formData.get("code") ?? "") || undefined,
    commKey: String(formData.get("commKey") ?? "") || undefined,
    deviceType: String(formData.get("deviceType") ?? "") || undefined,
    firmwareVersion: String(formData.get("firmwareVersion") ?? "") || undefined,
    id: String(formData.get("id") ?? ""),
    ipAddress: String(formData.get("ipAddress") ?? "") || undefined,
    name: String(formData.get("name") ?? "") || undefined,
    port: formData.get("port") ? Number(formData.get("port")) : undefined,
    serialNumber: String(formData.get("serialNumber") ?? "") || undefined,
    timezone: String(formData.get("timezone") ?? "") || undefined,
    workLocationId: String(formData.get("workLocationId") ?? "") || undefined,
  });
  await service.updateDevice(parsed);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function startHrAttendanceDeviceSyncAction(deviceId: string, mode: string = "incremental") {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesSync });
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceSync });
  const parsed = hrAttendanceDeviceSyncModeSchema.parse({ deviceId, mode });
  const result = await service.startSync(parsed.deviceId, parsed.mode);
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function startHrAttendanceDeviceEnterpriseSyncAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesSync });
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceSync });
  const parsed = hrAttendanceDeviceEnterpriseSyncSchema.parse({
    deviceId: String(formData.get("deviceId") ?? ""),
    options: {
      autoBuildPreview: formData.get("autoBuildPreview") === "true",
      dryRun: formData.get("dryRun") === "true",
      includeBreakPunches: formData.get("includeBreakPunches") !== "false",
      includeCheckIn: formData.get("includeCheckIn") !== "false",
      includeCheckOut: formData.get("includeCheckOut") !== "false",
      includeDeviceEvents: formData.get("includeDeviceEvents") === "true",
      includeInvalidPunches: formData.get("includeInvalidPunches") === "true",
      includeManualPunches: formData.get("includeManualPunches") !== "false",
      recalculateAttendance: formData.get("recalculateAttendance") !== "false",
      skipDuplicates: formData.get("skipDuplicates") !== "false",
    },
    params: {
      branchId: String(formData.get("branchId") ?? "") || undefined,
      businessUnitId: String(formData.get("businessUnitId") ?? "") || undefined,
      dateFrom: String(formData.get("dateFrom") ?? "") || undefined,
      dateTo: String(formData.get("dateTo") ?? "") || undefined,
      departmentIds: formData.getAll("departmentIds").map(String).filter(Boolean),
      deviceIds: formData.getAll("deviceIds").map(String).filter(Boolean),
      employeeIds: formData.getAll("employeeIds").map(String).filter(Boolean),
      locationId: String(formData.get("locationId") ?? "") || undefined,
      month: formData.get("month") ? Number(formData.get("month")) : undefined,
      shiftId: String(formData.get("shiftId") ?? "") || undefined,
      specificDate: String(formData.get("specificDate") ?? "") || undefined,
      teamId: String(formData.get("teamId") ?? "") || undefined,
      year: formData.get("year") ? Number(formData.get("year")) : undefined,
    },
    strategy: String(formData.get("strategy") ?? "incremental"),
  });
  if (parsed.strategy === "force_resync") {
    await requirePermission({ context, permission: HR_PERMISSIONS.attendanceForceSync });
  }
  const result = await service.startEnterpriseSync(parsed.deviceId, parsed);
  revalidatePath("/erp/hr/attendance-devices");
  return result;
}

export async function startHrAttendanceDeviceEnterpriseSyncFormAction(formData: FormData): Promise<void> {
  await startHrAttendanceDeviceEnterpriseSyncAction(formData);
}

export async function getHrAttendanceDeviceSyncContextAction(deviceId: string, strategy: string) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendancePreview });
  return service.getSyncStartContext(deviceId, {
    options: {
      autoBuildPreview: true,
      dryRun: false,
      includeBreakPunches: true,
      includeCheckIn: true,
      includeCheckOut: true,
      includeDeviceEvents: false,
      includeInvalidPunches: false,
      includeManualPunches: true,
      recalculateAttendance: true,
      skipDuplicates: true,
    },
    params: {},
    strategy: strategy as "incremental",
  });
}

export async function startHrAttendanceDeviceSyncModeAction(formData: FormData): Promise<void> {
  const deviceId = String(formData.get("deviceId") ?? "");
  const mode = String(formData.get("mode") ?? "quick");
  await startHrAttendanceDeviceSyncAction(deviceId, mode);
}

export async function cancelHrAttendanceDeviceSyncAction(sessionId: string) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesSyncCancel });
  await service.cancelSync(sessionId);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function importHrAttendanceDeviceSyncAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesImportApprove });
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceImport });
  const parsed = hrAttendanceDeviceImportDecisionSchema.parse({
    decision: String(formData.get("decision") ?? "valid_only"),
    importWithoutProcessing: formData.get("importWithoutProcessing") === "true",
    selectedDays: formData.getAll("selectedDays").map(String).filter(Boolean),
    selectedEmployeeIds: formData.getAll("selectedEmployeeIds").map(String).filter(Boolean),
    selectedRecordKeys: formData.getAll("selectedRecordKeys").map(String).filter(Boolean),
    sessionId: String(formData.get("sessionId") ?? ""),
  });
  if (parsed.decision === "cancel") {
    await service.cancelSync(parsed.sessionId);
    revalidatePath("/erp/hr/attendance-devices");
    return { cancelled: true };
  }
  if (parsed.importWithoutProcessing) {
    await requirePermission({ context, permission: HR_PERMISSIONS.attendanceReopen });
  }
  const report = await service.importSync(parsed.sessionId, parsed.decision, {
    importWithoutProcessing: parsed.importWithoutProcessing,
    selectedDays: parsed.selectedDays,
    selectedEmployeeIds: parsed.selectedEmployeeIds,
    selectedRecordKeys: parsed.selectedRecordKeys,
  });
  revalidatePath("/erp/hr/attendance-devices");
  return report;
}

export async function saveHrAttendanceDeviceMappingAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const parsed = hrAttendanceDeviceMappingSchema.parse({
    deviceEmployeeCode: String(formData.get("deviceEmployeeCode") ?? ""),
    deviceId: String(formData.get("deviceId") ?? ""),
    employeeId: String(formData.get("employeeId") ?? ""),
    sessionId: String(formData.get("sessionId") ?? "") || undefined,
  });
  await service.saveEmployeeMapping(parsed);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function cancelHrAttendanceDeviceSyncSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  await cancelHrAttendanceDeviceSyncAction(sessionId);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function runHrAttendanceDeviceConnectionAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const deviceId = String(formData.get("deviceId") ?? "");
  const action = String(formData.get("connectionAction") ?? "ping");
  const diagnosticAction =
    action === "reconnect" ? "restart_connection" : action === "resolve_dns" ? "test_connection" : "ping";
  await service.runDiagnostic(deviceId, diagnosticAction);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function runHrAttendanceDeviceDiagnosticAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const deviceId = String(formData.get("deviceId") ?? "");
  const action = String(formData.get("diagnosticAction") ?? "");
  await service.runDiagnostic(deviceId, action);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function deleteHrAttendanceDeviceSyncSessionAction(formData: FormData) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesManage });
  const sessionId = String(formData.get("sessionId") ?? "");
  await service.deleteSyncSession(sessionId);
  revalidatePath("/erp/hr/attendance-devices");
}

export async function advanceHrAttendanceDeviceSyncAction(sessionId: string) {
  const { context, service } = await deviceService();
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesSync });
  return service.advanceSync(sessionId);
}
