import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrJobRecordStatus = "draft" | "active" | "inactive" | "locked" | "archived";

export type HrJobEmploymentType =
  | "full-time"
  | "part-time"
  | "temporary"
  | "contractor"
  | "intern"
  | "seasonal"
  | "consultant";

export type HrJobRequirementType =
  | "education"
  | "experience"
  | "certification"
  | "license"
  | "language";

export type HrJobArchitectureScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrJobFamilyDefinition = HrJobArchitectureScope & Readonly<{
  familyCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: HrJobRecordStatus;
}>;

export type HrJobFunctionDefinition = HrJobArchitectureScope & Readonly<{
  jobFamilyId: string;
  functionCode: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: HrJobRecordStatus;
}>;

export type HrJobLevelDefinition = HrJobArchitectureScope & Readonly<{
  levelCode: string;
  name: string;
  description?: string | null;
  hierarchySequence: number;
  status: HrJobRecordStatus;
}>;

export type HrJobGradeDefinition = HrJobArchitectureScope & Readonly<{
  gradeKey: string;
  name: string;
  gradeLevel?: string | null;
  description?: string | null;
  sequence?: number | null;
  status: HrJobRecordStatus;
  salaryBandsImplemented: false;
}>;

export type HrJobDefinition = HrJobArchitectureScope & Readonly<{
  jobCode: string;
  jobTitle: string;
  jobFamilyId: string;
  jobFunctionId: string;
  description?: string | null;
  responsibilities?: string | null;
  employmentType?: HrJobEmploymentType | null;
  requiredExperience?: string | null;
  educationLevel?: string | null;
  defaultGradeId?: string | null;
  jobLevelId?: string | null;
  status: HrJobRecordStatus;
  jobRuntimeImplemented: false;
  isEmployeeRecord: false;
}>;

export type HrCareerPathDefinition = HrJobArchitectureScope & Readonly<{
  pathCode: string;
  name: string;
  description?: string | null;
  status: HrJobRecordStatus;
  careerPathRuntimeImplemented: false;
}>;

export type HrCareerPathStepDefinition = HrJobArchitectureScope & Readonly<{
  careerPathId: string;
  jobId: string;
  stepSequence: number;
  status: HrJobRecordStatus;
  careerPathRuntimeImplemented: false;
}>;

export type HrJobRequirementDefinition = HrJobArchitectureScope & Readonly<{
  jobId: string;
  requirementType: HrJobRequirementType;
  requirementKey: string;
  description?: string | null;
  isMandatory: boolean;
  status: HrJobRecordStatus;
  skillsIntegrationReady: true;
}>;

export type HrJobArchitectureEngineBoundaryContract = Readonly<{
  key: string;
  jobArchitectureOwnsJobDefinitions: true;
  positionReferencesJobOnly: true;
  positionDuplicatesJobInformation: false;
  directEmployeeToJobRelationshipAllowed: false;
  legacyJobTitleTableSuperseded: true;
  recruitmentRuntimeImplemented: false;
  payrollCalculationImplemented: false;
  performanceRuntimeImplemented: false;
  competencyRuntimeImplemented: false;
  skillsCompetencyFoundationIntegrated: true;
  careerPathRuntimeImplemented: false;
  jobArchitectureRuntimeImplemented: false;
  processingFlow: readonly [
    "organization",
    "job_architecture",
    "position",
    "employment",
    "assignment",
    "employee",
  ];
}>;

export type HrJobAssignmentResolutionContract = Readonly<{
  key: string;
  supportedResolutionChain: readonly [
    "employee",
    "assignment",
    "position",
    "job",
  ];
  directEmployeeToJobRelationshipAllowed: false;
  assignmentResolverIsAuthoritativeReadPath: true;
  positionJobIdIsCanonical: true;
  runtimeImplemented: false;
}>;

export type HrJobArchitectureValidationRule = Readonly<{
  key: string;
  message: string;
  severity: "error";
  validationRuntimeImplemented: false;
}>;

export function defineHrJobFamily<T extends HrJobFamilyDefinition>(definition: T): T {
  return definition;
}

export function defineHrJobFunction<T extends HrJobFunctionDefinition>(definition: T): T {
  return definition;
}

export function defineHrJobLevel<T extends HrJobLevelDefinition>(definition: T): T {
  return definition;
}

export function defineHrJobGrade<T extends HrJobGradeDefinition>(definition: T): T {
  return definition;
}

export function defineHrJob<T extends HrJobDefinition>(definition: T): T {
  return definition;
}

export function defineHrCareerPath<T extends HrCareerPathDefinition>(definition: T): T {
  return definition;
}

export function defineHrCareerPathStep<T extends HrCareerPathStepDefinition>(definition: T): T {
  return definition;
}

export function defineHrJobRequirement<T extends HrJobRequirementDefinition>(definition: T): T {
  return definition;
}

