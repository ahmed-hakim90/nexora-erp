import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollRuntimeFrequency =
  | "monthly"
  | "semi_monthly"
  | "weekly"
  | "biweekly"
  | "daily";

export type HrPayrollRuntimePeriodStatus =
  | "open"
  | "locked"
  | "processing"
  | "approved"
  | "paid"
  | "closed"
  | "cancelled";

export type HrPayrollRunType =
  | "regular"
  | "off_cycle"
  | "bonus"
  | "adjustment"
  | "final_settlement"
  | "retroactive";

export type HrPayrollRunStatus =
  | "draft"
  | "validating"
  | "ready"
  | "processing"
  | "completed"
  | "under_approval"
  | "approved"
  | "paid"
  | "cancelled"
  | "failed";

export type HrPayrollRuntimePayslipStatus =
  | "draft"
  | "generated"
  | "approved"
  | "published"
  | "cancelled";

export type HrPayrollResultComponentType =
  | "earning"
  | "deduction"
  | "employer_contribution"
  | "benefit"
  | "informational";

export type HrPayrollResultComponentSource =
  | "contract"
  | "assignment"
  | "attendance"
  | "leave"
  | "overtime"
  | "penalty"
  | "loan"
  | "manual_adjustment"
  | "payroll_policy";

export type HrPayrollPostingLineType =
  | "salary_expense"
  | "allowance_expense"
  | "deduction_liability"
  | "employee_payable"
  | "employer_contribution"
  | "cost_center_allocation";

export type HrPayrollRetroDetectionType =
  | "salary_change_after_closed_period"
  | "backdated_assignment"
  | "backdated_attendance_correction"
  | "backdated_leave_approval"
  | "backdated_penalty";

export type HrPayrollReadinessStatus =
  | "draft"
  | "detected"
  | "pending_review"
  | "ready"
  | "applied"
  | "dismissed"
  | "cancelled";

export type HrPayrollRuntimeScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollRuntimeCalendarDefinition = HrPayrollRuntimeScope & Readonly<{
  code: string;
  name: string;
  frequency: HrPayrollRuntimeFrequency;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: "draft" | "active" | "inactive" | "archived";
  consumesFoundationCalendar: true;
}>;

export type HrPayrollRuntimePeriodDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollCalendarId: string;
  periodCode: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  cutoffDate: string;
  status: HrPayrollRuntimePeriodStatus;
  consumesFoundationPeriod: true;
}>;

export type HrPayrollRuntimeGroupDefinition = HrPayrollRuntimeScope & Readonly<{
  code: string;
  name: string;
  payrollCalendarId: string;
  status: "draft" | "active" | "inactive" | "archived";
  assignmentEngineAssignable: true;
  consumesFoundationGroup: true;
}>;

export type HrPayrollRunDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollPeriodId: string;
  payrollGroupId: string;
  payrollBatchId?: string | null;
  runType: HrPayrollRunType;
  status: HrPayrollRunStatus;
  requestedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  payrollCalculationImplemented: false;
  countryLocalizationImplemented: false;
}>;

export type HrPayrollEmployeeSnapshotDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollRunId: string;
  employeeId: string;
  employmentProfileId: string;
  contractId?: string | null;
  positionId?: string | null;
  jobId?: string | null;
  departmentId?: string | null;
  costCenterId?: string | null;
  payrollGroupId?: string | null;
  basicSalary?: number | null;
  salaryComponents: ReadonlyArray<Readonly<Record<string, unknown>>>;
  attendanceSummary: Readonly<Record<string, unknown>>;
  leaveSummary: Readonly<Record<string, unknown>>;
  overtimeSummary: Readonly<Record<string, unknown>>;
  penaltiesSummary: Readonly<Record<string, unknown>>;
  loanAdvanceSummary: Readonly<Record<string, unknown>>;
  immutableAfterApproval: boolean;
  consumesHrFoundationOnly: true;
  duplicatesEmployeeCompensation: false;
}>;

