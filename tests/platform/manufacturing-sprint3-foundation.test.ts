import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineManufacturingBomLineFoundation,
  defineManufacturingCrewAssignmentFoundation,
  defineManufacturingCrewAssignmentMemberFoundation,
  defineManufacturingOperationPlanFoundation,
  defineManufacturingProductionReportFoundation,
  defineManufacturingRoutingStepFoundation,
  formatManufacturingRelationLabel,
  MANUFACTURING_CREW_ROLES,
  MANUFACTURING_OPERATION_PLAN_STATUSES,
  MANUFACTURING_RELATION_LABEL_CONTRACTS,
  MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS,
  MANUFACTURING_SPRINT3_DASHBOARD_METRICS,
  MANUFACTURING_SPRINT3_EVENT_NAMES,
  MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS,
  MANUFACTURING_SPRINT3_PRINT_READINESS,
  MANUFACTURING_SPRINT3_REPORT_READINESS,
  MANUFACTURING_SPRINT3_SEARCH_ENTITIES,
  MANUFACTURING_WORKSPACE_QUICK_ACTIONS,
  MANUFACTURING_V2_EVENT_CONTRACTS,
  MANUFACTURING_SEARCH_PROVIDER_CONTRACT,
} from "@/features/manufacturing/public-api";

const root = process.cwd();
const sprint3MigrationPath = path.join(
  root,
  "supabase/migrations/20260701160000_manufacturing_sprint3_operation_bom_routing_crew_production_report.sql",
);
const scope = { branchId: "branch-1", companyId: "company-1", tenantId: "tenant-1" };

test("manufacturing sprint 3 operation planning contracts exist with required guardrails", () => {
  const operationPlan = defineManufacturingOperationPlanFoundation({
    ...scope,
    manufacturingOrderId: "mo-1",
    operationCode: "op-asm",
    operationName: "Assembly",
    plannedQuantity: 100,
    plannedLaborHours: 8,
    plannedMachineMinutes: 480,
    routingReferenceOnly: true,
    inventoryMutationImplemented: false,
    materialIssueImplemented: false,
    costCalculationImplemented: false,
    qualityExecutionImplemented: false,
    payrollLogicImplemented: false,
    productionExecutionRuntimeImplemented: false,
    perWorkerTargetCanonical: false,
    routingStepId: "routing-step-1",
    runMinutes: 420,
    sequence: 10,
    setupMinutes: 60,
    status: "planned",
    uomId: "uom-1",
    workCenterId: "wc-1",
  });

  assert.deepEqual(MANUFACTURING_OPERATION_PLAN_STATUSES, [
    "draft",
    "planned",
    "ready",
    "blocked",
    "in_progress",
    "completed",
    "cancelled",
  ]);
  assert.equal(operationPlan.routingReferenceOnly, true);
  assert.equal(operationPlan.perWorkerTargetCanonical, false);
  assert.equal(operationPlan.productionExecutionRuntimeImplemented, false);
});

test("manufacturing sprint 3 BOM lines are normalized and legacy JSON remains external", () => {
  const bomLine = defineManufacturingBomLineFoundation({
    bomId: "bom-1",
    componentProductId: "product-1",
    componentsJsonLegacyOnly: true,
    materialIntentOnly: true,
    productMasterOwner: "product-master",
    quantity: 2,
    scrapPercent: 1.5,
    sequence: 10,
    uomId: "uom-1",
    uomOwner: "uom",
  });

  assert.equal(bomLine.componentsJsonLegacyOnly, true);
  assert.equal(bomLine.materialIntentOnly, true);
  assert.equal(bomLine.productMasterOwner, "product-master");
});

test("manufacturing sprint 3 routing steps are normalized without per-worker canonical targets", () => {
  const routingStep = defineManufacturingRoutingStepFoundation({
    defaultMachineId: "machine-1",
    noScheduler: true,
    operationCode: "op-cut",
    operationName: "Cutting",
    operationsJsonLegacyOnly: true,
    perWorkerTargetCanonical: false,
    routingId: "routing-1",
    runMinutes: 30,
    sequence: 10,
    setupMinutes: 15,
    standardCrewSize: 4,
    standardLaborHours: 1,
    standardMachineMinutes: 45,
    standardOutputQuantity: 200,
    workCenterId: "wc-1",
  });

  assert.equal(routingStep.operationsJsonLegacyOnly, true);
  assert.equal(routingStep.perWorkerTargetCanonical, false);
  assert.equal(routingStep.noScheduler, true);
});

