import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollInputKind =
  | "manual_adjustment"
  | "allowance_adjustment"
  | "deduction_adjustment"
  | "bonus"
  | "commission"
  | "incentive"
  | "overtime"
  | "attendance_summary"
  | "leave_summary"
  | "penalty_summary"
  | "loan_installment"
  | "advance_installment"
  | "benefit_adjustment"
  | "retro_adjustment";

export type HrPayrollInputSource =
  | "hr_contract"
  | "assignment_engine"
  | "attendance_engine"
  | "leave_engine"
  | "compensation_foundation"
  | "loan_foundation"
  | "advance_foundation"
  | "penalty_foundation"
  | "manual_entry"
  | "api_integration";

export type HrPayrollInputStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "locked"
  | "rejected"
  | "cancelled";

export type HrPayrollInputApprovalStatus =
  | "not_required"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled";

export type HrPayrollAdjustmentKind =
  | "positive"
  | "negative"
  | "one_time"
  | "recurring"
  | "retroactive";

export type HrPayrollRuntimeExceptionType =
  | "missing_attendance"
  | "missing_payroll_group"
  | "missing_salary_component"
  | "duplicate_input"
  | "closed_payroll_period"
  | "employee_terminated"
  | "employee_suspended"
  | "missing_approval"
  | "invalid_assignment"
  | "invalid_contract"
  | "missing_cost_center"
  | "missing_currency"
  | "manual_exception";

export type HrPayrollExceptionResolutionType = "resolved" | "dismissed" | "waived" | "deferred" | "cancelled";

export type HrPayrollRuntimeLockScope =
  | "employee"
  | "payroll_period"
  | "payroll_run"
  | "payroll_result"
  | "payslip"
  | "component"
  | "input"
  | "approval";

export type HrPayrollRuntimeLockReason = "validation" | "approval" | "published" | "closed" | "manual_lock";

export type HrPayrollRecalculationScope = "employee" | "payroll_group" | "payroll_run";

export type HrPayrollInputsRuntimeScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollInputDefinition = HrPayrollInputsRuntimeScope & Readonly<{
  employeeId: string;
  payrollPeriodId: string;
  payrollRunId?: string | null;
  inputKind: HrPayrollInputKind;
  source: HrPayrollInputSource;
  effectiveDate: string;
  status: HrPayrollInputStatus;
  approvalStatus: HrPayrollInputApprovalStatus;
  amount?: number | null;
  quantity?: number | null;
  currency: string;
  notes?: string | null;
  auditMetadata: Readonly<Record<string, unknown>>;
  sourceRecordId?: string | null;
  sourceReference?: string | null;
  duplicatesSourceData: false;
  payrollCalculationImplemented: false;
}>;

export type HrPayrollInputSourceRefDefinition = HrPayrollInputsRuntimeScope & Readonly<{
  payrollInputId: string;
  source: HrPayrollInputSource;
  sourceEngineKey: string;
  sourceRecordId: string;
  sourceVersionId?: string | null;
  effectiveDateUsed: string;
  payloadRef: Readonly<Record<string, unknown>>;
  duplicatesSourceData: false;
  referencesSourceOnly: true;
}>;

export type HrPayrollAdjustmentDefinition = HrPayrollInputsRuntimeScope & Readonly<{
  payrollInputId?: string | null;
  employeeId: string;
  payrollPeriodId: string;
  adjustmentKind: HrPayrollAdjustmentKind;
  amount: number;
  currency: string;
  effectiveDate: string;
  status: HrPayrollInputStatus;
  approvalStatus: HrPayrollInputApprovalStatus;
  notes?: string | null;
  adjustmentRuntimeImplemented: false;
}>;

export type HrPayrollRuntimeExceptionDefinition = HrPayrollInputsRuntimeScope & Readonly<{
  payrollRunId?: string | null;
  payrollInputId?: string | null;
  payrollPeriodId?: string | null;
  payrollResultId?: string | null;
  employeeId?: string | null;
  exceptionType: HrPayrollRuntimeExceptionType;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "dismissed";
  assignedTo?: string | null;
  resolutionNotes?: string | null;
  resolutionDate?: string | null;
  resolutionType?: HrPayrollExceptionResolutionType | null;
  automaticResolutionImplemented: false;
}>;

export type HrPayrollRuntimeLockDefinition = HrPayrollInputsRuntimeScope & Readonly<{
  lockScope: HrPayrollRuntimeLockScope;
  lockReason?: HrPayrollRuntimeLockReason | null;
  employeeId?: string | null;
  payrollPeriodId?: string | null;
  payrollInputId?: string | null;
  payrollRunId?: string | null;
  payrollResultId?: string | null;
  payslipId?: string | null;
  componentCode?: string | null;
  correlationId?: string | null;
  preventsModificationAfterApproval: true;
  lockRuntimeImplemented: false;
}>;

