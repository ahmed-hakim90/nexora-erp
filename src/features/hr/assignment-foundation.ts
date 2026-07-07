import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import type { HrActionType } from "./action-foundation";
import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrAssignmentType =
  | "position"
  | "department"
  | "section"
  | "team"
  | "organization_unit"
  | "manager"
  | "cost_center"
  | "work_location"
  | "shift_schedule"
  | "payroll_group"
  | "holiday_calendar"
  | "capability_pack"
  | "template_version"
  | "reporting_structure"
  | "production_line"
  | "machine_group"
  | "project";

export type HrAssignmentStatus = "planned" | "active" | "expired" | "cancelled" | "superseded";

export type HrAssignmentScope = "primary" | "temporary" | "acting" | "delegated" | "project" | "emergency";

export type HrAssignmentResolutionGrain = "date" | "timestamp";

export type HrAssignmentResolverConsumer =
  | "attendance"
  | "payroll"
  | "workforce"
  | "hr_actions"
  | "reports"
  | "dashboard"
  | "search"
  | "workflow"
  | "approval"
  | "policy_engine"
  | "compensation"
  | "timeline"
  | "audit";

export type HrReportingStructureKind =
  | "direct_manager"
  | "functional_manager"
  | "matrix_manager"
  | "acting_manager";

export type HrAssignmentEffectTarget =
  | "employment_profile"
  | "workflow"
  | "approval"
  | "reports"
  | "dashboard"
  | "notifications"
  | "attendance"
  | "payroll_snapshot"
  | "production_planning"
  | "cost_center"
  | "analytics"
  | "timeline"
  | "audit"
  | "search";

export type HrAssignmentScopeDefinition = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrAssignmentDefinition = HrAssignmentScopeDefinition & Readonly<{
  assignmentType: HrAssignmentType;
  employeeId: string;
  employmentProfileId: string;
  referenceEntityId: string;
  referenceEntityType: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  priority: number;
  assignmentScope: HrAssignmentScope;
  assignmentStatus: HrAssignmentStatus;
  reason?: string | null;
  hrActionReference?: string | null;
  appliedBy?: string | null;
  appliedAt?: string | null;
  expiredAt?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
  assignmentRuntimeImplemented: boolean;
  directEmploymentProfileMutation: false;
  historicalAssignmentsImmutable: true;
}>;

export type HrAssignmentHistoryEntryDefinition = Readonly<{
  assignmentId: string;
  employeeId: string;
  assignmentType: HrAssignmentType;
  previousReferenceEntityId?: string | null;
  newReferenceEntityId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  assignmentStatus: HrAssignmentStatus;
  supersededAssignmentId?: string | null;
  hrActionReference?: string | null;
  recordedAt: string;
  historyImmutable: true;
  assignmentRuntimeImplemented: boolean;
}>;

export type HrAssignmentResolutionRefDefinition = Readonly<{
  employeeId: string;
  assignmentType: HrAssignmentType;
  assignmentScope: HrAssignmentScope;
  resolvedAssignmentId?: string | null;
  resolutionRuleKey: string;
  effectiveDate: string;
  resolutionRuntimeImplemented: boolean;
}>;

export type HrAssignmentEffectDefinition = Readonly<{
  assignmentType: HrAssignmentType;
  effectTarget: HrAssignmentEffectTarget;
  effectOrder: number;
  description: string;
  effectRuntimeImplemented: false;
}>;

export type HrAssignmentEngineBoundaryContract = Readonly<{
  key: string;
  assignmentsOwnOrganizationalRelationships: true;
  assignmentEngineIsOperationalSource: true;
  assignmentResolverIsOnlySupportedReadPath: true;
  assignmentRuntimeImplemented: boolean;
  directEmploymentProfileMutation: false;
  historicalAssignmentsImmutable: true;
  replacementCreatesNewAssignment: true;
  resolutionSnapshotImmutable: true;
  templatesAssignReferencesOnly: true;
  hrActionsCreateAssignments: true;
  workflowRuntimeImplemented: false;
  applyRuntimeImplemented: false;
  processingFlow: readonly [
    "employee",
    "assignment_engine",
    "assignment_resolver",
    "assignment_resolution_snapshot",
    "operational_engines",
  ];
}>;

