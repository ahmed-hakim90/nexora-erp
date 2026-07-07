import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollCalculationRuleScope =
  | "employee"
  | "payroll_group"
  | "company"
  | "branch"
  | "component"
  | "localization_pack";

export type HrPayrollCalculationFormulaType =
  | "fixed_amount"
  | "percentage"
  | "rate_quantity"
  | "tiered"
  | "conditional"
  | "cap_floor"
  | "proration";

export type HrPayrollCalculationRuleStatus = "draft" | "active" | "inactive" | "archived";

export type HrPayrollCalculationExecutionStatus =
  | "started"
  | "completed"
  | "failed"
  | "recalculated"
  | "cancelled";

export type HrPayrollCalculationStatus =
  | "pending"
  | "calculating"
  | "calculated"
  | "failed"
  | "recalculated"
  | "approved";

export type HrPayrollRoundingMethod =
  | "half_up"
  | "half_down"
  | "half_even"
  | "truncate"
  | "ceiling"
  | "floor";

export type HrPayrollCalculationScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollCalculationContextDefinition = HrPayrollCalculationScope & Readonly<{
  payrollRunId: string;
  payrollPeriodId: string;
  payrollGroupId: string;
  employeeId: string;
  employeeSnapshotId: string;
  currency: string;
  calculationDate: string;
  actorId?: string | null;
  correlationId: string;
  readsOperationalTablesDirectly: false;
  consumesSnapshotsAndApprovedInputsOnly: true;
}>;

export type HrPayrollCalculationRuleSetDefinition = HrPayrollCalculationScope & Readonly<{
  ruleSetCode: string;
  name: string;
  description?: string | null;
  scope: HrPayrollCalculationRuleScope;
  priority: number;
  status: HrPayrollCalculationRuleStatus;
  currency: string;
  countryNeutral: true;
  localizationPackImplemented: false;
  statutoryRulesImplemented: false;
}>;

export type HrPayrollCalculationRuleDefinition = HrPayrollCalculationScope & Readonly<{
  ruleSetId: string;
  ruleCode: string;
  ruleName: string;
  ruleScope: HrPayrollCalculationRuleScope;
  priority: number;
  componentCode?: string | null;
  formulaKey: string;
  formulaType: HrPayrollCalculationFormulaType;
  condition: Readonly<Record<string, unknown>>;
  dependsOnComponentCodes: readonly string[];
  status: HrPayrollCalculationRuleStatus;
  hiddenCalculation: false;
  localizationRuleImplemented: false;
}>;

export type HrPayrollCalculationExecutionDefinition = HrPayrollCalculationScope & Readonly<{
  payrollRunId: string;
  employeeId: string;
  employeeSnapshotId: string;
  payrollResultId?: string | null;
  ruleSetId?: string | null;
  correlationId: string;
  actorId?: string | null;
  calculationDate: string;
  currency: string;
  status: HrPayrollCalculationExecutionStatus;
  calculationStatus: HrPayrollCalculationStatus;
  executionDurationMs?: number | null;
  grossEarnings?: number | null;
  totalDeductions?: number | null;
  totalEmployerContributions?: number | null;
  netPay?: number | null;
  traceSummary: Readonly<Record<string, unknown>>;
  statutoryCalculationImplemented: false;
}>;

export type HrPayrollCalculationTraceDefinition = HrPayrollCalculationScope & Readonly<{
  calculationExecutionId: string;
  payrollResultId?: string | null;
  payrollResultComponentId?: string | null;
  ruleId?: string | null;
  ruleVersion: number;
  sourceType: string;
  sourceId?: string | null;
  formulaKey: string;
  inputValues: Readonly<Record<string, unknown>>;
  outputAmount: number;
  roundingMethod: HrPayrollRoundingMethod;
  calculationTimestamp: string;
  traceable: true;
  hiddenCalculation: false;
}>;

