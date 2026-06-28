import {
  createJobReadinessContract,
  defineAppKey,
  defineDashboardTemplate,
  defineDashboardWidget,
  defineDocumentType,
  definePlatformEventDefinition,
  definePlatformEventName,
  definePrintTemplate,
  defineReport,
  defineReportDataset,
  defineSearchProvider,
} from "@/platform/public-api";
import {
  createCostEventIntegrationContract,
  createCostJobReadinessContract,
  createCostSearchIntegrationContract,
  defineCostDefinition,
} from "@/platform/cost/public-api";
import { defineAuditAction } from "@/platform/audit/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

import { financeAppManifest } from "./app.manifest";
import { financeModuleManifest } from "./module.manifest";
import { FINANCE_PERMISSIONS, FINANCE_PERMISSION_LIST } from "./permissions/permission-registry";

export { financeAppManifest } from "./app.manifest";
export { financeModuleManifest } from "./module.manifest";
export { FINANCE_PERMISSIONS, FINANCE_PERMISSION_LIST } from "./permissions/permission-registry";
export {
  FINANCE_ENTITIES,
  FINANCE_ENTITY_KEYS,
  getFinanceEntity,
  isFinanceEntityKey,
} from "./application/entities";
export {
  buildFinanceMutationSchema,
  financeListQuerySchema,
} from "./application/schemas/finance.schema";
export type {
  FinanceCursorPage,
  FinanceDashboardData,
  FinanceDashboardMetric,
  FinanceEntityDescriptor,
  FinanceEntityKey,
  FinanceFieldDescriptor,
  FinanceFieldOption,
  FinanceFieldType,
  FinanceListQuery,
  FinanceRecord,
  FinanceRelationDescriptor,
} from "./application/types";

export const FINANCE_APP_KEY = defineAppKey("finance");

export type FinanceRecordStatus = "draft" | "active" | "inactive" | "locked" | "archived";
export type FinanceAccountClass =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "contra_asset"
  | "contra_liability"
  | "statistical";
export type FinanceAccountNormalBalance = "debit" | "credit" | "none";
export type FinanceJournalKind = "general" | "sales" | "purchase" | "cash" | "bank" | "inventory" | "payroll" | "adjustment";
export type FinanceFiscalPeriodKind = "opening" | "regular" | "adjustment" | "closing";
export type FinanceDimensionKind =
  | "company"
  | "branch"
  | "department"
  | "cost_center"
  | "project"
  | "warehouse"
  | "employee"
  | "customer"
  | "supplier"
  | "product"
  | "custom";

export type FinanceDefinitionScope = Readonly<{
  tenantId: string;
  companyId: string;
}>;

export type FinanceAccountTypeDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  accountClass: FinanceAccountClass;
  normalBalance: FinanceAccountNormalBalance;
  status: FinanceRecordStatus;
}>;

export type FinanceAccountDefinition = FinanceDefinitionScope & Readonly<{
  accountCode: string;
  name: string;
  accountTypeKey: string;
  parentAccountCode?: string | null;
  currencyCode?: string | null;
  costCenterRequired?: boolean;
  dimensionRequirements?: readonly FinanceDimensionKind[];
  status: FinanceRecordStatus;
}>;

export type FinanceJournalDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  journalKind: FinanceJournalKind;
  defaultCurrencyCode?: string | null;
  requiresApproval: boolean;
  postingEnabled: false;
  status: FinanceRecordStatus;
}>;

export type FinanceFiscalYearDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: Extract<FinanceRecordStatus, "active" | "locked" | "archived" | "draft">;
}>;

export type FinanceFiscalPeriodDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  fiscalYearKey: string;
  name: string;
  startsOn: string;
  endsOn: string;
  periodKind: FinanceFiscalPeriodKind;
  status: Extract<FinanceRecordStatus, "active" | "locked" | "archived" | "draft">;
}>;

export type FinanceCurrencyDefinition = FinanceDefinitionScope & Readonly<{
  currencyCode: string;
  isBaseCurrency: boolean;
  precision: number;
  status: FinanceRecordStatus;
}>;

