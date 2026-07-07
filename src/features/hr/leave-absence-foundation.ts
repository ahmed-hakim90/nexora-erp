import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrLeaveRecordStatus = "draft" | "active" | "inactive" | "archived";
export type HrLeaveRequestStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "cancelled" | "posted_to_payroll";
export type HrLeaveApprovalReadinessStatus = "not_required" | "pending_approval" | "approved" | "rejected" | "cancelled";
export type HrAbsenceEventStatus = "observed" | "classified" | "linked_to_leave" | "dismissed";
export type HrLeavePayrollImpactKind = "paid_leave" | "unpaid_leave" | "partial_paid_leave" | "absence_deduction" | "encashment";

export type HrLeaveAbsenceScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrLeaveTypeDefinition = HrLeaveAbsenceScope & Readonly<{
  code: string;
  name: string;
  paid: boolean;
  requiresApproval: boolean;
  impactsPayroll: boolean;
  status: HrLeaveRecordStatus;
}>;

export type HrAbsenceTypeDefinition = HrLeaveAbsenceScope & Readonly<{
  code: string;
  name: string;
  excused: boolean;
  payrollImpactKind?: HrLeavePayrollImpactKind | null;
  status: HrLeaveRecordStatus;
}>;

export type HrLeavePolicyDefinition = HrLeaveAbsenceScope & Readonly<{
  leaveTypeId: string;
  policyVersionRef?: string | null;
  entitlementUnit: "days" | "hours";
  annualEntitlement: number;
  carryForwardAllowed: boolean;
  status: HrLeaveRecordStatus;
  calculationRuntimeImplemented: true;
}>;

export type HrLeaveEntitlementDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  leaveTypeId: string;
  entitlementPeriodStart: string;
  entitlementPeriodEnd: string;
  entitledQuantity: number;
  consumedQuantity: number;
  pendingQuantity: number;
  status: HrLeaveRecordStatus;
  balanceCalculationRuntimeImplemented: true;
}>;

export type HrLeaveBalanceDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  leaveTypeId: string;
  asOfDate: string;
  availableQuantity: number;
  projectedQuantity?: number | null;
  sourceEntitlementId?: string | null;
  runtimeCalculationImplemented: true;
}>;

export type HrLeaveRequestDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  leaveTypeId: string;
  startsOn: string;
  endsOn: string;
  quantity: number;
  status: HrLeaveRequestStatus;
  approvalStatus: HrLeaveApprovalReadinessStatus;
  assignmentResolutionRequired: true;
  workflowRuntimeImplemented: true;
}>;

export type HrAbsenceEventDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  absenceTypeId?: string | null;
  attendanceDayId?: string | null;
  eventDate: string;
  status: HrAbsenceEventStatus;
  linkedLeaveRequestId?: string | null;
  payrollInputRuntimeImplemented: false;
}>;

export type HrLeavePayrollImpactDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  leaveRequestId?: string | null;
  absenceEventId?: string | null;
  payrollPeriodId?: string | null;
  impactKind: HrLeavePayrollImpactKind;
  quantity: number;
  paidQuantity?: number | null;
  unpaidQuantity?: number | null;
  typedPayrollSourceReferenceRequired: true;
  payrollCalculationImplemented: false;
}>;

export type HrLeaveCarryForwardReadinessDefinition = HrLeaveAbsenceScope & Readonly<{
  employeeId: string;
  leaveTypeId: string;
  sourcePeriodEnd: string;
  targetPeriodStart: string;
  quantity: number;
  status: HrLeaveRecordStatus;
  carryForwardRuntimeImplemented: false;
}>;

export type HrLeaveAbsenceEngineBoundaryContract = Readonly<{
  key: string;
  leaveAbsenceIsFirstClassBoundedContext: true;
  attendanceOwnsObservedPunchFacts: true;
  leaveOwnsApprovedAbsenceEntitlementsAndRequests: true;
  payrollConsumesTypedLeaveAbsenceReferences: true;
  assignmentResolverRequiredForEligibility: true;
  workforceCalendarReferencedOnly: true;
  runtimeLeaveCalculationImplemented: true;
  payrollCalculationImplemented: false;
  essMssUiImplemented: false;
}>;

export function defineHrLeaveType<T extends HrLeaveTypeDefinition>(definition: T): T {
  return definition;
}

export function defineHrAbsenceType<T extends HrAbsenceTypeDefinition>(definition: T): T {
  return definition;
}

export function defineHrLeavePolicy<T extends HrLeavePolicyDefinition>(definition: T): T {
  return definition;
}

export function defineHrLeaveRequest<T extends HrLeaveRequestDefinition>(definition: T): T {
  return definition;
}

export function defineHrLeavePayrollImpact<T extends HrLeavePayrollImpactDefinition>(definition: T): T {
  return definition;
}

