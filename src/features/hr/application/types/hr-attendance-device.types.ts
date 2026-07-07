import type {
  HR_ATTENDANCE_AUTO_SYNC_INTERVALS,
  HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS,
  HR_ATTENDANCE_DEVICE_HEALTH_STATUSES,
  HR_ATTENDANCE_DEVICE_SYNC_MODES,
  HR_ATTENDANCE_DEVICE_SYNC_PHASES,
  HR_ATTENDANCE_DEVICE_SYNC_STATUSES,
  HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES,
  HR_ATTENDANCE_VALIDATION_SEVERITIES,
} from "../constants/hr-attendance-device.constants";
import type {
  HrAttendanceDeviceSyncOptions,
  HrAttendanceDeviceSyncRecommendation,
  HrAttendanceDeviceStrategyParams,
} from "../utils/hr-attendance-device-sync-strategy";
import type { HrDeviceDriverDescriptor } from "../device-drivers/types";

export type HrAttendanceDeviceHealthStatus = (typeof HR_ATTENDANCE_DEVICE_HEALTH_STATUSES)[number];
export type HrAttendanceDeviceSyncStatus = (typeof HR_ATTENDANCE_DEVICE_SYNC_STATUSES)[number];
export type HrAttendanceDeviceSyncPhase = (typeof HR_ATTENDANCE_DEVICE_SYNC_PHASES)[number];
export type HrAttendanceAutoSyncInterval = (typeof HR_ATTENDANCE_AUTO_SYNC_INTERVALS)[number];
export type HrAttendanceValidationSeverity = (typeof HR_ATTENDANCE_VALIDATION_SEVERITIES)[number];
export type HrAttendanceDeviceSyncMode = (typeof HR_ATTENDANCE_DEVICE_SYNC_MODES)[number];
export type HrAttendanceDeviceSyncStrategy = (typeof HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES)[number];
export type HrAttendanceDeviceDiagnosticAction = (typeof HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS)[number];
export type HrAttendanceDeviceHealthDimensionStatus = "healthy" | "warning" | "critical";

export type HrAttendanceDeviceEmployeeMatchStatus =
  | "matched"
  | "new"
  | "updated"
  | "unknown"
  | "conflict";

export type HrAttendanceDevicePunchImportResult =
  | "ready"
  | "duplicate"
  | "warning"
  | "error"
  | "blocked";

export type HrAttendanceDeviceValidationIssue = Readonly<{
  code: string;
  message: string;
  punchIndex?: number;
  employeeCode?: string;
  severity: HrAttendanceValidationSeverity;
}>;

export type HrAttendanceDevicePreviewEmployee = Readonly<{
  attendanceCode: string;
  deviceCode: string;
  employeeId: string | null;
  employeeLabel: string;
  matchStatus: HrAttendanceDeviceEmployeeMatchStatus;
}>;

export type HrAttendanceDevicePreviewPunch = Readonly<{
  attendanceCode: string;
  deviceCode: string;
  employeeId: string | null;
  employeeLabel: string;
  importResult: HrAttendanceDevicePunchImportResult;
  punchTime: string;
  punchType: "in" | "out";
  validationMessages: readonly string[];
}>;

export type HrAttendanceDevicePreviewSummary = Readonly<{
  blockingErrors: number;
  duplicates: number;
  employeesMatched: number;
  employeesNew: number;
  employeesRead: number;
  employeesUnknown: number;
  employeesUpdated: number;
  errors: number;
  estimatedImportSeconds: number;
  punchesReady: number;
  punchesRead: number;
  warnings: number;
}>;

export type HrAttendanceDevicePreviewPayload = Readonly<{
  employees: readonly HrAttendanceDevicePreviewEmployee[];
  issues: readonly HrAttendanceDeviceValidationIssue[];
  punches: readonly HrAttendanceDevicePreviewPunch[];
  summary: HrAttendanceDevicePreviewSummary;
}>;

export type HrAttendanceDeviceHealthDimensions = Readonly<{
  clock: HrAttendanceDeviceHealthDimensionStatus;
  firmware: HrAttendanceDeviceHealthDimensionStatus;
  heartbeat: HrAttendanceDeviceHealthDimensionStatus;
  network: HrAttendanceDeviceHealthDimensionStatus;
  overallScorePercent: number;
  queue: HrAttendanceDeviceHealthDimensionStatus;
  storage: HrAttendanceDeviceHealthDimensionStatus;
  sync: HrAttendanceDeviceHealthDimensionStatus;
}>;

