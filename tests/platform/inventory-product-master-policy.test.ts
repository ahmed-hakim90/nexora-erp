import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  INVENTORY_FOUNDATION_CONTRACTS,
  INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT,
  INVENTORY_SEARCH_PROVIDER_CONTRACT,
  inventoryAppManifest,
  inventoryProductMutationSchema,
} from "@/features/inventory/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260630160000_inventory_product_master_tracking_policy.sql");

const validProduct = {
  baseUomId: "uom-1",
  categoryId: "cat-1",
  name: "Air Fryer Internal",
  onlineStatus: "draft",
  productKey: "air-fryer",
  productKind: "stockable",
  reservationPolicy: "soft",
  sku: "AF-001",
  status: "active",
  trackingMode: "quantity_only",
};

test("tracking policy validation supports exactly one active policy", () => {
  for (const trackingMode of ["none", "quantity_only", "lot", "serial", "lot_serial"]) {
    const input = trackingMode === "serial" || trackingMode === "lot_serial"
      ? { ...validProduct, serialGenerationTiming: "on_receipt", serialSource: "nexora_generated", trackingMode }
      : { ...validProduct, trackingMode };
    assert.equal(inventoryProductMutationSchema.safeParse(input).success, true, `${trackingMode} should be valid`);
  }

  assert.equal(inventoryProductMutationSchema.safeParse({ ...validProduct, trackingMode: "serial" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...validProduct, trackingMode: "lot_serial", serialSource: "manual" }).success, false);
});

test("serial policy validation is serial-only metadata", () => {
  assert.equal(inventoryProductMutationSchema.safeParse({
    ...validProduct,
    serialGenerationTiming: "on_packing",
    serialSource: "supplier",
    trackingMode: "serial",
  }).success, true);

  assert.equal(inventoryProductMutationSchema.safeParse({
    ...validProduct,
    serialAllowManualOverride: "on",
    trackingMode: "quantity_only",
  }).success, false);
});

test("lot policy validation is lot-only metadata", () => {
  assert.equal(inventoryProductMutationSchema.safeParse({
    ...validProduct,
    lotExpirySupported: "on",
    lotQcRequired: "on",
    trackingMode: "lot",
  }).success, true);

  assert.equal(inventoryProductMutationSchema.safeParse({
    ...validProduct,
    lotSupplierSupported: "on",
    trackingMode: "quantity_only",
  }).success, false);
});

test("packaging policy validation enforces physical hierarchy", () => {
  assert.equal(inventoryProductMutationSchema.safeParse({
    ...validProduct,
    packagingInnerBoxQty: "6",
    packagingCartonQty: "30",
    packagingPalletCartonQty: "20",
  }).success, true);

  assert.equal(inventoryProductMutationSchema.safeParse({ ...validProduct, packagingCartonQty: "6" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...validProduct, packagingInnerBoxQty: "0" }).success, false);
});

test("inventory policy and warranty metadata validation are contracts only", () => {
  const parsed = inventoryProductMutationSchema.parse({
    ...validProduct,
    allowNegativeStock: "on",
    cycleCountClass: "A",
    defaultPickingStrategy: "FEFO",
    defaultPutawayStrategy: "nearest-bin",
    requiresQcBeforeRelease: "on",
    requiresReservation: "on",
    warrantyDurationDays: "365",
    warrantyEligible: "on",
    warrantyStartsFrom: "delivery_date",
  });

  assert.equal(parsed.allowNegativeStock, true);
  assert.equal(parsed.requiresReservation, true);
  assert.equal(parsed.warrantyStartsFrom, "delivery_date");
  assert.equal(inventoryProductMutationSchema.safeParse({ ...validProduct, warrantyEligible: "on" }).success, false);
});

test("product master search and app registrations are platform-ready", () => {
  assert.equal(inventoryAppManifest.routes.some((route) => route.path === "/erp/inventory/products"), true);
  assert.equal(inventoryAppManifest.commands.some((command) => command.key === "inventory.products.open"), true);
  assert.equal(INVENTORY_FOUNDATION_CONTRACTS.productMasterPolicy.key, INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT.key);
  assert.deepEqual(INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT.appIntegrations, ["app-registry", "search", "print", "reporting", "dashboard"]);
  assert.deepEqual(INVENTORY_PRODUCT_MASTER_POLICY_CONTRACT.searchFields, ["sku", "barcode", "name", "commercialName", "searchKeywords"]);

  const productSearch = INVENTORY_SEARCH_PROVIDER_CONTRACT.searchableEntities?.find((entity) => entity.entityType === "inventory_product");
  assert.deepEqual(productSearch?.quickSearchFields, ["sku", "barcode", "name", "commercialName", "searchKeywords"]);
  assert.equal(productSearch?.indexPolicy?.refresh, "event-driven");
});

test("product master tracking migration is additive and runtime-free", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const column of [
    "commercial_name",
    "serial_source",
    "serial_generation_timing",
    "lot_expiry_supported",
    "packaging_inner_box_qty",
    "allow_negative_stock",
    "requires_reservation",
    "default_putaway_strategy",
    "cycle_count_class",
    "warranty_eligible",
    "search_keywords",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`));
  }

  for (const phrase of [
    "inventory_products_tracking_mode_check",
    "inventory_products_serial_policy_chk",
    "inventory_products_lot_policy_chk",
    "inventory_products_packaging_policy_chk",
    "inventory_products_inventory_policy_chk",
    "inventory_products_warranty_metadata_chk",
  ]) {
    assert.match(sql, new RegExp(phrase));
  }

  assert.doesNotMatch(sql, /create table public\.[a-z_]*(purchase|sales|manufacturing|ledger|warehouse_operation|warranty_claim|cost)/i);
  assert.match(sql, /No purchasing, sales, manufacturing, costing, warranty engine/);
});
