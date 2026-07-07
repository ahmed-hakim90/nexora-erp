import {
  defineDashboardWidget,
  definePrintTemplate,
  defineReport,
  type DocumentType,
} from "@/platform/public-api";

import { MANUFACTURING_PERMISSIONS } from "./permissions/permission-registry";
import { MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION, MANUFACTURING_V2_BOUNDARY_CONTRACT } from "./foundation-contracts";
import { MANUFACTURING_RELATION_LABEL_CONTRACTS } from "./presentation/relation-labels";

export const MANUFACTURING_OPERATION_PLAN_STATUSES = [
  "draft",
  "planned",
  "ready",
  "blocked",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const MANUFACTURING_BOM_STATUSES = ["draft", "active", "inactive", "archived"] as const;
export const MANUFACTURING_ROUTING_STATUSES = ["draft", "active", "inactive", "archived"] as const;
export const MANUFACTURING_CREW_ASSIGNMENT_STATUSES = ["draft", "active", "replaced", "closed", "cancelled"] as const;
export const MANUFACTURING_CREW_ROLES = [
  "operator",
  "lead_operator",
  "helper",
  "acting_supervisor",
  "quality_observer",
  "maintenance_support",
  "temporary_worker",
] as const;
export const MANUFACTURING_PRODUCTION_REPORT_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "posted",
  "closed",
  "cancelled",
] as const;

export type ManufacturingOperationPlanStatus = (typeof MANUFACTURING_OPERATION_PLAN_STATUSES)[number];
export type ManufacturingCrewRole = (typeof MANUFACTURING_CREW_ROLES)[number];

export type ManufacturingSprint3Scope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId: string;
}>;

export type ManufacturingOperationPlanFoundationContract = ManufacturingSprint3Scope &
  Readonly<{
    operationPlanId?: string | null;
    manufacturingOrderId: string;
    workOrderId?: string | null;
    routingStepId?: string | null;
    sequence: number;
    operationCode: string;
    operationName: string;
    workCenterId: string;
    workstationId?: string | null;
    machineId?: string | null;
    plannedQuantity: number;
    uomId?: string | null;
    plannedLaborHours: number;
    plannedMachineMinutes: number;
    setupMinutes: number;
    runMinutes: number;
    status: ManufacturingOperationPlanStatus;
    routingReferenceOnly: true;
    inventoryMutationImplemented: false;
    materialIssueImplemented: false;
    costCalculationImplemented: false;
    qualityExecutionImplemented: false;
    payrollLogicImplemented: false;
    productionExecutionRuntimeImplemented: false;
    perWorkerTargetCanonical: false;
  }>;

export type ManufacturingBomLineFoundationContract = Readonly<{
  bomId: string;
  sequence: number;
  componentProductId: string;
  componentVariantId?: string | null;
  quantity: number;
  uomId: string;
  scrapPercent?: number | null;
  operationReference?: string | null;
  notes?: string | null;
  productMasterOwner: "product-master";
  uomOwner: "uom";
  materialIntentOnly: true;
  componentsJsonLegacyOnly: true;
}>;

export type ManufacturingRoutingStepFoundationContract = Readonly<{
  routingId: string;
  sequence: number;
  operationCode: string;
  operationName: string;
  workCenterId: string;
  workstationId?: string | null;
  defaultMachineId?: string | null;
  standardCrewSize: number;
  standardOutputQuantity: number;
  standardLaborHours: number;
  standardMachineMinutes: number;
  setupMinutes: number;
  runMinutes: number;
  notes?: string | null;
  operationsJsonLegacyOnly: true;
  noScheduler: true;
  perWorkerTargetCanonical: false;
}>;

export type ManufacturingCrewAssignmentFoundationContract = ManufacturingSprint3Scope &
  Readonly<{
    crewAssignmentId?: string | null;
    manufacturingOrderId: string;
    workOrderId?: string | null;
    operationId: string;
    productionLineId?: string | null;
    shiftId?: string | null;
    supervisorEmployeeId?: string | null;
    status: (typeof MANUFACTURING_CREW_ASSIGNMENT_STATUSES)[number];
    effectiveFrom: string;
    effectiveTo?: string | null;
    reason?: string | null;
    employeeMasterOwner: "hr";
    hrAssignmentOwner: "hr";
    ownsEmployeeMasterData: false;
    operationLevelAssignment: true;
    supportsMultipleMembers: true;
    payrollLogicImplemented: false;
    productionExecutionRuntimeImplemented: false;
  }>;

export type ManufacturingCrewAssignmentMemberFoundationContract = Readonly<{
  crewAssignmentId: string;
  employeeId: string;
  hrAssignmentId?: string | null;
  crewRole: ManufacturingCrewRole;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isTemporary: boolean;
  isActing: boolean;
  replacementOfMemberId?: string | null;
  notes?: string | null;
  employeeMasterOwner: "hr";
}>;

