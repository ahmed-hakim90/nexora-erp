export const HR_ATTENDANCE_DEVICE_SYNC_MODES = [
  "quick",
  "deep",
  "users_only",
  "punches_only",
  "templates_only",
  "configuration_only",
  "incremental",
  "full",
  "retry_failed",
  "resume",
] as const;

/** Enterprise sync strategies — one active per session (OP-07 v2). */
export const HR_ATTENDANCE_DEVICE_SYNC_STRATEGIES = [
  "incremental",
  "specific_date",
  "date_range",
  "month",
  "employees",
  "departments",
  "devices",
  "missing_days_recovery",
  "force_resync",
] as const;

export const HR_ATTENDANCE_DEVICE_IMPORT_MODES = [
  "all",
  "valid_only",
  "selected_employees",
  "selected_days",
  "selected_records",
  "cancel",
] as const;

export const HR_ATTENDANCE_DEVICE_PREVIEW_DRAFT_TTL_HOURS = 72;

export const HR_ATTENDANCE_DEVICE_DIAGNOSTIC_ACTIONS = [
  "ping",
  "test_connection",
  "read_device_time",
  "read_user_count",
  "read_punch_count",
  "read_memory",
  "read_storage",
  "read_cpu",
  "read_firmware",
  "read_sdk",
  "read_door_status",
  "read_battery",
  "read_temperature",
  "read_relay",
  "read_tamper",
  "read_clock_drift",
  "restart_connection",
  "clear_queue",
] as const;

export const HR_ATTENDANCE_DEVICE_SYNC_PHASES = [
  "connect",
  "download_users",
  "download_punches",
  "validate",
  "build_preview",
  "ready_to_import",
  "import",
] as const;

export const HR_ATTENDANCE_DEVICE_SYNC_STATUSES = [
  "queued",
  "connecting",
  "downloading_users",
  "downloading_punches",
  "validating",
  "preview_ready",
  "importing",
  "completed",
  "failed",
  "cancelled",
] as const;

export const HR_ATTENDANCE_DEVICE_HEALTH_STATUSES = [
  "online",
  "connecting",
  "sync_running",
  "offline",
  "never_connected",
] as const;

export const HR_ATTENDANCE_AUTO_SYNC_INTERVALS = [
  "disabled",
  "5min",
  "15min",
  "30min",
  "hourly",
  "daily",
  "weekly",
] as const;

export const HR_ATTENDANCE_VALIDATION_SEVERITIES = ["info", "warning", "error", "blocking"] as const;

export const HR_ATTENDANCE_DEVICE_SYNC_JOB_KEY = "hr.attendance-device.sync";

export const HR_ATTENDANCE_DEVICE_IMPORT_JOB_KEY = "hr.attendance-device.import";

export const HR_ATTENDANCE_DEVICE_EVENT_KEYS = {
  clockDrift: "hr.attendance.device.clock.drift",
  connectionLost: "hr.attendance.device.connection.lost",
  deviceOffline: "hr.attendance.device.offline",
  deviceOnline: "hr.attendance.device.online",
  firmwareOutdated: "hr.attendance.device.firmware.outdated",
  largeImport: "hr.attendance.device.import.large",
  queueOverflow: "hr.attendance.device.queue.overflow",
  syncCancelled: "hr.attendance.device.sync.cancelled",
  syncCompleted: "hr.attendance.device.sync.completed",
  syncFailed: "hr.attendance.device.sync.failed",
  syncStarted: "hr.attendance.device.sync.started",
  syncWarnings: "hr.attendance.device.sync.warnings",
} as const;

export const HR_ATTENDANCE_DEVICE_SYNC_PHASE_LABELS: Record<string, string> = {
  build_preview: "Build preview",
  connect: "Connect",
  download_punches: "Download punches",
  download_users: "Download users",
  import: "Import",
  ready_to_import: "Ready to import",
  validate: "Validate",
};

export const HR_ATTENDANCE_DEVICE_SYNC_MODE_LABELS: Record<string, string> = {
  configuration_only: "Configuration only",
  deep: "Deep sync",
  full: "Full sync",
  incremental: "Incremental sync",
  punches_only: "Punches only",
  quick: "Quick sync",
  resume: "Resume interrupted",
  retry_failed: "Retry failed",
  templates_only: "Templates only",
  users_only: "Users only",
};

export const HR_ATTENDANCE_DEVICE_SYNC_STRATEGY_LABELS: Record<string, string> = {
  date_range: "Date range",
  departments: "Selected departments",
  devices: "Selected devices",
  employees: "Selected employees",
  force_resync: "Force re-sync",
  incremental: "Incremental sync",
  missing_days_recovery: "Missing days recovery",
  month: "Month",
  specific_date: "Specific date",
};

export const HR_ATTENDANCE_DEVICE_HEALTH_DIMENSION_LABELS: Record<string, string> = {
  clock: "Clock",
  firmware: "Firmware",
  heartbeat: "Heartbeat",
  network: "Network",
  queue: "Queue",
  storage: "Storage",
  sync: "Sync",
};

export const HR_ATTENDANCE_DEVICE_HEALTH_LABELS: Record<string, string> = {
  connecting: "Connecting",
  never_connected: "Never connected",
  offline: "Offline",
  online: "Online",
  sync_running: "Sync running",
};
