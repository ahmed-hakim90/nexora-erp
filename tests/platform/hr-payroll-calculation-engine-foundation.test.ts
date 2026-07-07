import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollCalculationContextInput,
  defineHrPayrollCalculationExecution,
  defineHrPayrollCalculationRule,
  defineHrPayrollCalculationRuleSet,
  defineHrPayrollCalculationTrace,
  detectHrPayrollCalculationCircularDependencies,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_CALCULATION_AUDIT_ACTIONS,
  HR_PAYROLL_CALCULATION_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_CALCULATION_EVENT_DEFINITIONS,
  HR_PAYROLL_CALCULATION_EXPORT_CONTRACT,
  HR_PAYROLL_CALCULATION_FINANCE_COST_READINESS_CONTRACT,
  HR_PAYROLL_CALCULATION_FORMULA_FOUNDATION_CONTRACT,
  HR_PAYROLL_CALCULATION_FORMULA_TYPES,
  HR_PAYROLL_CALCULATION_FOUNDATION_TABLES,
  HR_PAYROLL_CALCULATION_IMPORT_CONTRACT,
  HR_PAYROLL_CALCULATION_INPUTS_INTEGRATION_CONTRACT,
  HR_PAYROLL_CALCULATION_OBSERVABILITY_CONTRACT,
  HR_PAYROLL_CALCULATION_PERMISSION_METADATA,
  HR_PAYROLL_CALCULATION_PIPELINE_STAGES,
  HR_PAYROLL_CALCULATION_PLATFORM_INTEGRATION,
  HR_PAYROLL_CALCULATION_PRORATION_READINESS_CONTRACT,
  HR_PAYROLL_CALCULATION_RECALCULATION_READINESS_CONTRACT,
  HR_PAYROLL_CALCULATION_ROUNDING_PRECISION_CONTRACT,
  HR_PAYROLL_CALCULATION_RULE_SCOPES,
  HR_PAYROLL_CALCULATION_VALIDATION_RULES,
  HR_PAYROLL_ROUNDING_METHODS,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  payrollRunAllowsCalculation,
  resolveHrPayrollCalculationPipelineStage,
  hrAppManifest,
} from "@/features/hr/public-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260706120000_hr_payroll_calculation_engine_foundation.sql");

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

test("HR Payroll Calculation exposes rule scopes, pipeline stages, and formula types", () => {
  assert.equal(HR_PAYROLL_CALCULATION_RULE_SCOPES.length, 6);
  assert.equal(HR_PAYROLL_CALCULATION_PIPELINE_STAGES.length, 12);
  assert.equal(HR_PAYROLL_CALCULATION_FORMULA_TYPES.length, 7);
  assert.equal(HR_PAYROLL_ROUNDING_METHODS.length, 6);
  assert.equal(HR_PAYROLL_CALCULATION_VALIDATION_RULES.length, 10);
  assert.equal(HR_PAYROLL_CALCULATION_ENGINE_BOUNDARY_CONTRACT.readsOperationalTablesDirectly, false);
});

test("calculation context consumes snapshots and approved inputs only", () => {
  const context = createHrPayrollCalculationContextInput({
    actorId: "user-1",
    branchId: null,
    calculationDate: "2026-02-28",
    companyId: "company-1",
    correlationId: "corr-123",
    currency: "USD",
    employeeId: "employee-1",
    employeeSnapshotId: "snapshot-1",
    payrollGroupId: "group-1",
    payrollPeriodId: "period-1",
    payrollRunId: "run-1",
    tenantId: "tenant-1",
  });

  assert.equal(context.consumesSnapshotsAndApprovedInputsOnly, true);
  assert.equal(context.readsOperationalTablesDirectly, false);
  assert.equal(HR_PAYROLL_CALCULATION_INPUTS_INTEGRATION_CONTRACT.readsOperationalTablesDirectly, false);
});

