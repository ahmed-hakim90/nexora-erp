import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollRecordStatus = "draft" | "active" | "inactive" | "archived";

export type HrPayrollFrequency = "monthly" | "biweekly" | "weekly" | "daily" | "custom";

export type HrPayrollPeriodStatus =
  | "open"
  | "input_collection"
  | "snapshot_ready"
  | "processing"
  | "review"
  | "approved"
  | "locked"
  | "posted"
  | "paid"
  | "closed"
  | "cancelled";

export type HrPayrollBatchType =
  | "regular"
  | "off_cycle"
  | "correction"
  | "final_settlement"
  | "bonus"
  | "adjustment";

export type HrPayrollBatchStatus =
  | "draft"
  | "collect_inputs"
  | "snapshot"
  | "ready_to_calculate"
  | "calculated"
  | "review"
  | "approved"
  | "locked"
  | "posting_ready"
  | "posted"
  | "payment_ready"
  | "paid"
  | "closed"
  | "cancelled";

export type HrPayslipStatus =
  | "draft"
  | "snapshot_ready"
  | "calculated"
  | "under_review"
  | "approved"
  | "locked"
  | "posted"
  | "paid"
  | "cancelled";

export type HrPayslipLineSourceType =
  | "compensation"
  | "attendance"
  | "production_incentive"
  | "loan"
  | "advance"
  | "tax"
  | "insurance"
  | "hr_action"
  | "manual_adjustment"
  | "retro_adjustment";

export type HrPayrollSnapshotKind =
  | "employment_profile"
  | "contract"
  | "compensation"
  | "salary_package"
  | "policy"
  | "attendance"
  | "workforce"
  | "production_incentive"
  | "loan"
  | "advance"
  | "deduction"
  | "tax"
  | "insurance"
  | "hr_action"
  | "manual_adjustment";

export type HrPayrollSnapshotSourceEngine =
  | "hr-core"
  | "policy"
  | "compensation"
  | "workforce"
  | "attendance"
  | "production"
  | "loans"
  | "hr-actions"
  | "tax"
  | "manual";

export type HrPayrollSnapshotLockStatus = "snapshot_created" | "snapshot_locked" | "snapshot_superseded";

export type HrPayrollExceptionType =
  | "missing_employment_profile"
  | "missing_salary_package"
  | "missing_attendance_snapshot"
  | "missing_policy"
  | "overlapping_compensation_override"
  | "missing_currency"
  | "missing_tax_rule"
  | "unpaid_leave_detected"
  | "attendance_not_approved"
  | "payroll_period_locked"
  | "calculation_blocked";

export type HrPayrollLockLevel =
  | "unlocked"
  | "snapshot_locked"
  | "calculation_locked"
  | "payroll_locked"
  | "period_locked";

export type HrRetroAdjustmentStatus = "draft" | "pending" | "approved" | "applied" | "cancelled";

export type HrPayrollPostingStatus = "not_ready" | "posting_ready" | "posted" | "failed";

export type HrPayrollScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type PayrollCalendarDefinition = HrPayrollScope & Readonly<{
  code: string;
  name: string;
  frequency: HrPayrollFrequency;
  timezone: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrPayrollRecordStatus;
}>;

export type PayrollPeriodDefinition = HrPayrollScope & Readonly<{
  payrollCalendarId: string;
  periodCode: string;
  periodName: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: HrPayrollPeriodStatus;
}>;

export type PayrollGroupDefinition = HrPayrollScope & Readonly<{
  code: string;
  name: string;
  departmentId?: string | null;
  employmentType?: string | null;
  gradeId?: string | null;
  payrollCalendarId: string;
  payrollPolicyVersionRef: string;
  status: HrPayrollRecordStatus;
}>;

export type PayrollBatchDefinition = HrPayrollScope & Readonly<{
  payrollPeriodId: string;
  payrollGroupId: string;
  batchType: HrPayrollBatchType;
  status: HrPayrollBatchStatus;
  inputCutoffDate?: string | null;
  snapshotCreatedAt?: string | null;
  calculatedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  closedAt?: string | null;
  calculationRuntimeImplemented: false;
}>;