export function resolveHrEmployeeJobChain(input: Readonly<{
  employeeId: string;
  assignmentPositionId?: string | null;
  positionJobId?: string | null;
  directJobId?: string | null;
}>): Readonly<{
  employeeId: string;
  resolution: "assignment.position.job" | "forbidden-direct-employee-job" | "unresolved";
  assignmentPositionId?: string | null;
  positionJobId?: string | null;
  jobId?: string | null;
  runtimeImplemented: false;
}> {
  if (input.directJobId) {
    return {
      employeeId: input.employeeId,
      resolution: "forbidden-direct-employee-job",
      runtimeImplemented: false,
    };
  }

  if (input.assignmentPositionId && input.positionJobId) {
    return {
      assignmentPositionId: input.assignmentPositionId,
      employeeId: input.employeeId,
      jobId: input.positionJobId,
      positionJobId: input.positionJobId,
      resolution: "assignment.position.job",
      runtimeImplemented: false,
    };
  }

  return {
    employeeId: input.employeeId,
    resolution: "unresolved",
    runtimeImplemented: false,
  };
}

export const HR_JOB_REQUIREMENT_TYPES = [
  "education",
  "experience",
  "certification",
  "license",
  "language",
] as const satisfies readonly HrJobRequirementType[];

export const HR_JOB_FAMILY_EXAMPLES = [
  { familyCode: "production", name: "Production" },
  { familyCode: "warehouse", name: "Warehouse" },
  { familyCode: "finance", name: "Finance" },
  { familyCode: "hr", name: "HR" },
  { familyCode: "sales", name: "Sales" },
  { familyCode: "purchasing", name: "Purchasing" },
  { familyCode: "quality", name: "Quality" },
  { familyCode: "maintenance", name: "Maintenance" },
  { familyCode: "service", name: "Service" },
  { familyCode: "logistics", name: "Logistics" },
  { familyCode: "it", name: "IT" },
  { familyCode: "administration", name: "Administration" },
] as const;

export const HR_JOB_FUNCTION_EXAMPLES = [
  { familyCode: "production", functionCode: "assembly", name: "Assembly" },
  { familyCode: "production", functionCode: "packing", name: "Packing" },
  { familyCode: "production", functionCode: "injection", name: "Injection" },
  { familyCode: "production", functionCode: "quality", name: "Quality" },
  { familyCode: "warehouse", functionCode: "receiving", name: "Receiving" },
  { familyCode: "warehouse", functionCode: "picking", name: "Picking" },
  { familyCode: "warehouse", functionCode: "shipping", name: "Shipping" },
  { familyCode: "warehouse", functionCode: "inventory-control", name: "Inventory Control" },
] as const;

export const HR_JOB_LEVEL_EXAMPLES = [
  { hierarchySequence: 10, levelCode: "junior", name: "Junior" },
  { hierarchySequence: 20, levelCode: "mid", name: "Mid" },
  { hierarchySequence: 30, levelCode: "senior", name: "Senior" },
  { hierarchySequence: 40, levelCode: "lead", name: "Lead" },
  { hierarchySequence: 50, levelCode: "supervisor", name: "Supervisor" },
  { hierarchySequence: 60, levelCode: "manager", name: "Manager" },
  { hierarchySequence: 70, levelCode: "senior-manager", name: "Senior Manager" },
  { hierarchySequence: 80, levelCode: "director", name: "Director" },
  { hierarchySequence: 90, levelCode: "executive", name: "Executive" },
] as const;

export const HR_CAREER_PATH_EXAMPLE_STEPS = [
  { jobCode: "production-worker", stepSequence: 1 },
  { jobCode: "senior-production-worker", stepSequence: 2 },
  { jobCode: "line-leader", stepSequence: 3 },
  { jobCode: "production-supervisor", stepSequence: 4 },
  { jobCode: "production-manager", stepSequence: 5 },
] as const;

export const HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT: HrJobArchitectureEngineBoundaryContract = {
  careerPathRuntimeImplemented: false,
  competencyRuntimeImplemented: false,
  directEmployeeToJobRelationshipAllowed: false,
  jobArchitectureOwnsJobDefinitions: true,
  jobArchitectureRuntimeImplemented: false,
  key: "hr.job-architecture.boundary",
  legacyJobTitleTableSuperseded: true,
  payrollCalculationImplemented: false,
  performanceRuntimeImplemented: false,
  positionDuplicatesJobInformation: false,
  positionReferencesJobOnly: true,
  skillsCompetencyFoundationIntegrated: true,
  processingFlow: [
    "organization",
    "job_architecture",
    "position",
    "employment",
    "assignment",
    "employee",
  ],
  recruitmentRuntimeImplemented: false,
};

export const HR_JOB_ASSIGNMENT_RESOLUTION_CONTRACT: HrJobAssignmentResolutionContract = {
  assignmentResolverIsAuthoritativeReadPath: true,
  directEmployeeToJobRelationshipAllowed: false,
  key: "hr.job-architecture.assignment-resolution",
  positionJobIdIsCanonical: true,
  runtimeImplemented: false,
  supportedResolutionChain: [
    "employee",
    "assignment",
    "position",
    "job",
  ],
};

