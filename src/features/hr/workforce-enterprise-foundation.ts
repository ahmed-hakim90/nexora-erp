import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";

import {
  HR_AI_WORKFORCE_INSIGHT_TYPES,
  HR_ATTENDANCE_RECALC_REASONS,
  HR_ATTENDANCE_REPLAY_SCOPES,
  HR_DEVICE_COMMAND_KEYS,
  HR_DEVICE_HEALTH_SCORES,
  HR_WORKFORCE_ALERT_KEYS,
  HR_WORKFORCE_ENTERPRISE_EVENT_KEYS,
  HR_WORKFORCE_ENTERPRISE_JOB_KEYS,
  HR_WORKFORCE_ENTERPRISE_REPORT_KEYS,
} from "./application/constants/hr-workforce-enterprise.constants";
import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrWorkforceEnterpriseReadinessContract = Readonly<{
  driverFrameworkImplemented: true;
  commandCenterImplemented: true;
  healthMonitoringImplemented: true;
  timeDriftEngineImplemented: true;
  configVersioningImplemented: true;
  liveMonitorImplemented: true;
  replayCenterImplemented: true;
  recalculationCenterImplemented: true;
  queueManagerImplemented: true;
  deviceMapImplemented: true;
  alertCenterImplemented: true;
  aiInsightsReadinessImplemented: true;
  ruleSimulationImplemented: true;
  bulkOperationsImplemented: true;
  capacityMonitoringImplemented: true;
  autoRecoveryImplemented: true;
  observabilityImplemented: true;
  disasterRecoveryImplemented: true;
  multiCompanyIsolationEnforced: true;
  key: "hr.workforce.enterprise-hardening";
}>;

export const HR_WORKFORCE_ENTERPRISE_READINESS: HrWorkforceEnterpriseReadinessContract = {
  aiInsightsReadinessImplemented: true,
  alertCenterImplemented: true,
  autoRecoveryImplemented: true,
  bulkOperationsImplemented: true,
  capacityMonitoringImplemented: true,
  commandCenterImplemented: true,
  configVersioningImplemented: true,
  deviceMapImplemented: true,
  disasterRecoveryImplemented: true,
  driverFrameworkImplemented: true,
  healthMonitoringImplemented: true,
  key: "hr.workforce.enterprise-hardening",
  liveMonitorImplemented: true,
  multiCompanyIsolationEnforced: true,
  observabilityImplemented: true,
  queueManagerImplemented: true,
  recalculationCenterImplemented: true,
  replayCenterImplemented: true,
  ruleSimulationImplemented: true,
  timeDriftEngineImplemented: true,
};

export const HR_WORKFORCE_ENTERPRISE_AUDIT_ACTIONS = {
  commandCompleted: defineAuditAction("hr.workforce.device.command.completed"),
  commandFailed: defineAuditAction("hr.workforce.device.command.failed"),
  configVersionCreated: defineAuditAction("hr.workforce.device.config.version.created"),
  recalcStarted: defineAuditAction("hr.workforce.attendance.recalc.started"),
  replayPublished: defineAuditAction("hr.workforce.attendance.replay.published"),
  timeDriftCorrected: defineAuditAction("hr.workforce.device.time.drift.corrected"),
} as const;

export const HR_WORKFORCE_ENTERPRISE_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Device command execution started.",
    kind: "domain",
    name: definePlatformEventName(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.commandStarted),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Workforce alert created.",
    kind: "domain",
    name: definePlatformEventName(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.alertCreated),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Attendance replay completed.",
    kind: "domain",
    name: definePlatformEventName(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.replayCompleted),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Attendance recalculation completed.",
    kind: "domain",
    name: definePlatformEventName(HR_WORKFORCE_ENTERPRISE_EVENT_KEYS.recalcCompleted),
    source: "business-app",
    version: 1,
  }),
] as const;

export const HR_WORKFORCE_ENTERPRISE_REPORTS = HR_WORKFORCE_ENTERPRISE_REPORT_KEYS.map((key) => ({
  datasetKey: `hr.workforce.${key}`,
  exportFormats: ["pdf", "excel", "print"] as const,
  key: `hr.workforce.report.${key}`,
  label: key.replaceAll("_", " "),
  requiredPermission: HR_PERMISSIONS.workforceReportsView,
  schedulable: true,
}));

export const HR_WORKFORCE_ENTERPRISE_PERMISSION_METADATA = [
  { entity: "device-command", key: HR_PERMISSIONS.attendanceDevicesCommandsRun, scope: "tenant-company-branch" },
  { entity: "device-health", key: HR_PERMISSIONS.attendanceDevicesDiagnosticsView, scope: "tenant-company-branch" },
  { entity: "attendance-replay", key: HR_PERMISSIONS.attendanceReplayManage, scope: "tenant-company" },
  { entity: "attendance-recalc", key: HR_PERMISSIONS.attendanceRecalculateManage, scope: "tenant-company" },
  { entity: "workforce-monitor", key: HR_PERMISSIONS.workforceMonitorView, scope: "tenant-company-branch" },
] as const;

export {
  HR_AI_WORKFORCE_INSIGHT_TYPES,
  HR_ATTENDANCE_RECALC_REASONS,
  HR_ATTENDANCE_REPLAY_SCOPES,
  HR_DEVICE_COMMAND_KEYS,
  HR_DEVICE_HEALTH_SCORES,
  HR_WORKFORCE_ALERT_KEYS,
  HR_WORKFORCE_ENTERPRISE_EVENT_KEYS,
  HR_WORKFORCE_ENTERPRISE_JOB_KEYS,
  HR_WORKFORCE_ENTERPRISE_REPORT_KEYS,
};
