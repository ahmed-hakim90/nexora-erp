import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrCanonicalOwner =
  | "employment-profile"
  | "assignment-engine"
  | "payroll-period"
  | "payroll-batch"
  | "payroll-run"
  | "payroll-result"
  | "payslip"
  | "payslip-publication"
  | "job-architecture"
  | "legacy-compatibility";

export type HrEmploymentProfileFieldClassification =
  | "canonical-anchor"
  | "cached-projection"
  | "deprecated-source-field"
  | "legacy-compatibility-field";

export type HrPayrollLifecycleEntity =
  | "payroll_period"
  | "payroll_batch"
  | "payroll_run"
  | "employee_snapshot"
  | "payroll_result"
  | "payroll_result_component"
  | "payslip"
  | "payslip_line"
  | "payslip_publication";

export type HrPayrollTypedSourceKind =
  | "leave"
  | "absence"
  | "loan"
  | "advance"
  | "penalty"
  | "benefit"
  | "attendance"
  | "overtime"
  | "manual_adjustment";

export type HrSecurityScopeKind =
  | "manager-scope"
  | "self-scope"
  | "hr-admin-scope"
  | "payroll-admin-scope"
  | "approval-segregation-of-duties";

export type HrEmploymentProfileOwnershipRule = Readonly<{
  field: string;
  classification: HrEmploymentProfileFieldClassification;
  canonicalOwner: HrCanonicalOwner;
  writePath: "assignment-engine" | "employment-profile" | "compatibility-only";
  readPath: "assignment-resolver" | "employment-profile" | "projection-cache";
  cacheRebuildSource?: "hr_assignments" | null;
}>;

export type HrAssignmentCanonicalOwnershipRule = Readonly<{
  assignmentType: string;
  canonicalOwner: "assignment-engine";
  replacesEmploymentProfileField?: string | null;
  supportsEffectiveDating: true;
  supportsHistory: true;
  writesEmploymentProfileDirectly: false;
}>;

export type HrPayrollLifecycleOwnershipRule = Readonly<{
  entity: HrPayrollLifecycleEntity;
  canonicalOwner: HrCanonicalOwner;
  ownsCalculation: boolean;
  ownsApproval: boolean;
  ownsClosing: boolean;
  ownsEmployeeVisibility: boolean;
  duplicatesPayrollNumbers: boolean;
}>;

export type HrPayrollResultPayslipRelationshipContract = Readonly<{
  key: string;
  canonicalChain: readonly [
    "payroll_run",
    "employee_snapshot",
    "payroll_result",
    "payroll_result_components",
    "payslip",
    "payslip_publication",
  ];
  payrollResultOwnsNumbers: true;
  resultComponentsOwnBreakdown: true;
  payslipReferencesApprovedResult: true;
  payslipLinesPresentationOnly: true;
  payslipLinesDerivedFromResultComponents: true;
  publicationControlsEmployeeVisibility: true;
  duplicateCalculationValuesInPayslipAllowed: false;
}>;

export type HrJobTitleLegacyStrategyContract = Readonly<{
  key: string;
  canonicalJobTable: "hr_jobs";
  legacyTable: "hr_job_titles";
  newCanonicalDependenciesAllowed: false;
  compatibilityReadsAllowed: true;
  migrationStrategy: readonly [
    "map_legacy_job_title_to_job",
    "backfill_position_job_id",
    "freeze_new_job_title_dependencies",
    "archive_or_drop_after_data_audit",
  ];
}>;

export type HrSecurityReadinessRule = Readonly<{
  scope: HrSecurityScopeKind;
  requiredFor: readonly string[];
  permissionBoundary: string;
  runtimeImplemented: false;
}>;

export type HrPayrollTypedSourceReferenceContract = Readonly<{
  key: string;
  supportedSourceKinds: readonly HrPayrollTypedSourceKind[];
  payrollInputsUseTypedSourceRefs: true;
  calculationReadsTypedRefsAndApprovedInputs: true;
  genericMetadataOnlySourceReferencesAllowed: false;
  sourceEnginesImplementedExceptLeaveAbsence: false;
}>;

export type HrArchitectureRefactorGateContract = Readonly<{
  key: string;
  newFeaturesImplemented: false;
  payrollLocalizationImplemented: false;
  payrollUiImplemented: false;
  essMssUiImplemented: false;
  employmentProfileCanonicalForOrgAssignments: false;
  assignmentEngineCanonicalForOrgAssignments: true;
  payrollRunCanonicalExecutionUnit: true;
  payrollBatchOwnsExecutionLifecycle: false;
  leaveAbsenceFirstClassBoundedContext: true;
  hrJobsCanonical: true;
  hrJobTitlesLegacyCompatibilityOnly: true;
}>;

