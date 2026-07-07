import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrWorkforcePlanStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "active"
  | "closed"
  | "archived";

export type HrHeadcountScopeLevel =
  | "company"
  | "branch"
  | "department"
  | "team"
  | "position"
  | "job";

export type HrVacancyReason =
  | "new_position"
  | "replacement"
  | "expansion"
  | "temporary"
  | "seasonal";

export type HrWorkforceVacancyStatus =
  | "planned"
  | "approved"
  | "open"
  | "on_hold"
  | "closed"
  | "cancelled";

export type HrHiringRequestPriority = "low" | "normal" | "high" | "critical";

export type HrHiringRequestApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "fulfilled";

export type HrWorkforceForecastType =
  | "planned_growth"
  | "expected_attrition"
  | "internal_transfer"
  | "promotion"
  | "retirement";

export type HrOrganizationCapacityScope = "company" | "branch" | "department" | "team";

export type HrWorkforcePlanningScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrWorkforcePlanDefinition = HrWorkforcePlanningScope & Readonly<{
  planCode: string;
  name: string;
  description?: string | null;
  businessUnitOrgUnitId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrWorkforcePlanStatus;
  planningRuntimeImplemented: false;
}>;

export type HrWorkforcePlanBudgetRefDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId: string;
  budgetRef?: string | null;
  costCenterId?: string | null;
  fiscalYear: string;
  status: HrWorkforcePlanStatus;
  budgetRuntimeImplemented: false;
  financeCalculationImplemented: false;
}>;

export type HrHeadcountPlanLineDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId: string;
  scopeLevel: HrHeadcountScopeLevel;
  departmentId?: string | null;
  teamId?: string | null;
  positionId?: string | null;
  jobId?: string | null;
  plannedHeadcount: number;
  currentHeadcount: number;
  approvedPositions: number;
  filledPositions: number;
  vacantPositions: number;
  frozenPositions: number;
  status: HrWorkforcePlanStatus;
  headcountRuntimeCalculationImplemented: false;
}>;

export type HrPositionCapacityPlanDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId?: string | null;
  positionId: string;
  approvedCapacity: number;
  occupiedCapacity: number;
  vacantCapacity: number;
  reservedCapacity: number;
  hiringRequired: boolean;
  allowsMultipleEmployees: boolean;
  status: HrWorkforcePlanStatus;
  onePositionOneEmployeeAssumption: false;
}>;

export type HrWorkforceVacancyDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId?: string | null;
  positionId: string;
  jobId: string;
  departmentId: string;
  vacancyReason: HrVacancyReason;
  status: HrWorkforceVacancyStatus;
  recruitmentRuntimeImplemented: false;
}>;

export type HrHiringRequestDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId?: string | null;
  vacancyId?: string | null;
  requestedPositionId: string;
  requiredDate: string;
  justification: string;
  priority: HrHiringRequestPriority;
  approvalStatus: HrHiringRequestApprovalStatus;
  candidateProcessingImplemented: false;
}>;

export type HrWorkforceForecastItemDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId: string;
  forecastType: HrWorkforceForecastType;
  effectiveFrom: string;
  effectiveTo?: string | null;
  description?: string | null;
  plannedQuantity?: number | null;
  status: HrWorkforcePlanStatus;
  forecastEngineImplemented: false;
}>;

export type HrOrganizationCapacityPlanDefinition = HrWorkforcePlanningScope & Readonly<{
  workforcePlanId: string;
  scope: HrOrganizationCapacityScope;
  orgUnitId?: string | null;
  plannedCapacity: number;
  currentCapacity: number;
  availableCapacity: number;
  utilizationRate?: number | null;
  status: HrWorkforcePlanStatus;
  utilizationRuntimeCalculated: false;
}>;

export type HrWorkforcePlanningEngineBoundaryContract = Readonly<{
  key: string;
  planningOwnsOrganizationalTargets: true;
  planningExecutesAssignments: false;
  planningMixesWithExecution: false;
  headcountRuntimeCalculationImplemented: false;
  forecastEngineImplemented: false;
  budgetRuntimeImplemented: false;
  recruitmentRuntimeImplemented: false;
  workforceSchedulingRuntimeImplemented: false;
  workforcePlanningRuntimeImplemented: false;
  processingFlow: readonly [
    "workforce_plan",
    "headcount_plan",
    "position_capacity",
    "vacancy",
    "hiring_request",
    "hr_action_execution",
    "assignment",
    "employee",
  ];
}>;

