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
  INVENTORY_FOUNDATION_ENTITIES,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_FOUNDATION_RESOURCE_KEYS,
  INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT,
  INVENTORY_PERMISSIONS,
  INVENTORY_PRODUCT_IMPORT_CONTRACT,
  INVENTORY_QUANTITY_MODEL_CONTRACT,
  INVENTORY_REPORT_READINESS_CONTRACT,
  INVENTORY_RESERVATION_ENGINE_CONTRACT,
  INVENTORY_RESERVATION_LIFECYCLE_CONTRACT,
  INVENTORY_RESERVATION_PLATFORM_INTEGRATION_CONTRACT,
  INVENTORY_RESERVATION_TYPES,
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
const stabilizationMigrationPath = path.join(root, "supabase/migrations/20260628101500_stabilize_current_app_models.sql");

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
  assert.deepEqual(
    INVENTORY_FOUNDATION_RESOURCE_KEYS.map((key) => `/erp/inventory/${key}`).sort(),
    [
      "/erp/inventory/categories",
      "/erp/inventory/locations",
      "/erp/inventory/lots",
      "/erp/inventory/reorder-rules",
      "/erp/inventory/serials",
      "/erp/inventory/uom-categories",
      "/erp/inventory/uoms",
      "/erp/inventory/variants",
      "/erp/inventory/warehouses",
    ],
  );
  for (const descriptor of Object.values(INVENTORY_FOUNDATION_ENTITIES)) {
    assert.equal(inventoryAppManifest.routes.some((route) => route.path === descriptor.basePath), true);
    assert.match(descriptor.table, /^inventory_/);
  }
  assert.equal(inventoryAppManifest.quickActions.length, 0);
  assert.equal(inventoryAppManifest.commands.some((command) => command.key.includes("manufacturing")), false);
});

test("inventory foundation auto-generates operational business codes", () => {
  const expected = {
    categories: ["categoryKey"],
    lots: ["lotKey"],
    "reorder-rules": ["ruleKey"],
    serials: ["serialKey"],
    "uom-categories": ["categoryKey"],
    uoms: ["uomKey"],
    variants: ["variantKey"],
    warehouses: ["warehouseKey"],
    locations: ["locationKey"],
  } as const;

  for (const [entityKey, fieldNames] of Object.entries(expected)) {
    const descriptor = INVENTORY_FOUNDATION_ENTITIES[entityKey as keyof typeof INVENTORY_FOUNDATION_ENTITIES];
    for (const fieldName of fieldNames) {
      const field = descriptor.fields.find((candidate) => candidate.name === fieldName);
      assert.ok(field?.autoCode, `${entityKey}.${fieldName} should be generated`);
      assert.equal(field.autoCode.displayCase ?? "upper", "upper");
    }
  }
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
    "inventory_reservation",
    "inventory_availability",
  ]);
  assert.equal(INVENTORY_REPORT_READINESS_CONTRACT.mode, "async");
  assert.equal(INVENTORY_PRODUCT_IMPORT_CONTRACT.previewRequired, true);
  assert.equal(INVENTORY_OPENING_BALANCE_IMPORT_CONTRACT.metadata?.documentContract, "inventory.opening-balance");
  assert.deepEqual(INVENTORY_EXPORT_CONTRACT.supportedFormats, ["csv", "excel", "json"]);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.jobReadiness.length, 11);
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
    "InventoryReservationRequested",
    "InventoryReservationCreated",
    "InventoryReservationApproved",
    "InventoryReservationReleased",
    "InventoryReservationConsumed",
    "InventoryReservationExpired",
    "InventoryReservationCancelled",
    "InventoryAvailabilityChanged",
    "InventoryTransferIssued",
    "InventoryTransferReceived",
  ]);
  assert.equal(INVENTORY_EVENT_DEFINITIONS.every((event) => event.source === "business-app"), true);
});

test("inventory reservation engine contracts define lifecycle, types, quantities, and platform readiness only", () => {
  assert.deepEqual(INVENTORY_RESERVATION_LIFECYCLE_CONTRACT.transferFlow, [
    "draft",
    "pending_approval",
    "approved",
    "reserved",
    "issued",
    "in_transit",
    "received",
    "completed",
  ]);
  assert.deepEqual(INVENTORY_RESERVATION_TYPES, [
    "soft_hold",
    "hard_reservation",
    "transfer_reservation",
    "manufacturing_reservation",
    "sales_reservation",
    "service_reservation",
    "rental_reservation",
    "project_reservation",
    "custom",
  ]);
  assert.equal(INVENTORY_QUANTITY_MODEL_CONTRACT.owner, "inventory-engine");
  assert.equal(INVENTORY_QUANTITY_MODEL_CONTRACT.availableStoredManually, false);
  assert.equal(INVENTORY_QUANTITY_MODEL_CONTRACT.availableFormula, "on_hand - reserved - pending_approval - outgoing - damaged - quarantine");
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.runtimeExecutionImplemented, false);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.implementsAccounting, false);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.implementsCosting, false);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.implementsWarehouseExecution, false);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.concurrencyStrategy.idempotencyRequired, true);
  assert.equal(INVENTORY_RESERVATION_ENGINE_CONTRACT.concurrencyStrategy.frontendValidationTrusted, false);
  assert.deepEqual(INVENTORY_RESERVATION_PLATFORM_INTEGRATION_CONTRACT.integrations, [
    "platform-events",
    "background-jobs",
    "audit",
    "notifications",
    "search",
    "reporting",
    "dashboard",
    "import-export",
    "workflow",
    "approvals",
  ]);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.reservationEngine.runtimeExecutionImplemented, false);
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