export type HrPayrollCalculationEngineBoundaryContract = Readonly<{
  key: string;
  calculationEngineConsumesSnapshotsAndApprovedInputsOnly: true;
  readsOperationalTablesDirectly: false;
  everyCalculatedAmountHasTraceMetadata: true;
  statutoryRulesBelongToLocalizationPacks: true;
  calculationRulesArePluggable: true;
  calculationIsRepeatableAndExplainable: true;
  hiddenCalculationsAllowed: false;
  countryLocalizationImplemented: false;
  statutoryCalculationImplemented: false;
  payrollCalculationRuntimeImplemented: false;
  processingFlow: readonly [
    "load_employee_snapshot",
    "load_approved_payroll_inputs",
    "resolve_salary_components",
    "apply_earnings_rules",
    "apply_deduction_rules",
    "apply_employer_contribution_rules",
    "apply_informational_components",
    "calculate_gross",
    "calculate_deductions",
    "calculate_net",
    "produce_result_components",
    "produce_trace",
  ];
}>;

export type HrPayrollCalculationInputsIntegrationContract = Readonly<{
  key: string;
  consumesEmployeeSnapshots: true;
  consumesApprovedPayrollInputs: true;
  consumesCompensationComponents: true;
  consumesAttendanceSummaries: true;
  consumesLeaveSummaries: true;
  consumesOvertimeInputs: true;
  consumesPenaltyInputs: true;
  consumesLoanAdvanceInputs: true;
  consumesManualAdjustments: true;
  readsOperationalTablesDirectly: false;
  runtimeImplemented: false;
}>;

export type HrPayrollCalculationRoundingPrecisionContract = Readonly<{
  key: string;
  supportedRoundingMethods: readonly HrPayrollRoundingMethod[];
  currencyPrecisionDefault: 4;
  componentPrecisionDefault: 4;
  countrySpecificRoundingImplemented: false;
  supportsMinMaxCaps: true;
}>;

export type HrPayrollCalculationFormulaFoundationContract = Readonly<{
  key: string;
  supportedFormulaTypes: readonly HrPayrollCalculationFormulaType[];
  formulaBuilderUiImplemented: false;
  localizationFormulaPacksImplemented: false;
}>;

export type HrPayrollCalculationProrationReadinessContract = Readonly<{
  key: string;
  supportedScenarios: readonly [
    "partial_period",
    "join_mid_period",
    "termination_mid_period",
    "unpaid_leave",
    "salary_change_mid_period",
  ];
  prorationEngineImplemented: false;
}>;

export type HrPayrollCalculationFinanceCostReadinessContract = Readonly<{
  key: string;
  financePostingReadiness: true;
  costEngineLaborFactsReadiness: true;
  reportingReadiness: true;
  dashboardReadiness: true;
  payslipReadiness: true;
  accountingPostingImplemented: false;
  costPostingImplemented: false;
}>;

export type HrPayrollCalculationRecalculationReadinessContract = Readonly<{
  key: string;
  supportedScopes: readonly ["employee", "payroll_group", "payroll_run"];
  comparePreviousVsRecalculatedResult: true;
  markChangedComponents: true;
  recalculationRuntimeImplemented: false;
}>;

export function defineHrPayrollCalculationContext<T extends HrPayrollCalculationContextDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCalculationRuleSet<T extends HrPayrollCalculationRuleSetDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCalculationRule<T extends HrPayrollCalculationRuleDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCalculationExecution<T extends HrPayrollCalculationExecutionDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCalculationTrace<T extends HrPayrollCalculationTraceDefinition>(definition: T): T {
  return definition;
}

export function createHrPayrollCalculationContextInput(input: Readonly<{
  actorId?: string | null;
  branchId?: string | null;
  calculationDate: string;
  companyId: string;
  correlationId: string;
  currency: string;
  employeeId: string;
  employeeSnapshotId: string;
  payrollGroupId: string;
  payrollPeriodId: string;
  payrollRunId: string;
  tenantId: string;
}>): HrPayrollCalculationContextDefinition {
  return {
    ...input,
    consumesSnapshotsAndApprovedInputsOnly: true,
    readsOperationalTablesDirectly: false,
  };
}

