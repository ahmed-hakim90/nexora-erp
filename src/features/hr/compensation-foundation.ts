import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrCompensationCategoryKey =
  | "basic_salary"
  | "allowance"
  | "benefit"
  | "bonus"
  | "incentive"
  | "commission"
  | "overtime"
  | "deduction"
  | "loan"
  | "advance"
  | "insurance"
  | "tax"
  | "penalty"
  | "employer_contribution"
  | "employee_contribution"
  | "reimbursement"
  | "adjustment";

export type HrCompensationEarningOrDeduction = "earning" | "deduction";
export type HrCompensationFixedOrFormula = "fixed" | "formula";
export type HrCompensationRoundingRule = "none" | "nearest" | "up" | "down" | "bankers";
export type HrCompensationRecordStatus = "draft" | "active" | "inactive" | "archived";
export type HrCompensationOverrideType = "amount" | "rate" | "formula";
export type HrSalaryPackageLineRequirement = "required" | "optional";

export type HrCompensationScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrCompensationFormulaMetadata = Readonly<{
  expressionKey?: string | null;
  expressionLabel?: string | null;
  inputBindings?: Readonly<Record<string, string>>;
  outputUnit?: "amount" | "rate" | "quantity" | null;
  roundingRule?: HrCompensationRoundingRule | null;
  runtimeEvaluationImplemented: false;
  notes?: string | null;
}>;

export type HrCompensationEligibility = Readonly<{
  policyVersionRef?: string | null;
  policyType?: string | null;
  eligibilityNotes?: string | null;
  runtimeEvaluationImplemented: false;
}>;

export type HrCompensationCategoryDefinition = Readonly<{
  categoryKey: HrCompensationCategoryKey;
  label: string;
  earningOrDeduction: HrCompensationEarningOrDeduction;
  description?: string | null;
}>;

export type HrCompensationComponentDefinition = HrCompensationScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  category: HrCompensationCategoryKey;
  status: HrCompensationRecordStatus;
}>;

