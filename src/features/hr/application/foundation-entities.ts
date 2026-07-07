import { HR_PERMISSIONS } from "../permissions/permission-registry";
import type { PermissionKey } from "@/platform/permissions/public-api";

const statusValues = ["draft", "active", "inactive", "locked", "archived"] as const;
type OrgUnitKind = "department" | "section" | "team";
const positionStatusOptions = ["planned", "approved", "active", "frozen", "closed"] as const;
const vacancyStatusOptions = ["not-budgeted", "vacant", "partially-filled", "filled", "overstaffed"] as const;
const employmentTypeOptions = ["full-time", "part-time", "temporary", "contractor", "intern", "seasonal", "consultant"] as const;

export type HrFoundationField = Readonly<{
  name: string;
  column: string;
  label: string;
  labelAr?: string;
  type: "text" | "number" | "date" | "checkbox" | "select" | "lookup" | "textarea";
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  lookup?: string;
  min?: number;
  showInList?: boolean;
  advanced?: boolean;
  helpText?: string;
  helpTextAr?: string;
}>;

export type HrFoundationDescriptor = Readonly<{
  key: HrFoundationResourceKey;
  title: string;
  titleAr?: string;
  singular: string;
  description: string;
  section: "organization" | "positions-jobs" | "skills-competencies";
  basePath: string;
  table: string;
  fields: readonly HrFoundationField[];
  searchColumns: readonly string[];
  viewPermission: PermissionKey;
  managePermission: PermissionKey;
  fixedFilter?: Readonly<{ column: string; value: string }>;
}>;

export type HrFoundationResourceKey =
  | "departments"
  | "sections"
  | "teams"
  | "work-locations"
  | "grades"
  | "job-families"
  | "job-functions"
  | "job-levels"
  | "jobs"
  | "career-paths"
  | "positions"
  | "skill-categories"
  | "skills"
  | "competency-categories"
  | "competencies"
  | "proficiency-levels"
  | "certifications"
  | "licenses"
  | "languages"
  | "qualifications";

const commonStatusField: HrFoundationField = {
  column: "status",
  label: "Status",
  labelAr: "الحالة",
  name: "status",
  options: statusValues.map((value) => ({ label: value, value })),
  required: true,
  showInList: true,
  type: "select",
};

const orgUnitFields = (kind: OrgUnitKind): readonly HrFoundationField[] => [
  { column: "org_unit_key", label: "Code", labelAr: "الرمز", name: "orgUnitKey", required: true, showInList: true, type: "text" },
  { column: "name", label: "Name", labelAr: "الاسم", name: "name", required: true, showInList: true, type: "text" },
  { column: "kind", label: "Kind", name: "kind", required: true, type: "select", options: [{ label: kind, value: kind }] },
  { column: "parent_org_unit_id", label: "Parent unit", labelAr: "الوحدة الأب", lookup: "orgUnits", name: "parentOrgUnitId", type: "lookup" },
  { column: "manager_employee_id", label: "Manager", labelAr: "المدير", lookup: "employees", name: "managerEmployeeId", type: "lookup", advanced: true },
  { column: "work_location_id", label: "Work location", labelAr: "موقع العمل", lookup: "workLocations", name: "workLocationId", type: "lookup", advanced: true },
  commonStatusField,
];

