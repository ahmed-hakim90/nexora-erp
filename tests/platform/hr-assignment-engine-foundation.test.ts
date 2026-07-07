import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrAssignment,
  defineHrAssignmentEffect,
  defineHrAssignmentHistoryEntry,
  defineHrAssignmentResolutionRef,
  HR_ASSIGNMENT_ACTION_ORIGINS,
  HR_ASSIGNMENT_AUDIT_ACTIONS,
  HR_ASSIGNMENT_EFFECT_CHAINS,
  HR_ASSIGNMENT_EFFECT_DEFINITIONS,
  HR_ASSIGNMENT_EFFECTIVE_DATING_CONTRACT,
  HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT,
  HR_ASSIGNMENT_EVENT_DEFINITIONS,
  HR_ASSIGNMENT_FOUNDATION_TABLES,
  HR_ASSIGNMENT_PAYROLL_READINESS,
  HR_ASSIGNMENT_PLATFORM_INTEGRATION,
  HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT,
  HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT,
  HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES,
  HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION,
  HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY,
  HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES,
  HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL,
  HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT,
  HR_ASSIGNMENT_RESOLVER_TIE_BREAKERS,
  HR_ASSIGNMENT_RESOLUTION_RULES,
  HR_ASSIGNMENT_SCOPES,
  HR_ASSIGNMENT_STATUSES,
  HR_ASSIGNMENT_TEMPLATE_INTEGRATION,
  HR_ASSIGNMENT_TIMELINE_READINESS,
  HR_ASSIGNMENT_TYPES,
  HR_ASSIGNMENT_VALIDATION_RULES,
  HR_ASSIGNMENT_WORKFORCE_INTEGRATION,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_REPORTING_STRUCTURE_KINDS,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630185000_hr_assignment_engine_foundation.sql");

test("HR Assignment Foundation exposes types, statuses, and scopes", () => {
  assert.equal(HR_ASSIGNMENT_TYPES.length, 17);
  assert.equal(HR_ASSIGNMENT_STATUSES.length, 5);
  assert.equal(HR_ASSIGNMENT_SCOPES.length, 6);
  assert.equal(HR_REPORTING_STRUCTURE_KINDS.length, 4);
  assert.equal(HR_ASSIGNMENT_VALIDATION_RULES.length, 16);
  assert.equal(HR_ASSIGNMENT_RESOLUTION_RULES.length, 6);
});

test("assignment model is effective-dated without direct employment profile mutation", () => {
  const assignment = defineHrAssignment({
    appliedAt: "2026-02-01T08:00:00.000Z",
    appliedBy: "user-1",
    assignmentRuntimeImplemented: false,
    assignmentScope: "primary",
    assignmentStatus: "active",
    assignmentType: "department",
    branchId: null,
    companyId: "company-1",
    directEmploymentProfileMutation: false,
    effectiveFrom: "2026-02-01",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    historicalAssignmentsImmutable: true,
    hrActionReference: "action-1",
    priority: 100,
    reason: "Department transfer",
    referenceEntityId: "department-1",
    referenceEntityType: "hr_org_unit",
    tenantId: "tenant-1",
  });

  assert.equal(assignment.assignmentType, "department");
  assert.equal(assignment.directEmploymentProfileMutation, false);
  assert.equal(assignment.historicalAssignmentsImmutable, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.assignmentsOwnOrganizationalRelationships, true);
});

test("assignment history keeps immutable records and replacement creates new assignment", () => {
  const history = defineHrAssignmentHistoryEntry({
    assignmentId: "assignment-1",
    assignmentStatus: "superseded",
    assignmentType: "manager",
    assignmentRuntimeImplemented: false,
    effectiveFrom: "2026-02-01",
    employeeId: "employee-1",
    historyImmutable: true,
    hrActionReference: "action-1",
    newReferenceEntityId: "employee-2",
    previousReferenceEntityId: "employee-3",
    recordedAt: "2026-02-01T10:00:00.000Z",
    supersededAssignmentId: "assignment-0",
  });

  assert.equal(history.historyImmutable, true);
  assert.equal(HR_ASSIGNMENT_EFFECTIVE_DATING_CONTRACT.historicalAssignmentsImmutable, true);
  assert.equal(HR_ASSIGNMENT_EFFECTIVE_DATING_CONTRACT.replacementCreatesNewAssignment, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.replacementCreatesNewAssignment, true);
});

test("assignment resolution contracts define rules without runtime resolver", () => {
  const resolution = defineHrAssignmentResolutionRef({
    assignmentScope: "temporary",
    assignmentType: "shift_schedule",
    effectiveDate: "2026-02-01",
    employeeId: "employee-1",
    resolutionRuleKey: "temporary_overrides_within_validity",
    resolutionRuntimeImplemented: false,
  });

  assert.equal(resolution.resolutionRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_RESOLUTION_RULES[0]?.key, "primary_assignment_wins");
  assert.equal(HR_ASSIGNMENT_RESOLUTION_RULES[1]?.key, "temporary_overrides_within_validity");
  assert.equal(HR_ASSIGNMENT_RESOLUTION_RULES[3]?.key, "emergency_highest_precedence_within_validity");
  assert.equal(HR_ASSIGNMENT_RESOLUTION_RULES[5]?.key, "acting_overrides_reporting_structure_only");
});

