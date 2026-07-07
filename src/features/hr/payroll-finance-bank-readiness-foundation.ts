import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollFinanceReadinessStatus = "draft" | "ready" | "posted" | "failed" | "cancelled";

export type HrPayrollFinanceDimensionKind =
  | "cost_center"
  | "department"
  | "project"
  | "manufacturing_order"
  | "service_job"
  | "fleet_asset";

export type HrPayrollBankPaymentMethodKind = "bank_transfer" | "cash" | "check" | "wallet" | "external_provider";

export type HrPayrollBankTransferFileFormat = "generic_csv" | "sepa" | "ach" | "wps" | "custom";

export type HrPayrollLaborCostConsumer = "cost_engine" | "manufacturing" | "projects" | "service" | "fleet";

export type HrPayrollFinanceBankScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollPostingReadinessV2Definition = HrPayrollFinanceBankScope & Readonly<{
  payrollRunId: string;
  payrollResultId?: string | null;
  postingLineType: string;
  amount: number;
  currency: string;
  financeDimensionKind?: HrPayrollFinanceDimensionKind | null;
  financeDimensionRef?: string | null;
  costCenterId?: string | null;
  postingReference?: string | null;
  status: HrPayrollFinanceReadinessStatus;
  extendsSprint14PostingReadinessTable: true;
  journalPostingImplemented: false;
  financePostingRuntimeImplemented: false;
}>;

export type HrPayrollFinanceDimensionDefinition = HrPayrollFinanceBankScope & Readonly<{
  dimensionKind: HrPayrollFinanceDimensionKind;
  dimensionRef: string;
  label: string;
  payrollRunId?: string | null;
  payrollResultId?: string | null;
  allocationPercent?: number | null;
  status: HrPayrollFinanceReadinessStatus;
  financePostingRuntimeImplemented: false;
}>;

export type HrPayrollCostCenterAllocationDefinition = HrPayrollFinanceBankScope & Readonly<{
  payrollRunId: string;
  payrollResultId: string;
  employeeId: string;
  costCenterId: string;
  allocationPercent: number;
  allocatedAmount: number;
  currency: string;
  status: HrPayrollFinanceReadinessStatus;
  costEnginePostingImplemented: false;
}>;

export type HrPayrollLaborCostFactDefinition = HrPayrollFinanceBankScope & Readonly<{
  payrollRunId: string;
  payrollResultId: string;
  employeeId: string;
  consumer: HrPayrollLaborCostConsumer;
  consumerRef?: string | null;
  grossLaborCost: number;
  employerContributionCost: number;
  netLaborCost: number;
  currency: string;
  auditLineageRef: string;
  costCalculationPostingImplemented: false;
}>;

export type HrPayrollBankPaymentReadinessDefinition = HrPayrollFinanceBankScope & Readonly<{
  payrollRunId: string;
  employeeId: string;
  paymentMethodKind: HrPayrollBankPaymentMethodKind;
  bankAccountRef?: string | null;
  netPayAmount: number;
  currency: string;
  status: HrPayrollFinanceReadinessStatus;
  bankPaymentRuntimeImplemented: false;
}>;

export type HrPayrollBankTransferFileContract = Readonly<{
  fileFormat: HrPayrollBankTransferFileFormat;
  payrollRunId: string;
  recordCount: number;
  totalAmount: number;
  currency: string;
  generationImplemented: false;
  wpsSpecificGenerationImplemented: false;
}>;

export type HrPayrollWpsReadinessContract = Readonly<{
  countryCode: string;
  payrollRunId: string;
  employerEstablishmentRef?: string | null;
  employeeRecordCount: number;
  totalNetPay: number;
  currency: string;
  wpsFileGenerationImplemented: false;
  bankIntegrationImplemented: false;
}>;

export type HrPayrollFinanceAuditLineageContract = Readonly<{
  payrollRunId: string;
  payrollResultId: string;
  postingReadinessLineId?: string | null;
  laborCostFactId?: string | null;
  correlationId: string;
  sourceEngine: "payroll-result" | "posting-readiness" | "cost-allocation";
  auditRequired: true;
  financePostingRuntimeImplemented: false;
}>;

export type HrPayrollFinanceBankReadinessBoundaryContract = Readonly<{
  key: string;
  extendsSprint14PostingReadiness: true;
  journalPostingImplemented: false;
  bankFileGenerationImplemented: false;
  wpsFileGenerationImplemented: false;
  costEnginePostingImplemented: false;
  financePostingRuntimeImplemented: false;
  laborCostFactsReadiness: true;
  costCenterAllocationReadiness: true;
  crossAppCostReferencesReady: true;
  processingFlow: readonly [
    "validate_posting_readiness",
    "produce_posting_lines_v2",
    "allocate_cost_centers",
    "emit_labor_cost_facts",
    "prepare_bank_payment_readiness",
    "register_bank_transfer_contract",
    "register_wps_contract",
    "audit_lineage",
  ];
}>;

