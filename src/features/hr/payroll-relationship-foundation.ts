import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollRelationshipStatus = "draft" | "active" | "suspended" | "ended" | "archived";
export type HrPayrollPaymentMethodKind = "bank_transfer" | "cash" | "check" | "wallet" | "external_provider";
export type HrPayrollCurrencyPolicyKind = "employee_currency" | "company_base_currency" | "payroll_group_currency" | "localization_pack_currency";

export type HrPayrollRelationshipScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollRelationshipDefinition = HrPayrollRelationshipScope & Readonly<{
  employeeId: string;
  employmentProfileId: string;
  relationshipCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrPayrollRelationshipStatus;
  statutoryRulesImplemented: false;
}>;

export type HrPayrollAssignmentDefinition = HrPayrollRelationshipScope & Readonly<{
  payrollRelationshipId: string;
  payrollGroupId: string;
  payrollCalendarId: string;
  assignmentId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrPayrollRelationshipStatus;
  assignmentEngineLinked: true;
}>;

export type HrPayrollPaymentMethodReadinessDefinition = HrPayrollRelationshipScope & Readonly<{
  payrollRelationshipId: string;
  paymentMethodKind: HrPayrollPaymentMethodKind;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrPayrollRelationshipStatus;
  paymentExecutionImplemented: false;
}>;

export type HrPayrollCurrencyPolicyDefinition = HrPayrollRelationshipScope & Readonly<{
  payrollRelationshipId?: string | null;
  payrollGroupId?: string | null;
  currencyPolicyKind: HrPayrollCurrencyPolicyKind;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  fxRuntimeImplemented: false;
}>;

export type HrPayrollLocalizationPackBoundaryDefinition = HrPayrollRelationshipScope & Readonly<{
  countryCode: string;
  localizationPackKey: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  statutoryRulesImplemented: false;
  localizationRuntimeImplemented: false;
}>;

export type HrPayrollRelationshipEngineBoundaryContract = Readonly<{
  key: string;
  payrollRelationshipSeparateFromEmploymentAssignment: true;
  payrollAssignmentEffectiveDated: true;
  payrollGroupEffectiveDated: true;
  payrollCalendarEffectiveDated: true;
  paymentMethodReadinessOnly: true;
  payrollCurrencyPolicyReady: true;
  localizationPackBoundaryReady: true;
  statutoryRulesImplemented: false;
  paymentExecutionImplemented: false;
}>;

export function defineHrPayrollRelationship<T extends HrPayrollRelationshipDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollAssignment<T extends HrPayrollAssignmentDefinition>(definition: T): T {
  return definition;
}

export const HR_PAYROLL_RELATIONSHIP_ENGINE_BOUNDARY_CONTRACT: HrPayrollRelationshipEngineBoundaryContract = {
  key: "hr.payroll.relationship.boundary",
  localizationPackBoundaryReady: true,
  paymentExecutionImplemented: false,
  paymentMethodReadinessOnly: true,
  payrollAssignmentEffectiveDated: true,
  payrollCalendarEffectiveDated: true,
  payrollCurrencyPolicyReady: true,
  payrollGroupEffectiveDated: true,
  payrollRelationshipSeparateFromEmploymentAssignment: true,
  statutoryRulesImplemented: false,
};

export const HR_PAYROLL_RELATIONSHIP_VALIDATION_RULES = [
  { key: "payroll_relationship_requires_employee", message: "Payroll relationship must reference one employee and employment profile.", runtimeImplemented: false },
  { key: "payroll_assignment_effective_dated", message: "Payroll assignments must be effective dated.", runtimeImplemented: false },
  { key: "localization_pack_boundary_only", message: "Localization packs are boundary readiness only; statutory rules are not implemented.", runtimeImplemented: false },
] as const;

export const HR_PAYROLL_RELATIONSHIP_AUDIT_ACTIONS = {
  payrollAssignmentLinked: defineAuditAction("hr.payroll.relationship.assignment.linked"),
  payrollRelationshipCreated: defineAuditAction("hr.payroll.relationship.created"),
} as const;

export const HR_PAYROLL_RELATIONSHIP_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Payroll relationship foundation contract event.",
    kind: "domain",
    name: definePlatformEventName("HrPayrollRelationshipCreated"),
    source: "business-app",
    version: 1,
  }),
] as const;

const hrPayrollRelationshipImportExportSecurity = {
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

export const HR_PAYROLL_RELATIONSHIP_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", required: true },
    { dataType: "text", key: "payrollGroupId", label: "Payroll Group ID", required: true },
  ],
  key: "hr.payroll.relationship.import",
  label: "HR Payroll Relationship Foundation Import",
  mappings: [
    { key: "employee-id", sourceColumn: "Employee ID", targetField: "employeeId" },
    { key: "payroll-group-id", sourceColumn: "Payroll Group ID", targetField: "payrollGroupId" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { foundationOnly: true, payrollRelationshipRuntimeImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollRelationshipImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "employeeId", key: "employee-required", message: "Employee is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_RELATIONSHIP_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "employeeId", label: "Employee ID", order: 1, sourceField: "employeeId" },
    { dataType: "text", key: "status", label: "Status", order: 2, sourceField: "status" },
  ],
  key: "hr.payroll.relationship.export",
  label: "HR Payroll Relationship Foundation Export",
  mappings: [
    { key: "employee-id", sourceField: "employeeId", targetColumn: "Employee ID" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-relationships-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollRelationshipImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_RELATIONSHIP_PERMISSION_METADATA = [
  { key: HR_PERMISSIONS.payrollRelationshipsView, scope: "tenant-company-branch", entity: "payroll-relationship" },
  { key: HR_PERMISSIONS.payrollRelationshipsManage, scope: "tenant-company-branch", entity: "payroll-relationship" },
] as const;

export const HR_PAYROLL_RELATIONSHIP_FOUNDATION_TABLES = [
  "hr_payroll_relationships",
  "hr_payroll_assignments",
  "hr_payroll_payment_method_readiness",
  "hr_payroll_currency_policies",
  "hr_payroll_localization_pack_readiness",
  "hr_payroll_typed_source_refs",
] as const;
