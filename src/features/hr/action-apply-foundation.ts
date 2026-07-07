import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import type { HrActionEffectTarget, HrActionType } from "./action-foundation";
import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrActionApplyMode = "dry_run" | "validate_only" | "apply" | "rollback_simulation";

export type HrActionApplyRequestStatus =
  | "pending"
  | "validating"
  | "dry_run_completed"
  | "ready_to_apply"
  | "applying"
  | "applied"
  | "failed"
  | "cancelled"
  | "rollback_required";

export type HrActionApplyEffectStatus =
  | "pending"
  | "validated"
  | "skipped"
  | "dry_run_ok"
  | "ready"
  | "applied"
  | "failed"
  | "rollback_ready"
  | "rollback_completed";

export type HrActionApplyConflictType =
  | "overlapping_employment_profile_change"
  | "salary_revision_conflict"
  | "transfer_conflict"
  | "attendance_locked"
  | "payroll_locked"
  | "duplicate_action"
  | "policy_version_expired"
  | "employee_inactive"
  | "position_closed"
  | "cost_center_closed";

export type HrActionApplyRollbackReadiness =
  | "reverse_effect_possible"
  | "correction_action_required"
  | "rollback_not_allowed"
  | "payroll_retro_required"
  | "manual_review_required";

export type HrActionApplyScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrActionApplyRequestDefinition = HrActionApplyScope & Readonly<{
  actionDocumentId: string;
  employeeId: string;
  employmentProfileId: string;
  requestedBy: string;
  requestedAt: string;
  applyMode: HrActionApplyMode;
  effectiveDate: string;
  status: HrActionApplyRequestStatus;
  correlationId: string;
  metadata?: Readonly<Record<string, unknown>>;
  applyRuntimeImplemented: false;
}>;

export type HrActionApplyEffectDefinition = HrActionApplyScope & Readonly<{
  applyRequestId: string;
  actionDocumentId: string;
  actionEffectId: string;
  effectTarget: HrActionEffectTarget;
  effectOrder: number;
  handlerKey: string;
  status: HrActionApplyEffectStatus;
  validationResult?: Readonly<Record<string, unknown>> | null;
  dryRunResult?: Readonly<Record<string, unknown>> | null;
  applyResult?: Readonly<Record<string, unknown>> | null;
  rollbackMetadata?: Readonly<Record<string, unknown>> | null;
  idempotencyKey: string;
  applyRuntimeImplemented: false;
}>;

export type HrActionApplyHandlerDefinition = Readonly<{
  handlerKey: string;
  target: HrActionEffectTarget;
  supportedActionTypes: readonly HrActionType[];
  requiredPermissions: readonly string[];
  idempotent: true;
  supportsDryRun: true;
  supportsRollback: boolean;
  orderingGroup: number;
  handlerRuntimeImplemented: false;
}>;

export type HrActionApplyDryRunResult = Readonly<{
  wouldApply: boolean;
  affectedRecords: readonly Readonly<Record<string, unknown>>[];
  conflicts: readonly Readonly<Record<string, unknown>>[];
  warnings: readonly string[];
  estimatedPayrollImpact?: Readonly<Record<string, unknown>> | null;
  timelinePreview?: readonly Readonly<Record<string, unknown>>[];
  requiredPermissions: readonly string[];
  missingPermissions: readonly string[];
  simulationRuntimeImplemented: false;
}>;

export type HrActionApplyResultDefinition = HrActionApplyScope & Readonly<{
  applyRequestId: string;
  actionDocumentId: string;
  appliedEffects: readonly string[];
  skippedEffects: readonly string[];
  failedEffects: readonly string[];
  warnings: readonly string[];
  conflicts: readonly Readonly<Record<string, unknown>>[];
  timelineRefs: readonly string[];
  auditRefs: readonly string[];
  eventRefs: readonly string[];
  snapshotImpactRefs: readonly string[];
  applyRuntimeImplemented: false;
}>;