test("manufacturing sprint 3 crew assignment references HR workers and supports multiple members", () => {
  const crew = defineManufacturingCrewAssignmentFoundation({
    ...scope,
    effectiveFrom: "2026-07-01T08:00:00.000Z",
    employeeMasterOwner: "hr",
    hrAssignmentOwner: "hr",
    manufacturingOrderId: "mo-1",
    operationId: "op-plan-1",
    operationLevelAssignment: true,
    ownsEmployeeMasterData: false,
    payrollLogicImplemented: false,
    productionExecutionRuntimeImplemented: false,
    status: "active",
    supportsMultipleMembers: true,
  });
  const member = defineManufacturingCrewAssignmentMemberFoundation({
    crewAssignmentId: "crew-1",
    crewRole: "operator",
    effectiveFrom: "2026-07-01T08:00:00.000Z",
    employeeId: "employee-1",
    employeeMasterOwner: "hr",
    hrAssignmentId: "hr-assignment-1",
    isActing: false,
    isTemporary: false,
  });

  assert.equal(crew.employeeMasterOwner, "hr");
  assert.equal(crew.supportsMultipleMembers, true);
  assert.equal(crew.operationLevelAssignment, true);
  assert.equal(member.hrAssignmentId, "hr-assignment-1");
  assert.equal(MANUFACTURING_CREW_ROLES.includes("lead_operator"), true);
});

test("manufacturing sprint 3 production report is a Document Engine business document without inventory mutation", () => {
  const report = defineManufacturingProductionReportFoundation({
    ...scope,
    businessDocument: true,
    calculatesCost: false,
    createsAccountingEntries: false,
    crewAssignmentId: "crew-1",
    documentNumber: "PR-0001",
    documentType: MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS.productionReportDocument.documentType,
    manufacturingOrderId: "mo-1",
    mutatesInventoryQuantities: false,
    operationId: "op-plan-1",
    payrollLogicImplemented: false,
    producedQuantity: 95,
    productId: "product-1",
    productionFactsOnly: true,
    productionLineId: "line-1",
    qualityExecutionImplemented: false,
    reportDate: "2026-07-01",
    reworkQuantity: 2,
    scrapQuantity: 3,
    status: "draft",
    usesDocumentEngine: true,
  });

  assert.equal(report.usesDocumentEngine, true);
  assert.equal(report.businessDocument, true);
  assert.equal(report.mutatesInventoryQuantities, false);
  assert.equal(report.calculatesCost, false);
  assert.equal(report.createsAccountingEntries, false);
  assert.equal(report.payrollLogicImplemented, false);
});

test("manufacturing sprint 3 boundary guardrails block cost, payroll, inventory posting, and execution runtime", () => {
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.noExecutionRuntime, true);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.noInventoryPosting, true);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.noMaterialIssuePosting, true);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.noPayrollLogic, true);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.noQualityExecution, true);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.perWorkerTargetCanonical, false);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.workspaceUsesFakeData, false);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.mutatesInventoryQuantities, false);
  assert.equal(MANUFACTURING_SPRINT3_BOUNDARY_GUARDRAILS.calculatesCost, false);
});

test("manufacturing sprint 3 events are contract-only", () => {
  for (const eventName of MANUFACTURING_SPRINT3_EVENT_NAMES) {
    assert.equal(MANUFACTURING_V2_EVENT_CONTRACTS.some((event) => String(event.name) === eventName), true, `${eventName} should be defined`);
  }

  const sprint3Events = MANUFACTURING_V2_EVENT_CONTRACTS.filter((event) =>
    MANUFACTURING_SPRINT3_EVENT_NAMES.includes(String(event.name) as (typeof MANUFACTURING_SPRINT3_EVENT_NAMES)[number]),
  );
  assert.equal(sprint3Events.every((event) => event.handlerImplemented === false), true);
});

test("manufacturing sprint 3 search, report, dashboard, and print readiness contracts exist", () => {
  for (const entityType of MANUFACTURING_SPRINT3_SEARCH_ENTITIES) {
    assert.equal(MANUFACTURING_SEARCH_PROVIDER_CONTRACT.entityTypes.includes(entityType), true, `${entityType} should be searchable`);
  }

  for (const report of MANUFACTURING_SPRINT3_REPORT_READINESS) {
    assert.equal(MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS.reportContracts.some((contract) => contract.key === report.key), true);
  }

  for (const metric of MANUFACTURING_SPRINT3_DASHBOARD_METRICS) {
    assert.equal(MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS.dashboardMetrics.includes(metric), true);
  }

  for (const print of MANUFACTURING_SPRINT3_PRINT_READINESS) {
    assert.equal(MANUFACTURING_SPRINT3_FOUNDATION_CONTRACTS.printContracts.some((contract) => contract.key === print.key), true);
  }
});

