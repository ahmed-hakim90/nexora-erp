import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { financeAppManifest } from "@/features/finance/public-api";
import { inventoryAppManifest } from "@/features/inventory/public-api";
import {
  createManufacturingCostIntegrationContract,
  createManufacturingDocumentContract,
  defineManufacturingDailyProductionReport,
  defineManufacturingCrewAssignment,
  defineManufacturingDowntimeReport,
  defineManufacturingFactoryScope,
  defineManufacturingMachine,
  defineManufacturingMachineRuntimeFact,
  defineManufacturingOperation,
  defineManufacturingOperationPlan,
  defineManufacturingOrder,
  defineManufacturingOrderFoundation,
  defineManufacturingLineTarget,
  defineManufacturingProductionLine,
  defineManufacturingProductionPlanFoundation,
  defineManufacturingProductionPlanLineFoundation,
  defineManufacturingProductionReport,
  defineManufacturingProductionPlan,
  defineManufacturingProductionPlanLine,
  defineManufacturingProductTarget,
  defineManufacturingReworkReport,
  defineManufacturingScrapReport,
  defineManufacturingWorkCenter,
  defineManufacturingWorkstation,
  defineManufacturingWorkOrder,
  defineManufacturingWorkerTarget,
  MANUFACTURING_APP_KEY,
  manufacturingAppManifest,
  MANUFACTURING_COST_DEFINITION_CONTRACT,
  MANUFACTURING_COST_INTEGRATION_CONTRACTS,
  MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT,
  MANUFACTURING_DOCUMENT_CONTRACTS,
  MANUFACTURING_EVENT_DEFINITIONS,
  MANUFACTURING_EXPORT_CONTRACT,
  MANUFACTURING_FINANCE_INTEGRATION_CONTRACTS,
  MANUFACTURING_FOUNDATION_CONTRACTS,
  MANUFACTURING_FACTORY_HIERARCHY_CONTRACT,
  MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT,
  MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT,
  MANUFACTURING_ORDER_DOCUMENT_DEFINITION,
  MANUFACTURING_PERMISSION_LIST,
  MANUFACTURING_PERMISSIONS,
  MANUFACTURING_PLANNING_LIFECYCLE_CONTRACT,
  MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION,
  MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION,
  MANUFACTURING_QUALITY_READINESS_CONTRACT,
  MANUFACTURING_REPORT_READINESS_CONTRACT,
  MANUFACTURING_RESOURCE_DEFINITIONS,
  MANUFACTURING_SEARCH_PROVIDER_CONTRACT,
  MANUFACTURING_STRUCTURE_STATUSES,
  MANUFACTURING_V2_BOUNDARY_CONTRACT,
  MANUFACTURING_V2_DOCUMENT_CONTRACTS,
  MANUFACTURING_V2_DOCUMENT_DEFINITIONS,
  MANUFACTURING_V2_EVENT_CONTRACTS,
  canTransitionManufacturingOrder,
  canTransitionProductionPlan,
  manufacturingModuleManifest,
  type ManufacturingKpiFactsContract,
} from "@/features/manufacturing/public-api";
import {
  defineAppManifest,
  validateAppManifest,
  type AppManifest,
} from "@/platform/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260627125000_manufacturing_foundation.sql");
const operationalMigrationPath = path.join(root, "supabase/migrations/20260628080000_manufacturing_operational_lines_steps.sql");
const factoryStructureMigrationPath = path.join(root, "supabase/migrations/20260701150000_manufacturing_factory_structure_machine_model.sql");
const planningOrderMigrationPath = path.join(root, "supabase/migrations/20260701153000_manufacturing_planning_order_foundation.sql");
const scope = { branchId: "branch-1", companyId: "company-1", tenantId: "tenant-1" };

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("manufacturing foundation registers app and module manifests", () => {
  assert.equal(String(MANUFACTURING_APP_KEY), "manufacturing");
  assert.equal(manufacturingModuleManifest.key, "manufacturing");
  assert.equal(manufacturingAppManifest.key, "manufacturing");
  assert.equal(manufacturingAppManifest.name, "Manufacturing Foundation");
  assert.equal(manufacturingAppManifest.sensitiveData, "sensitive");
  assert.deepEqual(validateAppManifest(manufacturingAppManifest, [
    platformManifest,
    financeAppManifest,
    inventoryAppManifest,
    manufacturingAppManifest,
  ]), { errors: [], valid: true });
  assert.equal(manufacturingAppManifest.dependencies.some((dependency) => dependency.appKey === "finance"), true);
  assert.equal(manufacturingAppManifest.dependencies.some((dependency) => dependency.appKey === "inventory"), true);
  assert.equal(manufacturingAppManifest.quickActions.length, 0);
});

test("manufacturing v2 permissions, manifest routes, commands, and readiness capabilities are registered as contracts", () => {
  const requiredPermissions = [
    "manufacturing.view",
    "manufacturing.planning.view",
    "manufacturing.planning.manage",
    "manufacturing.orders.view",
    "manufacturing.orders.manage",
    "manufacturing.orders.release",
    "manufacturing.orders.close",
    "manufacturing.operations.view",
    "manufacturing.operations.manage",
    "manufacturing.crew.view",
    "manufacturing.crew.manage",
    "manufacturing.crew.approve",
    "manufacturing.reports.view",
    "manufacturing.reports.create",
    "manufacturing.reports.submit",
    "manufacturing.reports.approve",
    "manufacturing.reports.post",
    "manufacturing.scrap.manage",
    "manufacturing.downtime.manage",
    "manufacturing.rework.manage",
    "manufacturing.kpis.view",
  ];

  for (const permission of requiredPermissions) {
    assert.equal(MANUFACTURING_PERMISSION_LIST.map(String).includes(permission), true, `${permission} should be registered`);
  }

  for (const routeKey of [
    "manufacturing.contracts",
    "manufacturing.production-plans.contract",
    "manufacturing.orders.contract",
    "manufacturing.operations.contract",
    "manufacturing.crew.contract",
    "manufacturing.production-reports.contract",
  ]) {
    assert.equal(manufacturingAppManifest.routes.some((route) => route.key === routeKey), true, `${routeKey} should be a contract route`);
  }

  assert.equal(manufacturingAppManifest.commands.some((command) => command.key === "manufacturing.contracts.open"), true);
  assert.equal(manufacturingAppManifest.capabilities.some((capability) => capability.key === "manufacturing.search" && capability.type === "search"), true);
  assert.equal(manufacturingAppManifest.reports.some((report) => report.key === MANUFACTURING_REPORT_READINESS_CONTRACT.key), true);
  assert.equal(manufacturingAppManifest.dashboards.some((dashboard) => dashboard.key === "manufacturing.foundation.dashboard-template"), true);
  assert.equal(manufacturingAppManifest.prints.some((print) => print.key === "manufacturing.foundation.daily-production-print"), true);
});