export type HrPayrollResultDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollRunId: string;
  employeeSnapshotId: string;
  employeeId: string;
  grossEarnings: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  netPay: number;
  currency: string;
  status: HrPayrollRunStatus;
  statutoryCalculationImplemented: false;
}>;

export type HrPayrollResultComponentDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollResultId: string;
  componentCode: string;
  componentName: string;
  componentType: HrPayrollResultComponentType;
  source: HrPayrollResultComponentSource;
  amount: number;
  quantity?: number | null;
  rate?: number | null;
  currency: string;
  calculationMetadata: Readonly<Record<string, unknown>>;
  calculationRuntimeImplemented: false;
}>;

export type HrPayrollRuntimePayslipDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollRunId: string;
  employeeSnapshotId: string;
  payrollResultId: string;
  employeeId: string;
  runtimePayslipStatus: HrPayrollRuntimePayslipStatus;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  pdfRenderingImplemented: false;
  employeePortalPublishingImplemented: false;
}>;

export type HrPayrollRetroReadinessDefinition = HrPayrollRuntimeScope & Readonly<{
  employeeId: string;
  affectedPeriodId?: string | null;
  detectionType: HrPayrollRetroDetectionType;
  sourceRecordId?: string | null;
  sourceReference?: string | null;
  status: HrPayrollReadinessStatus;
  retroCalculationImplemented: false;
}>;

export type HrFinalSettlementReadinessDefinition = HrPayrollRuntimeScope & Readonly<{
  employeeId: string;
  payrollRunId?: string | null;
  lastWorkingDay: string;
  unpaidSalary: number;
  leaveBalancePayout: number;
  loanBalance: number;
  advances: number;
  penalties: number;
  endOfServicePlaceholder: number;
  currency: string;
  status: HrPayrollReadinessStatus;
  statutoryEosCalculationImplemented: false;
}>;

export type HrPayrollPostingReadinessLineDefinition = HrPayrollRuntimeScope & Readonly<{
  payrollRunId: string;
  payrollResultId?: string | null;
  postingLineType: HrPayrollPostingLineType;
  amount: number;
  costCenterId?: string | null;
  currency: string;
  status: HrPayrollReadinessStatus;
  journalPostingImplemented: false;
}>;

export type HrPayrollRuntimeEngineBoundaryContract = Readonly<{
  key: string;
  payrollIsRuntimeEngine: true;
  hrFoundationDefinesPoliciesAndEmployeeData: true;
  payrollExecutesPeriodsAndProducesResults: true;
  storesPayrollRulesOnEmployees: false;
  duplicatesEmployeeCompensationData: false;
  bypassesAssignmentEngine: false;
  countrySpecificStatutoryRulesImplemented: false;
  payrollCalculationImplemented: false;
  payslipPdfRenderingImplemented: false;
  accountingPostingImplemented: false;
  employeePortalPublishingImplemented: false;
  processingFlow: readonly [
    "open_period",
    "create_run",
    "validate_inputs",
    "snapshot_employees",
    "calculate_results",
    "approve_run",
    "generate_payslips",
    "publish_readiness",
    "finance_posting_readiness",
    "close_period",
  ];
}>;

export type HrPayrollRuntimeFoundationIntegrationContract = Readonly<{
  key: string;
  consumesEmployeeProfile: true;
  consumesEmploymentContract: true;
  consumesAssignmentEngine: true;
  consumesCompensationFoundation: true;
  consumesAttendanceFoundation: true;
  consumesLeaveFoundationReadiness: true;
  consumesPenaltyFoundationReadiness: true;
  consumesLoanAdvanceFoundationReadiness: true;
  consumesWorkforceFoundation: true;
  runtimeImplemented: false;
}>;

export type HrPayrollRuntimeWorkflowApprovalIntegrationContract = Readonly<{
  key: string;
  referencesPlatformWorkflowDefinitions: true;
  referencesPlatformApprovalDefinitions: true;
  referencesPlatformNotificationContracts: true;
  directEngineCoupling: false;
  workflowRuntimeImplemented: false;
  approvalRuntimeImplemented: false;
}>;

