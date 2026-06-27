import {
  createCostDashboardIntegrationContract,
  createCostEventIntegrationContract,
  createCostExportIntegrationContract,
  createCostJobReadinessContract,
  createCostReportIntegrationContract,
  createCostSearchIntegrationContract,
  createExportDashboardIntegrationContract,
  createExportJobReadinessContract,
  createExportReportIntegrationContract,
  createExportSearchIntegrationContract,
  createImportJobReadinessContract,
  createImportSearchIndexingContract,
  createJobReadinessContract,
  defineAppKey,
  defineAuditAction,
  defineCostDefinition,
  defineDashboardTemplate,
  defineDashboardWidget,
  defineDocumentBehavior,
  defineDocumentLifecycle,
  defineDocumentType,
  defineDocumentTypeDefinition,
  defineExport,
  defineImport,
  definePlatformEventDefinition,
  definePlatformEventName,
  definePrintTemplate,
  defineReport,
  defineReportDataset,
  defineSearchProvider,
  type DocumentType,
} from "@/platform/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

import { createFinancePostingReadinessContract } from "@/features/finance/public-api";
import { INVENTORY_DOCUMENT_CONTRACTS } from "@/features/inventory/public-api";

import { manufacturingAppManifest } from "./app.manifest";
import { manufacturingModuleManifest } from "./module.manifest";
import { MANUFACTURING_PERMISSION_LIST, MANUFACTURING_PERMISSIONS } from "./permissions/permission-registry";

export const MANUFACTURING_APP_KEY = defineAppKey("manufacturing");

export type ManufacturingRecordStatus = "draft" | "active" | "released" | "completed" | "cancelled" | "inactive" | "locked" | "archived";
export type ManufacturingTargetPeriod = "daily" | "shift" | "hourly";
export type ManufacturingOperationKind = "setup" | "run" | "inspection_readiness" | "move" | "pack" | "custom";
export type ManufacturingExecutionDocumentKind = "manufacturing_order" | "work_order" | "operation_execution" | "material_consumption" | "finished_goods_receipt" | "by_product" | "scrap" | "rework";

export type ManufacturingScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type ManufacturingLineDefinition = ManufacturingScope & Readonly<{ lineKey: string; name: string; workCenterKey?: string | null; status: ManufacturingRecordStatus }>;
export type ManufacturingWorkCenterDefinition = ManufacturingScope & Readonly<{ workCenterKey: string; name: string; capacity?: number | null; costCenterKey?: string | null; status: ManufacturingRecordStatus }>;
export type ManufacturingWorkstationDefinition = ManufacturingScope & Readonly<{ workstationKey: string; workCenterKey: string; lineKey?: string | null; name: string; status: ManufacturingRecordStatus }>;
export type ManufacturingMachineDefinition = ManufacturingScope & Readonly<{ machineKey: string; workstationKey?: string | null; workCenterKey?: string | null; name: string; machineHourFactReady: true; maintenanceReadinessOnly: true; status: ManufacturingRecordStatus }>;
export type ManufacturingProductionCellDefinition = ManufacturingScope & Readonly<{ cellKey: string; lineKey: string; workCenterKey?: string | null; workstationKeys: readonly string[]; status: ManufacturingRecordStatus }>;
export type ManufacturingOperationDefinition = ManufacturingScope & Readonly<{ operationKey: string; name: string; operationKind: ManufacturingOperationKind; standardMinutes?: number | null; status: ManufacturingRecordStatus }>;

