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
  defineManufacturingLineTarget,
  defineManufacturingProductionPlan,
  defineManufacturingProductionPlanLine,
  defineManufacturingProductTarget,
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
  MANUFACTURING_HR_PAYROLL_INTEGRATION_CONTRACT,
  MANUFACTURING_INVENTORY_INTEGRATION_CONTRACT,
  MANUFACTURING_PERMISSIONS,
  MANUFACTURING_QUALITY_READINESS_CONTRACT,
  MANUFACTURING_REPORT_READINESS_CONTRACT,
  MANUFACTURING_SEARCH_PROVIDER_CONTRACT,
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
  assert.deepEqual(MANUFACTURING_EVENT_DEFINITIONS.map((event) => String(event.name)), [
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
  ]);
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
