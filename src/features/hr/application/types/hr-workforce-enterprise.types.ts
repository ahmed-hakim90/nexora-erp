import type {
  HR_AI_WORKFORCE_INSIGHT_TYPES,
  HR_ATTENDANCE_RECALC_REASONS,
  HR_ATTENDANCE_REPLAY_SCOPES,
  HR_DEVICE_COMMAND_KEYS,
  HR_DEVICE_HEALTH_SCORES,
  HR_WORKFORCE_ALERT_KEYS,
  HR_WORKFORCE_ENTERPRISE_REPORT_KEYS,
} from "../constants/hr-workforce-enterprise.constants";

export type HrDeviceCommandKey = (typeof HR_DEVICE_COMMAND_KEYS)[number];
export type HrDeviceHealthScore = (typeof HR_DEVICE_HEALTH_SCORES)[number];
export type HrWorkforceAlertKey = (typeof HR_WORKFORCE_ALERT_KEYS)[number];
export type HrAttendanceReplayScope = (typeof HR_ATTENDANCE_REPLAY_SCOPES)[number];
export type HrAttendanceRecalcReason = (typeof HR_ATTENDANCE_RECALC_REASONS)[number];
export type HrWorkforceEnterpriseReportKey = (typeof HR_WORKFORCE_ENTERPRISE_REPORT_KEYS)[number];
export type HrAiWorkforceInsightType = (typeof HR_AI_WORKFORCE_INSIGHT_TYPES)[number];

export type HrDeviceCommandRecord = Readonly<{
  commandKey: HrDeviceCommandKey;
  completedAt: string | null;
  correlationId: string;
  deviceCode: string;
  deviceId: string;
  deviceName: string;
  durationMs: number | null;
  errorMessage: string | null;
  id: string;
  requiresConfirmation: boolean;
  startedAt: string | null;
  status: string;
}>;

export type HrDeviceHealthSnapshot = Readonly<{
  clockDriftSeconds: number;
  connectionStatus: string;
  cpuUsagePct: number | null;
  currentPunches: number;
  currentUsers: number;
  firmwareVersion: string | null;
  healthScore: HrDeviceHealthScore;
  id: string;
  latencyMs: number | null;
  memoryUsagePct: number | null;
  networkStatus: string;
  sdkVersion: string | null;
  snapshotAt: string;
  storageUsagePct: number | null;
  temperatureC: number | null;
  voltageV: number | null;
}>;

export type HrWorkforceLiveMonitorSnapshot = Readonly<{
  currentOvertimeCount: number;
  devicesOffline: number;
  devicesSyncing: number;
  employeesInside: number;
  employeesOutside: number;
  lateAbsentCount: number;
  liveArrivals: readonly { employeeLabel: string; punchTime: string }[];
  liveDepartures: readonly { employeeLabel: string; punchTime: string }[];
  missingPunchCount: number;
  snapshotAt: string;
}>;

export type HrWorkforceAlertRecord = Readonly<{
  alertKey: HrWorkforceAlertKey;
  body: string;
  createdAt: string;
  deviceCode: string | null;
  id: string;
  severity: string;
  status: string;
  title: string;
}>;

export type HrAttendanceReplaySessionRecord = Readonly<{
  approvedAt: string | null;
  id: string;
  periodEnd: string | null;
  periodStart: string | null;
  progress: number;
  publishedAt: string | null;
  scopeKind: HrAttendanceReplayScope;
  scopeRef: string;
  status: string;
}>;

export type HrAttendanceRecalcSessionRecord = Readonly<{
  affectedEmployeeCount: number;
  durationMs: number | null;
  id: string;
  periodEnd: string | null;
  periodStart: string | null;
  progress: number;
  reasonKey: HrAttendanceRecalcReason;
  reasonLabel: string;
  scopeKind: string;
  status: string;
}>;

export type HrWorkforceQueueMetricsSnapshot = Readonly<{
  avgExecutionMs: number;
  avgWaitMs: number;
  cancelledCount: number;
  completedCount: number;
  deadLetterCount: number;
  failedCount: number;
  queueKey: string;
  retryCount: number;
  runningCount: number;
  snapshotAt: string;
  waitingCount: number;
}>;

export type HrDeviceMapNode = Readonly<{
  building: string | null;
  children: readonly HrDeviceMapNode[];
  deviceCount: number;
  floor: string | null;
  healthScore: HrDeviceHealthScore | null;
  id: string;
  kind: "company" | "branch" | "building" | "floor" | "zone" | "device";
  label: string;
  offlineCount: number;
  productionLine: string | null;
  warningCount: number;
  zone: string | null;
}>;

export type HrDeviceCapacitySnapshot = Readonly<{
  cardCapacity: number;
  cardCount: number;
  cardRemaining: number;
  deviceCode: string;
  deviceId: string;
  deviceName: string;
  faceCapacity: number;
  faceCount: number;
  faceRemaining: number;
  fingerprintCapacity: number;
  fingerprintCount: number;
  fingerprintRemaining: number;
  memoryUsagePct: number;
  predictedFullAt: string | null;
  punchCapacity: number;
  punchCount: number;
  punchRemaining: number;
  storageUsagePct: number;
  userCapacity: number;
  userCount: number;
  userRemaining: number;
}>;

export type HrAttendanceRuleSimulationResult = Readonly<{
  blockingConflicts: readonly string[];
  employeesAffected: number;
  estimatedLateDeductions: number;
  estimatedOvertimeChanges: number;
  estimatedPayrollImpact: number;
  leaveImpactCount: number;
  warnings: readonly string[];
}>;

export type HrAiWorkforceInsight = Readonly<{
  confidence: number;
  description: string;
  insightType: HrAiWorkforceInsightType;
  recommendation: string;
  severity: "low" | "medium" | "high";
  subjectLabel: string;
}>;

export type HrBulkOperationProgress = Readonly<{
  completed: number;
  failed: number;
  operationKey: string;
  running: number;
  total: number;
}>;

export type HrWorkforceObservabilitySnapshot = Readonly<{
  avgDeviceResponseMs: number;
  avgImportDurationMs: number;
  avgQueueTimeMs: number;
  correlationIds: readonly string[];
  eventCount: number;
  logCount: number;
  metricCount: number;
  snapshotAt: string;
  traceCount: number;
}>;

export type HrWorkforceEnterpriseWorkspaceData = Readonly<{
  alerts: readonly HrWorkforceAlertRecord[];
  capacitySnapshots: readonly HrDeviceCapacitySnapshot[];
  commandHistory: readonly HrDeviceCommandRecord[];
  deviceMap: HrDeviceMapNode | null;
  insights: readonly HrAiWorkforceInsight[];
  liveMonitor: HrWorkforceLiveMonitorSnapshot;
  observability: HrWorkforceObservabilitySnapshot;
  queueMetrics: readonly HrWorkforceQueueMetricsSnapshot[];
  recalcSessions: readonly HrAttendanceRecalcSessionRecord[];
  replaySessions: readonly HrAttendanceReplaySessionRecord[];
}>;
