import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrCapabilityRecordStatus =
  | "draft"
  | "active"
  | "inactive"
  | "expired"
  | "superseded"
  | "revoked"
  | "archived";

export type HrCapabilityLibraryStatus = "draft" | "active" | "inactive" | "locked" | "archived";

export type HrSkillsCompetencyScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrSkillCategoryDefinition = HrSkillsCompetencyScope & Readonly<{
  categoryKey: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: HrCapabilityLibraryStatus;
}>;

export type HrSkillDefinition = HrSkillsCompetencyScope & Readonly<{
  skillCategoryId: string;
  skillCode: string;
  name: string;
  description?: string | null;
  status: HrCapabilityLibraryStatus;
}>;

export type HrCompetencyCategoryDefinition = HrSkillsCompetencyScope & Readonly<{
  categoryKey: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: HrCapabilityLibraryStatus;
}>;

export type HrCompetencyDefinition = HrSkillsCompetencyScope & Readonly<{
  competencyCategoryId: string;
  competencyCode: string;
  name: string;
  description?: string | null;
  status: HrCapabilityLibraryStatus;
  independentFromSkills: true;
}>;

export type HrProficiencyLevelDefinition = HrSkillsCompetencyScope & Readonly<{
  levelCode: string;
  name: string;
  description?: string | null;
  sequence: number;
  status: HrCapabilityLibraryStatus;
  scoringEngineImplemented: false;
}>;

export type HrCertificationDefinition = HrSkillsCompetencyScope & Readonly<{
  certificationCode: string;
  name: string;
  issuingAuthority?: string | null;
  expirationRequired: boolean;
  renewalRequired: boolean;
  status: HrCapabilityLibraryStatus;
  renewalRuntimeImplemented: false;
}>;

export type HrLicenseDefinition = HrSkillsCompetencyScope & Readonly<{
  licenseCode: string;
  name: string;
  validityPeriodDays?: number | null;
  expirationRequired: boolean;
  renewalPolicy?: string | null;
  status: HrCapabilityLibraryStatus;
  reminderRuntimeImplemented: false;
}>;

export type HrLanguageDefinition = HrSkillsCompetencyScope & Readonly<{
  languageCode: string;
  name: string;
  status: HrCapabilityLibraryStatus;
  usesSharedProficiencyLevels: true;
}>;

export type HrQualificationDefinition = HrSkillsCompetencyScope & Readonly<{
  qualificationCode: string;
  name: string;
  description?: string | null;
  qualificationType: string;
  status: HrCapabilityLibraryStatus;
}>;

export type HrEmployeeCapabilityRecordBase = HrSkillsCompetencyScope & Readonly<{
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  verifiedBy?: string | null;
  verificationDate?: string | null;
  evidenceFileId?: string | null;
  status: HrCapabilityRecordStatus;
  evaluationRuntimeImplemented: false;
}>;

export type HrEmployeeSkillRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  skillId: string;
  proficiencyLevelId?: string | null;
}>;

export type HrEmployeeCompetencyRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  competencyId: string;
  proficiencyLevelId?: string | null;
}>;

export type HrEmployeeCertificationRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  certificationDefinitionId: string;
  certificateNumber?: string | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  renewalRuntimeImplemented: false;
}>;

export type HrEmployeeLicenseRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  licenseDefinitionId: string;
  licenseNumber?: string | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  reminderRuntimeImplemented: false;
}>;

export type HrEmployeeLanguageRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  languageDefinitionId: string;
  readingProficiencyLevelId?: string | null;
  writingProficiencyLevelId?: string | null;
  speakingProficiencyLevelId?: string | null;
}>;

export type HrEmployeeQualificationRecordDefinition = HrEmployeeCapabilityRecordBase & Readonly<{
  qualificationDefinitionId: string;
}>;

export type HrJobSkillRequirementDefinition = HrSkillsCompetencyScope & Readonly<{
  jobId: string;
  skillId: string;
  requiredProficiencyLevelId?: string | null;
  isMandatory: boolean;
  status: HrCapabilityLibraryStatus;
  referencesDefinitionOnly: true;
}>;

