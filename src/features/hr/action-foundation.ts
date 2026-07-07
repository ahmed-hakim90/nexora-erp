import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrActionDocumentStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "applied"
  | "archived";

export type HrActionPriority = "low" | "normal" | "high" | "urgent";

export type HrActionType =
  | "hiring"
  | "onboarding"
  | "probation_confirmation"
  | "promotion"
  | "transfer"
  | "department_change"
  | "manager_change"
  | "position_change"
  | "grade_change"
  | "salary_revision"
  | "compensation_change"
  | "allowance_assignment"
  | "deduction_assignment"
  | "loan"
  | "advance"
  | "bonus"
  | "production_incentive_approval"
  | "penalty"
  | "warning"
  | "suspension"
  | "mission"
  | "training"
  | "shift_change"
  | "attendance_adjustment"
  | "leave"
  | "resignation"
  | "termination"
  | "final_settlement"
  | "rehire"
  | "document_renewal"
  | "custody_assignment"
  | "custody_return"
  | "medical_examination"
  | "performance_review"
  | "custom_hr_action";

export type HrActionPayloadKind =
  | "salary_revision"
  | "transfer"
  | "attendance_adjustment"
  | "bonus"
  | "leave"
  | "promotion"
  | "compensation_change"
  | "loan"
  | "advance"
  | "shift_change"
  | "generic";

export type HrActionEffectTarget =
  | "employment_profile"
  | "timeline"
  | "payroll_snapshot"
  | "compensation"
  | "attendance"
  | "calendar"
  | "organization"
  | "reporting_manager"
  | "cost_center"
  | "workforce";

export type HrActionPolicyRefKind =
  | "approval"
  | "attendance"
  | "payroll"
  | "leave"
  | "compensation"
  | "promotion"
  | "transfer"
  | "training"
  | "document_expiry";

export type HrActionScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrActionDocumentDefinition = HrActionScope & Readonly<{
  actionType: HrActionType;
  documentNumber: string;
  employeeId: string;
  employmentProfileId: string;
  requestedBy: string;
  requestedOn: string;
  effectiveDate: string;
  status: HrActionDocumentStatus;
  priority: HrActionPriority;
  policyVersionRef?: string | null;
  approvalPolicyRef?: string | null;
  workflowInstanceRef?: string | null;
  sourceModule?: string | null;
  sourceReference?: string | null;
  notes?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
  workflowRuntimeImplemented: false;
  applyRuntimeImplemented: false;
  directOperationalMutation: false;
}>;

export type HrActionPayloadDefinition = HrActionScope & Readonly<{
  actionDocumentId: string;
  payloadKind: HrActionPayloadKind;
  payload: Readonly<Record<string, unknown>>;
  calculationRuntimeImplemented: false;
}>;

export type HrActionEffectDefinition = HrActionScope & Readonly<{
  actionDocumentId: string;
  effectTarget: HrActionEffectTarget;
  effectMetadata: Readonly<Record<string, unknown>>;
  applyRuntimeImplemented: false;
}>;

export type HrActionLinkDefinition = HrActionScope & Readonly<{
  actionDocumentId: string;
  linkType: "related_action" | "source_record" | "payroll_batch" | "attendance_day" | "compensation_package" | "platform_document";
  linkedRecordId: string;
  linkedRecordType: string;
}>;

export type HrActionEngineBoundaryContract = Readonly<{
  key: string;
  hrActionsAreDocuments: true;
  documentsDescribeIntendedChange: true;
  directOperationalEngineMutation: false;
  workflowRuntimeImplemented: false;
  approvalExecutionImplemented: false;
  applyEngineImplemented: false;
  payrollCalculationImplemented: false;
  attendanceCalculationImplemented: false;
  leaveBalanceCalculationImplemented: false;
  financePostingImplemented: false;
  processingFlow: readonly ["draft", "submit", "review", "approve", "apply", "archive"];
}>;

export type HrActionTimelineIntegrationContract = Readonly<{
  key: string;
  publishesTimelineMetadata: true;
  timelinePublisherRuntimeImplemented: false;
  supportedLifecycleEvents: readonly ["created", "submitted", "approved", "rejected", "applied", "cancelled", "archived"];
}>;

export type HrActionPayrollReadiness = Readonly<{
  key: string;
  payrollSnapshotLinkReady: true;
  supportedActionTypes: readonly HrActionType[];
  payrollRuntimeImplemented: false;
}>;

export type HrActionAttendanceReadiness = Readonly<{
  key: string;
  supportedActionTypes: readonly HrActionType[];
  attendanceRecalculationImplemented: false;
}>;

export type HrActionCompensationReadiness = Readonly<{
  key: string;
  referencesSalaryPackage: true;
  referencesComponent: true;
  referencesOverride: true;
  referencesPolicy: true;
  referencesEffectiveDate: true;
  compensationMutationImplemented: false;
}>;