export function classifyHrEmploymentProfileField(field: string): HrEmploymentProfileOwnershipRule | undefined {
  return HR_EMPLOYMENT_PROFILE_OWNERSHIP_RULES.find((rule) => rule.field === field);
}

export function resolveHrPayrollLifecycleOwner(entity: HrPayrollLifecycleEntity): HrPayrollLifecycleOwnershipRule | undefined {
  return HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES.find((rule) => rule.entity === entity);
}

export function isHrPayrollTypedSourceKind(sourceKind: string): sourceKind is HrPayrollTypedSourceKind {
  return HR_PAYROLL_TYPED_SOURCE_KINDS.includes(sourceKind as HrPayrollTypedSourceKind);
}

export const HR_EMPLOYMENT_PROFILE_OWNERSHIP_RULES = [
  { cacheRebuildSource: null, canonicalOwner: "employment-profile", classification: "canonical-anchor", field: "employee_id", readPath: "employment-profile", writePath: "employment-profile" },
  { cacheRebuildSource: null, canonicalOwner: "employment-profile", classification: "canonical-anchor", field: "employment_status", readPath: "employment-profile", writePath: "employment-profile" },
  { cacheRebuildSource: null, canonicalOwner: "employment-profile", classification: "canonical-anchor", field: "contract_id", readPath: "employment-profile", writePath: "employment-profile" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "department_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "section_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "team_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "position_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "grade_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "work_location_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "cached-projection", field: "reporting_manager_employee_id", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "deprecated-source-field", field: "attendance_policy_ref", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "deprecated-source-field", field: "leave_policy_ref", readPath: "assignment-resolver", writePath: "assignment-engine" },
  { cacheRebuildSource: "hr_assignments", canonicalOwner: "assignment-engine", classification: "deprecated-source-field", field: "payroll_policy_ref", readPath: "assignment-resolver", writePath: "assignment-engine" },
] as const satisfies readonly HrEmploymentProfileOwnershipRule[];

