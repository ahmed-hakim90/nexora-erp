import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  compensationComponentVersionAppliesOn,
  createCompensationSnapshotReadinessInput,
  defineHrCompensationComponent,
  defineHrCompensationComponentVersion,
  defineHrCompensationStructure,
  defineHrEmployeeCompensationOverride,
  defineHrSalaryPackage,
  defineHrSalaryPackageLine,
  defineHrSalaryPackageVersion,
  employeeCompensationOverrideAppliesOn,
  HR_COMPENSATION_AUDIT_ACTIONS,
  HR_COMPENSATION_CATEGORIES,
  HR_COMPENSATION_CATEGORY_DEFINITIONS,
  HR_COMPENSATION_COMPONENT_EXAMPLES,
  HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT,
  HR_COMPENSATION_EFFECTIVE_DATING_CONTRACT,
  HR_COMPENSATION_EVENT_DEFINITIONS,
  HR_COMPENSATION_FOUNDATION_TABLES,
  HR_COMPENSATION_SNAPSHOT_READINESS,
  HR_COMPENSATION_STRUCTURE_EXAMPLES,
  HR_COMPENSATION_TEMPLATE_READINESS,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS,
  salaryPackageVersionAppliesOn,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630165000_hr_compensation_engine_foundation.sql");

test("HR Compensation Foundation exposes all supported categories", () => {
  assert.equal(HR_COMPENSATION_CATEGORIES.length, 17);
  assert.deepEqual(HR_COMPENSATION_CATEGORIES, HR_COMPENSATION_CATEGORY_DEFINITIONS.map((definition) => definition.categoryKey));
  assert.equal(HR_COMPENSATION_CATEGORY_DEFINITIONS.some((definition) => definition.categoryKey === "incentive"), true);
  assert.equal(HR_COMPENSATION_CATEGORY_DEFINITIONS.some((definition) => definition.categoryKey === "basic_salary"), true);
});

test("compensation component contract separates identity from versioned valuation metadata", () => {
  const component = defineHrCompensationComponent({
    branchId: null,
    category: "allowance",
    code: "TRANSPORT_ALLOWANCE",
    companyId: "company-1",
    description: "Transportation allowance component.",
    name: "Transportation Allowance",
    status: "active",
    tenantId: "tenant-1",
  });
  const version = defineHrCompensationComponentVersion({
    appearsOnPayslip: true,
    branchId: null,
    companyId: "company-1",
    componentId: "component-1",
    currency: "USD",
    defaultAmount: 500,
    displayOrder: 10,
    earningOrDeduction: "earning",
    effectiveFrom: "2026-01-01",
    employeeCost: true,
    employerCost: false,
    fixedOrFormula: "fixed",
    includedInEndOfService: false,
    includedInGrossSalary: true,
    insurable: false,
    roundingRule: "nearest",
    status: "active",
    taxable: true,
    tenantId: "tenant-1",
    version: 1,
  });

  assert.equal(component.code, "TRANSPORT_ALLOWANCE");
  assert.equal(version.defaultAmount, 500);
  assert.equal("defaultAmount" in component, false);
  assert.equal(HR_COMPENSATION_COMPONENT_EXAMPLES.some((example) => example.code === "PRODUCTION_INCENTIVE"), true);
});

test("component versioning and effective dating preserve historical behavior", () => {
  const v1 = defineHrCompensationComponentVersion({
    appearsOnPayslip: true,
    companyId: "company-1",
    componentId: "component-1",
    currency: "USD",
    defaultAmount: 500,
    displayOrder: 10,
    earningOrDeduction: "earning",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    employeeCost: true,
    employerCost: false,
    fixedOrFormula: "fixed",
    includedInEndOfService: false,
    includedInGrossSalary: true,
    insurable: false,
    roundingRule: "nearest",
    status: "active",
    taxable: true,
    tenantId: "tenant-1",
    version: 1,
  });
  const v2 = defineHrCompensationComponentVersion({
    appearsOnPayslip: true,
    companyId: "company-1",
    componentId: "component-1",
    currency: "USD",
    defaultAmount: 600,
    displayOrder: 10,
    earningOrDeduction: "earning",
    effectiveFrom: "2026-07-01",
    employeeCost: true,
    employerCost: false,
    fixedOrFormula: "fixed",
    includedInEndOfService: false,
    includedInGrossSalary: true,
    insurable: false,
    roundingRule: "nearest",
    status: "active",
    taxable: true,
    tenantId: "tenant-1",
    version: 2,
  });

  assert.equal(compensationComponentVersionAppliesOn(v1, "2026-03-01"), true);
  assert.equal(compensationComponentVersionAppliesOn(v2, "2026-03-01"), false);
  assert.equal(compensationComponentVersionAppliesOn(v2, "2026-08-01"), true);
  assert.equal(HR_COMPENSATION_EFFECTIVE_DATING_CONTRACT.historicalVersionsMutableByDirectEdit, false);
  assert.equal(HR_COMPENSATION_EFFECTIVE_DATING_CONTRACT.historicalVersionsRequireSupersedingVersion, true);
});