export type PayslipDefinition = HrPayrollScope & Readonly<{
  payrollBatchId: string;
  employeeId: string;
  employmentProfileId: string;
  payrollPeriodId: string;
  status: HrPayslipStatus;
  grossAmountMetadata?: number | null;
  deductionAmountMetadata?: number | null;
  netAmountMetadata?: number | null;
  currency: string;
  snapshotRef?: string | null;
  approvalStatus: HrPayslipStatus;
  lockStatus: HrPayrollLockLevel;
  calculationRuntimeImplemented: false;
}>;

export type PayslipLineDefinition = HrPayrollScope & Readonly<{
  payslipId: string;
  compensationComponentVersionId?: string | null;
  componentCodeSnapshot: string;
  componentNameSnapshot: string;
  categorySnapshot: string;
  earningOrDeduction: "earning" | "deduction";
  amountMetadata?: number | null;
  quantityMetadata?: number | null;
  rateMetadata?: number | null;
  currency: string;
  sourceSnapshotRef?: string | null;
  sourceType: HrPayslipLineSourceType;
  displayOrder: number;
  calculationRuntimeImplemented: false;
}>;

export type PayrollSnapshotDefinition = HrPayrollScope & Readonly<{
  payrollBatchId: string;
  employeeId?: string | null;
  employmentProfileId?: string | null;
  snapshotKind: HrPayrollSnapshotKind;
  sourceEngine: HrPayrollSnapshotSourceEngine;
  sourceRecordId: string;
  sourceVersionId?: string | null;
  effectiveDateUsed: string;
  payload: Readonly<Record<string, unknown>>;
  checksumReadiness?: string | null;
  lockStatus: HrPayrollSnapshotLockStatus;
  immutableAfterSnapshotStage: true;
}>;

export type PayrollExceptionDefinition = HrPayrollScope & Readonly<{
  payrollBatchId: string;
  payslipId?: string | null;
  employeeId?: string | null;
  exceptionType: HrPayrollExceptionType;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_review" | "resolved" | "dismissed";
  resolverRuntimeImplemented: false;
}>;

export type RetroAdjustmentDefinition = HrPayrollScope & Readonly<{
  originalPayslipId: string;
  correctionBatchId: string;
  affectedPeriodId: string;
  reason?: string | null;
  sourceReference?: string | null;
  status: HrRetroAdjustmentStatus;
  calculationRuntimeImplemented: false;
}>;

export type PayrollPostingReadiness = Readonly<{
  key: string;
  postingStatusField: "posting_status";
  postingReferenceField: "posting_reference";
  journalReadiness: true;
  costCenterDistributionReadiness: true;
  employerCostReadiness: true;
  employeeCostReadiness: true;
  financePostingRuntimeImplemented: false;
  bankPaymentRuntimeImplemented: false;
}>;

export type PayrollProductionIncentiveSnapshotReadiness = Readonly<{
  key: string;
  snapshotKind: "production_incentive";
  supportedPayloadFields: readonly [
    "production_period",
    "worker_output",
    "line_achievement",
    "supervisor_approval",
    "quality_threshold",
    "scrap_threshold",
    "incentive_policy_version_id",
    "compensation_component_version_id",
  ];
  manufacturingDependencyImplemented: false;
  runtimeCalculationImplemented: false;
}>;

export type HrPayrollEngineBoundaryContract = Readonly<{
  key: string;
  snapshotFirstProcessing: true;
  calculatesFromLiveSourceEngines: false;
  calculatesFromSnapshotsOnly: true;
  payrollCalculationImplemented: false;
  payslipMathImplemented: false;
  financePostingImplemented: false;
  bankPaymentImplemented: false;
  workflowRuntimeImplemented: false;
  processingFlow: readonly [
    "collect_inputs",
    "create_snapshots",
    "calculate_from_snapshots",
    "review",
    "approve",
    "lock",
    "post_readiness",
    "pay_readiness",
    "close",
  ];
  calculateFromSnapshotsRuntimeImplemented: false;
}>;

