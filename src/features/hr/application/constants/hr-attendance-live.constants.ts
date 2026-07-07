export const HR_ATTENDANCE_LIVE_REFRESH_INTERVALS_SECONDS = [15, 30, 60, 120] as const;

export const HR_ATTENDANCE_LIVE_STATUSES = [
  "present",
  "absent",
  "late",
  "on_break",
  "overtime",
  "checked_out",
  "missing_punch",
  "holiday",
  "leave",
  "remote",
  "business_trip",
] as const;

export const HR_ATTENDANCE_LIVE_EXCEPTION_PANEL_TYPES = [
  "late",
  "missing_punch",
  "unknown_punch",
  "duplicate_punch",
  "outside_shift",
  "device_mismatch",
  "manual_adjustment_required",
  "payroll_blocking",
] as const;

export const HR_ATTENDANCE_LIVE_JOB_KEYS = {
  deviceHealth: "hr.attendance-live.device-health",
  exceptionScan: "hr.attendance-live.exception-scan",
  heartbeat: "hr.attendance-live.heartbeat",
  monitoring: "hr.attendance-live.monitoring",
} as const;

export const HR_ATTENDANCE_LIVE_EVENT_KEYS = {
  deviceOffline: "hr.attendance-live.device.offline",
  deviceOnline: "hr.attendance-live.device.online",
  exceptionDetected: "hr.attendance-live.exception.detected",
  massLateArrival: "hr.attendance-live.mass-late-arrival",
  payrollBlocking: "hr.attendance-live.payroll-blocking",
  syncCompleted: "hr.attendance-live.sync.completed",
} as const;

export const HR_ATTENDANCE_LIVE_AUDIT_ACTIONS = {
  exceptionDismissed: "hr.attendance-live.exception.dismissed",
  exceptionResolved: "hr.attendance-live.exception.resolved",
  exportSnapshot: "hr.attendance-live.export.snapshot",
  manualCorrection: "hr.attendance-live.manual.correction",
  missingPunchApproved: "hr.attendance-live.missing-punch.approved",
  notificationSent: "hr.attendance-live.notification.sent",
} as const;
