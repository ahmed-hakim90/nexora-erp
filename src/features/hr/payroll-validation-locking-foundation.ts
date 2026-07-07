import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type {
  HrPayrollExceptionResolutionType,
  HrPayrollRuntimeExceptionDefinition,
  HrPayrollRuntimeLockDefinition,
  HrPayrollRuntimeLockReason,
  HrPayrollRuntimeLockScope,
} from "./payroll-inputs-runtime-foundation";
export {
  defineHrPayrollRuntimeException,
  defineHrPayrollRuntimeLock,
  HR_PAYROLL_RUNTIME_EXCEPTION_TYPES,
  HR_PAYROLL_RUNTIME_LOCK_REASONS,
  HR_PAYROLL_RUNTIME_LOCK_SCOPES,
} from "./payroll-inputs-runtime-foundation";

export type HrPayrollValidationCategory =
  | "employee"
  | "payroll_run"
  | "payroll_period"
  | "component"
  | "snapshot"
  | "input"
  | "approval"
  | "finance_readiness";

export type HrPayrollValidationSeverity = "information" | "warning" | "error" | "blocking";

export type HrPayrollApprovalGateStatus =
  | "ready_for_approval"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "returned";

export type HrPayrollCloseTarget = "payroll_run" | "payroll_period";

export type HrPayrollReopenTarget = "payroll_run" | "payroll_period";

export type HrPayrollReopenApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected" | "cancelled";

export type HrPayrollValidationLockingScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollValidationRuleDefinition = HrPayrollValidationLockingScope & Readonly<{
  ruleCode: string;
  ruleName: string;
  ruleCategory: HrPayrollValidationCategory;
  severity: HrPayrollValidationSeverity;
  condition: Readonly<Record<string, unknown>>;
  recommendation?: string | null;
  autoResolvable: boolean;
  status: "draft" | "active" | "inactive" | "archived";
  countrySpecificRuleImplemented: false;
  automaticCorrectionImplemented: false;
}>;

export type HrPayrollValidationResultDefinition = HrPayrollValidationLockingScope & Readonly<{
  validationRuleId?: string | null;
  payrollRunId?: string | null;
  payrollPeriodId?: string | null;
  employeeId?: string | null;
  correlationId: string;
  ruleCategory: HrPayrollValidationCategory;
  severity: HrPayrollValidationSeverity;
  message: string;
  blocking: boolean;
  recommendation?: string | null;
  status: "open" | "in_review" | "resolved" | "dismissed";
  validationRuntimeImplemented: false;
}>;

export type HrPayrollClosingHistoryDefinition = HrPayrollValidationLockingScope & Readonly<{
  closeTarget: HrPayrollCloseTarget;
  payrollRunId?: string | null;
  payrollPeriodId?: string | null;
  correlationId: string;
  actorId?: string | null;
  previousState: string;
  newState: string;
  freezeResults: true;
  freezePayslips: true;
  freezeSnapshots: true;
  freezeInputs: true;
  irreversibleWithoutReopen: true;
  reason?: string | null;
  closingRuntimeImplemented: false;
}>;

export type HrPayrollReopenRequestDefinition = HrPayrollValidationLockingScope & Readonly<{
  reopenTarget: HrPayrollReopenTarget;
  payrollRunId?: string | null;
  payrollPeriodId?: string | null;
  correlationId: string;
  reason: string;
  requestedBy?: string | null;
  approvedBy?: string | null;
  approvalStatus: HrPayrollReopenApprovalStatus;
  approvalGateStatus: HrPayrollApprovalGateStatus;
  impactSummary: Readonly<Record<string, unknown>>;
  auditTrail: readonly Readonly<Record<string, unknown>>[];
  fullyAuditable: true;
  reopenRuntimeImplemented: false;
}>;

export type HrPayrollValidationSummaryDefinition = Readonly<{
  employeesReady: number;
  employeesWithErrors: number;
  blockingIssues: number;
  warnings: number;
  lockedRecords: number;
  pendingApprovals: number;
  summaryRuntimeImplemented: false;
}>;

export type HrPayrollValidationLockingEngineBoundaryContract = Readonly<{
  key: string;
  validationIndependentFromCalculation: true;
  calculationProducesResults: true;
  validationDeterminesApprovalEligibility: true;
  closingFreezesPayrollData: true;
  noRecordChangesAfterCloseWithoutReopen: true;
  automaticExceptionCorrectionImplemented: false;
  countryLocalizationImplemented: false;
  accountingPostingImplemented: false;
  validationRuntimeImplemented: false;
  processingFlow: readonly [
    "validate_employee",
    "validate_run",
    "validate_period",
    "resolve_exceptions",
    "apply_locks",
    "approval_gate",
    "close_payroll",
    "freeze_records",
  ];
}>;

export type HrPayrollValidationWorkflowApprovalIntegrationContract = Readonly<{
  key: string;
  referencesPlatformWorkflowDefinitions: true;
  referencesPlatformApprovalDefinitions: true;
  referencesPlatformNotificationContracts: true;
  directEngineCoupling: false;
  approvalRuntimeImplemented: false;
}>;