export type HrAssignmentResolverPrecedenceRule = Readonly<{
  scope: HrAssignmentScope;
  precedence: number;
  appliesTo: readonly HrAssignmentType[] | "all_assignment_types";
  description: string;
  resolutionRuntimeImplemented: boolean;
}>;

export type HrAssignmentResolverSnapshotContract = Readonly<{
  key: string;
  immutablePointInTimeMaterialization: true;
  derivedFromAssignmentHistory: true;
  employmentProfileCacheOptional: true;
  profileCacheUpdatedOnlyByResolverPublishStep: true;
  runtimeImplemented: boolean;
  requiredEnvelopeFields: readonly [
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
  ];
}>;

export function defineHrAssignment<T extends HrAssignmentDefinition>(definition: T): T {
  return definition;
}

export function defineHrAssignmentHistoryEntry<T extends HrAssignmentHistoryEntryDefinition>(definition: T): T {
  return definition;
}

export function defineHrAssignmentResolutionRef<T extends HrAssignmentResolutionRefDefinition>(definition: T): T {
  return definition;
}

export function defineHrAssignmentEffect<T extends HrAssignmentEffectDefinition>(definition: T): T {
  return definition;
}

export const HR_ASSIGNMENT_TYPES = [
  "position",
  "department",
  "section",
  "team",
  "organization_unit",
  "manager",
  "cost_center",
  "work_location",
  "shift_schedule",
  "payroll_group",
  "holiday_calendar",
  "capability_pack",
  "template_version",
  "reporting_structure",
  "production_line",
  "machine_group",
  "project",
] as const satisfies readonly HrAssignmentType[];

export const HR_ASSIGNMENT_STATUSES = [
  "planned",
  "active",
  "expired",
  "cancelled",
  "superseded",
] as const satisfies readonly HrAssignmentStatus[];

export const HR_ASSIGNMENT_SCOPES = [
  "primary",
  "temporary",
  "acting",
  "delegated",
  "project",
  "emergency",
] as const satisfies readonly HrAssignmentScope[];

export const HR_REPORTING_STRUCTURE_KINDS = [
  "direct_manager",
  "functional_manager",
  "matrix_manager",
  "acting_manager",
] as const satisfies readonly HrReportingStructureKind[];