test("manufacturing v2 foundation contracts cover planning, orders, operations, crew, reports, and machine runtime facts", () => {
  const operation = defineManufacturingOperation({
    ...scope,
    canonicalTargetModel: "operation-crew-standard",
    name: "Sew upper",
    operationKey: "op-sew-upper",
    operationKind: "run",
    perWorkerTargetCanonical: false,
    standardCrewSize: 8,
    standardLaborHours: 12,
    standardMachineMinutes: 480,
    standardOutputQuantity: 300,
    status: "active",
  });
  const order = defineManufacturingOrder({
    ...scope,
    accountingPostingImplemented: false,
    closePermission: MANUFACTURING_PERMISSIONS.ordersClose,
    costCalculationImplemented: false,
    inventoryMutationImplemented: false,
    orderKey: "mo-1",
    plannedQuantity: 300,
    productMasterOwner: "product-master",
    productRef: "product-1",
    releasePermission: MANUFACTURING_PERMISSIONS.ordersRelease,
    status: "draft",
  });
  const workOrder = defineManufacturingWorkOrder({
    ...scope,
    manufacturingOrderKey: order.orderKey,
    productionRuntimeImplemented: false,
    status: "planned",
    warehouseMasterOwner: "warehouse-master",
    warehouseRef: "warehouse-1",
    workOrderKey: "wo-1",
  });
  const operationPlan = defineManufacturingOperationPlan({
    ...scope,
    manufacturingOrderKey: order.orderKey,
    operationKey: operation.operationKey,
    operationPlanKey: "op-plan-1",
    perWorkerTargetCanonical: false,
    plannedEnd: "2026-07-01T16:00:00.000Z",
    plannedStart: "2026-07-01T08:00:00.000Z",
    sequence: 10,
    standardCrewSize: 8,
    standardOutputQuantity: 300,
    workOrderKey: workOrder.workOrderKey,
  });
  const crew = defineManufacturingCrewAssignment({
    ...scope,
    assignmentKind: "replacement",
    crewAssignmentKey: "crew-1",
    effectiveFrom: "2026-07-01T08:00:00.000Z",
    employeeMasterOwner: "hr",
    hrAssignmentRefs: ["hr-assignment-1"],
    hrWorkerRefs: ["hr-worker-1", "hr-worker-2"],
    immutableHistory: true,
    operationPlanKey: operationPlan.operationPlanKey,
    ownsEmployeeMasterData: false,
    requiredPermission: MANUFACTURING_PERMISSIONS.crewManage,
  });
  const productionReport = defineManufacturingProductionReport({
    ...scope,
    attachmentKeys: ["attachment-1"],
    businessDocument: true,
    calculatesCost: false,
    createsAccountingEntries: false,
    crewAssignmentKey: crew.crewAssignmentKey,
    documentType: MANUFACTURING_V2_DOCUMENT_CONTRACTS.productionReport.documentType,
    downtimeMinutes: 15,
    lifecycle: ["draft", "submitted", "approved", "posted", "closed"],
    manufacturingOrderKey: order.orderKey,
    mutatesInventoryQuantities: false,
    operationKey: operation.operationKey,
    producedQuantity: 290,
    productRef: order.productRef,
    qualityRuntimeImplemented: false,
    reportKey: "pr-1",
    reworkQuantity: 4,
    scrapQuantity: 6,
    shiftRef: "shift-1",
    status: "draft",
    usesDocumentEngine: true,
  });
  const downtime = defineManufacturingDowntimeReport({ ...scope, downtimeMinutes: 15, downtimeReportKey: "dt-1", operationKey: operation.operationKey, productionReportKey: productionReport.reportKey, status: "draft" });
  const scrap = defineManufacturingScrapReport({ ...scope, inventoryDispositionDocumentOwner: "inventory", mutatesInventoryQuantities: false, operationKey: operation.operationKey, productRef: order.productRef, productionReportKey: productionReport.reportKey, scrapQuantity: 6, scrapReportKey: "scrap-1", status: "draft" });
  const rework = defineManufacturingReworkReport({ ...scope, operationKey: operation.operationKey, productRef: order.productRef, productionReportKey: productionReport.reportKey, qualityDecisionOwner: "quality", qualityRuntimeImplemented: false, reworkQuantity: 4, reworkReportKey: "rework-1", status: "draft" });
  const runtime = defineManufacturingMachineRuntimeFact({ ...scope, costCalculationImplemented: false, endedAt: "2026-07-01T16:00:00.000Z", factKey: "runtime-1", factOwner: "manufacturing", machineMasterReadinessOnly: true, machineRef: "machine-1", operationKey: operation.operationKey, runtimeMinutes: 480, startedAt: "2026-07-01T08:00:00.000Z" });

  assert.equal(operation.perWorkerTargetCanonical, false);
  assert.equal(order.inventoryMutationImplemented, false);
  assert.equal(order.costCalculationImplemented, false);
  assert.equal(order.accountingPostingImplemented, false);
  assert.equal(workOrder.warehouseMasterOwner, "warehouse-master");
  assert.equal(operationPlan.perWorkerTargetCanonical, false);
  assert.equal(crew.employeeMasterOwner, "hr");
  assert.deepEqual(crew.hrAssignmentRefs, ["hr-assignment-1"]);
  assert.equal(productionReport.usesDocumentEngine, true);
  assert.equal(productionReport.businessDocument, true);
  assert.equal(downtime.downtimeMinutes, 15);
  assert.equal(scrap.inventoryDispositionDocumentOwner, "inventory");
  assert.equal(rework.qualityDecisionOwner, "quality");
  assert.equal(runtime.costCalculationImplemented, false);
});

test("manufacturing v2 boundary rules keep external engine and master-data ownership outside Manufacturing", () => {
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.mutatesInventoryQuantities, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.inventoryQuantityOwner, "inventory");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.calculatesCost, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.costCalculationOwner, "cost-engine");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.createsAccountingEntries, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.accountingEntryOwner, "finance");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.ownsEmployeeMasterData, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.employeeMasterOwner, "hr");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.ownsProductMaster, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.productMasterOwner, "product-master");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.ownsWarehouseMaster, false);
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.warehouseMasterOwner, "warehouse-master");
  assert.equal(MANUFACTURING_V2_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
});

test("production report is a Document Engine business document with v2 lifecycle and permissions", () => {
  assert.equal(String(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION.documentType), "manufacturing.production-report");
  assert.equal(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION.moduleKey, "manufacturing");
  assert.equal(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION.lifecycle.initialState, "draft");
  assert.deepEqual(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION.lifecycle.transitions.map((transition) => `${transition.from}:${transition.command}:${transition.to}`), [
    "draft:submit:submitted",
    "submitted:approve:approved",
    "approved:post:posted",
    "posted:complete:closed",
    "draft:cancel:cancelled",
  ]);
  assert.equal(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION.lifecycle.transitions.some((transition) => transition.requiredPermission === MANUFACTURING_PERMISSIONS.reportsPost), true);
  assert.equal(MANUFACTURING_V2_DOCUMENT_DEFINITIONS.includes(MANUFACTURING_PRODUCTION_REPORT_DOCUMENT_DEFINITION), true);
});

test("manufacturing v2 event contracts are readiness-only and include requested production events", () => {
  const events = MANUFACTURING_V2_EVENT_CONTRACTS.map((event) => String(event.name));

  for (const eventName of [
    "ManufacturingCrewAssigned",
    "ManufacturingProductionReportPosted",
    "ManufacturingQualityInspectionRequested",
    "ManufacturingDowntimeReported",
    "ManufacturingScrapReported",
    "ManufacturingReworkReported",
    "ManufacturingMachineRuntimeRecorded",
  ]) {
    assert.equal(events.includes(eventName), true, `${eventName} should be defined`);
  }

  assert.equal(MANUFACTURING_V2_EVENT_CONTRACTS.every((event) => event.handlerImplemented === false), true);
  assert.equal(MANUFACTURING_EVENT_DEFINITIONS.some((event) => String(event.name) === "ManufacturingProductionReportPosted"), true);
});