export function detectHrPayrollCalculationCircularDependencies(
  rules: readonly Readonly<{ componentCode?: string | null; dependsOnComponentCodes: readonly string[] }>[]
): Readonly<{ circular: boolean; cyclePath: readonly string[] }> {
  const graph = new Map<string, string[]>();

  for (const rule of rules) {
    if (!rule.componentCode) {
      continue;
    }

    graph.set(rule.componentCode, [...rule.dependsOnComponentCodes]);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cyclePath: string[] = [];

  const visit = (node: string, path: string[]): boolean => {
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node);
      cyclePath = cycleStart >= 0 ? path.slice(cycleStart).concat(node) : [node];
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);

    for (const dependency of graph.get(node) ?? []) {
      if (visit(dependency, path.concat(node))) {
        return true;
      }
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (visit(node, [])) {
      return { circular: true, cyclePath };
    }
  }

  return { circular: false, cyclePath: [] };
}

export function resolveHrPayrollCalculationPipelineStage(stage: string): Readonly<{
  pipelineStage: string;
  runtimeImplemented: false;
}> {
  return {
    pipelineStage: stage,
    runtimeImplemented: false,
  };
}

export function payrollRunAllowsCalculation(status: string): boolean {
  return status === "ready" || status === "validating" || status === "processing" || status === "completed";
}

export function payrollRunAllowsApproval(status: string): boolean {
  return status === "completed";
}

export function payrollRunAllowsPublish(status: string): boolean {
  return status === "approved";
}

export const HR_PAYROLL_CALCULATION_RULE_SCOPES = [
  "employee",
  "payroll_group",
  "company",
  "branch",
  "component",
  "localization_pack",
] as const satisfies readonly HrPayrollCalculationRuleScope[];

export const HR_PAYROLL_CALCULATION_FORMULA_TYPES = [
  "fixed_amount",
  "percentage",
  "rate_quantity",
  "tiered",
  "conditional",
  "cap_floor",
  "proration",
] as const satisfies readonly HrPayrollCalculationFormulaType[];

export const HR_PAYROLL_CALCULATION_PIPELINE_STAGES = [
  "load_employee_snapshot",
  "load_approved_payroll_inputs",
  "resolve_salary_components",
  "apply_earnings_rules",
  "apply_deduction_rules",
  "apply_employer_contribution_rules",
  "apply_informational_components",
  "calculate_gross",
  "calculate_deductions",
  "calculate_net",
  "produce_result_components",
  "produce_trace",
] as const;

export const HR_PAYROLL_ROUNDING_METHODS = [
  "half_up",
  "half_down",
  "half_even",
  "truncate",
  "ceiling",
  "floor",
] as const satisfies readonly HrPayrollRoundingMethod[];

export const HR_PAYROLL_CALCULATION_ENGINE_BOUNDARY_CONTRACT: HrPayrollCalculationEngineBoundaryContract = {
  calculationEngineConsumesSnapshotsAndApprovedInputsOnly: true,
  calculationIsRepeatableAndExplainable: true,
  calculationRulesArePluggable: true,
  countryLocalizationImplemented: false,
  everyCalculatedAmountHasTraceMetadata: true,
  hiddenCalculationsAllowed: false,
  key: "hr.payroll.calculation.boundary",
  payrollCalculationRuntimeImplemented: false,
  processingFlow: HR_PAYROLL_CALCULATION_PIPELINE_STAGES,
  readsOperationalTablesDirectly: false,
  statutoryCalculationImplemented: false,
  statutoryRulesBelongToLocalizationPacks: true,
};

