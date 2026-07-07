import { defineAuditAction } from "@/platform/audit/public-api";
import { definePlatformEventDefinition, definePlatformEventName } from "@/platform/events/public-api";
import { defineExport, defineImport } from "@/platform/public-api";

import { HR_PERMISSIONS } from "./permissions/permission-registry";

export type HrPayrollLocalizationPackStatus = "draft" | "active" | "inactive" | "archived";

export type HrPayrollCountryProfileStatus = "draft" | "active" | "inactive" | "archived";

export type HrPayrollStatutoryRuleStatus = "draft" | "active" | "inactive" | "archived";

export type HrPayrollLocalizationRuleScope =
  | "country"
  | "legislative_data_group"
  | "payroll_group"
  | "employee"
  | "component";

export type HrPayrollCurrencyPolicyKind =
  | "employee_currency"
  | "company_base_currency"
  | "payroll_group_currency"
  | "localization_pack_currency";

export type HrPayrollLocalizationScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type HrPayrollLocalizationPackDefinition = HrPayrollLocalizationScope & Readonly<{
  packCode: string;
  packName: string;
  countryCode: string;
  version: string;
  status: HrPayrollLocalizationPackStatus;
  plugsIntoCalculationEngine: true;
  modifiesCalculationCore: false;
  countryCalculationsImplemented: false;
  statutoryRuntimeImplemented: false;
}>;

export type HrPayrollCountryProfileDefinition = HrPayrollLocalizationScope & Readonly<{
  countryCode: string;
  profileCode: string;
  profileName: string;
  defaultCurrency: string;
  defaultTimezone: string;
  localizationPackId?: string | null;
  currencyPolicyKind: HrPayrollCurrencyPolicyKind;
  status: HrPayrollCountryProfileStatus;
  countryCalculationsImplemented: false;
}>;

export type HrPayrollLegislativeDataGroupDefinition = HrPayrollLocalizationScope & Readonly<{
  countryProfileId: string;
  groupCode: string;
  groupName: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: HrPayrollCountryProfileStatus;
  statutoryRuntimeImplemented: false;
}>;

export type HrPayrollStatutoryRuleDefinition = HrPayrollLocalizationScope & Readonly<{
  localizationPackId: string;
  legislativeDataGroupId?: string | null;
  ruleCode: string;
  ruleName: string;
  ruleScope: HrPayrollLocalizationRuleScope;
  componentCode?: string | null;
  formulaKey: string;
  priority: number;
  status: HrPayrollStatutoryRuleStatus;
  statutoryCalculationImplemented: false;
}>;

export type HrPayrollStatutoryComponentMappingDefinition = HrPayrollLocalizationScope & Readonly<{
  localizationPackId: string;
  statutoryRuleId: string;
  platformComponentCode: string;
  localizedComponentCode: string;
  earningOrDeduction: "earning" | "deduction" | "employer_contribution" | "informational";
  status: HrPayrollStatutoryRuleStatus;
  mappingRuntimeImplemented: false;
}>;

export type HrPayrollCountryCalendarReadinessDefinition = HrPayrollLocalizationScope & Readonly<{
  countryProfileId: string;
  calendarCode: string;
  calendarName: string;
  publicHolidaySource?: string | null;
  weekendPattern: Readonly<Record<string, unknown>>;
  payrollCalendarIntegrationReady: true;
  holidayCalculationImplemented: false;
}>;

export type HrPayrollLocalizationEngineBoundaryContract = Readonly<{
  key: string;
  localizationPacksPlugIntoCalculation: true;
  calculationCoreRemainsCountryNeutral: true;
  statutoryRulesBelongToLocalizationPacks: true;
  countryCalculationsImplemented: false;
  saudiPackImplemented: false;
  egyptPackImplemented: false;
  gosiImplemented: false;
  egyptInsuranceImplemented: false;
  taxFormulasImplemented: false;
  eosImplemented: false;
  wpsFileGenerationImplemented: false;
  localizationRuntimeImplemented: false;
  processingFlow: readonly [
    "register_localization_pack",
    "bind_country_profile",
    "register_legislative_data_group",
    "register_statutory_rules",
    "map_statutory_components",
    "resolve_currency_policy",
    "bind_country_calendar_readiness",
    "inject_into_calculation_context",
  ];
}>;

