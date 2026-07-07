import { defineAuditAction } from "@/platform/audit/public-api";

export const HR_LATE_EARLY_VIOLATION_KINDS = [
  "late",
  "early_leave",
  "repeated_late",
  "repeated_early",
  "excessive_delay",
  "critical_delay",
  "habitual_late",
  "habitual_early",
] as const;

export const DEFAULT_SHIFT_START = "09:00:00";
export const DEFAULT_SHIFT_END = "17:00:00";

export const HR_LATE_EARLY_RUNTIME_EVENT_KEYS = {
  policyChanged: "hr.late.policy.changed",
  violationApproved: "hr.late.violation.approved",
  violationEvaluated: "hr.late.violation.evaluated",
  violationRejected: "hr.late.violation.rejected",
  violationThreshold: "hr.late.violation.threshold",
} as const;

export const LATE_EARLY_CONFLICT_CODES = [
  "inactive_employee",
  "attendance_missing",
  "payroll_locked",
  "attendance_exported",
  "violation_exported",
  "daily_limit_exceeded",
  "weekly_limit_exceeded",
  "monthly_limit_exceeded",
] as const;

export type LateEarlyConflictCode = (typeof LATE_EARLY_CONFLICT_CODES)[number];

export const HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS = {
  evaluationExecuted: defineAuditAction("hr.late.evaluation.executed"),
  policyAssignmentCreated: defineAuditAction("hr.late.policy-assignment.created"),
  policyCreated: defineAuditAction("hr.late.policy.created"),
  violationApproved: defineAuditAction("hr.late.violation.approved"),
  violationCancelled: defineAuditAction("hr.late.violation.cancelled"),
  violationExported: defineAuditAction("hr.late.violation.exported"),
  violationOverridden: defineAuditAction("hr.late.violation.overridden"),
  violationRejected: defineAuditAction("hr.late.violation.rejected"),
} as const;

export type LateEarlyPolicyRules = Readonly<{
  approvalRequired?: boolean;
  autoApproval?: boolean;
  criticalDelayMinutes?: number;
  deductionMethod?: "minutes" | "half_day" | "full_day" | "none";
  dynamicGrace?: boolean;
  earlyLeaveThresholdMinutes?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  expectedShiftEnd?: string;
  expectedShiftStart?: string;
  habitualThresholdCount?: number;
  ignoreMinutes?: number;
  lateThresholdMinutes?: number;
  maxDailyMinutes?: number;
  maxMonthlyMinutes?: number;
  maxWeeklyMinutes?: number;
  nightShiftRules?: boolean;
  noDeduction?: boolean;
  ramadanException?: boolean;
  repeatedThresholdCount?: number;
  roundDownMinutes?: number;
  roundUpMinutes?: number;
  toleranceMinutes?: number;
  warningOnly?: boolean;
  weekendRules?: boolean;
}>;

export const DEFAULT_LATE_EARLY_POLICY_RULES: LateEarlyPolicyRules = {
  approvalRequired: true,
  autoApproval: false,
  criticalDelayMinutes: 120,
  deductionMethod: "minutes",
  earlyLeaveThresholdMinutes: 1,
  expectedShiftEnd: DEFAULT_SHIFT_END,
  expectedShiftStart: DEFAULT_SHIFT_START,
  habitualThresholdCount: 8,
  ignoreMinutes: 0,
  lateThresholdMinutes: 1,
  maxDailyMinutes: 240,
  maxMonthlyMinutes: 600,
  maxWeeklyMinutes: 180,
  repeatedThresholdCount: 3,
  roundDownMinutes: 0,
  roundUpMinutes: 15,
  toleranceMinutes: 0,
  warningOnly: false,
};