export type HrJobCompetencyRequirementDefinition = HrSkillsCompetencyScope & Readonly<{
  jobId: string;
  competencyId: string;
  requiredProficiencyLevelId?: string | null;
  isMandatory: boolean;
  status: HrCapabilityLibraryStatus;
  referencesDefinitionOnly: true;
}>;

export type HrJobCertificationRequirementDefinition = HrSkillsCompetencyScope & Readonly<{
  jobId: string;
  certificationDefinitionId: string;
  isMandatory: boolean;
  status: HrCapabilityLibraryStatus;
  referencesDefinitionOnly: true;
}>;

export type HrJobLicenseRequirementDefinition = HrSkillsCompetencyScope & Readonly<{
  jobId: string;
  licenseDefinitionId: string;
  isMandatory: boolean;
  status: HrCapabilityLibraryStatus;
  referencesDefinitionOnly: true;
}>;

export type HrJobLanguageRequirementDefinition = HrSkillsCompetencyScope & Readonly<{
  jobId: string;
  languageDefinitionId: string;
  readingProficiencyLevelId?: string | null;
  writingProficiencyLevelId?: string | null;
  speakingProficiencyLevelId?: string | null;
  isMandatory: boolean;
  status: HrCapabilityLibraryStatus;
  referencesDefinitionOnly: true;
}>;

export type HrSkillsCompetencyEngineBoundaryContract = Readonly<{
  key: string;
  skillsLibraryIsSingleSourceOfTruth: true;
  competenciesIndependentFromSkills: true;
  capabilityConceptsSeparated: true;
  mixesSkillsAndCompetenciesInOneTable: false;
  evaluationRuntimeImplemented: false;
  learningRuntimeImplemented: false;
  recruitmentRuntimeImplemented: false;
  performanceRuntimeImplemented: false;
  skillGapCalculationImplemented: false;
  scoringEngineImplemented: false;
  processingFlow: readonly [
    "capability_library",
    "job_requirements",
    "employee_capability_profile",
    "future_gap_analysis",
    "future_talent_apps",
  ];
}>;

export type HrSkillGapReadinessContract = Readonly<{
  key: string;
  comparisonDimensions: readonly [
    "employee_skills",
    "employee_competencies",
    "employee_certifications",
    "employee_licenses",
    "employee_languages",
    "job_skill_requirements",
    "job_competency_requirements",
    "job_certification_requirements",
    "job_license_requirements",
    "job_language_requirements",
  ];
  gapCalculationImplemented: false;
  runtimeImplemented: false;
}>;

export type HrTrainingReadinessContract = Readonly<{
  key: string;
  supportedFutureChain: readonly ["skill", "training_course", "certification"];
  learningRuntimeImplemented: false;
  courseMappingImplemented: false;
}>;

export type HrRecruitmentReadinessContract = Readonly<{
  key: string;
  candidatesUseSharedSkillsLibrary: true;
  jobsUseSharedSkillsLibrary: true;
  atsRuntimeImplemented: false;
  candidateProfilesImplemented: false;
}>;

export type HrJobCapabilitiesIntegrationContract = Readonly<{
  key: string;
  jobReferencesCapabilityDefinitionsOnly: true;
  duplicatesCapabilityDefinitionsInJobs: false;
  referencesHrJobArchitectureFoundation: true;
  runtimeImplemented: false;
}>;

export type HrEmployeeCapabilityProfileContract = Readonly<{
  key: string;
  employeeCapabilityRecordsAreEffectiveDated: true;
  supportsVerificationMetadata: true;
  supportsEvidenceAttachment: true;
  evaluationRuntimeImplemented: false;
  capabilityRecordTypes: readonly [
    "skill",
    "competency",
    "certification",
    "license",
    "language",
    "qualification",
  ];
}>;

export function defineHrSkillCategory<T extends HrSkillCategoryDefinition>(definition: T): T {
  return definition;
}

export function defineHrSkill<T extends HrSkillDefinition>(definition: T): T {
  return definition;
}

export function defineHrCompetencyCategory<T extends HrCompetencyCategoryDefinition>(definition: T): T {
  return definition;
}

export function defineHrCompetency<T extends HrCompetencyDefinition>(definition: T): T {
  return definition;
}

