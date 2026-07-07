import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  classifyHrEmploymentProfileField,
  HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT,
  HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES,
  HR_EMPLOYMENT_PROFILE_OWNERSHIP_RULES,
  HR_FOUNDATION_CONTRACTS,
  HR_FOUNDATION_TABLES,
  HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT,
  HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT,
  HR_LEAVE_ABSENCE_FOUNDATION_TABLES,
  HR_LEAVE_ABSENCE_IMPORT_CONTRACT,
  HR_LEAVE_ABSENCE_PERMISSION_METADATA,
  HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES,
  HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYROLL_RELATIONSHIP_FOUNDATION_TABLES,
  HR_PAYROLL_RELATIONSHIP_IMPORT_CONTRACT,
  HR_PAYROLL_RELATIONSHIP_PERMISSION_METADATA,
  HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT,
  HR_PAYROLL_TYPED_SOURCE_KINDS,
  HR_PAYROLL_TYPED_SOURCE_REFERENCE_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SECURITY_READINESS_RULES,
  isHrPayrollTypedSourceKind,
  resolveHrPayrollLifecycleOwner,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const refactorMigrationPath = path.join(root, "supabase/migrations/20260709120000_hr_architecture_refactor_gate_foundation.sql");
const jobArchitectureMigrationPath = path.join(root, "supabase/migrations/20260701120000_hr_job_architecture_engine_foundation.sql");

test("review gate blocks new runtime surfaces while enabling architectural refactor contracts", () => {
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.newFeaturesImplemented, false);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.payrollLocalizationImplemented, false);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.payrollUiImplemented, false);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.essMssUiImplemented, false);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.leaveAbsenceFirstClassBoundedContext, true);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.assignmentEngineCanonicalForOrgAssignments, true);
  assert.equal(HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT.employmentProfileCanonicalForOrgAssignments, false);
});

test("employment profile is no longer canonical for organizational assignment fields", () => {
  const assignmentOwnedFields = [
    "department_id",
    "section_id",
    "team_id",
    "position_id",
    "grade_id",
    "work_location_id",
    "reporting_manager_employee_id",
  ];

  for (const field of assignmentOwnedFields) {
    const rule = classifyHrEmploymentProfileField(field);
    assert.equal(rule?.canonicalOwner, "assignment-engine");
    assert.equal(rule?.classification, "cached-projection");
    assert.equal(rule?.writePath, "assignment-engine");
    assert.equal(rule?.readPath, "assignment-resolver");
    assert.equal(rule?.cacheRebuildSource, "hr_assignments");
  }

  const policyRefs = HR_EMPLOYMENT_PROFILE_OWNERSHIP_RULES.filter((rule) => rule.classification === "deprecated-source-field");
  assert.deepEqual(policyRefs.map((rule) => rule.field), ["attendance_policy_ref", "leave_policy_ref", "payroll_policy_ref"]);
  assert.ok(policyRefs.every((rule) => rule.canonicalOwner === "assignment-engine"));
});

test("assignment engine owns effective-dated organization, manager, grade, policy, and payroll placement", () => {
  const assignmentTypes: readonly string[] = HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES.map((rule) => rule.assignmentType);

  assert.deepEqual(
    ["position", "department", "section", "team", "manager", "grade", "work_location", "shift_schedule", "payroll_group", "cost_center", "policy_assignment"].every((type) =>
      assignmentTypes.includes(type),
    ),
    true,
  );
  assert.ok(HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES.every((rule) => rule.canonicalOwner === "assignment-engine"));
  assert.ok(HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES.every((rule) => rule.supportsEffectiveDating));
  assert.ok(HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES.every((rule) => rule.supportsHistory));
  assert.ok(HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES.every((rule) => rule.writesEmploymentProfileDirectly === false));
});

test("payroll lifecycle has one execution owner and keeps batch grouping non-canonical", () => {
  const batch = resolveHrPayrollLifecycleOwner("payroll_batch");
  const run = resolveHrPayrollLifecycleOwner("payroll_run");

  assert.equal(run?.canonicalOwner, "payroll-run");
  assert.equal(run?.ownsCalculation, true);
  assert.equal(run?.ownsApproval, true);
  assert.equal(run?.ownsClosing, true);
  assert.equal(batch?.canonicalOwner, "payroll-batch");
  assert.equal(batch?.ownsCalculation, false);
  assert.equal(batch?.ownsApproval, false);
  assert.equal(batch?.ownsClosing, false);
  assert.ok(HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES.every((rule) => rule.duplicatesPayrollNumbers === false));
});

test("payroll result owns numbers while payslip owns presentation and publication visibility", () => {
  assert.deepEqual(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.canonicalChain, [
    "payroll_run",
    "employee_snapshot",
    "payroll_result",
    "payroll_result_components",
    "payslip",
    "payslip_publication",
  ]);
  assert.equal(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.payrollResultOwnsNumbers, true);
  assert.equal(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.resultComponentsOwnBreakdown, true);
  assert.equal(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.payslipLinesPresentationOnly, true);
  assert.equal(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.payslipLinesDerivedFromResultComponents, true);
  assert.equal(HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT.duplicateCalculationValuesInPayslipAllowed, false);
});

