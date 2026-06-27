import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createInventoryCostIntegrationContract,
  createInventoryDocumentContract,
  defineInventoryLocation,
  defineInventoryProduct,
  defineInventoryProductVariant,
  defineInventoryUom,
  defineInventoryWarehouse,
  INVENTORY_APP_KEY,
  inventoryAppManifest,
  INVENTORY_COST_DEFINITION_CONTRACT,
  INVENTORY_COST_INTEGRATION_CONTRACTS,
  INVENTORY_DOCUMENT_CONTRACTS,
  INVENTORY_DOCUMENT_TYPE_DEFINITIONS,
  INVENTORY_EVENT_DEFINITIONS,
  INVENTORY_EXPORT_CONTRACT,
  INVENTORY_FINANCE_INTEGRATION_CONTRACTS,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT,
  INVENTORY_PERMISSIONS,
  INVENTORY_PRODUCT_IMPORT_CONTRACT,
  INVENTORY_REPORT_READINESS_CONTRACT,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  inventoryModuleManifest,
  type InventoryStockBalanceContract,
} from "@/features/inventory/public-api";
import { financeAppManifest } from "@/features/finance/public-api";
import {
  defineAppManifest,
  validateAppManifest,
  type AppManifest,
} from "@/platform/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260627124000_inventory_foundation.sql");

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

test("inventory foundation registers app and module manifests", () => {
  assert.equal(String(INVENTORY_APP_KEY), "inventory");
  assert.equal(inventoryModuleManifest.key, "inventory");
  assert.equal(inventoryModuleManifest.name, "Inventory Foundation");
  assert.equal(inventoryAppManifest.key, "inventory");
  assert.equal(inventoryAppManifest.name, "Inventory Foundation");
  assert.equal(inventoryAppManifest.sensitiveData, "sensitive");
  assert.deepEqual(validateAppManifest(inventoryAppManifest, [platformManifest, financeAppManifest, inventoryAppManifest]), {
    errors: [],
    valid: true,
  });

  assert.equal(inventoryAppManifest.dependencies.some((dependency) => dependency.appKey === "finance"), true);
  assert.equal(inventoryAppManifest.quickActions.length, 0);
  assert.equal(inventoryAppManifest.commands.some((command) => command.key.includes("manufacturing")), false);
});

test("inventory product, variant, UOM, warehouse, and location contracts preserve scope", () => {
  const scope = { branchId: "branch-1", companyId: "company-1", tenantId: "tenant-1" };
  const uom = defineInventoryUom({
    ...scope,
    categoryKey: "quantity",
    conversionFactorToBase: 1,
    isBaseUom: true,
    name: "Each",
    precision: 0,
    status: "active",
    symbol: "ea",
    uomKey: "each",
  });
  const product = defineInventoryProduct({
    ...scope,
    baseUomKey: uom.uomKey,
    categoryKey: "raw-materials",
    costObjectKey: "inventory-product",
    financeDimensionKey: "inventory-product",
    name: "Steel Sheet",
    productKey: "steel-sheet",
    productKind: "stockable",
    reservationPolicy: "soft",
    sku: "STL-001",
    status: "active",
    trackingMode: "lot",
  });
  const variant = defineInventoryProductVariant({
    ...scope,
    attributes: { thicknessMm: 2 },
    name: "Steel Sheet 2mm",
    productKey: product.productKey,
    sku: "STL-001-2MM",
    status: "active",
    trackingMode: "lot",
    variantKey: "2mm",
  });
  const warehouse = defineInventoryWarehouse({
    ...scope,
    defaultLocationKey: "main-bin",
    name: "Main Warehouse",
    status: "active",
    warehouseKey: "main",
    warehouseType: "main",
  });
  const location = defineInventoryLocation({
    ...scope,
    locationKey: "main-bin",
    locationKind: "bin",
    name: "Main Bin",
    reservable: true,
    status: "active",
    warehouseKey: warehouse.warehouseKey,
  });

  assert.equal(product.tenantId, variant.tenantId);
  assert.equal(product.companyId, variant.companyId);
  assert.equal(product.branchId, variant.branchId);
  assert.equal(product.baseUomKey, "each");
  assert.equal(location.warehouseKey, "main");
});