export type HrCompensationComponentVersionDefinition = HrCompensationScope & Readonly<{
  componentId: string;
  version: number;
  earningOrDeduction: HrCompensationEarningOrDeduction;
  fixedOrFormula: HrCompensationFixedOrFormula;
  defaultAmount?: number | null;
  defaultRate?: number | null;
  currency: string;
  taxable: boolean;
  insurable: boolean;
  includedInEndOfService: boolean;
  includedInGrossSalary: boolean;
  appearsOnPayslip: boolean;
  employerCost: boolean;
  employeeCost: boolean;
  displayOrder: number;
  roundingRule: HrCompensationRoundingRule;
  formulaMetadata?: HrCompensationFormulaMetadata | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type HrCompensationStructureDefinition = HrCompensationScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  employmentType?: string | null;
  gradeId?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type HrCompensationStructureLineDefinition = HrCompensationScope & Readonly<{
  structureId: string;
  componentVersionId: string;
  isDefault: boolean;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type HrSalaryPackageDefinition = HrCompensationScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  gradeId?: string | null;
  employmentType?: string | null;
  structureId: string;
  status: HrCompensationRecordStatus;
}>;

export type HrSalaryPackageVersionDefinition = HrCompensationScope & Readonly<{
  salaryPackageId: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type HrSalaryPackageLineDefinition = HrCompensationScope & Readonly<{
  salaryPackageVersionId: string;
  componentVersionId: string;
  amountOverride?: number | null;
  rateOverride?: number | null;
  formulaMetadataOverride?: HrCompensationFormulaMetadata | null;
  eligibility: HrCompensationEligibility;
  displayOrder: number;
  requirement: HrSalaryPackageLineRequirement;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type HrEmployeeCompensationOverrideDefinition = HrCompensationScope & Readonly<{
  employmentProfileId: string;
  componentVersionId: string;
  packageLineId?: string | null;
  overrideType: HrCompensationOverrideType;
  amount?: number | null;
  rate?: number | null;
  formulaMetadata?: HrCompensationFormulaMetadata | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string | null;
  approvalDocumentRef?: string | null;
  status: HrCompensationRecordStatus;
}>;

export type ProductionIncentiveCompensationReadiness = Readonly<{
  key: string;
  componentCategory: "incentive";
  supportedFutureReferences: readonly [
    "production_target_achievement",
    "production_line",
    "worker_output",
    "supervisor_approval",
    "production_period",
    "product_group",
    "quality_threshold",
    "scrap_threshold",
  ];
  manufacturingDependencyImplemented: false;
  runtimeCalculationImplemented: false;
}>;

export type CompensationSnapshotReadiness = Readonly<{
  key: string;
  owner: "compensation";
  snapshotFields: readonly [
    "compensationComponentVersionId",
    "salaryPackageVersionId",
    "salaryPackageLineId",
    "employeeOverrideId",
    "policyVersionRefs",
    "formulaMetadata",
    "effectiveDateUsed",
  ];
  payrollRuntimeImplemented: false;
  immutableHistoricalVersions: true;
}>;

export type HrCompensationTemplateReadiness = Readonly<{
  key: string;
  templateKey: string;
  label: string;
  futureCreates: readonly [
    "employment_profile",
    "salary_package_ref",
    "policy_refs",
    "shift_schedule_ref",
    "approval_policy_ref",
    "cost_center_ref",
  ];
  runtimeImplemented: false;
}>;

export type HrCompensationEngineBoundaryContract = Readonly<{
  key: string;
  policyLogicDuplicatedInCompensation: false;
  compensationDefinesWhatAndHowValued: true;
  payrollCalculatesLater: true;
  overridesMutatePackageDefinitions: false;
  overridesMutateComponentDefinitions: false;
  runtimePayrollCalculationImplemented: false;
  runtimeProductionIncentiveCalculationImplemented: false;
  runtimeCompensationCalculationImplemented: false;
}>;

export type HrCompensationEffectiveDatingContract = Readonly<{
  key: string;
  owner: "compensation";
  effectiveDatedEntities: readonly [
    "hr_compensation_component_versions",
    "hr_compensation_structure_lines",
    "hr_salary_package_versions",
    "hr_salary_package_lines",
    "hr_employee_compensation_overrides",
  ];
  historicalVersionsMutableByDirectEdit: false;
  historicalVersionsRequireSupersedingVersion: true;
}>;

export function defineHrCompensationComponent<T extends HrCompensationComponentDefinition>(definition: T): T {
  return definition;
}

export function defineHrCompensationComponentVersion<T extends HrCompensationComponentVersionDefinition>(definition: T): T {
  return definition;
}

export function defineHrCompensationStructure<T extends HrCompensationStructureDefinition>(definition: T): T {
  return definition;
}

export function defineHrCompensationStructureLine<T extends HrCompensationStructureLineDefinition>(definition: T): T {
  return definition;
}

export function defineHrSalaryPackage<T extends HrSalaryPackageDefinition>(definition: T): T {
  return definition;
}

export function defineHrSalaryPackageVersion<T extends HrSalaryPackageVersionDefinition>(definition: T): T {
  return definition;
}

export function defineHrSalaryPackageLine<T extends HrSalaryPackageLineDefinition>(definition: T): T {
  return definition;
}

export function defineHrEmployeeCompensationOverride<T extends HrEmployeeCompensationOverrideDefinition>(definition: T): T {
  return definition;
}

export function compensationComponentVersionAppliesOn(
  version: Pick<HrCompensationComponentVersionDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (version.status !== "active") {
    return false;
  }

  return version.effectiveFrom <= effectiveDate && (version.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export function salaryPackageVersionAppliesOn(
  version: Pick<HrSalaryPackageVersionDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (version.status !== "active") {
    return false;
  }

  return version.effectiveFrom <= effectiveDate && (version.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export function employeeCompensationOverrideAppliesOn(
  override: Pick<HrEmployeeCompensationOverrideDefinition, "effectiveFrom" | "effectiveTo" | "status">,
  effectiveDate: string,
): boolean {
  if (override.status !== "active") {
    return false;
  }

  return override.effectiveFrom <= effectiveDate && (override.effectiveTo ?? "9999-12-31") >= effectiveDate;
}

export function createCompensationSnapshotReadinessInput(input: {
  compensationComponentVersionId: string;
  salaryPackageVersionId: string;
  salaryPackageLineId?: string | null;
  employeeOverrideId?: string | null;
  policyVersionRefs?: readonly string[];
  formulaMetadata?: HrCompensationFormulaMetadata | null;
  effectiveDateUsed: string;
}): Readonly<{
  compensationComponentVersionId: string;
  salaryPackageVersionId: string;
  salaryPackageLineId: string | null;
  employeeOverrideId: string | null;
  policyVersionRefs: readonly string[];
  formulaMetadata: HrCompensationFormulaMetadata | null;
  effectiveDateUsed: string;
}> {
  return {
    compensationComponentVersionId: input.compensationComponentVersionId,
    effectiveDateUsed: input.effectiveDateUsed,
    employeeOverrideId: input.employeeOverrideId ?? null,
    formulaMetadata: input.formulaMetadata ?? null,
    policyVersionRefs: input.policyVersionRefs ?? [],
    salaryPackageLineId: input.salaryPackageLineId ?? null,
    salaryPackageVersionId: input.salaryPackageVersionId,
  };
}

export const HR_COMPENSATION_CATEGORIES = [
  "basic_salary",
  "allowance",
  "benefit",
  "bonus",
  "incentive",
  "commission",
  "overtime",
  "deduction",
  "loan",
  "advance",
  "insurance",
  "tax",
  "penalty",
  "employer_contribution",
  "employee_contribution",
  "reimbursement",
  "adjustment",
] as const satisfies readonly HrCompensationCategoryKey[];

export const HR_COMPENSATION_CATEGORY_DEFINITIONS: readonly HrCompensationCategoryDefinition[] = [
  { categoryKey: "basic_salary", earningOrDeduction: "earning", label: "Basic Salary" },
  { categoryKey: "allowance", earningOrDeduction: "earning", label: "Allowance" },
  { categoryKey: "benefit", earningOrDeduction: "earning", label: "Benefit" },
  { categoryKey: "bonus", earningOrDeduction: "earning", label: "Bonus" },
  { categoryKey: "incentive", earningOrDeduction: "earning", label: "Incentive" },
  { categoryKey: "commission", earningOrDeduction: "earning", label: "Commission" },
  { categoryKey: "overtime", earningOrDeduction: "earning", label: "Overtime" },
  { categoryKey: "deduction", earningOrDeduction: "deduction", label: "Deduction" },
  { categoryKey: "loan", earningOrDeduction: "deduction", label: "Loan" },
  { categoryKey: "advance", earningOrDeduction: "deduction", label: "Advance" },
  { categoryKey: "insurance", earningOrDeduction: "deduction", label: "Insurance" },
  { categoryKey: "tax", earningOrDeduction: "deduction", label: "Tax" },
  { categoryKey: "penalty", earningOrDeduction: "deduction", label: "Penalty" },
  { categoryKey: "employer_contribution", earningOrDeduction: "earning", label: "Employer Contribution" },
  { categoryKey: "employee_contribution", earningOrDeduction: "deduction", label: "Employee Contribution" },
  { categoryKey: "reimbursement", earningOrDeduction: "earning", label: "Reimbursement" },
  { categoryKey: "adjustment", earningOrDeduction: "earning", label: "Adjustment" },
];

export const HR_COMPENSATION_COMPONENT_EXAMPLES = [
  { code: "BASIC_SALARY", name: "Basic Salary", category: "basic_salary" },
  { code: "TRANSPORT_ALLOWANCE", name: "Transportation Allowance", category: "allowance" },
  { code: "MEAL_ALLOWANCE", name: "Meal Allowance", category: "allowance" },
  { code: "HOUSING_ALLOWANCE", name: "Housing Allowance", category: "allowance" },
  { code: "MOBILE_ALLOWANCE", name: "Mobile Allowance", category: "allowance" },
  { code: "NIGHT_SHIFT_ALLOWANCE", name: "Night Shift Allowance", category: "allowance" },
  { code: "PRODUCTION_INCENTIVE", name: "Production Incentive", category: "incentive" },
  { code: "ATTENDANCE_BONUS", name: "Attendance Bonus", category: "bonus" },
  { code: "SALES_COMMISSION", name: "Sales Commission", category: "commission" },
  { code: "OVERTIME_PAY", name: "Overtime Pay", category: "overtime" },
  { code: "SOCIAL_INS_EMPLOYEE", name: "Social Insurance Employee Share", category: "employee_contribution" },
  { code: "SOCIAL_INS_EMPLOYER", name: "Social Insurance Employer Share", category: "employer_contribution" },
  { code: "TAX", name: "Tax", category: "tax" },
  { code: "LOAN_DEDUCTION", name: "Loan Deduction", category: "loan" },
  { code: "ADVANCE_DEDUCTION", name: "Advance Deduction", category: "advance" },
  { code: "PENALTY_DEDUCTION", name: "Penalty Deduction", category: "penalty" },
] as const;

export const HR_COMPENSATION_STRUCTURE_EXAMPLES = [
  { code: "FACTORY_WORKER", name: "Factory Worker Structure" },
  { code: "SUPERVISOR", name: "Supervisor Structure" },
  { code: "OFFICE_EMPLOYEE", name: "Office Employee Structure" },
  { code: "SALES_EMPLOYEE", name: "Sales Employee Structure" },
  { code: "EXECUTIVE", name: "Executive Structure" },
] as const;

export const HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT: HrCompensationEngineBoundaryContract = {
  compensationDefinesWhatAndHowValued: true,
  key: "hr.compensation.foundation.boundary",
  overridesMutateComponentDefinitions: false,
  overridesMutatePackageDefinitions: false,
  payrollCalculatesLater: true,
  policyLogicDuplicatedInCompensation: false,
  runtimeCompensationCalculationImplemented: false,
  runtimePayrollCalculationImplemented: false,
  runtimeProductionIncentiveCalculationImplemented: false,
};

export const HR_COMPENSATION_EFFECTIVE_DATING_CONTRACT: HrCompensationEffectiveDatingContract = {
  effectiveDatedEntities: [
    "hr_compensation_component_versions",
    "hr_compensation_structure_lines",
    "hr_salary_package_versions",
    "hr_salary_package_lines",
    "hr_employee_compensation_overrides",
  ],
  historicalVersionsMutableByDirectEdit: false,
  historicalVersionsRequireSupersedingVersion: true,
  key: "hr.compensation.effective-dating",
  owner: "compensation",
};

export const HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS: ProductionIncentiveCompensationReadiness = {
  componentCategory: "incentive",
  key: "hr.compensation.production-incentive-readiness",
  manufacturingDependencyImplemented: false,
  runtimeCalculationImplemented: false,
  supportedFutureReferences: [
    "production_target_achievement",
    "production_line",
    "worker_output",
    "supervisor_approval",
    "production_period",
    "product_group",
    "quality_threshold",
    "scrap_threshold",
  ],
};

export const HR_COMPENSATION_SNAPSHOT_READINESS: CompensationSnapshotReadiness = {
  immutableHistoricalVersions: true,
  key: "hr.compensation.payroll-snapshot-readiness",
  owner: "compensation",
  payrollRuntimeImplemented: false,
  snapshotFields: [
    "compensationComponentVersionId",
    "salaryPackageVersionId",
    "salaryPackageLineId",
    "employeeOverrideId",
    "policyVersionRefs",
    "formulaMetadata",
    "effectiveDateUsed",
  ],
};

export const HR_COMPENSATION_TEMPLATE_READINESS = [
  { key: "factory-worker", label: "Factory Worker Template", templateKey: "factory_worker" },
  { key: "warehouse-employee", label: "Warehouse Employee Template", templateKey: "warehouse_employee" },
  { key: "supervisor", label: "Supervisor Template", templateKey: "supervisor" },
  { key: "office-employee", label: "Office Employee Template", templateKey: "office_employee" },
].map((template) => ({
  futureCreates: [
    "employment_profile",
    "salary_package_ref",
    "policy_refs",
    "shift_schedule_ref",
    "approval_policy_ref",
    "cost_center_ref",
  ] as const,
  key: `hr.compensation.template.${template.key}`,
  label: template.label,
  runtimeImplemented: false as const,
  templateKey: template.templateKey,
})) satisfies readonly HrCompensationTemplateReadiness[];

const hrCompensationImportExportSecurity = {
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

export const HR_COMPENSATION_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "category", label: "Category" },
    { dataType: "number", key: "version", label: "Version" },
    { dataType: "date", key: "effectiveFrom", label: "Effective From" },
    { dataType: "date", key: "effectiveTo", label: "Effective To" },
  ],
  key: "hr.compensation.import",
  label: "HR Compensation Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "category", sourceColumn: "Category", targetField: "category" },
    { key: "version", sourceColumn: "Version", targetField: "version" },
    { key: "effective-from", sourceColumn: "Effective From", targetField: "effectiveFrom" },
    { key: "effective-to", sourceColumn: "Effective To", targetField: "effectiveTo" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, runtimeCalculationImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrCompensationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "compensation-code-required", message: "Compensation code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "compensation-name-required", message: "Compensation name is required.", severity: "error", type: "required" },
  ],
});

export const HR_COMPENSATION_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name", sensitive: true, pii: true },
    { dataType: "text", key: "category", label: "Category", order: 4, sourceField: "category" },
    { dataType: "text", key: "status", label: "Status", order: 5, sourceField: "status" },
  ],
  key: "hr.compensation.export",
  label: "HR Compensation Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "category", sourceField: "category", targetColumn: "Category" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-compensation-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrCompensationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_COMPENSATION_EVENT_DEFINITIONS = [
  "CompensationComponentCreated",
  "CompensationComponentVersionCreated",
  "CompensationComponentActivated",
  "SalaryPackageCreated",
  "SalaryPackageVersionCreated",
  "SalaryPackageAssigned",
  "EmployeeCompensationOverrideCreated",
  "EmployeeCompensationOverrideExpired",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Compensation Engine Foundation. No runtime payroll handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_COMPENSATION_AUDIT_ACTIONS = {
  componentActivated: defineAuditAction("hr.compensation.component.activated"),
  componentCreated: defineAuditAction("hr.compensation.component.created"),
  componentVersionCreated: defineAuditAction("hr.compensation.component.version.created"),
  overrideCreated: defineAuditAction("hr.compensation.override.created"),
  overrideExpired: defineAuditAction("hr.compensation.override.expired"),
  packageAssigned: defineAuditAction("hr.compensation.package.assigned"),
  packageCreated: defineAuditAction("hr.compensation.package.created"),
  packageVersionCreated: defineAuditAction("hr.compensation.package.version.created"),
} as const;

export const HR_COMPENSATION_FOUNDATION_TABLES = [
  "hr_compensation_categories",
  "hr_compensation_components",
  "hr_compensation_component_versions",
  "hr_compensation_structures",
  "hr_compensation_structure_lines",
  "hr_salary_packages",
  "hr_salary_package_versions",
  "hr_salary_package_lines",
  "hr_employee_compensation_overrides",
] as const;
