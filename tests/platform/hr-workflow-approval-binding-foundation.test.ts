import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrActionApprovalBinding,
  defineHrActionApprovalRequestRef,
  defineHrActionApplyTriggerReadiness,
  defineHrActionDelegationReadiness,
  defineHrActionEscalationReadiness,
  defineHrActionSlaReadiness,
  defineHrActionWorkflowBinding,
  defineHrActionWorkflowInstanceRef,
  HR_ACTION_APPLY_TRIGGER_READINESS,
  HR_ACTION_APPROVAL_MATRIX_CONDITIONS,
  HR_ACTION_APPROVAL_PLATFORM_STATUSES,
  HR_ACTION_APPROVAL_STATUS_MAP,
  HR_ACTION_BINDING_STATUSES,
  HR_ACTION_DELEGATION_READINESS_FIELDS,
  HR_ACTION_ESCALATION_READINESS_FIELDS,
  HR_ACTION_SLA_READINESS_FIELDS,
  HR_ACTION_TYPE_WORKFLOW_BINDING_RULES,
  HR_ACTION_WORKFLOW_APPROVAL_AUDIT_ACTIONS,
  HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT,
  HR_ACTION_WORKFLOW_APPROVAL_EVENT_DEFINITIONS,
  HR_ACTION_WORKFLOW_APPROVAL_FOUNDATION_TABLES,
  HR_ACTION_WORKFLOW_APPROVAL_PLATFORM_INTEGRATION,
  HR_ACTION_WORKFLOW_PLATFORM_STATUSES,
  HR_ACTION_WORKFLOW_STATUS_MAP,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  hrAppManifest,
} from "@/features/hr/server-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630183000_hr_workflow_approval_binding_foundation.sql");

test("HR Workflow & Approval Binding exposes binding statuses and platform status maps", () => {
  assert.equal(HR_ACTION_BINDING_STATUSES.length, 4);
  assert.equal(HR_ACTION_WORKFLOW_PLATFORM_STATUSES.length, 5);
  assert.equal(HR_ACTION_APPROVAL_PLATFORM_STATUSES.length, 8);
  assert.equal(HR_ACTION_WORKFLOW_STATUS_MAP.length, 5);
  assert.equal(HR_ACTION_APPROVAL_STATUS_MAP.length, 8);
});

test("workflow binding contract references platform workflow without HR workflow runtime", () => {
  const binding = defineHrActionWorkflowBinding({
    actionType: "leave",
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    status: "active",
    statusMapping: { completed: "approved", in_review: "under_review" },
    tenantId: "tenant-1",
    workflowDefinitionRef: "platform.workflow.hr.leave",
    workflowInstanceRef: null,
    workflowRuntimeImplemented: false,
    workflowTemplateRef: "hr.workflow.leave",
  });

  assert.equal(binding.workflowRuntimeImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.platformWorkflowEngineOwner, true);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.hrWorkflowEngineImplemented, false);
});

