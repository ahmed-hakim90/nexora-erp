import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrWorkforceForecastReadinessInput,
  defineHrHeadcountPlanLine,
  defineHrHiringRequest,
  defineHrOrganizationCapacityPlan,
  defineHrPositionCapacityPlan,
  defineHrWorkforcePlan,
  defineHrWorkforcePlanBudgetRef,
  defineHrWorkforceVacancy,
  HR_ASSIGNMENT_WORKFORCE_PLANNING_INTEGRATION,
  HR_ASSIGNMENT_VALIDATION_RULES,
  HR_FOUNDATION_CONTRACTS,
  HR_HEADCOUNT_SCOPE_LEVELS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  HR_VACANCY_REASONS,
  HR_WORKFORCE_FORECAST_TYPES,
  HR_WORKFORCE_PLANNING_ASSIGNMENT_INTEGRATION_CONTRACT,
  HR_WORKFORCE_PLANNING_AUDIT_ACTIONS,
  HR_WORKFORCE_PLANNING_BUDGET_READINESS_CONTRACT,
  HR_WORKFORCE_PLANNING_ENGINE_BOUNDARY_CONTRACT,
  HR_WORKFORCE_PLANNING_EVENT_DEFINITIONS,
  HR_WORKFORCE_PLANNING_EXPORT_CONTRACT,
  HR_WORKFORCE_PLANNING_FOUNDATION_TABLES,
  HR_WORKFORCE_PLANNING_HR_ACTION_INTEGRATION_CONTRACT,
  HR_WORKFORCE_PLANNING_IMPORT_CONTRACT,
  HR_WORKFORCE_PLANNING_PERMISSION_METADATA,
  HR_WORKFORCE_PLANNING_PLATFORM_INTEGRATION,
  HR_WORKFORCE_PLANNING_REPORT_READINESS,
  HR_WORKFORCE_PLANNING_VALIDATION_RULES,
  HR_WORKFORCE_PLAN_STATUSES,
  HR_WORKFORCE_VACANCY_STATUSES,
  resolveHrWorkforcePlanningExecutionChain,
  hrAppManifest,
} from "@/features/hr/public-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260703120000_hr_workforce_planning_engine_foundation.sql");

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

test("HR Workforce Planning Foundation exposes plan statuses, scopes, and separated concepts", () => {
  assert.equal(HR_WORKFORCE_PLAN_STATUSES.length, 6);
  assert.equal(HR_HEADCOUNT_SCOPE_LEVELS.length, 6);
  assert.equal(HR_VACANCY_REASONS.length, 5);
  assert.equal(HR_WORKFORCE_VACANCY_STATUSES.length, 6);
  assert.equal(HR_WORKFORCE_FORECAST_TYPES.length, 5);
  assert.equal(HR_WORKFORCE_PLANNING_VALIDATION_RULES.length, 10);
  assert.equal(HR_WORKFORCE_PLANNING_ENGINE_BOUNDARY_CONTRACT.planningMixesWithExecution, false);
});

test("workforce plan contract supports effective dating and planning statuses", () => {
  const plan = defineHrWorkforcePlan({
    branchId: "branch-1",
    businessUnitOrgUnitId: "org-unit-1",
    companyId: "company-1",
    description: "FY2026 workforce plan.",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    name: "FY2026 Workforce Plan",
    planCode: "fy2026-workforce",
    planningRuntimeImplemented: false,
    status: "under_review",
    tenantId: "tenant-1",
  });

  assert.equal(plan.planCode, "fy2026-workforce");
  assert.equal(plan.status, "under_review");
  assert.equal(HR_WORKFORCE_PLANNING_ENGINE_BOUNDARY_CONTRACT.planningOwnsOrganizationalTargets, true);
});

test("headcount plan line stores planned and current values without runtime calculation", () => {
  const line = defineHrHeadcountPlanLine({
    approvedPositions: 12,
    branchId: "branch-1",
    companyId: "company-1",
    currentHeadcount: 10,
    departmentId: "department-1",
    filledPositions: 9,
    frozenPositions: 1,
    headcountRuntimeCalculationImplemented: false,
    jobId: "job-1",
    plannedHeadcount: 15,
    scopeLevel: "job",
    status: "draft",
    tenantId: "tenant-1",
    vacantPositions: 3,
    workforcePlanId: "plan-1",
  });

  assert.equal(line.plannedHeadcount, 15);
  assert.equal(line.headcountRuntimeCalculationImplemented, false);
});

test("position capacity plan allows multiple employees per position", () => {
  const capacity = defineHrPositionCapacityPlan({
    allowsMultipleEmployees: true,
    approvedCapacity: 3,
    branchId: null,
    companyId: "company-1",
    hiringRequired: true,
    occupiedCapacity: 2,
    onePositionOneEmployeeAssumption: false,
    positionId: "position-1",
    reservedCapacity: 0,
    status: "approved",
    tenantId: "tenant-1",
    vacantCapacity: 1,
    workforcePlanId: "plan-1",
  });

  assert.equal(capacity.allowsMultipleEmployees, true);
  assert.equal(capacity.hiringRequired, true);
});