export const HR_PAYROLL_CALCULATION_INPUTS_INTEGRATION_CONTRACT: HrPayrollCalculationInputsIntegrationContract = {
  consumesApprovedPayrollInputs: true,
  consumesAttendanceSummaries: true,
  consumesCompensationComponents: true,
  consumesEmployeeSnapshots: true,
  consumesLeaveSummaries: true,
  consumesLoanAdvanceInputs: true,
  consumesManualAdjustments: true,
  consumesOvertimeInputs: true,
  consumesPenaltyInputs: true,
  key: "hr.payroll.calculation.inputs-integration",
  readsOperationalTablesDirectly: false,
  runtimeImplemented: false,
};

export const HR_PAYROLL_CALCULATION_ROUNDING_PRECISION_CONTRACT: HrPayrollCalculationRoundingPrecisionContract = {
  componentPrecisionDefault: 4,
  countrySpecificRoundingImplemented: false,
  currencyPrecisionDefault: 4,
  key: "hr.payroll.calculation.rounding-precision",
  supportedRoundingMethods: HR_PAYROLL_ROUNDING_METHODS,
  supportsMinMaxCaps: true,
};

export const HR_PAYROLL_CALCULATION_FORMULA_FOUNDATION_CONTRACT: HrPayrollCalculationFormulaFoundationContract = {
  formulaBuilderUiImplemented: false,
  key: "hr.payroll.calculation.formula-foundation",
  localizationFormulaPacksImplemented: false,
  supportedFormulaTypes: HR_PAYROLL_CALCULATION_FORMULA_TYPES,
};

export const HR_PAYROLL_CALCULATION_PRORATION_READINESS_CONTRACT: HrPayrollCalculationProrationReadinessContract = {
  key: "hr.payroll.calculation.proration-readiness",
  prorationEngineImplemented: false,
  supportedScenarios: [
    "partial_period",
    "join_mid_period",
    "termination_mid_period",
    "unpaid_leave",
    "salary_change_mid_period",
  ],
};

export const HR_PAYROLL_CALCULATION_FINANCE_COST_READINESS_CONTRACT: HrPayrollCalculationFinanceCostReadinessContract = {
  accountingPostingImplemented: false,
  costEngineLaborFactsReadiness: true,
  costPostingImplemented: false,
  dashboardReadiness: true,
  financePostingReadiness: true,
  key: "hr.payroll.calculation.finance-cost-readiness",
  payslipReadiness: true,
  reportingReadiness: true,
};

export const HR_PAYROLL_CALCULATION_RECALCULATION_READINESS_CONTRACT: HrPayrollCalculationRecalculationReadinessContract = {
  comparePreviousVsRecalculatedResult: true,
  key: "hr.payroll.calculation.recalculation-readiness",
  markChangedComponents: true,
  recalculationRuntimeImplemented: false,
  supportedScopes: ["employee", "payroll_group", "payroll_run"],
};