export type HrActionApplyEngineBoundaryContract = Readonly<{
  key: string;
  approvedActionRequiredBeforeApply: true;
  directOperationalMutation: false;
  applyRuntimeImplemented: false;
  dryRunSimulationRuntimeImplemented: false;
  rollbackRuntimeImplemented: false;
  workflowRuntimeImplemented: false;
  approvalExecutionImplemented: false;
  payrollCalculationImplemented: false;
  attendanceCalculationImplemented: false;
  financePostingImplemented: false;
  processingFlow: readonly [
    "apply_request_created",
    "validate_effects",
    "dry_run",
    "apply_effects_in_order",
    "record_apply_result",
    "publish_events",
    "timeline_audit",
    "snapshot_impact_readiness",
  ];
}>;

export function defineHrActionApplyRequest<T extends HrActionApplyRequestDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApplyEffect<T extends HrActionApplyEffectDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApplyHandler<T extends HrActionApplyHandlerDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionApplyResult<T extends HrActionApplyResultDefinition>(definition: T): T {
  return definition;
}

export function createHrActionApplyDryRunResult(input: {
  wouldApply: boolean;
  affectedRecords?: readonly Readonly<Record<string, unknown>>[];
  conflicts?: readonly Readonly<Record<string, unknown>>[];
  warnings?: readonly string[];
  estimatedPayrollImpact?: Readonly<Record<string, unknown>> | null;
  timelinePreview?: readonly Readonly<Record<string, unknown>>[];
  requiredPermissions?: readonly string[];
  missingPermissions?: readonly string[];
}): HrActionApplyDryRunResult {
  return {
    affectedRecords: input.affectedRecords ?? [],
    conflicts: input.conflicts ?? [],
    estimatedPayrollImpact: input.estimatedPayrollImpact ?? null,
    missingPermissions: input.missingPermissions ?? [],
    requiredPermissions: input.requiredPermissions ?? [],
    simulationRuntimeImplemented: false,
    timelinePreview: input.timelinePreview ?? [],
    warnings: input.warnings ?? [],
    wouldApply: input.wouldApply,
  };
}

export function buildHrActionApplyIdempotencyKey(input: {
  actionDocumentId: string;
  actionEffectId: string;
  effectTarget: HrActionEffectTarget;
}): string {
  return `${input.actionDocumentId}:${input.actionEffectId}:${input.effectTarget}`;
}

export const HR_ACTION_APPLY_MODES = [
  "dry_run",
  "validate_only",
  "apply",
  "rollback_simulation",
] as const satisfies readonly HrActionApplyMode[];

export const HR_ACTION_APPLY_REQUEST_STATUSES = [
  "pending",
  "validating",
  "dry_run_completed",
  "ready_to_apply",
  "applying",
  "applied",
  "failed",
  "cancelled",
  "rollback_required",
] as const satisfies readonly HrActionApplyRequestStatus[];

export const HR_ACTION_APPLY_EFFECT_STATUSES = [
  "pending",
  "validated",
  "skipped",
  "dry_run_ok",
  "ready",
  "applied",
  "failed",
  "rollback_ready",
  "rollback_completed",
] as const satisfies readonly HrActionApplyEffectStatus[];

export const HR_ACTION_APPLY_CONFLICT_TYPES = [
  "overlapping_employment_profile_change",
  "salary_revision_conflict",
  "transfer_conflict",
  "attendance_locked",
  "payroll_locked",
  "duplicate_action",
  "policy_version_expired",
  "employee_inactive",
  "position_closed",
  "cost_center_closed",
] as const satisfies readonly HrActionApplyConflictType[];

export const HR_ACTION_APPLY_ROLLBACK_READINESS = [
  "reverse_effect_possible",
  "correction_action_required",
  "rollback_not_allowed",
  "payroll_retro_required",
  "manual_review_required",
] as const satisfies readonly HrActionApplyRollbackReadiness[];

export const HR_ACTION_APPLY_VALIDATION_RULES = [
  "action_status_must_be_approved",
  "effective_date_valid",
  "employee_active",
  "employment_profile_exists",
  "target_profile_still_current",
  "policy_references_valid",
  "payroll_period_not_locked",
  "attendance_day_not_payroll_locked",
  "conflicting_action_absent",
  "duplicate_action_absent",
  "required_payload_present",
  "effect_target_supported",
] as const;