export function defineHrPayrollValidationRule<T extends HrPayrollValidationRuleDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollValidationResult<T extends HrPayrollValidationResultDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollClosingHistory<T extends HrPayrollClosingHistoryDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollReopenRequest<T extends HrPayrollReopenRequestDefinition>(definition: T): T {
  return definition;
}

export function createHrPayrollValidationSummary(input: Readonly<{
  blockingIssues: number;
  employeesReady: number;
  employeesWithErrors: number;
  lockedRecords: number;
  pendingApprovals: number;
  warnings: number;
}>): HrPayrollValidationSummaryDefinition {
  return {
    ...input,
    summaryRuntimeImplemented: false,
  };
}

export function payrollValidationBlocksApproval(results: readonly Readonly<{ blocking: boolean; severity: HrPayrollValidationSeverity }>[]): boolean {
  return results.some((result) => result.blocking || result.severity === "blocking");
}

export function payrollApprovalGateAllowsTransition(
  currentStatus: HrPayrollApprovalGateStatus,
  nextStatus: HrPayrollApprovalGateStatus
): boolean {
  const allowed: Record<HrPayrollApprovalGateStatus, readonly HrPayrollApprovalGateStatus[]> = {
    approved: [],
    ready_for_approval: ["submitted", "returned"],
    rejected: ["returned"],
    returned: ["submitted"],
    submitted: ["under_review", "returned"],
    under_review: ["approved", "rejected", "returned"],
  };

  return allowed[currentStatus].includes(nextStatus);
}

export const HR_PAYROLL_VALIDATION_CATEGORIES = [
  "employee",
  "payroll_run",
  "payroll_period",
  "component",
  "snapshot",
  "input",
  "approval",
  "finance_readiness",
] as const satisfies readonly HrPayrollValidationCategory[];

export const HR_PAYROLL_VALIDATION_SEVERITIES = [
  "information",
  "warning",
  "error",
  "blocking",
] as const satisfies readonly HrPayrollValidationSeverity[];

export const HR_PAYROLL_APPROVAL_GATE_STATUSES = [
  "ready_for_approval",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "returned",
] as const satisfies readonly HrPayrollApprovalGateStatus[];

export const HR_PAYROLL_VALIDATION_LOCKING_ENGINE_BOUNDARY_CONTRACT: HrPayrollValidationLockingEngineBoundaryContract = {
  accountingPostingImplemented: false,
  automaticExceptionCorrectionImplemented: false,
  calculationProducesResults: true,
  closingFreezesPayrollData: true,
  countryLocalizationImplemented: false,
  key: "hr.payroll.validation-locking.boundary",
  noRecordChangesAfterCloseWithoutReopen: true,
  processingFlow: [
    "validate_employee",
    "validate_run",
    "validate_period",
    "resolve_exceptions",
    "apply_locks",
    "approval_gate",
    "close_payroll",
    "freeze_records",
  ],
  validationDeterminesApprovalEligibility: true,
  validationIndependentFromCalculation: true,
  validationRuntimeImplemented: false,
};

export const HR_PAYROLL_VALIDATION_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT: HrPayrollValidationWorkflowApprovalIntegrationContract = {
  approvalRuntimeImplemented: false,
  directEngineCoupling: false,
  key: "hr.payroll.validation.workflow-approval-integration",
  referencesPlatformApprovalDefinitions: true,
  referencesPlatformNotificationContracts: true,
  referencesPlatformWorkflowDefinitions: true,
};

