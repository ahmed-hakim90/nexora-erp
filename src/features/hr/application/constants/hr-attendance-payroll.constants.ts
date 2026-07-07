import { defineAuditAction } from "@/platform/audit/public-api";
import { defineJob } from "@/platform/background-jobs/public-api";

export const HR_ATTENDANCE_PAYROLL_EVENT_KEYS = {
  attendanceExported: "hr.attendance.payroll.exported",
  attendanceLocked: "hr.attendance.payroll.locked",
  attendanceReopened: "hr.attendance.payroll.reopened",
  exportFailed: "hr.attendance.payroll.export-failed",
  payrollReady: "hr.attendance.payroll.ready",
} as const;

export const HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS = {
  closingCreated: defineAuditAction("hr.attendance.closing.created"),
  closingLocked: defineAuditAction("hr.attendance.closing.locked"),
  exportCancelled: defineAuditAction("hr.attendance.export.cancelled"),
  exportCompleted: defineAuditAction("hr.attendance.export.completed"),
  exportDownloaded: defineAuditAction("hr.attendance.export.downloaded"),
  exportFailed: defineAuditAction("hr.attendance.export.failed"),
  exportReExported: defineAuditAction("hr.attendance.export.re-exported"),
  exportValidated: defineAuditAction("hr.attendance.export.validated"),
  payrollReadyComputed: defineAuditAction("hr.attendance.payroll-ready.computed"),
  reopened: defineAuditAction("hr.attendance.reopened"),
  snapshotCreated: defineAuditAction("hr.attendance.snapshot.created"),
} as const;

export const ATTENDANCE_CLOSING_JOB = defineJob({
  key: "hr.attendance.closing",
  maxRetries: 2,
  priority: "normal",
  queueKey: "hr-attendance-closing",
  retryPolicy: { cancellable: true, delaySeconds: 30, maxAttempts: 3, strategy: "fixed", timeoutSeconds: 1800 },
  timeoutSeconds: 1800,
});

export const ATTENDANCE_EXPORT_JOB = defineJob({
  key: "hr.attendance.payroll-export",
  maxRetries: 2,
  priority: "high",
  queueKey: "hr-attendance-payroll-export",
  retryPolicy: { cancellable: true, delaySeconds: 60, maxAttempts: 3, strategy: "fixed", timeoutSeconds: 3600 },
  timeoutSeconds: 3600,
});

export const ATTENDANCE_SNAPSHOT_JOB = defineJob({
  key: "hr.attendance.payroll-snapshot",
  maxRetries: 2,
  priority: "normal",
  queueKey: "hr-attendance-payroll-snapshot",
  retryPolicy: { cancellable: true, delaySeconds: 30, maxAttempts: 3, strategy: "fixed", timeoutSeconds: 1800 },
  timeoutSeconds: 1800,
});

export const ATTENDANCE_EXPORT_CLEANUP_JOB = defineJob({
  key: "hr.attendance.export-cleanup",
  maxRetries: 0,
  priority: "low",
  queueKey: "hr-attendance-export-cleanup",
  retryPolicy: { cancellable: true, delaySeconds: 0, maxAttempts: 1, strategy: "fixed", timeoutSeconds: 600 },
  timeoutSeconds: 600,
});

export const LOCKED_ATTENDANCE_DAY_STATUSES = ["locked", "exported_to_payroll"] as const;

export const MUTABLE_ATTENDANCE_DAY_STATUSES = [
  "pending",
  "observed",
  "needs_review",
  "approved",
  "rejected",
  "reopened",
  "processing",
  "ready_for_payroll",
] as const;

export const PAYROLL_EXPORT_VALIDATION_CODES = [
  "missing_punches",
  "unapproved_exceptions",
  "open_overtime",
  "open_leave",
  "open_late_early",
  "duplicate_punches",
  "future_punches",
  "inactive_employee",
  "payroll_locked",
  "branch_mismatch",
  "pending_review",
] as const;

export type PayrollExportValidationCode = (typeof PAYROLL_EXPORT_VALIDATION_CODES)[number];