test("vacancy and hiring request foundations remain contract-only", () => {
  const vacancy = defineHrWorkforceVacancy({
    branchId: null,
    companyId: "company-1",
    departmentId: "department-1",
    jobId: "job-1",
    positionId: "position-1",
    recruitmentRuntimeImplemented: false,
    status: "approved",
    tenantId: "tenant-1",
    vacancyReason: "replacement",
    workforcePlanId: "plan-1",
  });
  const hiringRequest = defineHrHiringRequest({
    approvalStatus: "pending_approval",
    branchId: null,
    candidateProcessingImplemented: false,
    companyId: "company-1",
    justification: "Backfill for separated employee.",
    priority: "high",
    requestedPositionId: "position-1",
    requiredDate: "2026-04-01",
    tenantId: "tenant-1",
    vacancyId: "vacancy-1",
    workforcePlanId: "plan-1",
  });

  assert.equal(vacancy.vacancyReason, "replacement");
  assert.equal(hiringRequest.candidateProcessingImplemented, false);
});

test("workforce forecast and budget readiness remain contract-only", () => {
  const forecast = createHrWorkforceForecastReadinessInput({
    effectiveFrom: "2026-07-01",
    forecastType: "expected_attrition",
    workforcePlanId: "plan-1",
  });
  const budgetRef = defineHrWorkforcePlanBudgetRef({
    branchId: null,
    budgetRef: "budget-2026-hr",
    budgetRuntimeImplemented: false,
    companyId: "company-1",
    costCenterId: "cost-center-1",
    financeCalculationImplemented: false,
    fiscalYear: "2026",
    status: "draft",
    tenantId: "tenant-1",
    workforcePlanId: "plan-1",
  });

  assert.equal(forecast.forecastEngineImplemented, false);
  assert.equal(budgetRef.financeCalculationImplemented, false);
  assert.equal(HR_WORKFORCE_PLANNING_BUDGET_READINESS_CONTRACT.budgetRuntimeImplemented, false);
});

test("organization capacity plan stores planned values without utilization runtime", () => {
  const capacity = defineHrOrganizationCapacityPlan({
    availableCapacity: 5,
    branchId: "branch-1",
    companyId: "company-1",
    currentCapacity: 20,
    orgUnitId: "department-1",
    plannedCapacity: 25,
    scope: "department",
    status: "draft",
    tenantId: "tenant-1",
    utilizationRate: 80,
    utilizationRuntimeCalculated: false,
    workforcePlanId: "plan-1",
  });

  assert.equal(capacity.utilizationRate, 80);
  assert.equal(capacity.utilizationRuntimeCalculated, false);
});

test("assignment and HR action integration keep planning separate from execution", () => {
  const resolved = resolveHrWorkforcePlanningExecutionChain({
    directEmployeeAssignmentFromPlan: true,
  });
  const execution = resolveHrWorkforcePlanningExecutionChain({
    hiringRequestId: "request-1",
    positionId: "position-1",
    vacancyId: "vacancy-1",
  });

  assert.equal(resolved.resolution, "forbidden-direct-plan-assignment");
  assert.equal(execution.resolution, "hiring.vacancy.position.assignment.employee");
  assert.equal(HR_WORKFORCE_PLANNING_ASSIGNMENT_INTEGRATION_CONTRACT.planningDirectlyAssignsEmployees, false);
  assert.equal(HR_WORKFORCE_PLANNING_HR_ACTION_INTEGRATION_CONTRACT.hrActionRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_WORKFORCE_PLANNING_INTEGRATION.referencesHrWorkforcePlanningFoundation, true);
  assert.equal(HR_ASSIGNMENT_VALIDATION_RULES.includes("planning_must_not_assign_employees_directly"), true);
});

test("search registration and permission metadata cover workforce planning entities", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_workforce_plan"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_workforce_vacancy"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_hiring_request"), true);
  assert.equal(HR_WORKFORCE_PLANNING_PERMISSION_METADATA.length, 5);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.headcountManage), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.hiringRequestsManage), true);
});

test("HR foundation contracts and app manifest include workforce planning foundation", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrWorkforcePlanningFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrWorkforcePlanningRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.workforcePlanningTables, HR_WORKFORCE_PLANNING_FOUNDATION_TABLES);
  assert.equal(HR_WORKFORCE_PLANNING_IMPORT_CONTRACT.key, "hr.workforce-planning.import");
  assert.equal(HR_WORKFORCE_PLANNING_EXPORT_CONTRACT.key, "hr.workforce-planning.export");
  assert.equal(HR_WORKFORCE_PLANNING_PLATFORM_INTEGRATION.dashboardReadinessRegistered, true);
  assert.equal(HR_WORKFORCE_PLANNING_REPORT_READINESS.runtimeReportGenerationImplemented, false);
  assert.equal(HR_WORKFORCE_PLANNING_EVENT_DEFINITIONS.length, 9);
  assert.equal(HR_WORKFORCE_PLANNING_AUDIT_ACTIONS.workforcePlanCreated, "hr.workforce-planning.plan.created");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.workforce-planning-foundation"), true);
});

test("workforce planning migration defines tables RLS and planning execution separation", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_WORKFORCE_PLANNING_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /hr\.workforce\.view/);
  assert.match(migration, /hr\.headcount\.manage/);
  assert.match(migration, /hr\.hiring_requests\.manage/);
  assert.match(migration, /allows_multiple_employees/);
  assert.doesNotMatch(migration, /create table public\.hr_recruitment/i);
  assert.doesNotMatch(migration, /payroll_calculation/i);
  assert.doesNotMatch(migration, /forecast_algorithm/i);
});