test("assignment resolver design gate makes resolver the only supported read path", () => {
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.assignmentResolverIsOnlySupportedReadPath, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.resolutionSnapshotImmutable, true);
  assert.deepEqual(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.processingFlow, [
    "employee",
    "assignment_engine",
    "assignment_resolver",
    "assignment_resolution_snapshot",
    "operational_engines",
  ]);

  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.resolverReadPathIsAuthoritative, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.directAssignmentTableReadsInBusinessLogicAllowed, false);
  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.directEmploymentProfileMutation, false);
  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.runtimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT.supportedFlow.includes("assignment_resolution_snapshot"), true);
});

test("employment profile ownership matrix keeps profile as anchor and assignments as org source", () => {
  assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.runtimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.policyOverridesRemainProfileKeyed, true);
  assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.profileOrgFieldsAreCacheOnlyInPhase2, true);

  for (const field of ["tenant_id", "company_id", "branch_id", "employee_id", "employment_type"] as const) {
    assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.employmentProfileAnchorFields.includes(field), true);
  }

  for (const field of ["department_id", "position_id", "reporting_manager_employee_id", "shift_schedule_ref"] as const) {
    assert.equal(HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT.assignmentResolutionOwnedFields.includes(field), true);
  }
});

test("assignment resolver snapshot contract is immutable and derived", () => {
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.immutablePointInTimeMaterialization, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.derivedFromAssignmentHistory, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.employmentProfileCacheOptional, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.profileCacheUpdatedOnlyByResolverPublishStep, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.runtimeImplemented, true);
  assert.deepEqual(HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT.requiredEnvelopeFields, [
    "employeeId",
    "employmentProfileId",
    "effectiveDate",
    "asOfTimestamp",
    "resolutionVersion",
    "snapshotId",
    "assignments",
    "reporting",
    "workforce",
    "provenance",
    "computedAt",
    "resolverContractVersion",
  ]);
});

test("assignment resolver precedence, tie breakers, and grain policies are declared only", () => {
  assert.equal(HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL.length, 6);
  assert.deepEqual(HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL.map((rule) => rule.scope), [
    "primary",
    "temporary",
    "acting",
    "delegated",
    "project",
    "emergency",
  ]);
  assert.equal(HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL.at(-1)?.precedence, 60);
  assert.equal(HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL.every((rule) => rule.resolutionRuntimeImplemented === true), true);
  assert.deepEqual(HR_ASSIGNMENT_RESOLVER_TIE_BREAKERS, [
    "higher_priority_wins",
    "later_effective_from_wins",
    "remaining_tie_is_validation_failure",
  ]);

  assert.equal(HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY.dateGrain.grain, "date");
  assert.equal(HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY.timestampGrain.grain, "timestamp");
  assert.equal(HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY.tenantPolicyRequiredBeforeRuntime, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY.runtimeImplemented, true);
});

test("assignment resolver consumer and historical rules forbid direct profile dependency", () => {
  assert.equal(HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES.length, 13);
  assert.equal(
    HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES.every((rule) => rule.directProfileReadAllowedInPhase2 === false),
    true
  );
  assert.equal(HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES.some((rule) => rule.consumer === "attendance"), true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES.some((rule) => rule.consumer === "payroll"), true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES.some((rule) => rule.consumer === "workflow"), true);

  assert.equal(HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES.resolveBusinessDateNotToday, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES.closedPayrollPeriodsFreezeSnapshotReference, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES.attendanceLockedDaysStoreResolvedRefs, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES.retroChangesCreateCorrectionBatches, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES.runtimeImplemented, true);
});

test("assignment resolver drift prevention keeps cache derived and read only", () => {
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.singleWritePath, "assignment_engine");
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.cacheUpdatedOnlyByResolverPublisher, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.profileCacheReadOnlyToConsumers, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.resolutionSnapshotIdRequiredForCache, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.reconciliationJobReadOnly, true);
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.directProfileUpdateGuardPhase, "phase_3");
  assert.equal(HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION.runtimeImplemented, true);
});

test("HR action and template integration declare assignment origins without execution", () => {
  const hiring = HR_ASSIGNMENT_ACTION_ORIGINS.find((origin) => origin.actionType === "hiring");
  const transfer = HR_ASSIGNMENT_ACTION_ORIGINS.find((origin) => origin.actionType === "transfer");

  assert.equal(hiring?.assignmentTypes.includes("template_version"), true);
  assert.equal(transfer?.assignmentTypes.includes("cost_center"), true);
  assert.equal(HR_ASSIGNMENT_TEMPLATE_INTEGRATION.templatesNeverWriteOperationalData, true);
  assert.equal(HR_ASSIGNMENT_TEMPLATE_INTEGRATION.assignmentEngineCreatesAssignments, true);
  assert.equal(HR_ASSIGNMENT_TEMPLATE_INTEGRATION.assignmentRuntimeImplemented, false);

  for (const origin of HR_ASSIGNMENT_ACTION_ORIGINS) {
    assert.equal(origin.assignmentRuntimeImplemented, false);
  }
});