export function defineHrPayrollPostingReadinessV2<T extends HrPayrollPostingReadinessV2Definition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCostCenterAllocation<T extends HrPayrollCostCenterAllocationDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollLaborCostFact<T extends HrPayrollLaborCostFactDefinition>(definition: T): T {
  return definition;
}

export function createHrPayrollBankTransferFileContract(input: Readonly<{
  currency: string;
  fileFormat: HrPayrollBankTransferFileFormat;
  payrollRunId: string;
  recordCount: number;
  totalAmount: number;
}>): HrPayrollBankTransferFileContract {
  return {
    ...input,
    generationImplemented: false,
    wpsSpecificGenerationImplemented: false,
  };
}

export function createHrPayrollWpsReadinessContract(input: Readonly<{
  countryCode: string;
  currency: string;
  employeeRecordCount: number;
  employerEstablishmentRef?: string | null;
  payrollRunId: string;
  totalNetPay: number;
}>): HrPayrollWpsReadinessContract {
  return {
    ...input,
    bankIntegrationImplemented: false,
    wpsFileGenerationImplemented: false,
  };
}

export function postingReadinessV2AllowsFinanceHandoff(
  line: Pick<HrPayrollPostingReadinessV2Definition, "status" | "financePostingRuntimeImplemented">,
): boolean {
  return line.status === "ready" && line.financePostingRuntimeImplemented === false;
}

export const HR_PAYROLL_FINANCE_READINESS_STATUSES = [
  "draft",
  "ready",
  "posted",
  "failed",
  "cancelled",
] as const satisfies readonly HrPayrollFinanceReadinessStatus[];

export const HR_PAYROLL_FINANCE_DIMENSION_KINDS = [
  "cost_center",
  "department",
  "project",
  "manufacturing_order",
  "service_job",
  "fleet_asset",
] as const satisfies readonly HrPayrollFinanceDimensionKind[];

export const HR_PAYROLL_BANK_PAYMENT_METHOD_KINDS = [
  "bank_transfer",
  "cash",
  "check",
  "wallet",
  "external_provider",
] as const satisfies readonly HrPayrollBankPaymentMethodKind[];

export const HR_PAYROLL_BANK_TRANSFER_FILE_FORMATS = [
  "generic_csv",
  "sepa",
  "ach",
  "wps",
  "custom",
] as const satisfies readonly HrPayrollBankTransferFileFormat[];

export const HR_PAYROLL_LABOR_COST_CONSUMERS = [
  "cost_engine",
  "manufacturing",
  "projects",
  "service",
  "fleet",
] as const satisfies readonly HrPayrollLaborCostConsumer[];

export const HR_PAYROLL_POSTING_READINESS_V2_CONTRACT = {
  bankPaymentRuntimeImplemented: false,
  costCenterDistributionReadiness: true,
  crossAppCostReferencesReady: true,
  employeeCostReadiness: true,
  employerCostReadiness: true,
  extendsSprint14Table: "hr_payroll_posting_readiness",
  financeDimensionReadiness: true,
  financePostingRuntimeImplemented: false,
  journalReadiness: true,
  key: "hr.payroll.posting-readiness.v2",
  laborCostFactsReadiness: true,
  postingReferenceField: "posting_reference",
  postingStatusField: "status",
  wpsReadinessContractOnly: true,
} as const;

export const HR_PAYROLL_FINANCE_BANK_READINESS_BOUNDARY_CONTRACT: HrPayrollFinanceBankReadinessBoundaryContract = {
  bankFileGenerationImplemented: false,
  costCenterAllocationReadiness: true,
  costEnginePostingImplemented: false,
  crossAppCostReferencesReady: true,
  extendsSprint14PostingReadiness: true,
  financePostingRuntimeImplemented: false,
  journalPostingImplemented: false,
  key: "hr.payroll.finance-bank-readiness.boundary",
  laborCostFactsReadiness: true,
  processingFlow: [
    "validate_posting_readiness",
    "produce_posting_lines_v2",
    "allocate_cost_centers",
    "emit_labor_cost_facts",
    "prepare_bank_payment_readiness",
    "register_bank_transfer_contract",
    "register_wps_contract",
    "audit_lineage",
  ],
  wpsFileGenerationImplemented: false,
};

export const HR_PAYROLL_FINANCE_BANK_VALIDATION_RULES = [
  { key: "posting_lines_reference_payroll_result", message: "Posting readiness lines must reference payroll result.", runtimeImplemented: false },
  { key: "no_journal_posting_in_foundation", message: "Journal posting runtime is not implemented.", runtimeImplemented: false },
  { key: "bank_files_contract_only", message: "Bank transfer files are contract-only; no generation runtime.", runtimeImplemented: false },
  { key: "wps_contract_only", message: "WPS readiness is contract-only; no file generation.", runtimeImplemented: false },
  { key: "labor_cost_facts_require_audit_lineage", message: "Labor cost facts require audit lineage reference.", runtimeImplemented: false },
  { key: "cost_allocation_percent_valid", message: "Cost center allocation percent must sum to 100 per result.", runtimeImplemented: false },
] as const;

