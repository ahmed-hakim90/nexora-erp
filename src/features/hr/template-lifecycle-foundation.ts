import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrTemplateStatus = "draft" | "active" | "inactive" | "archived";

export type HrTemplateComponentKind =
  | "employment_profile_defaults"
  | "organization_assignment"
  | "department"
  | "section"
  | "team"
  | "position"
  | "job_title"
  | "grade"
  | "manager_resolution_strategy"
  | "work_location"
  | "cost_center"
  | "employment_type"
  | "salary_package"
  | "compensation_structure"
  | "policy"
  | "shift_schedule"
  | "payroll_group"
  | "holiday_calendar"
  | "training_set"
  | "required_documents"
  | "custody_set"
  | "workflow_binding"
  | "approval_binding"
  | "apply_engine_readiness"
  | "timeline_readiness"
  | "capability_pack";

export type HrCapabilityPackComponentKind =
  | "policy"
  | "salary_package"
  | "compensation_structure"
  | "shift_policy"
  | "attendance_policy"
  | "leave_policy"
  | "payroll_policy"
  | "shift_schedule"
  | "payroll_group"
  | "holiday_calendar"
  | "training_set"
  | "custody_set"
  | "required_documents";

export type HrLifecycleTemplateKind =
  | "onboarding"
  | "probation"
  | "confirmation"
  | "promotion"
  | "transfer"
  | "department_change"
  | "salary_revision"
  | "suspension"
  | "leave_return"
  | "resignation"
  | "termination"
  | "final_settlement"
  | "offboarding"
  | "rehire";

export type HrChecklistOwnerRole =
  | "employee"
  | "manager"
  | "hr"
  | "finance"
  | "it"
  | "warehouse"
  | "administration"
  | "supervisor";

export type HrChecklistCompletionRule =
  | "document_uploaded"
  | "hr_action_approved"
  | "manual_confirmation"
  | "system_access_revoked"
  | "custody_returned"
  | "clearance_granted";

export type HrRequiredDocumentKind =
  | "national_id"
  | "passport"
  | "residence"
  | "contract"
  | "medical"
  | "qualifications"
  | "driving_license"
  | "certificates"
  | "other";

export type HrRequiredTrainingCategory = "mandatory" | "optional" | "recurring" | "expiring";

export type HrRequiredCustodyItemKind =
  | "laptop"
  | "desktop"
  | "uniform"
  | "ppe"
  | "mobile"
  | "sim"
  | "vehicle"
  | "access_card"
  | "keys"
  | "other";

export type HrTemplateEffectTarget =
  | "employment_profile"
  | "compensation"
  | "attendance"
  | "payroll"
  | "workflow"
  | "timeline"
  | "apply_engine";

export type HrTemplateScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrTemplateDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  employmentType?: string | null;
  gradeRef?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrTemplateStatus;
  currentVersion: number;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  copiedOperationalData: false;
  executionRuntimeImplemented: false;
}>;

export type HrTemplateVersionDefinition = HrTemplateScope & Readonly<{
  templateId: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrTemplateStatus;
  assignedEmployeeRetainsVersion: true;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  executionRuntimeImplemented: false;
}>;