export function defineHrPayrollLocalizationPack<T extends HrPayrollLocalizationPackDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollCountryProfile<T extends HrPayrollCountryProfileDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollLegislativeDataGroup<T extends HrPayrollLegislativeDataGroupDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollStatutoryRule<T extends HrPayrollStatutoryRuleDefinition>(definition: T): T {
  return definition;
}

export function defineHrPayrollStatutoryComponentMapping<T extends HrPayrollStatutoryComponentMappingDefinition>(
  definition: T,
): T {
  return definition;
}

export function localizationPackAllowsCalculationInjection(
  pack: Pick<HrPayrollLocalizationPackDefinition, "status" | "countryCalculationsImplemented">,
): boolean {
  return pack.status === "active" && pack.countryCalculationsImplemented === false;
}

export const HR_PAYROLL_LOCALIZATION_PACK_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
] as const satisfies readonly HrPayrollLocalizationPackStatus[];

export const HR_PAYROLL_COUNTRY_PROFILE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
] as const satisfies readonly HrPayrollCountryProfileStatus[];

export const HR_PAYROLL_STATUTORY_RULE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
] as const satisfies readonly HrPayrollStatutoryRuleStatus[];

export const HR_PAYROLL_LOCALIZATION_RULE_SCOPES = [
  "country",
  "legislative_data_group",
  "payroll_group",
  "employee",
  "component",
] as const satisfies readonly HrPayrollLocalizationRuleScope[];

export const HR_PAYROLL_CURRENCY_POLICY_KINDS = [
  "employee_currency",
  "company_base_currency",
  "payroll_group_currency",
  "localization_pack_currency",
] as const satisfies readonly HrPayrollCurrencyPolicyKind[];

export const HR_PAYROLL_LOCALIZATION_ENGINE_BOUNDARY_CONTRACT: HrPayrollLocalizationEngineBoundaryContract = {
  calculationCoreRemainsCountryNeutral: true,
  countryCalculationsImplemented: false,
  egyptInsuranceImplemented: false,
  egyptPackImplemented: false,
  eosImplemented: false,
  gosiImplemented: false,
  key: "hr.payroll.localization.boundary",
  localizationPacksPlugIntoCalculation: true,
  localizationRuntimeImplemented: false,
  processingFlow: [
    "register_localization_pack",
    "bind_country_profile",
    "register_legislative_data_group",
    "register_statutory_rules",
    "map_statutory_components",
    "resolve_currency_policy",
    "bind_country_calendar_readiness",
    "inject_into_calculation_context",
  ],
  saudiPackImplemented: false,
  statutoryRulesBelongToLocalizationPacks: true,
  taxFormulasImplemented: false,
  wpsFileGenerationImplemented: false,
};

export const HR_PAYROLL_LOCALIZATION_VALIDATION_RULES = [
  { key: "pack_must_not_modify_calculation_core", message: "Localization packs plug into calculation; they must not modify calculation core.", runtimeImplemented: false },
  { key: "statutory_rules_scoped_to_pack", message: "Statutory rules must belong to a localization pack.", runtimeImplemented: false },
  { key: "country_profile_requires_currency_policy", message: "Country profile must declare a currency policy kind.", runtimeImplemented: false },
  { key: "no_country_calculations_in_foundation", message: "Country-specific calculations are not implemented in foundation.", runtimeImplemented: false },
  { key: "component_mapping_requires_platform_code", message: "Statutory component mapping must reference a platform component code.", runtimeImplemented: false },
] as const;

const hrPayrollLocalizationImportExportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: false,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [HR_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "restricted" as const,
  tenantAware: true,
};