export type HrPayrollRecalculationReadinessDefinition = Readonly<{
  scope: HrPayrollRecalculationScope;
  employeeId?: string | null;
  payrollGroupId?: string | null;
  payrollRunId?: string | null;
  recalculationEngineImplemented: false;
}>;

export type HrPayrollInputsRuntimeEngineBoundaryContract = Readonly<{
  key: string;
  collectsValidatesLocksInputsBeforeCalculation: true;
  payrollCalculationConsumesInputsOnly: true;
  readsOperationalModulesDirectlyDuringCalculation: false;
  duplicatesSourceData: false;
  automaticExceptionResolutionImplemented: false;
  payrollCalculationEngineImplemented: false;
  countryLocalizationImplemented: false;
  processingFlow: readonly [
    "collect_inputs",
    "validate_inputs",
    "approval_readiness",
    "lock_inputs",
    "supply_to_calculation",
  ];
}>;

export type HrPayrollInputsSourceIntegrationContract = Readonly<{
  key: string;
  supportedSources: readonly HrPayrollInputSource[];
  referencesHrContract: true;
  referencesAssignmentEngine: true;
  referencesAttendanceEngine: true;
  referencesLeaveEngineReadiness: true;
  referencesCompensationFoundation: true;
  referencesLoanFoundationReadiness: true;
  referencesAdvanceFoundationReadiness: true;
  referencesPenaltyFoundationReadiness: true;
  referencesManualEntry: true;
  referencesApiIntegrationsReadiness: true;
  duplicatesSourceData: false;
  runtimeImplemented: false;
}>;

export type HrPayrollInputsWorkflowApprovalIntegrationContract = Readonly<{
  key: string;
  referencesPlatformWorkflowDefinitions: true;
  referencesPlatformApprovalDefinitions: true;
  referencesPlatformNotificationContracts: true;
  directEngineCoupling: false;
  approvalRuntimeImplemented: false;
}>;

export function defineHrPayrollInput<T extends HrPayrollInputDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollInputSourceRef<T extends HrPayrollInputSourceRefDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollAdjustment<T extends HrPayrollAdjustmentDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRuntimeException<T extends HrPayrollRuntimeExceptionDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRuntimeLock<T extends HrPayrollRuntimeLockDefinition>(definition: T): T {
  return definition;
}

export function createHrPayrollRecalculationReadinessInput(input: Readonly<{
  scope: HrPayrollRecalculationScope;
  employeeId?: string | null;
  payrollGroupId?: string | null;
  payrollRunId?: string | null;
}>): HrPayrollRecalculationReadinessDefinition {
  return {
    ...input,
    recalculationEngineImplemented: false,
  };
}

export function payrollInputAllowsMutation(status: HrPayrollInputStatus, approvalStatus: HrPayrollInputApprovalStatus): boolean {
  if (status === "locked" || approvalStatus === "approved") {
    return false;
  }

  return status === "draft" || status === "submitted" || status === "under_review";
}

export function resolveHrPayrollInputSourceEngineKey(source: HrPayrollInputSource): string {
  const map: Record<HrPayrollInputSource, string> = {
    advance_foundation: "hr.advance-foundation",
    api_integration: "hr.api-integration-readiness",
    assignment_engine: "hr.assignment-engine",
    attendance_engine: "hr.attendance-engine",
    compensation_foundation: "hr.compensation-foundation",
    hr_contract: "hr.core.contract",
    leave_engine: "hr.leave-engine-readiness",
    loan_foundation: "hr.loan-foundation",
    manual_entry: "hr.payroll.inputs.manual",
    penalty_foundation: "hr.penalty-foundation",
  };

  return map[source];
}

export const HR_PAYROLL_INPUT_KINDS = [
  "manual_adjustment",
  "allowance_adjustment",
  "deduction_adjustment",
  "bonus",
  "commission",
  "incentive",
  "overtime",
  "attendance_summary",
  "leave_summary",
  "penalty_summary",
  "loan_installment",
  "advance_installment",
  "benefit_adjustment",
  "retro_adjustment",
] as const satisfies readonly HrPayrollInputKind[];

export const HR_PAYROLL_INPUT_SOURCES = [
  "hr_contract",
  "assignment_engine",
  "attendance_engine",
  "leave_engine",
  "compensation_foundation",
  "loan_foundation",
  "advance_foundation",
  "penalty_foundation",
  "manual_entry",
  "api_integration",
] as const satisfies readonly HrPayrollInputSource[];

export const HR_PAYROLL_INPUT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "locked",
  "rejected",
  "cancelled",
] as const satisfies readonly HrPayrollInputStatus[];