test("factory structure contracts model branch-scoped hierarchy without warehouse or location ownership", () => {
  const factory = defineManufacturingFactoryScope({
    ...scope,
    factoryIdentityOwner: "platform-branch",
    factoryRef: "branch-1",
    ownsInventoryLocations: false,
    ownsWarehouseMaster: false,
  });
  const line = defineManufacturingProductionLine({
    ...scope,
    code: "line-a",
    factoryIdentityOwner: "platform-branch",
    inventoryLocationReferenceAllowed: false,
    lineKey: "line-a",
    name: "Line A",
    status: "maintenance",
    warehouseReferenceAllowed: false,
    workCenterKey: "wc-cutting",
  });
  const workCenter = defineManufacturingWorkCenter({
    ...scope,
    code: "wc-cutting",
    costCenterReferenceOnly: true,
    inventoryLocationReferenceAllowed: false,
    name: "Cutting",
    status: "suspended",
    warehouseReferenceAllowed: false,
    workCenterKey: "wc-cutting",
  });
  const workstation = defineManufacturingWorkstation({
    ...scope,
    code: "ws-cut-1",
    inventoryLocationReferenceAllowed: false,
    lineKey: line.lineKey,
    name: "Cutting Table 1",
    status: "unavailable",
    warehouseReferenceAllowed: false,
    workCenterKey: workCenter.workCenterKey,
    workstationKey: "ws-cut-1",
  });
  const machine = defineManufacturingMachine({
    ...scope,
    capabilities: {
      capabilityKeys: ["cutting"],
      costCalculationImplemented: false,
      downtimeFactContractReady: true,
      machineHourFactReady: true,
      ratedUnitsPerHour: 120,
      supportedOperationKeys: ["op-cut"],
    },
    code: "mch-cutter-1",
    machineKey: "mch-cutter-1",
    name: "Cutter 1",
    operationalStatus: {
      maintenanceAppImplemented: false,
      maintenanceReadinessOnly: true,
      productionExecutionRuntimeImplemented: false,
      status: "breakdown",
    },
    ownsInventoryLocations: false,
    ownsMachineExecutionMetadata: true,
    ownsWarehouseMaster: false,
    status: "breakdown",
    workCenterKey: workCenter.workCenterKey,
    workstationKey: workstation.workstationKey,
  });

  assert.equal(factory.factoryIdentityOwner, "platform-branch");
  assert.equal(line.warehouseReferenceAllowed, false);
  assert.equal(workCenter.inventoryLocationReferenceAllowed, false);
  assert.equal(workstation.workCenterKey, workCenter.workCenterKey);
  assert.equal(machine.capabilities.downtimeFactContractReady, true);
  assert.equal(machine.capabilities.costCalculationImplemented, false);
  assert.equal(machine.operationalStatus.maintenanceAppImplemented, false);
  assert.equal(machine.operationalStatus.productionExecutionRuntimeImplemented, false);
});

test("factory hierarchy readiness declares statuses, boundaries, search, reports, and dashboard support", () => {
  assert.deepEqual(MANUFACTURING_FACTORY_HIERARCHY_CONTRACT.hierarchy, [
    "platform.branch",
    "manufacturing.production-line",
    "manufacturing.work-center",
    "manufacturing.workstation",
    "manufacturing.machine",
  ]);
  assert.equal(MANUFACTURING_FACTORY_HIERARCHY_CONTRACT.warehouseOwner, "inventory");
  assert.equal(MANUFACTURING_FACTORY_HIERARCHY_CONTRACT.inventoryLocationOwner, "inventory");
  assert.equal(MANUFACTURING_FACTORY_HIERARCHY_CONTRACT.productionExecutionRuntimeImplemented, false);
  assert.deepEqual(MANUFACTURING_STRUCTURE_STATUSES.productionLine, ["active", "inactive", "maintenance", "suspended", "archived"]);
  assert.deepEqual(MANUFACTURING_STRUCTURE_STATUSES.workCenter, ["active", "inactive", "suspended", "archived"]);
  assert.deepEqual(MANUFACTURING_STRUCTURE_STATUSES.workstation, ["active", "inactive", "unavailable", "archived"]);
  assert.deepEqual(MANUFACTURING_STRUCTURE_STATUSES.machine, ["available", "running", "idle", "maintenance", "breakdown", "unavailable", "archived"]);
  assert.equal(MANUFACTURING_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("manufacturing_machine"), true);
  assert.equal((MANUFACTURING_SEARCH_PROVIDER_CONTRACT.searchableEntities ?? []).some((entity) => entity.entityType === "manufacturing_machine"), true);
  assert.equal(MANUFACTURING_REPORT_READINESS_CONTRACT.key, "manufacturing.foundation.readiness");
  assert.equal(MANUFACTURING_FOUNDATION_CONTRACTS.dashboardTemplate.key, "manufacturing.foundation.dashboard-template");
  assert.equal(MANUFACTURING_FOUNDATION_CONTRACTS.factoryHierarchy.key, "manufacturing.factory-structure.v2");
});

test("factory structure server APIs expose focused services with permission metadata", () => {
  const serviceFactory = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/service-factory.ts"), "utf8");
  const publicApi = fs.readFileSync(path.join(root, "src/features/manufacturing/public-api.ts"), "utf8");
  const pageConfig = fs.readFileSync(path.join(root, "src/features/manufacturing/presentation/view-models/page-config.ts"), "utf8");
  const repository = fs.readFileSync(path.join(root, "src/features/manufacturing/infrastructure/repositories/manufacturing.repository.ts"), "utf8");
  const actions = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/actions/manufacturing.actions.ts"), "utf8");

  for (const serviceName of ["createProductionLineService", "createWorkCenterService", "createWorkstationService", "createMachineService"]) {
    assert.match(serviceFactory, new RegExp(`export async function ${serviceName}`));
    assert.match(publicApi, new RegExp(serviceName));
  }

  for (const permission of ["linesView", "linesManage", "workCentersView", "workCentersManage", "workstationsView", "workstationsManage", "machinesView", "machinesManage"]) {
    assert.match(pageConfig, new RegExp(`MANUFACTURING_PERMISSIONS\\.${permission}`));
  }

  assert.match(repository, /definition\.key === "production-lines".*"line_key"/s);
  assert.match(repository, /definition\.key === "machines".*"machine_key"/s);
  assert.match(actions, /structureStatuses/);
  assert.match(actions, /warehouseId/);
  assert.match(actions, /inventoryLocationId/);
});