export const HR_PAYROLL_LOCALIZATION_IMPORT_CONTRACT = defineImport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "packCode", label: "Pack Code", required: true },
    { dataType: "text", key: "countryCode", label: "Country Code", required: true },
    { dataType: "text", key: "status", label: "Status", required: true },
  ],
  key: "hr.payroll.localization.import",
  label: "HR Payroll Localization Import",
  mappings: [
    { key: "pack-code", sourceColumn: "Pack Code", targetField: "packCode" },
    { key: "country-code", sourceColumn: "Country Code", targetField: "countryCode" },
    { key: "status", sourceColumn: "Status", targetField: "status" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { localizationFoundationOnly: true, countryCalculationsImplemented: false },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollLocalizationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "packCode", key: "pack-code-required", message: "Pack code is required.", severity: "error", type: "required" },
  ],
});

export const HR_PAYROLL_LOCALIZATION_EXPORT_CONTRACT = defineExport({
  appKey: "hr",
  columns: [
    { dataType: "text", key: "packCode", label: "Pack Code", order: 1, sourceField: "packCode" },
    { dataType: "text", key: "countryCode", label: "Country Code", order: 2, sourceField: "countryCode" },
    { dataType: "text", key: "status", label: "Status", order: 3, sourceField: "status" },
  ],
  key: "hr.payroll.localization.export",
  label: "HR Payroll Localization Export",
  mappings: [
    { key: "pack-code", sourceField: "packCode", targetColumn: "Pack Code" },
    { key: "country-code", sourceField: "countryCode", targetColumn: "Country Code" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "hr-payroll-localization-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: HR_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: hrPayrollLocalizationImportExportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const HR_PAYROLL_LOCALIZATION_EVENT_DEFINITIONS = [
  "PayrollLocalizationPackRegistered",
  "PayrollCountryProfileBound",
  "PayrollStatutoryRuleRegistered",
  "PayrollStatutoryComponentMapped",
  "PayrollLocalizationCurrencyPolicyResolved",
].map((name) =>
  definePlatformEventDefinition({
    category: "system",
    description: `${name} event contract prepared for Payroll Localization Framework. No country calculation runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  }),
);

export const HR_PAYROLL_LOCALIZATION_AUDIT_ACTIONS = {
  countryProfileBound: defineAuditAction("hr.payroll.localization.country-profile.bound"),
  localizationPackRegistered: defineAuditAction("hr.payroll.localization.pack.registered"),
  statutoryComponentMapped: defineAuditAction("hr.payroll.localization.statutory-component.mapped"),
  statutoryRuleRegistered: defineAuditAction("hr.payroll.localization.statutory-rule.registered"),
} as const;

export const HR_PAYROLL_LOCALIZATION_FOUNDATION_TABLES = [
  "hr_payroll_localization_packs",
  "hr_payroll_country_profiles",
  "hr_payroll_legislative_data_groups",
  "hr_payroll_statutory_rules",
  "hr_payroll_statutory_component_mappings",
  "hr_payroll_country_calendar_readiness",
] as const;

export const HR_PAYROLL_LOCALIZATION_PERMISSION_METADATA = [
  { entity: "payroll-localization", key: HR_PERMISSIONS.payrollLocalizationView, scope: "tenant-company-branch" },
  { entity: "payroll-localization-manage", key: HR_PERMISSIONS.payrollLocalizationManage, scope: "tenant-company-branch" },
  { entity: "payroll-localization-pack", key: HR_PERMISSIONS.payrollLocalizationPacksManage, scope: "tenant-company-branch" },
  { entity: "payroll-statutory-rule", key: HR_PERMISSIONS.payrollStatutoryRulesManage, scope: "tenant-company-branch" },
  { entity: "payroll-country-profile", key: HR_PERMISSIONS.payrollCountryProfilesManage, scope: "tenant-company-branch" },
] as const;

export const HR_PAYROLL_LOCALIZATION_PLATFORM_INTEGRATION = {
  auditActionsRegistered: true,
  calculationEngineIntegrationReady: true,
  countryCalculationsImplemented: false,
  eventBusRegistered: true,
  importExportRegistered: true,
  key: "hr.payroll.localization.platform-integration",
  localizationRuntimeImplemented: false,
} as const;