test("compensation structures group allowed components without payroll calculation", () => {
  const structure = defineHrCompensationStructure({
    branchId: null,
    code: "FACTORY_WORKER",
    companyId: "company-1",
    description: "Factory worker compensation structure.",
    employmentType: "full-time",
    name: "Factory Worker Structure",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(structure.code, "FACTORY_WORKER");
  assert.equal(HR_COMPENSATION_STRUCTURE_EXAMPLES.length, 5);
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.runtimeCompensationCalculationImplemented, false);
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.runtimePayrollCalculationImplemented, false);
});

test("salary package contracts reference structure and versioned lines with policy eligibility only", () => {
  const salaryPackage = defineHrSalaryPackage({
    branchId: null,
    code: "FACTORY_WORKER_PKG",
    companyId: "company-1",
    description: "Factory worker salary package.",
    employmentType: "full-time",
    name: "Factory Worker Package",
    status: "active",
    structureId: "structure-1",
    tenantId: "tenant-1",
  });
  const packageVersion = defineHrSalaryPackageVersion({
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    salaryPackageId: "package-1",
    status: "active",
    tenantId: "tenant-1",
    version: 1,
  });
  const packageLine = defineHrSalaryPackageLine({
    amountOverride: 500,
    branchId: null,
    companyId: "company-1",
    componentVersionId: "component-version-1",
    displayOrder: 10,
    effectiveFrom: "2026-01-01",
    eligibility: {
      policyVersionRef: "policy-version-1",
      runtimeEvaluationImplemented: false,
    },
    requirement: "required",
    salaryPackageVersionId: "package-version-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(salaryPackage.structureId, "structure-1");
  assert.equal(packageVersion.version, 1);
  assert.equal(packageLine.eligibility.policyVersionRef, "policy-version-1");
  assert.equal(packageLine.eligibility.runtimeEvaluationImplemented, false);
  assert.equal(salaryPackageVersionAppliesOn(packageVersion, "2026-03-01"), true);
});

test("employee compensation overrides do not mutate package or component definitions", () => {
  const override = defineHrEmployeeCompensationOverride({
    amount: 700,
    branchId: null,
    companyId: "company-1",
    componentVersionId: "component-version-1",
    effectiveFrom: "2026-01-01",
    employmentProfileId: "profile-1",
    overrideType: "amount",
    packageLineId: "package-line-1",
    reason: "Special transportation allowance.",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(override.amount, 700);
  assert.equal(override.packageLineId, "package-line-1");
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.overridesMutatePackageDefinitions, false);
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.overridesMutateComponentDefinitions, false);
  assert.equal(employeeCompensationOverrideAppliesOn(override, "2026-03-01"), true);
});

test("production incentive readiness is metadata-only without manufacturing dependency", () => {
  assert.equal(HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS.componentCategory, "incentive");
  assert.equal(HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS.manufacturingDependencyImplemented, false);
  assert.equal(HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS.runtimeCalculationImplemented, false);
  assert.equal(HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS.supportedFutureReferences.includes("production_line"), true);
  assert.equal(HR_PRODUCTION_INCENTIVE_COMPENSATION_READINESS.supportedFutureReferences.includes("quality_threshold"), true);
});

test("payroll snapshot readiness captures immutable compensation references without payroll runtime", () => {
  const snapshot = createCompensationSnapshotReadinessInput({
    compensationComponentVersionId: "component-version-1",
    effectiveDateUsed: "2026-03-31",
    employeeOverrideId: "override-1",
    formulaMetadata: {
      expressionKey: "production_incentive.placeholder",
      runtimeEvaluationImplemented: false,
    },
    policyVersionRefs: ["policy-version-1"],
    salaryPackageLineId: "package-line-1",
    salaryPackageVersionId: "package-version-1",
  });

  assert.equal(snapshot.salaryPackageVersionId, "package-version-1");
  assert.equal(snapshot.effectiveDateUsed, "2026-03-31");
  assert.equal(HR_COMPENSATION_SNAPSHOT_READINESS.payrollRuntimeImplemented, false);
  assert.equal(HR_COMPENSATION_SNAPSHOT_READINESS.immutableHistoricalVersions, true);
});

test("compensation foundation keeps policy logic out of compensation valuation", () => {
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.policyLogicDuplicatedInCompensation, false);
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.compensationDefinesWhatAndHowValued, true);
  assert.equal(HR_COMPENSATION_ENGINE_BOUNDARY_CONTRACT.payrollCalculatesLater, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsCompensationEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsCompensationCalculation, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
});

test("compensation permissions and app capabilities are registered", () => {
  for (const permission of [
    "hr.compensation.view",
    "hr.compensation.manage",
    "hr.salary_packages.view",
    "hr.salary_packages.manage",
    "hr.compensation_overrides.view",
    "hr.compensation_overrides.manage",
  ]) {
    assert.equal(HR_PERMISSION_LIST.map(String).includes(permission), true);
  }
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.compensation-foundation"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.salary-package-foundation"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.compensation-snapshot-readiness"), true);
});

test("compensation events, audit actions, templates, and platform contracts are readiness-only", () => {
  assert.equal(HR_COMPENSATION_EVENT_DEFINITIONS.length, 8);
  assert.equal(HR_COMPENSATION_EVENT_DEFINITIONS.every((definition) => definition.version === 1), true);
  assert.equal(HR_COMPENSATION_AUDIT_ACTIONS.componentCreated, "hr.compensation.component.created");
  assert.equal(HR_COMPENSATION_AUDIT_ACTIONS.overrideExpired, "hr.compensation.override.expired");
  assert.equal(HR_COMPENSATION_TEMPLATE_READINESS.length, 4);
  assert.equal(HR_COMPENSATION_TEMPLATE_READINESS.every((template) => template.runtimeImplemented === false), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.compensationTables.length, 9);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.compensation.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.compensationExport.key, "hr.compensation.export");
});