test("inventory document contracts cover movement, transfer, adjustment, and opening balances only", () => {
  const custom = createInventoryDocumentContract("transfer", INVENTORY_PERMISSIONS.transfersRequest);

  assert.deepEqual(Object.keys(INVENTORY_DOCUMENT_CONTRACTS).sort(), ["adjustment", "movement", "openingBalance", "transfer"]);
  assert.equal(custom.usesDocumentEngine, true);
  assert.equal(custom.usesEventBus, true);
  assert.equal(custom.ownsStockQuantityEffects, true);
  assert.equal(custom.costEngineContractOnly, true);
  assert.equal(custom.financePostingReadinessOnly, true);
  assert.equal(custom.implementsManufacturing, false);
  assert.equal(custom.implementsSales, false);
  assert.equal(custom.implementsPurchasing, false);
  assert.equal(custom.implementsValuation, false);
  assert.equal(custom.implementsAccountingPosting, false);
  assert.equal(INVENTORY_DOCUMENT_TYPE_DEFINITIONS.length, 3);
});

test("lot, serial, stock balance, and reorder rule contracts keep inventory quantity ownership", () => {
  const balance: InventoryStockBalanceContract = {
    branchId: "branch-1",
    companyId: "company-1",
    costFieldsOwnedByCostEngine: true,
    locationKey: "main-bin",
    productKey: "steel-sheet",
    quantityAvailable: 8,
    quantityOnHand: 10,
    quantityReserved: 2,
    source: "inventory-owned",
    tenantId: "tenant-1",
    uomKey: "each",
    warehouseKey: "main",
  };

  assert.equal(balance.quantityAvailable, balance.quantityOnHand - balance.quantityReserved);
  assert.equal(balance.costFieldsOwnedByCostEngine, true);
  assert.equal(INVENTORY_PERMISSIONS.lotsManage, "inventory.lots.manage");
  assert.equal(INVENTORY_PERMISSIONS.serialsManage, "inventory.serials.manage");
  assert.equal(INVENTORY_PERMISSIONS.reorderRulesManage, "inventory.reorder-rules.manage");
});

test("platform readiness contracts cover search, report, print, dashboard, and import/export", () => {
  assert.deepEqual(INVENTORY_SEARCH_PROVIDER_CONTRACT.entityTypes, [
    "inventory_product",
    "inventory_product_variant",
    "inventory_product_category",
    "inventory_uom",
    "inventory_warehouse",
    "inventory_location",
    "inventory_lot",
    "inventory_serial_number",
  ]);
  assert.equal(INVENTORY_REPORT_READINESS_CONTRACT.mode, "async");
  assert.equal(INVENTORY_PRODUCT_IMPORT_CONTRACT.previewRequired, true);
  assert.equal(INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT.metadata?.documentContract, "inventory.opening-balance");
  assert.deepEqual(INVENTORY_EXPORT_CONTRACT.supportedFormats, ["csv", "excel", "json"]);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.jobReadiness.length, 8);
});

test("cost and finance integration contracts are readiness-only", () => {
  const cost = createInventoryCostIntegrationContract({
    costObjectTypes: ["product", "variant", "batch", "inventory_item", "warehouse"],
    sourceDocumentTypes: ["inventory.movement"],
    sourceEventNames: ["InventoryStockMovementCreated"],
  });

  assert.equal(cost.sendsQuantityFactsOnly, true);
  assert.equal(cost.ownsCostFacts, false);
  assert.equal(cost.ownsCostLayers, false);
  assert.equal(cost.ownsCostSnapshots, false);
  assert.equal(cost.calculatesValuation, false);
  assert.equal(INVENTORY_COST_DEFINITION_CONTRACT.metadata?.calculatesValuation, false);
  assert.equal(INVENTORY_COST_INTEGRATION_CONTRACTS.quantityFacts.ownsCostFacts, false);

  for (const readiness of Object.values(INVENTORY_FINANCE_INTEGRATION_CONTRACTS)) {
    assert.equal(readiness.usesDocumentEngine, true);
    assert.equal(readiness.usesEventBus, true);
    assert.equal(readiness.usesCostEngineContractsOnly, true);
    assert.equal(readiness.journalEntryPostingSupported, false);
    assert.equal(readiness.invoiceWorkflowSupported, false);
    assert.equal(readiness.paymentExecutionSupported, false);
  }
});