export const HR_ASSIGNMENT_EFFECTIVE_DATING_CONTRACT = {
  dateFields: ["effective_from", "effective_to", "created_at", "applied_at", "expired_at"] as const,
  historicalAssignmentsImmutable: true,
  key: "hr.assignments.effective-dating",
  replacementCreatesNewAssignment: true,
  runtimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_RESOLUTION_RULES = [
  {
    description: "Primary assignment wins when multiple assignments overlap.",
    key: "primary_assignment_wins",
    resolutionRuntimeImplemented: true,
  },
  {
    description: "Temporary assignment overrides within its validity window.",
    key: "temporary_overrides_within_validity",
    resolutionRuntimeImplemented: true,
  },
  {
    description: "Project assignment overrides workforce targets within the project validity window.",
    key: "project_overrides_workforce_targets_within_validity",
    resolutionRuntimeImplemented: true,
  },
  {
    description: "Emergency assignment has the highest precedence within its audited validity window.",
    key: "emergency_highest_precedence_within_validity",
    resolutionRuntimeImplemented: true,
  },
  {
    description: "Delegated assignment only affects delegated capabilities.",
    key: "delegated_affects_delegated_capabilities_only",
    resolutionRuntimeImplemented: true,
  },
  {
    description: "Acting assignment overrides reporting structure only.",
    key: "acting_overrides_reporting_structure_only",
    resolutionRuntimeImplemented: true,
  },
] as const;

export const HR_ASSIGNMENT_PROFILE_OWNERSHIP_CONTRACT = {
  assignmentResolutionOwnedFields: [
    "department_id",
    "section_id",
    "team_id",
    "position_id",
    "grade_id",
    "reporting_manager_employee_id",
    "reporting_manager_override",
    "cost_center_id",
    "work_location_id",
    "shift_schedule_ref",
    "payroll_group",
    "holiday_calendar",
    "capability_pack",
    "template_version",
    "production_line",
    "machine_group",
    "project",
  ] as const,
  employmentProfileAnchorFields: [
    "tenant_id",
    "company_id",
    "branch_id",
    "employee_id",
    "effective_from",
    "effective_to",
    "status",
    "employment_type",
    "metadata",
    "version",
    "deleted_at",
    "hr_contracts.employment_profile_id",
  ] as const,
  key: "hr.assignments.resolver.profile-ownership",
  policyOverridesRemainProfileKeyed: true,
  profileOrgFieldsAreCacheOnlyInPhase2: true,
  runtimeImplemented: true,
} as const;

export const HR_ASSIGNMENT_RESOLVER_ARCHITECTURE_CONTRACT = {
  directAssignmentTableReadsInBusinessLogicAllowed: false,
  directEmploymentProfileMutation: false,
  fallbackPhase: "phase_1_profile_with_resolver_fallback",
  key: "hr.assignments.resolver.architecture",
  resolverReadPathIsAuthoritative: true,
  runtimeImplemented: true,
  supportedFlow: [
    "employee",
    "hr_assignments_history",
    "templates_capability_packs",
    "assignment_requests_planned",
    "hr_actions_approved",
    "apply_engine",
    "assignment_resolver_as_of_date",
    "assignment_resolution_snapshot",
    "employment_profile_cache_optional",
    "operational_consumers",
  ] as const,
} as const;

export const HR_ASSIGNMENT_RESOLVER_SNAPSHOT_CONTRACT: HrAssignmentResolverSnapshotContract = {
  derivedFromAssignmentHistory: true,
  employmentProfileCacheOptional: true,
  immutablePointInTimeMaterialization: true,
  key: "hr.assignments.resolver.snapshot",
  profileCacheUpdatedOnlyByResolverPublishStep: true,
  requiredEnvelopeFields: [
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
  ],
  runtimeImplemented: true,
} as const;

export const HR_ASSIGNMENT_RESOLVER_PRECEDENCE_MODEL: readonly HrAssignmentResolverPrecedenceRule[] = [
  {
    appliesTo: "all_assignment_types",
    description: "Base winner per assignment type when no higher-precedence scope overlaps.",
    precedence: 10,
    resolutionRuntimeImplemented: true,
    scope: "primary",
  },
  {
    appliesTo: "all_assignment_types",
    description: "Overrides primary assignments of the same type within its effective window.",
    precedence: 20,
    resolutionRuntimeImplemented: true,
    scope: "temporary",
  },
  {
    appliesTo: ["manager", "reporting_structure"],
    description: "Overrides manager and reporting assignments only.",
    precedence: 30,
    resolutionRuntimeImplemented: true,
    scope: "acting",
  },
  {
    appliesTo: ["manager", "reporting_structure"],
    description: "Overrides approval and workflow routing capabilities, not org structure.",
    precedence: 40,
    resolutionRuntimeImplemented: true,
    scope: "delegated",
  },
  {
    appliesTo: ["shift_schedule", "work_location", "production_line", "machine_group", "project"],
    description: "Overrides workforce targets inside a project window.",
    precedence: 50,
    resolutionRuntimeImplemented: true,
    scope: "project",
  },
  {
    appliesTo: "all_assignment_types",
    description: "Highest precedence inside validity window and requires audit.",
    precedence: 60,
    resolutionRuntimeImplemented: true,
    scope: "emergency",
  },
] as const;

export const HR_ASSIGNMENT_RESOLVER_TIE_BREAKERS = [
  "higher_priority_wins",
  "later_effective_from_wins",
  "remaining_tie_is_validation_failure",
] as const;

export const HR_ASSIGNMENT_RESOLVER_GRAIN_POLICY = {
  dateGrain: {
    grain: "date" as const satisfies HrAssignmentResolutionGrain,
    rule: "resolve_as_of_start_of_business_date_in_company_timezone",
    useCases: ["payroll_periods", "attendance_days", "reports"] as const,
  },
  key: "hr.assignments.resolver.grain-policy",
  midDayAttendanceRecommendation: "start_of_day_snapshot_for_attendance_day",
  runtimeImplemented: true,
  tenantPolicyRequiredBeforeRuntime: true,
  timestampGrain: {
    grain: "timestamp" as const satisfies HrAssignmentResolutionGrain,
    rule: "resolve_as_of_event_timestamp",
    useCases: ["workflow_routing", "notifications", "live_dashboards"] as const,
  },
} as const;

export const HR_ASSIGNMENT_RESOLVER_CONSUMER_RULES: readonly Readonly<{
  consumer: HrAssignmentResolverConsumer;
  rule: string;
  directProfileReadAllowedInPhase2: false;
}>[] = [
  { consumer: "attendance", directProfileReadAllowedInPhase2: false, rule: "Resolve shift_schedule, work_location, and holiday_calendar as of the attendance day." },
  { consumer: "payroll", directProfileReadAllowedInPhase2: false, rule: "Resolve payroll_group, cost_center, and department as of pay period end or tenant period policy." },
  { consumer: "workforce", directProfileReadAllowedInPhase2: false, rule: "Resolve shift, location, and production assignments from resolver output." },
  { consumer: "hr_actions", directProfileReadAllowedInPhase2: false, rule: "Approved actions create or supersede assignments instead of updating profile org columns." },
  { consumer: "reports", directProfileReadAllowedInPhase2: false, rule: "Index resolution_snapshot_id and resolved fields." },
  { consumer: "dashboard", directProfileReadAllowedInPhase2: false, rule: "Read resolved fields from the snapshot projection." },
  { consumer: "search", directProfileReadAllowedInPhase2: false, rule: "Search assignments and snapshot refs, not mutable profile org state." },
  { consumer: "workflow", directProfileReadAllowedInPhase2: false, rule: "Route from resolved manager plus delegated assignment scope." },
  { consumer: "approval", directProfileReadAllowedInPhase2: false, rule: "Route approvals from resolved manager and delegated scope." },
  { consumer: "policy_engine", directProfileReadAllowedInPhase2: false, rule: "Use resolved company, branch, department, position, and grade plus policy overrides." },
  { consumer: "compensation", directProfileReadAllowedInPhase2: false, rule: "Use salary package from capability pack resolution plus profile anchor." },
  { consumer: "timeline", directProfileReadAllowedInPhase2: false, rule: "Publish when assignments are created or superseded and link HR action references." },
  { consumer: "audit", directProfileReadAllowedInPhase2: false, rule: "Keep resolver provenance and assignment history immutable." },
] as const;

export const HR_ASSIGNMENT_RESOLVER_HISTORICAL_RULES = {
  attendanceLockedDaysStoreResolvedRefs: true,
  closedPayrollPeriodsFreezeSnapshotReference: true,
  key: "hr.assignments.resolver.historical-rules",
  resolveBusinessDateNotToday: true,
  retroChangesCreateCorrectionBatches: true,
  runtimeImplemented: true,
  supersededAssignmentsRemainQueryable: true,
} as const;

export const HR_ASSIGNMENT_RESOLVER_DRIFT_PREVENTION = {
  cacheUpdatedOnlyByResolverPublisher: true,
  directProfileUpdateGuardPhase: "phase_3",
  key: "hr.assignments.resolver.drift-prevention",
  profileCacheReadOnlyToConsumers: true,
  reconciliationJobReadOnly: true,
  resolutionSnapshotIdRequiredForCache: true,
  runtimeImplemented: true,
  singleWritePath: "assignment_engine",
} as const;

export const HR_ASSIGNMENT_VALIDATION_RULES = [
  "department_belongs_to_company",
  "position_belongs_to_department",
  "position_resolves_to_job",
  "employee_job_resolution_requires_assignment_position",
  "direct_employee_to_job_relationship_forbidden",
  "planning_must_not_assign_employees_directly",
  "cost_center_belongs_to_branch",
  "shift_belongs_to_company",
  "payroll_group_belongs_to_company",
  "manager_exists",
  "employee_active",
  "employment_profile_exists",
  "reference_entity_exists",
  "effective_dates_valid",
  "no_overlapping_primary_assignment",
  "assignment_type_supported",
] as const;

export const HR_ASSIGNMENT_ACTION_ORIGINS: readonly Readonly<{
  actionType: HrActionType;
  assignmentTypes: readonly HrAssignmentType[];
  assignmentRuntimeImplemented: boolean;
}>[] = [
  { actionType: "hiring", assignmentRuntimeImplemented: false, assignmentTypes: ["position", "department", "manager", "shift_schedule", "payroll_group", "template_version", "capability_pack"] },
  { actionType: "promotion", assignmentRuntimeImplemented: false, assignmentTypes: ["position", "department", "manager"] },
  { actionType: "transfer", assignmentRuntimeImplemented: false, assignmentTypes: ["department", "position", "work_location", "cost_center", "manager"] },
  { actionType: "manager_change", assignmentRuntimeImplemented: false, assignmentTypes: ["manager", "reporting_structure"] },
  { actionType: "shift_change", assignmentRuntimeImplemented: false, assignmentTypes: ["shift_schedule"] },
  { actionType: "department_change", assignmentRuntimeImplemented: false, assignmentTypes: ["department", "section", "team", "organization_unit"] },
  { actionType: "custom_hr_action", assignmentRuntimeImplemented: false, assignmentTypes: ["template_version", "capability_pack"] },
];

export const HR_ASSIGNMENT_TEMPLATE_INTEGRATION = {
  assignmentEngineCreatesAssignments: true,
  key: "hr.assignments.template-integration",
  templatesAssignReferencesOnly: true,
  templatesNeverWriteOperationalData: true,
  assignmentRuntimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_WORKFORCE_INTEGRATION = {
  assignmentTargets: ["shift_schedule", "work_location", "holiday_calendar", "production_line"] as const,
  key: "hr.assignments.workforce-integration",
  referencesOnly: true,
  workforceMutationImplemented: false,
} as const;

export const HR_ASSIGNMENT_PAYROLL_READINESS = {
  fields: [
    "payroll_snapshot_impact",
    "payroll_group_assignment",
    "cost_center_distribution",
  ] as const,
  key: "hr.assignments.payroll-readiness",
  payrollMutationImplemented: false,
} as const;

export const HR_ASSIGNMENT_PAYROLL_RUNTIME_INTEGRATION = {
  assignmentEngineAssignablePayrollGroups: true,
  bypassesAssignmentEngine: false,
  key: "hr.assignments.payroll-runtime-integration",
  payrollGroupAssignmentRuntimeImplemented: false,
  referencesHrPayrollRuntimeFoundation: true,
  runtimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_TIMELINE_READINESS = {
  key: "hr.assignments.timeline-readiness",
  publishesAuditReadiness: true,
  publishesSearchReadiness: true,
  publishesTimelineReadiness: true,
  timelinePublisherRuntimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_EFFECT_CHAINS: readonly Readonly<{
  assignmentType: HrAssignmentType;
  effects: readonly HrAssignmentEffectTarget[];
  effectRuntimeImplemented: false;
}>[] = [
  {
    assignmentType: "manager",
    effectRuntimeImplemented: false,
    effects: ["workflow", "approval", "reports", "dashboard", "notifications"],
  },
  {
    assignmentType: "shift_schedule",
    effectRuntimeImplemented: false,
    effects: ["attendance", "payroll_snapshot", "production_planning"],
  },
  {
    assignmentType: "department",
    effectRuntimeImplemented: false,
    effects: ["cost_center", "reports", "analytics"],
  },
];

export const HR_ASSIGNMENT_EFFECT_DEFINITIONS: readonly HrAssignmentEffectDefinition[] = [
  defineHrAssignmentEffect({
    assignmentType: "manager",
    description: "Manager assignment readiness for workflow and approval routing.",
    effectOrder: 1,
    effectRuntimeImplemented: false,
    effectTarget: "workflow",
  }),
  defineHrAssignmentEffect({
    assignmentType: "manager",
    description: "Manager assignment readiness for approval routing.",
    effectOrder: 2,
    effectRuntimeImplemented: false,
    effectTarget: "approval",
  }),
  defineHrAssignmentEffect({
    assignmentType: "shift_schedule",
    description: "Shift assignment readiness for attendance engine.",
    effectOrder: 1,
    effectRuntimeImplemented: false,
    effectTarget: "attendance",
  }),
  defineHrAssignmentEffect({
    assignmentType: "shift_schedule",
    description: "Shift assignment readiness for payroll snapshot impact.",
    effectOrder: 2,
    effectRuntimeImplemented: false,
    effectTarget: "payroll_snapshot",
  }),
  defineHrAssignmentEffect({
    assignmentType: "department",
    description: "Department assignment readiness for cost center distribution.",
    effectOrder: 1,
    effectRuntimeImplemented: false,
    effectTarget: "cost_center",
  }),
];

export const HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT: HrAssignmentEngineBoundaryContract = {
  assignmentEngineIsOperationalSource: true,
  assignmentResolverIsOnlySupportedReadPath: true,
  assignmentRuntimeImplemented: true,
  applyRuntimeImplemented: false,
  assignmentsOwnOrganizationalRelationships: true,
  directEmploymentProfileMutation: false,
  historicalAssignmentsImmutable: true,
  hrActionsCreateAssignments: true,
  key: "hr.assignments.foundation.boundary",
  processingFlow: [
    "employee",
    "assignment_engine",
    "assignment_resolver",
    "assignment_resolution_snapshot",
    "operational_engines",
  ],
  replacementCreatesNewAssignment: true,
  resolutionSnapshotImmutable: true,
  templatesAssignReferencesOnly: true,
  workflowRuntimeImplemented: false,
};

export const HR_ASSIGNMENT_JOB_ARCHITECTURE_INTEGRATION = {
  assignmentRuntimeImplemented: false,
  directEmployeeToJobRelationshipAllowed: false,
  key: "hr.assignments.job-architecture-integration",
  positionJobIdIsCanonical: true,
  referencesHrJobArchitectureFoundation: true,
  resolutionChain: ["employee", "assignment", "position", "job"] as const,
  runtimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_WORKFORCE_PLANNING_INTEGRATION = {
  assignmentEngineIsExecutionLayer: true,
  assignmentRuntimeImplemented: false,
  key: "hr.assignments.workforce-planning-integration",
  planningDirectlyAssignsEmployees: false,
  referencesHrWorkforcePlanningFoundation: true,
  runtimeImplemented: false,
} as const;

export const HR_ASSIGNMENT_PLATFORM_INTEGRATION = {
  assignmentRuntimeImplemented: false,
  key: "hr.assignments.platform-integration",
  referencesHrActionApplyEngine: true,
  referencesHrActionEngine: true,
  referencesHrAttendanceEngine: true,
  referencesHrCore: true,
  referencesHrJobArchitectureFoundation: true,
  referencesHrPayrollEngine: true,
  referencesHrPayrollRuntimeFoundation: true,
  referencesHrTemplateLifecycle: true,
  referencesHrWorkforcePlanningFoundation: true,
  referencesHrWorkflowApprovalBinding: true,
  referencesHrWorkforceEngine: true,
  referencesTimeline: true,
} as const;

const hrAssignmentImportExportSecurity = {
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

export const HR_ASSIGNMENT_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", required: true },
    { dataType: "text", key: "assignmentType", label: "Assignment Type", required: true },
    { dataType: "text", key: "referenceEntityId", label: "Reference Entity ID", required: true },
    { dataType: "text", key: "effectiveFrom", label: "Effective From", required: true },
  ],
  key: "hr.assignments.import",
  label: "HR Assignment Foundation Import",
  mappings: [
    { key: "employee-id", sourceColumn: "Employee ID", targetField: "employeeId" },
    { key: "assignment-type", sourceColumn: "Assignment Type", targetField: "assignmentType" },
    { key: "reference-entity-id", sourceColumn: "Reference Entity ID", targetField: "referenceEntityId" },
    { key: "effective-from", sourceColumn: "Effective From", targetField: "effectiveFrom" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { assignmentRuntimeImplemented: false, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrAssignmentImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "employeeId", key: "employee-required", message: "Employee is required.", severity: "error", type: "required" },
    { fieldKey: "assignmentType", key: "assignment-type-required", message: "Assignment type is required.", severity: "error", type: "required" },
    { fieldKey: "referenceEntityId", key: "reference-required", message: "Reference entity is required.", severity: "error", type: "required" },
    { fieldKey: "effectiveFrom", key: "effective-from-required", message: "Effective from is required.", severity: "error", type: "required" },
  ],
});

export const HR_ASSIGNMENT_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", order: 1, sourceField: "employeeId" },
    { dataType: "text", key: "assignmentType", label: "Assignment Type", order: 2, sourceField: "assignmentType" },
    { dataType: "text", key: "assignmentStatus", label: "Status", order: 3, sourceField: "assignmentStatus" },
    { dataType: "text", key: "effectiveFrom", label: "Effective From", order: 4, sourceField: "effectiveFrom" },
    { dataType: "text", key: "assignmentScope", label: "Scope", order: 5, sourceField: "assignmentScope" },
  ],
  key: "hr.assignments.export",
  label: "HR Assignment Foundation Export",
  mappings: [
    { key: "employee-id", sourceField: "employeeId", targetColumn: "Employee ID" },
    { key: "assignment-type", sourceField: "assignmentType", targetColumn: "Assignment Type" },
    { key: "assignment-status", sourceField: "assignmentStatus", targetColumn: "Status" },
    { key: "effective-from", sourceField: "effectiveFrom", targetColumn: "Effective From" },
    { key: "assignment-scope", sourceField: "assignmentScope", targetColumn: "Scope" },
  ],
  metadata: {
    fileNameTemplate: "hr-assignments-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrAssignmentImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_ASSIGNMENT_EVENT_DEFINITIONS = [
  "AssignmentCreated",
  "AssignmentActivated",
  "AssignmentExpired",
  "AssignmentSuperseded",
  "AssignmentCancelled",
  "AssignmentResolvedReadiness",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for HR Assignment Engine Foundation. No assignment execution or employment profile mutation runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_ASSIGNMENT_AUDIT_ACTIONS = {
  assignmentActivated: defineAuditAction("hr.assignment.activated"),
  assignmentCancelled: defineAuditAction("hr.assignment.cancelled"),
  assignmentCreated: defineAuditAction("hr.assignment.created"),
  assignmentExpired: defineAuditAction("hr.assignment.expired"),
  assignmentResolved: defineAuditAction("hr.assignment.resolved"),
  assignmentSuperseded: defineAuditAction("hr.assignment.superseded"),
} as const;

export const HR_ASSIGNMENT_FOUNDATION_TABLES = [
  "hr_assignments",
  "hr_assignment_history",
  "hr_assignment_resolution_refs",
  "hr_assignment_effects",
] as const;