test("manufacturing relation labels never expose raw UUID examples", () => {
  assert.equal(
    formatManufacturingRelationLabel(MANUFACTURING_RELATION_LABEL_CONTRACTS.product, { name: "Widget Pro", sku: "SKU-100" }),
    "SKU-100 — Widget Pro",
  );
  assert.equal(
    formatManufacturingRelationLabel(MANUFACTURING_RELATION_LABEL_CONTRACTS.productionLine, { code: "line-01", name: "Assembly Line 01" }),
    "line-01 — Assembly Line 01",
  );
  assert.equal(
    formatManufacturingRelationLabel(MANUFACTURING_RELATION_LABEL_CONTRACTS.workCenter, { code: "wc-asm", name: "Assembly Work Center" }),
    "wc-asm — Assembly Work Center",
  );
  assert.equal(
    formatManufacturingRelationLabel(MANUFACTURING_RELATION_LABEL_CONTRACTS.machine, { code: "mch-001", name: "Injection Machine 01" }),
    "mch-001 — Injection Machine 01",
  );
  assert.equal(
    formatManufacturingRelationLabel(MANUFACTURING_RELATION_LABEL_CONTRACTS.employee, { employee_code: "emp-001", name_en: "Ahmed Hassan" }),
    "emp-001 — Ahmed Hassan",
  );
});

test("manufacturing workspace route shell has readiness-only quick actions and no fake data", () => {
  const page = fs.readFileSync(path.join(root, "src/app/(erp)/erp/manufacturing/page.tsx"), "utf8");
  const loader = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/loaders/manufacturing-workspace.loader.ts"), "utf8");

  assert.match(page, /Manufacturing Workspace/);
  assert.match(loader, /Today's Manufacturing Orders|Operations|Crew|Production Reports|Downtime/);
  assert.match(page, /cursor-not-allowed/);
  assert.match(page, /loadManufacturingWorkspace/);
  assert.match(loader, /manufacturing_operation_plans/);
  assert.match(loader, /manufacturing_crew_assignments/);
  assert.match(loader, /manufacturing_production_reports/);
  assert.doesNotMatch(loader, /mock|fake|demo/i);
  assert.equal(MANUFACTURING_WORKSPACE_QUICK_ACTIONS.every((action) => action.runtimeImplemented === false), true);
});

test("manufacturing sprint 3 migration creates required tables with scope, lifecycle, RLS, and guardrails", () => {
  const sql = fs.readFileSync(sprint3MigrationPath, "utf8");

  for (const table of [
    "manufacturing_operation_plans",
    "manufacturing_crew_assignments",
    "manufacturing_crew_assignment_members",
    "manufacturing_production_reports",
    "manufacturing_production_report_crew",
    "manufacturing_production_report_downtime",
    "manufacturing_production_report_scrap",
    "manufacturing_production_report_rework",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`'${table}'`));
  }

  assert.match(sql, /execute format\('alter table public\.%I enable row level security', table_name\)/);
  assert.match(sql, /execute format\('alter table public\.%I force row level security', table_name\)/);

  assert.match(sql, /manufacturing_boms add column if not exists bom_number/);
  assert.match(sql, /manufacturing_bom_lines add column if not exists sequence/);
  assert.match(sql, /manufacturing_routings add column if not exists routing_number/);
  assert.match(sql, /manufacturing_routing_steps add column if not exists operation_code/);
  assert.match(sql, /'components_json_legacy_only', true/);
  assert.match(sql, /'operations_json_legacy_only', true/);
  assert.match(sql, /'per_worker_target_canonical', false/);
  assert.match(sql, /'production_facts_only', true/);
  assert.match(sql, /'inventory_mutation_implemented', false/);
  assert.match(sql, /crew_role text not null check \(crew_role in \('operator', 'lead_operator'/);
  assert.match(sql, /status text not null default 'draft' check \(status in \('draft', 'planned', 'ready', 'blocked', 'in_progress', 'completed', 'cancelled'\)\)/);
  assert.match(sql, /document_type text not null default 'manufacturing\.production-report'/);
});

test("manufacturing sprint 3 migration does not add execution runtime or posting", () => {
  const sql = fs.readFileSync(sprint3MigrationPath, "utf8");

  for (const forbidden of [
    /create table .*inventory_post/i,
    /create table .*material_issue/i,
    /create table .*cost/i,
    /create table .*payroll/i,
    /create table .*quality_inspection/i,
    /references public\.inventory_(?!products|uoms)/i,
    /inventory_mutation_implemented boolean not null default true/i,
    /cost_calculation_implemented boolean not null default true/i,
    /payroll_logic_implemented boolean not null default true/i,
    /quality_execution_implemented boolean not null default true/i,
    /production_execution_runtime_implemented boolean not null default true/i,
  ]) {
    assert.doesNotMatch(sql, forbidden);
  }

  for (const eventName of MANUFACTURING_SPRINT3_EVENT_NAMES) {
    assert.match(sql, new RegExp(eventName));
  }
});

test("manufacturing lookups use relation label contracts for sprint 3 entities", () => {
  const lookups = fs.readFileSync(path.join(root, "src/features/manufacturing/routes/loaders/manufacturing-lookups.loader.ts"), "utf8");

  assert.match(lookups, /formatManufacturingRelationLabel/);
  assert.match(lookups, /manufacturing_operation_plans/);
  assert.match(lookups, /manufacturing_crew_assignments/);
  assert.match(lookups, /operationPlanId/);
  assert.match(lookups, /crewAssignmentId/);
  assert.doesNotMatch(lookups, /<datalist|list=\{/);
});