export type HrTemplateComponentDefinition = Readonly<{
  templateVersionId: string;
  componentKind: HrTemplateComponentKind;
  referenceId: string;
  sequence: number;
  capabilityPackRef?: string | null;
  precedenceOrder?: number | null;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrCapabilityPackDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  description?: string | null;
  precedenceOrder: number;
  status: HrTemplateStatus;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrCapabilityPackComponentDefinition = Readonly<{
  capabilityPackId: string;
  componentKind: HrCapabilityPackComponentKind;
  referenceId: string;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrCapabilityPackPrecedenceRule = Readonly<{
  key: string;
  description: string;
  laterPackOverridesEarlierPack: true;
  resolveWithoutDuplicatingEntities: true;
  precedenceField: "precedence_order";
}>;

export type HrLifecycleTemplateDefinition = HrTemplateScope & Readonly<{
  kind: HrLifecycleTemplateKind;
  code: string;
  name: string;
  description?: string | null;
  templateVersionRef?: string | null;
  checklistTemplateRef?: string | null;
  status: HrTemplateStatus;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  executionRuntimeImplemented: false;
}>;

export type HrChecklistTemplateDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  lifecycleKind?: HrLifecycleTemplateKind | null;
  status: HrTemplateStatus;
  metadata?: Readonly<Record<string, unknown>>;
  referencesOnly: true;
  executionRuntimeImplemented: false;
}>;

export type HrChecklistItemDefinition = Readonly<{
  checklistTemplateId: string;
  title: string;
  description?: string | null;
  sequence: number;
  mandatory: boolean;
  ownerRole: HrChecklistOwnerRole;
  requiredDocumentRef?: string | null;
  requiredHrActionRef?: string | null;
  estimatedDurationHours?: number | null;
  completionRule: HrChecklistCompletionRule;
  metadata?: Readonly<Record<string, unknown>>;
  executionRuntimeImplemented: false;
}>;

export type HrRequiredDocumentSetDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  documentKinds: readonly HrRequiredDocumentKind[];
  documentRefs?: readonly string[];
  status: HrTemplateStatus;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrRequiredTrainingSetDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  category: HrRequiredTrainingCategory;
  trainingRefs: readonly string[];
  status: HrTemplateStatus;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrRequiredCustodySetDefinition = HrTemplateScope & Readonly<{
  code: string;
  name: string;
  custodyItemKinds: readonly HrRequiredCustodyItemKind[];
  custodyRefs?: readonly string[];
  status: HrTemplateStatus;
  referencesOnly: true;
  copiedOperationalData: false;
}>;

export type HrTemplateEffectDefinition = Readonly<{
  templateVersionId: string;
  effectTarget: HrTemplateEffectTarget;
  readinessMetadata: Readonly<Record<string, unknown>>;
  effectOrder: number;
  executionRuntimeImplemented: false;
}>;

export type HrTemplateLifecycleBoundaryContract = Readonly<{
  key: string;
  templatesAreReferenceBundles: true;
  copiedOperationalData: false;
  referencesOnlyComposition: true;
  capabilityPackPrecedenceResolvesWithoutDuplication: true;
  historicalEmployeesRetainAssignedTemplateVersion: true;
  onboardingExecutionImplemented: false;
  offboardingExecutionImplemented: false;
  checklistExecutionImplemented: false;
  workflowRuntimeImplemented: false;
  applyRuntimeImplemented: false;
  directOperationalMutation: false;
  processingFlow: readonly [
    "template_definition",
    "capability_pack_composition",
    "lifecycle_template_binding",
    "checklist_template_binding",
    "readiness_only_effects",
  ];
}>;

export function defineHrTemplate<T extends HrTemplateDefinition>(definition: T): T {
  return definition;
}

export function defineHrTemplateVersion<T extends HrTemplateVersionDefinition>(definition: T): T {
  return definition;
}

export function defineHrTemplateComponent<T extends HrTemplateComponentDefinition>(definition: T): T {
  return definition;
}

export function defineHrCapabilityPack<T extends HrCapabilityPackDefinition>(definition: T): T {
  return definition;
}

export function defineHrCapabilityPackComponent<T extends HrCapabilityPackComponentDefinition>(definition: T): T {
  return definition;
}

export function defineHrLifecycleTemplate<T extends HrLifecycleTemplateDefinition>(definition: T): T {
  return definition;
}

export function defineHrChecklistTemplate<T extends HrChecklistTemplateDefinition>(definition: T): T {
  return definition;
}

export function defineHrChecklistItem<T extends HrChecklistItemDefinition>(definition: T): T {
  return definition;
}

export function defineHrRequiredDocumentSet<T extends HrRequiredDocumentSetDefinition>(definition: T): T {
  return definition;
}

export function defineHrRequiredTrainingSet<T extends HrRequiredTrainingSetDefinition>(definition: T): T {
  return definition;
}

export function defineHrRequiredCustodySet<T extends HrRequiredCustodySetDefinition>(definition: T): T {
  return definition;
}

export function defineHrTemplateEffect<T extends HrTemplateEffectDefinition>(definition: T): T {
  return definition;
}

export const HR_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
] as const satisfies readonly HrTemplateStatus[];