export type HrActionEmploymentProfileReadiness = Readonly<{
  key: string;
  targetFields: readonly [
    "department",
    "section",
    "team",
    "position",
    "grade",
    "manager",
    "cost_center",
    "work_location",
    "employment_type",
  ];
  directProfileUpdateImplemented: false;
}>;

export type HrActionDocumentEngineIntegration = Readonly<{
  key: string;
  documentNumberingReady: true;
  attachmentsReady: true;
  commentsReady: true;
  tagsReady: true;
  referencesReady: true;
  printReadiness: true;
  searchReadiness: true;
}>;

export type HrActionPolicyIntegrationContract = Readonly<{
  key: string;
  policyRefsOnly: true;
  policiesDuplicatedInActions: false;
  supportedPolicyKinds: readonly HrActionPolicyRefKind[];
  runtimePolicyEvaluationImplemented: false;
}>;

export function defineHrActionDocument<T extends HrActionDocumentDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionPayload<T extends HrActionPayloadDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionEffect<T extends HrActionEffectDefinition>(definition: T): T {
  return definition;
}

export function defineHrActionLink<T extends HrActionLinkDefinition>(definition: T): T {
  return definition;
}

export function createHrActionEffectChain(actionType: HrActionType): readonly HrActionEffectTarget[] {
  if (actionType === "promotion") {
    return ["employment_profile", "timeline", "payroll_snapshot", "compensation"];
  }
  if (actionType === "leave") {
    return ["attendance", "payroll_snapshot", "calendar"];
  }
  if (actionType === "transfer") {
    return ["organization", "reporting_manager", "cost_center", "employment_profile", "timeline"];
  }
  if (actionType === "attendance_adjustment") {
    return ["attendance", "payroll_snapshot", "timeline"];
  }
  if (actionType === "salary_revision" || actionType === "bonus" || actionType === "allowance_assignment") {
    return ["compensation", "payroll_snapshot", "timeline"];
  }
  return ["timeline"];
}

export const HR_ACTION_TYPES = [
  "hiring",
  "onboarding",
  "probation_confirmation",
  "promotion",
  "transfer",
  "department_change",
  "manager_change",
  "position_change",
  "grade_change",
  "salary_revision",
  "compensation_change",
  "allowance_assignment",
  "deduction_assignment",
  "loan",
  "advance",
  "bonus",
  "production_incentive_approval",
  "penalty",
  "warning",
  "suspension",
  "mission",
  "training",
  "shift_change",
  "attendance_adjustment",
  "leave",
  "resignation",
  "termination",
  "final_settlement",
  "rehire",
  "document_renewal",
  "custody_assignment",
  "custody_return",
  "medical_examination",
  "performance_review",
  "custom_hr_action",
] as const satisfies readonly HrActionType[];

export const HR_ACTION_DOCUMENT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "applied",
  "archived",
] as const satisfies readonly HrActionDocumentStatus[];

export const HR_ACTION_EFFECT_TARGETS = [
  "employment_profile",
  "timeline",
  "payroll_snapshot",
  "compensation",
  "attendance",
  "calendar",
  "organization",
  "reporting_manager",
  "cost_center",
  "workforce",
] as const satisfies readonly HrActionEffectTarget[];

export const HR_ACTION_POLICY_REF_KINDS = [
  "approval",
  "attendance",
  "payroll",
  "leave",
  "compensation",
  "promotion",
  "transfer",
  "training",
  "document_expiry",
] as const satisfies readonly HrActionPolicyRefKind[];

export const HR_ACTION_ENGINE_BOUNDARY_CONTRACT: HrActionEngineBoundaryContract = {
  applyEngineImplemented: false,
  approvalExecutionImplemented: false,
  attendanceCalculationImplemented: false,
  directOperationalEngineMutation: false,
  documentsDescribeIntendedChange: true,
  financePostingImplemented: false,
  hrActionsAreDocuments: true,
  key: "hr.actions.foundation.boundary",
  leaveBalanceCalculationImplemented: false,
  payrollCalculationImplemented: false,
  processingFlow: ["draft", "submit", "review", "approve", "apply", "archive"],
  workflowRuntimeImplemented: false,
};

export const HR_ACTION_TIMELINE_INTEGRATION: HrActionTimelineIntegrationContract = {
  key: "hr.actions.timeline-integration",
  publishesTimelineMetadata: true,
  supportedLifecycleEvents: ["created", "submitted", "approved", "rejected", "applied", "cancelled", "archived"],
  timelinePublisherRuntimeImplemented: false,
};

export const HR_ACTION_PAYROLL_READINESS: HrActionPayrollReadiness = {
  key: "hr.actions.payroll-readiness",
  payrollRuntimeImplemented: false,
  payrollSnapshotLinkReady: true,
  supportedActionTypes: [
    "bonus",
    "allowance_assignment",
    "deduction_assignment",
    "salary_revision",
    "loan",
    "advance",
    "attendance_adjustment",
    "leave",
    "final_settlement",
    "production_incentive_approval",
  ],
};