export type HrPayrollRuntimeFinanceReadinessContract = Readonly<{
  key: string;
  supportedPostingLines: readonly HrPayrollPostingLineType[];
  journalEntryPostingImplemented: false;
  accountingRuntimeImplemented: false;
}>;

export type HrPayrollRuntimeCostReadinessContract = Readonly<{
  key: string;
  supportedConsumers: readonly ["cost_engine", "manufacturing", "projects", "service", "fleet"];
  laborCostFactsReadiness: true;
  costCalculationPostingImplemented: false;
}>;

export function defineHrPayrollRuntimeCalendar<T extends HrPayrollRuntimeCalendarDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRuntimePeriod<T extends HrPayrollRuntimePeriodDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRuntimeGroup<T extends HrPayrollRuntimeGroupDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRun<T extends HrPayrollRunDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollEmployeeSnapshot<T extends HrPayrollEmployeeSnapshotDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollResult<T extends HrPayrollResultDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollResultComponent<T extends HrPayrollResultComponentDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRuntimePayslip<T extends HrPayrollRuntimePayslipDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollRetroReadiness<T extends HrPayrollRetroReadinessDefinition>(definition: T): T {
  return definition;
}

export function defineHrFinalSettlementReadiness<T extends HrFinalSettlementReadinessDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollPostingReadinessLine<T extends HrPayrollPostingReadinessLineDefinition>(definition: T): T {
  return definition;
}

export function createHrPayrollEmployeeSnapshotInput(input: Readonly<{
  payrollRunId: string;
  employeeId: string;
  employmentProfileId: string;
  contractId?: string | null;
  positionId?: string | null;
  jobId?: string | null;
  departmentId?: string | null;
  basicSalary?: number | null;
}>): Omit<HrPayrollEmployeeSnapshotDefinition, keyof HrPayrollRuntimeScope | "immutableAfterApproval" | "consumesHrFoundationOnly" | "duplicatesEmployeeCompensation" | "salaryComponents" | "attendanceSummary" | "leaveSummary" | "overtimeSummary" | "penaltiesSummary" | "loanAdvanceSummary" | "costCenterId" | "payrollGroupId"> & {
  attendanceSummary: Readonly<Record<string, unknown>>;
  consumesHrFoundationOnly: true;
  duplicatesEmployeeCompensation: false;
  immutableAfterApproval: false;
  leaveSummary: Readonly<Record<string, unknown>>;
  loanAdvanceSummary: Readonly<Record<string, unknown>>;
  overtimeSummary: Readonly<Record<string, unknown>>;
  penaltiesSummary: Readonly<Record<string, unknown>>;
  salaryComponents: readonly [];
} {
  return {
    ...input,
    attendanceSummary: {},
    consumesHrFoundationOnly: true,
    duplicatesEmployeeCompensation: false,
    immutableAfterApproval: false,
    leaveSummary: {},
    loanAdvanceSummary: {},
    overtimeSummary: {},
    penaltiesSummary: {},
    salaryComponents: [],
  };
}

export function resolveHrPayrollGrossDeductionNet(input: Readonly<{
  grossEarnings: number;
  totalDeductions: number;
  totalEmployerContributions: number;
}>): Readonly<{
  grossEarnings: number;
  netPay: number;
  statutoryCalculationImplemented: false;
  totalDeductions: number;
  totalEmployerContributions: number;
}> {
  return {
    grossEarnings: input.grossEarnings,
    netPay: input.grossEarnings - input.totalDeductions,
    statutoryCalculationImplemented: false,
    totalDeductions: input.totalDeductions,
    totalEmployerContributions: input.totalEmployerContributions,
  };
}

export function payrollRunAllowsEmployeeSnapshotMutation(status: HrPayrollRunStatus): boolean {
  return status === "draft" || status === "validating" || status === "ready";
}