export const HR_FOUNDATION_ENTITIES: Readonly<Record<HrFoundationResourceKey, HrFoundationDescriptor>> = {
  departments: {
    basePath: "/erp/hr/organization/departments",
    description: "Company departments in the organization hierarchy.",
    fields: orgUnitFields("department"),
    fixedFilter: { column: "kind", value: "department" },
    key: "departments",
    managePermission: HR_PERMISSIONS.manage,
    searchColumns: ["org_unit_key", "name"],
    section: "organization",
    singular: "Department",
    table: "hr_org_units",
    title: "Departments",
    titleAr: "الأقسام",
    viewPermission: HR_PERMISSIONS.positionsView,
  },
  sections: {
    basePath: "/erp/hr/organization/sections",
    description: "Sections within departments.",
    fields: orgUnitFields("section"),
    fixedFilter: { column: "kind", value: "section" },
    key: "sections",
    managePermission: HR_PERMISSIONS.manage,
    searchColumns: ["org_unit_key", "name"],
    section: "organization",
    singular: "Section",
    table: "hr_org_units",
    title: "Sections",
    titleAr: "الأقسام الفرعية",
    viewPermission: HR_PERMISSIONS.positionsView,
  },
  teams: {
    basePath: "/erp/hr/organization/teams",
    description: "Teams within sections.",
    fields: orgUnitFields("team"),
    fixedFilter: { column: "kind", value: "team" },
    key: "teams",
    managePermission: HR_PERMISSIONS.manage,
    searchColumns: ["org_unit_key", "name"],
    section: "organization",
    singular: "Team",
    table: "hr_org_units",
    title: "Teams",
    titleAr: "الفرق",
    viewPermission: HR_PERMISSIONS.positionsView,
  },
  "work-locations": {
    basePath: "/erp/hr/organization/work-locations",
    description: "Work locations and site master data.",
    fields: [
      { column: "location_key", label: "Code", name: "locationKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "branch_id", label: "Branch", lookup: "branches", name: "branchId", type: "lookup" },
      commonStatusField,
    ],
    key: "work-locations",
    managePermission: HR_PERMISSIONS.manage,
    searchColumns: ["location_key", "name"],
    section: "organization",
    singular: "Work location",
    table: "hr_work_locations",
    title: "Work Locations",
    titleAr: "مواقع العمل",
    viewPermission: HR_PERMISSIONS.view,
  },
  grades: {
    basePath: "/erp/hr/positions-jobs/grades",
    description: "Job grades used by positions and jobs.",
    fields: [
      { column: "grade_key", label: "Code", name: "gradeKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "rank", label: "Rank", min: 1, name: "rank", type: "number", showInList: true },
      { column: "grade_level", label: "Grade level", name: "gradeLevel", type: "text", advanced: true },
      commonStatusField,
    ],
    key: "grades",
    managePermission: HR_PERMISSIONS.jobGradesManage,
    searchColumns: ["grade_key", "name"],
    section: "positions-jobs",
    singular: "Grade",
    table: "hr_grades",
    title: "Job Grades",
    titleAr: "الدرجات الوظيفية",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  "job-families": {
    basePath: "/erp/hr/positions-jobs/job-families",
    description: "Canonical job families.",
    fields: [
      { column: "family_code", label: "Code", name: "familyCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "description", label: "Description", name: "description", type: "textarea", advanced: true },
      { column: "sort_order", label: "Sort order", min: 0, name: "sortOrder", type: "number", advanced: true },
      commonStatusField,
    ],
    key: "job-families",
    managePermission: HR_PERMISSIONS.jobFamiliesManage,
    searchColumns: ["family_code", "name"],
    section: "positions-jobs",
    singular: "Job family",
    table: "hr_job_families",
    title: "Job Families",
    titleAr: "عائلات الوظائف",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  "job-functions": {
    basePath: "/erp/hr/positions-jobs/job-functions",
    description: "Job functions within families.",
    fields: [
      { column: "function_code", label: "Code", name: "functionCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "job_family_id", label: "Job family", lookup: "jobFamilies", name: "jobFamilyId", required: true, showInList: true, type: "lookup" },
      { column: "description", label: "Description", name: "description", type: "textarea", advanced: true },
      commonStatusField,
    ],
    key: "job-functions",
    managePermission: HR_PERMISSIONS.jobFunctionsManage,
    searchColumns: ["function_code", "name"],
    section: "positions-jobs",
    singular: "Job function",
    table: "hr_job_functions",
    title: "Job Functions",
    titleAr: "وظائف العمل",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  "job-levels": {
    basePath: "/erp/hr/positions-jobs/job-levels",
    description: "Job level hierarchy.",
    fields: [
      { column: "level_code", label: "Code", name: "levelCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "hierarchy_sequence", label: "Sequence", min: 1, name: "hierarchySequence", required: true, showInList: true, type: "number" },
      commonStatusField,
    ],
    key: "job-levels",
    managePermission: HR_PERMISSIONS.jobLevelsManage,
    searchColumns: ["level_code", "name"],
    section: "positions-jobs",
    singular: "Job level",
    table: "hr_job_levels",
    title: "Job Levels",
    titleAr: "مستويات الوظائف",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  jobs: {
    basePath: "/erp/hr/positions-jobs/jobs",
    description: "Canonical job definitions. Positions reference jobs; employees reach jobs through assignments.",
    fields: [
      { column: "job_code", label: "Code", name: "jobCode", required: true, showInList: true, type: "text" },
      { column: "job_title", label: "Job title", name: "jobTitle", required: true, showInList: true, type: "text" },
      { column: "job_family_id", label: "Job family", lookup: "jobFamilies", name: "jobFamilyId", required: true, type: "lookup" },
      { column: "job_function_id", label: "Job function", lookup: "jobFunctions", name: "jobFunctionId", required: true, type: "lookup" },
      { column: "job_level_id", label: "Job level", lookup: "jobLevels", name: "jobLevelId", type: "lookup", advanced: true },
      { column: "default_grade_id", label: "Default grade", lookup: "grades", name: "defaultGradeId", type: "lookup", advanced: true },
      { column: "employment_type", label: "Employment type", name: "employmentType", options: employmentTypeOptions.map((v) => ({ label: v, value: v })), type: "select", advanced: true },
      { column: "description", label: "Description", name: "description", type: "textarea", advanced: true },
      { column: "responsibilities", label: "Responsibilities", name: "responsibilities", type: "textarea", advanced: true },
      commonStatusField,
    ],
    key: "jobs",
    managePermission: HR_PERMISSIONS.jobsEdit,
    searchColumns: ["job_code", "job_title"],
    section: "positions-jobs",
    singular: "Job",
    table: "hr_jobs",
    title: "Jobs",
    titleAr: "الوظائف",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  "career-paths": {
    basePath: "/erp/hr/positions-jobs/career-paths",
    description: "Career progression paths between jobs.",
    fields: [
      { column: "path_code", label: "Code", name: "pathCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "description", label: "Description", name: "description", type: "textarea", advanced: true },
      commonStatusField,
    ],
    key: "career-paths",
    managePermission: HR_PERMISSIONS.jobsEdit,
    searchColumns: ["path_code", "name"],
    section: "positions-jobs",
    singular: "Career path",
    table: "hr_career_paths",
    title: "Career Paths",
    titleAr: "المسارات المهنية",
    viewPermission: HR_PERMISSIONS.jobsView,
  },
  positions: {
    basePath: "/erp/hr/positions-jobs/positions",
    description: "Approved seats linked to jobs and departments.",
    fields: [
      { column: "position_key", label: "Code", name: "positionKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "job_id", label: "Job", lookup: "jobs", name: "jobId", required: true, showInList: true, type: "lookup" },
      { column: "department_id", label: "Department", lookup: "orgUnits", name: "departmentId", required: true, showInList: true, type: "lookup" },
      { column: "section_id", label: "Section", lookup: "orgUnits", name: "sectionId", type: "lookup", advanced: true },
      { column: "grade_id", label: "Grade", lookup: "grades", name: "gradeId", type: "lookup", advanced: true },
      { column: "budgeted_headcount", label: "Approved capacity", min: 0, name: "budgetedHeadcount", required: true, showInList: true, type: "number" },
      { column: "current_headcount", label: "Occupied capacity", min: 0, name: "currentHeadcount", showInList: true, type: "number" },
      { column: "effective_from", label: "Effective from", name: "effectiveFrom", required: true, type: "date" },
      { column: "status", label: "Status", name: "status", options: positionStatusOptions.map((v) => ({ label: v, value: v })), showInList: true, type: "select" },
      { column: "vacancy_status", label: "Vacancy", name: "vacancyStatus", options: vacancyStatusOptions.map((v) => ({ label: v, value: v })), showInList: true, type: "select", advanced: true },
    ],
    key: "positions",
    managePermission: HR_PERMISSIONS.positionsManage,
    searchColumns: ["position_key", "name"],
    section: "positions-jobs",
    singular: "Position",
    table: "hr_positions",
    title: "Positions",
    titleAr: "المناصب",
    viewPermission: HR_PERMISSIONS.positionsView,
  },
  "skill-categories": {
    basePath: "/erp/hr/skills-competencies/skill-categories",
    description: "Skill library categories.",
    fields: [
      { column: "category_key", label: "Code", name: "categoryKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      commonStatusField,
    ],
    key: "skill-categories",
    managePermission: HR_PERMISSIONS.skillsManage,
    searchColumns: ["category_key", "name"],
    section: "skills-competencies",
    singular: "Skill category",
    table: "hr_skill_categories",
    title: "Skill Categories",
    titleAr: "فئات المهارات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  skills: {
    basePath: "/erp/hr/skills-competencies/skills",
    description: "Skills library — separate from competencies.",
    fields: [
      { column: "skill_code", label: "Code", name: "skillCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "skill_category_id", label: "Category", lookup: "skillCategories", name: "skillCategoryId", required: true, type: "lookup" },
      { column: "description", label: "Description", name: "description", type: "textarea", advanced: true },
      commonStatusField,
    ],
    key: "skills",
    managePermission: HR_PERMISSIONS.skillsManage,
    searchColumns: ["skill_code", "name"],
    section: "skills-competencies",
    singular: "Skill",
    table: "hr_skills",
    title: "Skills",
    titleAr: "المهارات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  "competency-categories": {
    basePath: "/erp/hr/skills-competencies/competency-categories",
    description: "Competency library categories.",
    fields: [
      { column: "category_key", label: "Code", name: "categoryKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      commonStatusField,
    ],
    key: "competency-categories",
    managePermission: HR_PERMISSIONS.competenciesManage,
    searchColumns: ["category_key", "name"],
    section: "skills-competencies",
    singular: "Competency category",
    table: "hr_competency_categories",
    title: "Competency Categories",
    titleAr: "فئات الكفاءات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  competencies: {
    basePath: "/erp/hr/skills-competencies/competencies",
    description: "Competencies library — separate from skills.",
    fields: [
      { column: "competency_code", label: "Code", name: "competencyCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "competency_category_id", label: "Category", lookup: "competencyCategories", name: "competencyCategoryId", required: true, type: "lookup" },
      commonStatusField,
    ],
    key: "competencies",
    managePermission: HR_PERMISSIONS.competenciesManage,
    searchColumns: ["competency_code", "name"],
    section: "skills-competencies",
    singular: "Competency",
    table: "hr_competencies",
    title: "Competencies",
    titleAr: "الكفاءات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  "proficiency-levels": {
    basePath: "/erp/hr/skills-competencies/proficiency-levels",
    description: "Proficiency scale for skills and competencies.",
    fields: [
      { column: "level_code", label: "Code", name: "levelCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "sequence", label: "Sequence", min: 1, name: "sequence", required: true, showInList: true, type: "number" },
      commonStatusField,
    ],
    key: "proficiency-levels",
    managePermission: HR_PERMISSIONS.skillsManage,
    searchColumns: ["level_code", "name"],
    section: "skills-competencies",
    singular: "Proficiency level",
    table: "hr_proficiency_levels",
    title: "Proficiency Levels",
    titleAr: "مستويات الإتقان",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  certifications: {
    basePath: "/erp/hr/skills-competencies/certifications",
    description: "Certification definitions — not stored as generic skills.",
    fields: [
      { column: "certification_code", label: "Code", name: "certificationCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "issuing_authority", label: "Issuing authority", name: "issuingAuthority", type: "text", advanced: true },
      { column: "expiration_required", label: "Expiration required", name: "expirationRequired", type: "checkbox", advanced: true },
      commonStatusField,
    ],
    key: "certifications",
    managePermission: HR_PERMISSIONS.certificationsManage,
    searchColumns: ["certification_code", "name"],
    section: "skills-competencies",
    singular: "Certification",
    table: "hr_certification_definitions",
    title: "Certifications",
    titleAr: "الشهادات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  licenses: {
    basePath: "/erp/hr/skills-competencies/licenses",
    description: "License definitions.",
    fields: [
      { column: "license_code", label: "Code", name: "licenseCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "validity_period_days", label: "Validity (days)", min: 1, name: "validityPeriodDays", type: "number", advanced: true },
      commonStatusField,
    ],
    key: "licenses",
    managePermission: HR_PERMISSIONS.licensesManage,
    searchColumns: ["license_code", "name"],
    section: "skills-competencies",
    singular: "License",
    table: "hr_license_definitions",
    title: "Licenses",
    titleAr: "التراخيص",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  languages: {
    basePath: "/erp/hr/skills-competencies/languages",
    description: "Language definitions.",
    fields: [
      { column: "language_code", label: "Code", name: "languageCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      commonStatusField,
    ],
    key: "languages",
    managePermission: HR_PERMISSIONS.languagesManage,
    searchColumns: ["language_code", "name"],
    section: "skills-competencies",
    singular: "Language",
    table: "hr_language_definitions",
    title: "Languages",
    titleAr: "اللغات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
  qualifications: {
    basePath: "/erp/hr/skills-competencies/qualifications",
    description: "Qualification definitions.",
    fields: [
      { column: "qualification_code", label: "Code", name: "qualificationCode", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "qualification_type", label: "Type", name: "qualificationType", type: "text", advanced: true },
      commonStatusField,
    ],
    key: "qualifications",
    managePermission: HR_PERMISSIONS.skillsManage,
    searchColumns: ["qualification_code", "name"],
    section: "skills-competencies",
    singular: "Qualification",
    table: "hr_qualification_definitions",
    title: "Qualifications",
    titleAr: "المؤهلات",
    viewPermission: HR_PERMISSIONS.skillsView,
  },
};

export const HR_ORGANIZATION_RESOURCES = ["departments", "sections", "teams", "work-locations"] as const satisfies readonly HrFoundationResourceKey[];
export const HR_POSITIONS_JOBS_RESOURCES = ["job-families", "job-functions", "job-levels", "jobs", "career-paths", "grades", "positions"] as const satisfies readonly HrFoundationResourceKey[];
export const HR_SKILLS_RESOURCES = ["skill-categories", "skills", "competency-categories", "competencies", "proficiency-levels", "certifications", "licenses", "languages", "qualifications"] as const satisfies readonly HrFoundationResourceKey[];

export function getHrFoundationEntity(resource: string): HrFoundationDescriptor {
  const descriptor = HR_FOUNDATION_ENTITIES[resource as HrFoundationResourceKey];
  if (!descriptor) throw new Error(`Unknown HR foundation resource "${resource}".`);
  return descriptor;
}

export function isHrFoundationResourceKey(resource: string): resource is HrFoundationResourceKey {
  return resource in HR_FOUNDATION_ENTITIES;
}

export function listHrFoundationResources(section: HrFoundationDescriptor["section"]) {
  return Object.values(HR_FOUNDATION_ENTITIES).filter((descriptor) => descriptor.section === section);
}