export type HrPayrollSnapshotImmutabilityContract = Readonly<{
  key: string;
  immutableAfterBatchStages: readonly ["ready_to_calculate", "calculated", "review", "approved", "locked", "posting_ready", "posted", "payment_ready", "paid", "closed"];
  supersededOnlyByCorrectionBatch: true;
  historicalPayrollMutableByDirectEdit: false;
}>;

export type HrOffCyclePayrollReadiness = Readonly<{
  key: string;
  supportedBatchTypes: readonly ["off_cycle", "correction", "final_settlement", "bonus", "adjustment"];
  supportedScenarios: readonly [
    "bonus_run",
    "correction_run",
    "advance_run",
    "final_settlement",
    "emergency_payment",
    "one_time_payment",
  ];
  paymentExecutionImplemented: false;
}>;

export function definePayrollCalendar<T extends PayrollCalendarDefinition>(definition: T): T {
  return definition;
}

export function definePayrollPeriod<T extends PayrollPeriodDefinition>(definition: T): T {
  return definition;
}

export function definePayrollGroup<T extends PayrollGroupDefinition>(definition: T): T {
  return definition;
}

export function definePayrollBatch<T extends PayrollBatchDefinition>(definition: T): T {
  return definition;
}

export function definePayslip<T extends PayslipDefinition>(definition: T): T {
  return definition;
}

export function definePayslipLine<T extends PayslipLineDefinition>(definition: T): T {
  return definition;
}

export function definePayrollSnapshot<T extends PayrollSnapshotDefinition>(definition: T): T {
  return definition;
}

export function definePayrollException<T extends PayrollExceptionDefinition>(definition: T): T {
  return definition;
}

export function defineRetroAdjustment<T extends RetroAdjustmentDefinition>(definition: T): T {
  return definition;
}

export function payrollBatchAllowsSnapshotMutation(status: HrPayrollBatchStatus): boolean {
  return status === "draft" || status === "collect_inputs" || status === "snapshot";
}

export function createPayrollSnapshotInput(input: {
  payrollBatchId: string;
  snapshotKind: HrPayrollSnapshotKind;
  sourceEngine: HrPayrollSnapshotSourceEngine;
  sourceRecordId: string;
  sourceVersionId?: string | null;
  effectiveDateUsed: string;
  payload: Readonly<Record<string, unknown>>;
  employeeId?: string | null;
  employmentProfileId?: string | null;
}): Omit<PayrollSnapshotDefinition, keyof HrPayrollScope | "immutableAfterSnapshotStage" | "lockStatus"> & {
  lockStatus: HrPayrollSnapshotLockStatus;
  immutableAfterSnapshotStage: true;
} {
  return {
    effectiveDateUsed: input.effectiveDateUsed,
    employeeId: input.employeeId ?? null,
    employmentProfileId: input.employmentProfileId ?? null,
    immutableAfterSnapshotStage: true,
    lockStatus: "snapshot_created",
    payload: input.payload,
    payrollBatchId: input.payrollBatchId,
    snapshotKind: input.snapshotKind,
    sourceEngine: input.sourceEngine,
    sourceRecordId: input.sourceRecordId,
    sourceVersionId: input.sourceVersionId ?? null,
  };
}

export const HR_PAYROLL_FREQUENCIES = [
  "monthly",
  "biweekly",
  "weekly",
  "daily",
  "custom",
] as const satisfies readonly HrPayrollFrequency[];

export const HR_PAYROLL_PERIOD_STATUSES = [
  "open",
  "input_collection",
  "snapshot_ready",
  "processing",
  "review",
  "approved",
  "locked",
  "posted",
  "paid",
  "closed",
  "cancelled",
] as const satisfies readonly HrPayrollPeriodStatus[];

export const HR_PAYROLL_BATCH_TYPES = [
  "regular",
  "off_cycle",
  "correction",
  "final_settlement",
  "bonus",
  "adjustment",
] as const satisfies readonly HrPayrollBatchType[];

export const HR_PAYROLL_BATCH_STATUSES = [
  "draft",
  "collect_inputs",
  "snapshot",
  "ready_to_calculate",
  "calculated",
  "review",
  "approved",
  "locked",
  "posting_ready",
  "posted",
  "payment_ready",
  "paid",
  "closed",
  "cancelled",
] as const satisfies readonly HrPayrollBatchStatus[];