export const HR_PAYROLL_RUNTIME_FREQUENCIES = [
  "monthly",
  "semi_monthly",
  "weekly",
  "biweekly",
  "daily",
] as const satisfies readonly HrPayrollRuntimeFrequency[];

export const HR_PAYROLL_RUNTIME_PERIOD_STATUSES = [
  "open",
  "locked",
  "processing",
  "approved",
  "paid",
  "closed",
  "cancelled",
] as const satisfies readonly HrPayrollRuntimePeriodStatus[];

export const HR_PAYROLL_RUN_TYPES = [
  "regular",
  "off_cycle",
  "bonus",
  "adjustment",
  "final_settlement",
  "retroactive",
] as const satisfies readonly HrPayrollRunType[];

export const HR_PAYROLL_RUN_STATUSES = [
  "draft",
  "validating",
  "ready",
  "processing",
  "completed",
  "under_approval",
  "approved",
  "paid",
  "cancelled",
  "failed",
] as const satisfies readonly HrPayrollRunStatus[];

export const HR_PAYROLL_RUNTIME_PAYSLIP_STATUSES = [
  "draft",
  "generated",
  "approved",
  "published",
  "cancelled",
] as const satisfies readonly HrPayrollRuntimePayslipStatus[];

export const HR_PAYROLL_RESULT_COMPONENT_TYPES = [
  "earning",
  "deduction",
  "employer_contribution",
  "benefit",
  "informational",
] as const satisfies readonly HrPayrollResultComponentType[];

export const HR_PAYROLL_RESULT_COMPONENT_SOURCES = [
  "contract",
  "assignment",
  "attendance",
  "leave",
  "overtime",
  "penalty",
  "loan",
  "manual_adjustment",
  "payroll_policy",
] as const satisfies readonly HrPayrollResultComponentSource[];

export const HR_PAYROLL_POSTING_LINE_TYPES = [
  "salary_expense",
  "allowance_expense",
  "deduction_liability",
  "employee_payable",
  "employer_contribution",
  "cost_center_allocation",
] as const satisfies readonly HrPayrollPostingLineType[];

export const HR_PAYROLL_RETRO_DETECTION_TYPES = [
  "salary_change_after_closed_period",
  "backdated_assignment",
  "backdated_attendance_correction",
  "backdated_leave_approval",
  "backdated_penalty",
] as const satisfies readonly HrPayrollRetroDetectionType[];

export const HR_PAYROLL_RUNTIME_GROUP_EXAMPLES = [
  { code: "MONTHLY_STAFF", name: "Monthly Staff" },
  { code: "FACTORY_WORKERS", name: "Factory Workers" },
  { code: "SALES_TEAM", name: "Sales Team" },
  { code: "DRIVERS", name: "Drivers" },
  { code: "SERVICE_TECHNICIANS", name: "Service Technicians" },
] as const;

export const HR_PAYROLL_RUNTIME_ENGINE_BOUNDARY_CONTRACT: HrPayrollRuntimeEngineBoundaryContract = {
  accountingPostingImplemented: false,
  bypassesAssignmentEngine: false,
  countrySpecificStatutoryRulesImplemented: false,
  duplicatesEmployeeCompensationData: false,
  employeePortalPublishingImplemented: false,
  hrFoundationDefinesPoliciesAndEmployeeData: true,
  key: "hr.payroll.runtime.boundary",
  payrollCalculationImplemented: false,
  payrollExecutesPeriodsAndProducesResults: true,
  payrollIsRuntimeEngine: true,
  payslipPdfRenderingImplemented: false,
  processingFlow: [
    "open_period",
    "create_run",
    "validate_inputs",
    "snapshot_employees",
    "calculate_results",
    "approve_run",
    "generate_payslips",
    "publish_readiness",
    "finance_posting_readiness",
    "close_period",
  ],
  storesPayrollRulesOnEmployees: false,
};