export type HrWorkforcePlanningAssignmentIntegrationContract = Readonly<{
  key: string;
  assignmentEngineIsExecutionLayer: true;
  planningDirectlyAssignsEmployees: false;
  referencesHrAssignmentEngineFoundation: true;
  runtimeImplemented: false;
}>;

export type HrWorkforcePlanningHrActionIntegrationContract = Readonly<{
  key: string;
  supportedFutureChain: readonly ["hiring", "vacancy", "position", "assignment", "employee"];
  hrActionRuntimeImplemented: false;
  planningConsumableByHrActions: true;
}>;

export type HrWorkforcePlanningBudgetReadinessContract = Readonly<{
  key: string;
  supportedReferences: readonly ["budget_ref", "cost_center_id", "fiscal_year"];
  financeCalculationImplemented: false;
  budgetRuntimeImplemented: false;
}>;

export function defineHrWorkforcePlan<T extends HrWorkforcePlanDefinition>(definition: T): T {
  return definition;
}

export function defineHrHeadcountPlanLine<T extends HrHeadcountPlanLineDefinition>(definition: T): T {
  return definition;
}

export function defineHrPositionCapacityPlan<T extends HrPositionCapacityPlanDefinition>(definition: T): T {
  return definition;
}

export function defineHrWorkforceVacancy<T extends HrWorkforceVacancyDefinition>(definition: T): T {
  return definition;
}

export function defineHrHiringRequest<T extends HrHiringRequestDefinition>(definition: T): T {
  return definition;
}

export function defineHrWorkforceForecastItem<T extends HrWorkforceForecastItemDefinition>(definition: T): T {
  return definition;
}

export function defineHrOrganizationCapacityPlan<T extends HrOrganizationCapacityPlanDefinition>(definition: T): T {
  return definition;
}

export function defineHrWorkforcePlanBudgetRef<T extends HrWorkforcePlanBudgetRefDefinition>(definition: T): T {
  return definition;
}

export function resolveHrWorkforcePlanningExecutionChain(input: Readonly<{
  directEmployeeAssignmentFromPlan?: boolean;
  hiringRequestId?: string | null;
  vacancyId?: string | null;
  positionId?: string | null;
}>): Readonly<{
  resolution: "hiring.vacancy.position.assignment.employee" | "forbidden-direct-plan-assignment" | "unresolved";
  hiringRequestId?: string | null;
  vacancyId?: string | null;
  positionId?: string | null;
  runtimeImplemented: false;
}> {
  if (input.directEmployeeAssignmentFromPlan) {
    return {
      resolution: "forbidden-direct-plan-assignment",
      runtimeImplemented: false,
    };
  }

  if (input.hiringRequestId && input.vacancyId && input.positionId) {
    return {
      hiringRequestId: input.hiringRequestId,
      positionId: input.positionId,
      resolution: "hiring.vacancy.position.assignment.employee",
      runtimeImplemented: false,
      vacancyId: input.vacancyId,
    };
  }

  return {
    resolution: "unresolved",
    runtimeImplemented: false,
  };
}

export function createHrWorkforceForecastReadinessInput(input: Readonly<{
  forecastType: HrWorkforceForecastType;
  workforcePlanId: string;
  effectiveFrom: string;
}>): Readonly<{
  effectiveFrom: string;
  forecastEngineImplemented: false;
  forecastType: HrWorkforceForecastType;
  runtimeImplemented: false;
  workforcePlanId: string;
}> {
  return {
    ...input,
    forecastEngineImplemented: false,
    runtimeImplemented: false,
  };
}

export const HR_WORKFORCE_PLAN_STATUSES = [
  "draft",
  "under_review",
  "approved",
  "active",
  "closed",
  "archived",
] as const satisfies readonly HrWorkforcePlanStatus[];

export const HR_HEADCOUNT_SCOPE_LEVELS = [
  "company",
  "branch",
  "department",
  "team",
  "position",
  "job",
] as const satisfies readonly HrHeadcountScopeLevel[];