export type ManufacturingProductionReportFoundationContract = ManufacturingSprint3Scope &
  Readonly<{
    reportId?: string | null;
    documentNumber: string;
    documentType: DocumentType;
    manufacturingOrderId: string;
    workOrderId?: string | null;
    operationId: string;
    productId: string;
    productVariantId?: string | null;
    productionLineId: string;
    shiftId?: string | null;
    reportDate: string;
    producedQuantity: number;
    scrapQuantity: number;
    reworkQuantity: number;
    uomId?: string | null;
    machineId?: string | null;
    crewAssignmentId?: string | null;
    status: (typeof MANUFACTURING_PRODUCTION_REPORT_STATUSES)[number];
    notes?: string | null;
    usesDocumentEngine: true;
    businessDocument: true;
    productionFactsOnly: true;
    mutatesInventoryQuantities: false;
    calculatesCost: false;
    createsAccountingEntries: false;
    payrollLogicImplemented: false;
    qualityExecutionImplemented: false;
  }>;

export type ManufacturingWorkspaceQuickActionContract = Readonly<{
  key: string;
  label: string;
  readinessOnly: true;
  runtimeImplemented: false;
  disabledReason: string;
}>;

export const MANUFACTURING_SPRINT3_EVENT_NAMES = [
  "ManufacturingOperationPlanned",
  "ManufacturingOperationReady",
  "ManufacturingOperationBlocked",
  "ManufacturingOperationStarted",
  "ManufacturingOperationCompleted",
  "ManufacturingOperationCancelled",
  "ManufacturingBomActivated",
  "ManufacturingRoutingActivated",
  "ManufacturingCrewAssigned",
  "ManufacturingCrewReplaced",
  "ManufacturingProductionReportCreated",
  "ManufacturingProductionReportSubmitted",
  "ManufacturingProductionReportApproved",
  "ManufacturingProductionReportPosted",
  "ManufacturingDowntimeReported",
  "ManufacturingScrapReported",
  "ManufacturingReworkReported",
] as const;

export const MANUFACTURING_SPRINT3_SEARCH_ENTITIES = [
  "manufacturing_bom",
  "manufacturing_bom_line",
  "manufacturing_routing",
  "manufacturing_routing_step",
  "manufacturing_operation_plan",
  "manufacturing_crew_assignment",
  "manufacturing_production_report",
  "manufacturing_machine",
] as const;

export const MANUFACTURING_SPRINT3_REPORT_READINESS = [
  { key: "manufacturing.report.plan-vs-actual", label: "Plan vs Actual" },
  { key: "manufacturing.report.line-achievement", label: "Line Achievement" },
  { key: "manufacturing.report.operation-achievement", label: "Operation Achievement" },
  { key: "manufacturing.report.crew-productivity", label: "Crew Productivity" },
  { key: "manufacturing.report.scrap-summary", label: "Scrap Summary" },
  { key: "manufacturing.report.rework-summary", label: "Rework Summary" },
  { key: "manufacturing.report.downtime-summary", label: "Downtime Summary" },
] as const;

export const MANUFACTURING_SPRINT3_DASHBOARD_METRICS = [
  "plannedQuantity",
  "producedQuantity",
  "operationStatus",
  "scrapRate",
  "reworkRate",
  "downtimeMinutes",
  "crewCount",
] as const;

export const MANUFACTURING_SPRINT3_PRINT_READINESS = [
  { key: "manufacturing.print.manufacturing-order", label: "Manufacturing Order" },
  { key: "manufacturing.print.operation-sheet", label: "Operation Sheet" },
  { key: "manufacturing.print.crew-assignment-sheet", label: "Crew Assignment Sheet" },
  { key: "manufacturing.print.production-report", label: "Production Report" },
  { key: "manufacturing.print.scrap-report", label: "Scrap Report" },
  { key: "manufacturing.print.downtime-report", label: "Downtime Report" },
] as const;