test("HR compensation migration adds foundation tables, RLS, versioning, and employment profile linkage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_COMPENSATION_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_compensation_component_versions_one_active_version_per_range",
    "hr_salary_package_versions_one_active_version_per_range",
    "prevent_hr_compensation_component_version_history_rewrite",
    "prevent_hr_salary_package_version_history_rewrite",
    "hr_employment_profiles_salary_package_ref_fk",
    "eligibility_policy_version_id uuid references public.hr_policy_versions",
    "does_not_mutate_package_or_component",
    "runtime_calculation_implemented', false",
    "public.has_app_access(tenant_id, 'hr')",
    "hr.compensation.view",
    "hr.salary_packages.manage",
    "hr.compensation_overrides.manage",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "payroll_batch",
    "calculate_payroll",
    "payslip_runtime",
    "net_salary",
    "gross_salary_calculation",
    "attendance_calculation",
    "production_runtime",
    "finance_posting",
    "self_service",
    "manager_portal",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Compensation migration must not include ${forbidden}`);
  }
});

test("compensation public contracts do not implement payroll calculation", () => {
  const publicApiSource = fs.readFileSync(path.join(root, "src/features/hr/compensation-foundation.ts"), "utf8");

  for (const forbidden of [
    "calculatePayroll",
    "calculateNetSalary",
    "calculateGrossSalary",
    "runPayrollBatch",
    "evaluateFormula(",
  ]) {
    assert.equal(publicApiSource.includes(forbidden), false, `Compensation contracts must not include ${forbidden}`);
  }
});
