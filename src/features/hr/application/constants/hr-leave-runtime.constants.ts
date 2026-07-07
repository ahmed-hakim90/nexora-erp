import { defineAuditAction } from "@/platform/audit/public-api";

export const HR_LEAVE_RUNTIME_EVENT_KEYS = {
  balanceLow: "hr.leave.balance.low",
  carryForwardDue: "hr.leave.carry-forward.due",
  encashmentApproved: "hr.leave.encashment.approved",
  policyChanged: "hr.leave.policy.changed",
  requestApproved: "hr.leave.request.approved",
  requestCancelled: "hr.leave.request.cancelled",
  requestRejected: "hr.leave.request.rejected",
  requestSubmitted: "hr.leave.request.submitted",
} as const;

export const HR_LEAVE_RUNTIME_AUDIT_ACTIONS = {
  balanceRecalculated: defineAuditAction("hr.leave.balance.recalculated"),
  carryForwardExecuted: defineAuditAction("hr.leave.carry-forward.executed"),
  carryForwardPreviewed: defineAuditAction("hr.leave.carry-forward.previewed"),
  encashmentApproved: defineAuditAction("hr.leave.encashment.approved"),
  encashmentCreated: defineAuditAction("hr.leave.encashment.created"),
  policyRulesUpdated: defineAuditAction("hr.leave.policy.rules.updated"),
  requestConflictBlocked: defineAuditAction("hr.leave.request.conflict-blocked"),
} as const;

export const LEAVE_CONFLICT_CODES = [
  "duplicate_request",
  "holiday_overlap",
  "weekend_overlap",
  "attendance_overlap",
  "payroll_closed_period",
  "existing_leave_overlap",
  "probation_restriction",
  "insufficient_balance",
  "department_capacity_exceeded",
  "manager_unavailable",
  "policy_violation",
] as const;

export type LeaveConflictCode = (typeof LEAVE_CONFLICT_CODES)[number];

export const DEFAULT_LEAVE_TYPE_SEEDS = [
  { code: "ANNUAL", name: "Annual Leave", paid: true },
  { code: "CASUAL", name: "Casual Leave", paid: true },
  { code: "SICK", name: "Sick Leave", paid: true },
  { code: "MATERNITY", name: "Maternity Leave", paid: true },
  { code: "PATERNITY", name: "Paternity Leave", paid: true },
  { code: "EMERGENCY", name: "Emergency Leave", paid: true },
  { code: "UNPAID", name: "Unpaid Leave", paid: false },
  { code: "BUSINESS_TRIP", name: "Business Trip", paid: true },
] as const;

export type LeavePolicyRules = Readonly<{
  attachmentRequired?: boolean;
  autoApproval?: boolean;
  carryForwardMax?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  eligibility?: Readonly<{
    employmentStatuses?: readonly string[];
    gender?: string | null;
    minimumServiceDays?: number;
    probationRestricted?: boolean;
  }>;
  halfDayAllowed?: boolean;
  hourlyLeaveAllowed?: boolean;
  maxBalance?: number;
  maxRequestDays?: number;
  minRequestDays?: number;
  negativeBalanceAllowed?: boolean;
  payrollImpact?: "paid" | "unpaid" | "partial";
}>;

export const DEFAULT_POLICY_RULES: LeavePolicyRules = {
  attachmentRequired: false,
  autoApproval: false,
  carryForwardMax: 5,
  eligibility: { minimumServiceDays: 0, probationRestricted: true },
  halfDayAllowed: true,
  hourlyLeaveAllowed: false,
  maxRequestDays: 30,
  minRequestDays: 0.5,
  negativeBalanceAllowed: false,
  payrollImpact: "paid",
};
