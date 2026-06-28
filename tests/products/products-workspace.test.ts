import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { inventoryProductMutationSchema } from "@/features/inventory/public-api";
import {
  DEFAULT_PRODUCT_WORKSPACE_FILTERS,
  PRODUCT_WORKSPACE_COLUMNS,
  PRODUCT_WORKSPACE_TABS,
  PRODUCTS,
  createProductSearchProvider,
  filterProducts,
  getProductWorkspaceKpis,
  groupProducts,
  searchProductsWithPlatformContracts,
} from "@/features/products/workspace/products-workspace-model";

const root = process.cwd();
const productMasterMigrationPath = path.join(root, "supabase/migrations/20260628143000_inventory_product_master_upgrade.sql");

test("products workspace exposes the required enterprise tabs and columns", () => {
  for (const tab of [
    "Overview",
    "Variants",
    "Inventory",
    "Warehouses",
    "Locations",
    "Lots",
    "Serial Numbers",
    "Reorder Rules",
    "Attachments",
    "Timeline",
    "Audit",
    "Comments",
    "Relations",
  ]) {
    assert.ok(PRODUCT_WORKSPACE_TABS.includes(tab as never), `${tab} tab is missing`);
  }

  for (const column of [
    "image",
    "sku",
    "name",
    "category",
    "type",
    "uom",
    "tracking",
    "stock",
    "reserved",
    "available",
    "status",
    "updatedAt",
    "actions",
  ]) {
    assert.ok(PRODUCT_WORKSPACE_COLUMNS.includes(column as never), `${column} column is missing`);
  }
});

test("products workspace KPIs and filters cover active, low-stock, tracked, inactive, and variant views", () => {
  const kpis = getProductWorkspaceKpis(PRODUCTS);
  const labels = new Set(kpis.map((kpi) => kpi.label));

  assert.deepEqual(labels, new Set([
    "Total Products",
    "Active Products",
    "Low Stock",
    "Tracked Products",
    "Inactive Products",
    "Variants",
  ]));

  const lowStock = filterProducts(PRODUCTS, {
    ...DEFAULT_PRODUCT_WORKSPACE_FILTERS,
    sort: "available",
    status: "active",
  }).filter((product) => product.available <= 25 && product.type !== "service");

  assert.ok(lowStock.some((product) => product.sku === "SP-HYD-PUMP"));
});

test("products workspace supports grouping without exposing raw UUIDs", () => {
  const groups = groupProducts(PRODUCTS, "category");
  assert.ok(groups.length >= 3);
  assert.ok(groups.some((group) => group.label === "Finished Goods"));

  for (const product of PRODUCTS) {
    assert.doesNotMatch(product.key, /^[0-9a-f]{8}-[0-9a-f]{4}/i);
    assert.doesNotMatch(product.sku, /^[0-9a-f]{8}-[0-9a-f]{4}/i);
  }
});

test("products workspace search is backed by Platform Search contracts", async () => {
  const provider = createProductSearchProvider();

  assert.equal(provider.key, "inventory.products.workspace");
  assert.equal(provider.source, "app");
  assert.equal(provider.searchableEntities?.[0]?.indexPolicy?.refresh, "event-driven");
  assert.equal(provider.permissionPolicy?.hideWhenUnauthorized, true);

  const results = await searchProductsWithPlatformContracts("pump");
  assert.ok(results.some((result) => result.title === "Hydraulic Pump Assembly"));
});

test("inventory products route uses the Supabase-backed inventory workspace and sidebar path", () => {
  const route = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/products/page.tsx"),
    "utf8",
  );
  const panel = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/products/product-record-panel.tsx"),
    "utf8",
  );
  const createRoute = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/products/new/page.tsx"),
    "utf8",
  );
  const editRoute = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/products/[id]/edit/page.tsx"),
    "utf8",
  );
  const navigation = fs.readFileSync(
    path.join(root, "src/shared/workspace/erp-navigation.ts"),
    "utf8",
  );
  const inventoryShell = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/_components/inventory-shell.tsx"),
    "utf8",
  );

  assert.match(route, /loadInventoryProductsWorkspace/);
  assert.match(panel, /createInventoryProductAction/);
  assert.match(panel, /updateInventoryProductAction/);
  assert.match(panel, /archiveInventoryProductAction/);
  assert.match(route, /ProductRecordModalLauncher/);
  assert.match(route, /buildHref\(params, \{ create: "1", edit: null \}\)/);
  assert.match(panel, /closeHref/);
  assert.match(createRoute, /\/erp\/inventory\/products\?create=1/);
  assert.match(editRoute, /\/erp\/inventory\/products\?edit=\$\{encodeURIComponent\(id\)\}/);
  assert.match(route, /InventoryShell/);
  assert.match(inventoryShell, /Apps/);
  assert.match(inventoryShell, /Inventory/);
  assert.match(navigation, /\/erp\/inventory\/products/);
  assert.doesNotMatch(route, /from "\.\/products-workspace"|<ProductsWorkspace|PRODUCTS,|Stock valuation|Accounting posting|Purchase order|Sales order/);
});