test("inventory stabilization locks canonical inventory runtime tables", () => {
  const decisionDoc = fs.readFileSync(path.join(root, "docs/CURRENT_APP_FOUNDATION_DECISIONS.md"), "utf8");
  const migration = fs.readFileSync(stabilizationMigrationPath, "utf8");
  const foundationRepository = fs.readFileSync(path.join(root, "src/features/inventory/infrastructure/repositories/inventory.repository.ts"), "utf8");
  const transactionRepository = fs.readFileSync(path.join(root, "src/features/inventory/infrastructure/repositories/inventory-transactions.repository.ts"), "utf8");
  const overviewLoader = fs.readFileSync(path.join(root, "src/features/inventory/routes/loaders/inventory-overview.loader.ts"), "utf8");
  const permissions = fs.readFileSync(path.join(root, "src/features/inventory/permissions/permission-registry.ts"), "utf8");

  assert.match(decisionDoc, /Canonical Inventory app\/runtime tables are the `inventory_\*` foundation tables/);
  for (const table of ["inventory_products", "inventory_warehouses", "inventory_locations", "inventory_uoms"]) {
    assert.match(migration, new RegExp(`references public\\.${table}\\(id\\)`));
    assert.match(foundationRepository, new RegExp(`\\.from\\("${table}"\\)`));
    assert.match(transactionRepository, new RegExp(`\\.from\\("${table}"\\)`));
  }

  assert.doesNotMatch(foundationRepository, /\.from\("products"\)|\.from\("warehouses"\)|\.from\("warehouse_locations"\)|\.from\("units"\)/);
  assert.doesNotMatch(transactionRepository, /\.from\("products"\)|\.from\("warehouses"\)|\.from\("warehouse_locations"\)|\.from\("units"\)/);
  assert.match(overviewLoader, /table: "stock_balances"/);
  assert.match(overviewLoader, /table: "stock_ledger_entries"/);
  assert.doesNotMatch(overviewLoader, /table: "inventory_stock_balances"|table: "inventory_stock_movements"/);
  assert.match(permissions, /inventory\.cycle-count\.view/);
  assert.match(migration, /inventory\.cycle-count\.post/);
});

test("inventory foundation CRUD routes and navigation use canonical app paths", () => {
  const shell = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/_components/inventory-shell.tsx"), "utf8");
  const resourceRoute = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/[transactionType]/page.tsx"), "utf8");
  const newRoute = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/[transactionType]/new/page.tsx"), "utf8");
  const detailRoute = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/[transactionType]/[id]/page.tsx"), "utf8");
  const editRoute = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/[transactionType]/[id]/edit/page.tsx"), "utf8");
  const foundationPage = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/_components/inventory-foundation-pages.tsx"), "utf8");
  const foundationModal = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/_components/inventory-foundation-modal.tsx"), "utf8");
  const transactionList = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/transactions/page.tsx"), "utf8");
  const transactionModal = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/_components/inventory-transaction-modal.tsx"), "utf8");
  const navigation = fs.readFileSync(path.join(root, "src/shared/workspace/erp-navigation.ts"), "utf8");
  const actions = fs.readFileSync(path.join(root, "src/features/inventory/routes/actions/inventory-foundation.actions.ts"), "utf8");
  const loader = fs.readFileSync(path.join(root, "src/features/inventory/routes/loaders/inventory-foundation.loader.ts"), "utf8");

  for (const key of INVENTORY_FOUNDATION_RESOURCE_KEYS) {
    assert.match(shell, new RegExp(`/erp/inventory/${key}`));
    assert.match(navigation, new RegExp(`/erp/inventory/${key}`));
  }

  assert.match(resourceRoute, /loadInventoryFoundationWorkspace/);
  assert.match(resourceRoute, /getInventoryFoundationRecord/);
  assert.match(newRoute, /redirect\(`\$\{descriptor\.basePath\}\?create=1`\)/);
  assert.match(detailRoute, /InventoryFoundationDetailPage/);
  assert.match(editRoute, /redirect\(`\$\{descriptor\.basePath\}\?edit=\$\{encodeURIComponent\(id\)\}`\)/);
  assert.match(foundationPage, /InventoryFoundationRecordModalLauncher/);
  assert.match(foundationModal, /RecordFormDialog/);
  assert.match(transactionList, /InventoryTransactionModalLauncher/);
  assert.match(transactionModal, /RecordFormDialog/);
  assert.match(actions, /created_by: context\.userId/);
  assert.match(actions, /deleted_by: context\.userId/);
  assert.match(loader, /selectColumns\(descriptor\)/);
  assert.doesNotMatch(navigation, /\/erp\/master-data\/product-categories|\/erp\/master-data\/units|\/erp\/master-data\/warehouses|\/erp\/master-data\/warehouse-locations/);
});