export const HR_VACANCY_REASONS = [
  "new_position",
  "replacement",
  "expansion",
  "temporary",
  "seasonal",
] as const satisfies readonly HrVacancyReason[];

export const HR_WORKFORCE_VACANCY_STATUSES = [
  "planned",
  "approved",
  "open",
  "on_hold",
  "closed",
  "cancelled",
] as const satisfies readonly HrWorkforceVacancyStatus[];

export const HR_WORKFORCE_FORECAST_TYPES = [
  "planned_growth",
  "expected_attrition",
  "internal_transfer",
  "promotion",
  "retirement",
] as const satisfies readonly HrWorkforceForecastType[];

export const HR_WORKFORCE_PLANNING_ENGINE_BOUNDARY_CONTRACT: HrWorkforcePlanningEngineBoundaryContract = {
  budgetRuntimeImplemented: false,
  forecastEngineImplemented: false,
  headcountRuntimeCalculationImplemented: false,
  key: "hr.workforce-planning.boundary",
  planningExecutesAssignments: false,
  planningMixesWithExecution: false,
  planningOwnsOrganizationalTargets: true,
  processingFlow: [
    "workforce_plan",
    "headcount_plan",
    "position_capacity",
    "vacancy",
    "hiring_request",
    "hr_action_execution",
    "assignment",
    "employee",
  ],
  recruitmentRuntimeImplemented: false,
  workforcePlanningRuntimeImplemented: false,
  workforceSchedulingRuntimeImplemented: false,
};

export const HR_WORKFORCE_PLANNING_ASSIGNMENT_INTEGRATION_CONTRACT: HrWorkforcePlanningAssignmentIntegrationContract = {
  assignmentEngineIsExecutionLayer: true,
  key: "hr.workforce-planning.assignment-integration",
  planningDirectlyAssignsEmployees: false,
  referencesHrAssignmentEngineFoundation: true,
  runtimeImplemented: false,
};

export const HR_WORKFORCE_PLANNING_HR_ACTION_INTEGRATION_CONTRACT: HrWorkforcePlanningHrActionIntegrationContract = {
  hrActionRuntimeImplemented: false,
  key: "hr.workforce-planning.hr-action-integration",
  planningConsumableByHrActions: true,
  supportedFutureChain: ["hiring", "vacancy", "position", "assignment", "employee"],
};

export const HR_WORKFORCE_PLANNING_BUDGET_READINESS_CONTRACT: HrWorkforcePlanningBudgetReadinessContract = {
  budgetRuntimeImplemented: false,
  financeCalculationImplemented: false,
  key: "hr.workforce-planning.budget-readiness",
  supportedReferences: ["budget_ref", "cost_center_id", "fiscal_year"],
};

export const HR_WORKFORCE_PLANNING_VALIDATION_RULES = [
  { key: "workforce_plan_code_required", message: "Workforce plan code is required.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "workforce_plan_effective_dates_valid", message: "Workforce plan effective dates must be valid.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "headcount_scope_reference_required", message: "Headcount plan line must reference its scope entity.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "position_capacity_non_negative", message: "Position capacity values must be non-negative.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "position_allows_multiple_employees", message: "A position may allow multiple employees.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "vacancy_requires_position_and_job", message: "Vacancy must reference position and job.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "hiring_request_requires_position", message: "Hiring request must reference a requested position.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "planning_must_not_assign_employees_directly", message: "Workforce planning must not directly assign employees.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "forecast_contract_only", message: "Workforce forecast items are contract-only.", severity: "error" as const, validationRuntimeImplemented: false as const },
  { key: "budget_reference_without_calculation", message: "Budget references must not trigger finance calculations.", severity: "error" as const, validationRuntimeImplemented: false as const },
];

export const HR_WORKFORCE_PLANNING_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  dashboardReadinessRegistered: true,
  eventBusRegistered: true,
  importExportRegistered: true,
  notificationReadinessRegistered: true,
  printReadinessRegistered: true,
  reportingReadinessRegistered: true,
  searchReadinessRegistered: true,
  workflowApprovalContractsOnly: true,
  workflowRuntimeImplemented: false,
} as const;