test("approval binding contract references platform approval without HR approval runtime", () => {
  const binding = defineHrActionApprovalBinding({
    actionType: "loan",
    approvalDefinitionRef: "platform.approval.hr.loan",
    approvalPolicyVersionRef: "policy-version-1",
    approvalRequestRef: null,
    approvalRuntimeImplemented: false,
    approvalStatusMapping: { approved: "approved", rejected: "rejected" },
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(binding.approvalRuntimeImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.platformApprovalEngineOwner, true);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.hrApprovalEngineImplemented, false);
});

test("action type workflow binding rules define readiness-only stage metadata", () => {
  assert.equal(HR_ACTION_TYPE_WORKFLOW_BINDING_RULES.length, 4);

  const leave = HR_ACTION_TYPE_WORKFLOW_BINDING_RULES.find((rule) => rule.actionType === "leave");
  const loan = HR_ACTION_TYPE_WORKFLOW_BINDING_RULES.find((rule) => rule.actionType === "loan");
  const salaryRevision = HR_ACTION_TYPE_WORKFLOW_BINDING_RULES.find((rule) => rule.actionType === "salary_revision");
  const attendanceAdjustment = HR_ACTION_TYPE_WORKFLOW_BINDING_RULES.find((rule) => rule.actionType === "attendance_adjustment");

  assert.deepEqual(leave?.stageLabels, ["Submit", "Manager Review", "HR Review", "Approved"]);
  assert.deepEqual(loan?.stageLabels, ["Submit", "Manager", "HR", "Finance", "Approved"]);
  assert.deepEqual(salaryRevision?.stageLabels, ["Manager", "HR", "Finance", "CEO"]);
  assert.deepEqual(attendanceAdjustment?.stageLabels, ["Employee/Manager", "Manager Review", "HR"]);

  for (const rule of HR_ACTION_TYPE_WORKFLOW_BINDING_RULES) {
    assert.equal(rule.platformWorkflowOwned, true);
    assert.equal(rule.workflowRuntimeImplemented, false);
  }
});

test("approval matrix readiness declares matrix conditions without runtime", () => {
  assert.equal(HR_ACTION_APPROVAL_MATRIX_CONDITIONS.length, 1);
  assert.equal(HR_ACTION_APPROVAL_MATRIX_CONDITIONS[0]?.matrixRuntimeImplemented, false);
  assert.equal(HR_ACTION_APPROVAL_MATRIX_CONDITIONS[0]?.fields.length, 12);
  assert.equal(HR_ACTION_APPROVAL_MATRIX_CONDITIONS[0]?.fields.includes("payroll_impact"), true);
});

test("status mapping links platform workflow and approval states to HR action statuses", () => {
  const workflowDraft = HR_ACTION_WORKFLOW_STATUS_MAP.find((entry) => entry.platformWorkflowStatus === "draft");
  const approvalGranted = HR_ACTION_APPROVAL_STATUS_MAP.find((entry) => entry.platformApprovalStatus === "approved");
  const workflowCancelled = HR_ACTION_WORKFLOW_STATUS_MAP.find((entry) => entry.platformWorkflowStatus === "cancelled");

  assert.equal(workflowDraft?.hrActionStatus, "draft");
  assert.equal(approvalGranted?.hrActionStatus, "approved");
  assert.equal(approvalGranted?.applyReadinessEligible, true);
  assert.equal(workflowCancelled?.hrActionStatus, "cancelled");
});

test("apply trigger readiness marks approved actions eligible without apply execution", () => {
  const leave = HR_ACTION_APPLY_TRIGGER_READINESS.find((entry) => entry.actionType === "leave");
  const salaryRevision = HR_ACTION_APPLY_TRIGGER_READINESS.find((entry) => entry.actionType === "salary_revision");

  assert.equal(leave?.applyRequired, true);
  assert.equal(leave?.dryRunRequired, true);
  assert.equal(leave?.applyRuntimeImplemented, false);
  assert.equal(salaryRevision?.backgroundJobRequired, true);
  assert.equal(salaryRevision?.autoApplyAllowed, false);

  const trigger = defineHrActionApplyTriggerReadiness({
    actionType: "attendance_adjustment",
    applyRequired: true,
    applyRuntimeImplemented: false,
    autoApplyAllowed: false,
    backgroundJobRequired: false,
    dryRunRequired: true,
    manualApplyRequired: false,
  });

  assert.equal(trigger.manualApplyRequired, false);
});

test("delegation, escalation, and SLA readiness avoid runtime execution", () => {
  assert.equal(HR_ACTION_DELEGATION_READINESS_FIELDS.length, 6);
  assert.equal(HR_ACTION_ESCALATION_READINESS_FIELDS.length, 5);
  assert.equal(HR_ACTION_SLA_READINESS_FIELDS.length, 4);

  const delegation = defineHrActionDelegationReadiness({
    delegatedFrom: "user-1",
    delegatedTo: "user-2",
    delegationRuntimeImplemented: false,
    delegationScope: "approval_step",
    effectiveFrom: "2026-01-01",
    reason: "Vacation coverage",
  });

  const escalation = defineHrActionEscalationReadiness({
    dueAfterHours: 24,
    escalateToRole: "hr",
    notificationRuntimeImplemented: false,
  });

  const sla = defineHrActionSlaReadiness({
    breachSeverity: "high",
    expectedCompletionHours: 72,
    expectedResponseHours: 24,
    slaRuntimeImplemented: false,
  });

  assert.equal(delegation.delegationRuntimeImplemented, false);
  assert.equal(escalation.notificationRuntimeImplemented, false);
  assert.equal(sla.slaRuntimeImplemented, false);
});

test("instance and request refs link documents to platform refs without state mutation runtime", () => {
  const workflowRef = defineHrActionWorkflowInstanceRef({
    actionDocumentId: "action-1",
    branchId: null,
    companyId: "company-1",
    currentPlatformStatus: "in_review",
    linkedAt: "2026-01-20T10:00:00.000Z",
    mappedHrActionStatus: "under_review",
    tenantId: "tenant-1",
    workflowDefinitionRef: "platform.workflow.hr.leave",
    workflowInstanceRef: "workflow-instance-1",
    workflowRuntimeImplemented: false,
  });

  const approvalRef = defineHrActionApprovalRequestRef({
    actionDocumentId: "action-1",
    approvalDefinitionRef: "platform.approval.hr.loan",
    approvalRequestRef: "approval-request-1",
    approvalRuntimeImplemented: false,
    branchId: null,
    companyId: "company-1",
    currentPlatformStatus: "in_progress",
    linkedAt: "2026-01-20T10:00:00.000Z",
    mappedHrActionStatus: "under_review",
    tenantId: "tenant-1",
  });

  assert.equal(workflowRef.workflowRuntimeImplemented, false);
  assert.equal(approvalRef.approvalRuntimeImplemented, false);
});

test("HR workflow & approval binding keeps platform ownership and disables HR runtime engines", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrWorkflowApprovalBindingFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrWorkflowApprovalBindingRuntime, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrActionWorkflows, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.workflowExecutionRuntimeImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.approvalDecisionRuntimeImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.applyExecutionImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT.stateMutationRuntimeImplemented, false);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_PLATFORM_INTEGRATION.referencesPlatformWorkflowDefinitions, true);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_PLATFORM_INTEGRATION.referencesPlatformApprovalDefinitions, true);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_PLATFORM_INTEGRATION.referencesHrActionApplyEngine, true);
});