export const HR_PAYROLL_ADJUSTMENT_KINDS = [
  "positive",
  "negative",
  "one_time",
  "recurring",
  "retroactive",
] as const satisfies readonly HrPayrollAdjustmentKind[];

export const HR_PAYROLL_RUNTIME_EXCEPTION_TYPES = [
  "missing_attendance",
  "missing_payroll_group",
  "missing_salary_component",
  "duplicate_input",
  "closed_payroll_period",
  "employee_terminated",
  "employee_suspended",
  "missing_approval",
  "invalid_assignment",
  "invalid_contract",
  "missing_cost_center",
  "missing_currency",
  "manual_exception",
] as const satisfies readonly HrPayrollRuntimeExceptionType[];

export const HR_PAYROLL_RUNTIME_LOCK_SCOPES = [
  "employee",
  "payroll_period",
  "payroll_run",
  "payroll_result",
  "payslip",
  "component",
  "input",
  "approval",
] as const satisfies readonly HrPayrollRuntimeLockScope[];

export const HR_PAYROLL_RUNTIME_LOCK_REASONS = [
  "validation",
  "approval",
  "published",
  "closed",
  "manual_lock",
] as const satisfies readonly HrPayrollRuntimeLockReason[];

export const HR_PAYROLL_RECALCULATION_SCOPES = [
  "employee",
  "payroll_group",
  "payroll_run",
] as const satisfies readonly HrPayrollRecalculationScope[];

export const HR_PAYROLL_INPUTS_RUNTIME_ENGINE_BOUNDARY_CONTRACT: HrPayrollInputsRuntimeEngineBoundaryContract = {
  automaticExceptionResolutionImplemented: false,
  collectsValidatesLocksInputsBeforeCalculation: true,
  countryLocalizationImplemented: false,
  duplicatesSourceData: false,
  key: "hr.payroll.inputs.runtime.boundary",
  payrollCalculationConsumesInputsOnly: true,
  payrollCalculationEngineImplemented: false,
  processingFlow: [
    "collect_inputs",
    "validate_inputs",
    "approval_readiness",
    "lock_inputs",
    "supply_to_calculation",
  ],
  readsOperationalModulesDirectlyDuringCalculation: false,
};

export const HR_PAYROLL_INPUTS_SOURCE_INTEGRATION_CONTRACT: HrPayrollInputsSourceIntegrationContract = {
  duplicatesSourceData: false,
  key: "hr.payroll.inputs.source-integration",
  referencesAdvanceFoundationReadiness: true,
  referencesApiIntegrationsReadiness: true,
  referencesAssignmentEngine: true,
  referencesAttendanceEngine: true,
  referencesCompensationFoundation: true,
  referencesHrContract: true,
  referencesLeaveEngineReadiness: true,
  referencesLoanFoundationReadiness: true,
  referencesManualEntry: true,
  referencesPenaltyFoundationReadiness: true,
  runtimeImplemented: false,
  supportedSources: HR_PAYROLL_INPUT_SOURCES,
};

export const HR_PAYROLL_INPUTS_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT: HrPayrollInputsWorkflowApprovalIntegrationContract = {
  approvalRuntimeImplemented: false,
  directEngineCoupling: false,
  key: "hr.payroll.inputs.workflow-approval-integration",
  referencesPlatformApprovalDefinitions: true,
  referencesPlatformNotificationContracts: true,
  referencesPlatformWorkflowDefinitions: true,
};

