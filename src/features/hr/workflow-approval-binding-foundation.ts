import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import type { HrActionDocumentStatus, HrActionType } from "./action-foundation";
import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrActionBindingStatus = "draft" | "active" | "inactive" | "archived";

export type HrActionWorkflowPlatformStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "completed"
  | "cancelled";

export type HrActionApprovalPlatformStatus =
  | "requested"
  | "assigned"
  | "in_progress"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "completed";

export type HrActionDelegationScope = "action_type" | "approval_step" | "company" | "branch" | "department";

export type HrActionEscalationTargetRole =
  | "manager"
  | "hr"
  | "finance"
  | "ceo"
  | "custom_role";

export type HrActionSlaBreachSeverity = "low" | "medium" | "high" | "critical";

export type HrActionBindingScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrActionWorkflowBindingDefinition = HrActionBindingScope & Readonly<{
  actionType: HrActionType;
  workflowDefinitionRef: string;
  workflowTemplateRef: string;
  workflowInstanceRef?: string | null;
  statusMapping: Readonly<Record<string, HrActionDocumentStatus>>;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrActionBindingStatus;
  metadata?: Readonly<Record<string, unknown>>;
  workflowRuntimeImplemented: false;
}>;

export type HrActionWorkflowTemplateDefinition = Readonly<{
  actionType: HrActionType;
  templateKey: string;
  label: string;
  workflowDefinitionRef: string;
  stageLabels: readonly string[];
  platformWorkflowOwned: true;
  workflowRuntimeImplemented: false;
}>;

export type HrActionWorkflowInstanceRefDefinition = HrActionBindingScope & Readonly<{
  actionDocumentId: string;
  workflowDefinitionRef: string;
  workflowInstanceRef: string;
  currentPlatformStatus: HrActionWorkflowPlatformStatus;
  mappedHrActionStatus: HrActionDocumentStatus;
  linkedAt: string;
  workflowRuntimeImplemented: false;
}>;

export type HrActionWorkflowStatusMapEntry = Readonly<{
  platformWorkflowStatus: HrActionWorkflowPlatformStatus;
  hrActionStatus: HrActionDocumentStatus;
  applyReadinessEligible?: boolean;
}>;

export type HrActionApprovalBindingDefinition = HrActionBindingScope & Readonly<{
  actionType: HrActionType;
  approvalPolicyVersionRef: string;
  approvalDefinitionRef: string;
  approvalRequestRef?: string | null;
  approvalStatusMapping: Readonly<Record<string, HrActionDocumentStatus>>;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrActionBindingStatus;
  metadata?: Readonly<Record<string, unknown>>;
  approvalRuntimeImplemented: false;
}>;

export type HrActionApprovalPolicyRefDefinition = Readonly<{
  actionType: HrActionType;
  policyVersionRef: string;
  approvalDefinitionRef: string;
  platformApprovalOwned: true;
  approvalRuntimeImplemented: false;
}>;

export type HrActionApprovalRequestRefDefinition = HrActionBindingScope & Readonly<{
  actionDocumentId: string;
  approvalDefinitionRef: string;
  approvalRequestRef: string;
  currentPlatformStatus: HrActionApprovalPlatformStatus;
  mappedHrActionStatus: HrActionDocumentStatus;
  linkedAt: string;
  approvalRuntimeImplemented: false;
}>;

export type HrActionApprovalStatusMapEntry = Readonly<{
  platformApprovalStatus: HrActionApprovalPlatformStatus;
  hrActionStatus: HrActionDocumentStatus;
  applyReadinessEligible?: boolean;
}>;

export type HrActionApprovalMatrixConditionDefinition = Readonly<{
  key: string;
  fields: readonly (
    | "action_type"
    | "company"
    | "branch"
    | "department"
    | "grade"
    | "position"
    | "amount_range"
    | "leave_days_range"
    | "payroll_impact"
    | "attendance_impact"
    | "requester_role"
    | "employee_group"
  )[];
  matrixRuntimeImplemented: false;
}>;

export type HrActionApplyTriggerReadinessDefinition = Readonly<{
  actionType: HrActionType;
  applyRequired: boolean;
  autoApplyAllowed: boolean;
  manualApplyRequired: boolean;
  dryRunRequired: boolean;
  backgroundJobRequired: boolean;
  applyRuntimeImplemented: false;
}>;

export type HrActionDelegationReadinessDefinition = Readonly<{
  delegatedFrom: string;
  delegatedTo: string;
  delegationScope: HrActionDelegationScope;
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string | null;
  delegationRuntimeImplemented: false;
}>;