export type HrAttendanceDeviceListRecord = Readonly<{
  autoSyncInterval: HrAttendanceAutoSyncInterval;
  autoSyncLabel: string;
  branchLabel: string;
  code: string;
  companyLabel: string;
  connectionQuality: string;
  currentJobLabel: string | null;
  deviceType: string;
  employeesLoaded: number;
  failedImportsToday: number;
  firmware: string | null;
  healthDimensions: HrAttendanceDeviceHealthDimensions;
  healthScore: string | null;
  healthStatus: HrAttendanceDeviceHealthStatus;
  id: string;
  importedToday: number;
  ipAddress: string | null;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  latencyMs: number | null;
  locationLabel: string | null;
  model: string | null;
  name: string;
  nextAutoSyncAt: string | null;
  pendingQueue: number;
  port: number | null;
  serialNumber: string | null;
  status: string;
  timezone: string;
  todayPunches: number;
  vendor: string | null;
}>;

export type HrAttendanceDeviceDetailRecord = Readonly<{
  autoSyncInterval: HrAttendanceAutoSyncInterval;
  branchLabel: string;
  clockDriftSeconds: number;
  code: string;
  connectionQuality: string;
  cpuUsagePct: number | null;
  deviceTimeAt: string | null;
  deviceType: string;
  driverKey: string | null;
  employeesLoaded: number;
  failedImportsToday: number;
  firmware: string | null;
  healthDimensions: HrAttendanceDeviceHealthDimensions;
  healthScore: string | null;
  healthStatus: HrAttendanceDeviceHealthStatus;
  hostname: string | null;
  id: string;
  importedToday: number;
  ipAddress: string | null;
  lastHeartbeatAt: string | null;
  lastRestartAt: string | null;
  lastSyncAt: string | null;
  latencyMs: number | null;
  macAddress: string | null;
  memoryUsagePct: number | null;
  model: string | null;
  name: string;
  networkStatus: string;
  nextAutoSyncAt: string | null;
  operatorLabel: string | null;
  pendingQueue: number;
  port: number | null;
  protocol: string;
  sdkVersion: string | null;
  serialNumber: string | null;
  status: string;
  storageUsagePct: number | null;
  temperatureC: number | null;
  timezone: string;
  todayPunches: number;
  vendor: string | null;
}>;

export type HrAttendanceDeviceConnectionSnapshot = Readonly<{
  heartbeatHistory: readonly { at: string; latencyMs: number | null; status: string }[];
  hostname: string | null;
  ipAddress: string | null;
  latencyHistory: readonly { at: string; latencyMs: number }[];
  macAddress: string | null;
  packetLossPct: number | null;
  port: number | null;
  protocol: string;
}>;

export type HrAttendanceDeviceRealtimeEvent = Readonly<{
  deviceCode: string;
  direction: "in" | "out";
  employeeLabel: string;
  id: string;
  punchTime: string;
  status: string;
}>;

export type HrAttendanceDeviceUserRecord = Readonly<{
  deviceCode: string;
  employeeId: string | null;
  employeeLabel: string;
  employeeStatus: string | null;
  id: string;
  isDuplicate: boolean;
  isInactive: boolean;
  isUnmapped: boolean;
  lastSyncAt: string | null;
}>;

export type HrAttendanceDevicePunchRecord = Readonly<{
  branchLabel: string | null;
  deviceCode: string;
  direction: "in" | "out";
  employeeLabel: string;
  id: string;
  punchTime: string;
  processingStatus: string;
  source: string;
}>;

export type HrAttendanceDeviceDiagnosticRecord = Readonly<{
  action: string;
  createdAt: string;
  durationMs: number | null;
  id: string;
  message: string;
  resultStatus: HrAttendanceDeviceHealthDimensionStatus;
}>;

export type HrAttendanceDeviceAuditRecord = Readonly<{
  action: string;
  actorLabel: string;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
}>;

export type HrAttendanceDeviceAnalytics = Readonly<{
  availabilityPct: number;
  importTrend: readonly { date: string; imported: number }[];
  offlinePct: number;
  punchesThisWeek: readonly { date: string; count: number }[];
  punchesToday: number;
  syncDurationTrend: readonly { date: string; durationSeconds: number }[];
  topErrors: readonly { count: number; message: string }[];
  usageHours: readonly { hour: number; punches: number }[];
}>;