const hrPayrollFinanceBankImportExportSecurity = {
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

export const HR_PAYROLL_FINANCE_BANK_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "payrollRunId", label: "Payroll Run ID", required: true },
    { dataType: "text", key: "postingLineType", label: "Posting Line Type", required: true },
    { dataType: "number", key: "amount", label: "Amount", required: true },
  ],
  key: "hr.payroll.finance-bank-readiness.import",
  label: "HR Payroll Finance Bank Readiness Import",
  mappings: [
    { key: "payroll-run-id", sourceColumn: "Payroll Run ID", targetField: "payrollRunId" },
    { key: "posting-line-type", sourceColumn: "Posting Line Type", targetField: "postingLineType" },
    { key: "amount", sourceColumn: "Amount", targetField: "amount" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { financeBankReadinessFoundationOnly: true, financePostingRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollFinanceBankImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "payrollRunId", key: "payroll-run-required", message: "Payroll run ID is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_FINANCE_BANK_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "payrollRunId", label: "Payroll Run ID", order: 1, sourceField: "payrollRunId" },
    { dataType: "text", key: "postingLineType", label: "Posting Line Type", order: 2, sourceField: "postingLineType" },
    { dataType: "number", key: "amount", label: "Amount", order: 3, sourceField: "amount" },
  ],
  key: "hr.payroll.finance-bank-readiness.export",
  label: "HR Payroll Finance Bank Readiness Export",
  mappings: [
    { key: "payroll-run-id", sourceField: "payrollRunId", targetColumn: "Payroll Run ID" },
    { key: "posting-line-type", sourceField: "postingLineType", targetColumn: "Posting Line Type" },
    { key: "amount", sourceField: "amount", targetColumn: "Amount" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-finance-readiness-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollFinanceBankImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_FINANCE_BANK_EVENT_DEFINITIONS = [
  "PayrollPostingReadinessV2Prepared",
  "PayrollCostCenterAllocated",
  "PayrollLaborCostFactEmitted",
  "PayrollBankPaymentReadinessPrepared",
  "PayrollBankTransferContractRegistered",
  "PayrollWpsReadinessContractRegistered",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for Payroll Finance Bank Readiness Foundation. No journal posting or bank file generation runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  }),
);

export const HR_PAYROLL_FINANCE_BANK_AUDIT_ACTIONS = {
  bankPaymentReadinessPrepared: defineAuditAction("hr.payroll.bank.payment-readiness.prepared"),
  bankTransferContractRegistered: defineAuditAction("hr.payroll.bank.transfer-contract.registered"),
  costCenterAllocated: defineAuditAction("hr.payroll.finance.cost-center.allocated"),
  laborCostFactEmitted: defineAuditAction("hr.payroll.finance.labor-cost-fact.emitted"),
  postingReadinessV2Prepared: defineAuditAction("hr.payroll.finance.posting-readiness.v2.prepared"),
  wpsReadinessContractRegistered: defineAuditAction("hr.payroll.bank.wps-contract.registered"),
} as const;

export const HR_PAYROLL_FINANCE_BANK_FOUNDATION_TABLES = [
  "hr_payroll_cost_center_allocations",
  "hr_payroll_labor_cost_facts",
  "hr_payroll_bank_payment_readiness",
  "hr_payroll_finance_audit_lineage",
] as const;

export const HR_PAYROLL_FINANCE_BANK_EXTENDED_TABLES = [
  "hr_payroll_posting_readiness",
] as const;

export const HR_PAYROLL_FINANCE_BANK_PERMISSION_METADATA = [
  { entity: "payroll-finance-readiness", key: HR_PERMISSIONS.payrollFinanceReadinessView, scope: "tenant-company-branch" },
  { entity: "payroll-finance-readiness-manage", key: HR_PERMISSIONS.payrollFinanceReadinessManage, scope: "tenant-company-branch" },
  { entity: "payroll-bank-readiness", key: HR_PERMISSIONS.payrollBankReadinessManage, scope: "tenant-company-branch" },
  { entity: "payroll-cost-allocation", key: HR_PERMISSIONS.payrollCostAllocationManage, scope: "tenant-company-branch" },
] as const;

export const HR_PAYROLL_FINANCE_BANK_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  bankFileGenerationImplemented: false,
  costEngineIntegrationReady: true,
  eventBusRegistered: true,
  extendsSprint14PostingReadiness: true,
  financePostingRuntimeImplemented: false,
  importExportRegistered: true,
  key: "hr.payroll.finance-bank-readiness.platform-integration",
  wpsFileGenerationImplemented: false,
} as const;
