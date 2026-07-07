import { defineAuditAction } from "@/platform/audit/public-api";

export const HR_OVERTIME_TYPES = [
  "normal",
  "weekend",
  "holiday",
  "night",
  "emergency",
  "callout",
  "travel",
  "custom",
] as const;

export type HrOvertimeTypeKey = (typeof HR_OVERTIME_TYPES)[number];

export const HR_OVERTIME_RUNTIME_EVENT_KEYS = {
  candidatePending: "hr.overtime.candidate.pending",
  policyChanged: "hr.overtime.policy.changed",
  requestApproved: "hr.overtime.request.approved",
  requestRejected: "hr.overtime.request.rejected",
  requestSubmitted: "hr.overtime.request.submitted",
} as const;

export const HR_OVERTIME_RUNTIME_AUDIT_ACTIONS = {
  candidateResolved: defineAuditAction("hr.overtime.candidate.resolved"),
  policyCreated: defineAuditAction("hr.overtime.policy.created"),
  requestApproved: defineAuditAction("hr.overtime.request.approved"),
  requestCancelled: defineAuditAction("hr.overtime.request.cancelled"),
  requestConflictBlocked: defineAuditAction("hr.overtime.request.conflict-blocked"),
  requestCreated: defineAuditAction("hr.overtime.request.created"),
  requestRejected: defineAuditAction("hr.overtime.request.rejected"),
  requestReturned: defineAuditAction("hr.overtime.request.returned"),
  requestSubmitted: defineAuditAction("hr.overtime.request.submitted"),
  requestWithdrawn: defineAuditAction("hr.overtime.request.withdrawn"),
} as const;

export const OVERTIME_CONFLICT_CODES = [
  "attendance_missing",
  "duplicate_request",
  "existing_overtime_overlap",
  "inactive_employee",
  "leave_conflict",
  "max_daily_hours",
  "max_monthly_hours",
  "max_weekly_hours",
  "overlap_shift",
  "payroll_locked",
  "policy_violation",
  "probation_restriction",
] as const;

export type OvertimeConflictCode = (typeof OVERTIME_CONFLICT_CODES)[number];

export const STANDARD_WORK_MINUTES = 480;

export type OvertimePolicyRules = Readonly<{
  attachmentRequired?: boolean;
  autoApproval?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  eligibility?: Readonly<{
    employmentStatuses?: readonly string[];
    minimumServiceDays?: number;
    probationRestricted?: boolean;
  }>;
  maxDailyMinutes?: number;
  maxMonthlyMinutes?: number;
  maxWeeklyMinutes?: number;
  minMinutes?: number;
  preApprovalRequired?: boolean;
  weekendMultiplier?: number;
  holidayMultiplier?: number;
  nightMultiplier?: number;
}>;

export const DEFAULT_OVERTIME_POLICY_RULES: OvertimePolicyRules = {
  attachmentRequired: false,
  autoApproval: false,
  eligibility: { minimumServiceDays: 0, probationRestricted: false },
  maxDailyMinutes: 240,
  maxMonthlyMinutes: 2400,
  maxWeeklyMinutes: 720,
  minMinutes: 30,
  preApprovalRequired: true,
  weekendMultiplier: 2,
  holidayMultiplier: 2.5,
  nightMultiplier: 1.75,
};