export const HR_PAYROLL_RUNTIME_FOUNDATION_INTEGRATION_CONTRACT: HrPayrollRuntimeFoundationIntegrationContract = {
  consumesAssignmentEngine: true,
  consumesAttendanceFoundation: true,
  consumesCompensationFoundation: true,
  consumesEmployeeProfile: true,
  consumesEmploymentContract: true,
  consumesLeaveFoundationReadiness: true,
  consumesLoanAdvanceFoundationReadiness: true,
  consumesPenaltyFoundationReadiness: true,
  consumesWorkforceFoundation: true,
  key: "hr.payroll.runtime.foundation-integration",
  runtimeImplemented: false,
};

export const HR_PAYROLL_RUNTIME_WORKFLOW_APPROVAL_INTEGRATION_CONTRACT: HrPayrollRuntimeWorkflowApprovalIntegrationContract = {
  approvalRuntimeImplemented: false,
  directEngineCoupling: false,
  key: "hr.payroll.runtime.workflow-approval-integration",
  referencesPlatformApprovalDefinitions: true,
  referencesPlatformNotificationContracts: true,
  referencesPlatformWorkflowDefinitions: true,
  workflowRuntimeImplemented: false,
};

export const HR_PAYROLL_RUNTIME_FINANCE_READINESS_CONTRACT: HrPayrollRuntimeFinanceReadinessContract = {
  accountingRuntimeImplemented: false,
  journalEntryPostingImplemented: false,
  key: "hr.payroll.runtime.finance-readiness",
  supportedPostingLines: HR_PAYROLL_POSTING_LINE_TYPES,
};

export const HR_PAYROLL_RUNTIME_COST_READINESS_CONTRACT: HrPayrollRuntimeCostReadinessContract = {
  costCalculationPostingImplemented: false,
  key: "hr.payroll.runtime.cost-readiness",
  laborCostFactsReadiness: true,
  supportedConsumers: ["cost_engine", "manufacturing", "projects", "service", "fleet"],
};

