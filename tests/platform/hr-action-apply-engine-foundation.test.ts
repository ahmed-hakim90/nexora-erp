import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildHrActionApplyIdempotencyKey,
  createHrActionApplyDryRunResult,
  defineHrActionApplyEffect,
  defineHrActionApplyRequest,
  defineHrActionApplyResult,
  HR_ACTION_APPLY_ATTENDANCE_IMPACT_READINESS,
  HR_ACTION_APPLY_AUDIT_ACTIONS,
  HR_ACTION_APPLY_CONFLICT_TYPES,
  HR_ACTION_APPLY_EFFECT_STATUSES,
  HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT,
  HR_ACTION_APPLY_EVENT_DEFINITIONS,
  HR_ACTION_APPLY_FOUNDATION_TABLES,
  HR_ACTION_APPLY_HANDLER_REGISTRY,
  HR_ACTION_APPLY_IDEMPOTENCY_CONTRACT,
  HR_ACTION_APPLY_MODES,
  HR_ACTION_APPLY_ORDERING_STEPS,
  HR_ACTION_APPLY_PAYROLL_IMPACT_READINESS,
  HR_ACTION_APPLY_REQUEST_STATUSES,
  HR_ACTION_APPLY_ROLLBACK_READINESS,
  HR_ACTION_APPLY_VALIDATION_RULES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630180000_hr_action_apply_engine_foundation.sql");

test("HR Action Apply Foundation exposes modes, statuses, and conflict types", () => {
  assert.equal(HR_ACTION_APPLY_MODES.length, 4);
  assert.equal(HR_ACTION_APPLY_REQUEST_STATUSES.length, 9);
  assert.equal(HR_ACTION_APPLY_EFFECT_STATUSES.length, 9);
  assert.equal(HR_ACTION_APPLY_CONFLICT_TYPES.length, 10);
  assert.equal(HR_ACTION_APPLY_ROLLBACK_READINESS.length, 5);
  assert.equal(HR_ACTION_APPLY_VALIDATION_RULES.length, 12);
});

test("apply request contract is readiness-only without operational mutation runtime", () => {
  const request = defineHrActionApplyRequest({
    actionDocumentId: "action-1",
    applyMode: "dry_run",
    applyRuntimeImplemented: false,
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-1",
    effectiveDate: "2026-02-01",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    metadata: { channel: "erp" },
    requestedAt: "2026-01-20T10:00:00.000Z",
    requestedBy: "user-1",
    status: "pending",
    tenantId: "tenant-1",
  });

  assert.equal(request.applyMode, "dry_run");
  assert.equal(request.applyRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.directOperationalMutation, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.approvedActionRequiredBeforeApply, true);
});

test("apply effect contract maps handler keys and idempotency without runtime", () => {
  const effect = defineHrActionApplyEffect({
    actionDocumentId: "action-1",
    actionEffectId: "effect-1",
    applyRequestId: "apply-request-1",
    applyRuntimeImplemented: false,
    branchId: null,
    companyId: "company-1",
    effectOrder: 5,
    effectTarget: "compensation",
    handlerKey: "hr.apply.compensation",
    idempotencyKey: buildHrActionApplyIdempotencyKey({
      actionDocumentId: "action-1",
      actionEffectId: "effect-1",
      effectTarget: "compensation",
    }),
    status: "pending",
    tenantId: "tenant-1",
  });

  assert.equal(effect.handlerKey, "hr.apply.compensation");
  assert.equal(effect.idempotencyKey, "action-1:effect-1:compensation");
  assert.equal(effect.applyRuntimeImplemented, false);
});

test("handler registry maps all effect targets without handler runtime", () => {
  assert.equal(HR_ACTION_APPLY_HANDLER_REGISTRY.length, 10);

  const targets = HR_ACTION_APPLY_HANDLER_REGISTRY.map((handler) => handler.target);
  assert.deepEqual(targets.sort(), [
    "attendance",
    "calendar",
    "compensation",
    "cost_center",
    "employment_profile",
    "organization",
    "payroll_snapshot",
    "reporting_manager",
    "timeline",
    "workforce",
  ]);

  for (const handler of HR_ACTION_APPLY_HANDLER_REGISTRY) {
    assert.equal(handler.handlerRuntimeImplemented, false);
    assert.equal(handler.idempotent, true);
    assert.equal(handler.supportsDryRun, true);
  }
});