test("leave and absence foundation is a bounded context without runtime payroll calculation", () => {
  assert.equal(HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT.leaveAbsenceIsFirstClassBoundedContext, true);
  assert.equal(HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT.runtimeLeaveCalculationImplemented, true);
  assert.equal(HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT.essMssUiImplemented, false);
  assert.equal(HR_LEAVE_ABSENCE_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
  assert.deepEqual(HR_LEAVE_ABSENCE_FOUNDATION_TABLES, HR_FOUNDATION_CONTRACTS.leaveAbsenceTables);
  assert.ok(HR_FOUNDATION_TABLES.includes("hr_leave_requests"));
  assert.ok(HR_FOUNDATION_TABLES.includes("hr_absence_events"));
  assert.equal(HR_LEAVE_ABSENCE_IMPORT_CONTRACT.key, "hr.leave-absence.import");
  assert.ok(HR_LEAVE_ABSENCE_PERMISSION_METADATA.some((permission) => permission.key === HR_PERMISSIONS.leaveApprove));
});

test("payroll relationship foundation owns effective-dated payroll employment linkage only", () => {
  assert.equal(HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT.payrollRelationshipSeparateFromEmploymentAssignment, true);
  assert.equal(HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT.payrollAssignmentEffectiveDated, true);
  assert.equal(HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT.localizationPackBoundaryReady, true);
  assert.equal(HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT.statutoryRulesImplemented, false);
  assert.equal(HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT.paymentExecutionImplemented, false);
  assert.deepEqual(HR_PAYROLL_RELATIONSHIP_FOUNDATION_TABLES, HR_FOUNDATION_CONTRACTS.payrollRelationshipTables);
  assert.ok(HR_FOUNDATION_TABLES.includes("hr_payroll_relationships"));
  assert.ok(HR_FOUNDATION_TABLES.includes("hr_payroll_assignments"));
  assert.equal(HR_PAYROLL_RELATIONSHIP_IMPORT_CONTRACT.key, "hr.payroll.relationship.import");
  assert.ok(HR_PAYROLL_RELATIONSHIP_PERMISSION_METADATA.some((permission) => permission.key === HR_PERMISSIONS.payrollRelationshipsManage));
});

test("legacy job titles are compatibility-only and new canonical dependencies target hr_jobs", () => {
  assert.equal(HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT.canonicalJobTable, "hr_jobs");
  assert.equal(HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT.legacyTable, "hr_job_titles");
  assert.equal(HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT.newCanonicalDependenciesAllowed, false);
  assert.equal(HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT.compatibilityReadsAllowed, true);
  assert.ok(HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT.migrationStrategy.includes("freeze_new_job_title_dependencies"));
});

test("manager, self, HR, payroll, and approval security scopes are declared but not runtime-implemented", () => {
  const scopes = HR_SECURITY_READINESS_RULES.map((rule) => rule.scope);

  assert.deepEqual(scopes, [
    "manager-scope",
    "self-scope",
    "hr-admin-scope",
    "payroll-admin-scope",
    "approval-segregation-of-duties",
  ]);
  assert.ok(HR_SECURITY_READINESS_RULES.every((rule) => rule.runtimeImplemented === false));
  assert.ok(HR_SECURITY_READINESS_RULES.some((rule) => rule.permissionBoundary === "hr.payroll.admin.scope"));
});

test("payroll source references are typed and do not allow generic metadata ownership", () => {
  assert.deepEqual(HR_PAYROLL_TYPED_SOURCE_KINDS, [
    "leave",
    "absence",
    "loan",
    "advance",
    "penalty",
    "benefit",
    "attendance",
    "overtime",
    "manual_adjustment",
  ]);
  assert.equal(isHrPayrollTypedSourceKind("leave"), true);
  assert.equal(isHrPayrollTypedSourceKind("localization"), false);
  assert.equal(HR_PAYROLL_TYPED_SOURCE_REFERENCE_CONTRACT.payrollInputsUseTypedSourceRefs, true);
  assert.equal(HR_PAYROLL_TYPED_SOURCE_REFERENCE_CONTRACT.genericMetadataOnlySourceReferencesAllowed, false);
});

test("review gate permissions and manifest expose only foundation access", () => {
  assert.ok(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.leaveView));
  assert.ok(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.leaveManage));
  assert.ok(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.leaveApprove));
  assert.ok(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollRelationshipsView));
  assert.ok(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollRelationshipsManage));
  const capabilityKeys = hrAppManifest.capabilities.map((capability) => capability.key);
  assert.ok(capabilityKeys.includes("hr.architecture-refactor-gate"));
  assert.ok(capabilityKeys.includes("hr.leave-absence-foundation"));
  assert.ok(capabilityKeys.includes("hr.payroll-relationship-foundation"));
});

test("refactor migration is additive, RLS-protected, and wires result-payslip and typed source refs", () => {
  const sql = fs.readFileSync(refactorMigrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.hr_leave_types/);
  assert.match(sql, /create table if not exists public\.hr_absence_events/);
  assert.match(sql, /create table if not exists public\.hr_payroll_relationships/);
  assert.match(sql, /create table if not exists public\.hr_payroll_assignments/);
  assert.match(sql, /create table if not exists public\.hr_payroll_typed_source_refs/);
  assert.match(sql, /alter table public\.hr_payslips\s+add column if not exists payroll_result_id/);
  assert.match(sql, /alter table public\.hr_payslip_lines\s+add column if not exists payroll_result_component_id/);
  assert.match(sql, /assignment_cache_classification/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /hr\.leave\.view/);
  assert.match(sql, /hr\.payroll\.relationships\.manage/);
  assert.doesNotMatch(sql, /\bdrop table\b/i);
  assert.doesNotMatch(sql, /\bdrop column\b/i);
  assert.doesNotMatch(sql, /localization runtime/i);
});

test("job architecture migration removes position legacy title ownership", () => {
  const sql = fs.readFileSync(jobArchitectureMigrationPath, "utf8");

  assert.match(sql, /create table public\.hr_jobs/);
  assert.match(sql, /alter table public\.hr_positions\s+drop column if exists job_title_id/);
  assert.match(sql, /add column job_id uuid references public\.hr_jobs/);
  assert.match(sql, /alter column job_id set not null/);
});
