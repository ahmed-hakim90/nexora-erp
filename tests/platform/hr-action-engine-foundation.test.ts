import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrActionEffectChain,
  defineHrActionDocument,
  defineHrActionEffect,
  defineHrActionLink,
  defineHrActionPayload,
  HR_ACTION_ATTENDANCE_READINESS,
  HR_ACTION_AUDIT_ACTIONS,
  HR_ACTION_COMPENSATION_READINESS,
  HR_ACTION_DOCUMENT_ENGINE_INTEGRATION,
  HR_ACTION_DOCUMENT_STATUSES,
  HR_ACTION_EFFECT_TARGETS,
  HR_ACTION_EMPLOYMENT_PROFILE_READINESS,
  HR_ACTION_ENGINE_BOUNDARY_CONTRACT,
  HR_ACTION_EVENT_DEFINITIONS,
  HR_ACTION_FOUNDATION_TABLES,
  HR_ACTION_PAYROLL_READINESS,
  HR_ACTION_POLICY_INTEGRATION,
  HR_ACTION_POLICY_REF_KINDS,
  HR_ACTION_TIMELINE_INTEGRATION,
  HR_ACTION_TYPES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630175000_hr_action_engine_foundation.sql");

test("HR Action Foundation exposes action types, statuses, and effect targets", () => {
  assert.equal(HR_ACTION_TYPES.length, 35);
  assert.equal(HR_ACTION_DOCUMENT_STATUSES.length, 8);
  assert.equal(HR_ACTION_EFFECT_TARGETS.length, 10);
  assert.equal(HR_ACTION_POLICY_REF_KINDS.length, 9);
});

test("HR action document contract is document-first without direct operational mutation", () => {
  const document = defineHrActionDocument({
    actionType: "salary_revision",
    approvalPolicyRef: "approval-policy-1",
    applyRuntimeImplemented: false,
    branchId: null,
    companyId: "company-1",
    directOperationalMutation: false,
    documentNumber: "HRA-2026-00042",
    effectiveDate: "2026-02-01",
    employeeId: "employee-1",
    employmentProfileId: "profile-1",
    metadata: { channel: "erp" },
    notes: "Annual salary revision.",
    policyVersionRef: "policy-version-1",
    priority: "normal",
    requestedBy: "user-1",
    requestedOn: "2026-01-15T10:00:00.000Z",
    sourceModule: "hr",
    sourceReference: "compensation-review-1",
    status: "draft",
    tenantId: "tenant-1",
    workflowInstanceRef: null,
    workflowRuntimeImplemented: false,
  });

  assert.equal(document.actionType, "salary_revision");
  assert.equal(document.directOperationalMutation, false);
  assert.equal(document.workflowRuntimeImplemented, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.hrActionsAreDocuments, true);
});

test("action payloads keep structured metadata without calculation runtime", () => {
  const payload = defineHrActionPayload({
    actionDocumentId: "action-1",
    branchId: null,
    calculationRuntimeImplemented: false,
    companyId: "company-1",
    payload: {
      effectiveDate: "2026-02-01",
      newPackageRef: "package-version-2",
      oldPackageRef: "package-version-1",
      reason: "Annual review",
    },
    payloadKind: "salary_revision",
    tenantId: "tenant-1",
  });

  assert.equal(payload.payloadKind, "salary_revision");
  assert.equal(payload.calculationRuntimeImplemented, false);
});

test("action effects declare intended downstream impacts as metadata only", () => {
  const effect = defineHrActionEffect({
    actionDocumentId: "action-1",
    applyRuntimeImplemented: false,
    branchId: null,
    companyId: "company-1",
    effectMetadata: { snapshotKind: "hr_action" },
    effectTarget: "payroll_snapshot",
    tenantId: "tenant-1",
  });

  const chain = createHrActionEffectChain("promotion");
  assert.equal(effect.effectTarget, "payroll_snapshot");
  assert.equal(effect.applyRuntimeImplemented, false);
  assert.deepEqual(chain, ["employment_profile", "timeline", "payroll_snapshot", "compensation"]);
});