export type ManufacturingRoutingDefinition = ManufacturingScope & Readonly<{
  routingKey: string;
  productKey: string;
  versionKey: string;
  operations: readonly Readonly<{ operationKey: string; sequence: number; workCenterKey?: string | null; lineKey?: string | null }>[];
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingBomDefinition = ManufacturingScope & Readonly<{
  bomKey: string;
  productKey: string;
  versionKey: string;
  components: readonly Readonly<{ componentProductKey: string; quantity: number; uomKey: string; operationKey?: string | null }>[];
  inventoryQuantityOwner: "inventory";
  costCalculationOwner: "cost-engine";
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingProductionVersionDefinition = ManufacturingScope & Readonly<{
  versionKey: string;
  productKey: string;
  bomKey: string;
  routingKey: string;
  validFrom?: string | null;
  validTo?: string | null;
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingProductionPlanDefinition = ManufacturingScope & Readonly<{
  planKey: string;
  planDate: string;
  status: ManufacturingRecordStatus;
  schedulingEngineImplemented: false;
}>;

export type ManufacturingProductionPlanLineDefinition = ManufacturingScope & Readonly<{
  planKey: string;
  lineNumber: number;
  plannedProductKey: string;
  plannedQuantity: number;
  plannedStart: string;
  plannedEnd: string;
  plannedShiftKey: string;
  plannedLineKey: string;
  schedulingEngineImplemented: false;
}>;

export type ManufacturingProductTargetDefinition = ManufacturingScope & Readonly<{
  targetKey: string;
  productKey: string;
  period: ManufacturingTargetPeriod;
  targetQuantity: number;
  incentiveCalculationImplemented: false;
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingLineTargetDefinition = ManufacturingScope & Readonly<{
  targetKey: string;
  planKey: string;
  productKey: string;
  lineKey: string;
  plannedQuantity: number;
  actualQuantity?: number | null;
  achievementPercent?: number | null;
  achievementFactOwner: "manufacturing";
  incentiveCalculationImplemented: false;
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingWorkerTargetDefinition = ManufacturingScope & Readonly<{
  targetKey: string;
  planKey: string;
  workerKey: string;
  lineKey: string;
  targetQuantity: number;
  actualQuantity?: number | null;
  achievementPercent?: number | null;
  achievementFactOwner: "manufacturing";
  payrollCalculationImplemented: false;
  status: ManufacturingRecordStatus;
}>;

export type ManufacturingDailyProductionReportContract = ManufacturingScope & Readonly<{
  reportKey: string;
  reportDate: string;
  shiftKey: string;
  productKey: string;
  productionLineKey: string;
  supervisorKey: string;
  workerKeys: readonly string[];
  plannedQuantity: number;
  actualQuantity: number;
  workerOutput: readonly Readonly<{ workerKey: string; actualQuantity: number; targetQuantity?: number | null }>[];
  scrapQuantity: number;
  reworkQuantity: number;
  downtimeMinutes: number;
  notes?: string | null;
  attachmentKeys: readonly string[];
  sourceFor: readonly ("worker_kpis" | "line_kpis" | "product_kpis" | "inventory_movements" | "cost_facts" | "quality_facts" | "dashboard_facts")[];
}>;

export type ManufacturingKpiFactsContract = ManufacturingScope & Readonly<{
  worker: Readonly<{ target: number; actual: number; achievementPercent: number; productivity: number; attendanceReadiness: true }>;
  line: Readonly<{ planned: number; actual: number; achievementPercent: number; scrapPercent: number; downtimePercent: number; efficiencyPercent: number }>;
  product: Readonly<{ plannedQuantity: number; actualQuantity: number; achievementPercent: number }>;
  supervisor: Readonly<{ lineAchievement: number; workerAchievement: number; scrap: number; downtime: number; qualityReadiness: true }>;
  factsOnly: true;
  payrollCalculationImplemented: false;
  costCalculationImplemented: false;
}>;

export type ManufacturingDocumentContract = Readonly<{
  key: string;
  documentType: DocumentType;
  documentKind: ManufacturingExecutionDocumentKind;
  requiredPermission: PermissionKey;
  ownsProductionExecution: true;
  usesDocumentEngine: true;
  usesEventBus: true;
  inventoryQuantityOwner: "inventory";
  costEngineContractOnly: true;
  financePostingReadinessOnly: true;
  payrollCalculationImplemented: false;
  qualityRuntimeImplemented: false;
  costCalculationImplemented: false;
}>;

export type ManufacturingCostIntegrationContract = Readonly<{
  key: string;
  factTypes: readonly ("material_usage" | "labor" | "machine_hour" | "operation" | "production")[];
  ownsCostFacts: false;
  ownsCostLayers: false;
  ownsCostSnapshots: false;
  calculatesCost: false;
}>;

export type ManufacturingInventoryIntegrationContract = Readonly<{
  key: string;
  rawMaterialIssueDocumentType: string;
  wipDocumentType: string;
  finishedGoodsReceiptDocumentType: string;
  productionReturnDocumentType: string;
  materialReturnDocumentType: string;
  inventoryOwnsStockQuantities: true;
  manufacturingOwnsExecutionFacts: true;
}>;

export type ManufacturingHrPayrollIntegrationContract = Readonly<{
  key: string;
  exposesWorkerAchievement: true;
  exposesLineAchievement: true;
  exposesProductAchievement: true;
  exposesAttendanceReadiness: true;
  exposesOvertimeReadiness: true;
  payrollOwnsIncentives: true;
  payrollOwnsSalaryBonusOvertime: true;
  incentiveCalculationImplemented: false;
}>;

export type ManufacturingQualityReadinessContract = Readonly<{
  key: string;
  readinessTypes: readonly ("inspection" | "qc_checkpoint" | "ncr" | "defect" | "rework" | "quality_result")[];
  qualityRuntimeImplemented: false;
}>;

export function defineManufacturingProductionPlan<TDefinition extends ManufacturingProductionPlanDefinition>(definition: TDefinition): TDefinition { return definition; }
export function defineManufacturingProductionPlanLine<TDefinition extends ManufacturingProductionPlanLineDefinition>(definition: TDefinition): TDefinition { return definition; }
export function defineManufacturingProductTarget<TDefinition extends ManufacturingProductTargetDefinition>(definition: TDefinition): TDefinition { return definition; }
export function defineManufacturingLineTarget<TDefinition extends ManufacturingLineTargetDefinition>(definition: TDefinition): TDefinition { return definition; }
export function defineManufacturingWorkerTarget<TDefinition extends ManufacturingWorkerTargetDefinition>(definition: TDefinition): TDefinition { return definition; }
export function defineManufacturingDailyProductionReport<TDefinition extends ManufacturingDailyProductionReportContract>(definition: TDefinition): TDefinition { return definition; }

export function createManufacturingDocumentContract(
  documentKind: ManufacturingExecutionDocumentKind,
  requiredPermission: PermissionKey,
  documentType = `manufacturing.${documentKind.replaceAll("_", "-")}`,
): ManufacturingDocumentContract {
  return {
    costCalculationImplemented: false,
    costEngineContractOnly: true,
    documentKind,
    documentType: defineDocumentType(documentType),
    financePostingReadinessOnly: true,
    inventoryQuantityOwner: "inventory",
    key: `manufacturing.${documentKind}.document-contract`,
    ownsProductionExecution: true,
    payrollCalculationImplemented: false,
    qualityRuntimeImplemented: false,
    requiredPermission,
    usesDocumentEngine: true,
    usesEventBus: true,
  };
}

export function createManufacturingCostIntegrationContract(key = "manufacturing.cost-engine.production-facts"): ManufacturingCostIntegrationContract {
  return {
    calculatesCost: false,
    factTypes: ["material_usage", "labor", "machine_hour", "operation", "production"],
    key,
    ownsCostFacts: false,
    ownsCostLayers: false,
    ownsCostSnapshots: false,
  };
}

export const MANUFACTURING_DOCUMENT_CONTRACTS = {
  byProduct: createManufacturingDocumentContract("by_product", MANUFACTURING_PERMISSIONS.executionManage),
  finishedGoodsReceipt: createManufacturingDocumentContract("finished_goods_receipt", MANUFACTURING_PERMISSIONS.executionManage),
  manufacturingOrder: createManufacturingDocumentContract("manufacturing_order", MANUFACTURING_PERMISSIONS.executionManage),
  materialConsumption: createManufacturingDocumentContract("material_consumption", MANUFACTURING_PERMISSIONS.executionManage),
  operationExecution: createManufacturingDocumentContract("operation_execution", MANUFACTURING_PERMISSIONS.executionManage),
  rework: createManufacturingDocumentContract("rework", MANUFACTURING_PERMISSIONS.executionManage),
  scrap: createManufacturingDocumentContract("scrap", MANUFACTURING_PERMISSIONS.executionManage),
  workOrder: createManufacturingDocumentContract("work_order", MANUFACTURING_PERMISSIONS.executionManage),
} as const;

export const MANUFACTURING_DOCUMENT_TYPE_DEFINITIONS = Object.values(MANUFACTURING_DOCUMENT_CONTRACTS).map((contract) =>
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("approval", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("notifications", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Manufacturing execution foundation contract. Runtime execution, costing, payroll, and quality workflows are not implemented.",
    documentType: contract.documentType,
    label: contract.key,
    lifecycle: defineDocumentLifecycle({
      documentType: contract.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "submitted" },
        { command: "approve", from: "submitted", requiredPermission: MANUFACTURING_PERMISSIONS.approvalsView, requiresApproval: true, requiresAudit: true, to: "approved" },
        { command: "complete", from: "approved", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: contract.requiredPermission, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: MANUFACTURING_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "manufacturing",
  })
);

export const MANUFACTURING_SEARCH_PROVIDER_CONTRACT = defineSearchProvider({
  appKey: "manufacturing",
  entityTypes: ["manufacturing_product", "manufacturing_bom", "manufacturing_routing", "manufacturing_operation", "manufacturing_line", "manufacturing_work_center", "manufacturing_workstation", "manufacturing_plan", "manufacturing_order", "manufacturing_work_order", "manufacturing_daily_report", "manufacturing_target"],
  key: "manufacturing.foundation.search",
  moduleKey: "manufacturing",
  requiredPermissions: [MANUFACTURING_PERMISSIONS.searchView],
  searchableEntities: [{
    appKey: "manufacturing",
    displayName: "Manufacturing foundation definitions",
    entityType: "manufacturing_daily_report",
    moduleKey: "manufacturing",
    permissionPolicy: { hideWhenUnauthorized: true, requiredPermissions: [MANUFACTURING_PERMISSIONS.dailyReportsView], sensitivity: "sensitive" },
    quickSearchFields: ["reportKey", "reportDate", "shiftKey", "productKey", "lineKey", "supervisorKey"],
    rankingStrategy: "weighted",
    resultType: "record",
  }],
  source: "app",
  supportedExperiences: ["erp"],
});

export const MANUFACTURING_REPORT_DATASET_CONTRACT = defineReportDataset({
  appKey: "manufacturing",
  defaultExecutionMode: "async",
  fields: [
    { isDimension: true, key: "reportDate", label: "Report Date", type: "date" },
    { isDimension: true, key: "shift", label: "Shift", type: "text" },
    { isDimension: true, key: "product", label: "Product", type: "text" },
    { isDimension: true, key: "productionLine", label: "Production Line", type: "text" },
    { key: "plannedQuantity", label: "Planned Quantity", type: "quantity" },
    { key: "actualQuantity", label: "Actual Quantity", type: "quantity" },
    { key: "scrap", label: "Scrap", type: "quantity" },
    { key: "rework", label: "Rework", type: "quantity" },
    { key: "downtime", label: "Downtime", type: "number" },
  ],
  key: "manufacturing.foundation.daily-production",
  label: "Manufacturing Daily Production Foundation",
  requiredPermission: MANUFACTURING_PERMISSIONS.dailyReportsView,
});

export const MANUFACTURING_REPORT_READINESS_CONTRACT = defineReport({
  appKey: "manufacturing",
  category: "operational",
  dataSource: { key: "manufacturing.foundation.search-source", providerSource: "business-app", sourceKey: MANUFACTURING_SEARCH_PROVIDER_CONTRACT.key, supportsAsync: true, supportsSync: false, type: "search-provider" },
  datasetKey: MANUFACTURING_REPORT_DATASET_CONTRACT.key,
  key: "manufacturing.foundation.readiness",
  metadata: { auditRequired: true, branchAware: true, companyAware: true, requiredDataScopes: ["tenant", "company", "branch"], sensitivity: "sensitive", tenantAware: true },
  mode: "async",
  name: "Manufacturing Foundation Readiness",
  providerSource: "business-app",
  requiredPermission: MANUFACTURING_PERMISSIONS.dailyReportsView,
  supportedFormats: ["table", "json", "csv"],
});

export const MANUFACTURING_PRINT_READINESS_CONTRACT = definePrintTemplate({
  appKey: "manufacturing",
  defaultLocale: "en",
  key: "manufacturing.foundation.daily-production-print",
  metadata: { brandAware: true, companyScoped: true, localeAware: true, tenantScoped: true },
  name: "Daily Production Report Print Contract",
  providerSource: "business-app",
  requiredPermission: MANUFACTURING_PERMISSIONS.dailyReportsView,
  security: { auditRequired: true, branchAware: true, companyAware: true, requiredPermissions: [MANUFACTURING_PERMISSIONS.dailyReportsView], sensitiveData: true, sensitivity: "sensitive", tenantAware: true },
  supportedFormats: ["preview", "json"],
  supportedLocales: ["en", "ar"],
  type: "report",
});

export const MANUFACTURING_DASHBOARD_WIDGET_CONTRACT = defineDashboardWidget({
  appKey: "manufacturing",
  defaultSize: "wide",
  key: "manufacturing.foundation.kpi-widget",
  label: "Manufacturing KPI Facts",
  reportIntegration: { reportKey: MANUFACTURING_REPORT_READINESS_CONTRACT.key, requiresReportPermission: true, supportedFormats: ["table", "json"] },
  requiredPermission: MANUFACTURING_PERMISSIONS.kpisView,
  supportedExperiences: ["erp"],
  type: "report-widget",
});

export const MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT = defineDashboardTemplate({
  appKey: "manufacturing",
  defaultLayout: {
    pages: [{ key: "foundation", label: "Foundation", order: 1, sections: [{ key: "kpis", label: "KPI Facts", order: 1, widgetKeys: [MANUFACTURING_DASHBOARD_WIDGET_CONTRACT.key] }] }],
    positions: [{ breakpoint: "desktop", height: 4, widgetKey: MANUFACTURING_DASHBOARD_WIDGET_CONTRACT.key, width: 12, x: 0, y: 0 }],
    responsiveGrid: { columns: { desktop: 12, mobile: 4, tablet: 8 }, gap: 16, rowHeight: 80 },
  },
  key: "manufacturing.foundation.dashboard-template",
  kind: "manufacturing",
  label: "Manufacturing Foundation Dashboard Template",
  providerSource: "business-app",
  requiredPermission: MANUFACTURING_PERMISSIONS.kpisView,
  supportedExperiences: ["erp"],
  templateOnly: true,
  widgetKeys: [MANUFACTURING_DASHBOARD_WIDGET_CONTRACT.key],
});

const manufacturingImportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: false,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [MANUFACTURING_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "sensitive",
  tenantAware: true,
} as const;

export const MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT = defineImport({
  appKey: "manufacturing",
  columns: [
    { dataType: "date", key: "reportDate", label: "Report Date", required: true },
    { dataType: "text", key: "shiftKey", label: "Shift", required: true },
    { dataType: "text", key: "productKey", label: "Product", required: true },
    { dataType: "text", key: "lineKey", label: "Production Line", required: true },
    { dataType: "number", key: "actualQuantity", label: "Actual Quantity", required: true },
  ],
  key: "manufacturing.daily-reports.import",
  label: "Manufacturing Daily Production Report Import",
  mappings: [
    { key: "report-date", sourceColumn: "Report Date", targetField: "reportDate" },
    { key: "shift", sourceColumn: "Shift", targetField: "shiftKey" },
    { key: "product", sourceColumn: "Product", targetField: "productKey" },
    { key: "line", sourceColumn: "Production Line", targetField: "lineKey" },
    { key: "actual", sourceColumn: "Actual Quantity", targetField: "actualQuantity" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, noRuntimeExecution: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: MANUFACTURING_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: manufacturingImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "reportDate", key: "report-date-required", message: "Report date is required.", severity: "error", type: "required" },
    { fieldKey: "actualQuantity", key: "actual-required", message: "Actual quantity is required.", severity: "error", type: "required" },
  ],
});

export const MANUFACTURING_EXPORT_CONTRACT = defineExport({
  appKey: "manufacturing",
  columns: [
    { dataType: "date", key: "reportDate", label: "Report Date", order: 1, sourceField: "reportDate" },
    { dataType: "text", key: "product", label: "Product", order: 2, sourceField: "product" },
    { dataType: "text", key: "line", label: "Line", order: 3, sourceField: "line" },
    { dataType: "number", key: "achievement", label: "Achievement", order: 4, sourceField: "achievementPercent" },
  ],
  key: "manufacturing.foundation.export",
  label: "Manufacturing Foundation Export",
  mappings: [
    { key: "report-date", sourceField: "reportDate", targetColumn: "Report Date" },
    { key: "product", sourceField: "product", targetColumn: "Product" },
    { key: "line", sourceField: "line", targetColumn: "Line" },
    { key: "achievement", sourceField: "achievementPercent", targetColumn: "Achievement" },
  ],
  metadata: { fileNameTemplate: "manufacturing-foundation-{date}", includeGeneratedAt: true, includeHeaders: true, retentionDays: 30, watermarkRequired: true },
  providerSource: "business-app",
  requiredPermission: MANUFACTURING_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: manufacturingImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const MANUFACTURING_COST_DEFINITION_CONTRACT = defineCostDefinition({
  allocationRules: [],
  appKey: "manufacturing",
  categories: [
    { active: true, key: "manufacturing-material", label: "Manufacturing Material Usage", type: "direct_material" },
    { active: true, key: "manufacturing-labor", label: "Manufacturing Labor", type: "direct_labor" },
    { active: true, key: "manufacturing-machine", label: "Manufacturing Machine Hours", type: "manufacturing_overhead" },
  ],
  centers: [
    { active: true, key: "manufacturing-line", label: "Production Line", type: "production_line" },
    { active: true, key: "manufacturing-work-center", label: "Work Center", type: "work_center" },
    { active: true, key: "manufacturing-warehouse", label: "Manufacturing Warehouse", type: "warehouse" },
  ],
  costTypes: ["direct_material", "direct_labor", "manufacturing_overhead", "custom"],
  drivers: [
    { key: "material-quantity", label: "Material Quantity", required: true, unit: "quantity" },
    { key: "labor-hours", label: "Labor Hours", required: true, unit: "hours" },
    { key: "machine-hours", label: "Machine Hours", required: true, unit: "hours" },
  ],
  key: "manufacturing.foundation.cost-contracts",
  label: "Manufacturing Cost Engine Fact Contracts",
  metadata: { calculatesCost: false, foundationOnly: true, ownsCostFacts: false, ownsProductionExecution: true },
  objects: [
    { key: "manufacturing-product", label: "Manufactured Product", type: "product" },
    { key: "manufacturing-work-order", label: "Work Order", type: "work_order" },
    { key: "manufacturing-production-order", label: "Production Order", type: "production_order" },
  ],
  providerSource: "business-app",
  rates: [],
  security: { approvalRequired: false, auditRequired: true, branchAware: true, companyAware: true, requiredDataScopes: ["tenant", "company", "branch"], requiredPermissions: [MANUFACTURING_PERMISSIONS.costIntegrationView], sensitiveFinancialData: true, tenantAware: true },
});

export const MANUFACTURING_COST_INTEGRATION_CONTRACTS = {
  dashboard: createCostDashboardIntegrationContract(MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT.key, MANUFACTURING_COST_DEFINITION_CONTRACT.key, "manufacturing.production"),
  definitionChangedEvent: createCostEventIntegrationContract("DailyProductionReported", "definition-change", MANUFACTURING_COST_DEFINITION_CONTRACT.key),
  export: createCostExportIntegrationContract(MANUFACTURING_EXPORT_CONTRACT.key, ["csv", "excel", "json"]),
  facts: createManufacturingCostIntegrationContract(),
  report: createCostReportIntegrationContract(MANUFACTURING_REPORT_READINESS_CONTRACT.key, MANUFACTURING_COST_DEFINITION_CONTRACT.key),
  search: createCostSearchIntegrationContract(MANUFACTURING_SEARCH_PROVIDER_CONTRACT.key, ["record", "document"]),
} as const;

export const MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT = {
  finishedGoodsReceiptDocumentType: String(INVENTORY_DOCUMENT_CONTRACTS.movement.documentType),
  inventoryOwnsStockQuantities: true,
  key: "manufacturing.inventory.movement-readiness",
  manufacturingOwnsExecutionFacts: true,
  materialReturnDocumentType: String(INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType),
  productionReturnDocumentType: String(INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType),
  rawMaterialIssueDocumentType: String(INVENTORY_DOCUMENT_CONTRACTS.movement.documentType),
  wipDocumentType: String(INVENTORY_DOCUMENT_CONTRACTS.movement.documentType),
} as const satisfies ManufacturingInventoryIntegrationContract;

export const MANUFACTURING_FINANCE_INTEGRATION_CONTRACTS = {
  productionPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product", "cost_center"],
    sourceApp: "manufacturing",
    sourceDocumentType: String(MANUFACTURING_DOCUMENT_CONTRACTS.manufacturingOrder.documentType),
  }),
} as const;

export const MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT = {
  exposesAttendanceReadiness: true,
  exposesLineAchievement: true,
  exposesOvertimeReadiness: true,
  exposesProductAchievement: true,
  exposesWorkerAchievement: true,
  incentiveCalculationImplemented: false,
  key: "manufacturing.hr-payroll.achievement-readiness",
  payrollOwnsIncentives: true,
  payrollOwnsSalaryBonusOvertime: true,
} as const satisfies ManufacturingHrPayrollIntegrationContract;

export const MANUFACTURING_QUALITY_READINESS_CONTRACT = {
  key: "manufacturing.quality.readiness",
  qualityRuntimeImplemented: false,
  readinessTypes: ["inspection", "qc_checkpoint", "ncr", "defect", "rework", "quality_result"],
} as const satisfies ManufacturingQualityReadinessContract;

export const MANUFACTURING_EVENT_DEFINITIONS = [
  "ProductionPlanCreated",
  "ProductionPlanReleased",
  "ManufacturingOrderCreated",
  "WorkOrderCreated",
  "DailyProductionReported",
  "ProductTargetDefined",
  "WorkerTargetDefined",
  "LineTargetDefined",
  "WorkerAchievementRecorded",
  "LineAchievementRecorded",
  "ProductAchievementRecorded",
  "ScrapRecorded",
  "ReworkRecorded",
  "FinishedGoodsProduced",
].map((name) => definePlatformEventDefinition({ category: "document", description: `${name} event contract prepared for Manufacturing Foundation. No runtime handler is registered.`, kind: "domain", name: definePlatformEventName(name), source: "business-app", version: 1 }));

export const MANUFACTURING_AUDIT_ACTIONS = {
  achievementRecorded: defineAuditAction("manufacturing.achievement.recorded"),
  dailyReportRecorded: defineAuditAction("manufacturing.daily-report.recorded"),
  productionPlanCreated: defineAuditAction("manufacturing.production-plan.created"),
} as const;

export const MANUFACTURING_JOB_READINESS_CONTRACTS = [
  createJobReadinessContract("search-indexing", "manufacturing.foundation.search-index"),
  createJobReadinessContract("report-generation", "manufacturing.foundation.report"),
  createJobReadinessContract("print-generation", "manufacturing.foundation.print"),
  createJobReadinessContract("notification-delivery", "manufacturing.foundation.notifications"),
  createCostJobReadinessContract("snapshot", MANUFACTURING_COST_DEFINITION_CONTRACT.key),
  createCostJobReadinessContract("recalculation", MANUFACTURING_COST_DEFINITION_CONTRACT.key),
  createImportJobReadinessContract(MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT),
  createExportJobReadinessContract(MANUFACTURING_EXPORT_CONTRACT),
];

export const MANUFACTURING_IMPORT_EXPORT_INTEGRATION_CONTRACTS = {
  exportDashboard: createExportDashboardIntegrationContract(MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT.key, MANUFACTURING_EXPORT_CONTRACT.key),
  exportReport: createExportReportIntegrationContract(MANUFACTURING_REPORT_READINESS_CONTRACT.key, MANUFACTURING_EXPORT_CONTRACT.key),
  exportSearch: createExportSearchIntegrationContract(MANUFACTURING_EXPORT_CONTRACT.key, { resultTypes: ["record", "document"], searchProviderKey: MANUFACTURING_SEARCH_PROVIDER_CONTRACT.key }),
  importSearchIndexing: createImportSearchIndexingContract(MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT.key, MANUFACTURING_SEARCH_PROVIDER_CONTRACT.key),
};

export const MANUFACTURING_FOUNDATION_CONTRACTS = {
  appManifest: manufacturingAppManifest,
  auditActions: MANUFACTURING_AUDIT_ACTIONS,
  costDefinition: MANUFACTURING_COST_DEFINITION_CONTRACT,
  costIntegrations: MANUFACTURING_COST_INTEGRATION_CONTRACTS,
  dashboardTemplate: MANUFACTURING_DASHBOARD_TEMPLATE_CONTRACT,
  dashboardWidget: MANUFACTURING_DASHBOARD_WIDGET_CONTRACT,
  documentContracts: MANUFACTURING_DOCUMENT_CONTRACTS,
  documentTypes: MANUFACTURING_DOCUMENT_TYPE_DEFINITIONS,
  eventDefinitions: MANUFACTURING_EVENT_DEFINITIONS,
  export: MANUFACTURING_EXPORT_CONTRACT,
  financeIntegrations: MANUFACTURING_FINANCE_INTEGRATION_CONTRACTS,
  hrPayrollIntegration: MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT,
  import: MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT,
  importExportIntegrations: MANUFACTURING_IMPORT_EXPORT_INTEGRATION_CONTRACTS,
  inventoryIntegration: MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT,
  jobReadiness: MANUFACTURING_JOB_READINESS_CONTRACTS,
  moduleManifest: manufacturingModuleManifest,
  permissions: MANUFACTURING_PERMISSION_LIST,
  print: MANUFACTURING_PRINT_READINESS_CONTRACT,
  qualityReadiness: MANUFACTURING_QUALITY_READINESS_CONTRACT,
  report: MANUFACTURING_REPORT_READINESS_CONTRACT,
  reportDataset: MANUFACTURING_REPORT_DATASET_CONTRACT,
  search: MANUFACTURING_SEARCH_PROVIDER_CONTRACT,
} as const;
