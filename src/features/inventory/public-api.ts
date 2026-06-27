import {
  createCostDashboardIntegrationContract,
  createCostEventIntegrationContract,
  createCostExportIntegrationContract,
  createCostJobReadinessContract,
  createCostReportIntegrationContract,
  createCostSearchIntegrationContract,
  createExportDashboardIntegrationContract,
  createExportJobReadinessContract,
  createExportReportIntegrationContract,
  createExportSearchIntegrationContract,
  createImportJobReadinessContract,
  createImportSearchIndexingContract,
  createJobReadinessContract,
  defineAppKey,
  defineAuditAction,
  defineCostDefinition,
  defineDashboardTemplate,
  defineDashboardWidget,
  defineDocumentBehavior,
  defineDocumentLifecycle,
  defineDocumentType,
  defineDocumentTypeDefinition,
  defineExport,
  defineImport,
  definePlatformEventDefinition,
  definePlatformEventName,
  definePrintTemplate,
  defineReport,
  defineReportDataset,
  defineSearchProvider,
} from "@/platform/public-api";
import type { DocumentType } from "@/platform/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

import { createFinancePostingReadinessContract } from "@/features/finance/public-api";
import { inventoryAppManifest } from "./app.manifest";
import { inventoryModuleManifest } from "./module.manifest";
import { INVENTORY_PERMISSIONS, INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";

export { inventoryAppManifest } from "./app.manifest";
export { inventoryModuleManifest } from "./module.manifest";
export { INVENTORY_PERMISSIONS, INVENTORY_PERMISSION_LIST } from "./permissions/permission-registry";
export { INVENTORY_PAGE_CONFIGS } from "./presentation/view-models/page-config";
export {
  createInventoryFoundationService,
  createInventoryTransactionServices,
  createStockPostingService,
} from "./routes/service-factory";

export const INVENTORY_APP_KEY = defineAppKey("inventory");

export type InventoryRecordStatus = "draft" | "active" | "inactive" | "locked" | "archived";
export type InventoryProductKind = "stockable" | "consumable" | "service" | "asset" | "rental" | "kit";
export type InventoryTrackingMode = "none" | "lot" | "serial";
export type InventoryUomKind = "quantity" | "weight" | "volume" | "length" | "time" | "package" | "custom";
export type InventoryLocationKind = "warehouse" | "zone" | "aisle" | "rack" | "shelf" | "bin" | "virtual" | "staging" | "quarantine";
export type InventoryMovementDirection = "in" | "out" | "internal" | "adjustment";
export type InventoryMovementDocumentKind = "movement" | "transfer" | "adjustment" | "opening_balance";
export type InventoryReservationPolicy = "none" | "soft" | "hard";
export type InventoryReorderPolicy = "min_max" | "reorder_point" | "manual_review";

export type InventoryScope = Readonly<{
  tenantId: string;
  companyId: string;
  branchId?: string | null;
}>;

export type InventoryProductDefinition = InventoryScope & Readonly<{
  productKey: string;
  sku: string;
  name: string;
  categoryKey?: string | null;
  baseUomKey: string;
  productKind: InventoryProductKind;
  trackingMode: InventoryTrackingMode;
  reservationPolicy: InventoryReservationPolicy;
  costObjectKey?: string | null;
  financeDimensionKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventoryProductVariantDefinition = InventoryScope & Readonly<{
  productKey: string;
  variantKey: string;
  sku: string;
  name: string;
  attributes: Readonly<Record<string, string | number | boolean>>;
  trackingMode?: InventoryTrackingMode;
  status: InventoryRecordStatus;
}>;

export type InventoryProductCategoryDefinition = InventoryScope & Readonly<{
  categoryKey: string;
  name: string;
  parentCategoryKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventoryUomCategoryDefinition = InventoryScope & Readonly<{
  categoryKey: string;
  name: string;
  uomKind: InventoryUomKind;
  status: InventoryRecordStatus;
}>;

export type InventoryUomDefinition = InventoryScope & Readonly<{
  uomKey: string;
  categoryKey: string;
  name: string;
  symbol: string;
  conversionFactorToBase: number;
  precision: number;
  isBaseUom: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryWarehouseDefinition = InventoryScope & Readonly<{
  warehouseKey: string;
  name: string;
  warehouseType: "main" | "branch" | "returns" | "quarantine" | "in_transit" | "virtual";
  defaultLocationKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventoryLocationDefinition = InventoryScope & Readonly<{
  warehouseKey: string;
  locationKey: string;
  name: string;
  locationKind: InventoryLocationKind;
  parentLocationKey?: string | null;
  reservable: boolean;
  status: InventoryRecordStatus;
}>;

export type InventoryLotDefinition = InventoryScope & Readonly<{
  lotKey: string;
  productKey: string;
  variantKey?: string | null;
  receivedOn?: string | null;
  expiresOn?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventorySerialNumberDefinition = InventoryScope & Readonly<{
  serialKey: string;
  productKey: string;
  variantKey?: string | null;
  lotKey?: string | null;
  status: InventoryRecordStatus;
}>;

export type InventoryStockBalanceContract = InventoryScope & Readonly<{
  productKey: string;
  variantKey?: string | null;
  warehouseKey: string;
  locationKey: string;
  lotKey?: string | null;
  serialKey?: string | null;
  uomKey: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  source: "inventory-owned";
  costFieldsOwnedByCostEngine: true;
}>;

export type InventoryReorderRuleDefinition = InventoryScope & Readonly<{
  ruleKey: string;
  productKey: string;
  variantKey?: string | null;
  warehouseKey: string;
  locationKey?: string | null;
  policy: InventoryReorderPolicy;
  minimumQuantity: number;
  maximumQuantity?: number | null;
  reorderQuantity?: number | null;
  createsDemandDocument: false;
  status: InventoryRecordStatus;
}>;

export type InventoryDocumentContract = Readonly<{
  key: string;
  documentType: DocumentType;
  documentKind: InventoryMovementDocumentKind;
  requiredPermission: PermissionKey;
  ownsStockQuantityEffects: true;
  usesDocumentEngine: true;
  usesEventBus: true;
  costEngineContractOnly: true;
  financePostingReadinessOnly: true;
  implementsManufacturing: false;
  implementsSales: false;
  implementsPurchasing: false;
  implementsValuation: false;
  implementsAccountingPosting: false;
}>;

export type InventoryCostIntegrationContract = Readonly<{
  key: string;
  sourceDocumentTypes: readonly string[];
  sourceEventNames: readonly string[];
  costObjectTypes: readonly ("product" | "variant" | "batch" | "inventory_item" | "warehouse")[];
  sendsQuantityFactsOnly: true;
  ownsCostFacts: false;
  ownsCostLayers: false;
  ownsCostSnapshots: false;
  calculatesValuation: false;
}>;

export function defineInventoryProduct<TDefinition extends InventoryProductDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryProductVariant<TDefinition extends InventoryProductVariantDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryUom<TDefinition extends InventoryUomDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryWarehouse<TDefinition extends InventoryWarehouseDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function defineInventoryLocation<TDefinition extends InventoryLocationDefinition>(definition: TDefinition): TDefinition {
  return definition;
}

export function createInventoryDocumentContract(
  documentKind: InventoryMovementDocumentKind,
  requiredPermission: PermissionKey,
  documentType = `inventory.${documentKind.replaceAll("_", "-")}`,
): InventoryDocumentContract {
  return {
    costEngineContractOnly: true,
    documentKind,
    documentType: defineDocumentType(documentType),
    financePostingReadinessOnly: true,
    implementsAccountingPosting: false,
    implementsManufacturing: false,
    implementsPurchasing: false,
    implementsSales: false,
    implementsValuation: false,
    key: `inventory.${documentKind}.document-contract`,
    ownsStockQuantityEffects: true,
    requiredPermission,
    usesDocumentEngine: true,
    usesEventBus: true,
  };
}

export function createInventoryCostIntegrationContract(
  input: Omit<InventoryCostIntegrationContract, "key" | "sendsQuantityFactsOnly" | "ownsCostFacts" | "ownsCostLayers" | "ownsCostSnapshots" | "calculatesValuation"> & Readonly<{ key?: string }>,
): InventoryCostIntegrationContract {
  return {
    ...input,
    calculatesValuation: false,
    key: input.key ?? "inventory.cost-engine.quantity-facts",
    ownsCostFacts: false,
    ownsCostLayers: false,
    ownsCostSnapshots: false,
    sendsQuantityFactsOnly: true,
  };
}

export const INVENTORY_DOCUMENT_CONTRACTS = {
  adjustment: createInventoryDocumentContract("adjustment", INVENTORY_PERMISSIONS.adjustmentsCreate),
  movement: createInventoryDocumentContract("movement", INVENTORY_PERMISSIONS.movementsCreate),
  openingBalance: createInventoryDocumentContract("opening_balance", INVENTORY_PERMISSIONS.openingBalancesImport),
  transfer: createInventoryDocumentContract("transfer", INVENTORY_PERMISSIONS.transfersRequest),
} as const;

export const INVENTORY_DOCUMENT_TYPE_DEFINITIONS = [
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for inventory stock movements; posting and valuation are provided by later services.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
    label: "Inventory Stock Movement",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.movementsCreate, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for stock transfer requests and completion readiness.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
    label: "Inventory Stock Transfer",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.transfersRequest, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.transfersComplete, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.transfersRequest, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
  defineDocumentTypeDefinition({
    behaviors: [
      defineDocumentBehavior("numbering", true, { required: true }),
      defineDocumentBehavior("workflow", true),
      defineDocumentBehavior("audit", true, { required: true }),
      defineDocumentBehavior("timeline", true),
      defineDocumentBehavior("printing", true),
      defineDocumentBehavior("reporting", true),
    ],
    description: "Foundation contract for stock adjustments; no accounting posting is implemented.",
    documentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
    label: "Inventory Stock Adjustment",
    lifecycle: defineDocumentLifecycle({
      documentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
      initialState: "draft",
      terminalStates: ["completed", "cancelled", "archived"],
      transitions: [
        { command: "submit", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "submitted" },
        { command: "complete", from: "submitted", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "completed" },
        { command: "cancel", from: "draft", requiredPermission: INVENTORY_PERMISSIONS.adjustmentsCreate, requiresAudit: true, to: "cancelled" },
        { command: "archive", from: "completed", requiredPermission: INVENTORY_PERMISSIONS.auditView, to: "archived" },
      ],
    }),
    moduleKey: "inventory",
  }),
] as const;

export const INVENTORY_SEARCH_PROVIDER_CONTRACT = defineSearchProvider({
  appKey: "inventory",
  entityTypes: [
    "inventory_product",
    "inventory_product_variant",
    "inventory_product_category",
    "inventory_uom",
    "inventory_warehouse",
    "inventory_location",
    "inventory_lot",
    "inventory_serial_number",
  ],
  key: "inventory.foundation.search",
  moduleKey: "inventory",
  requiredPermissions: [INVENTORY_PERMISSIONS.searchView],
  searchableEntities: [
    {
      appKey: "inventory",
      displayName: "Inventory products",
      entityType: "inventory_product",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.productsView],
        sensitivity: "sensitive",
      },
      quickSearchFields: ["productKey", "sku", "name", "categoryKey", "status"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
    {
      appKey: "inventory",
      displayName: "Inventory locations and lots",
      entityType: "inventory_location",
      moduleKey: "inventory",
      permissionPolicy: {
        hideWhenUnauthorized: true,
        requiredPermissions: [INVENTORY_PERMISSIONS.locationsView],
        sensitivity: "sensitive",
      },
      quickSearchFields: ["warehouseKey", "locationKey", "lotKey", "serialKey"],
      rankingStrategy: "weighted",
      resultType: "record",
    },
  ],
  source: "app",
  supportedExperiences: ["erp"],
});

export const INVENTORY_REPORT_DATASET_CONTRACT = defineReportDataset({
  appKey: "inventory",
  defaultExecutionMode: "async",
  fields: [
    { isDimension: true, key: "definitionType", label: "Definition Type", type: "text" },
    { isDimension: true, key: "companyId", label: "Company", type: "text" },
    { isDimension: true, key: "branchId", label: "Branch", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { isMeasure: true, key: "quantityOnHand", label: "Quantity On Hand", type: "quantity" },
    { isMeasure: true, key: "quantityReserved", label: "Quantity Reserved", type: "quantity" },
    { isDimension: true, key: "status", label: "Status", type: "text" },
  ],
  key: "inventory.foundation.definitions",
  label: "Inventory Foundation Definitions",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
});

export const INVENTORY_REPORT_READINESS_CONTRACT = defineReport({
  appKey: "inventory",
  category: "operational",
  dataSource: {
    key: "inventory.foundation.search-source",
    providerSource: "business-app",
    sourceKey: INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
    supportsAsync: true,
    supportsSync: false,
    type: "search-provider",
  },
  datasetKey: INVENTORY_REPORT_DATASET_CONTRACT.key,
  key: "inventory.foundation.readiness",
  metadata: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    requiredDataScopes: ["tenant", "company", "branch"],
    sensitivity: "sensitive",
    tenantAware: true,
  },
  mode: "async",
  name: "Inventory Foundation Readiness",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedFormats: ["table", "json", "csv"],
});

export const INVENTORY_PRINT_READINESS_CONTRACT = definePrintTemplate({
  appKey: "inventory",
  defaultLocale: "en",
  key: "inventory.foundation.readiness-print",
  metadata: {
    brandAware: true,
    companyScoped: true,
    localeAware: true,
    tenantScoped: true,
  },
  name: "Inventory Foundation Readiness Print Contract",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  security: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    requiredPermissions: [INVENTORY_PERMISSIONS.reportsView],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantAware: true,
  },
  supportedFormats: ["preview", "json"],
  supportedLocales: ["en", "ar"],
  type: "report",
});

export const INVENTORY_DASHBOARD_WIDGET_CONTRACT = defineDashboardWidget({
  appKey: "inventory",
  defaultSize: "wide",
  key: "inventory.foundation.readiness-widget",
  label: "Inventory Foundation Readiness",
  reportIntegration: {
    reportKey: INVENTORY_REPORT_READINESS_CONTRACT.key,
    requiresReportPermission: true,
    supportedFormats: ["table", "json"],
  },
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  type: "report-widget",
});

export const INVENTORY_DASHBOARD_TEMPLATE_CONTRACT = defineDashboardTemplate({
  appKey: "inventory",
  defaultLayout: {
    pages: [{
      key: "foundation",
      label: "Foundation",
      order: 1,
      sections: [{
        key: "readiness",
        label: "Readiness",
        order: 1,
        widgetKeys: [INVENTORY_DASHBOARD_WIDGET_CONTRACT.key],
      }],
    }],
    positions: [{
      breakpoint: "desktop",
      height: 4,
      widgetKey: INVENTORY_DASHBOARD_WIDGET_CONTRACT.key,
      width: 12,
      x: 0,
      y: 0,
    }],
    responsiveGrid: {
      columns: { desktop: 12, mobile: 4, tablet: 8 },
      gap: 16,
      rowHeight: 80,
    },
  },
  key: "inventory.foundation.dashboard-template",
  kind: "inventory",
  label: "Inventory Foundation Dashboard Template",
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.reportsView,
  supportedExperiences: ["erp"],
  templateOnly: true,
  widgetKeys: [INVENTORY_DASHBOARD_WIDGET_CONTRACT.key],
});

const inventoryImportSecurity = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  pii: false,
  requiredDataScopes: ["tenant", "company", "branch"],
  requiredPermissions: [INVENTORY_PERMISSIONS.importExportManage],
  sensitiveData: true,
  sensitivity: "sensitive",
  tenantAware: true,
} as const;

export const INVENTORY_PRODUCT_IMPORT_CONTRACT = defineImport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "productKey", label: "Product Key", required: true },
    { dataType: "text", key: "sku", label: "SKU", required: true },
    { dataType: "text", key: "name", label: "Name", required: true },
    { dataType: "text", key: "baseUomKey", label: "Base UOM", required: true },
  ],
  key: "inventory.products.import",
  label: "Inventory Product Import",
  mappings: [
    { key: "product-key", sourceColumn: "Product Key", targetField: "productKey" },
    { key: "sku", sourceColumn: "SKU", targetField: "sku" },
    { key: "name", sourceColumn: "Name", targetField: "name" },
    { key: "base-uom", sourceColumn: "Base UOM", targetField: "baseUomKey" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { createsOpeningBalances: false, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "productKey", key: "product-key-required", message: "Product key is required.", severity: "error", type: "required" },
    { fieldKey: "sku", key: "sku-required", message: "SKU is required.", severity: "error", type: "required" },
    { key: "uom-lookup", lookupKey: "inventory_uoms", message: "Base UOM must exist.", severity: "error", type: "lookup" },
  ],
});

export const INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT = defineImport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "productKey", label: "Product Key", required: true },
    { dataType: "text", key: "warehouseKey", label: "Warehouse", required: true },
    { dataType: "text", key: "locationKey", label: "Location", required: true },
    { dataType: "number", key: "quantityOnHand", label: "Opening Quantity", required: true },
  ],
  key: "inventory.opening-balances.import",
  label: "Inventory Opening Balance Import",
  mappings: [
    { key: "product-key", sourceColumn: "Product Key", targetField: "productKey" },
    { key: "warehouse-key", sourceColumn: "Warehouse", targetField: "warehouseKey" },
    { key: "location-key", sourceColumn: "Location", targetField: "locationKey" },
    { key: "quantity", sourceColumn: "Opening Quantity", targetField: "quantityOnHand" },
  ],
  maxFileSizeBytes: 25_000_000,
  metadata: { documentContract: INVENTORY_DOCUMENT_CONTRACTS.openingBalance.documentType, foundationOnly: true },
  previewRequired: true,
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.openingBalancesImport,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
  validationRules: [
    { fieldKey: "quantityOnHand", key: "quantity-required", message: "Opening quantity is required.", severity: "error", type: "required" },
    { key: "warehouse-lookup", lookupKey: "inventory_warehouses", message: "Warehouse must exist.", severity: "error", type: "lookup" },
    { key: "location-lookup", lookupKey: "inventory_locations", message: "Location must exist.", severity: "error", type: "lookup" },
  ],
});