test("production planning foundation contracts connect plans, lines, and manufacturing orders without runtime ownership", () => {
  const plan = defineManufacturingProductionPlanFoundation({
    ...scope,
    approvalReadinessOnly: true,
    documentNumber: "PLAN-0001",
    documentType: MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION.documentType,
    planNumber: "PLAN-0001",
    planningPeriod: "2026-W27",
    planningSource: "manual",
    productionExecutionRuntimeImplemented: false,
    schedulingEngineImplemented: false,
    status: "draft",
    usesDocumentEngine: true,
    workflowReadinessOnly: true,
  });
  const line = defineManufacturingProductionPlanLineFoundation({
    ...scope,
    bomReferenceOnly: true,
    bomVersionId: "bom-version-1",
    inventoryMutationImplemented: false,
    materialReservationImplemented: false,
    planId: "plan-1",
    plannedEndAt: "2026-07-01T16:00:00.000Z",
    plannedQuantity: 500,
    plannedStartAt: "2026-07-01T08:00:00.000Z",
    priority: 10,
    productId: "product-1",
    productMasterOwner: "product-master",
    productionLineId: "line-1",
    productionLineOwner: "manufacturing",
    routingReferenceOnly: true,
    routingVersionId: "routing-version-1",
    shiftId: "shift-1",
    shiftOwner: "hr-workforce",
    status: "draft",
    uomId: "uom-1",
    uomOwner: "uom",
  });
  const order = defineManufacturingOrderFoundation({
    ...scope,
    bomReferenceOnly: true,
    bomVersionId: line.bomVersionId,
    costCalculationImplemented: false,
    documentMetadata: { documentEngineReady: true },
    documentNumber: "MO-0001",
    documentType: MANUFACTURING_ORDER_DOCUMENT_DEFINITION.documentType,
    inventoryMutationImplemented: false,
    materialReservationImplemented: false,
    orderNumber: "MO-0001",
    payrollLogicImplemented: false,
    planId: line.planId,
    planLineId: "plan-line-1",
    plannedEndAt: line.plannedEndAt,
    plannedQuantity: line.plannedQuantity,
    plannedStartAt: line.plannedStartAt,
    productId: line.productId,
    productMasterOwner: "product-master",
    productionLineId: line.productionLineId,
    productionLineOwner: "manufacturing",
    qualityExecutionImplemented: false,
    releaseReadinessMetadata: {
      documentReady: true,
      inventoryPostingImplemented: false,
      materialIssueRuntimeImplemented: false,
      operationPlanningReady: true,
      productionExecutionRuntimeImplemented: false,
    },
    routingReferenceOnly: true,
    routingVersionId: line.routingVersionId,
    status: "draft",
    uomId: line.uomId,
    uomOwner: "uom",
  });

  assert.equal(plan.usesDocumentEngine, true);
  assert.equal(plan.workflowReadinessOnly, true);
  assert.equal(line.productMasterOwner, "product-master");
  assert.equal(line.uomOwner, "uom");
  assert.equal(line.shiftOwner, "hr-workforce");
  assert.equal(line.productionLineOwner, "manufacturing");
  assert.equal(line.bomReferenceOnly, true);
  assert.equal(line.routingReferenceOnly, true);
  assert.equal(order.planId, line.planId);
  assert.equal(order.planLineId, "plan-line-1");
  assert.equal(order.releaseReadinessMetadata.operationPlanningReady, true);
  assert.equal(order.releaseReadinessMetadata.materialIssueRuntimeImplemented, false);
  assert.equal(order.inventoryMutationImplemented, false);
  assert.equal(order.costCalculationImplemented, false);
  assert.equal(order.qualityExecutionImplemented, false);
  assert.equal(order.payrollLogicImplemented, false);
});

test("planning lifecycle validation helpers are contract-only and match required statuses", () => {
  assert.deepEqual(MANUFACTURING_PLANNING_LIFECYCLE_CONTRACT.productionPlan.statuses, ["draft", "approved", "released", "closed", "cancelled"]);
  assert.deepEqual(MANUFACTURING_PLANNING_LIFECYCLE_CONTRACT.manufacturingOrder.statuses, ["draft", "released", "in_progress", "completed", "closed", "cancelled"]);
  assert.equal(MANUFACTURING_PLANNING_LIFECYCLE_CONTRACT.runtimeTransitionsImplemented, false);
  assert.equal(canTransitionProductionPlan("draft", "approved"), true);
  assert.equal(canTransitionProductionPlan("released", "closed"), true);
  assert.equal(canTransitionProductionPlan("closed", "released"), false);
  assert.equal(canTransitionManufacturingOrder("draft", "released"), true);
  assert.equal(canTransitionManufacturingOrder("released", "in_progress"), true);
  assert.equal(canTransitionManufacturingOrder("closed", "in_progress"), false);
});

test("production plan and manufacturing order are Document Engine-ready business documents", () => {
  assert.equal(String(MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION.documentType), "manufacturing.production-plan");
  assert.equal(MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION.lifecycle.initialState, "draft");
  assert.equal(MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION.lifecycle.transitions.some((transition) => transition.from === "draft" && transition.to === "approved"), true);
  assert.equal(MANUFACTURING_PRODUCTION_PLAN_DOCUMENT_DEFINITION.lifecycle.transitions.some((transition) => transition.to === "posted"), true);

  assert.equal(String(MANUFACTURING_ORDER_DOCUMENT_DEFINITION.documentType), "manufacturing.manufacturing-order");
  assert.equal(MANUFACTURING_ORDER_DOCUMENT_DEFINITION.lifecycle.initialState, "draft");
  assert.equal(MANUFACTURING_ORDER_DOCUMENT_DEFINITION.lifecycle.transitions.some((transition) => transition.command === "post" && transition.requiredPermission === MANUFACTURING_PERMISSIONS.ordersRelease), true);
  assert.equal(MANUFACTURING_ORDER_DOCUMENT_DEFINITION.lifecycle.transitions.some((transition) => transition.command === "close" && transition.requiredPermission === MANUFACTURING_PERMISSIONS.ordersClose), true);
});

test("planning and manufacturing order events are readiness-only", () => {
  const eventNames = MANUFACTURING_V2_EVENT_CONTRACTS.map((event) => String(event.name));

  for (const eventName of [
    "ManufacturingProductionPlanCreated",
    "ManufacturingProductionPlanApproved",
    "ManufacturingProductionPlanReleased",
    "ManufacturingProductionPlanClosed",
    "ManufacturingOrderCreated",
    "ManufacturingOrderReleased",
    "ManufacturingOrderStarted",
    "ManufacturingOrderCompleted",
    "ManufacturingOrderClosed",
    "ManufacturingOrderCancelled",
  ]) {
    assert.equal(eventNames.includes(eventName), true, `${eventName} should be defined`);
  }

  assert.equal(MANUFACTURING_V2_EVENT_CONTRACTS.every((event) => event.handlerImplemented === false), true);
});

test("planning and order server APIs expose focused services and safe validation", () => {
  const serviceFactory = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/service-factory.ts"), "utf8");
  const publicApi = fs.readFileSync(path.join(root, "src/features/manufacturing/public-api.ts"), "utf8");
  const actions = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/actions/manufacturing.actions.ts"), "utf8");

  for (const serviceName of ["createProductionPlanService", "createManufacturingOrderService"]) {
    assert.match(serviceFactory, new RegExp(`export async function ${serviceName}`));
    assert.match(publicApi, new RegExp(serviceName));
  }

  assert.match(actions, /planningStatuses/);
  assert.match(actions, /materialReservationId/);
  assert.match(actions, /materialIssueId/);
  assert.match(actions, /inventoryPostingId/);
  assert.match(actions, /costCalculationId/);
  assert.match(actions, /qualityInspectionResultId/);
  assert.match(actions, /payrollRunId/);
});

test("manufacturing generated codes cover required operational identifiers", () => {
  const expected = {
    "manufacturing-products": ["productKey"],
    "production-lines": ["lineKey"],
    "work-centers": ["workCenterKey"],
    workstations: ["workstationKey"],
    machines: ["machineKey"],
    operations: ["operationKey"],
    "manufacturing-profiles": ["manufacturingCode"],
    boms: ["bomKey", "versionKey"],
    "routing-plans": ["routingKey", "versionKey"],
    "production-plans": ["planKey"],
    "manufacturing-orders": ["orderKey"],
    "work-orders": ["workOrderKey"],
  } as const;

  for (const [resourceKey, fieldNames] of Object.entries(expected)) {
    const definition = MANUFACTURING_RESOURCE_DEFINITIONS[resourceKey as keyof typeof MANUFACTURING_RESOURCE_DEFINITIONS];
    for (const fieldName of fieldNames) {
      const field = definition.formFields.find((candidate) => candidate.name === fieldName);
      assert.ok(field && "autoCode" in field && field.autoCode, `${resourceKey}.${fieldName} should be generated`);
    }
  }
});