export const HR_ASSIGNMENT_CANONICAL_OWNERSHIP_RULES = [
  { assignmentType: "position", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "position_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "department", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "department_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "section", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "section_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "team", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "team_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "manager", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "reporting_manager_employee_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "grade", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "grade_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "work_location", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "work_location_id", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "shift_schedule", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "shift_schedule_ref", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "payroll_group", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "payroll_group_ref", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "cost_center", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "cost_center_ref", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
  { assignmentType: "policy_assignment", canonicalOwner: "assignment-engine", replacesEmploymentProfileField: "policy_refs", supportsEffectiveDating: true, supportsHistory: true, writesEmploymentProfileDirectly: false },
] as const satisfies readonly HrAssignmentCanonicalOwnershipRule[];

export const HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES = [
  { canonicalOwner: "payroll-period", duplicatesPayrollNumbers: false, entity: "payroll_period", ownsApproval: false, ownsCalculation: false, ownsClosing: true, ownsEmployeeVisibility: false },
  { canonicalOwner: "payroll-batch", duplicatesPayrollNumbers: false, entity: "payroll_batch", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payroll-run", duplicatesPayrollNumbers: false, entity: "payroll_run", ownsApproval: true, ownsCalculation: true, ownsClosing: true, ownsEmployeeVisibility: false },
  { canonicalOwner: "payroll-run", duplicatesPayrollNumbers: false, entity: "employee_snapshot", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payroll-result", duplicatesPayrollNumbers: false, entity: "payroll_result", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payroll-result", duplicatesPayrollNumbers: false, entity: "payroll_result_component", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payslip", duplicatesPayrollNumbers: false, entity: "payslip", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payslip", duplicatesPayrollNumbers: false, entity: "payslip_line", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: false },
  { canonicalOwner: "payslip-publication", duplicatesPayrollNumbers: false, entity: "payslip_publication", ownsApproval: false, ownsCalculation: false, ownsClosing: false, ownsEmployeeVisibility: true },
] as const satisfies readonly HrPayrollLifecycleOwnershipRule[];

export const HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT: HrPayrollResultPayslipRelationshipContract = {
  canonicalChain: ["payroll_run", "employee_snapshot", "payroll_result", "payroll_result_components", "payslip", "payslip_publication"],
  duplicateCalculationValuesInPayslipAllowed: false,
  key: "hr.payroll.result-payslip.canonical-relationship",
  payslipLinesDerivedFromResultComponents: true,
  payslipLinesPresentationOnly: true,
  payslipReferencesApprovedResult: true,
  payrollResultOwnsNumbers: true,
  publicationControlsEmployeeVisibility: true,
  resultComponentsOwnBreakdown: true,
};

export const HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT: HrJobTitleLegacyStrategyContract = {
  canonicalJobTable: "hr_jobs",
  compatibilityReadsAllowed: true,
  key: "hr.job-title.legacy-strategy",
  legacyTable: "hr_job_titles",
  migrationStrategy: ["map_legacy_job_title_to_job", "backfill_position_job_id", "freeze_new_job_title_dependencies", "archive_or_drop_after_data_audit"],
  newCanonicalDependenciesAllowed: false,
};

export const HR_SECURITY_READINESS_RULES = [
  { permissionBoundary: "assignment-resolver-manager-scope", requiredFor: ["manager_self_service", "approval_inbox", "team_attendance"], runtimeImplemented: false, scope: "manager-scope" },
  { permissionBoundary: "employee-self-record-scope", requiredFor: ["my_profile", "my_payslips", "my_leave_requests"], runtimeImplemented: false, scope: "self-scope" },
  { permissionBoundary: "hr.admin.scope", requiredFor: ["employee_master", "assignment_admin", "leave_admin"], runtimeImplemented: false, scope: "hr-admin-scope" },
  { permissionBoundary: "hr.payroll.admin.scope", requiredFor: ["payroll_run", "payroll_results", "payslip_publication"], runtimeImplemented: false, scope: "payroll-admin-scope" },
  { permissionBoundary: "approval.sod.scope", requiredFor: ["payroll_approval", "compensation_change", "leave_approval"], runtimeImplemented: false, scope: "approval-segregation-of-duties" },
] as const satisfies readonly HrSecurityReadinessRule[];

export const HR_PAYROLL_TYPED_SOURCE_KINDS = [
  "leave",
  "absence",
  "loan",
  "advance",
  "penalty",
  "benefit",
  "attendance",
  "overtime",
  "manual_adjustment",
] as const satisfies readonly HrPayrollTypedSourceKind[];

export const HR_PAYROLL_TYPED_SOURCE_REFERENCE_CONTRACT: HrPayrollTypedSourceReferenceContract = {
  calculationReadsTypedRefsAndApprovedInputs: true,
  genericMetadataOnlySourceReferencesAllowed: false,
  key: "hr.payroll.typed-source-references",
  payrollInputsUseTypedSourceRefs: true,
  sourceEnginesImplementedExceptLeaveAbsence: false,
  supportedSourceKinds: HR_PAYROLL_TYPED_SOURCE_KINDS,
};

export const HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT: HrArchitectureRefactorGateContract = {
  assignmentEngineCanonicalForOrgAssignments: true,
  employmentProfileCanonicalForOrgAssignments: false,
  essMssUiImplemented: false,
  hrJobTitlesLegacyCompatibilityOnly: true,
  hrJobsCanonical: true,
  key: "hr.architecture.refactor-gate",
  leaveAbsenceFirstClassBoundedContext: true,
  newFeaturesImplemented: false,
  payrollBatchOwnsExecutionLifecycle: false,
  payrollLocalizationImplemented: false,
  payrollRunCanonicalExecutionUnit: true,
  payrollUiImplemented: false,
};

export const HR_ARCHITECTURE_REFACTOR_AUDIT_ACTIONS = {
  ownershipReviewed: defineAuditAction("hr.architecture.ownership.reviewed"),
  payrollLifecycleReviewed: defineAuditAction("hr.architecture.payroll-lifecycle.reviewed"),
} as const;

export const HR_ARCHITECTURE_REFACTOR_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "HR architecture refactor gate contract reviewed.",
    kind: "domain",
    name: definePlatformEventName("HrArchitectureRefactorReviewed"),
    source: "business-app",
    version: 1,
  }),
] as const;

export const HR_ARCHITECTURE_REFACTOR_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.view, scope: "tenant-company-branch", entity: "hr-architecture-refactor-gate" },
  { key: HR_PERMISSIONS.payrollView, scope: "tenant-company-branch", entity: "payroll-lifecycle-canonical-model" },
  { key: HR_PERMISSIONS.assignmentsView, scope: "tenant-company-branch", entity: "assignment-ownership-model" },
] as const;