test("inventory events are prepared without runtime handlers", () => {
  assert.deepEqual(INVENTORY_EVENT_DEFINITIONS.map((event) => String(event.name)), [
    "InventoryProductCreated",
    "InventoryStockMovementCreated",
    "InventoryStockTransferRequested",
    "InventoryStockTransferCompleted",
    "InventoryStockAdjustmentCreated",
    "InventoryOpeningBalanceImported",
    "InventoryLotCreated",
    "InventorySerialNumberCreated",
    "InventoryReorderRuleTriggered",
  ]);
  assert.equal(INVENTORY_EVENT_DEFINITIONS.every((event) => event.source === "business-app"), true);
});

test("inventory migration creates requested tables with tenant, company, branch, lifecycle, RLS, and indexes", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const tables = [
    "inventory_products",
    "inventory_product_variants",
    "inventory_product_categories",
    "inventory_uom_categories",
    "inventory_uoms",
    "inventory_warehouses",
    "inventory_locations",
    "inventory_lots",
    "inventory_serial_numbers",
    "inventory_movement_types",
    "inventory_stock_movements",
    "inventory_stock_balances",
    "inventory_reorder_rules",
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`public\\.is_tenant_member\\(tenant_id\\)`));

    const definition = sql.match(new RegExp(`create table public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0] ?? "";
    assert.match(definition, /tenant_id uuid not null references public\.tenants\(id\)/);
    assert.match(definition, /company_id uuid not null references public\.companies\(id\)/);
    assert.match(definition, /branch_id uuid/);
    assert.match(definition, /created_at timestamptz not null default now\(\)/);
    assert.match(definition, /updated_at timestamptz not null default now\(\)/);
    assert.match(definition, /deleted_at timestamptz/);
    assert.match(definition, /is_active boolean not null default true/);
    assert.match(definition, /version integer not null default 1 check \(version > 0\)/);
  }

  for (const indexName of [
    "inventory_products_scope_key_uq",
    "inventory_stock_movements_product_date_idx",
    "inventory_stock_balances_key_uq",
    "inventory_reorder_rules_scope_key_uq",
  ]) {
    assert.match(sql, new RegExp(`create (unique )?index ${indexName}`));
  }
});

test("inventory migration encodes scope rules, stock balance rules, and permissions", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.enforce_inventory_foundation_scope\(\)/);
  assert.match(sql, /inventory variant product scope must match variant scope/);
  assert.match(sql, /inventory location warehouse scope must match location scope/);
  assert.match(sql, /quantity_available numeric\(18, 6\) generated always as \(quantity_on_hand - quantity_reserved\) stored/);
  assert.match(sql, /quantity_reserved numeric\(18, 6\) not null default 0/);
  assert.match(sql, /reservation_ready boolean not null default true/);
  assert.match(sql, /creates_demand_document boolean not null default false check \(creates_demand_document = false\)/);

  for (const permission of [
    "inventory.products.view",
    "inventory.products.manage",
    "inventory.uoms.view",
    "inventory.warehouses.view",
    "inventory.locations.view",
    "inventory.lots.view",
    "inventory.serials.view",
    "inventory.movements.view",
    "inventory.transfers.request",
    "inventory.adjustments.create",
    "inventory.opening-balances.import",
    "inventory.reorder-rules.manage",
    "inventory.cost-integration.view",
    "inventory.finance-integration.view",
    "inventory.import-export.manage",
    "inventory.audit.view",
  ]) {
    assert.match(sql, new RegExp(permission.replaceAll(".", "\\.")));
  }
});

test("inventory foundation has no manufacturing, sales, purchasing, valuation, or posting leakage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const forbiddenPatterns = [
    /create table public\.manufacturing/i,
    /create table public\.[a-z_]*sales/i,
    /create table public\.[a-z_]*purchas/i,
    /create table public\.[a-z_]*account/i,
    /create table public\.[a-z_]*(cost_layers|cost_facts|cost_snapshots)/i,
    /create or replace function public\.[a-z_]*(valuation|post_accounting|post_journal|manufactur|sales|purchas)/i,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(sql, pattern);
  }

  assert.match(sql, /valuation_implemented boolean not null default false check \(valuation_implemented = false\)/);
  assert.match(sql, /accounting_posting_implemented boolean not null default false check \(accounting_posting_implemented = false\)/);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.appManifest.key, "inventory");
});