test("production plan contracts include planned product, quantity, shift, line, and no scheduler", () => {
  const plan = defineManufacturingProductionPlan({
    ...scope,
    planDate: "2026-06-27",
    planKey: "plan-2026-06-27",
    schedulingEngineImplemented: false,
    status: "draft",
  });
  const line = defineManufacturingProductionPlanLine({
    ...scope,
    lineNumber: 1,
    planKey: plan.planKey,
    plannedEnd: "2026-06-27T16:00:00.000Z",
    plannedLineKey: "line-1",
    plannedProductKey: "product-a",
    plannedQuantity: 3000,
    plannedShiftKey: "shift-a",
    plannedStart: "2026-06-27T08:00:00.000Z",
    schedulingEngineImplemented: false,
  });

  assert.equal(plan.schedulingEngineImplemented, false);
  assert.equal(line.plannedProductKey, "product-a");
  assert.equal(line.plannedQuantity, 3000);
  assert.equal(line.plannedShiftKey, "shift-a");
  assert.equal(line.plannedLineKey, "line-1");
});

test("product, line, and worker target contracts expose achievement facts only", () => {
  const productTarget = defineManufacturingProductTarget({
    ...scope,
    incentiveCalculationImplemented: false,
    period: "daily",
    productKey: "product-a",
    status: "active",
    targetKey: "product-a-daily",
    targetQuantity: 3000,
  });
  const lineTarget = defineManufacturingLineTarget({
    ...scope,
    achievementFactOwner: "manufacturing",
    achievementPercent: 95,
    actualQuantity: 2850,
    incentiveCalculationImplemented: false,
    lineKey: "line-1",
    planKey: "plan-1",
    plannedQuantity: 3000,
    productKey: "product-a",
    status: "active",
    targetKey: "line-1-product-a",
  });
  const workerTarget = defineManufacturingWorkerTarget({
    ...scope,
    achievementFactOwner: "manufacturing",
    achievementPercent: 108,
    actualQuantity: 380,
    lineKey: "line-1",
    payrollCalculationImplemented: false,
    planKey: "plan-1",
    status: "active",
    targetKey: "ahmed-line-1",
    targetQuantity: 350,
    workerKey: "worker-ahmed",
  });

  assert.equal(productTarget.incentiveCalculationImplemented, false);
  assert.equal(lineTarget.achievementFactOwner, "manufacturing");
  assert.equal(lineTarget.incentiveCalculationImplemented, false);
  assert.equal(workerTarget.payrollCalculationImplemented, false);
  assert.equal(workerTarget.achievementPercent, 108);
});

test("daily production report contract is the source for KPI, inventory, cost, quality, and dashboard facts", () => {
  const report = defineManufacturingDailyProductionReport({
    ...scope,
    actualQuantity: 2850,
    attachmentKeys: ["attachment-1"],
    downtimeMinutes: 30,
    plannedQuantity: 3000,
    productKey: "product-a",
    productionLineKey: "line-1",
    reportDate: "2026-06-27",
    reportKey: "dpr-1",
    reworkQuantity: 20,
    scrapQuantity: 15,
    shiftKey: "shift-a",
    sourceFor: ["worker_kpis", "line_kpis", "product_kpis", "inventory_movements", "cost_facts", "quality_facts", "dashboard_facts"],
    supervisorKey: "supervisor-1",
    workerKeys: ["worker-ahmed"],
    workerOutput: [{ actualQuantity: 380, targetQuantity: 350, workerKey: "worker-ahmed" }],
  });

  assert.equal(report.reportDate, "2026-06-27");
  assert.equal(report.workerOutput[0]?.actualQuantity, 380);
  assert.equal(report.sourceFor.includes("inventory_movements"), true);
  assert.equal(report.sourceFor.includes("cost_facts"), true);
  assert.equal(report.sourceFor.includes("quality_facts"), true);
});

test("daily production report UI captures worker output as production fact rows", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/daily-reports/page.tsx"), "utf8");
  const panel = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/daily-reports/daily-report-record-panel.tsx"), "utf8");
  const createRoute = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/daily-reports/new/page.tsx"), "utf8");
  const editRoute = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/daily-reports/[id]/edit/page.tsx"), "utf8");
  const action = fs.readFileSync(path.join(process.cwd(), "src/features/manufacturing/routes/actions/daily-reports.actions.ts"), "utf8");

  assert.match(page, /DailyReportRecordModalLauncher/);
  assert.match(page, /buildHref\(params, \{ create: "1", edit: null \}\)/);
  assert.match(panel, /closeHref/);
  assert.match(createRoute, /\/erp\/manufacturing\/daily-reports\?create=1/);
  assert.match(editRoute, /\/erp\/manufacturing\/daily-reports\?edit=\$\{encodeURIComponent\(id\)\}/);
  assert.match(panel, /Worker Output Grid/);
  assert.match(panel, /workerOutputWorkerRefId/);
  assert.match(panel, /workerOutputTargetQuantity/);
  assert.match(panel, /workerOutputActualQuantity/);
  assert.doesNotMatch(panel, /name="workerOutputJson"/);
  assert.match(action, /workerOutputJson: JSON\.stringify\(workerOutput\)/);
  assert.match(action, /Production facts only|worker_output: input\.workerOutputJson/);
});

test("manufacturing targets use list-first record modals", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/targets/page.tsx"), "utf8");
  const modal = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/targets/target-record-modal.tsx"), "utf8");
  const createRoute = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/targets/new/page.tsx"), "utf8");
  const editRoute = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/targets/[id]/edit/page.tsx"), "utf8");

  assert.match(page, /TargetRecordModalLauncher/);
  assert.match(page, /buildTargetsHref\(params, \{ create: "product", edit: null, editType: null \}\)/);
  assert.match(modal, /RecordFormDialog/);
  assert.match(modal, /createManufacturingTargetAction/);
  assert.match(modal, /updateManufacturingTargetAction/);
  assert.match(createRoute, /\/erp\/manufacturing\/targets\?create=\$\{normalizeType/);
  assert.match(editRoute, /\/erp\/manufacturing\/targets\?editType=\$\{normalizeType/);
  assert.doesNotMatch(page, /ProductTargetForm|LineTargetForm|WorkerTargetForm/);
});

test("manufacturing reports route is Supabase backed and production-facts only", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/reports/page.tsx"), "utf8");
  const loader = fs.readFileSync(path.join(process.cwd(), "src/features/manufacturing/routes/loaders/reports.loader.ts"), "utf8");
  const shell = fs.readFileSync(path.join(process.cwd(), "src/app/(erp)/erp/manufacturing/_components/manufacturing-shell.tsx"), "utf8");

  assert.match(page, /loadManufacturingReports/);
  assert.match(page, /Manufacturing Reports & KPIs/);
  assert.match(loader, /manufacturing_daily_reports/);
  assert.match(loader, /MANUFACTURING_PERMISSIONS\.kpisView/);
  assert.match(shell, /\/erp\/manufacturing\/reports/);
  assert.doesNotMatch(page, /mock|fake|PRODUCT_TARGETS|WORKER_TARGETS|LINE_TARGETS/i);
  assert.doesNotMatch(loader, /payroll|incentive|cost_calculation/i);
});

test("KPI contracts expose facts without payroll or cost calculations", () => {
  const kpis: ManufacturingKpiFactsContract = {
    ...scope,
    costCalculationImplemented: false,
    factsOnly: true,
    line: { achievementPercent: 95, actual: 2850, downtimePercent: 2, efficiencyPercent: 93, planned: 3000, scrapPercent: 0.5 },
    payrollCalculationImplemented: false,
    product: { achievementPercent: 95, actualQuantity: 2850, plannedQuantity: 3000 },
    supervisor: { downtime: 30, lineAchievement: 95, qualityReadiness: true, scrap: 15, workerAchievement: 108 },
    worker: { achievementPercent: 108, actual: 380, attendanceReadiness: true, productivity: 1.08, target: 350 },
  };

  assert.equal(kpis.factsOnly, true);
  assert.equal(kpis.payrollCalculationImplemented, false);
  assert.equal(kpis.costCalculationImplemented, false);
  assert.equal(kpis.worker.attendanceReadiness, true);
});