export const INVENTORY_EXPORT_CONTRACT = defineExport({
  appKey: "inventory",
  columns: [
    { dataType: "text", key: "definitionType", label: "Definition Type", order: 1, sourceField: "definitionType" },
    { dataType: "text", key: "code", label: "Code", order: 2, sourceField: "code" },
    { dataType: "text", key: "name", label: "Name", order: 3, sourceField: "name" },
    { dataType: "text", key: "status", label: "Status", order: 4, sourceField: "status" },
  ],
  key: "inventory.foundation.export",
  label: "Inventory Foundation Export",
  mappings: [
    { key: "definition-type", sourceField: "definitionType", targetColumn: "Definition Type" },
    { key: "code", sourceField: "code", targetColumn: "Code" },
    { key: "name", sourceField: "name", targetColumn: "Name" },
    { key: "status", sourceField: "status", targetColumn: "Status" },
  ],
  metadata: {
    fileNameTemplate: "inventory-foundation-{date}",
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "business-app",
  requiredPermission: INVENTORY_PERMISSIONS.importExportManage,
  requiresAsync: true,
  security: inventoryImportSecurity,
  supportedFormats: ["csv", "excel", "json"],
  templates: [],
});

export const INVENTORY_COST_DEFINITION_CONTRACT = defineCostDefinition({
  allocationRules: [],
  appKey: "inventory",
  categories: [
    { active: true, key: "inventory-material", label: "Inventory Material", type: "direct_material" },
    { active: true, key: "inventory-logistics", label: "Inventory Logistics", type: "logistics" },
  ],
  centers: [
    { active: true, key: "inventory-company", label: "Inventory Company", type: "company" },
    { active: true, key: "inventory-branch", label: "Inventory Branch", type: "branch" },
    { active: true, key: "inventory-warehouse", label: "Inventory Warehouse", type: "warehouse" },
  ],
  costTypes: ["direct_material", "logistics", "landed_cost", "custom"],
  drivers: [
    { key: "inventory-quantity", label: "Inventory Quantity", required: true, unit: "quantity" },
    { key: "inventory-weight", label: "Inventory Weight", required: false, unit: "weight" },
    { key: "inventory-volume", label: "Inventory Volume", required: false, unit: "volume" },
  ],
  key: "inventory.foundation.cost-contracts",
  label: "Inventory Cost Engine Contracts",
  metadata: {
    calculatesValuation: false,
    foundationOnly: true,
    ownsCostFacts: false,
    ownsStockQuantities: true,
  },
  objects: [
    { key: "inventory-product", label: "Inventory Product", type: "product" },
    { key: "inventory-variant", label: "Inventory Variant", type: "variant" },
    { key: "inventory-batch", label: "Inventory Lot or Batch", type: "batch" },
    { key: "inventory-item", label: "Inventory Item", type: "inventory_item" },
    { key: "inventory-warehouse", label: "Inventory Warehouse", type: "warehouse" },
  ],
  providerSource: "business-app",
  rates: [],
  security: {
    approvalRequired: false,
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    exportRestrictions: ["approval-required"],
    requiredDataScopes: ["tenant", "company", "branch"],
    requiredPermissions: [INVENTORY_PERMISSIONS.costIntegrationView],
    sensitiveFinancialData: true,
    tenantAware: true,
  },
});

export const INVENTORY_COST_INTEGRATION_CONTRACTS = {
  dashboard: createCostDashboardIntegrationContract(INVENTORY_DASHBOARD_TEMPLATE_CONTRACT.key, INVENTORY_COST_DEFINITION_CONTRACT.key, "inventory.quantity"),
  definitionChangedEvent: createCostEventIntegrationContract("InventoryStockMovementCreated", "definition-change", INVENTORY_COST_DEFINITION_CONTRACT.key),
  export: createCostExportIntegrationContract(INVENTORY_EXPORT_CONTRACT.key, ["csv", "excel", "json"]),
  quantityFacts: createInventoryCostIntegrationContract({
    costObjectTypes: ["product", "variant", "batch", "inventory_item", "warehouse"],
    sourceDocumentTypes: Object.values(INVENTORY_DOCUMENT_CONTRACTS).map((contract) => contract.documentType),
    sourceEventNames: ["InventoryStockMovementCreated", "InventoryOpeningBalanceImported"],
  }),
  report: createCostReportIntegrationContract(INVENTORY_REPORT_READINESS_CONTRACT.key, INVENTORY_COST_DEFINITION_CONTRACT.key),
  search: createCostSearchIntegrationContract(INVENTORY_SEARCH_PROVIDER_CONTRACT.key, ["record", "document"]),
} as const;

export const INVENTORY_FINANCE_INTEGRATION_CONTRACTS = {
  adjustmentPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product", "cost_center"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.adjustment.documentType,
  }),
  movementPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.movement.documentType,
  }),
  openingBalancePostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.openingBalance.documentType,
  }),
  transferPostingReadiness: createFinancePostingReadinessContract({
    requiredDefinitions: ["finance_accounts", "finance_journals", "finance_fiscal_periods", "finance_dimensions"],
    requiredDimensions: ["company", "branch", "warehouse", "product"],
    sourceApp: "inventory",
    sourceDocumentType: INVENTORY_DOCUMENT_CONTRACTS.transfer.documentType,
  }),
} as const;