export const HR_WORKFORCE_PLANNING_REPORT_READINESS = {
  datasets: [
    "hr_workforce_plan",
    "hr_headcount_plan_line",
    "hr_position_capacity_plan",
    "hr_workforce_vacancy",
    "hr_hiring_request",
    "hr_workforce_forecast_item",
    "hr_organization_capacity_plan",
    "hr_workforce_plan_budget_ref",
  ] as const,
  key: "hr.workforce-planning.report-readiness",
  runtimeReportGenerationImplemented: false,
} as const;

const hrWorkforcePlanningImportExportSecurity = {
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

export const HR_WORKFORCE_PLANNING_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", required: true },
    { dataType: "text", key: "code", label: "Code", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "date", key: "effectiveFrom", label: "Effective From" },
    { dataType: "text", key: "status", label: "Status" },
  ],
  key: "hr.workforce-planning.import",
  label: "HR Workforce Planning Foundation Import",
  mappings: [
    { key: "definition-type", sourceColumn: "Definition Type", targetField: "definitionType" },
    { key: "code", sourceColumn: "Code", targetField: "code" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "effective-from", sourceColumn: "Effective From", targetField: "effectiveFrom" },
    { key: "status", sourceColumn: "Status", targetField: "status" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, workforcePlanningRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkforcePlanningImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "code", key: "workforce-planning-code-required", message: "Workforce planning code is required.", severity: "error", type: "required" },
    { fieldKey: "name", key: "workforce-planning-name-required", message: "Workforce planning name is required.", severity: "error", type: "required" },
  ],
});

export const HR_WORKFORCE_PLANNING_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name" },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "hr.workforce-planning.export",
  label: "HR Workforce Planning Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-workforce-planning-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrWorkforcePlanningImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_WORKFORCE_PLANNING_EVENT_DEFINITIONS = [
  "WorkforcePlanCreated",
  "WorkforcePlanApproved",
  "HeadcountPlanLineCreated",
  "PositionCapacityPlanCreated",
  "WorkforceVacancyCreated",
  "HiringRequestCreated",
  "HiringRequestApproved",
  "WorkforceForecastItemCreated",
  "OrganizationCapacityPlanCreated",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for the HR Workforce Planning Foundation. No planning execution or recruitment runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const HR_WORKFORCE_PLANNING_AUDIT_ACTIONS = {
  headcountPlanLineCreated: defineAuditAction("hr.workforce-planning.headcount-line.created"),
  hiringRequestApproved: defineAuditAction("hr.workforce-planning.hiring-request.approved"),
  hiringRequestCreated: defineAuditAction("hr.workforce-planning.hiring-request.created"),
  organizationCapacityPlanCreated: defineAuditAction("hr.workforce-planning.organization-capacity.created"),
  positionCapacityPlanCreated: defineAuditAction("hr.workforce-planning.position-capacity.created"),
  workforceForecastItemCreated: defineAuditAction("hr.workforce-planning.forecast-item.created"),
  workforcePlanApproved: defineAuditAction("hr.workforce-planning.plan.approved"),
  workforcePlanCreated: defineAuditAction("hr.workforce-planning.plan.created"),
  workforceVacancyCreated: defineAuditAction("hr.workforce-planning.vacancy.created"),
} as const;

export const HR_WORKFORCE_PLANNING_FOUNDATION_TABLES = [
  "hr_workforce_plans",
  "hr_workforce_plan_budget_refs",
  "hr_headcount_plan_lines",
  "hr_position_capacity_plans",
  "hr_workforce_vacancies",
  "hr_hiring_requests",
  "hr_workforce_forecast_items",
  "hr_organization_capacity_plans",
] as const;

export const HR_WORKFORCE_PLANNING_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.workforceView, scope: "tenant-company-branch", entity: "workforce-planning" },
  { key: HR_PERMISSIONS.workforceManage, scope: "tenant-company-branch", entity: "workforce-plan" },
  { key: HR_PERMISSIONS.headcountManage, scope: "tenant-company-branch", entity: "headcount-plan" },
  { key: HR_PERMISSIONS.vacanciesManage, scope: "tenant-company-branch", entity: "workforce-vacancy" },
  { key: HR_PERMISSIONS.hiringRequestsManage, scope: "tenant-company-branch", entity: "hiring-request" },
] as const;