test("execution document contracts stay readiness-only", () => {
  const contract = createManufacturingDocumentContract("manufacturing_order", MANUFACTURING_PERMISSIONS.executionManage);

  assert.equal(contract.ownsProductionExecution, true);
  assert.equal(contract.inventoryQuantityOwner, "inventory");
  assert.equal(contract.costEngineContractOnly, true);
  assert.equal(contract.financePostingReadinessOnly, true);
  assert.equal(contract.payrollCalculationImplemented, false);
  assert.equal(contract.qualityRuntimeImplemented, false);
  assert.equal(contract.costCalculationImplemented, false);
  assert.deepEqual(Object.keys(MANUFACTURING_DOCUMENT_CONTRACTS).sort(), [
    "byProduct",
    "finishedGoodsReceipt",
    "manufacturingOrder",
    "materialConsumption",
    "operationExecution",
    "rework",
    "scrap",
    "workOrder",
  ]);
});

test("cost, inventory, finance, HR/payroll, and quality integrations are readiness-only", () => {
  const cost = createManufacturingCostIntegrationContract();

  assert.deepEqual(cost.factTypes, ["material_usage", "labor", "machine_hour", "operation", "production"]);
  assert.equal(cost.ownsCostFacts, false);
  assert.equal(cost.ownsCostLayers, false);
  assert.equal(cost.ownsCostSnapshots, false);
  assert.equal(cost.calculatesCost, false);
  assert.equal(MANUFACTURING_COST_DEFINITION_CONTRACT.metadata?.calculatesCost, false);
  assert.equal(MANUFACTURING_COST_INTEGRATION_CONTRACTS.facts.calculatesCost, false);

  assert.equal(MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT.inventoryOwnsStockQuantities, true);
  assert.equal(MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT.manufacturingOwnsExecutionFacts, true);

  for (const readiness of Object.values(MANUFACTURING_FINANCE_INTEGRATION_CONTRACTS)) {
    assert.equal(readiness.journalEntryPostingSupported, false);
    assert.equal(readiness.usesDocumentEngine, true);
    assert.equal(readiness.usesEventBus, true);
  }

  assert.equal(MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT.payrollOwnsIncentives, true);
  assert.equal(MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT.incentiveCalculationImplemented, false);
  assert.equal(MANUFACTURING_QUALITY_READINESS_CONTRACT.qualityRuntimeImplemented, false);
  assert.deepEqual(MANUFACTURING_QUALITY_READINESS_CONTRACT.readinessTypes, ["inspection", "qc_checkpoint", "ncr", "defect", "rework", "quality_result"]);
});

test("platform readiness includes search, report, print, dashboard, import/export, and jobs", () => {
  assert.equal(MANUFACTURING_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("manufacturing_daily_report"), true);
  assert.equal(MANUFACTURING_REPORT_READINESS_CONTRACT.mode, "async");
  assert.equal(MANUFACTURING_DAILY_REPORT_IMPORT_CONTRACT.previewRequired, true);
  assert.deepEqual(MANUFACTURING_EXPORT_CONTRACT.supportedFormats, ["csv", "excel", "json"]);
  assert.equal(MANUFACTURING_FOUNDATION_CONTRACTS.jobReadiness.length, 8);
});

test("manufacturing event definitions are prepared without handlers", () => {
  const eventNames = MANUFACTURING_EVENT_DEFINITIONS.map((event) => String(event.name));

  for (const eventName of [
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
  ]) {
    assert.equal(eventNames.includes(eventName), true, `${eventName} should be defined`);
  }

  assert.equal(MANUFACTURING_EVENT_DEFINITIONS.every((event) => event.source === "business-app"), true);
});

test("manufacturing migration creates requested foundation tables with scope, lifecycle, RLS, and indexes", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const tables = [
    "manufacturing_products",
    "manufacturing_boms",
    "manufacturing_routings",
    "manufacturing_operations",
    "manufacturing_lines",
    "manufacturing_work_centers",
    "manufacturing_workstations",
    "manufacturing_plans",
    "manufacturing_plan_lines",
    "manufacturing_orders",
    "manufacturing_work_orders",
    "manufacturing_daily_reports",
    "manufacturing_worker_targets",
    "manufacturing_line_targets",
    "manufacturing_product_targets",
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`public\\.is_tenant_member\\(tenant_id\\)`));

    const definition = sql.match(new RegExp(`create table if not exists public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0] ?? "";
    assert.match(definition, /tenant_id uuid not null references public\.tenants\(id\)/);
    assert.match(definition, /company_id uuid not null references public\.companies\(id\)/);
    assert.match(definition, /branch_id uuid/);
    assert.match(definition, /created_at timestamptz not null default now\(\)/);
    assert.match(definition, /updated_at timestamptz not null default now\(\)/);
    assert.match(definition, /deleted_at timestamptz/);
    assert.match(definition, /is_active boolean not null default true/);
    assert.match(definition, /version integer not null default 1 check \(version > 0\)/);
  }

  for (const indexName of [
    "manufacturing_products_scope_key_uq",
    "manufacturing_plans_date_idx",
    "manufacturing_daily_reports_date_idx",
    "manufacturing_worker_targets_worker_idx",
  ]) {
    assert.match(sql, new RegExp(`create (unique )?index if not exists ${indexName}`));
  }
});

test("manufacturing factory structure migration aligns codes, statuses, metadata, RLS, and hierarchy scope", () => {
  const sql = fs.readFileSync(factoryStructureMigrationPath, "utf8");

  for (const table of ["manufacturing_lines", "manufacturing_work_centers", "manufacturing_workstations", "manufacturing_machines"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} add column if not exists code text`));
    assert.match(sql, new RegExp(`alter table public\\.${table} alter column code set not null`));
    assert.match(sql, new RegExp(`${table}.*scope_code_uq`));
  }

  assert.match(sql, /manufacturing_lines_status_check check \(status in \('active', 'inactive', 'maintenance', 'suspended', 'archived'\)\)/);
  assert.match(sql, /manufacturing_work_centers_status_check check \(status in \('active', 'inactive', 'suspended', 'archived'\)\)/);
  assert.match(sql, /manufacturing_workstations_status_check check \(status in \('active', 'inactive', 'unavailable', 'archived'\)\)/);
  assert.match(sql, /manufacturing_machines_status_check check \(status in \('available', 'running', 'idle', 'maintenance', 'breakdown', 'unavailable', 'archived'\)\)/);
  assert.match(sql, /capability_metadata jsonb not null default jsonb_build_object/);
  assert.match(sql, /'downtime_fact_contract_ready', true/);
  assert.match(sql, /'cost_calculation_implemented', false/);
  assert.match(sql, /operational_status_metadata jsonb not null default jsonb_build_object/);
  assert.match(sql, /'maintenance_app_implemented', false/);
  assert.match(sql, /'production_execution_runtime_implemented', false/);
  assert.match(sql, /create or replace function public\.enforce_manufacturing_factory_structure_scope\(\)/);
  assert.match(sql, /manufacturing factory structure requires branch scope/);
  assert.match(sql, /manufacturing machine workstation must belong to selected work center/);
});