export const HR_ACTION_ATTENDANCE_READINESS: HrActionAttendanceReadiness = {
  attendanceRecalculationImplemented: false,
  key: "hr.actions.attendance-readiness",
  supportedActionTypes: ["attendance_adjustment", "shift_change", "mission", "training", "leave"],
};

export const HR_ACTION_COMPENSATION_READINESS: HrActionCompensationReadiness = {
  compensationMutationImplemented: false,
  key: "hr.actions.compensation-readiness",
  referencesComponent: true,
  referencesEffectiveDate: true,
  referencesOverride: true,
  referencesPolicy: true,
  referencesSalaryPackage: true,
};

export const HR_ACTION_EMPLOYMENT_PROFILE_READINESS: HrActionEmploymentProfileReadiness = {
  directProfileUpdateImplemented: false,
  key: "hr.actions.employment-profile-readiness",
  targetFields: [
    "department",
    "section",
    "team",
    "position",
    "grade",
    "manager",
    "cost_center",
    "work_location",
    "employment_type",
  ],
};

export const HR_ACTION_DOCUMENT_ENGINE_INTEGRATION: HrActionDocumentEngineIntegration = {
  attachmentsReady: true,
  commentsReady: true,
  documentNumberingReady: true,
  key: "hr.actions.document-engine-integration",
  printReadiness: true,
  referencesReady: true,
  searchReadiness: true,
  tagsReady: true,
};

export const HR_ACTION_POLICY_INTEGRATION: HrActionPolicyIntegrationContract = {
  key: "hr.actions.policy-integration",
  policiesDuplicatedInActions: false,
  policyRefsOnly: true,
  runtimePolicyEvaluationImplemented: false,
  supportedPolicyKinds: HR_ACTION_POLICY_REF_KINDS,
};

const hrActionImportExportSecurity = {
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

export const HR_ACTION_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionType", label: "Action Type", required: true },
    { dataType: "text", key: "documentNumber", label: "Document Number", required: true },
    { dataType: "text", key: "employeeCode", label: "Employee Code", required: true },
    { dataType: "date", key: "effectiveDate", label: "Effective Date" },
  ],
  key: "hr.actions.import",
  label: "HR Action Foundation Import",
  mappings: [
    { key: "action-type", sourceColumn: "Action Type", targetField: "actionType" },
    { key: "document-number", sourceColumn: "Document Number", targetField: "documentNumber" },
    { key: "employee-code", sourceColumn: "Employee Code", targetField: "employeeCode" },
    { key: "effective-date", sourceColumn: "Effective Date", targetField: "effectiveDate" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, workflowRuntimeImplemented: false, applyRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrActionImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "actionType", key: "action-type-required", message: "Action type is required.", severity: "error", type: "required" },
    { fieldKey: "documentNumber", key: "document-number-required", message: "Document number is required.", severity: "error", type: "required" },
  ],
});

export const HR_ACTION_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "actionType", label: "Action Type", order: 1, sourceField: "actionType" },
    { dataType: "text", key: "documentNumber", label: "Document Number", order: 2, sourceField: "documentNumber" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
    { dataType: "date", key: "effectiveDate", label: "Effective Date", order: 4, sourceField: "effectiveDate", sensitive: true, pii: true },
  ],
  key: "hr.actions.export",
  label: "HR Action Foundation Export",
  mappings: [
    { key: "action-type", sourceField: "actionType", targetColumn: "Action Type" },
    { key: "document-number", sourceField: "documentNumber", targetColumn: "Document Number" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
    { key: "effective-date", sourceField: "effectiveDate", targetColumn: "Effective Date" },
  ],
  metadata: {
    fileNameTemplate: "hr-actions-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrActionImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_ACTION_EVENT_DEFINITIONS = [
  "HRActionCreated",
  "HRActionSubmitted",
  "HRActionApproved",
  "HRActionRejected",
  "HRActionApplied",
  "HRActionCancelled",
  "HRActionArchived",
  "HRActionEffectRegistered",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Action Engine Foundation. No workflow, approval execution, or apply runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_ACTION_AUDIT_ACTIONS = {
  actionApplied: defineAuditAction("hr.action.applied"),
  actionApproved: defineAuditAction("hr.action.approved"),
  actionArchived: defineAuditAction("hr.action.archived"),
  actionCancelled: defineAuditAction("hr.action.cancelled"),
  actionCreated: defineAuditAction("hr.action.created"),
  actionEffectRegistered: defineAuditAction("hr.action.effect.registered"),
  actionRejected: defineAuditAction("hr.action.rejected"),
  actionSubmitted: defineAuditAction("hr.action.submitted"),
} as const;

export const HR_ACTION_FOUNDATION_TABLES = [
  "hr_action_documents",
  "hr_action_payloads",
  "hr_action_effects",
  "hr_action_links",
  "hr_action_comments",
  "hr_action_attachments",
  "hr_action_timeline_refs",
  "hr_action_audit_refs",
] as const;