export const INVENTORY_EVENT_DEFINITIONS = [
  "InventoryProductCreated",
  "InventoryStockMovementCreated",
  "InventoryStockTransferRequested",
  "InventoryStockTransferCompleted",
  "InventoryStockAdjustmentCreated",
  "InventoryOpeningBalanceImported",
  "InventoryLotCreated",
  "InventorySerialNumberCreated",
  "InventoryReorderRuleTriggered",
].map((name) =>
  definePlatformEventDefinition({
    category: "document",
    description: `${name} event contract prepared for the Inventory Foundation. No runtime handler is registered.`,
    kind: "domain",
    name: definePlatformEventName(name),
    source: "business-app",
    version: 1,
  })
);

export const INVENTORY_AUDIT_ACTIONS = {
  definitionChanged: defineAuditAction("inventory.definition.changed"),
  openingBalanceImported: defineAuditAction("inventory.opening-balance.imported"),
  stockMovementCreated: defineAuditAction("inventory.stock-movement.created"),
} as const;

export const INVENTORY_JOB_READINESS_CONTRACTS = [
  createJobReadinessContract("search-indexing", "inventory.foundation.search-index"),
  createJobReadinessContract("report-generation", "inventory.foundation.report"),
  createJobReadinessContract("print-generation", "inventory.foundation.print"),
  createCostJobReadinessContract("snapshot", INVENTORY_COST_DEFINITION_CONTRACT.key),
  createCostJobReadinessContract("recalculation", INVENTORY_COST_DEFINITION_CONTRACT.key),
  createImportJobReadinessContract(INVENTORY_PRODUCT_IMPORT_CONTRACT),
  createImportJobReadinessContract(INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT),
  createExportJobReadinessContract(INVENTORY_EXPORT_CONTRACT),
];