export type FinanceTaxDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  calculationMode: "inclusive" | "exclusive";
  rate?: number | null;
  recoverable: boolean;
  withholding: boolean;
  calculationSupported: false;
  status: FinanceRecordStatus;
}>;

export type FinancePaymentTermsDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  dueDays: number;
  discountDays?: number | null;
  discountPercent?: number | null;
  paymentExecutionSupported: false;
  status: FinanceRecordStatus;
}>;

export type FinanceDimensionDefinition = FinanceDefinitionScope & Readonly<{
  key: string;
  name: string;
  kind: FinanceDimensionKind;
  costCenterKey?: string | null;
  referenceId?: string | null;
  requiredForPosting: boolean;
  status: FinanceRecordStatus;
}>;

export type FinanceCostCenterLink = FinanceDefinitionScope & Readonly<{
  dimensionKey: string;
  costCenterKey: string;
  source: "cost-engine-contract";
  directCostPostingSupported: false;
}>;

export type FinanceDocumentHookContract = Readonly<{
  key: string;
  documentType: string;
  hooks: readonly ("beforeSubmit" | "afterSubmit" | "beforePost" | "afterPost" | "beforeCancel" | "afterCancel")[];
  requiredPermission: PermissionKey;
  emitsEventsOnly: true;
  postingImplementationProvided: false;
}>;

export type FinancePostingReadinessContract = Readonly<{
  key: string;
  sourceApp: string;
  sourceDocumentType: string;
  requiredDefinitions: readonly string[];
  requiredDimensions: readonly FinanceDimensionKind[];
  usesEventBus: true;
  usesDocumentEngine: true;
  usesCostEngineContractsOnly: true;
  journalEntryPostingSupported: false;
  invoiceWorkflowSupported: false;
  paymentExecutionSupported: false;
}>;

export function defineFinanceAccountType<TDefinition extends FinanceAccountTypeDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineFinanceAccount<TDefinition extends FinanceAccountDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineFinanceJournal<TDefinition extends FinanceJournalDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineFinanceDimension<TDefinition extends FinanceDimensionDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function createFinanceDocumentHookContract(
  documentType: string,
  key = `finance.${documentType}.hooks`,
): FinanceDocumentHookContract {
  return {
    documentType,
    emitsEventsOnly: true,
    hooks: ["beforeSubmit", "afterSubmit", "beforePost", "afterPost", "beforeCancel", "afterCancel"],
    key,
    postingImplementationProvided: false,
    requiredPermission: FINANCE_PERMISSIONS.hooksManage,
  };
}

export function createFinancePostingReadinessContract(
  input: Omit<FinancePostingReadinessContract, "key" | "usesEventBus" | "usesDocumentEngine" | "usesCostEngineContractsOnly" | "journalEntryPostingSupported" | "invoiceWorkflowSupported" | "paymentExecutionSupported"> & Readonly<{
    key?: string;
  }>,
): FinancePostingReadinessContract {
  return {
    ...input,
    invoiceWorkflowSupported: false,
    journalEntryPostingSupported: false,
    key: input.key ?? `finance.${input.sourceApp}.${input.sourceDocumentType}.posting-readiness`,
    paymentExecutionSupported: false,
    usesCostEngineContractsOnly: true,
    usesDocumentEngine: true,
    usesEventBus: true,
  };
}

export function createFinanceCostCenterLink(input: Omit<FinanceCostCenterLink, "source" | "directCostPostingSupported">): FinanceCostCenterLink {
  return {
    ...input,
    directCostPostingSupported: false,
    source: "cost-engine-contract",
  };
}