export const HR_TEMPLATE_COMPONENT_KINDS = [
  "employment_profile_defaults",
  "organization_assignment",
  "department",
  "section",
  "team",
  "position",
  "job_title",
  "grade",
  "manager_resolution_strategy",
  "work_location",
  "cost_center",
  "employment_type",
  "salary_package",
  "compensation_structure",
  "policy",
  "shift_schedule",
  "payroll_group",
  "holiday_calendar",
  "training_set",
  "required_documents",
  "custody_set",
  "workflow_binding",
  "approval_binding",
  "apply_engine_readiness",
  "timeline_readiness",
  "capability_pack",
] as const satisfies readonly HrTemplateComponentKind[];

export const HR_CAPABILITY_PACK_COMPONENT_KINDS = [
  "policy",
  "salary_package",
  "compensation_structure",
  "shift_policy",
  "attendance_policy",
  "leave_policy",
  "payroll_policy",
  "shift_schedule",
  "payroll_group",
  "holiday_calendar",
  "training_set",
  "custody_set",
  "required_documents",
] as const satisfies readonly HrCapabilityPackComponentKind[];

export const HR_CAPABILITY_PACK_PRECEDENCE_RULES: readonly HrCapabilityPackPrecedenceRule[] = [
  {
    description: "Later capability packs override earlier packs for the same component kind.",
    key: "hr.capability-pack.precedence.later-overrides-earlier",
    laterPackOverridesEarlierPack: true,
    precedenceField: "precedence_order",
    resolveWithoutDuplicatingEntities: true,
  },
  {
    description: "Final template composition deduplicates referenced entities by component kind and reference id.",
    key: "hr.capability-pack.precedence.deduplicate-references",
    laterPackOverridesEarlierPack: true,
    precedenceField: "precedence_order",
    resolveWithoutDuplicatingEntities: true,
  },
];