export const HR_ACTION_APPLY_ORDERING_STEPS = [
  { key: "validate_employee_profile", order: 1, orderingGroup: 1 },
  { key: "validate_policies", order: 2, orderingGroup: 1 },
  { key: "validate_effective_date", order: 3, orderingGroup: 1 },
  { key: "apply_organization_profile", order: 4, orderingGroup: 2, targets: ["organization", "employment_profile", "reporting_manager", "cost_center"] as const },
  { key: "apply_compensation", order: 5, orderingGroup: 3, targets: ["compensation"] as const },
  { key: "apply_workforce", order: 6, orderingGroup: 4, targets: ["workforce", "calendar"] as const },
  { key: "apply_attendance_references", order: 7, orderingGroup: 5, targets: ["attendance"] as const },
  { key: "register_payroll_snapshot_impact", order: 8, orderingGroup: 6, targets: ["payroll_snapshot"] as const },
  { key: "timeline", order: 9, orderingGroup: 7, targets: ["timeline"] as const },
  { key: "audit", order: 10, orderingGroup: 8 },
] as const;

export const HR_ACTION_APPLY_HANDLER_REGISTRY: readonly HrActionApplyHandlerDefinition[] = [
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.employment-profile",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 2,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["promotion", "transfer", "department_change", "manager_change", "position_change", "grade_change"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "employment_profile",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.organization",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 2,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["transfer", "department_change"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "organization",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.reporting-manager",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 2,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["manager_change", "transfer", "promotion"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "reporting_manager",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.cost-center",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 2,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["transfer"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "cost_center",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.compensation",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 3,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["salary_revision", "compensation_change", "allowance_assignment", "deduction_assignment", "bonus", "loan", "advance"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "compensation",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.workforce",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 4,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["shift_change", "training", "mission"],
    supportsDryRun: true,
    supportsRollback: false,
    target: "workforce",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.calendar",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 4,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["leave", "training", "mission"],
    supportsDryRun: true,
    supportsRollback: false,
    target: "calendar",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.attendance",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 5,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["attendance_adjustment", "leave", "shift_change"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "attendance",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.payroll-snapshot",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 6,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyExecute],
    supportedActionTypes: ["salary_revision", "bonus", "allowance_assignment", "deduction_assignment", "attendance_adjustment", "leave", "final_settlement"],
    supportsDryRun: true,
    supportsRollback: true,
    target: "payroll_snapshot",
  }),
  defineHrActionApplyHandler({
    handlerKey: "hr.apply.timeline",
    handlerRuntimeImplemented: false,
    idempotent: true,
    orderingGroup: 7,
    requiredPermissions: [HR_PERMISSIONS.actionsApplyView],
    supportedActionTypes: ["custom_hr_action"],
    supportsDryRun: true,
    supportsRollback: false,
    target: "timeline",
  }),
];

export const HR_ACTION_APPLY_ENGINE_BOUNDARY_CONTRACT: HrActionApplyEngineBoundaryContract = {
  approvalExecutionImplemented: false,
  applyRuntimeImplemented: false,
  approvedActionRequiredBeforeApply: true,
  attendanceCalculationImplemented: false,
  directOperationalMutation: false,
  dryRunSimulationRuntimeImplemented: false,
  financePostingImplemented: false,
  key: "hr.actions.apply.foundation.boundary",
  payrollCalculationImplemented: false,
  processingFlow: [
    "apply_request_created",
    "validate_effects",
    "dry_run",
    "apply_effects_in_order",
    "record_apply_result",
    "publish_events",
    "timeline_audit",
    "snapshot_impact_readiness",
  ],
  rollbackRuntimeImplemented: false,
  workflowRuntimeImplemented: false,
};

export const HR_ACTION_APPLY_IDEMPOTENCY_CONTRACT = {
  attemptCountField: "attempt_count",
  fields: ["idempotency_key", "first_applied_at", "last_attempted_at", "attempt_count", "result_hash"] as const,
  key: "hr.actions.apply.idempotency",
  sameActionEffectTargetMustNotApplyTwice: true,
} as const;