export const INVENTORY_IMPORT_EXPORT_INTEGRATION_CONTRACTS = {
  exportDashboard: createExportDashboardIntegrationContract(
    INVENTORY_DASHBOARD_TEMPLATE_CONTRACT.key,
    INVENTORY_EXPORT_CONTRACT.key,
  ),
  exportReport: createExportReportIntegrationContract(
    INVENTORY_REPORT_READINESS_CONTRACT.key,
    INVENTORY_EXPORT_CONTRACT.key,
  ),
  exportSearch: createExportSearchIntegrationContract(INVENTORY_EXPORT_CONTRACT.key, {
    resultTypes: ["record", "document"],
    searchProviderKey: INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
  }),
  productImportSearchIndexing: createImportSearchIndexingContract(
    INVENTORY_PRODUCT_IMPORT_CONTRACT.key,
    INVENTORY_SEARCH_PROVIDER_CONTRACT.key,
  ),
};

export const INVENTORY_FOUNDATION_CONTRACTS = {
  appManifest: inventoryAppManifest,
  auditActions: INVENTORY_AUDIT_ACTIONS,
  costDefinition: INVENTORY_COST_DEFINITION_CONTRACT,
  costIntegrations: INVENTORY_COST_INTEGRATION_CONTRACTS,
  dashboardTemplate: INVENTORY_DASHBOARD_TEMPLATE_CONTRACT,
  dashboardWidget: INVENTORY_DASHBOARD_WIDGET_CONTRACT,
  documentContracts: INVENTORY_DOCUMENT_CONTRACTS,
  documentTypes: INVENTORY_DOCUMENT_TYPE_DEFINITIONS,
  eventDefinitions: INVENTORY_EVENT_DEFINITIONS,
  export: INVENTORY_EXPORT_CONTRACT,
  financeIntegrations: INVENTORY_FINANCE_INTEGRATION_CONTRACTS,
  imports: [INVENTORY_PRODUCT_IMPORT_CONTRACT, INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT],
  importExportIntegrations: INVENTORY_IMPORT_EXPORT_INTEGRATION_CONTRACTS,
  jobReadiness: INVENTORY_JOB_READINESS_CONTRACTS,
  moduleManifest: inventoryModuleManifest,
  permissions: INVENTORY_PERMISSION_LIST,
  print: INVENTORY_PRINT_READINESS_CONTRACT,
  report: INVENTORY_REPORT_READINESS_CONTRACT,
  reportDataset: INVENTORY_REPORT_DATASET_CONTRACT,
  search: INVENTORY_SEARCH_PROVIDER_CONTRACT,
} as const;

export type {
  CursorPage,
  InventoryEventDefinitionRecord,
  InventoryEventRouteRecord,
  InventoryIntegrationEndpointRecord,
  InventoryIntegrationMessageRecord,
  InventoryListQuery,
  PostStockInput,
  ReverseStockPostingInput,
  StockBalanceRecord,
  StockLedgerDirection,
  StockLedgerEntryRecord,
  StockMovementTypeKey,
  StockPostingBatchRecord,
  StockPostingLineInput,
} from "./application/types";
export type {
  InventoryTransactionDetail,
  InventoryTransactionType,
} from "./application/types/inventory-transactions";