export const MANUFACTURING_WORKSPACE_QUICK_ACTIONS = [
  { disabledReason: "Shop-floor execution runtime is not implemented in Sprint 3.", key: "start-operation", label: "Start Operation", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Crew assignment UI workflow opens in a future sprint.", key: "assign-crew", label: "Assign Crew", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Production report capture UI opens in a future sprint.", key: "production-report", label: "Production Report", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Material request uses Inventory documents and is not implemented here.", key: "request-materials", label: "Request Materials", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Downtime capture runtime is readiness-only in Sprint 3.", key: "report-downtime", label: "Report Downtime", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Scrap capture runtime is readiness-only in Sprint 3.", key: "report-scrap", label: "Report Scrap", readinessOnly: true, runtimeImplemented: false },
  { disabledReason: "Operation completion runtime is not implemented in Sprint 3.", key: "finish-operation", label: "Finish Operation", readinessOnly: true, runtimeImplemented: false },
] as const satisfies readonly ManufacturingWorkspaceQuickActionContract[];

export const MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS = {
  ...MANUFACTURING_V2_BOUNDARY_CONTRACT,
  componentsJsonLegacyOnly: true,
  materialIntentOnly: true,
  noExecutionRuntime: true,
  noInventoryPosting: true,
  noMaterialIssuePosting: true,
  noPayrollLogic: true,
  noQualityExecution: true,
  operationsJsonLegacyOnly: true,
  perWorkerTargetCanonical: false,
  productionExecutionRuntimeImplemented: false,
  workspaceUsesFakeData: false,
} as const;

export const MANUFACTURING_SPRINT3_REPORT_CONTRACTS = MANUFACTURING_SPRINT3_REPORT_READINESS.map((report) =>
  defineReport({
    appKey: "manufacturing",
    category: "operational",
    dataSource: {
      key: `manufacturing.sprint3.${report.key}`,
      providerSource: "business-app",
      sourceKey: "manufacturing.foundation.search",
      supportsAsync: true,
      supportsSync: false,
      type: "search-provider",
    },
    datasetKey: "manufacturing.foundation.daily-production",
    key: report.key,
    metadata: {
      auditRequired: true,
      branchAware: true,
      companyAware: true,
      foundationOnly: true,
      requiredDataScopes: ["tenant", "company", "branch"],
      sensitivity: "sensitive",
      tenantAware: true,
    },
    mode: "async",
    name: report.label,
    providerSource: "business-app",
    requiredPermission: MANUFACTURING_PERMISSIONS.reportsView,
    supportedFormats: ["table", "json", "csv"],
  }),
);

export const MANUFACTURING_SPRINT3_DASHBOARD_WIDGET = defineDashboardWidget({
  appKey: "manufacturing",
  defaultSize: "wide",
  key: "manufacturing.sprint3.workspace-dashboard",
  label: "Manufacturing Workspace KPI Readiness",
  reportIntegration: {
    reportKey: "manufacturing.foundation.readiness",
    requiresReportPermission: true,
    supportedFormats: ["table", "json"],
  },
  requiredPermission: MANUFACTURING_PERMISSIONS.kpisView,
  supportedExperiences: ["erp"],
  type: "report-widget",
});

export const MANUFACTURING_SPRINT3_PRINT_CONTRACTS = MANUFACTURING_SPRINT3_PRINT_READINESS.map((print) =>
  definePrintTemplate({
    appKey: "manufacturing",
    defaultLocale: "en",
    key: print.key,
    metadata: { brandAware: true, companyScoped: true, foundationOnly: true, localeAware: true, tenantScoped: true },
    name: print.label,
    providerSource: "business-app",
    requiredPermission: MANUFACTURING_PERMISSIONS.reportsView,
    security: {
      auditRequired: true,
      branchAware: true,
      companyAware: true,
      requiredPermissions: [MANUFACTURING_PERMISSIONS.reportsView],
      sensitiveData: true,
      sensitivity: "sensitive",
      tenantAware: true,
    },
    supportedFormats: ["preview", "json"],
    supportedLocales: ["en", "ar"],
    type: "report",
  }),
);

export function defineManufacturingOperationPlanFoundation<T extends ManufacturingOperationPlanFoundationContract>(
  definition: T,
): T {
  return definition;
}

export function defineManufacturingBomLineFoundation<T extends ManufacturingBomLineFoundationContract>(definition: T): T {
  return definition;
}

export function defineManufacturingRoutingStepFoundation<T extends ManufacturingRoutingStepFoundationContract>(
  definition: T,
): T {
  return definition;
}

export function defineManufacturingCrewAssignmentFoundation<T extends ManufacturingCrewAssignmentFoundationContract>(
  definition: T,
): T {
  return definition;
}

export function defineManufacturingCrewAssignmentMemberFoundation<T extends ManufacturingCrewAssignmentMemberFoundationContract>(
  definition: T,
): T {
  return definition;
}

export function defineManufacturingProductionReportFoundation<T extends ManufacturingProductionReportFoundationContract>(
  definition: T,
): T {
  return definition;
}

export const MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS = {
  boundaryGuardrails: MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS,
  crewRoles: MANUFACTURING_CREW_ROLES,
  dashboardMetrics: MANUFACTURING_SPRINT3_DASHBOARD_METRICS,
  dashboardWidget: MANUFACTURING_SPRINT3_DASHBOARD_WIDGET,
  eventNames: MANUFACTURING_SPRINT3_EVENT_NAMES,
  operationPlanStatuses: MANUFACTURING_OPERATION_PLAN_STATUSES,
  printContracts: MANUFACTURING_SPRINT3_PRINT_CONTRACTS,
  productionReportDocument: MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION,
  productionReportStatuses: MANUFACTURING_PRODUCTION_REPORT_STATUSES,
  relationLabels: MANUFACTURING_RELATION_LABEL_CONTRACTS,
  reportContracts: MANUFACTURING_SPRINT3_REPORT_CONTRACTS,
  searchEntities: MANUFACTURING_SPRINT3_SEARCH_ENTITIES,
  workspaceQuickActions: MANUFACTURING_WORKSPACE_QUICK_ACTIONS,
} as const;