export const HR_PAYROLL_CALCULATION_VALIDATION_RULES = [
  { key: "payroll_run_allows_calculation", message: "Payroll run status must allow calculation.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "employee_snapshot_required", message: "Employee snapshot must exist before calculation.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "approved_inputs_only", message: "Only approved payroll inputs may be consumed.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "required_components_exist", message: "Required salary components must exist.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "required_currency_exists", message: "Calculation currency must be defined.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_unresolved_exceptions", message: "Unresolved payroll exceptions block calculation.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "locked_component_not_modified", message: "Locked components cannot be modified during calculation.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_circular_dependencies", message: "Circular component dependencies must be detected and blocked.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "trace_metadata_required", message: "Every calculated amount must include trace metadata.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "no_statutory_calculation", message: "Statutory calculation belongs to localization packs.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_PAYROLL_CALCULATION_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payroll.calculation.platform-integration",
  observabilityReadinessRegistered: true,
  reportReadinessRegistered: true,
  searchRegistered: true,
  runtimeReportGenerationImplemented: false,
} as const;

const hrPayrollCalculationImportExportSecurity = {
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

export const HR_PAYROLL_CALCULATION_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "ruleSetCode", label: "Rule Set Code", required: true },
    { dataType: "text", key: "ruleCode", label: "Rule Code", required: true },
    { dataType: "text", key: "formulaKey", label: "Formula Key", required: true },
  ],
  key: "hr.payroll.calculation.import",
  label: "HR Payroll Calculation Import",
  mappings: [
    { key: "rule-set-code", sourceColumn: "Rule Set Code", targetField: "ruleSetCode" },
    { key: "rule-code", sourceColumn: "Rule Code", targetField: "ruleCode" },
    { key: "formula-key", sourceColumn: "Formula Key", targetField: "formulaKey" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { calculationFoundationOnly: true, payrollCalculationRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollCalculationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "ruleSetCode", key: "calculation-rule-set-required", message: "Rule set code is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_CALCULATION_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "ruleSetCode", label: "Rule Set Code", order: 1, sourceField: "ruleSetCode" },
    { dataType: "text", key: "ruleCode", label: "Rule Code", order: 2, sourceField: "ruleCode" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
  ],
  key: "hr.payroll.calculation.export",
  label: "HR Payroll Calculation Export",
  mappings: [
    { key: "rule-set-code", sourceField: "ruleSetCode", targetColumn: "Rule Set Code" },
    { key: "rule-code", sourceField: "ruleCode", targetColumn: "Rule Code" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-calculation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollCalculationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_CALCULATION_EVENT_DEFINITIONS = [
  "PayrollCalculationStarted",
  "PayrollEmployeeCalculated",
  "PayrollEmployeeCalculationFailed",
  "PayrollCalculationCompleted",
  "PayrollCalculationRecalculated",
  "PayrollCalculationTraceGenerated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Payroll Calculation Engine Foundation. No statutory localization or accounting posting runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_PAYROLL_CALCULATION_AUDIT_ACTIONS = {
  payrollCalculationCompleted: defineAuditAction("hr.payroll.calculation.completed"),
  payrollCalculationRecalculated: defineAuditAction("hr.payroll.calculation.recalculated"),
  payrollCalculationStarted: defineAuditAction("hr.payroll.calculation.started"),
  payrollCalculationTraceGenerated: defineAuditAction("hr.payroll.calculation.trace.generated"),
  payrollEmployeeCalculated: defineAuditAction("hr.payroll.calculation.employee.calculated"),
  payrollEmployeeCalculationFailed: defineAuditAction("hr.payroll.calculation.employee.failed"),
} as const;

export const HR_PAYROLL_CALCULATION_FOUNDATION_TABLES = [
  "hr_payroll_calculation_rule_sets",
  "hr_payroll_calculation_rules",
  "hr_payroll_calculation_executions",
  "hr_payroll_calculation_traces",
] as const;

export const HR_PAYROLL_CALCULATION_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payrollCalculate, scope: "tenant-company-branch", entity: "payroll-calculation" },
  { key: HR_PERMISSIONS.payrollRecalculate, scope: "tenant-company-branch", entity: "payroll-recalculation" },
  { key: HR_PERMISSIONS.payrollTraceView, scope: "tenant-company-branch", entity: "payroll-calculation-trace" },
  { key: HR_PERMISSIONS.payrollView, scope: "tenant-company-branch", entity: "payroll-calculation-rule-set" },
] as const;

export const HR_PAYROLL_CALCULATION_OBSERVABILITY_CONTRACT = {
  actorField: "actor_id",
  branchField: "branch_id",
  companyField: "company_id",
  correlationIdField: "correlation_id",
  employeeField: "employee_id",
  executionDurationField: "execution_duration_ms",
  key: "hr.payroll.calculation.observability",
  payrollRunField: "payroll_run_id",
  ruleSetField: "rule_set_id",
  tenantField: "tenant_id",
  traceSummaryField: "trace_summary",
} as const;
