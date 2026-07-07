import { z } from "zod";

import {
  HR_ATTENDANCE_AUTO_SYNC_INTERVALS,
  HR_ATTENDANCE_DEVICE_HEALTH_STATUSES,
  HR_ATTENDANCE_DEVICE_IMPORT_MODES,
  HR_ATTENDANCE_DEVICE_SYNC_MODES,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES,
} from "../constants/hr-attendance-device.constants";
import { HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS } from "../utils/hr-attendance-device-sync-strategy";

export const hrAttendanceDeviceListQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  deviceType: z.string().optional(),
  firmware: z.string().optional(),
  healthStatus: z.enum(HR_ATTENDANCE_DEVICE_HEALTH_STATUSES).optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const HR_ATTENDANCE_DEVICE_TCP_TYPES = ["zkteco", "suprema", "anviz", "fingertec"] as const;

export const HR_ATTENDANCE_DEVICE_DEFAULT_PORTS: Record<string, number> = {
  anviz: 5010,
  fingertec: 4370,
  suprema: 1470,
  zkteco: 4370,
};

export const hrAttendanceDeviceCreateSchema = z.object({
  autoSyncInterval: z.enum(HR_ATTENDANCE_AUTO_SYNC_INTERVALS).default("disabled"),
  code: z.string().trim().min(1).max(50),
  commKey: z.string().trim().max(50).optional(),
  deviceType: z.string().trim().min(1),
  firmwareVersion: z.string().trim().max(100).optional(),
  ipAddress: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1).max(200),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  serialNumber: z.string().trim().max(100).optional(),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  workLocationId: z.string().uuid().optional(),
});

export const hrAttendanceDeviceUpdateSchema = hrAttendanceDeviceCreateSchema.partial().extend({
  clearCommKey: z.coerce.boolean().optional(),
  id: z.string().uuid(),
});

export const hrAttendanceDeviceSyncOptionsSchema = z.object({
  autoBuildPreview: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.autoBuildPreview),
  dryRun: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.dryRun),
  includeBreakPunches: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeBreakPunches),
  includeCheckIn: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeCheckIn),
  includeCheckOut: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeCheckOut),
  includeDeviceEvents: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeDeviceEvents),
  includeInvalidPunches: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeInvalidPunches),
  includeManualPunches: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.includeManualPunches),
  recalculateAttendance: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.recalculateAttendance),
  skipDuplicates: z.coerce.boolean().default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS.skipDuplicates),
});

export const hrAttendanceDeviceStrategyParamsSchema = z.object({
  branchId: z.string().uuid().optional(),
  businessUnitId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
  deviceIds: z.array(z.string().uuid()).optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
  locationId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  shiftId: z.string().uuid().optional(),
  specificDate: z.string().optional(),
  teamId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const hrAttendanceDeviceEnterpriseSyncSchema = z.object({
  deviceId: z.string().uuid(),
  options: hrAttendanceDeviceSyncOptionsSchema.default(HR_ATTENDANCE_DEVICE_DEFAULT_SYNC_OPTIONS),
  params: hrAttendanceDeviceStrategyParamsSchema.default({}),
  strategy: z.enum(HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES).default("incremental"),
});

export const hrAttendanceDeviceImportDecisionSchema = z.object({
  decision: z.enum(HR_ATTENDANCE_DEVICE_IMPORT_MODES),
  importWithoutProcessing: z.coerce.boolean().optional(),
  selectedDays: z.array(z.string()).optional(),
  selectedEmployeeIds: z.array(z.string().uuid()).optional(),
  selectedRecordKeys: z.array(z.string()).optional(),
  sessionId: z.string().uuid(),
});

export const hrAttendanceDeviceMappingSchema = z.object({
  deviceEmployeeCode: z.string().trim().min(1).max(50),
  deviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});

export const hrAttendanceDeviceSyncModeSchema = z.object({
  deviceId: z.string().uuid(),
  mode: z.enum(HR_ATTENDANCE_DEVICE_SYNC_MODES).default("quick"),
});

export const hrAttendanceDeviceUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
});

export const hrAttendanceDevicePunchesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  direction: z.enum(["in", "out"]).optional(),
  employeeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().optional(),
});