export const HR_CAPABILITY_PACK_EXAMPLES: readonly HrCapabilityPackDefinition[] = [
  defineHrCapabilityPack({
    branchId: null,
    code: "factory-worker",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Factory worker capability references.",
    name: "Factory Worker Pack",
    precedenceOrder: 100,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "warehouse-operator",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Warehouse operator capability references.",
    name: "Warehouse Operator Pack",
    precedenceOrder: 110,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "office-employee",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Office employee capability references.",
    name: "Office Employee Pack",
    precedenceOrder: 120,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "sales-representative",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Sales representative capability references.",
    name: "Sales Representative Pack",
    precedenceOrder: 130,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "service-technician",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Service technician capability references.",
    name: "Service Technician Pack",
    precedenceOrder: 140,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "supervisor",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Supervisor capability references.",
    name: "Supervisor Pack",
    precedenceOrder: 150,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
  defineHrCapabilityPack({
    branchId: null,
    code: "manager",
    companyId: "company-1",
    copiedOperationalData: false,
    description: "Manager capability references.",
    name: "Manager Pack",
    precedenceOrder: 160,
    referencesOnly: true,
    status: "active",
    tenantId: "tenant-1",
  }),
];

export const HR_LIFECYCLE_TEMPLATE_KINDS = [
  "onboarding",
  "probation",
  "confirmation",
  "promotion",
  "transfer",
  "department_change",
  "salary_revision",
  "suspension",
  "leave_return",
  "resignation",
  "termination",
  "final_settlement",
  "offboarding",
  "rehire",
] as const satisfies readonly HrLifecycleTemplateKind[];

export const HR_CHECKLIST_OWNER_ROLES = [
  "employee",
  "manager",
  "hr",
  "finance",
  "it",
  "warehouse",
  "administration",
  "supervisor",
] as const satisfies readonly HrChecklistOwnerRole[];

export const HR_CHECKLIST_COMPLETION_RULES = [
  "document_uploaded",
  "hr_action_approved",
  "manual_confirmation",
  "system_access_revoked",
  "custody_returned",
  "clearance_granted",
] as const satisfies readonly HrChecklistCompletionRule[];

export const HR_REQUIRED_DOCUMENT_KINDS = [
  "national_id",
  "passport",
  "residence",
  "contract",
  "medical",
  "qualifications",
  "driving_license",
  "certificates",
  "other",
] as const satisfies readonly HrRequiredDocumentKind[];

export const HR_REQUIRED_TRAINING_CATEGORIES = [
  "mandatory",
  "optional",
  "recurring",
  "expiring",
] as const satisfies readonly HrRequiredTrainingCategory[];

export const HR_REQUIRED_CUSTODY_ITEM_KINDS = [
  "laptop",
  "desktop",
  "uniform",
  "ppe",
  "mobile",
  "sim",
  "vehicle",
  "access_card",
  "keys",
  "other",
] as const satisfies readonly HrRequiredCustodyItemKind[];

export const HR_TEMPLATE_EFFECT_TARGETS = [
  "employment_profile",
  "compensation",
  "attendance",
  "payroll",
  "workflow",
  "timeline",
  "apply_engine",
] as const satisfies readonly HrTemplateEffectTarget[];

export const HR_ONBOARDING_CHECKLIST_ITEMS: readonly Pick<HrChecklistItemDefinition, "title" | "ownerRole" | "completionRule" | "mandatory">[] = [
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Create employment profile" },
  { completionRule: "hr_action_approved", mandatory: true, ownerRole: "hr", title: "Generate contract" },
  { completionRule: "document_uploaded", mandatory: true, ownerRole: "employee", title: "Collect required documents" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign salary package" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign policies" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign shift schedule" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign payroll group" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign work location" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign manager" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign custody" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Assign required training" },
  { completionRule: "document_uploaded", mandatory: true, ownerRole: "employee", title: "Medical examination" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "administration", title: "Issue ID badge" },
  { completionRule: "manual_confirmation", mandatory: false, ownerRole: "supervisor", title: "Introduce supervisor" },
];

export const HR_OFFBOARDING_CHECKLIST_ITEMS: readonly Pick<HrChecklistItemDefinition, "title" | "ownerRole" | "completionRule" | "mandatory">[] = [
  { completionRule: "custody_returned", mandatory: true, ownerRole: "hr", title: "Collect custody" },
  { completionRule: "system_access_revoked", mandatory: true, ownerRole: "it", title: "Disable system access" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "finance", title: "Finance clearance" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "warehouse", title: "Warehouse clearance" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "it", title: "IT clearance" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "hr", title: "HR clearance" },
  { completionRule: "hr_action_approved", mandatory: true, ownerRole: "hr", title: "Payroll final settlement" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Archive employee documents" },
  { completionRule: "document_uploaded", mandatory: false, ownerRole: "hr", title: "Experience certificate" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "Close employment" },
];

export const HR_PROBATION_CHECKLIST_ITEMS: readonly Pick<HrChecklistItemDefinition, "title" | "ownerRole" | "completionRule" | "mandatory">[] = [
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "manager", title: "Manager review" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "hr", title: "HR review" },
  { completionRule: "manual_confirmation", mandatory: true, ownerRole: "manager", title: "Performance review" },
  { completionRule: "hr_action_approved", mandatory: true, ownerRole: "hr", title: "Confirmation" },
  { completionRule: "hr_action_approved", mandatory: false, ownerRole: "hr", title: "Extension" },
  { completionRule: "hr_action_approved", mandatory: false, ownerRole: "manager", title: "Termination recommendation" },
];

export const HR_CLEARANCE_CHECKLIST_ITEMS: readonly Pick<HrChecklistItemDefinition, "title" | "ownerRole" | "completionRule" | "mandatory">[] = [
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "warehouse", title: "Warehouse" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "finance", title: "Finance" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "hr", title: "HR" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "it", title: "IT" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "administration", title: "Administration" },
  { completionRule: "clearance_granted", mandatory: true, ownerRole: "manager", title: "Manager" },
  { completionRule: "custody_returned", mandatory: true, ownerRole: "hr", title: "Custody Return" },
];

export const HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT: HrTemplateLifecycleBoundaryContract = {
  capabilityPackPrecedenceResolvesWithoutDuplication: true,
  checklistExecutionImplemented: false,
  copiedOperationalData: false,
  directOperationalMutation: false,
  historicalEmployeesRetainAssignedTemplateVersion: true,
  key: "hr.templates.lifecycle.foundation.boundary",
  offboardingExecutionImplemented: false,
  onboardingExecutionImplemented: false,
  processingFlow: [
    "template_definition",
    "capability_pack_composition",
    "lifecycle_template_binding",
    "checklist_template_binding",
    "readiness_only_effects",
  ],
  referencesOnlyComposition: true,
  applyRuntimeImplemented: false,
  templatesAreReferenceBundles: true,
  workflowRuntimeImplemented: false,
};

export const HR_TEMPLATE_LIFECYCLE_PLATFORM_INTEGRATION = {
  key: "hr.templates.lifecycle.platform-integration",
  referencesDocumentEngine: true,
  referencesHrActionApplyEngine: true,
  referencesHrActionEngine: true,
  referencesHrAttendanceEngine: true,
  referencesHrCompensationEngine: true,
  referencesHrCore: true,
  referencesHrPayrollEngine: true,
  referencesHrPolicyEngine: true,
  referencesHrWorkflowApprovalBinding: true,
  referencesHrWorkforceEngine: true,
  referencesTimeline: true,
  executionRuntimeImplemented: false,
} as const;

const hrTemplateLifecycleImportExportSecurity = {
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

export const HR_TEMPLATE_LIFECYCLE_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "templateKind", label: "Template Kind" },
  ],
  key: "hr.templates.import",
  label: "HR Template & Lifecycle Foundation Import",
  mappings: [
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "template-kind", sourceColumn: "Template Kind", targetField: "templateKind" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { executionRuntimeImplemented: false, foundationOnly: true, referencesOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrTemplateLifecycleImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "code-required", message: "Template code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "name-required", message: "Template name is required.", severity: "error", type: "required" },
  ],
});