test("rule registry and rule set contracts remain country-neutral", () => {
  const ruleSet = defineHrPayrollCalculationRuleSet({
    branchId: null,
    companyId: "company-1",
    countryNeutral: true,
    currency: "USD",
    description: "Core payroll rules",
    localizationPackImplemented: false,
    name: "Core Payroll Rules",
    priority: 100,
    ruleSetCode: "CORE-PAYROLL",
    scope: "company",
    statutoryRulesImplemented: false,
    status: "active",
    tenantId: "tenant-1",
  });
  const rule = defineHrPayrollCalculationRule({
    branchId: null,
    companyId: "company-1",
    componentCode: "HOUSING",
    condition: { percentageOf: "BASIC" },
    dependsOnComponentCodes: ["BASIC"],
    formulaKey: "percentage_of_basic",
    formulaType: "percentage",
    hiddenCalculation: false,
    localizationRuleImplemented: false,
    priority: 200,
    ruleCode: "HOUSING-PCT",
    ruleName: "Housing Allowance",
    ruleScope: "component",
    ruleSetId: "rule-set-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(ruleSet.countryNeutral, true);
  assert.equal(rule.localizationRuleImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_FORMULA_FOUNDATION_CONTRACT.localizationFormulaPacksImplemented, false);
});

test("circular dependency detection blocks invalid component chains", () => {
  const acyclic = detectHrPayrollCalculationCircularDependencies([
    { componentCode: "BASIC", dependsOnComponentCodes: [] },
    { componentCode: "HOUSING", dependsOnComponentCodes: ["BASIC"] },
    { componentCode: "GROSS", dependsOnComponentCodes: ["BASIC", "HOUSING"] },
  ]);
  const cyclic = detectHrPayrollCalculationCircularDependencies([
    { componentCode: "BASIC", dependsOnComponentCodes: ["GROSS"] },
    { componentCode: "GROSS", dependsOnComponentCodes: ["BASIC"] },
  ]);

  assert.equal(acyclic.circular, false);
  assert.equal(cyclic.circular, true);
  assert.equal(cyclic.cyclePath.includes("BASIC"), true);
});

test("calculation execution and trace include required metadata", () => {
  const execution = defineHrPayrollCalculationExecution({
    actorId: "user-1",
    branchId: null,
    calculationDate: "2026-02-28",
    calculationStatus: "calculated",
    companyId: "company-1",
    correlationId: "corr-123",
    currency: "USD",
    employeeId: "employee-1",
    employeeSnapshotId: "snapshot-1",
    executionDurationMs: 120,
    grossEarnings: 10000,
    netPay: 8500,
    payrollRunId: "run-1",
    ruleSetId: "rule-set-1",
    statutoryCalculationImplemented: false,
    status: "completed",
    tenantId: "tenant-1",
    totalDeductions: 1500,
    totalEmployerContributions: 500,
    traceSummary: { componentCount: 5 },
  });
  const trace = defineHrPayrollCalculationTrace({
    branchId: null,
    calculationExecutionId: "execution-1",
    calculationTimestamp: "2026-02-28T10:00:00.000Z",
    companyId: "company-1",
    formulaKey: "percentage_of_basic",
    hiddenCalculation: false,
    inputValues: { basicSalary: 10000, rate: 0.25 },
    outputAmount: 2500,
    payrollResultComponentId: "component-1",
    ruleId: "rule-1",
    ruleVersion: 1,
    roundingMethod: "half_up",
    sourceId: "input-1",
    sourceType: "payroll_input",
    tenantId: "tenant-1",
    traceable: true,
  });

  assert.equal(execution.statutoryCalculationImplemented, false);
  assert.equal(trace.traceable, true);
  assert.equal(trace.hiddenCalculation, false);
});

test("rounding, proration, and recalculation readiness remain contract-only", () => {
  assert.equal(HR_PAYROLL_CALCULATION_ROUNDING_PRECISION_CONTRACT.countrySpecificRoundingImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_PRORATION_READINESS_CONTRACT.prorationEngineImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_RECALCULATION_READINESS_CONTRACT.recalculationRuntimeImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_RECALCULATION_READINESS_CONTRACT.comparePreviousVsRecalculatedResult, true);
  assert.equal(payrollRunAllowsCalculation("ready"), true);
  assert.equal(payrollRunAllowsCalculation("approved"), false);
});

test("pipeline stages and finance readiness integrate without posting runtime", () => {
  const stage = resolveHrPayrollCalculationPipelineStage("calculate_net");

  assert.equal(stage.pipelineStage, "calculate_net");
  assert.equal(stage.runtimeImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_FINANCE_COST_READINESS_CONTRACT.accountingPostingImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_FINANCE_COST_READINESS_CONTRACT.costPostingImplemented, false);
  assert.equal(HR_PAYROLL_CALCULATION_FINANCE_COST_READINESS_CONTRACT.financePostingReadiness, true);
});

test("search registration, permissions, and foundation contracts include payroll calculation", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_calculation_execution"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payroll_calculation_trace"), true);
  assert.equal(HR_PAYROLL_CALCULATION_PERMISSION_METADATA.length, 4);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollCalculate), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollTraceView), true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollCalculationEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollCalculationTables, HR_PAYROLL_CALCULATION_FOUNDATION_TABLES);
  assert.equal(HR_PAYROLL_CALCULATION_IMPORT_CONTRACT.key, "hr.payroll.calculation.import");
  assert.equal(HR_PAYROLL_CALCULATION_EXPORT_CONTRACT.key, "hr.payroll.calculation.export");
  assert.equal(HR_PAYROLL_CALCULATION_PLATFORM_INTEGRATION.observabilityReadinessRegistered, true);
  assert.equal(HR_PAYROLL_CALCULATION_EVENT_DEFINITIONS.length, 6);
  assert.equal(HR_PAYROLL_CALCULATION_AUDIT_ACTIONS.payrollCalculationStarted, "hr.payroll.calculation.started");
  assert.equal(HR_PAYROLL_CALCULATION_OBSERVABILITY_CONTRACT.correlationIdField, "correlation_id");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-calculation-foundation"), true);
});

test("payroll calculation migration defines tables, RLS, and out-of-scope guards", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_CALCULATION_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /hr\.payroll\.calculate/);
  assert.match(migration, /hr\.payroll\.trace\.view/);
  assert.match(migration, /localization_pack_implemented', false/);
  assert.match(migration, /references public\.hr_payroll_results/i);
  assert.doesNotMatch(migration, /create table public\.hr_tax/i);
  assert.doesNotMatch(migration, /calculate_gosi/i);
  assert.doesNotMatch(migration, /journal_entry/i);
});
