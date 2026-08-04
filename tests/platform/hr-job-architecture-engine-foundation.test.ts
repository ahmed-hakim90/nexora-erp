import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  defineHrCareerPath,
  defineHrCareerPathStep,
  defineHrJob,
  defineHrJobFamily,
  defineHrJobFunction,
  defineHrJobGrade,
  defineHrJobLevel,
  defineHrJobRequirement,
  defineHrPosition,
  HR_ASSIGNMENT_JOB_ARCHITECTURE_INTEGRATION,
  HR_ASSIGNMENT_VALIDATION_RULES,
  HR_CAREER_PATH_EXAMPLE_STEPS,
  HR_FOUNDATION_CONTRACTS,
  HR_JOB_ARCHITECTURE_AUDIT_ACTIONS,
  HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT,
  HR_JOB_ARCHITECTURE_EVENT_DEFINITIONS,
  HR_JOB_ARCHITECTURE_EXPORT_CONTRACT,
  HR_JOB_ARCHITECTURE_FOUNDATION_TABLES,
  HR_JOB_ARCHITECTURE_IMPORT_CONTRACT,
  HR_JOB_ARCHITECTURE_PERMISSION_METADATA,
  HR_JOB_ARCHITECTURE_PLATFORM_INTEGRATION,
  HR_JOB_ARCHITECTURE_REPORT_READINESS,
  HR_JOB_ARCHITECTURE_VALIDATION_RULES,
  HR_JOB_ASSIGNMENT_RESOLUTION_CONTRACT,
  HR_JOB_FAMILY_EXAMPLES,
  HR_JOB_FUNCTION_EXAMPLES,
  HR_JOB_LEVEL_EXAMPLES,
  HR_JOB_REQUIREMENT_TYPES,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  resolveHrEmployeeJobChain,
  hrAppManifest,
} from "@/features/hr/server-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260701120000_hr_job_architecture_engine_foundation.sql");

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

test("HR Job Architecture Foundation exposes families, functions, levels, and requirement types", () => {
  assert.equal(HR_JOB_FAMILY_EXAMPLES.length, 12);
  assert.equal(HR_JOB_FUNCTION_EXAMPLES.length, 8);
  assert.equal(HR_JOB_LEVEL_EXAMPLES.length, 9);
  assert.equal(HR_JOB_REQUIREMENT_TYPES.length, 5);
  assert.equal(HR_CAREER_PATH_EXAMPLE_STEPS.length, 5);
  assert.equal(HR_JOB_ARCHITECTURE_VALIDATION_RULES.length, 10);
});

test("job family and function contracts validate scoped master data", () => {
  const family = defineHrJobFamily({
    branchId: null,
    companyId: "company-1",
    description: "Production job family.",
    familyCode: "production",
    name: "Production",
    sortOrder: 10,
    status: "active",
    tenantId: "tenant-1",
  });
  const jobFunction = defineHrJobFunction({
    branchId: null,
    companyId: "company-1",
    description: "Assembly operations.",
    functionCode: "assembly",
    jobFamilyId: "family-1",
    name: "Assembly",
    sortOrder: 10,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(family.familyCode, "production");
  assert.equal(jobFunction.functionCode, "assembly");
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.jobArchitectureOwnsJobDefinitions, true);
});

test("job definition contract separates reusable jobs from employees and positions", () => {
  const job = defineHrJob({
    branchId: null,
    companyId: "company-1",
    defaultGradeId: "grade-1",
    description: "Production worker job template.",
    educationLevel: "high-school",
    employmentType: "full-time",
    isEmployeeRecord: false,
    jobCode: "production-worker",
    jobFamilyId: "family-1",
    jobFunctionId: "function-1",
    jobLevelId: "level-1",
    jobRuntimeImplemented: false,
    jobTitle: "Production Worker",
    requiredExperience: "1-2 years",
    responsibilities: "Operate production line equipment.",
    status: "active",
    tenantId: "tenant-1",
  });
  const position = defineHrPosition({
    branchId: null,
    budgetedHeadcount: 5,
    companyId: "company-1",
    currentHeadcount: 2,
    departmentId: "department-1",
    effectiveFrom: "2026-01-01",
    jobId: "job-1",
    name: "Production Worker Seat A",
    positionKey: "production-worker-seat-a",
    status: "approved",
    tenantId: "tenant-1",
    vacancyStatus: "partially-filled",
  });

  assert.equal(job.jobCode, "production-worker");
  assert.equal(position.jobId, "job-1");
  assert.equal("employeeId" in job, false);
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.positionReferencesJobOnly, true);
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.positionDuplicatesJobInformation, false);
});

