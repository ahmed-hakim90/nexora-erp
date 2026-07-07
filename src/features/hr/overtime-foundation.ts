import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrOvertimeRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "withdrawn"
  | "paid";

export type HrOvertimeType =
  | "normal"
  | "weekend"
  | "holiday"
  | "night"
  | "emergency"
  | "callout"
  | "travel"
  | "custom";

export type HrOvertimeCandidateStatus = "pending" | "approved" | "rejected" | "ignored" | "converted";

export type HrOvertimeScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrOvertimeRequestDefinition = HrOvertimeScope &
  Readonly<{
    employeeId: string;
    workDate: string;
    durationMinutes: number;
    overtimeType: HrOvertimeType;
    status: HrOvertimeRequestStatus;
    payrollEligible: boolean;
    runtimeOvertimeCalculationImplemented: true;
  }>;

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

export const HR_OVERTIME_RUNTIME_EVENT_KEYS = {
  candidatePending: definePlatformEventName("hr.overtime.candidate.pending"),
  policyChanged: definePlatformEventName("hr.overtime.policy.changed"),
  requestApproved: definePlatformEventName("hr.overtime.request.approved"),
  requestRejected: definePlatformEventName("hr.overtime.request.rejected"),
  requestSubmitted: definePlatformEventName("hr.overtime.request.submitted"),
} as const;

export const HR_OVERTIME_RUNTIME_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Overtime request submitted for approval.",
    kind: "domain",
    name: definePlatformEventName("HrOvertimeRequestSubmitted"),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Overtime candidate pending approval from attendance runtime.",
    kind: "domain",
    name: definePlatformEventName("HrOvertimeCandidatePending"),
    source: "business-app",
    version: 1,
  }),
] as const;

export const HR_OVERTIME_RUNTIME_TABLES = [
  "hr_overtime_policies",
  "hr_overtime_approval_events",
  "hr_overtime_candidates",
] as const;

export const HR_OVERTIME_FOUNDATION_TABLES = ["hr_overtime_requests", ...HR_OVERTIME_RUNTIME_TABLES] as const;

export const HR_OVERTIME_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.overtimeView, scope: "tenant-company-branch", entity: "overtime" },
  { key: HR_PERMISSIONS.overtimeManage, scope: "tenant-company-branch", entity: "overtime" },
  { key: HR_PERMISSIONS.overtimeRequest, scope: "tenant-company-branch", entity: "overtime-request" },
  { key: HR_PERMISSIONS.overtimeApprove, scope: "manager-or-hr-admin", entity: "overtime-approval" },
  { key: HR_PERMISSIONS.overtimeExport, scope: "tenant-company-branch", entity: "overtime-export" },
] as const;

export const HR_OVERTIME_RUNTIME_BOUNDARY = {
  attendanceProducesOvertimeFacts: true,
  payrollCalculationImplemented: false,
  payrollInputReaderImplemented: true,
  runtimeOvertimeCalculationImplemented: true,
} as const;