test("manufacturing factory structure migration keeps warehouses, inventory locations, runtime, cost, quality, and payroll out", () => {
  const sql = fs.readFileSync(factoryStructureMigrationPath, "utf8");

  for (const forbidden of [
    /warehouse_id/i,
    /warehouse_key/i,
    /location_id/i,
    /inventory_location_id/i,
    /references public\.inventory_/i,
    /create table .*downtime/i,
    /create table .*maintenance/i,
    /create table .*quality/i,
    /create table .*payroll/i,
    /create table .*cost/i,
    /post_inventory|inventory_posting_implemented boolean not null default true/i,
    /calculate_cost|cost_calculation_implemented boolean not null default true/i,
    /quality_execution_implemented boolean not null default true/i,
    /payroll_logic_implemented boolean not null default true/i,
  ]) {
    assert.doesNotMatch(sql, forbidden);
  }

  for (const permission of [
    "manufacturing.lines.view",
    "manufacturing.lines.manage",
    "manufacturing.work-centers.view",
    "manufacturing.work-centers.manage",
    "manufacturing.workstations.view",
    "manufacturing.workstations.manage",
    "manufacturing.machines.view",
    "manufacturing.machines.manage",
  ]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
    assert.match(sql, new RegExp(`public\\.has_permission\\('${permission.replaceAll(".", "\\.")}', tenant_id\\)`));
  }
});

test("manufacturing planning order migration adds required planning and order fields", () => {
  const sql = fs.readFileSync(planningOrderMigrationPath, "utf8");

  for (const column of ["plan_number", "document_number", "planning_period", "planning_source", "notes", "workflow_readiness_metadata", "approval_readiness_metadata"]) {
    assert.match(sql, new RegExp(`alter table public\\.manufacturing_plans add column if not exists ${column}`));
  }

  for (const column of [
    "product_id",
    "product_variant_id",
    "uom_id",
    "production_line_id",
    "shift_id",
    "planned_start_at",
    "planned_end_at",
    "priority",
    "status",
    "bom_version_id",
    "routing_version_id",
    "planning_metadata",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.manufacturing_plan_lines add column if not exists ${column}`));
  }

  for (const column of [
    "plan_id",
    "product_id",
    "product_variant_id",
    "uom_id",
    "production_line_id",
    "bom_version_id",
    "routing_version_id",
    "order_number",
    "document_number",
    "document_metadata",
    "release_readiness_metadata",
    "planned_start_at",
    "planned_end_at",
    "released_at",
    "completed_at",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.manufacturing_orders add column if not exists ${column}`));
  }

  assert.match(sql, /manufacturing_plans_status_check check \(status in \('draft', 'approved', 'released', 'closed', 'cancelled'\)\)/);
  assert.match(sql, /manufacturing_plan_lines_status_check check \(status in \('draft', 'approved', 'released', 'closed', 'cancelled'\)\)/);
  assert.match(sql, /manufacturing_orders_status_check check \(status in \('draft', 'released', 'in_progress', 'completed', 'closed', 'cancelled'\)\)/);
  assert.match(sql, /document_type text not null default 'manufacturing\.production-plan'/);
  assert.match(sql, /document_type text not null default 'manufacturing\.manufacturing-order'/);
});

test("manufacturing planning order migration enforces references, readiness, RLS, and events", () => {
  const sql = fs.readFileSync(planningOrderMigrationPath, "utf8");

  assert.match(sql, /workflow_runtime_implemented', false/);
  assert.match(sql, /approval_runtime_implemented', false/);
  assert.match(sql, /'product_master_owner', 'product-master'/);
  assert.match(sql, /'uom_owner', 'uom'/);
  assert.match(sql, /'shift_owner', 'hr-workforce'/);
  assert.match(sql, /'bom_reference_only', true/);
  assert.match(sql, /'routing_reference_only', true/);
  assert.match(sql, /'material_reservation_implemented', false/);
  assert.match(sql, /'inventory_mutation_implemented', false/);
  assert.match(sql, /'operation_planning_ready', true/);
  assert.match(sql, /'material_issue_runtime_implemented', false/);
  assert.match(sql, /'inventory_posting_implemented', false/);
  assert.match(sql, /'production_execution_runtime_implemented', false/);
  assert.match(sql, /create or replace function public\.enforce_manufacturing_planning_foundation_scope\(\)/);
  assert.match(sql, /manufacturing plan line must reference a manufacturing production line in the same tenant, company, and branch/);
  assert.match(sql, /manufacturing order plan line must belong to selected production plan/);

  for (const permission of ["manufacturing.planning.view", "manufacturing.planning.manage", "manufacturing.orders.view", "manufacturing.orders.manage", "manufacturing.orders.release", "manufacturing.orders.close"]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
  }

  for (const eventName of [
    "ManufacturingProductionPlanCreated",
    "ManufacturingProductionPlanApproved",
    "ManufacturingProductionPlanReleased",
    "ManufacturingProductionPlanClosed",
    "ManufacturingOrderCreated",
    "ManufacturingOrderReleased",
    "ManufacturingOrderStarted",
    "ManufacturingOrderCompleted",
    "ManufacturingOrderClosed",
    "ManufacturingOrderCancelled",
  ]) {
    assert.match(sql, new RegExp(eventName));
  }
});

test("manufacturing planning order migration does not add execution, material, inventory, cost, quality, or payroll runtime", () => {
  const sql = fs.readFileSync(planningOrderMigrationPath, "utf8");

  for (const forbidden of [
    /create table .*execution/i,
    /create table .*material_issue/i,
    /create table .*reservation/i,
    /create table .*inventory_post/i,
    /create table .*cost/i,
    /create table .*quality/i,
    /create table .*payroll/i,
    /references public\.inventory_(?!products)/i,
    /material_issue_runtime_implemented boolean not null default true/i,
    /inventory_posting_implemented boolean not null default true/i,
    /cost_calculation_implemented boolean not null default true/i,
    /quality_execution_implemented boolean not null default true/i,
    /payroll_logic_implemented boolean not null default true/i,
  ]) {
    assert.doesNotMatch(sql, forbidden);
  }

  assert.match(sql, /material_issue_runtime_implemented boolean not null default false check \(material_issue_runtime_implemented = false\)/);
  assert.match(sql, /inventory_posting_implemented boolean not null default false check \(inventory_posting_implemented = false\)/);
  assert.match(sql, /cost_calculation_implemented boolean not null default false check \(cost_calculation_implemented = false\)/);
  assert.match(sql, /quality_execution_implemented boolean not null default false check \(quality_execution_implemented = false\)/);
  assert.match(sql, /payroll_logic_implemented boolean not null default false check \(payroll_logic_implemented = false\)/);
});

test("manufacturing migration encodes planning, report, target, security, and company/branch rules", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.enforce_manufacturing_business_foundation_scope\(\)/);
  assert.match(sql, /manufacturing plan line must match plan tenant, company, and branch scope/);
  assert.match(sql, /manufacturing execution and achievement facts require branch scope/);
  assert.match(sql, /scheduling_engine_implemented boolean not null default false check \(scheduling_engine_implemented = false\)/);
  assert.match(sql, /source_for jsonb not null default jsonb_build_array\('worker_kpis', 'line_kpis', 'product_kpis', 'inventory_movements', 'cost_facts', 'quality_facts', 'dashboard_facts'\)/);
  assert.match(sql, /achievement_percent numeric\(9, 4\) generated always as/);

  for (const permission of [
    "manufacturing.planning.view",
    "manufacturing.execution.manage",
    "manufacturing.daily-reports.view",
    "manufacturing.targets.manage",
    "manufacturing.kpis.view",
    "manufacturing.cost-integration.view",
    "manufacturing.inventory-integration.view",
    "manufacturing.finance-integration.view",
    "manufacturing.hr-payroll-integration.view",
    "manufacturing.quality-readiness.view",
    "manufacturing.import-export.manage",
    "manufacturing.audit.view",
  ]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
  }
});