test("grade and level contracts support enterprise grading without payroll runtime", () => {
  const grade = defineHrJobGrade({
    branchId: null,
    companyId: "company-1",
    description: "Grade G3",
    gradeKey: "g3",
    gradeLevel: "G3",
    name: "Grade 3",
    salaryBandsImplemented: false,
    sequence: 30,
    status: "active",
    tenantId: "tenant-1",
  });
  const level = defineHrJobLevel({
    branchId: null,
    companyId: "company-1",
    description: "Senior individual contributor.",
    hierarchySequence: 30,
    levelCode: "senior",
    name: "Senior",
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(grade.sequence, 30);
  assert.equal(level.hierarchySequence, 30);
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.payrollCalculationImplemented, false);
});

test("career paths and requirements remain contract-only", () => {
  const careerPath = defineHrCareerPath({
    branchId: null,
    careerPathRuntimeImplemented: false,
    companyId: "company-1",
    description: "Production worker progression.",
    name: "Production Worker Path",
    pathCode: "production-worker-path",
    status: "active",
    tenantId: "tenant-1",
  });
  const step = defineHrCareerPathStep({
    branchId: null,
    careerPathId: "path-1",
    careerPathRuntimeImplemented: false,
    companyId: "company-1",
    jobId: "job-1",
    status: "active",
    stepSequence: 1,
    tenantId: "tenant-1",
  });
  const requirement = defineHrJobRequirement({
    branchId: null,
    companyId: "company-1",
    description: "High school diploma required.",
    isMandatory: true,
    jobId: "job-1",
    requirementKey: "high-school-diploma",
    requirementType: "education",
    skillsIntegrationReady: true,
    status: "active",
    tenantId: "tenant-1",
  });

  assert.equal(careerPath.pathCode, "production-worker-path");
  assert.equal(step.stepSequence, 1);
  assert.equal(requirement.requirementType, "education");
  assert.equal(HR_JOB_ARCHITECTURE_ENGINE_BOUNDARY_CONTRACT.careerPathRuntimeImplemented, false);
});

test("assignment integration resolves employee to job only through position", () => {
  const resolved = resolveHrEmployeeJobChain({
    assignmentPositionId: "position-1",
    employeeId: "employee-1",
    positionJobId: "job-1",
  });
  const forbidden = resolveHrEmployeeJobChain({
    directJobId: "job-1",
    employeeId: "employee-1",
  });

  assert.equal(resolved.resolution, "assignment.position.job");
  assert.equal(resolved.jobId, "job-1");
  assert.equal(forbidden.resolution, "forbidden-direct-employee-job");
  assert.deepEqual(HR_JOB_ASSIGNMENT_RESOLUTION_CONTRACT.supportedResolutionChain, [
    "employee",
    "assignment",
    "position",
    "job",
  ]);
  assert.equal(HR_ASSIGNMENT_JOB_ARCHITECTURE_INTEGRATION.referencesHrJobArchitectureFoundation, true);
  assert.equal(HR_ASSIGNMENT_VALIDATION_RULES.includes("position_resolves_to_job"), true);
});

test("search registration and permission metadata cover job architecture entities", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_job"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_job_family"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_career_path"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.searchableEntities.some((entity) => entity.entityType === "hr_job"), true);
  assert.equal(HR_JOB_ARCHITECTURE_PERMISSION_METADATA.length, 8);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.jobsView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.jobFamiliesManage), true);
});

test("job architecture platform contracts register reporting import export audit and events", () => {
  assert.equal(HR_JOB_ARCHITECTURE_PLATFORM_INTEGRATION.searchReadinessRegistered, true);
  assert.equal(HR_JOB_ARCHITECTURE_PLATFORM_INTEGRATION.reportingReadinessRegistered, true);
  assert.equal(HR_JOB_ARCHITECTURE_REPORT_READINESS.runtimeReportGenerationImplemented, false);
  assert.equal(HR_JOB_ARCHITECTURE_IMPORT_CONTRACT.key, "hr.job-architecture.import");
  assert.equal(HR_JOB_ARCHITECTURE_EXPORT_CONTRACT.key, "hr.job-architecture.export");
  assert.equal(HR_JOB_ARCHITECTURE_EVENT_DEFINITIONS.length, 9);
  assert.equal(HR_JOB_ARCHITECTURE_AUDIT_ACTIONS.jobCreated, "hr.job-architecture.job.created");
});

test("HR foundation contracts and app manifest include job architecture foundation", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrJobArchitectureFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsHrJobArchitectureRuntime, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.jobArchitectureTables, HR_JOB_ARCHITECTURE_FOUNDATION_TABLES);
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.job-architecture-foundation"), true);
});

test("job architecture migration defines tables RLS and position job integration", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_JOB_ARCHITECTURE_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /alter table public\.hr_positions\s+drop column if exists job_title_id/i);
  assert.match(migration, /add column job_id uuid references public\.hr_jobs/i);
  assert.match(migration, /hr\.jobs\.view/);
  assert.match(migration, /hr\.job_families\.manage/);
  assert.doesNotMatch(migration, /create table public\.hr_recruitment/i);
  assert.doesNotMatch(migration, /salary_band/i);
  assert.doesNotMatch(migration, /payroll_calculation/i);
});
