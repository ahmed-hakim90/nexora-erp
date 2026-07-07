import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildInventoryFoundationMutationSchema,
  defineInventoryLocation,
  defineInventoryWarehouse,
  getInventoryFoundationEntity,
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_PERMISSIONS,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630164000_inventory_warehouse_location_architecture.sql");

test("warehouse contracts model business warehouses with company and branch scope", () => {
  const warehouse = defineInventoryWarehouse({
    branchId: "cairo-branch",
    companyId: "company-1",
    costCenterId: "cc-warehouse",
    defaultReceivingLocationKey: "recv-01",
    defaultReturnsLocationKey: "ret-01",
    defaultShippingLocationKey: "ship-01",
    managerId: "user-1",
    name: "Main Warehouse — Cairo",
    operationalPolicies: { receivingWindow: "business-hours" },
    status: "active",
    tenantId: "tenant-1",
    warehouseKey: "main-cairo",
    warehouseType: "main",
  });

  assert.equal(warehouse.companyId, "company-1");
  assert.equal(warehouse.branchId, "cairo-branch");
  assert.equal(warehouse.warehouseType, "main");
  assert.equal(warehouse.defaultReceivingLocationKey, "recv-01");
});

test("location contracts model hierarchical barcode-ready storage points", () => {
  const location = defineInventoryLocation({
    allowedInventoryStatuses: ["available", "qc_hold"],
    allowedProductCategories: ["finished-goods"],
    barcode: "FG-A-01-B-03",
    branchId: "cairo-branch",
    capacityMetadata: { maxPallets: 12 },
    companyId: "company-1",
    locationKey: "fg-a-01-b-03",
    locationKind: "bin",
    name: "FG-A-01-B-03",
    parentLocationKey: "fg-a-01-b",
    pickable: true,
    qcRequired: false,
    receivable: false,
    shippable: false,
    status: "active",
    tenantId: "tenant-1",
    warehouseKey: "main-cairo",
  });

  assert.equal(location.warehouseKey, "main-cairo");
  assert.equal(location.parentLocationKey, "fg-a-01-b");
  assert.equal(location.barcode, "FG-A-01-B-03");
  assert.equal(location.pickable, true);
});

test("warehouse and location type validation covers enterprise type sets", () => {
  const warehouseSchema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("warehouses"));
  const locationSchema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("locations"));

  assert.equal(warehouseSchema.safeParse({
    branchId: "branch-1",
    name: "Finished Goods Warehouse",
    status: "active",
    warehouseKey: "fg-cairo",
    warehouseType: "finished_goods",
  }).success, true);
  assert.equal(warehouseSchema.safeParse({
    branchId: "branch-1",
    name: "Legacy Virtual Warehouse",
    status: "active",
    warehouseKey: "virtual",
    warehouseType: "virtual",
  }).success, false);

  assert.equal(locationSchema.safeParse({
    barcode: "RCV-01",
    locationKey: "rcv-01",
    locationKind: "receiving",
    name: "Receiving Dock 01",
    receivable: "true",
    status: "active",
    warehouseId: "warehouse-1",
  }).success, true);
  assert.equal(locationSchema.safeParse({
    barcode: "WH-01",
    locationKey: "wh-01",
    locationKind: "warehouse",
    name: "Warehouse Node",
    status: "active",
    warehouseId: "warehouse-1",
  }).success, false);
});

test("location validation enforces barcode readiness and default operational flags", () => {
  const schema = buildInventoryFoundationMutationSchema(getInventoryFoundationEntity("locations"));

  assert.equal(schema.safeParse({
    locationKey: "missing-barcode",
    locationKind: "bin",
    name: "Missing Barcode",
    status: "active",
    warehouseId: "warehouse-1",
  }).success, false);

  assert.equal(schema.safeParse({
    barcode: "SHIP-01",
    locationKey: "ship-01",
    locationKind: "shipping",
    name: "Shipping Dock 01",
    status: "active",
    warehouseId: "warehouse-1",
  }).success, false);
});

test("warehouse location migration adds architecture fields without quantity leakage", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const column of [
    "manager_id",
    "cost_center_id",
    "default_receiving_location_id",
    "default_shipping_location_id",
    "default_qc_location_id",
    "default_returns_location_id",
    "operational_policies",
    "barcode",
    "capacity_metadata",
    "allowed_product_categories",
    "allowed_inventory_statuses",
    "pickable",
    "receivable",
    "shippable",
    "qc_required",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`));
  }

  assert.match(sql, /inventory parent location must belong to the same warehouse hierarchy/);
  assert.match(sql, /inventory warehouse default locations must belong to the same warehouse/);
  assert.match(sql, /inventory_locations_scope_barcode_uq/);
  assert.match(sql, /No stock movements, ledger, handling units/);
  assert.doesNotMatch(sql, /quantity_on_hand|quantity_reserved|stock_balance|stock_movement|handling_unit|pick_task|pack_task/i);
});

test("warehouse location platform readiness contracts are registered", () => {
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.warehouseLocationArchitecture.key, INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT.key);
  assert.deepEqual(INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT.appIntegrations, ["app-registry", "search", "reporting", "print", "dashboard", "import-export"]);
  assert.equal(INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT.quantityFieldsAllowed, false);
  assert.equal(INVENTORY_WAREHOUSE_LOCATION_ARCHITECTURE_CONTRACT.implementsWarehouseExecution, false);
  assert.equal(INVENTORY_PERMISSIONS.warehousesManage, "inventory.warehouses.manage");
  assert.equal(INVENTORY_PERMISSIONS.locationsManage, "inventory.locations.manage");

  const locationSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_location");
  assert.deepEqual(locationSearch?.quickSearchFields, ["warehouseKey", "locationKey", "name", "barcode", "locationKind"]);
  assert.equal(locationSearch?.indexPolicy?.refresh, "event-driven");
});