export function defineHrProficiencyLevel<T extends HrProficiencyLevelDefinition>(definition: T): T {
  return definition;
}

export function defineHrCertificationDefinition<T extends HrCertificationDefinition>(definition: T): T {
  return definition;
}

export function defineHrLicenseDefinition<T extends HrLicenseDefinition>(definition: T): T {
  return definition;
}

export function defineHrLanguageDefinition<T extends HrLanguageDefinition>(definition: T): T {
  return definition;
}

export function defineHrQualificationDefinition<T extends HrQualificationDefinition>(definition: T): T {
  return definition;
}

export function defineHrEmployeeSkillRecord<T extends HrEmployeeSkillRecordDefinition>(definition: T): T {
  return definition;
}

export function defineHrJobSkillRequirement<T extends HrJobSkillRequirementDefinition>(definition: T): T {
  return definition;
}

export function createHrSkillGapReadinessInput(input: Readonly<{
  employeeId: string;
  jobId: string;
  effectiveDate: string;
}>): Readonly<{
  employeeId: string;
  jobId: string;
  effectiveDate: string;
  gapCalculationImplemented: false;
  runtimeImplemented: false;
}> {
  return {
    ...input,
    gapCalculationImplemented: false,
    runtimeImplemented: false,
  };
}

export const HR_SKILL_CATEGORY_EXAMPLES = [
  { categoryKey: "technical", name: "Technical" },
  { categoryKey: "functional", name: "Functional" },
  { categoryKey: "leadership", name: "Leadership" },
  { categoryKey: "administrative", name: "Administrative" },
  { categoryKey: "safety", name: "Safety" },
  { categoryKey: "it", name: "IT" },
  { categoryKey: "language", name: "Language" },
  { categoryKey: "manufacturing", name: "Manufacturing" },
  { categoryKey: "quality", name: "Quality" },
  { categoryKey: "maintenance", name: "Maintenance" },
] as const;

export const HR_SKILL_EXAMPLES = [
  { name: "Welding", skillCode: "welding" },
  { name: "Forklift Operation", skillCode: "forklift-operation" },
  { name: "Inventory Management", skillCode: "inventory-management" },
  { name: "SAP", skillCode: "sap" },
  { name: "Excel", skillCode: "excel" },
  { name: "Leadership", skillCode: "leadership" },
  { name: "Negotiation", skillCode: "negotiation" },
  { name: "Machine Maintenance", skillCode: "machine-maintenance" },
  { name: "Quality Inspection", skillCode: "quality-inspection" },
  { name: "CNC Operation", skillCode: "cnc-operation" },
] as const;

export const HR_COMPETENCY_EXAMPLES = [
  { competencyCode: "communication", name: "Communication" },
  { competencyCode: "teamwork", name: "Teamwork" },
  { competencyCode: "problem-solving", name: "Problem Solving" },
  { competencyCode: "leadership", name: "Leadership" },
  { competencyCode: "decision-making", name: "Decision Making" },
  { competencyCode: "customer-focus", name: "Customer Focus" },
  { competencyCode: "innovation", name: "Innovation" },
  { competencyCode: "time-management", name: "Time Management" },
] as const;

export const HR_PROFICIENCY_LEVEL_EXAMPLES = [
  { levelCode: "beginner", name: "Beginner", sequence: 10 },
  { levelCode: "basic", name: "Basic", sequence: 20 },
  { levelCode: "intermediate", name: "Intermediate", sequence: 30 },
  { levelCode: "advanced", name: "Advanced", sequence: 40 },
  { levelCode: "expert", name: "Expert", sequence: 50 },
] as const;

export const HR_CERTIFICATION_EXAMPLES = [
  { certificationCode: "iso-9001-internal-auditor", name: "ISO 9001 Internal Auditor" },
  { certificationCode: "forklift-license", name: "Forklift License" },
  { certificationCode: "osha-safety", name: "OSHA Safety" },
  { certificationCode: "pmp", name: "PMP" },
  { certificationCode: "cpa", name: "CPA" },
  { certificationCode: "first-aid", name: "First Aid" },
] as const;

