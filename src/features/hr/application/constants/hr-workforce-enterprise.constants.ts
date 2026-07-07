export const HR_WORKFORCE_ENTERPRISE_QUEUE_KEYS = [
  "hr-attendance-device",
  "hr-workforce-monitoring",
  "hr-workforce-replay",
  "hr-workforce-recalculation",
  "hr-workforce-recovery",
  "hr-workforce-alerts",
] as const;

export const HR_DEVICE_COMMAND_KEYS = [
  "test_connection",
  "ping",
  "restart",
  "shutdown",
  "sync_time",
  "backup",
  "restore",
  "clear_attendance_logs",
  "clear_users",
  "upload_users",
  "download_users",
  "upload_fingerprints",
  "upload_faces",
  "upload_cards",
  "read_configuration",
  "write_configuration",
  "factory_reset",
] as const;

export const HR_DEVICE_SENSITIVE_COMMANDS = new Set([
  "restart",
  "shutdown",
  "factory_reset",
  "clear_attendance_logs",
  "clear_users",
  "restore",
  "write_configuration",
]);

export const HR_DEVICE_HEALTH_SCORES = [
  "healthy",
  "warning",
  "critical",
  "offline",
  "maintenance",
] as const;

export const HR_WORKFORCE_ALERT_KEYS = [
  "device_offline",
  "high_time_drift",
  "storage_full",
  "heartbeat_lost",
  "low_capacity",
  "repeated_failures",
  "abnormal_punch_volume",
  "duplicate_attendance_spike",
  "sync_timeout",
] as const;

export const HR_ATTENDANCE_REPLAY_SCOPES = [
  "employee",
  "department",
  "branch",
  "company",
  "payroll_period",
] as const;

export const HR_ATTENDANCE_RECALC_REASONS = [
  "shift_change",
  "leave_approval",
  "holiday_update",
  "policy_change",
  "overtime_update",
  "late_rule_change",
  "grace_period_update",
  "manual_adjustment",
] as const;

export const HR_WORKFORCE_ENTERPRISE_JOB_KEYS = {
  autoRecovery: "hr.workforce.auto-recovery",
  autoSync: "hr.workforce.auto-sync",
  capacityMonitor: "hr.workforce.capacity-monitor",
  cleanup: "hr.workforce.cleanup",
  deviceHeartbeat: "hr.workforce.device-heartbeat",
  deviceMonitor: "hr.workforce.device-monitor",
  notificationDispatch: "hr.workforce.notification-dispatch",
  queueProcessor: "hr.workforce.queue-processor",
  recalculation: "hr.workforce.recalculation",
  replay: "hr.workforce.replay",
  retry: "hr.workforce.retry",
} as const;

export const HR_WORKFORCE_ENTERPRISE_EVENT_KEYS = {
  alertCreated: "hr.workforce.alert.created",
  alertResolved: "hr.workforce.alert.resolved",
  commandCompleted: "hr.workforce.device.command.completed",
  commandFailed: "hr.workforce.device.command.failed",
  commandStarted: "hr.workforce.device.command.started",
  configVersionCreated: "hr.workforce.device.config.version.created",
  healthCritical: "hr.workforce.device.health.critical",
  healthWarning: "hr.workforce.device.health.warning",
  incidentEscalated: "hr.workforce.recovery.incident.escalated",
  recalcApproved: "hr.workforce.attendance.recalc.approved",
  recalcCompleted: "hr.workforce.attendance.recalc.completed",
  recalcStarted: "hr.workforce.attendance.recalc.started",
  replayApproved: "hr.workforce.attendance.replay.approved",
  replayCompleted: "hr.workforce.attendance.replay.completed",
  replayStarted: "hr.workforce.attendance.replay.started",
  timeDriftCorrected: "hr.workforce.device.time.drift.corrected",
} as const;

export const HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS = [30, 60, 300, 900] as const;

export const HR_TIME_DRIFT_BLOCKING_THRESHOLD_SECONDS = 300;

export const HR_WORKFORCE_ENTERPRISE_REPORT_KEYS = [
  "device_health",
  "device_utilization",
  "driver_performance",
  "sync_performance",
  "queue_performance",
  "storage_capacity",
  "device_failure",
  "replay",
  "recalculation",
] as const;

export const HR_AI_WORKFORCE_INSIGHT_TYPES = [
  "buddy_punching",
  "missing_punch_pattern",
  "repeated_late_pattern",
  "suspicious_attendance",
  "device_failure_prediction",
  "anomaly",
] as const;
