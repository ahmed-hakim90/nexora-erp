import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrSkillGapReadinessInput,
  defineHrCertificationDefinition,
  defineHrCompetency,
  defineHrCompetencyCategory,
  defineHrEmployeeSkillRecord,
  defineHrJobSkillRequirement,
  defineHrLanguageDefinition,
  defineHrLicenseDefinition,
  defineHrProficiencyLevel,
  defineHrSkill,
  defineHrSkillCategory,
  HR_CERTIFICATION_EXAMPLES,
  HR_COMPETENCY_EXAMPLES,
  HR_EMPLOYEE_CAPABILITY_PROFILE_CONTRACT,
  HR_FOUNDATION_CONTRACTS,
  HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT,
  HR_JOB_CAPABILITIES_INTEGRATION_CONTRACT,
  HR_LICENSE_EXAMPLES,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_PROFICIENCY_LEVEL_EXAMPLES,
  HR_RECRUITMENT_READINESS_CONTRACT,
  HR_SEARCH_PROVIDER_CONTRACT,
  HR_SKILL_CATEGORY_EXAMPLES,
  HR_SKILL_EXAMPLES,
  HR_SKILL_GAP_READINESS_CONTRACT,
  HR_SKILLS_COMPETENCY_AUDIT_ACTIONS,
  HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT,
  HR_SKILLS_COMPETENCY_EVENT_DEFINITIONS,
  HR_SKILLS_COMPETENCY_EXPORT_CONTRACT,
  HR_SKILLS_COMPETENCY_FOUNDATION_TABLES,
  HR_SKILLS_COMPETENCY_IMPORT_CONTRACT,
  HR_SKILLS_COMPETENCY_PERMISSION_METADATA,
  HR_SKILLS_COMPETENCY_PLATFORM_INTEGRATION,
  HR_SKILLS_COMPETENCY_REPORT_READINESS,
  HR_SKILLS_COMPETENCY_VALIDATION_RULES,
  HR_TRAINING_READINESS_CONTRACT,
  hrAppManifest,
} from "@/features/hr/server-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260702120000_hr_skills_competency_engine_foundation.sql");

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("HR Skills & Competency Foundation exposes categories, examples, and separated concepts", () => {
  assert.equal(HR_SKILL_CATEGORY_EXAMPLES.length, 10);
  assert.equal(HR_SKILL_EXAMPLES.length, 10);
  assert.equal(HR_COMPETENCY_EXAMPLES.length, 8);
  assert.equal(HR_PROFICIENCY_LEVEL_EXAMPLES.length, 5);
  assert.equal(HR_CERTIFICATION_EXAMPLES.length, 6);
  assert.equal(HR_LICENSE_EXAMPLES.length, 3);
  assert.equal(HR_SKILLS_COMPETENCY_VALIDATION_RULES.length, 11);
  assert.equal(HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT.mixesSkillsAndCompetenciesInOneTable, false);
});