test("manufacturing foundation has no finance, payroll, valuation, cost calculation, sales, purchasing, or quality runtime leakage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const forbiddenPatterns = [
    /create table public\.finance/i,
    /create table public\.[a-z_]*payroll/i,
    /create table public\.[a-z_]*salary/i,
    /create table public\.[a-z_]*bonus/i,
    /create table public\.[a-z_]*sales/i,
    /create table public\.[a-z_]*purchas/i,
    /create table public\.[a-z_]*(cost_layers|cost_facts|cost_snapshots)/i,
    /create or replace function public\.[a-z_]*(calculate|valuation|post_journal|post_accounting|incentive|salary|bonus|purchase|sales|quality_workflow)/i,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(sql, pattern);
  }

  assert.match(sql, /payroll_calculation_implemented boolean not null default false check \(payroll_calculation_implemented = false\)/);
  assert.match(sql, /cost_calculation_implemented boolean not null default false check \(cost_calculation_implemented = false\)/);
  assert.match(sql, /quality_workflow_implemented boolean not null default false check \(quality_workflow_implemented = false\)/);
});

test("manufacturing operational migration adds normalized BOM lines and routing steps without deleting legacy JSON", () => {
  const sql = fs.readFileSync(operationalMigrationPath, "utf8");

  for (const table of ["manufacturing_bom_lines", "manufacturing_routing_steps"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`${table}.*public\\.is_tenant_member\\(tenant_id\\)`, "s"));
  }

  assert.match(sql, /component_product_id uuid not null references public\.manufacturing_products\(id\)/);
  assert.match(sql, /quantity numeric\(18, 6\) not null check \(quantity > 0\)/);
  assert.match(sql, /scrap_percent numeric\(9, 4\) not null default 0/);
  assert.match(sql, /step_sequence integer not null check \(step_sequence > 0\)/);
  assert.match(sql, /work_center_id uuid not null references public\.manufacturing_work_centers\(id\)/);
  assert.match(sql, /manufacturing_boms\.components JSON remains/);
  assert.match(sql, /manufacturing_routings\.operations JSON remains/);
  assert.doesNotMatch(sql, /drop table public\.manufacturing_boms|drop table public\.manufacturing_routings/i);
});

test("manufacturing production forms use EntityLookup instead of datalist or raw ID fields", () => {
  const manufacturingPages = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/_components/manufacturing-pages.tsx"), "utf8");
  const dailyReportsPage = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/daily-reports/page.tsx"), "utf8");
  const targetsPage = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/targets/page.tsx"), "utf8");
  const targetsModal = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/targets/target-record-modal.tsx"), "utf8");
  const entityLookup = fs.readFileSync(path.join(root, "src/shared/ui/primitives/entity-lookup.tsx"), "utf8");

  for (const page of [manufacturingPages, dailyReportsPage, targetsPage, targetsModal]) {
    assert.doesNotMatch(page, /<datalist|list=\{/);
  }

  for (const page of [manufacturingPages, dailyReportsPage, targetsModal]) {
    assert.match(page, /EntityLookup/);
  }

  assert.match(entityLookup, /Command\.Input/);
  assert.match(entityLookup, /emptyMessage/);
  assert.match(entityLookup, /loading/);
  assert.match(entityLookup, /recentOptionIds/);
  assert.match(entityLookup, /type="hidden"/);
});

test("manufacturing operational UI exposes BOM lines, routing steps, plan line actuals, and lifecycle transitions", () => {
  const page = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/_components/manufacturing-pages.tsx"), "utf8");
  const actions = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/actions/operational.actions.ts"), "utf8");
  const loader = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/loaders/operational.loader.ts"), "utf8");
  const navigation = fs.readFileSync(path.join(root, "src/shared/workspace/erp-navigation.ts"), "utf8");

  assert.match(page, /BOM Lines/);
  assert.match(page, /Routing Steps/);
  assert.match(page, /Production Plan Lines/);
  assert.match(page, /Lifecycle/);
  assert.match(page, /Canonical operational model/);
  assert.match(page, /manufacturing_bom_lines/);
  assert.match(page, /manufacturing_routing_steps/);
  assert.match(actions, /Invalid lifecycle transition/);
  assert.match(actions, /manufacturingOrderTransitions/);
  assert.match(actions, /workOrderTransitions/);
  assert.match(loader, /manufacturing_daily_reports/);
  assert.match(loader, /achievementPercent/);
  assert.match(navigation, /ready\("manufacturing\.production-plans"/);
  assert.match(navigation, /ready\("manufacturing\.orders"/);
  assert.match(navigation, /\/erp\/manufacturing\/reports/);
});

test("manufacturing validation blocks invalid activation and inconsistent DPR worker output", () => {
  const foundationActions = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/actions/manufacturing.actions.ts"), "utf8");
  const dprActions = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/actions/daily-reports.actions.ts"), "utf8");
  const operationalSchema = fs.readFileSync(path.join(root, "src/features/manufacturing/application/schemas/operational.schema.ts"), "utf8");

  assert.match(foundationActions, /BOM needs at least one line before activation/);
  assert.match(foundationActions, /Routing needs at least one step before activation/);
  assert.match(foundationActions, /planned quantity must be greater than zero/i);
  assert.match(dprActions, /Worker output total must match the DPR actual quantity/);
  assert.match(operationalSchema, /plannedEnd.*plannedStart/s);
  assert.match(operationalSchema, /Estimated time must cover setup plus run time/);
});

test("manufacturing reports are bound to DPR, targets, plan lines, and worker facts", () => {
  const page = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/reports/page.tsx"), "utf8");
  const loader = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/loaders/reports.loader.ts"), "utf8");

  for (const title of ["Daily Production Summary", "Line Achievement", "Worker Achievement", "Product Achievement", "Scrap / Rework Summary", "Downtime Summary", "Plan vs Actual"]) {
    assert.match(page, new RegExp(title.replaceAll("/", "\\/")));
  }

  assert.match(loader, /manufacturing_daily_reports/);
  assert.match(loader, /manufacturing_plan_lines/);
  assert.match(loader, /manufacturing_profiles/);
  assert.match(loader, /worker_output/);
  assert.doesNotMatch(loader, /mock|fake|PRODUCT_TARGETS|WORKER_TARGETS|LINE_TARGETS/i);
});

test("demo seed is explicit, development-only, tenant scoped, and covers operational master data", () => {
  const script = fs.readFileSync(path.join(root, "scripts/seed-demo-data.mjs"), "utf8");
  const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf8");

  assert.match(packageJson, /"seed:demo": "node scripts\/seed-demo-data\.mjs"/);
  assert.match(script, /NEXORA_DEMO_SEED !== "confirm"/);
  assert.match(script, /NODE_ENV === "production"/);
  assert.match(script, /DEMO_TENANT_ID/);
  assert.match(script, /DEMO_COMPANY_ID/);
  assert.match(script, /DEMO_BRANCH_ID/);
  for (const table of ["inventory_products", "inventory_warehouses", "inventory_locations", "manufacturing_bom_lines", "manufacturing_routing_steps", "manufacturing_orders", "manufacturing_work_orders"]) {
    assert.match(script, new RegExp(table));
  }
});

test("legacy foundation reconciliation document identifies canonical and legacy manufacturing surfaces", () => {
  const doc = fs.readFileSync(path.join(root, "docs/02-business-apps/MANUFACTURING_LEGACY_RECONCILIATION.md"), "utf8");

  assert.match(doc, /Canonical Foundation \/ Operational Tables/);
  assert.match(doc, /manufacturing_bom_lines/);
  assert.match(doc, /manufacturing_routing_steps/);
  assert.match(doc, /manufacturing_boms\.components/);
  assert.match(doc, /manufacturing_routings\.operations/);
  assert.match(doc, /No destructive cleanup/);
});
