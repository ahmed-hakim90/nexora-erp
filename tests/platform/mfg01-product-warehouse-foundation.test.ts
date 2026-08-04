import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { inventoryProductMutationSchema } from "@/features/inventory/public-api";
import {
  assertManufacturingProductRules,
  MANUFACTURING_ITEM_ROLE_VALUES,
  MANUFACTURING_RESOURCE_DEFINITIONS,
  MANUFACTURING_WAREHOUSE_ROLE_MAP,
  isManufacturingItemRole,
} from "@/features/manufacturing/public-api";
import { ApplicationError } from "@/core/errors";

const root = process.cwd();
const opsDoc = path.join(root, "docs/02-business-apps/MFG_OPS_FROM_PRODUCTION_LINE.md");
const migrationPath = path.join(root, "supabase/migrations/20260804120000_mfg01_manufacturing_product_inventory_link.sql");

const baseInventoryProduct = {
  baseUomId: "uom-1",
  categoryId: "cat-1",
  name: "Injection Housing",
  onlineStatus: "draft",
  productKey: "housing-raw",
  productKind: "stockable",
  reservationPolicy: "soft",
  sku: "RAW-HOUSING-001",
  status: "active",
  trackingMode: "quantity_only",
};

test("MFG-00 ops rebuild doc exists and forbids code transfer", () => {
  const content = fs.readFileSync(opsDoc, "utf8");
  assert.match(content, /no code transfer/i);
  assert.match(content, /MFG-01/);
  assert.match(content, /raw_material/);
  assert.match(content, /production_buffer/);
});

test("MFG-01 migration hardens inventory product uniqueness and FK", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /manufacturing_products_inventory_product_uq/);
  assert.match(sql, /manufacturing_products_inventory_product_id_fkey/);
  assert.match(sql, /inventory_products\(id\)/);
});

test("MFG-01 manufacturing product form requires inventory link", () => {
  const definition = MANUFACTURING_RESOURCE_DEFINITIONS["manufacturing-products"];
  const inventoryField = definition.formFields.find((field) => field.name === "inventoryProductId");
  assert.ok(inventoryField);
  assert.equal(inventoryField?.isRequired, true);
  assert.ok(definition.columns.some((column) => column.field === "inventoryProductId"));
});

test("MFG-01 active manufacturing products require inventoryProductId", () => {
  assert.throws(
    () => assertManufacturingProductRules({ name: "Widget", status: "active" }),
    (error: unknown) => error instanceof ApplicationError && error.message.includes("inventory product"),
  );

  assert.doesNotThrow(() => assertManufacturingProductRules({
    inventoryProductId: "inv-1",
    name: "Widget",
    status: "active",
  }));

  assert.doesNotThrow(() => assertManufacturingProductRules({
    name: "Draft Widget",
    status: "draft",
  }));
});

test("MFG-01 manufacturable inventory products require manufacturing role", () => {
  assert.equal(
    inventoryProductMutationSchema.safeParse({
      ...baseInventoryProduct,
      isManufacturable: true,
    }).success,
    false,
  );

  assert.equal(
    inventoryProductMutationSchema.safeParse({
      ...baseInventoryProduct,
      isManufacturable: true,
      productTypeKey: "finished_good",
    }).success,
    true,
  );

  assert.equal(
    inventoryProductMutationSchema.safeParse({
      ...baseInventoryProduct,
      isManufacturable: true,
      productTypeKey: "not-a-role",
    }).success,
    false,
  );
});

test("MFG-01 manufacturing item roles and warehouse floor map are stable", () => {
  for (const role of MANUFACTURING_ITEM_ROLE_VALUES) {
    assert.equal(isManufacturingItemRole(role), true);
  }
  assert.equal(isManufacturingItemRole("kit"), false);
  assert.equal(MANUFACTURING_WAREHOUSE_ROLE_MAP.production_floor.warehouseType, "production_buffer");
  assert.equal(MANUFACTURING_WAREHOUSE_ROLE_MAP.raw_materials.warehouseType, "raw_materials");
  assert.equal(MANUFACTURING_WAREHOUSE_ROLE_MAP.finished_goods.warehouseType, "finished_goods");
  assert.equal(MANUFACTURING_WAREHOUSE_ROLE_MAP.scrap.warehouseType, "scrap");
});