export type HrAttendanceDeviceFleetAnalytics = Readonly<{
  availabilityPct: number;
  deviceUsage: readonly { deviceCode: string; deviceName: string; punches: number }[];
  importTrend: readonly { date: string; imported: number }[];
  offlinePct: number;
  punchesThisWeek: readonly { date: string; count: number }[];
  punchesToday: number;
  syncDurationTrend: readonly { date: string; durationSeconds: number }[];
  topErrors: readonly { count: number; message: string }[];
}>;

export type HrAttendanceDeviceDashboardKpis = Readonly<{
  avgSyncDurationSeconds: number;
  connectedCount: number;
  importErrors: number;
  lastSuccessfulSyncAt: string | null;
  offlineCount: number;
  pendingImports: number;
  syncingCount: number;
  todayPunches: number;
}>;

export type HrAttendanceDeviceSyncProgress = Readonly<{
  currentDate: string | null;
  currentDeviceLabel: string | null;
  currentEmployeeLabel: string | null;
  currentRecordLabel: string | null;
  currentTask: string | null;
  deviceId: string;
  elapsedSeconds: number | null;
  errorCount: number;
  errorMessage: string | null;
  etaSeconds: number | null;
  importedCount: number;
  logs: readonly { createdAt: string; level: string; message: string }[];
  phase: HrAttendanceDeviceSyncPhase;
  phaseMessage: string;
  previewReady: boolean;
  progress: number;
  recordsProcessed: number;
  recordsTotal: number;
  remainingCount: number;
  sessionId: string;
  speedRecordsPerSec: number;
  status: HrAttendanceDeviceSyncStatus;
  strategy: HrAttendanceDeviceSyncStrategy | null;
  summary: HrAttendanceDevicePreviewSummary | null;
  validationCount: number;
  warningCount: number;
}>;

export type HrAttendanceDeviceSyncHistoryRecord = Readonly<{
  cancelled: boolean;
  checkpointAt: string | null;
  completedAt: string | null;
  deviceCode: string;
  deviceId: string;
  deviceName: string;
  durationSeconds: number | null;
  errorCount: number;
  errorMessage: string | null;
  id: string;
  importedCount: number;
  operatorLabel: string | null;
  progress: number;
  recordsSkipped: number;
  startedAt: string | null;
  status: HrAttendanceDeviceSyncStatus;
  strategy: HrAttendanceDeviceSyncStrategy | null;
  strategyLabel: string | null;
  summary: HrAttendanceDevicePreviewSummary | null;
  warningCount: number;
}>;

export type HrAttendanceDeviceSyncStartContext = Readonly<{
  lastSuccessfulSyncAt: string | null;
  recommendations: readonly HrAttendanceDeviceSyncRecommendation[];
  recordsSinceLastSync: number;
}>;

export type { HrAttendanceDeviceSyncOptions, HrAttendanceDeviceSyncRecommendation, HrAttendanceDeviceStrategyParams };

export type HrAttendanceDeviceImportReport = Readonly<{
  blockingSkipped: number;
  completedAt: string;
  deviceCode: string;
  deviceName: string;
  duplicatesSkipped: number;
  importedCount: number;
  sessionId: string;
  warningsCount: number;
}>;

export type HrAttendanceDeviceEditRecord = Readonly<{
  autoSyncInterval: string;
  code: string;
  deviceType: string;
  firmwareVersion: string;
  id: string;
  ipAddress: string;
  name: string;
  port: string;
  serialNumber: string;
  status: string;
  timezone: string;
  workLocationId: string;
}>;

export type HrAttendanceDevicesWorkspaceData = Readonly<{
  analytics: HrAttendanceDeviceFleetAnalytics;
  autoSyncOptions: readonly string[];
  deviceDriverSimulation: boolean;
  deviceTypeOptions: readonly string[];
  driverDescriptors: readonly HrDeviceDriverDescriptor[];
  healthStatusOptions: readonly string[];
  history: readonly HrAttendanceDeviceSyncHistoryRecord[];
  kpis: HrAttendanceDeviceDashboardKpis;
  nextCursor: string | null;
  pageSize: number;
  records: readonly HrAttendanceDeviceListRecord[];
  statusOptions: readonly string[];
}>;