export const FINANCE_SEARCH_PROVIDER_CONTRACT = defineSearchProvider({
  appKey: "finance",
  entityTypes: [
    "finance_account",
    "finance_account_type",
    "finance_journal",
    "finance_fiscal_year",
    "finance_fiscal_period",
    "finance_currency",
    "finance_tax_definition",
    "finance_payment_terms",
    "finance_dimension",
  ],
  key: "finance.foundation.search",
  moduleKey: "finance",
  requiredPermissions: [FINANCE_PERMISSIONS.accountsView],
  searchableEntities: [
    {
      appKey: "finance",
      displayName: "Finance foundation definitions",
      entityType: "finance_account",
      moduleKey: "finance",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [FINANCE_PERMISSIONS.accountsView],
        sensitivity: "sensitive",
      },
      quickSearchFields: ["accountCode", "name", "accountTypeKey", "status"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
  ],
  source: "app",
  supportedExperiences: ["erp"],
});

export const FINANCE_REPORT_DATASET_CONTRACT = defineReportDataset({
  appKey: "finance",
  defaultExecutionMode: "async",
  fields: [
    { isDimension: true, key: "definitionType", label: "Definition Type", type: "text" },
    { isDimension: true, key: "companyId", label: "Company", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { isDimension: true, key: "status", label: "Status", type: "text" },
  ],
  key: "finance.foundation.definitions",
  label: "Finance Foundation Definitions",
  requiredPermission: FINANCE_PERMISSIONS.reportsView,
});

export const FINANCE_REPORT_READINESS_CONTRACT = defineReport({
  appKey: "finance",
  category: "financial",
  dataSource: {
    key: "finance.foundation.search-source",
    providerSource: "business-app",
    sourceKey: FINANCE_SEARCH_PROVIDER_CONTRACT.key,
    supportsAsync: true,
    supportsSync: false,
    type: "search-provider",
  },
  datasetKey: FINANCE_REPORT_DATASET_CONTRACT.key,
  key: "finance.foundation.readiness",
  metadata: {
    auditRequired: true,
    branchAware: false,
    companyAware: true,
    sensitivity: "sensitive",
    tenantAware: true,
  },
  mode: "async",
  name: "Finance Foundation Readiness",
  providerSource: "business-app",
  requiredPermission: FINANCE_PERMISSIONS.reportsView,
  supportedFormats: ["table", "json", "csv"],
});

export const FINANCE_PRINT_READINESS_CONTRACT = definePrintTemplate({
  appKey: "finance",
  defaultLocale: "en",
  key: "finance.foundation.readiness-print",
  metadata: {
    brandAware: true,
    companyScoped: true,
    localeAware: true,
    tenantScoped: true,
  },
  name: "Finance Foundation Readiness Print Contract",
  providerSource: "business-app",
  requiredPermission: FINANCE_PERMISSIONS.reportsView,
  security: {
    auditRequired: true,
    branchAware: false,
    companyAware: true,
    requiredPermissions: [FINANCE_PERMISSIONS.reportsView],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantAware: true,
  },
  supportedFormats: ["preview", "json"],
  supportedLocales: ["en", "ar"],
  type: "report",
});

export const FINANCE_DASHBOARD_WIDGET_CONTRACT = defineDashboardWidget({
  appKey: "finance",
  defaultSize: "wide",
  key: "finance.foundation.readiness-widget",
  label: "Finance Foundation Readiness",
  reportIntegration: {
    reportKey: FINANCE_REPORT_READINESS_CONTRACT.key,
    requiresReportPermission: true,
    supportedFormats: ["table", "json"],
  },
  requiredPermission: FINANCE_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  type: "report-widget",
});

export const FINANCE_DASHBOARD_TEMPLATE_CONTRACT = defineDashboardTemplate({
  appKey: "finance",
  defaultLayout: {
    pages: [
      {
        key: "foundation",
        label: "Foundation",
        order: 1,
        sections: [
          {
            key: "readiness",
            label: "Readiness",
            order: 1,
            widgetKeys: [FINANCE_DASHBOARD_WIDGET_CONTRACT.key],
          },
        ],
      },
    ],
    positions: [
      {
        breakpoint: "desktop",
        height: 4,
        widgetKey: FINANCE_DASHBOARD_WIDGET_CONTRACT.key,
        width: 12,
        x: 0,
        y: 0,
      },
    ],
    responsiveGrid: {
      columns: { desktop: 12, mobile: 4, tablet: 8 },
      gap: 16,
      rowHeight: 80,
    },
  },
  key: "finance.foundation.dashboard-template",
  kind: "finance",
  label: "Finance Foundation Dashboard Template",
  providerSource: "business-app",
  requiredPermission: FINANCE_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  templateOnly: true,
  widgetKeys: [FINANCE_DASHBOARD_WIDGET_CONTRACT.key],
});

export const FINANCE_COST_DEFINITION_CONTRACT = defineCostDefinition({
  allocationRules: [],
  appKey: "finance",
  categories: [],
  centers: [],
  costTypes: ["indirect", "fixed", "variable", "custom"],
  drivers: [],
  key: "finance.foundation.cost-center-links",
  label: "Finance Cost Center Link Contracts",
  metadata: {
    directCostPostingSupported: false,
    foundationOnly: true,
  },
  objects: [],
  providerSource: "business-app",
  rates: [],
  security: {
    approvalRequired: false,
    auditRequired: true,
    branchAware: false,
    companyAware: true,
    requiredPermissions: [FINANCE_PERMISSIONS.dimensionsView],
    sensitiveFinancialData: true,
    tenantAware: true,
  },
});

export const FINANCE_EVENT_DEFINITIONS = [
  definePlatformEventDefinition({
    category: "system",
    description: "Finance foundation definition metadata changed; consumers must react through the Event Bus.",
    kind: "domain",
    name: definePlatformEventName("finance.definition.changed"),
    source: "business-app",
    version: 1,
  }),
  definePlatformEventDefinition({
    category: "system",
    description: "A future source document requested Finance posting readiness validation without journal posting.",
    kind: "domain",
    name: definePlatformEventName("finance.posting-readiness.requested"),
    source: "business-app",
    version: 1,
  }),
];

export const FINANCE_AUDIT_ACTIONS = {
  definitionChanged: defineAuditAction("finance.definition.changed"),
  postingReadinessChecked: defineAuditAction("finance.posting-readiness.checked"),
} as const;

export const FINANCE_JOB_READINESS_CONTRACTS = [
  createJobReadinessContract("search-indexing", "finance.foundation.search-index"),
  createJobReadinessContract("report-generation", "finance.foundation.report"),
  createJobReadinessContract("print-generation", "finance.foundation.print"),
  createCostJobReadinessContract("snapshot", FINANCE_COST_DEFINITION_CONTRACT.key),
];

export const FINANCE_COST_INTEGRATION_CONTRACTS = {
  definitionChangedEvent: createCostEventIntegrationContract("finance.definition.changed", "definition-change", FINANCE_COST_DEFINITION_CONTRACT.key),
  search: createCostSearchIntegrationContract(FINANCE_SEARCH_PROVIDER_CONTRACT.key, ["record"]),
} as const;

export const FINANCE_DOCUMENT_TYPE_READINESS = defineDocumentType("finance.future-financial-document");

export const FINANCE_DOCUMENT_HOOK_CONTRACT = createFinanceDocumentHookContract(
  FINANCE_DOCUMENT_TYPE_READINESS,
);

export const FINANCE_FOUNDATION_CONTRACTS = {
  appManifest: financeAppManifest,
  auditActions: FINANCE_AUDIT_ACTIONS,
  costDefinition: FINANCE_COST_DEFINITION_CONTRACT,
  costIntegrations: FINANCE_COST_INTEGRATION_CONTRACTS,
  dashboardTemplate: FINANCE_DASHBOARD_TEMPLATE_CONTRACT,
  dashboardWidget: FINANCE_DASHBOARD_WIDGET_CONTRACT,
  documentHook: FINANCE_DOCUMENT_HOOK_CONTRACT,
  eventDefinitions: FINANCE_EVENT_DEFINITIONS,
  jobReadiness: FINANCE_JOB_READINESS_CONTRACTS,
  moduleManifest: financeModuleManifest,
  permissions: FINANCE_PERMISSION_LIST,
  print: FINANCE_PRINT_READINESS_CONTRACT,
  report: FINANCE_REPORT_READINESS_CONTRACT,
  reportDataset: FINANCE_REPORT_DATASET_CONTRACT,
  search: FINANCE_SEARCH_PROVIDER_CONTRACT,
} as const;
