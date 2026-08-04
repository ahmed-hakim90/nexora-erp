import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createPolicyResolutionContractInput,
  defineHrPolicy,
  defineHrPolicyAssignment,
  defineHrPolicyOverride,
  defineHrPolicyVersion,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_POLICY_DEPENDENCY_CONTRACTS,
  HR_POLICY_ENGINE_BOUNDARY_CONTRACT,
  HR_POLICY_FOUNDATION_TABLES,
  HR_POLICY_RESOLUTION_CONTRACT,
  HR_POLICY_TYPE_DEFINITIONS,
  HR_POLICY_TYPES,
  HR_RULE_SIMULATOR_READINESS_CONTRACT,
  policyVersionAppliesOn,
  hrAppManifest,
} from "@/features/hr/server-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630154500_hr_policy_engine_foundation.sql");

test("HR Policy Foundation exposes the supported policy type model", () => {
  assert.deepEqual(HR_POLICY_TYPES, [
    "attendance",
    "leave",
    "payroll",
    "shift",
    "overtime",
    "incentive",
    "allowance",
    "deduction",
    "loan",
    "penalty",
    "approval",
    "probation",
    "confirmation",
    "promotion",
    "transfer",
    "document_expiry",
    "custody",
    "training",
    "travel_mission",
    "production_incentive",
  ]);
  assert.equal(HR_POLICY_TYPE_DEFINITIONS.length, 20);
  assert.equal(HR_POLICY_TYPE_DEFINITIONS.every((definition) => definition.runtimeCalculationImplemented === false), true);
  assert.equal(HR_POLICY_TYPE_DEFINITIONS.every((definition) => definition.supportsRuleSimulator === true), true);
});

test("policy creation contract separates identity from versioned rules", () => {
  const policy = defineHrPolicy({
    branchId: null,
    code: "ATT-STD",
    companyId: "company-1",
    description: "Standard attendance policy.",
    name: "Standard Attendance",
    policyType: "attendance",
    status: "active",
    tenantId: "tenant-1",
  });
  const version = defineHrPolicyVersion({
    allowOverride: true,
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    policyId: "policy-1",
    priority: 100,
    rules: { graceMinutes: 10 },
    status: "active",
    tenantId: "tenant-1",
    version: 1,
  });

  assert.equal(policy.policyType, "attendance");
  assert.equal(version.version, 1);
  assert.equal(version.rules.graceMinutes, 10);
  assert.equal("rules" in policy, false);
});