test("workflow & approval permissions, events, audit actions, and platform contracts are registered", () => {
  const expectedPermissions = [
    "hr.actions.workflow.view",
    "hr.actions.workflow.manage",
    "hr.actions.approval.view",
    "hr.actions.approval.manage",
    "hr.actions.approval_matrix.view",
    "hr.actions.approval_matrix.manage",
    "hr.actions.delegation.view",
    "hr.actions.delegation.manage",
  ];
  for (const permission of expectedPermissions) {
    assert.ok(HR_PERMISSION_LIST.map(String).includes(permission));
  }
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_EVENT_DEFINITIONS.length, 8);
  assert.equal(HR_ACTION_WORKFLOW_APPROVAL_AUDIT_ACTIONS.workflowBindingCreated, "hr.action.workflow-binding.created");
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.workflow-approval-binding-foundation"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.workflowApprovalTables.length, 8);
  assert.equal(HR_FOUNDATION_CONTRACTS.imports.some((contract) => contract.key === "hr.actions.workflow-approval.import"), true);
  assert.equal(HR_FOUNDATION_CONTRACTS.search.searchableEntities.some((entity) => entity.entityType === "hr_action_workflow_binding"), true);
});

test("HR workflow & approval migration adds binding tables, platform refs, and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_ACTION_WORKFLOW_APPROVAL_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }

  for (const fragment of [
    "hr_action_binding_status",
    "hr_action_workflow_platform_status",
    "hr_action_approval_platform_status",
    "references public.hr_action_documents",
    "references public.hr_policy_versions",
    "workflow_runtime_implemented', false",
    "approval_runtime_implemented', false",
    "platform_workflow_engine_owner', true",
    "platform_approval_engine_owner', true",
    "hr_workflow_engine_implemented', false",
    "hr.actions.workflow.view",
    "hr.actions.approval.manage",
    "hr.actions.approval_matrix.view",
    "hr.actions.delegation.manage",
    "matrix_runtime_implemented', false",
    "delegation_runtime_implemented', false",
    "sla_runtime_implemented', false",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }

  for (const forbidden of [
    "workflow_execution_runtime",
    "approval_decision_runtime",
    "apply_engine_runtime",
    "hr_workflow_engine_runtime",
    "hr_approval_engine_runtime",
    "executeTransition",
    "decideApproval",
    "mutate_hr_action_status",
    "self_service",
    "manager_portal",
  ]) {
    assert.equal(sql.includes(forbidden), false, `Binding migration must not include ${forbidden}`);
  }
});

test("workflow & approval public contracts do not implement HR workflow or approval runtime", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/workflow-approval-binding-foundation.ts"), "utf8");

  for (const forbidden of [
    "defineWorkflow",
    "defineApproval",
    "executeTransition",
    "decideApproval",
    "requestApproval",
    "createHrWorkflowEngine",
    "createHrApprovalEngine",
    "mutateEmploymentProfile",
    "applyHrActionEffects",
    "workflowRuntimeHandler",
    "approvalRuntimeHandler",
  ]) {
    assert.equal(source.includes(forbidden), false, `Binding contracts must not include ${forbidden}`);
  }
});