test("action links connect documents to payroll, attendance, and compensation refs", () => {
  const link = defineHrActionLink({
    actionDocumentId: "action-1",
    branchId: null,
    companyId: "company-1",
    linkType: "attendance_day",
    linkedRecordId: "attendance-day-1",
    linkedRecordType: "hr_attendance_day",
    tenantId: "tenant-1",
  });

  assert.equal(link.linkType, "attendance_day");
  assert.equal(HR_ACTION_ATTENDANCE_READINESS.attendanceRecalculationImplemented, false);
});

test("policy integration references policy engine without duplicating policy logic", () => {
  assert.equal(HR_ACTION_POLICY_INTEGRATION.policyRefsOnly, true);
  assert.equal(HR_ACTION_POLICY_INTEGRATION.policiesDuplicatedInActions, false);
  assert.equal(HR_ACTION_POLICY_INTEGRATION.runtimePolicyEvaluationImplemented, false);
  assert.equal(HR_ACTION_POLICY_INTEGRATION.supportedPolicyKinds.includes("approval"), true);
});

test("payroll, compensation, and employment profile readiness avoid runtime mutation", () => {
  assert.equal(HR_ACTION_PAYROLL_READINESS.payrollRuntimeImplemented, false);
  assert.equal(HR_ACTION_PAYROLL_READINESS.supportedActionTypes.includes("bonus"), true);
  assert.equal(HR_ACTION_COMPENSATION_READINESS.compensationMutationImplemented, false);
  assert.equal(HR_ACTION_COMPENSATION_READINESS.referencesSalaryPackage, true);
  assert.equal(HR_ACTION_EMPLOYMENT_PROFILE_READINESS.directProfileUpdateImplemented, false);
  assert.equal(HR_ACTION_EMPLOYMENT_PROFILE_READINESS.targetFields.includes("manager"), true);
});

test("timeline and document engine integrations are readiness-only", () => {
  assert.equal(HR_ACTION_TIMELINE_INTEGRATION.publishesTimelineMetadata, true);
  assert.equal(HR_ACTION_TIMELINE_INTEGRATION.timelinePublisherRuntimeImplemented, false);
  assert.equal(HR_ACTION_DOCUMENT_ENGINE_INTEGRATION.documentNumberingReady, true);
  assert.equal(HR_ACTION_DOCUMENT_ENGINE_INTEGRATION.searchReadiness, true);
});

test("HR action foundation keeps workflow, approval execution, and apply engine disabled", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrActionEngineFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrActionWorkflows, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.workflowRuntimeImplemented, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.approvalExecutionImplemented, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.applyEngineImplemented, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.directOperationalEngineMutation, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
  assert.equal(HR_ACTION_ENGINE_BOUNDARY_CONTRACT.attendanceCalculationImplemented, false);
});

test("action permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.actions.view",
    "hr.actions.manage",
    "hr.actions.submit",
    "hr.actions.review",
    "hr.actions.approve",
    "hr.actions.apply",
    "hr.actions.cancel",
    "hr.actions.archive",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_ACTION_EVENT_DEFINITIONS.length, 8);
  assert.equal(HR_ACTION_AUDIT_ACTIONS.actionCreated, "hr.action.created");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.action-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.actionTables.length, 8);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.actions.import"), true);
});

test("HR action migration adds foundation tables, policy refs, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_ACTION_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_actions_are_documents",
    "direct_operational_mutation",
    "apply_runtime_implemented', false",
    "references public.hr_policy_versions",
    "references public.hr_employment_profiles",
    "timeline_publisher_runtime_implemented', false",
    "hr.actions.approve",
    "hr.actions.apply",
    "attendance_adjustment",
    "salary_revision",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "approval_execution_runtime",
    "apply_engine_runtime",
    "calculate_payroll",
    "calculate_attendance",
    "leave_balance_runtime",
    "finance_posting_runtime",
    "self_service",
    "manager_portal",
    "workflow_handler",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Action migration must not include ${forbidden}`);
  }
});

test("action public contracts do not implement workflow, calculation, or direct mutation", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/action-foundation.ts"), "utf8");

  for (const forbidden of [
    "executeApprovalWorkflow",
    "applyHrAction",
    "calculatePayroll",
    "calculateAttendance",
    "calculateLeaveBalance",
    "updateEmploymentProfileDirectly",
    "postToFinance",
    "workflowRuntimeHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Action contracts must not include ${forbidden}`);
  }
});