export const HR_LICENSE_EXAMPLES = [
  { licenseCode: "driver-license", name: "Driver License" },
  { licenseCode: "machine-operator-license", name: "Machine Operator License" },
  { licenseCode: "electrical-license", name: "Electrical License" },
] as const;

export const HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT: HrSkillsCompetencyEngineBoundaryContract = {
  capabilityConceptsSeparated: true,
  competenciesIndependentFromSkills: true,
  evaluationRuntimeImplemented: false,
  key: "hr.skills-competency.boundary",
  learningRuntimeImplemented: false,
  mixesSkillsAndCompetenciesInOneTable: false,
  performanceRuntimeImplemented: false,
  processingFlow: [
    "capability_library",
    "job_requirements",
    "employee_capability_profile",
    "future_gap_analysis",
    "future_talent_apps",
  ],
  recruitmentRuntimeImplemented: false,
  scoringEngineImplemented: false,
  skillGapCalculationImplemented: false,
  skillsLibraryIsSingleSourceOfTruth: true,
};

export const HR_SKILL_GAP_READINESS_CONTRACT: HrSkillGapReadinessContract = {
  comparisonDimensions: [
    "employee_skills",
    "employee_competencies",
    "employee_certifications",
    "employee_licenses",
    "employee_languages",
    "job_skill_requirements",
    "job_competency_requirements",
    "job_certification_requirements",
    "job_license_requirements",
    "job_language_requirements",
  ],
  gapCalculationImplemented: false,
  key: "hr.skills-competency.skill-gap-readiness",
  runtimeImplemented: false,
};

export const HR_TRAINING_READINESS_CONTRACT: HrTrainingReadinessContract = {
  courseMappingImplemented: false,
  key: "hr.skills-competency.training-readiness",
  learningRuntimeImplemented: false,
  supportedFutureChain: ["skill", "training_course", "certification"],
};

export const HR_RECRUITMENT_READINESS_CONTRACT: HrRecruitmentReadinessContract = {
  atsRuntimeImplemented: false,
  candidateProfilesImplemented: false,
  candidatesUseSharedSkillsLibrary: true,
  jobsUseSharedSkillsLibrary: true,
  key: "hr.skills-competency.recruitment-readiness",
};

export const HR_JOB_CAPABILITIES_INTEGRATION_CONTRACT: HrJobCapabilitiesIntegrationContract = {
  duplicatesCapabilityDefinitionsInJobs: false,
  jobReferencesCapabilityDefinitionsOnly: true,
  key: "hr.skills-competency.job-integration",
  referencesHrJobArchitectureFoundation: true,
  runtimeImplemented: false,
};

export const HR_EMPLOYEE_CAPABILITY_PROFILE_CONTRACT: HrEmployeeCapabilityProfileContract = {
  capabilityRecordTypes: [
    "skill",
    "competency",
    "certification",
    "license",
    "language",
    "qualification",
  ],
  employeeCapabilityRecordsAreEffectiveDated: true,
  evaluationRuntimeImplemented: false,
  key: "hr.skills-competency.employee-capability-profile",
  supportsEvidenceAttachment: true,
  supportsVerificationMetadata: true,
};

export const HR_SKILLS_COMPETENCY_VALIDATION_RULES = [
  { key: "skill_code_required", message: "Skill code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "skill_category_required", message: "Skill category is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "competency_code_required", message: "Competency code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "competency_category_required", message: "Competency category is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "proficiency_level_sequence_positive", message: "Proficiency level sequence must be greater than zero.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "certification_code_required", message: "Certification code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "license_code_required", message: "License code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "language_code_required", message: "Language code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "job_requirement_references_definition_only", message: "Job requirements must reference capability definitions only.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "employee_capability_effective_dates_valid", message: "Employee capability effective dates must be valid.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "capability_concepts_not_mixed", message: "Skills, competencies, certifications, licenses, and languages must remain separate.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_SKILLS_COMPETENCY_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  notificationReadinessRegistered: true,
  reportingReadinessRegistered: true,
  searchReadinessRegistered: true,
  workflowApprovalContractsOnly: true,
  workflowRuntimeImplemented: false,
} as const;

export const HR_SKILLS_COMPETENCY_REPORT_READINESS = {
  datasets: [
    "hr_skill",
    "hr_competency",
    "hr_certification_definition",
    "hr_license_definition",
    "hr_language_definition",
    "hr_proficiency_level",
    "hr_employee_capability_profile",
    "hr_job_capability_requirement",
    "hr_skill_gap_readiness",
  ] as const,
  key: "hr.skills-competency.report-readiness",
  runtimeReportGenerationImplemented: false,
} as const;

const hrSkillsCompetencyImportExportSecurity = {
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

export const HR_SKILLS_COMPETENCY_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "categoryKey", label: "Category Key" },
    { dataType: "text", key: "status", label: "Status" },
  ],
  key: "hr.skills-competency.import",
  label: "HR Skills & Competency Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "category-key", sourceColumn: "Category Key", targetField: "categoryKey" },
    { key: "status", sourceColumn: "Status", targetField: "status" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, skillsCompetencyRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrSkillsCompetencyImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "skills-competency-code-required", message: "Capability code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "skills-competency-name-required", message: "Capability name is required.", severity: "error", type: "required" },
  ],
});