export const HR_PAYROLL_PAYSLIP_STATUSES = [
  "draft",
  "snapshot_ready",
  "calculated",
  "under_review",
  "approved",
  "locked",
  "posted",
  "paid",
  "cancelled",
] as const satisfies readonly HrPayslipStatus[];

export const HR_PAYROLL_EXCEPTION_TYPES = [
  "missing_employment_profile",
  "missing_salary_package",
  "missing_attendance_snapshot",
  "missing_policy",
  "overlapping_compensation_override",
  "missing_currency",
  "missing_tax_rule",
  "unpaid_leave_detected",
  "attendance_not_approved",
  "payroll_period_locked",
  "calculation_blocked",
] as const satisfies readonly HrPayrollExceptionType[];

export const HR_PAYROLL_LOCK_LEVELS = [
  "unlocked",
  "snapshot_locked",
  "calculation_locked",
  "payroll_locked",
  "period_locked",
] as const satisfies readonly HrPayrollLockLevel[];

export type HrPayrollLockReadiness = Readonly<{
  key: string;
  lockLevels: readonly HrPayrollLockLevel[];
  retroAdjustmentAfterPayrollLocked: true;
  destructiveChangesAfterPayrollLocked: false;
  lockRuntimeImplemented: false;
}>;

export const HR_PAYROLL_LOCK_READINESS: HrPayrollLockReadiness = {
  destructiveChangesAfterPayrollLocked: false,
  key: "hr.payroll.lock-readiness",
  lockLevels: HR_PAYROLL_LOCK_LEVELS,
  lockRuntimeImplemented: false,
  retroAdjustmentAfterPayrollLocked: true,
};

export const HR_PAYROLL_SNAPSHOT_KINDS = [
  "employment_profile",
  "contract",
  "compensation",
  "salary_package",
  "policy",
  "attendance",
  "workforce",
  "production_incentive",
  "loan",
  "advance",
  "deduction",
  "tax",
  "insurance",
  "hr_action",
  "manual_adjustment",
] as const satisfies readonly HrPayrollSnapshotKind[];

export const HR_PAYROLL_GROUP_EXAMPLES = [
  { code: "FACTORY_WORKERS", name: "Factory Workers" },
  { code: "OFFICE_STAFF", name: "Office Staff" },
  { code: "SALES_TEAM", name: "Sales Team" },
  { code: "MANAGEMENT", name: "Management" },
  { code: "TEMPORARY_WORKERS", name: "Temporary Workers" },
] as const;

export const HR_PAYROLL_ENGINE_BOUNDARY_CONTRACT: HrPayrollEngineBoundaryContract = {
  bankPaymentImplemented: false,
  calculateFromSnapshotsRuntimeImplemented: false,
  calculatesFromLiveSourceEngines: false,
  calculatesFromSnapshotsOnly: true,
  financePostingImplemented: false,
  key: "hr.payroll.foundation.boundary",
  payrollCalculationImplemented: false,
  payslipMathImplemented: false,
  processingFlow: [
    "collect_inputs",
    "create_snapshots",
    "calculate_from_snapshots",
    "review",
    "approve",
    "lock",
    "post_readiness",
    "pay_readiness",
    "close",
  ],
  snapshotFirstProcessing: true,
  workflowRuntimeImplemented: false,
};

export const HR_PAYROLL_SNAPSHOT_IMMUTABILITY_CONTRACT: HrPayrollSnapshotImmutabilityContract = {
  historicalPayrollMutableByDirectEdit: false,
  immutableAfterBatchStages: [
    "ready_to_calculate",
    "calculated",
    "review",
    "approved",
    "locked",
    "posting_ready",
    "posted",
    "payment_ready",
    "paid",
    "closed",
  ],
  key: "hr.payroll.snapshot-immutability",
  supersededOnlyByCorrectionBatch: true,
};

export const HR_PAYROLL_POSTING_READINESS: PayrollPostingReadiness = {
  bankPaymentRuntimeImplemented: false,
  costCenterDistributionReadiness: true,
  employeeCostReadiness: true,
  employerCostReadiness: true,
  financePostingRuntimeImplemented: false,
  journalReadiness: true,
  key: "hr.payroll.posting-readiness",
  postingReferenceField: "posting_reference",
  postingStatusField: "posting_status",
};