export const HR_PAYROLL_RUNTIME_VALIDATION_RULES = [
  { key: "employee_active_contract_required", message: "Employee must have an active contract.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "employee_payroll_group_required", message: "Employee must belong to a payroll group.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "payroll_period_open_required", message: "Payroll period must be open.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "duplicate_regular_run_blocked", message: "Duplicate regular payroll run for same employee and period is blocked unless off-cycle.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "required_salary_components_exist", message: "Required salary components must exist in snapshot.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "attendance_cutoff_complete", message: "Attendance cutoff must be complete where required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "leave_approvals_complete", message: "Leave approvals must be complete where required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "loan_deductions_ready", message: "Loan deductions must be ready where required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "snapshot_immutable_after_approval", message: "Employee snapshot is immutable after payroll run approval.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_statutory_calculation", message: "Country-specific statutory calculation is not implemented.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_PAYROLL_RUNTIME_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payroll.runtime.platform-integration",
  printReadinessRegistered: true,
  reportReadinessRegistered: true,
  searchRegistered: true,
  runtimeReportGenerationImplemented: false,
} as const;

export const HR_PAYROLL_RUNTIME_REPORT_READINESS = {
  dashboardDatasets: ["payroll_runs", "payroll_results", "payslips", "payroll_periods", "payroll_groups"] as const,
  key: "hr.payroll.runtime.report-readiness",
  reportDatasets: ["payroll_runs", "headcount_cost", "gross_net_summary", "deduction_summary"] as const,
  runtimeReportGenerationImplemented: false,
} as const;

const hrPayrollRuntimeImportExportSecurity = {
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

export const HR_PAYROLL_RUNTIME_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "periodCode", label: "Period Code" },
    { dataType: "text", key: "runType", label: "Run Type" },
  ],
  key: "hr.payroll.runtime.import",
  label: "HR Payroll Runtime Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "period-code", sourceColumn: "Period Code", targetField: "periodCode" },
    { key: "run-type", sourceColumn: "Run Type", targetField: "runType" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { payrollCalculationImplemented: false, runtimeFoundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollRuntimeImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "payroll-runtime-code-required", message: "Payroll runtime code is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_RUNTIME_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status", sensitive: true, pii: true },
  ],
  key: "hr.payroll.runtime.export",
  label: "HR Payroll Runtime Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-runtime-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollRuntimeImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_RUNTIME_EVENT_DEFINITIONS = [
  "PayrollPeriodOpened",
  "PayrollPeriodLocked",
  "PayrollRunCreated",
  "PayrollRunValidated",
  "PayrollRunCompleted",
  "PayrollRunApprovalRequested",
  "PayrollRunApproved",
  "PayrollRunPaid",
  "PayrollRunCancelled",
  "PayslipGenerated",
  "PayslipPublished",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payroll Runtime Foundation. No statutory calculation, finance posting, or payslip PDF runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYROLL_RUNTIME_AUDIT_ACTIONS = {
  finalSettlementReadinessCreated: defineAuditAction("hr.payroll.runtime.final-settlement.created"),
  payrollEmployeeSnapshotCreated: defineAuditAction("hr.payroll.runtime.employee-snapshot.created"),
  payrollPeriodLocked: defineAuditAction("hr.payroll.runtime.period.locked"),
  payrollPeriodOpened: defineAuditAction("hr.payroll.runtime.period.opened"),
  payrollPostingReadinessCreated: defineAuditAction("hr.payroll.runtime.posting-readiness.created"),
  payrollResultCreated: defineAuditAction("hr.payroll.runtime.result.created"),
  payrollRetroReadinessDetected: defineAuditAction("hr.payroll.runtime.retro.detected"),
  payrollRunApprovalRequested: defineAuditAction("hr.payroll.runtime.run.approval-requested"),
  payrollRunApproved: defineAuditAction("hr.payroll.runtime.run.approved"),
  payrollRunCancelled: defineAuditAction("hr.payroll.runtime.run.cancelled"),
  payrollRunCompleted: defineAuditAction("hr.payroll.runtime.run.completed"),
  payrollRunCreated: defineAuditAction("hr.payroll.runtime.run.created"),
  payrollRunPaid: defineAuditAction("hr.payroll.runtime.run.paid"),
  payrollRunValidated: defineAuditAction("hr.payroll.runtime.run.validated"),
  payslipGenerated: defineAuditAction("hr.payroll.runtime.payslip.generated"),
  payslipPublished: defineAuditAction("hr.payroll.runtime.payslip.published"),
} as const;

export const HR_PAYROLL_RUNTIME_FOUNDATION_TABLES = [
  "hr_payroll_runs",
  "hr_payroll_employee_snapshots",
  "hr_payroll_results",
  "hr_payroll_result_components",
  "hr_payroll_posting_readiness",
  "hr_payroll_retro_readiness",
  "hr_final_settlement_readiness",
] as const;

export const HR_PAYROLL_RUNTIME_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payrollView, scope: "tenant-company-branch", entity: "payroll-runtime" },
  { key: HR_PERMISSIONS.payrollManage, scope: "tenant-company-branch", entity: "payroll-calendar-period" },
  { key: HR_PERMISSIONS.payrollRun, scope: "tenant-company-branch", entity: "payroll-run" },
  { key: HR_PERMISSIONS.payrollApprove, scope: "tenant-company-branch", entity: "payroll-run-approval" },
  { key: HR_PERMISSIONS.payrollPublish, scope: "tenant-company-branch", entity: "payroll-publish" },
  { key: HR_PERMISSIONS.payslipsView, scope: "tenant-company-branch", entity: "payslip" },
  { key: HR_PERMISSIONS.payslipsViewSelf, scope: "employee-self", entity: "payslip-self" },
  { key: HR_PERMISSIONS.payslipsPublish, scope: "tenant-company-branch", entity: "payslip-publish" },
] as const;