export type HrActionEscalationReadinessDefinition = Readonly<{
  dueAfterHours: number;
  escalateToRole?: HrActionEscalationTargetRole | null;
  escalateToUser?: string | null;
  escalationPolicyRef?: string | null;
  reminderPolicyRef?: string | null;
  notificationRuntimeImplemented: false;
}>;

export type HrActionSlaReadinessDefinition = Readonly<{
  expectedResponseHours: number;
  expectedCompletionHours: number;
  breachSeverity: HrActionSlaBreachSeverity;
  breachActionRef?: string | null;
  slaRuntimeImplemented: false;
}>;

export type HrActionWorkflowApprovalBindingBoundaryContract = Readonly<{
  key: string;
  platformWorkflowEngineOwner: true;
  platformApprovalEngineOwner: true;
  hrWorkflowEngineImplemented: false;
  hrApprovalEngineImplemented: false;
  workflowExecutionRuntimeImplemented: false;
  approvalDecisionRuntimeImplemented: false;
  applyExecutionImplemented: false;
  directOperationalMutation: false;
  stateMutationRuntimeImplemented: false;
  processingFlow: readonly [
    "hr_action_document",
    "platform_workflow_definition_instance",
    "platform_approval_definition_request",
    "hr_action_status_readiness",
    "hr_apply_engine_readiness",
  ];
}>;

export function defineHrActionWorkflowBinding<T extends HrActionWorkflowBindingDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionWorkflowTemplate<T extends HrActionWorkflowTemplateDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionWorkflowInstanceRef<T extends HrActionWorkflowInstanceRefDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApprovalBinding<T extends HrActionApprovalBindingDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApprovalPolicyRef<T extends HrActionApprovalPolicyRefDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApprovalRequestRef<T extends HrActionApprovalRequestRefDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApplyTriggerReadiness<T extends HrActionApplyTriggerReadinessDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionDelegationReadiness<T extends HrActionDelegationReadinessDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionEscalationReadiness<T extends HrActionEscalationReadinessDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionSlaReadiness<T extends HrActionSlaReadinessDefinition>(definition: T): T {
  return definition;
}

export const HR_ACTION_BINDING_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
] as const satisfies readonly HrActionBindingStatus[];

export const HR_ACTION_WORKFLOW_PLATFORM_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "completed",
  "cancelled",
] as const satisfies readonly HrActionWorkflowPlatformStatus[];

export const HR_ACTION_APPROVAL_PLATFORM_STATUSES = [
  "requested",
  "assigned",
  "in_progress",
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "completed",
] as const satisfies readonly HrActionApprovalPlatformStatus[];

export const HR_ACTION_WORKFLOW_STATUS_MAP: readonly HrActionWorkflowStatusMapEntry[] = [
  { hrActionStatus: "draft", platformWorkflowStatus: "draft" },
  { hrActionStatus: "submitted", platformWorkflowStatus: "submitted" },
  { hrActionStatus: "under_review", platformWorkflowStatus: "in_review" },
  { applyReadinessEligible: true, hrActionStatus: "approved", platformWorkflowStatus: "completed" },
  { hrActionStatus: "cancelled", platformWorkflowStatus: "cancelled" },
];

export const HR_ACTION_APPROVAL_STATUS_MAP: readonly HrActionApprovalStatusMapEntry[] = [
  { hrActionStatus: "submitted", platformApprovalStatus: "requested" },
  { hrActionStatus: "under_review", platformApprovalStatus: "assigned" },
  { hrActionStatus: "under_review", platformApprovalStatus: "in_progress" },
  { applyReadinessEligible: true, hrActionStatus: "approved", platformApprovalStatus: "approved" },
  { hrActionStatus: "rejected", platformApprovalStatus: "rejected" },
  { hrActionStatus: "under_review", platformApprovalStatus: "returned" },
  { hrActionStatus: "cancelled", platformApprovalStatus: "cancelled" },
  { applyReadinessEligible: true, hrActionStatus: "approved", platformApprovalStatus: "completed" },
];