export const HR_JOB_ARCHITECTURE_VALIDATION_RULES: readonly HrJobArchitectureValidationRule[] = [
  {
    key: "job_family_code_required",
    message: "Job family code is required.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "job_function_belongs_to_family",
    message: "Job function must belong to the selected job family.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "job_definition_family_function_required",
    message: "Job definition must reference both a job family and a job function.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "job_grade_sequence_positive",
    message: "Job grade sequence must be greater than zero when provided.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "job_level_hierarchy_sequence_positive",
    message: "Job level hierarchy sequence must be greater than zero.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "position_references_exactly_one_job",
    message: "Each position must reference exactly one job definition.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "position_must_not_duplicate_job_information",
    message: "Positions must not duplicate job title, grade, or family information.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "career_path_steps_unique_sequence",
    message: "Career path steps must have unique sequence values within a path.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "job_requirement_key_unique_per_type",
    message: "Job requirement keys must be unique per job and requirement type.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
  {
    key: "employee_job_resolution_requires_assignment_position",
    message: "Employee job resolution must flow through assignment and position.",
    severity: "error",
    validationRuntimeImplemented: false,
  },
];

export const HR_JOB_ARCHITECTURE_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  notificationReadinessRegistered: true,
  reportingReadinessRegistered: true,
  searchReadinessRegistered: true,
  workflowApprovalContractsOnly: true,
  workflowRuntimeImplemented: false,
} as const;

export const HR_JOB_ARCHITECTURE_REPORT_READINESS = {
  datasets: [
    "hr_job_family",
    "hr_job_function",
    "hr_job",
    "hr_job_grade",
    "hr_job_level",
    "hr_career_path",
    "hr_job_requirement",
    "hr_position_job_link",
  ] as const,
  key: "hr.job-architecture.report-readiness",
  runtimeReportGenerationImplemented: false,
} as const;

const hrJobArchitectureImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: false,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: false,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_JOB_ARCHITECTURE_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "familyCode", label: "Family Code" },
    { dataType: "text", key: "functionCode", label: "Function Code" },
    { dataType: "text", key: "status", label: "Status" },
  ],
  key: "hr.job-architecture.import",
  label: "HR Job Architecture Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "family-code", sourceColumn: "Family Code", targetField: "familyCode" },
    { key: "function-code", sourceColumn: "Function Code", targetField: "functionCode" },
    { key: "status", sourceColumn: "Status", targetField: "status" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, jobArchitectureRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrJobArchitectureImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "job-architecture-code-required", message: "Job architecture code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "job-architecture-name-required", message: "Job architecture name is required.", severity: "error", type: "required" },
  ],
});

export const HR_JOB_ARCHITECTURE_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name" },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.job-architecture.export",
  label: "HR Job Architecture Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-job-architecture-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrJobArchitectureImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_JOB_ARCHITECTURE_EVENT_DEFINITIONS = [
  "JobFamilyCreated",
  "JobFunctionCreated",
  "JobLevelCreated",
  "JobGradeUpdated",
  "JobDefinitionCreated",
  "JobDefinitionActivated",
  "JobDefinitionArchived",
  "CareerPathCreated",
  "JobRequirementCreated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Job Architecture Foundation. No runtime workflow handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_JOB_ARCHITECTURE_AUDIT_ACTIONS = {
  careerPathCreated: defineAuditAction("hr.job-architecture.career-path.created"),
  jobArchived: defineAuditAction("hr.job-architecture.job.archived"),
  jobCreated: defineAuditAction("hr.job-architecture.job.created"),
  jobFamilyCreated: defineAuditAction("hr.job-architecture.job-family.created"),
  jobFunctionCreated: defineAuditAction("hr.job-architecture.job-function.created"),
  jobGradeUpdated: defineAuditAction("hr.job-architecture.job-grade.updated"),
  jobLevelCreated: defineAuditAction("hr.job-architecture.job-level.created"),
  jobRequirementCreated: defineAuditAction("hr.job-architecture.job-requirement.created"),
  jobUpdated: defineAuditAction("hr.job-architecture.job.updated"),
} as const;

export const HR_JOB_ARCHITECTURE_FOUNDATION_TABLES = [
  "hr_job_families",
  "hr_job_functions",
  "hr_job_levels",
  "hr_jobs",
  "hr_career_paths",
  "hr_career_path_steps",
  "hr_job_requirements",
] as const;

export const HR_JOB_ARCHITECTURE_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.jobsView, scope: "tenant-company-branch", entity: "job-architecture" },
  { key: HR_PERMISSIONS.jobsCreate, scope: "tenant-company-branch", entity: "job-definition" },
  { key: HR_PERMISSIONS.jobsEdit, scope: "tenant-company-branch", entity: "job-definition" },
  { key: HR_PERMISSIONS.jobsArchive, scope: "tenant-company-branch", entity: "job-definition" },
  { key: HR_PERMISSIONS.jobFamiliesManage, scope: "tenant-company-branch", entity: "job-family" },
  { key: HR_PERMISSIONS.jobFunctionsManage, scope: "tenant-company-branch", entity: "job-function" },
  { key: HR_PERMISSIONS.jobGradesManage, scope: "tenant-company-branch", entity: "job-grade" },
  { key: HR_PERMISSIONS.jobLevelsManage, scope: "tenant-company-branch", entity: "job-level" },
] as const;