export const HR_PAYROLL_INPUTS_RUNTIME_VALIDATION_RULES = [
  { key: "input_requires_employee_and_period", message: "Payroll input must reference employee and payroll period.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "input_requires_amount_or_quantity", message: "Payroll input must include amount or quantity.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "input_source_reference_required", message: "Non-manual payroll inputs must reference a source record.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "duplicate_input_blocked", message: "Duplicate payroll input for same employee, period, and kind is blocked.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "closed_period_input_blocked", message: "Payroll inputs cannot be added to closed payroll periods.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "input_locked_after_approval", message: "Payroll inputs are immutable after approval or lock.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "adjustment_requires_kind_and_amount", message: "Payroll adjustment must include kind and amount.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "exception_no_automatic_resolution", message: "Payroll runtime exceptions have no automatic resolution.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "recalculation_contract_only", message: "Payroll recalculation readiness is contract-only.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_direct_operational_module_reads", message: "Payroll calculation must consume inputs, not operational modules directly.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_PAYROLL_INPUTS_RUNTIME_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payroll.inputs.runtime.platform-integration",
  printReadinessRegistered: true,
  reportReadinessRegistered: true,
  searchRegistered: true,
  runtimeReportGenerationImplemented: false,
} as const;

export const HR_PAYROLL_INPUTS_RUNTIME_REPORT_READINESS = {
  dashboardDatasets: ["payroll_inputs", "payroll_adjustments", "payroll_exceptions", "payroll_runtime_locks"] as const,
  key: "hr.payroll.inputs.runtime.report-readiness",
  reportDatasets: ["payroll_input_summary", "adjustment_summary", "exception_summary", "lock_summary"] as const,
  runtimeReportGenerationImplemented: false,
} as const;

const hrPayrollInputsImportExportSecurity = {
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

export const HR_PAYROLL_INPUTS_RUNTIME_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "inputKind", label: "Input Kind", required: true },
    { dataType: "text", key: "employeeId", label: "Employee ID", required: true },
    { dataType: "text", key: "periodCode", label: "Period Code", required: true },
    { dataType: "number", key: "amount", label: "Amount" },
  ],
  key: "hr.payroll.inputs.runtime.import",
  label: "HR Payroll Inputs Runtime Import",
  mappings: [
    { key: "input-kind", sourceColumn: "Input Kind", targetField: "inputKind" },
    { key: "employee-id", sourceColumn: "Employee ID", targetField: "employeeId" },
    { key: "period-code", sourceColumn: "Period Code", targetField: "periodCode" },
    { key: "amount", sourceColumn: "Amount", targetField: "amount" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { inputsRuntimeFoundationOnly: true, payrollCalculationImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollInputsImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "inputKind", key: "payroll-input-kind-required", message: "Input kind is required.", severity: "error", type: "required" },
    { fieldKey: "employeeId", key: "payroll-input-employee-required", message: "Employee is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_INPUTS_RUNTIME_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "inputKind", label: "Input Kind", order: 1, sourceField: "inputKind" },
    { dataType: "text", key: "status", label: "Status", order: 2, sourceField: "status" },
    { dataType: "number", key: "amount", label: "Amount", order: 3, sourceField: "amount", sensitive: true, pii: true },
  ],
  key: "hr.payroll.inputs.runtime.export",
  label: "HR Payroll Inputs Runtime Export",
  mappings: [
    { key: "input-kind", sourceField: "inputKind", targetColumn: "Input Kind" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
    { key: "amount", sourceField: "amount", targetColumn: "Amount" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-inputs-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollInputsImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_INPUTS_RUNTIME_EVENT_DEFINITIONS = [
  "PayrollInputCreated",
  "PayrollInputSubmitted",
  "PayrollInputApproved",
  "PayrollInputLocked",
  "PayrollInputRejected",
  "PayrollAdjustmentCreated",
  "PayrollRuntimeExceptionCreated",
  "PayrollRuntimeLockCreated",
  "PayrollRecalculationRequested",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payroll Inputs Runtime Foundation. No payroll calculation or automatic exception resolution handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYROLL_INPUTS_RUNTIME_AUDIT_ACTIONS = {
  payrollAdjustmentCreated: defineAuditAction("hr.payroll.inputs.adjustment.created"),
  payrollInputApproved: defineAuditAction("hr.payroll.inputs.input.approved"),
  payrollInputCreated: defineAuditAction("hr.payroll.inputs.input.created"),
  payrollInputLocked: defineAuditAction("hr.payroll.inputs.input.locked"),
  payrollInputRejected: defineAuditAction("hr.payroll.inputs.input.rejected"),
  payrollInputSubmitted: defineAuditAction("hr.payroll.inputs.input.submitted"),
  payrollRecalculationRequested: defineAuditAction("hr.payroll.inputs.recalculation.requested"),
  payrollRuntimeExceptionCreated: defineAuditAction("hr.payroll.inputs.exception.created"),
  payrollRuntimeLockCreated: defineAuditAction("hr.payroll.inputs.lock.created"),
} as const;

export const HR_PAYROLL_INPUTS_RUNTIME_FOUNDATION_TABLES = [
  "hr_payroll_inputs",
  "hr_payroll_adjustments",
  "hr_payroll_input_sources",
  "hr_payroll_runtime_locks",
] as const;

export const HR_PAYROLL_INPUTS_RUNTIME_RELATED_TABLES = [
  "hr_payroll_exceptions",
] as const;

export const HR_PAYROLL_INPUTS_RUNTIME_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payrollInputsView, scope: "tenant-company-branch", entity: "payroll-input" },
  { key: HR_PERMISSIONS.payrollInputsManage, scope: "tenant-company-branch", entity: "payroll-input" },
  { key: HR_PERMISSIONS.payrollAdjustmentsManage, scope: "tenant-company-branch", entity: "payroll-adjustment" },
  { key: HR_PERMISSIONS.payrollExceptionsViewRuntime, scope: "tenant-company-branch", entity: "payroll-runtime-exception" },
  { key: HR_PERMISSIONS.payrollLocksManageRuntime, scope: "tenant-company-branch", entity: "payroll-runtime-lock" },
] as const;