export const HR_PAYROLL_PRODUCTION_INCENTIVE_SNAPSHOT_READINESS: PayrollProductionIncentiveSnapshotReadiness = {
  key: "hr.payroll.production-incentive-snapshot-readiness",
  manufacturingDependencyImplemented: false,
  runtimeCalculationImplemented: false,
  snapshotKind: "production_incentive",
  supportedPayloadFields: [
    "production_period",
    "worker_output",
    "line_achievement",
    "supervisor_approval",
    "quality_threshold",
    "scrap_threshold",
    "incentive_policy_version_id",
    "compensation_component_version_id",
  ],
};

export const HR_OFF_CYCLE_PAYROLL_READINESS: HrOffCyclePayrollReadiness = {
  key: "hr.payroll.off-cycle-readiness",
  paymentExecutionImplemented: false,
  supportedBatchTypes: ["off_cycle", "correction", "final_settlement", "bonus", "adjustment"],
  supportedScenarios: [
    "bonus_run",
    "correction_run",
    "advance_run",
    "final_settlement",
    "emergency_payment",
    "one_time_payment",
  ],
};

const hrPayrollImportExportSecurity = {
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

export const HR_PAYROLL_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "date", key: "effectiveFrom", label: "Effective From" },
  ],
  key: "hr.payroll.import",
  label: "HR Payroll Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "effective-from", sourceColumn: "Effective From", targetField: "effectiveFrom" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, payrollCalculationImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "payroll-code-required", message: "Payroll code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "payroll-name-required", message: "Payroll name is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name", sensitive: true, pii: true },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.payroll.export",
  label: "HR Payroll Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_EVENT_DEFINITIONS = [
  "PayrollCalendarCreated",
  "PayrollPeriodOpened",
  "PayrollBatchCreated",
  "PayrollInputCollectionStarted",
  "PayrollSnapshotsCreated",
  "PayrollBatchCalculated",
  "PayrollBatchSubmittedForReview",
  "PayrollBatchApproved",
  "PayrollBatchLocked",
  "PayrollBatchPostingReady",
  "PayrollBatchPaid",
  "PayrollBatchClosed",
  "PayslipCreated",
  "PayslipApproved",
  "PayslipLocked",
  "PayrollExceptionCreated",
  "RetroAdjustmentCreated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payroll Engine Foundation. No calculation, finance posting, or payment runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYROLL_AUDIT_ACTIONS = {
  batchApproved: defineAuditAction("hr.payroll.batch.approved"),
  batchClosed: defineAuditAction("hr.payroll.batch.closed"),
  batchCreated: defineAuditAction("hr.payroll.batch.created"),
  batchLocked: defineAuditAction("hr.payroll.batch.locked"),
  batchPostingReady: defineAuditAction("hr.payroll.batch.posting-ready"),
  calendarCreated: defineAuditAction("hr.payroll.calendar.created"),
  exceptionCreated: defineAuditAction("hr.payroll.exception.created"),
  payslipApproved: defineAuditAction("hr.payroll.payslip.approved"),
  payslipCreated: defineAuditAction("hr.payroll.payslip.created"),
  payslipLocked: defineAuditAction("hr.payroll.payslip.locked"),
  periodOpened: defineAuditAction("hr.payroll.period.opened"),
  retroAdjustmentCreated: defineAuditAction("hr.payroll.retro-adjustment.created"),
  snapshotsCreated: defineAuditAction("hr.payroll.snapshots.created"),
} as const;

export const HR_PAYROLL_FOUNDATION_TABLES = [
  "hr_payroll_calendars",
  "hr_payroll_periods",
  "hr_payroll_groups",
  "hr_payroll_batches",
  "hr_payslips",
  "hr_payslip_lines",
  "hr_payroll_snapshots",
  "hr_payroll_exceptions",
  "hr_payroll_locks",
  "hr_retro_adjustments",
  "hr_payroll_posting_refs",
] as const;