export const HR_TEMPLATE_LIFECYCLE_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "code", label: "Code", order: 1, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 2, sourceField: "name" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
    { dataType: "number", key: "version", label: "Version", order: 4, sourceField: "version" },
  ],
  key: "hr.templates.export",
  label: "HR Template & Lifecycle Foundation Export",
  mappings: [
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
    { key: "version", sourceField: "version", targetColumn: "Version" },
  ],
  metadata: {
    fileNameTemplate: "hr-template-lifecycle-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrTemplateLifecycleImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_TEMPLATE_LIFECYCLE_EVENT_DEFINITIONS = [
  "TemplateCreated",
  "TemplateVersionCreated",
  "CapabilityPackCreated",
  "CapabilityPackAssigned",
  "TemplateAssigned",
  "ChecklistTemplateCreated",
  "LifecycleTemplateCreated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for HR Template & Lifecycle Foundation. No onboarding, checklist, or lifecycle execution runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_TEMPLATE_LIFECYCLE_AUDIT_ACTIONS = {
  capabilityPackAssigned: defineAuditAction("hr.capability-pack.assigned"),
  capabilityPackCreated: defineAuditAction("hr.capability-pack.created"),
  checklistTemplateCreated: defineAuditAction("hr.checklist-template.created"),
  lifecycleTemplateCreated: defineAuditAction("hr.lifecycle-template.created"),
  templateAssigned: defineAuditAction("hr.template.assigned"),
  templateCreated: defineAuditAction("hr.template.created"),
  templateVersionCreated: defineAuditAction("hr.template.version.created"),
} as const;

export const HR_TEMPLATE_LIFECYCLE_FOUNDATION_TABLES = [
  "hr_templates",
  "hr_template_versions",
  "hr_template_components",
  "hr_capability_packs",
  "hr_capability_pack_components",
  "hr_lifecycle_templates",
  "hr_checklist_templates",
  "hr_checklist_items",
  "hr_required_document_sets",
  "hr_required_training_sets",
  "hr_required_custody_sets",
] as const;