test("policy versioning and effective dating preserve historical behavior", () => {
  const v1 = defineHrPolicyVersion({
    allowOverride: true,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-30",
    policyId: "policy-1",
    priority: 100,
    rules: { graceMinutes: 10 },
    status: "active",
    tenantId: "tenant-1",
    version: 1,
  });
  const v2 = defineHrPolicyVersion({
    ...v1,
    effectiveFrom: "2026-07-01",
    effectiveTo: null,
    rules: { graceMinutes: 5 },
    version: 2,
  });

  assert.equal(policyVersionAppliesOn(v1, "2026-03-01"), true);
  assert.equal(policyVersionAppliesOn(v1, "2026-08-01"), false);
  assert.equal(policyVersionAppliesOn(v2, "2026-08-01"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.policyResolution.runtimeResolutionImplemented, false);
});

test("inheritance assignments follow company to employee override readiness", () => {
  const companyAssignment = defineHrPolicyAssignment({
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    policyType: "attendance",
    policyVersionId: "policy-version-1",
    priority: 10,
    sourceLevel: "company",
    status: "active",
    tenantId: "tenant-1",
  });
  const departmentAssignment = defineHrPolicyAssignment({
    ...companyAssignment,
    departmentId: "department-1",
    priority: 50,
    sourceLevel: "department",
  });

  assert.equal(companyAssignment.sourceLevel, "company");
  assert.equal(departmentAssignment.sourceLevel, "department");
  assert.deepEqual(HR_POLICY_RESOLUTION_CONTRACT.resolutionOrder, [
    "company",
    "branch",
    "department",
    "position",
    "grade",
    "employment_profile_override",
  ]);
  assert.equal(HR_POLICY_RESOLUTION_CONTRACT.resolvesHighestPriorityApplicablePolicy, true);
});

test("policy overrides are employment-profile scoped and do not mutate base policy", () => {
  const override = defineHrPolicyOverride({
    branchId: "branch-1",
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    employmentProfileId: "profile-1",
    overriddenValues: { graceMinutes: 15 },
    policyType: "attendance",
    policyVersionId: "policy-version-1",
    priority: 1000,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(override.employmentProfileId, "profile-1");
  assert.deepEqual(override.overriddenValues, { graceMinutes: 15 });
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.policiesCopiedIntoEmployees, false);
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.employmentProfilesReferencePolicies, true);
});

test("resolution contract describes ResolvePolicy inputs and outputs without runtime execution", () => {
  const input = createPolicyResolutionContractInput({
    branchId: "branch-1",
    companyId: "company-1",
    departmentId: "department-1",
    effectiveDate: "2026-06-30",
    employmentProfileId: "profile-1",
    gradeId: "grade-1",
    policyType: "attendance",
    positionId: "position-1",
  });

  assert.equal(input.policyType, "attendance");
  assert.equal(HR_POLICY_RESOLUTION_CONTRACT.functionName, "ResolvePolicy");
  assert.deepEqual(HR_POLICY_RESOLUTION_CONTRACT.returns, [
    "resolved policy",
    "version",
    "source level",
    "override status",
  ]);
  assert.equal(HR_POLICY_RESOLUTION_CONTRACT.runtimeResolutionImplemented, false);
  assert.equal(HR_POLICY_RESOLUTION_CONTRACT.runtimeCalculationsImplemented, false);
});

test("rule simulator and dependency contracts are readiness-only", () => {
  assert.deepEqual(HR_RULE_SIMULATOR_READINESS_CONTRACT.policyMetadata, [
    "affected employees",
    "affected employment profiles",
    "affected departments",
    "estimated future impact",
  ]);
  assert.equal(HR_RULE_SIMULATOR_READINESS_CONTRACT.simulatorRuntimeImplemented, false);
  assert.equal(
    HR_POLICY_DEPENDENCY_CONTRACTS.some((dependency) =>
      dependency.policyType === "payroll" && dependency.dependsOnPolicyType === "attendance"
    ),
    true,
  );
  assert.equal(HR_POLICY_DEPENDENCY_CONTRACTS.every((dependency) => dependency.runtimeEvaluationImplemented === false), true);
});

test("policy permissions and manifest capabilities are registered", () => {
  for (const permission of [
    "hr.policies.view",
    "hr.policies.manage",
    "hr.policy_versions.manage",
    "hr.policy_overrides.manage",
    "hr.policy_simulator.view",
  ]) {
    assert.equal(HR_PERMISSION_LIST.map(String).includes(permission), true);
  }

  assert.equal(hrAppManifest.permissions.includes("hr.policies.view" as never), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.policy-foundation"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.policy-simulator-readiness"), true);
});

test("policy platform integrations expose search, reports, import/export, events, audit, and jobs", () => {
  assert.equal(HR_FOUNDATION_CONTRACTS.search.entityTypes.includes("hr_policy"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.reportDataset.fields.some((field) => field.key === "policyType"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.policies.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.policyExport.key, "hr.policies.export");
  assert.equal(HR_FOUNDATION_CONTRACTS.eventDefinitions.some((event) => String(event.name) === "PolicyVersionCreated"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.auditActions.policyVersionCreated, "hr.policy.version.created");
  assert.equal(HR_FOUNDATION_CONTRACTS.jobReadiness.some((job) => job.jobKey === "hr.foundation.search-index"), true);
});

test("policy foundation has no runtime calculations or workflow execution", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPolicyEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPolicyRuntimeResolution, false);
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.runtimeAttendanceImplemented, false);
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.runtimePayrollCalculationImplemented, false);
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.runtimeCompensationImplemented, false);
  assert.equal(HR_POLICY_ENGINE_BOUNDARY_CONTRACT.runtimeWorkflowImplemented, false);
});

test("policy migration creates normalized tables, RLS, permissions, and no runtime engines", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_POLICY_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_policy_versions_one_active_version_per_range",
    "prevent_hr_policy_version_history_rewrite",
    "hr_policy_assignments_resolution_idx",
    "hr_policy_overrides_profile_idx",
    "hr_employment_profiles_attendance_policy_ref_fk",
    "hr.policies.view",
    "hr.policy_versions.manage",
    "hr.policy_overrides.manage",
    "'runtime_calculation_implemented', false",
    "'affected_employees'",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "calculate_payroll",
    "calculate_attendance",
    "attendance_runtime",
    "payroll_batch",
    "payslip",
    "workflow_instance",
    "salary_component",
    "self_service",
    "manager_self_service",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Policy Foundation migration must not include ${forbidden}`);
  }
});