export const HR_PAYROLL_VALIDATION_LOCKING_VALIDATION_RULES = [
  { key: "blocking_validation_prevents_approval", message: "Blocking validations prevent approval.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "payroll_run_status_allows_validation", message: "Payroll run must be in a validatable state.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "unresolved_exceptions_block_approval", message: "Unresolved exceptions block approval.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "locked_records_cannot_be_modified", message: "Locked records cannot be modified.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "closed_payroll_immutable_without_reopen", message: "Closed payroll is immutable without controlled reopen.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "reopen_requires_approval", message: "Reopen requires approval workflow readiness.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "exception_no_automatic_correction", message: "Exceptions have no automatic correction.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "validation_independent_from_calculation", message: "Validation must be independent from calculation.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "finance_readiness_without_posting", message: "Finance readiness validation must not post accounting entries.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_country_specific_validation_rules", message: "Country-specific validation rules are not implemented.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_PAYROLL_VALIDATION_LOCKING_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payroll.validation-locking.platform-integration",
  observabilityReadinessRegistered: true,
  printReadinessRegistered: true,
  reportReadinessRegistered: true,
  searchRegistered: true,
  runtimeReportGenerationImplemented: false,
} as const;

export const HR_PAYROLL_VALIDATION_LOCKING_REPORT_READINESS = {
  dashboardDatasets: ["validation_results", "exceptions", "locks", "closing_history", "reopen_history"] as const,
  key: "hr.payroll.validation-locking.report-readiness",
  reportDatasets: ["validation_summary", "blocking_issues", "exception_summary", "closing_audit"] as const,
  runtimeReportGenerationImplemented: false,
} as const;

const hrPayrollValidationImportExportSecurity = {
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

export const HR_PAYROLL_VALIDATION_LOCKING_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "ruleCode", label: "Rule Code", required: true },
    { dataType: "text", key: "ruleCategory", label: "Rule Category", required: true },
    { dataType: "text", key: "severity", label: "Severity", required: true },
  ],
  key: "hr.payroll.validation-locking.import",
  label: "HR Payroll Validation Locking Import",
  mappings: [
    { key: "rule-code", sourceColumn: "Rule Code", targetField: "ruleCode" },
    { key: "rule-category", sourceColumn: "Rule Category", targetField: "ruleCategory" },
    { key: "severity", sourceColumn: "Severity", targetField: "severity" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { validationFoundationOnly: true, validationRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollValidationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "ruleCode", key: "validation-rule-code-required", message: "Validation rule code is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_VALIDATION_LOCKING_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "ruleCode", label: "Rule Code", order: 1, sourceField: "ruleCode" },
    { dataType: "text", key: "severity", label: "Severity", order: 2, sourceField: "severity" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
  ],
  key: "hr.payroll.validation-locking.export",
  label: "HR Payroll Validation Locking Export",
  mappings: [
    { key: "rule-code", sourceField: "ruleCode", targetColumn: "Rule Code" },
    { key: "severity", sourceField: "severity", targetColumn: "Severity" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-validation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollValidationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_VALIDATION_LOCKING_EVENT_DEFINITIONS = [
  "PayrollValidationStarted",
  "PayrollValidationCompleted",
  "PayrollValidationFailed",
  "PayrollRunLocked",
  "PayrollPeriodLocked",
  "PayrollApproved",
  "PayrollRejected",
  "PayrollClosed",
  "PayrollReopened",
  "PayrollFreezeCompleted",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payroll Validation, Locking & Closing Engine Foundation. No automatic exception resolution or accounting posting runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYROLL_VALIDATION_LOCKING_AUDIT_ACTIONS = {
  payrollApproved: defineAuditAction("hr.payroll.validation.approved"),
  payrollClosed: defineAuditAction("hr.payroll.validation.closed"),
  payrollFreezeCompleted: defineAuditAction("hr.payroll.validation.freeze.completed"),
  payrollPeriodLocked: defineAuditAction("hr.payroll.validation.period.locked"),
  payrollRejected: defineAuditAction("hr.payroll.validation.rejected"),
  payrollReopened: defineAuditAction("hr.payroll.validation.reopened"),
  payrollRunLocked: defineAuditAction("hr.payroll.validation.run.locked"),
  payrollValidationCompleted: defineAuditAction("hr.payroll.validation.completed"),
  payrollValidationFailed: defineAuditAction("hr.payroll.validation.failed"),
  payrollValidationStarted: defineAuditAction("hr.payroll.validation.started"),
} as const;

export const HR_PAYROLL_VALIDATION_LOCKING_FOUNDATION_TABLES = [
  "hr_payroll_validation_rules",
  "hr_payroll_validation_results",
  "hr_payroll_closing_history",
  "hr_payroll_reopen_requests",
] as const;

export const HR_PAYROLL_VALIDATION_LOCKING_RELATED_TABLES = [
  "hr_payroll_exceptions",
  "hr_payroll_runtime_locks",
] as const;

export const HR_PAYROLL_VALIDATION_LOCKING_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payrollValidate, scope: "tenant-company-branch", entity: "payroll-validation" },
  { key: HR_PERMISSIONS.payrollLock, scope: "tenant-company-branch", entity: "payroll-lock" },
  { key: HR_PERMISSIONS.payrollUnlock, scope: "tenant-company-branch", entity: "payroll-unlock" },
  { key: HR_PERMISSIONS.payrollClose, scope: "tenant-company-branch", entity: "payroll-close" },
  { key: HR_PERMISSIONS.payrollReopen, scope: "tenant-company-branch", entity: "payroll-reopen" },
  { key: HR_PERMISSIONS.payrollExceptionManage, scope: "tenant-company-branch", entity: "payroll-exception" },
] as const;

export const HR_PAYROLL_VALIDATION_LOCKING_OBSERVABILITY_CONTRACT = {
  actionField: "action",
  actorField: "actor_id",
  branchField: "branch_id",
  companyField: "company_id",
  correlationIdField: "correlation_id",
  key: "hr.payroll.validation-locking.observability",
  newStateField: "new_state",
  payrollPeriodField: "payroll_period_id",
  payrollRunField: "payroll_run_id",
  previousStateField: "previous_state",
  reasonField: "reason",
  tenantField: "tenant_id",
  timestampField: "created_at",
} as const;
