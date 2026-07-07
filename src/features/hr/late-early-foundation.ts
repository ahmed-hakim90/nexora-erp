import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrLateEarlyViolationStatus =
  | "draft"
  | "submitted"
  | "warning_only"
  | "approved"
  | "rejected"
  | "cancelled"
  | "exported_to_payroll";

export const HR_LATE_EARLY_RUNTIME_TABLES = [
  "hr_late_early_policies",
  "hr_late_early_policy_assignments",
  "hr_late_early_violations",
  "hr_late_early_violation_ledger",
  "hr_late_early_approval_events",
] as const;

export type HrLateEarlyEngineBoundaryContract = Readonly<{
  attendanceOwnsObservedPunchFacts: true;
  key: string;
  lateEarlyIsFirstClassBoundedContext: true;
  payrollConsumesTypedLateEarlyReferences: true;
  policyResultsCalculatedInAttendance: false;
  runtimeLateEarlyCalculationImplemented: true;
}>;

export const HR_LATE_EARLY_ENGINE_BOUNDARY_CONTRACT: HrLateEarlyEngineBoundaryContract = {
  attendanceOwnsObservedPunchFacts: true,
  key: "hr.late-early.boundary",
  lateEarlyIsFirstClassBoundedContext: true,
  payrollConsumesTypedLateEarlyReferences: true,
  policyResultsCalculatedInAttendance: false,
  runtimeLateEarlyCalculationImplemented: true,
};

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

export const HR_LATE_EARLY_RUNTIME_EVENT_KEYS = {
  policyChanged: definePlatformEventName("hr.late.policy.changed"),
  violationApproved: definePlatformEventName("hr.late.violation.approved"),
  violationEvaluated: definePlatformEventName("hr.late.violation.evaluated"),
  violationRejected: definePlatformEventName("hr.late.violation.rejected"),
  violationThreshold: definePlatformEventName("hr.late.violation.threshold"),
} as const;

export const HR_LATE_EARLY_RUNTIME_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Late/early violation detected and submitted for approval.",
    kind: "domain",
    name: definePlatformEventName("HrLateEarlyViolationThreshold"),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Late/early violation approved.",
    kind: "domain",
    name: definePlatformEventName("HrLateEarlyViolationApproved"),
    source: "business-app",
    version: 1,
  }),
] as const;

const hrLateEarlyImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: true,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.lateExport],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_LATE_EARLY_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", order: 1, sourceField: "employeeId" },
    { dataType: "number", key: "lateMinutes", label: "Late Minutes", order: 2, sourceField: "lateMinutes" },
    { dataType: "number", key: "earlyLeaveMinutes", label: "Early Leave Minutes", order: 3, sourceField: "earlyLeaveMinutes" },
    { dataType: "number", key: "deductionMinutes", label: "Deduction Minutes", order: 4, sourceField: "deductionMinutes" },
  ],
  key: "hr.late-early.export",
  label: "HR Late/Early Payroll Input Export",
  mappings: [
    { key: "employee-id", sourceField: "employeeId", targetColumn: "Employee ID" },
    { key: "late-minutes", sourceField: "lateMinutes", targetColumn: "Late Minutes" },
    { key: "early-leave-minutes", sourceField: "earlyLeaveMinutes", targetColumn: "Early Leave Minutes" },
    { key: "deduction-minutes", sourceField: "deductionMinutes", targetColumn: "Deduction Minutes" },
  ],
  metadata: {
    fileNameTemplate: "hr-late-early-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.lateExport,
  requiresAsync: true,
  security: hrLateEarlyImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_LATE_EARLY_PERMISSION_METADATA = [
  { entity: "late-early", key: HR_PERMISSIONS.lateView, scope: "tenant-company-branch" },
  { entity: "late-early-policy", key: HR_PERMISSIONS.latePolicyManage, scope: "tenant-company" },
  { entity: "late-early-approval", key: HR_PERMISSIONS.lateApprove, scope: "manager-or-hr-admin" },
  { entity: "late-early-export", key: HR_PERMISSIONS.lateExport, scope: "tenant-company-branch" },
] as const;