test("workforce, payroll, and reporting structure readiness avoid mutation runtime", () => {
  assert.equal(HR_ASSIGNMENT_WORKFORCE_INTEGRATION.workforceMutationImplemented, false);
  assert.equal(HR_ASSIGNMENT_WORKFORCE_INTEGRATION.assignmentTargets.includes("shift_schedule"), true);
  assert.equal(HR_ASSIGNMENT_PAYROLL_READINESS.payrollMutationImplemented, false);
  assert.equal(HR_ASSIGNMENT_PAYROLL_READINESS.fields.length, 3);
  assert.equal(HR_REPORTING_STRUCTURE_KINDS.includes("matrix_manager"), true);
});

test("assignment effect chains declare intended downstream impacts as metadata only", () => {
  assert.equal(HR_ASSIGNMENT_EFFECT_CHAINS.length, 3);

  const manager = HR_ASSIGNMENT_EFFECT_CHAINS.find((chain) => chain.assignmentType === "manager");
  const shift = HR_ASSIGNMENT_EFFECT_CHAINS.find((chain) => chain.assignmentType === "shift_schedule");

  assert.deepEqual(manager?.effects, ["workflow", "approval", "reports", "dashboard", "notifications"]);
  assert.deepEqual(shift?.effects, ["attendance", "payroll_snapshot", "production_planning"]);

  for (const chain of HR_ASSIGNMENT_EFFECT_CHAINS) {
    assert.equal(chain.effectRuntimeImplemented, false);
  }

  const effect = defineHrAssignmentEffect({
    assignmentType: "department",
    description: "Department assignment readiness for analytics.",
    effectOrder: 3,
    effectRuntimeImplemented: false,
    effectTarget: "analytics",
  });

  assert.equal(effect.effectRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_EFFECT_DEFINITIONS.length, 5);
});

test("assignment timeline readiness publishes metadata without publisher runtime", () => {
  assert.equal(HR_ASSIGNMENT_TIMELINE_READINESS.publishesTimelineReadiness, true);
  assert.equal(HR_ASSIGNMENT_TIMELINE_READINESS.publishesAuditReadiness, true);
  assert.equal(HR_ASSIGNMENT_TIMELINE_READINESS.publishesSearchReadiness, true);
  assert.equal(HR_ASSIGNMENT_TIMELINE_READINESS.timelinePublisherRuntimeImplemented, false);
});

test("HR assignment foundation enables resolver runtime while workflow/apply remain disabled", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrAssignmentEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrAssignmentEngineRuntime, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.assignmentRuntimeImplemented, true);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.directEmploymentProfileMutation, false);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.workflowRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.applyRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT.assignmentResolverIsOnlySupportedReadPath, true);
  assert.equal(HR_ASSIGNMENT_PLATFORM_INTEGRATION.assignmentRuntimeImplemented, false);
  assert.equal(HR_ASSIGNMENT_PLATFORM_INTEGRATION.referencesHrTemplateLifecycle, true);
});

test("assignment permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.assignments.view",
    "hr.assignments.manage",
    "hr.assignment_history.view",
    "hr.assignment_resolution.view",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_ASSIGNMENT_EVENT_DEFINITIONS.length, 6);
  assert.equal(HR_ASSIGNMENT_AUDIT_ACTIONS.assignmentCreated, "hr.assignment.created");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.assignment-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.assignmentTables.length, 4);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.assignments.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.search.searchableEntities.some((entity) => entity.entityType === "hr_assignment"), true);
});

test("HR assignment migration adds foundation tables, effective dating, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_ASSIGNMENT_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_assignment_type",
    "hr_assignment_status",
    "hr_assignment_scope",
    "hr_reporting_structure_kind",
    "references public.hr_employees",
    "references public.hr_employment_profiles",
    "references public.hr_action_documents",
    "assignment_runtime_implemented', false",
    "direct_employment_profile_mutation', false",
    "historical_assignments_immutable', true",
    "history_immutable', true",
    "resolution_runtime_implemented', false",
    "hr.assignments.view",
    "hr.assignments.manage",
    "hr.assignment_history.view",
    "hr.assignment_resolution.view",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "assignment_execution_runtime",
    "update hr_employment_profiles set",
    "mutate_employment_profile",
    "apply_engine_runtime",
    "workflow_execution_runtime",
    "self_service",
    "manager_portal",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Assignment migration must not include ${forbidden}`);
  }
});

test("assignment public contracts do not implement runtime execution or profile mutation", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/assignment-foundation.ts"), "utf8");

  for (const forbidden of [
    "executeAssignment",
    "resolveAssignmentRuntime",
    "mutateEmploymentProfile",
    "updateEmploymentProfileDirectly",
    "applyHrActionEffects",
    "workflowRuntimeHandler",
    "assignmentExecutionHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Assignment contracts must not include ${forbidden}`);
  }
});