test("skill and category contracts validate library master data", () => {
  const category = defineHrSkillCategory({
    branchId: null,
    categoryKey: "manufacturing",
    companyId: "company-1",
    description: "Manufacturing skills.",
    name: "Manufacturing",
    sortOrder: 10,
    status: "active",
    tenantId: "tenant-1",
  });
  const skill = defineHrSkill({
    branchId: null,
    companyId: "company-1",
    description: "CNC machine operation.",
    name: "CNC Operation",
    skillCategoryId: "category-1",
    skillCode: "cnc-operation",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(category.categoryKey, "manufacturing");
  assert.equal(skill.skillCode, "cnc-operation");
});

test("competency library remains independent from skills", () => {
  const competencyCategory = defineHrCompetencyCategory({
    branchId: null,
    categoryKey: "behavioral",
    companyId: "company-1",
    name: "Behavioral",
    sortOrder: 10,
    status: "active",
    tenantId: "tenant-1",
  });
  const competency = defineHrCompetency({
    branchId: null,
    companyId: "company-1",
    competencyCategoryId: "category-1",
    competencyCode: "problem-solving",
    description: "Structured problem solving.",
    independentFromSkills: true,
    name: "Problem Solving",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(competencyCategory.categoryKey, "behavioral");
  assert.equal(competency.independentFromSkills, true);
  assert.equal(HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT.competenciesIndependentFromSkills, true);
});

test("proficiency levels support reusable sequences without scoring runtime", () => {
  const level = defineHrProficiencyLevel({
    branchId: null,
    companyId: "company-1",
    description: "Advanced practitioner.",
    levelCode: "advanced",
    name: "Advanced",
    scoringEngineImplemented: false,
    sequence: 40,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(level.sequence, 40);
  assert.equal(HR_SKILLS_COMPETENCY_ENGINE_BOUNDARY_CONTRACT.scoringEngineImplemented, false);
});

test("certification and license definitions remain contract-only", () => {
  const certification = defineHrCertificationDefinition({
    branchId: null,
    certificationCode: "forklift-license",
    companyId: "company-1",
    expirationRequired: true,
    issuingAuthority: "Safety Board",
    name: "Forklift License",
    renewalRequired: true,
    renewalRuntimeImplemented: false,
    status: "active",
    tenantId: "tenant-1",
  });
  const license = defineHrLicenseDefinition({
    branchId: null,
    companyId: "company-1",
    expirationRequired: true,
    licenseCode: "driver-license",
    name: "Driver License",
    reminderRuntimeImplemented: false,
    renewalPolicy: "Annual renewal required.",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(certification.renewalRuntimeImplemented, false);
  assert.equal(license.reminderRuntimeImplemented, false);
});

test("language definitions use shared proficiency levels", () => {
  const language = defineHrLanguageDefinition({
    branchId: null,
    companyId: "company-1",
    languageCode: "en",
    name: "English",
    status: "active",
    tenantId: "tenant-1",
    usesSharedProficiencyLevels: true,
  });

  assert.equal(language.usesSharedProficiencyLevels, true);
});

test("job requirements reference capability definitions only", () => {
  const requirement = defineHrJobSkillRequirement({
    branchId: null,
    companyId: "company-1",
    isMandatory: true,
    jobId: "job-1",
    referencesDefinitionOnly: true,
    requiredProficiencyLevelId: "level-1",
    skillId: "skill-1",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(requirement.referencesDefinitionOnly, true);
  assert.equal(HR_JOB_CAPABILITIES_INTEGRATION_CONTRACT.jobReferencesCapabilityDefinitionsOnly, true);
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.skillsCompetencyFoundationIntegrated, true);
});

test("employee capability profile supports verification metadata without evaluation runtime", () => {
  const record = defineHrEmployeeSkillRecord({
    branchId: null,
    companyId: "company-1",
    effectiveFrom: "2026-01-01",
    employeeId: "employee-1",
    evaluationRuntimeImplemented: false,
    evidenceFileId: "file-1",
    proficiencyLevelId: "level-1",
    skillId: "skill-1",
    status: "active",
    tenantId: "tenant-1",
    verificationDate: "2026-01-15",
    verifiedBy: "user-1",
  });

  assert.equal(record.verifiedBy, "user-1");
  assert.equal(HR_EMPLOYEE_CAPABILITY_PROFILE_CONTRACT.evaluationRuntimeImplemented, false);
  assert.equal(HR_EMPLOYEE_CAPABILITY_PROFILE_CONTRACT.supportsEvidenceAttachment, true);
});

test("skill gap, training, and recruitment readiness remain contract-only", () => {
  const gapInput = createHrSkillGapReadinessInput({
    effectiveDate: "2026-06-01",
    employeeId: "employee-1",
    jobId: "job-1",
  });

  assert.equal(gapInput.gapCalculationImplemented, false);
  assert.equal(HR_SKILL_GAP_READINESS_CONTRACT.runtimeImplemented, false);
  assert.equal(HR_TRAINING_READINESS_CONTRACT.learningRuntimeImplemented, false);
  assert.deepEqual(HR_TRAINING_READINESS_CONTRACT.supportedFutureChain, ["skill", "training_course", "certification"]);
  assert.equal(HR_RECRUITMENT_READINESS_CONTRACT.atsRuntimeImplemented, false);
  assert.equal(HR_RECRUITMENT_READINESS_CONTRACT.candidatesUseSharedSkillsLibrary, true);
});

test("search registration and permission metadata cover skills and competency entities", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_skill"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_competency"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_certification_definition"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_employee_capability"), true);
  assert.equal(HR_SKILLS_COMPETENCY_PERMISSION_METADATA.length, 6);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.skillsView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.competenciesManage), true);
});

test("HR foundation contracts and app manifest include skills competency foundation", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrSkillsCompetencyFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrSkillsCompetencyRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.skillsCompetencyTables, HR_SKILLS_COMPETENCY_FOUNDATION_TABLES);
  assert.equal(HR_SKILLS_COMPETENCY_IMPORT_CONTRACT.key, "hr.skills-competency.import");
  assert.equal(HR_SKILLS_COMPETENCY_EXPORT_CONTRACT.key, "hr.skills-competency.export");
  assert.equal(HR_SKILLS_COMPETENCY_PLATFORM_INTEGRATION.searchReadinessRegistered, true);
  assert.equal(HR_SKILLS_COMPETENCY_REPORT_READINESS.runtimeReportGenerationImplemented, false);
  assert.equal(HR_SKILLS_COMPETENCY_EVENT_DEFINITIONS.length, 9);
  assert.equal(HR_SKILLS_COMPETENCY_AUDIT_ACTIONS.skillCreated, "hr.skills-competency.skill.created");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.skills-competency-foundation"), true);
});

test("skills competency migration defines tables RLS and separated capability entities", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_SKILLS_COMPETENCY_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /hr\.skills\.view/);
  assert.match(migration, /hr\.competencies\.manage/);
  assert.match(migration, /hr_job_skill_requirements/);
  assert.match(migration, /hr_employee_skill_records/);
  assert.doesNotMatch(migration, /create table public\.hr_recruitment/i);
  assert.doesNotMatch(migration, /learning_course/i);
  assert.doesNotMatch(migration, /performance_review/i);
});