test("inventory product master migration adds rich canonical columns and child tables", () => {
  const sql = fs.readFileSync(productMasterMigrationPath, "utf8");

  for (const column of [
    "name_ar",
    "short_name",
    "internal_notes",
    "barcode",
    "category_id",
    "subcategory_id",
    "supplier_party_id",
    "purchase_uom_id",
    "sales_uom_id",
    "default_warehouse_id",
    "default_location_id",
    "opening_balance_qty",
    "minimum_stock_qty",
    "maximum_stock_qty",
    "reorder_point_qty",
    "purchase_price",
    "retail_price",
    "wholesale_price",
    "online_price",
    "online_enabled",
    "online_status",
    "online_slug",
    "online_features",
    "online_specifications",
    "online_package_contents",
    "seo_keywords",
    "cover_image_url",
    "gallery_urls",
    "video_urls",
    "manual_urls",
    "is_stockable",
    "is_sellable",
    "is_purchasable",
    "has_variants",
    "has_serial_tracking",
    "has_lot_tracking",
    "archived_at",
    "archived_by",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`), `${column} column is missing`);
  }

  for (const table of [
    "inventory_product_units",
    "inventory_product_prices",
    "inventory_product_media",
    "inventory_product_online_attributes",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`${table}.*inventory\\.products\\.view`, "s"));
    assert.match(sql, new RegExp(`${table}.*inventory\\.products\\.manage`, "s"));
  }

  for (const indexName of [
    "inventory_products_scope_barcode_uq",
    "inventory_products_scope_online_slug_uq",
    "inventory_products_sku_idx",
    "inventory_products_barcode_idx",
    "inventory_products_category_master_idx",
    "inventory_products_online_slug_idx",
    "inventory_products_status_idx",
  ]) {
    assert.match(sql, new RegExp(`create (unique )?index ${indexName}`));
  }

  assert.doesNotMatch(sql, /drop table|drop column|create table public\.products/i);
  assert.doesNotMatch(sql, /cost_layers|post_accounting|journal|sales order|purchase order/i);
});

test("inventory product validation covers required setup, unique-friendly fields, online slug, and numeric rules", () => {
  const valid = {
    baseUomId: "uom-1",
    categoryId: "cat-1",
    name: "Hydraulic Pump",
    onlineStatus: "draft",
    productKey: "prod-1",
    productKind: "stockable",
    reservationPolicy: "soft",
    sku: "PUMP-001",
    status: "active",
    trackingMode: "none",
  };

  assert.equal(inventoryProductMutationSchema.safeParse(valid).success, true);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...valid, name: "" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...valid, categoryId: "" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...valid, onlineEnabled: "on" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...valid, purchasePrice: "-1" }).success, false);
  assert.equal(inventoryProductMutationSchema.safeParse({ ...valid, maximumStockQty: "10", reorderPointQty: "11" }).success, false);

  const online = inventoryProductMutationSchema.parse({ ...valid, onlineEnabled: "on", onlineSlug: "hydraulic-pump" });
  assert.equal(online.onlineSlug, "hydraulic-pump");
});

test("inventory product actions and loader map upgraded product fields and child rows", () => {
  const loader = fs.readFileSync(path.join(root, "src/features/inventory/routes/loaders/inventory-products.loader.ts"), "utf8");
  const actions = fs.readFileSync(path.join(root, "src/features/inventory/routes/actions/inventory-products.actions.ts"), "utf8");

  for (const field of [
    "barcode",
    "name_ar",
    "internal_notes",
    "online_features",
    "online_specifications",
    "cover_image_url",
    "gallery_urls",
    "is_stockable",
    "is_sellable",
    "is_purchasable",
    "has_serial_tracking",
    "has_lot_tracking",
  ]) {
    assert.match(loader, new RegExp(field));
    assert.match(actions, new RegExp(field));
  }

  assert.match(actions, /\.from\("inventory_product_units"\)/);
  assert.match(actions, /\.from\("inventory_product_prices"\)/);
  assert.match(actions, /\.from\("inventory_product_media"\)/);
  assert.match(actions, /SKU is already used by another product/);
  assert.match(actions, /Barcode is already used by another product/);
  assert.match(actions, /Online slug is already used by another product/);
});

test("inventory product list and modal expose requested UX metadata without raw IDs", () => {
  const route = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/products/page.tsx"), "utf8");
  const panel = fs.readFileSync(path.join(root, "src/app/(erp)/erp/inventory/products/product-record-panel.tsx"), "utf8");

  for (const column of ["Image", "SKU", "Barcode", "Name", "Category", "Type", "Base UOM", "Stockable", "Sellable", "Purchasable", "Online Visible", "Status", "Updated"]) {
    assert.match(route, new RegExp(column));
  }

  for (const filter of ["categoryId", "productKind", "onlineStatus", "trackingMode", "stockable", "sellable", "purchasable", "hasVariants", "hasSerialTracking", "hasLotTracking"]) {
    assert.match(route, new RegExp(`name="${filter}"`));
  }

  for (const tab of ["General", "Units", "Inventory", "Pricing", "Physical / Shipping", "Online", "Media", "Audit"]) {
    assert.match(panel, new RegExp(`label: "${tab}"`));
  }

  for (const lookup of ["Category", "Subcategory", "Supplier", "Base UOM", "Default Warehouse", "Default Location", "Currency", "Tax Definition"]) {
    assert.match(panel, new RegExp(`label="${lookup}"|label: "${lookup}"`));
  }

  assert.match(panel, /How this works/);
  assert.match(panel, /RecordFormDialog/);
  assert.match(panel, /Tabs/);
  assert.doesNotMatch(panel, /FloatingPanel|workspace panel|minimized dock|Stock valuation|Accounting posting|Cost Object Key|Finance Dimension Key/);
  assert.doesNotMatch(route, /\.from\("products"\)|from "@\/features\/products|from "\.\/products-workspace"|<ProductsWorkspace|PRODUCTS,/);
});