test("apply ordering defines ten ordered steps from validation through audit", () => {
  assert.equal(HR_ACTION_APPLY_ORDERING_STEPS.length, 10);
  assert.deepEqual(
    HR_ACTION_APPLY_ORDERING_STEPS.map((step) => step.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(HR_ACTION_APPLY_ORDERING_STEPS[0]?.key, "validate_employee_profile");
  assert.equal(HR_ACTION_APPLY_ORDERING_STEPS.at(-1)?.key, "audit");
});

test("idempotency and dry run contracts avoid duplicate apply and simulation runtime", () => {
  assert.equal(HR_ACTION_APPLY_IDEMPOTENCY_CONTRACT.sameActionEffectTargetMustNotApplyTwice, true);
  assert.deepEqual(HR_ACTION_APPLY_IDEMPOTENCY_CONTRACT.fields, [
    "idempotency_key",
    "first_applied_at",
    "last_attempted_at",
    "attempt_count",
    "result_hash",
  ]);

  const dryRun = createHrActionApplyDryRunResult({
    affectedRecords: [{ table: "hr_employment_profiles", recordId: "profile-1" }],
    missingPermissions: ["hr.actions.apply.execute"],
    requiredPermissions: ["hr.actions.apply.execute", "hr.actions.apply.dry_run"],
    wouldApply: true,
  });

  assert.equal(dryRun.simulationRuntimeImplemented, false);
  assert.equal(dryRun.wouldApply, true);
  assert.equal(dryRun.missingPermissions.length, 1);
});

test("apply result, payroll impact, and attendance impact readiness avoid mutation", () => {
  const result = defineHrActionApplyResult({
    actionDocumentId: "action-1",
    appliedEffects: ["effect-1"],
    applyRequestId: "apply-request-1",
    applyRuntimeImplemented: false,
    auditRefs: ["audit-1"],
    branchId: null,
    companyId: "company-1",
    conflicts: [],
    eventRefs: ["event-1"],
    failedEffects: [],
    skippedEffects: [],
    snapshotImpactRefs: ["snapshot-1"],
    tenantId: "tenant-1",
    timelineRefs: ["timeline-1"],
    warnings: [],
  });

  assert.equal(result.applyRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_PAYROLL_IMPACT_READINESS.payrollMutationImplemented, false);
  assert.equal(HR_ACTION_APPLY_ATTENDANCE_IMPACT_READINESS.attendanceMutationImplemented, false);
  assert.equal(HR_ACTION_APPLY_PAYROLL_IMPACT_READINESS.fields.length, 6);
  assert.equal(HR_ACTION_APPLY_ATTENDANCE_IMPACT_READINESS.fields.length, 5);
});

test("HR action apply foundation keeps apply, rollback, and calculation runtime disabled", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrActionApplyEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrActionApplyRuntime, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.applyRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.rollbackRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.dryRunSimulationRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.workflowRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.approvalExecutionImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.attendanceCalculationImplemented, false);
  assert.equal(HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT.financePostingImplemented, false);
});

test("apply permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.actions.apply.view",
    "hr.actions.apply.manage",
    "hr.actions.apply.dry_run",
    "hr.actions.apply.execute",
    "hr.actions.apply.rollback",
    "hr.actions.apply.audit.view",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_ACTION_APPLY_EVENT_DEFINITIONS.length, 10);
  assert.equal(HR_ACTION_APPLY_AUDIT_ACTIONS.applyRequested, "hr.action.apply.requested");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.action-apply-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.actionApplyTables.length, 6);
  assert.equal(HR_FOUNDATION_CONTRACTS.actionApplyHandlerRegistry.length, 10);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.actions.apply.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.search.searchableEntities.some((entity) => entity.entityType === "hr_action_apply_request"), true);
});

test("HR action apply migration adds foundation tables, idempotency, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_ACTION_APPLY_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_action_apply_mode",
    "hr_action_apply_request_status",
    "hr_action_apply_effect_status",
    "hr_action_apply_conflict_type",
    "hr_action_apply_rollback_readiness",
    "references public.hr_action_documents",
    "references public.hr_action_effects",
    "references public.hr_employment_profiles",
    "hr_action_apply_effects_idempotency_uq",
    "hr_action_apply_idempotency_key_uq",
    "apply_runtime_implemented', false",
    "direct_operational_mutation', false",
    "hr.actions.apply.view",
    "hr.actions.apply.execute",
    "hr.actions.apply.rollback",
    "hr.actions.apply.audit.view",
    "idempotency_key",
    "result_hash",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "apply_engine_runtime",
    "rollback_runtime_handler",
    "calculate_payroll",
    "calculate_attendance",
    "finance_posting_runtime",
    "workflow_handler",
    "approval_execution_runtime",
    "update hr_employment_profiles set",
    "mutate_employment_profile",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Apply migration must not include ${forbidden}`);
  }
});

test("action apply public contracts do not implement runtime mutation or calculation", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/action-apply-foundation.ts"), "utf8");

  for (const forbidden of [
    "applyHrActionEffects",
    "executeApplyRuntime",
    "mutateEmploymentProfile",
    "mutateCompensation",
    "mutateAttendance",
    "mutatePayroll",
    "calculatePayroll",
    "calculateAttendance",
    "postToFinance",
    "rollbackRuntimeHandler",
    "workflowRuntimeHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Apply contracts must not include ${forbidden}`);
  }
});