export const HR_SKILLS_COMPETENCY_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name", sensitive: true, pii: true },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.skills-competency.export",
  label: "HR Skills & Competency Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-skills-competency-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrSkillsCompetencyImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_SKILLS_COMPETENCY_EVENT_DEFINITIONS = [
  "SkillCreated",
  "CompetencyCreated",
  "ProficiencyLevelCreated",
  "CertificationDefinitionCreated",
  "LicenseDefinitionCreated",
  "LanguageDefinitionCreated",
  "JobSkillRequirementCreated",
  "EmployeeSkillRecordCreated",
  "EmployeeCapabilityVerified",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Skills & Competency Foundation. No evaluation or learning runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_SKILLS_COMPETENCY_AUDIT_ACTIONS = {
  certificationDefinitionCreated: defineAuditAction("hr.skills-competency.certification.created"),
  competencyCreated: defineAuditAction("hr.skills-competency.competency.created"),
  employeeCapabilityVerified: defineAuditAction("hr.skills-competency.employee-capability.verified"),
  employeeSkillRecordCreated: defineAuditAction("hr.skills-competency.employee-skill.created"),
  jobSkillRequirementCreated: defineAuditAction("hr.skills-competency.job-skill-requirement.created"),
  languageDefinitionCreated: defineAuditAction("hr.skills-competency.language.created"),
  licenseDefinitionCreated: defineAuditAction("hr.skills-competency.license.created"),
  proficiencyLevelCreated: defineAuditAction("hr.skills-competency.proficiency-level.created"),
  skillCreated: defineAuditAction("hr.skills-competency.skill.created"),
} as const;

export const HR_SKILLS_COMPETENCY_FOUNDATION_TABLES = [
  "hr_skill_categories",
  "hr_skills",
  "hr_competency_categories",
  "hr_competencies",
  "hr_proficiency_levels",
  "hr_certification_definitions",
  "hr_license_definitions",
  "hr_language_definitions",
  "hr_qualification_definitions",
  "hr_job_skill_requirements",
  "hr_job_competency_requirements",
  "hr_job_certification_requirements",
  "hr_job_license_requirements",
  "hr_job_language_requirements",
  "hr_employee_skill_records",
  "hr_employee_competency_records",
  "hr_employee_certification_records",
  "hr_employee_license_records",
  "hr_employee_language_records",
  "hr_employee_qualification_records",
] as const;

export const HR_SKILLS_COMPETENCY_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.skillsView, scope: "tenant-company-branch", entity: "skills-library" },
  { key: HR_PERMISSIONS.skillsManage, scope: "tenant-company-branch", entity: "skills-library" },
  { key: HR_PERMISSIONS.competenciesManage, scope: "tenant-company-branch", entity: "competency-library" },
  { key: HR_PERMISSIONS.certificationsManage, scope: "tenant-company-branch", entity: "certification-library" },
  { key: HR_PERMISSIONS.licensesManage, scope: "tenant-company-branch", entity: "license-library" },
  { key: HR_PERMISSIONS.languagesManage, scope: "tenant-company-branch", entity: "language-library" },
] as const;
