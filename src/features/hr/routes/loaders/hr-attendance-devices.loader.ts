import "server-only";

import { resolveBranchRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { isHrDeviceDriverSimulationEnabled } from "../../application/device-drivers/driver-simulation";
import { listDeviceDriverDescriptors } from "../../application/device-drivers/registry";
import { hrAttendanceDeviceListQuerySchema, hrAttendanceDevicePunchesQuerySchema, hrAttendanceDeviceUsersQuerySchema } from "../../application/schemas/hr-attendance-device.schema";
import { HrAttendanceDeviceService } from "../../application/services/hr-attendance-device.service";
import { HrAttendanceDeviceCenterService } from "../../application/services/hr-attendance-device-center.service";
import type {
  HrAttendanceDeviceEditRecord,
  HrAttendanceDevicePreviewPayload,
  HrAttendanceDevicesWorkspaceData,
} from "../../application/types/hr-attendance-device.types";
import { HR_PERMISSIONS } from "../../permissions/permission-registry";

export async function loadHrAttendanceDevicesWorkspace(query: unknown = {}): Promise<HrAttendanceDevicesWorkspaceData> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesView });
  const parsed = hrAttendanceDeviceListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceDeviceService(supabase, context);
  const centerService = new HrAttendanceDeviceCenterService(supabase, context);

  const [kpis, devices, history, analytics] = await Promise.all([
    service.loadDashboardKpis(),
    service.loadDevices(parsed),
    service.loadSyncHistory(50),
    centerService.loadFleetAnalytics(),
  ]);

  return {
    analytics,
    autoSyncOptions: ["disabled", "5min", "15min", "30min", "hourly", "daily", "weekly"],
    deviceDriverSimulation: isHrDeviceDriverSimulationEnabled(),
    deviceTypeOptions: ["zkteco", "suprema", "anviz", "fingertec", "cloud_attendance", "excel_import", "api_import"],
    driverDescriptors: listDeviceDriverDescriptors(),
    healthStatusOptions: ["online", "connecting", "sync_running", "offline", "never_connected"],
    history,
    kpis,
    nextCursor: devices.nextCursor,
    pageSize: parsed.pageSize,
    records: devices.records,
    statusOptions: ["draft", "active", "inactive", "archived"],
  };
}

export async function loadHrAttendanceDevicePreview(sessionId: string): Promise<HrAttendanceDevicePreviewPayload | null> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceDeviceService(supabase, context);
  return service.loadPreview(sessionId);
}

export async function loadHrAttendanceDeviceLogs(deviceId: string) {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.attendanceDevicesLogsView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const service = new HrAttendanceDeviceService(supabase, context);
  return service.loadDeviceLogs(deviceId);
}

async function centerService() {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return new HrAttendanceDeviceCenterService(supabase, context);
}

export async function loadHrAttendanceDeviceDetail(deviceId: string) {
  return (await centerService()).loadDeviceDetail(deviceId);
}

export async function loadHrAttendanceDeviceConnection(deviceId: string) {
  return (await centerService()).loadConnectionSnapshot(deviceId);
}

export async function loadHrAttendanceDeviceRealtime(deviceId: string) {
  return (await centerService()).loadRealtimeEvents(deviceId);
}

export async function loadHrAttendanceDeviceUsers(deviceId: string, query: unknown = {}) {
  const parsed = hrAttendanceDeviceUsersQuerySchema.parse(query);
  return (await centerService()).loadDeviceUsers(deviceId, parsed);
}

export async function loadHrAttendanceDevicePunches(deviceId: string, query: unknown = {}) {
  const parsed = hrAttendanceDevicePunchesQuerySchema.parse(query);
  return (await centerService()).loadDevicePunches(deviceId, parsed);
}

export async function loadHrAttendanceDeviceDiagnostics(deviceId: string) {
  return (await centerService()).loadDiagnosticHistory(deviceId);
}

export async function loadHrAttendanceDeviceAuditTrail(deviceId: string) {
  return (await centerService()).loadDeviceAudit(deviceId);
}

export async function loadHrAttendanceDeviceAnalytics(deviceId: string) {
  return (await centerService()).loadDeviceAnalytics(deviceId);
}

export async function loadHrAttendanceDeviceForEdit(deviceId: string): Promise<HrAttendanceDeviceEditRecord | null> {
  const context = await resolveBranchRequestContext("erp");
  await requirePermission({ context, permission: HR_PERMISSIONS.devicesView });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const { data, error } = await supabase
    .from("hr_attendance_devices")
    .select("id, code, name, device_type, ip_address, port, timezone, firmware_version, serial_number, auto_sync_interval, work_location_id, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", deviceId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return {
    autoSyncInterval: String(data.auto_sync_interval ?? "disabled"),
    code: String(data.code),
    deviceType: String(data.device_type),
    firmwareVersion: data.firmware_version ? String(data.firmware_version) : "",
    id: String(data.id),
    ipAddress: data.ip_address ? String(data.ip_address) : "",
    name: String(data.name),
    port: data.port !== null && data.port !== undefined ? String(data.port) : "",
    serialNumber: data.serial_number ? String(data.serial_number) : "",
    status: String(data.status),
    timezone: String(data.timezone ?? "UTC"),
    workLocationId: data.work_location_id ? String(data.work_location_id) : "",
  };
}