export const HR_ACTION_APPLY_PAYROLL_IMPACT_READINESS = {
  fields: [
    "affected_payroll_period_id",
    "affected_payroll_batch_id",
    "snapshot_impact_kind",
    "retro_adjustment_required",
    "payroll_lock_status",
    "correction_batch_readiness",
  ] as const,
  key: "hr.actions.apply.payroll-impact-readiness",
  payrollMutationImplemented: false,
} as const;

export const HR_ACTION_APPLY_ATTENDANCE_IMPACT_READINESS = {
  attendanceMutationImplemented: false,
  fields: [
    "affected_attendance_day_id",
    "attendance_lock_status",
    "recalculation_required",
    "adjustment_reference",
    "payroll_export_impact",
  ] as const,
  key: "hr.actions.apply.attendance-impact-readiness",
} as const;

const hrActionApplyImportExportSecurity = {
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

export const HR_ACTION_APPLY_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionDocumentId", label: "Action Document ID", required: true },
    { dataType: "text", key: "applyMode", label: "Apply Mode", required: true },
    { dataType: "text", key: "correlationId", label: "Correlation ID" },
  ],
  key: "hr.actions.apply.import",
  label: "HR Action Apply Foundation Import",
  mappings: [
    { key: "action-document-id", sourceColumn: "Action Document ID", targetField: "actionDocumentId" },
    { key: "apply-mode", sourceColumn: "Apply Mode", targetField: "applyMode" },
    { key: "correlation-id", sourceColumn: "Correlation ID", targetField: "correlationId" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { applyRuntimeImplemented: false, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrActionApplyImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "actionDocumentId", key: "action-document-required", message: "Action document is required.", severity: "error", type: "required" },
    { fieldKey: "applyMode", key: "apply-mode-required", message: "Apply mode is required.", severity: "error", type: "required" },
  ],
});

export const HR_ACTION_APPLY_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionDocumentId", label: "Action Document ID", order: 1, sourceField: "actionDocumentId" },
    { dataType: "text", key: "applyMode", label: "Apply Mode", order: 2, sourceField: "applyMode" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
    { dataType: "text", key: "correlationId", label: "Correlation ID", order: 4, sourceField: "correlationId" },
  ],
  key: "hr.actions.apply.export",
  label: "HR Action Apply Foundation Export",
  mappings: [
    { key: "action-document-id", sourceField: "actionDocumentId", targetColumn: "Action Document ID" },
    { key: "apply-mode", sourceField: "applyMode", targetColumn: "Apply Mode" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
    { key: "correlation-id", sourceField: "correlationId", targetColumn: "Correlation ID" },
  ],
  metadata: {
    fileNameTemplate: "hr-action-apply-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrActionApplyImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_ACTION_APPLY_EVENT_DEFINITIONS = [
  "HRActionApplyRequested",
  "HRActionApplyValidated",
  "HRActionDryRunCompleted",
  "HRActionApplyReady",
  "HRActionApplyStarted",
  "HRActionEffectApplied",
  "HRActionApplyFailed",
  "HRActionApplyCompleted",
  "HRActionRollbackRequired",
  "HRActionRollbackCompleted",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Action Apply Engine Foundation. No apply, rollback, or operational mutation runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_ACTION_APPLY_AUDIT_ACTIONS = {
  applyCompleted: defineAuditAction("hr.action.apply.completed"),
  applyFailed: defineAuditAction("hr.action.apply.failed"),
  applyRequested: defineAuditAction("hr.action.apply.requested"),
  applyStarted: defineAuditAction("hr.action.apply.started"),
  applyValidated: defineAuditAction("hr.action.apply.validated"),
  dryRunCompleted: defineAuditAction("hr.action.apply.dry-run.completed"),
  effectApplied: defineAuditAction("hr.action.apply.effect.applied"),
  rollbackCompleted: defineAuditAction("hr.action.apply.rollback.completed"),
  rollbackRequired: defineAuditAction("hr.action.apply.rollback.required"),
} as const;

export const HR_ACTION_APPLY_FOUNDATION_TABLES = [
  "hr_action_apply_requests",
  "hr_action_apply_effects",
  "hr_action_apply_results",
  "hr_action_apply_conflicts",
  "hr_action_apply_idempotency",
  "hr_action_apply_rollback_refs",
] as const;