export const HR_ACTION_TYPE_WORKFLOW_BINDING_RULES: readonly HrActionWorkflowTemplateDefinition[] = [
  defineHrActionWorkflowTemplate({
    actionType: "leave",
    label: "Leave Workflow",
    platformWorkflowOwned: true,
    stageLabels: ["Submit", "Manager Review", "HR Review", "Approved"],
    templateKey: "hr.workflow.leave",
    workflowDefinitionRef: "platform.workflow.hr.leave",
    workflowRuntimeImplemented: false,
  }),
  defineHrActionWorkflowTemplate({
    actionType: "loan",
    label: "Loan Workflow",
    platformWorkflowOwned: true,
    stageLabels: ["Submit", "Manager", "HR", "Finance", "Approved"],
    templateKey: "hr.workflow.loan",
    workflowDefinitionRef: "platform.workflow.hr.loan",
    workflowRuntimeImplemented: false,
  }),
  defineHrActionWorkflowTemplate({
    actionType: "salary_revision",
    label: "Salary Revision Workflow",
    platformWorkflowOwned: true,
    stageLabels: ["Manager", "HR", "Finance", "CEO"],
    templateKey: "hr.workflow.salary-revision",
    workflowDefinitionRef: "platform.workflow.hr.salary-revision",
    workflowRuntimeImplemented: false,
  }),
  defineHrActionWorkflowTemplate({
    actionType: "attendance_adjustment",
    label: "Attendance Adjustment Workflow",
    platformWorkflowOwned: true,
    stageLabels: ["Employee/Manager", "Manager Review", "HR"],
    templateKey: "hr.workflow.attendance-adjustment",
    workflowDefinitionRef: "platform.workflow.hr.attendance-adjustment",
    workflowRuntimeImplemented: false,
  }),
];

export const HR_ACTION_APPROVAL_MATRIX_CONDITIONS: readonly HrActionApprovalMatrixConditionDefinition[] = [
  {
    fields: [
      "action_type",
      "company",
      "branch",
      "department",
      "grade",
      "position",
      "amount_range",
      "leave_days_range",
      "payroll_impact",
      "attendance_impact",
      "requester_role",
      "employee_group",
    ],
    key: "hr.actions.approval-matrix.conditions",
    matrixRuntimeImplemented: false,
  },
];

export const HR_ACTION_APPLY_TRIGGER_READINESS: readonly HrActionApplyTriggerReadinessDefinition[] = [
  defineHrActionApplyTriggerReadiness({
    actionType: "leave",
    applyRequired: true,
    applyRuntimeImplemented: false,
    autoApplyAllowed: false,
    backgroundJobRequired: false,
    dryRunRequired: true,
    manualApplyRequired: true,
  }),
  defineHrActionApplyTriggerReadiness({
    actionType: "loan",
    applyRequired: true,
    applyRuntimeImplemented: false,
    autoApplyAllowed: false,
    backgroundJobRequired: true,
    dryRunRequired: true,
    manualApplyRequired: true,
  }),
  defineHrActionApplyTriggerReadiness({
    actionType: "salary_revision",
    applyRequired: true,
    applyRuntimeImplemented: false,
    autoApplyAllowed: false,
    backgroundJobRequired: true,
    dryRunRequired: true,
    manualApplyRequired: true,
  }),
  defineHrActionApplyTriggerReadiness({
    actionType: "attendance_adjustment",
    applyRequired: true,
    applyRuntimeImplemented: false,
    autoApplyAllowed: false,
    backgroundJobRequired: false,
    dryRunRequired: true,
    manualApplyRequired: false,
  }),
];

export const HR_ACTION_DELEGATION_READINESS_FIELDS = [
  "delegated_from",
  "delegated_to",
  "delegation_scope",
  "effective_from",
  "effective_to",
  "reason",
] as const;

export const HR_ACTION_ESCALATION_READINESS_FIELDS = [
  "due_after_hours",
  "escalate_to_role",
  "escalate_to_user",
  "escalation_policy_ref",
  "reminder_policy_ref",
] as const;

export const HR_ACTION_SLA_READINESS_FIELDS = [
  "expected_response_hours",
  "expected_completion_hours",
  "breach_severity",
  "breach_action_ref",
] as const;

export const HR_ACTION_WORKFLOW_APPROVAL_PLATFORM_INTEGRATION = {
  approvalDecisionRuntimeImplemented: false,
  approvalEngineModuleKey: "platform",
  hrApprovalEngineImplemented: false,
  hrWorkflowEngineImplemented: false,
  key: "hr.actions.workflow-approval.platform-integration",
  notificationReadinessOnly: true,
  platformApprovalEngineOwner: true,
  platformWorkflowEngineOwner: true,
  referencesHrActionApplyEngine: true,
  referencesHrActionEngine: true,
  referencesHrPolicyEngine: true,
  referencesPlatformApprovalDefinitions: true,
  referencesPlatformWorkflowDefinitions: true,
  stateMutationRuntimeImplemented: false,
  workflowExecutionRuntimeImplemented: false,
} as const;