export const HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT: HrLeaveAbsenceEngineBoundaryContract = {
  assignmentResolverRequiredForEligibility: true,
  attendanceOwnsObservedPunchFacts: true,
  essMssUiImplemented: false,
  key: "hr.leave-absence.boundary",
  leaveAbsenceIsFirstClassBoundedContext: true,
  leaveOwnsApprovedAbsenceEntitlementsAndRequests: true,
  payrollCalculationImplemented: false,
  payrollConsumesTypedLeaveAbsenceReferences: true,
  runtimeLeaveCalculationImplemented: true,
  workforceCalendarReferencedOnly: true,
};

export const HR_LEAVE_ABSENCE_INTEGRATION_CONTRACT = {
  auditIntegration: true,
  employeeIntegration: true,
  eventBusIntegration: true,
  key: "hr.leave-absence.integration",
  notificationIntegration: true,
  payrollInputsIntegration: true,
  payrollValidationIntegration: true,
  workflowApprovalIntegration: true,
} as const;

export const HR_LEAVE_ABSENCE_VALIDATION_RULES = [
  { key: "leave_request_requires_assignment_resolution", message: "Leave request eligibility must resolve through Assignment Engine.", runtimeImplemented: true },
  { key: "leave_payroll_impact_requires_typed_source_ref", message: "Leave payroll impact must use typed payroll source references.", runtimeImplemented: false },
  { key: "absence_event_does_not_replace_attendance", message: "Absence events classify attendance observations but do not own punch facts.", runtimeImplemented: true },
] as const;

export const HR_LEAVE_ABSENCE_AUDIT_ACTIONS = {
  absenceEventClassified: defineAuditAction("hr.leave.absence.classified"),
  leaveRequestApproved: defineAuditAction("hr.leave.request.approved"),
  leaveRequestSubmitted: defineAuditAction("hr.leave.request.submitted"),
} as const;

export const HR_LEAVE_ABSENCE_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Leave request contract event prepared without workflow runtime.",
    kind: "domain",
    name: definePlatformEventName("HrLeaveRequestSubmitted"),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "Absence event contract prepared without attendance mutation runtime.",
    kind: "domain",
    name: definePlatformEventName("HrAbsenceEventClassified"),
    source: "business-app",
    version: 1,
  }),
] as const;

const hrLeaveAbsenceImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: true,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_LEAVE_ABSENCE_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", required: true },
    { dataType: "text", key: "leaveTypeId", label: "Leave Type ID", required: true },
    { dataType: "date", key: "startsOn", label: "Starts On", required: true },
    { dataType: "date", key: "endsOn", label: "Ends On", required: true },
  ],
  key: "hr.leave-absence.import",
  label: "HR Leave Absence Foundation Import",
  mappings: [
    { key: "employee-id", sourceColumn: "Employee ID", targetField: "employeeId" },
    { key: "leave-type-id", sourceColumn: "Leave Type ID", targetField: "leaveTypeId" },
    { key: "starts-on", sourceColumn: "Starts On", targetField: "startsOn" },
    { key: "ends-on", sourceColumn: "Ends On", targetField: "endsOn" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, leaveRuntimeImplemented: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrLeaveAbsenceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "employeeId", key: "employee-required", message: "Employee is required.", severity: "error", type: "required" },
  ],
});

export const HR_LEAVE_ABSENCE_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", order: 1, sourceField: "employeeId" },
    { dataType: "text", key: "leaveTypeId", label: "Leave Type ID", order: 2, sourceField: "leaveTypeId" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
  ],
  key: "hr.leave-absence.export",
  label: "HR Leave Absence Foundation Export",
  mappings: [
    { key: "employee-id", sourceField: "employeeId", targetColumn: "Employee ID" },
    { key: "leave-type-id", sourceField: "leaveTypeId", targetColumn: "Leave Type ID" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-leave-absence-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrLeaveAbsenceImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_LEAVE_ABSENCE_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.leaveView, scope: "tenant-company-branch", entity: "leave-absence" },
  { key: HR_PERMISSIONS.leaveManage, scope: "tenant-company-branch", entity: "leave-absence" },
  { key: HR_PERMISSIONS.leaveApprove, scope: "manager-or-hr-admin", entity: "leave-approval" },
] as const;

export const HR_LEAVE_RUNTIME_TABLES = [
  "hr_leave_balance_ledger",
  "hr_leave_carry_forward_runs",
  "hr_leave_encashment_requests",
  "hr_leave_approval_events",
] as const;

export const HR_LEAVE_ABSENCE_FOUNDATION_TABLES = [
  "hr_leave_types",
  "hr_absence_types",
  "hr_leave_policies",
  "hr_leave_entitlements",
  "hr_leave_balances",
  "hr_leave_requests",
  "hr_leave_approval_readiness",
  "hr_absence_events",
  "hr_leave_payroll_impact_refs",
  "hr_leave_carry_forward_readiness",
  ...HR_LEAVE_RUNTIME_TABLES,
] as const;