export const HR_ACTION_WORKFLOW_APPROVAL_BINDING_BOUNDARY_CONTRACT: HrActionWorkflowApprovalBindingBoundaryContract = {
  approvalDecisionRuntimeImplemented: false,
  applyExecutionImplemented: false,
  directOperationalMutation: false,
  hrApprovalEngineImplemented: false,
  hrWorkflowEngineImplemented: false,
  key: "hr.actions.workflow-approval.binding.boundary",
  platformApprovalEngineOwner: true,
  platformWorkflowEngineOwner: true,
  processingFlow: [
    "hr_action_document",
    "platform_workflow_definition_instance",
    "platform_approval_definition_request",
    "hr_action_status_readiness",
    "hr_apply_engine_readiness",
  ],
  stateMutationRuntimeImplemented: false,
  workflowExecutionRuntimeImplemented: false,
};

const hrWorkflowApprovalImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: true,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_ACTION_WORKFLOW_APPROVAL_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionType", label: "Action Type", required: true },
    { dataType: "text", key: "workflowDefinitionRef", label: "Workflow Definition Ref" },
    { dataType: "text", key: "approvalDefinitionRef", label: "Approval Definition Ref" },
  ],
  key: "hr.actions.workflow-approval.import",
  label: "HR Workflow & Approval Binding Import",
  mappings: [
    { key: "action-type", sourceColumn: "Action Type", targetField: "actionType" },
    { key: "workflow-definition-ref", sourceColumn: "Workflow Definition Ref", targetField: "workflowDefinitionRef" },
    { key: "approval-definition-ref", sourceColumn: "Approval Definition Ref", targetField: "approvalDefinitionRef" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { bindingRuntimeImplemented: false, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkflowApprovalImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "actionType", key: "action-type-required", message: "Action type is required.", severity: "error", type: "required" },
  ],
});

export const HR_ACTION_WORKFLOW_APPROVAL_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionType", label: "Action Type", order: 1, sourceField: "actionType" },
    { dataType: "text", key: "workflowDefinitionRef", label: "Workflow Definition Ref", order: 2, sourceField: "workflowDefinitionRef" },
    { dataType: "text", key: "approvalDefinitionRef", label: "Approval Definition Ref", order: 3, sourceField: "approvalDefinitionRef" },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.actions.workflow-approval.export",
  label: "HR Workflow & Approval Binding Export",
  mappings: [
    { key: "action-type", sourceField: "actionType", targetColumn: "Action Type" },
    { key: "workflow-definition-ref", sourceField: "workflowDefinitionRef", targetColumn: "Workflow Definition Ref" },
    { key: "approval-definition-ref", sourceField: "approvalDefinitionRef", targetColumn: "Approval Definition Ref" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-workflow-approval-binding-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkflowApprovalImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_ACTION_WORKFLOW_APPROVAL_EVENT_DEFINITIONS = [
  "HRActionWorkflowBound",
  "HRActionApprovalBound",
  "HRActionWorkflowStarted",
  "HRActionApprovalRequested",
  "HRActionApprovalGranted",
  "HRActionApprovalRejected",
  "HRActionWorkflowCompleted",
  "HRActionEligibleForApply",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for HR Workflow & Approval Binding Foundation. No workflow execution, approval decision, or apply runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_ACTION_WORKFLOW_APPROVAL_AUDIT_ACTIONS = {
  applyTriggerMarked: defineAuditAction("hr.action.apply-trigger.marked"),
  approvalBindingCreated: defineAuditAction("hr.action.approval-binding.created"),
  approvalRequestLinked: defineAuditAction("hr.action.approval-request.linked"),
  statusMappingCreated: defineAuditAction("hr.action.status-mapping.created"),
  workflowBindingCreated: defineAuditAction("hr.action.workflow-binding.created"),
  workflowInstanceLinked: defineAuditAction("hr.action.workflow-instance.linked"),
} as const;

export const HR_ACTION_WORKFLOW_APPROVAL_FOUNDATION_TABLES = [
  "hr_action_workflow_bindings",
  "hr_action_workflow_instance_refs",
  "hr_action_approval_bindings",
  "hr_action_approval_request_refs",
  "hr_action_approval_matrix_refs",
  "hr_action_delegation_refs",
  "hr_action_escalation_refs",
  "hr_action_sla_refs",
] as const;
