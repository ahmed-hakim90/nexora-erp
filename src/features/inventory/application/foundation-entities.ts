import { INVENTORY_PERMISSIONS } from "../permissions/permission-registry";
import type { BusinessCodeConfig } from "@/shared/business-codes";
import type { PermissionKey } from "@/platform/permissions/public-api";

const statusValues = ["draft", "active", "inactive", "locked", "archived"] as const;

export type InventoryFoundationField = Readonly<{
  name: string;
  column: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "select" | "lookup" | "json";
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  lookup?: "branches" | "categories" | "locations" | "lots" | "products" | "uomCategories" | "variants" | "warehouses";
  min?: number;
  step?: string;
  showInList?: boolean;
  autoCode?: BusinessCodeConfig;
}>;

export type InventoryFoundationDescriptor = Readonly<{
  key: InventoryFoundationResourceKey;
  title: string;
  singular: string;
  description: string;
  basePath: string;
  table: string;
  fields: readonly InventoryFoundationField[];
  searchColumns: readonly string[];
  viewPermission: PermissionKey;
  managePermission: PermissionKey;
}>;

export type InventoryFoundationResourceKey =
  | "categories"
  | "lots"
  | "reorder-rules"
  | "serials"
  | "uom-categories"
  | "uoms"
  | "variants"
  | "warehouses"
  | "locations";

const commonStatusField: InventoryFoundationField = {
  column: "status",
  label: "Status",
  name: "status",
  options: statusValues.map((value) => ({ label: value, value })),
  required: true,
  showInList: true,
  type: "select",
};

export const INVENTORY_FOUNDATION_ENTITIES: Readonly<Record<InventoryFoundationResourceKey, InventoryFoundationDescriptor>> = {
  categories: {
    basePath: "/erp/inventory/categories",
    description: "Canonical inventory product categories.",
    fields: [
      { autoCode: { prefix: "CAT", scope: "company" }, column: "category_key", label: "Category Code", name: "categoryKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "parent_category_id", label: "Parent category", lookup: "categories", name: "parentCategoryId", type: "lookup" },
      { column: "description", label: "Description", name: "description", type: "text" },
      commonStatusField,
    ],
    key: "categories",
    managePermission: INVENTORY_PERMISSIONS.productsManage,
    searchColumns: ["category_key", "name"],
    singular: "Category",
    table: "inventory_product_categories",
    title: "Categories",
    viewPermission: INVENTORY_PERMISSIONS.productsView,
  },
  "uom-categories": {
    basePath: "/erp/inventory/uom-categories",
    description: "Unit of measure categories.",
    fields: [
      { autoCode: { prefix: "UOMC", scope: "company" }, column: "category_key", label: "UOM Category Code", name: "categoryKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "uom_kind", label: "UOM kind", name: "uomKind", options: ["quantity", "weight", "volume", "length", "time", "package", "custom"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      commonStatusField,
    ],
    key: "uom-categories",
    managePermission: INVENTORY_PERMISSIONS.uomsManage,
    searchColumns: ["category_key", "name", "uom_kind"],
    singular: "UOM Category",
    table: "inventory_uom_categories",
    title: "UOM Categories",
    viewPermission: INVENTORY_PERMISSIONS.uomsView,
  },
  uoms: {
    basePath: "/erp/inventory/uoms",
    description: "Canonical inventory units of measure.",
    fields: [
      { column: "uom_category_id", label: "UOM category", lookup: "uomCategories", name: "uomCategoryId", required: true, showInList: true, type: "lookup" },
      { autoCode: { prefix: "UOM", scope: "company" }, column: "uom_key", label: "UOM Code", name: "uomKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "symbol", label: "Symbol", name: "symbol", required: true, showInList: true, type: "text" },
      { column: "conversion_factor_to_base", label: "Conversion to base", min: 0, name: "conversionFactorToBase", required: true, step: "0.000000001", type: "number" },
      { column: "precision_scale", label: "Precision", min: 0, name: "precisionScale", required: true, type: "number" },
      { column: "is_base_uom", label: "Base UOM", name: "isBaseUom", showInList: true, type: "checkbox" },
      commonStatusField,
    ],
    key: "uoms",
    managePermission: INVENTORY_PERMISSIONS.uomsManage,
    searchColumns: ["uom_key", "name", "symbol"],
    singular: "UOM",
    table: "inventory_uoms",
    title: "Units of Measure",
    viewPermission: INVENTORY_PERMISSIONS.uomsView,
  },
  variants: {
    basePath: "/erp/inventory/variants",
    description: "Inventory product variants linked to canonical products.",
    fields: [
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { autoCode: { prefix: "VAR", scope: "company" }, column: "variant_key", label: "Variant Code", name: "variantKey", required: true, showInList: true, type: "text" },
      { column: "sku", label: "SKU", name: "sku", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "attributes", label: "Attributes JSON", name: "attributes", type: "json" },
      { column: "tracking_mode", label: "Tracking", name: "trackingMode", options: ["none", "lot", "serial"].map((value) => ({ label: value, value })), showInList: true, type: "select" },
      commonStatusField,
    ],
    key: "variants",
    managePermission: INVENTORY_PERMISSIONS.productsManage,
    searchColumns: ["variant_key", "sku", "name"],
    singular: "Variant",
    table: "inventory_product_variants",
    title: "Variants",
    viewPermission: INVENTORY_PERMISSIONS.productsView,
  },
  warehouses: {
    basePath: "/erp/inventory/warehouses",
    description: "Canonical inventory warehouses.",
    fields: [
      { column: "branch_id", label: "Branch", lookup: "branches", name: "branchId", required: true, showInList: true, type: "lookup" },
      { autoCode: { prefix: "WH", scope: "company" }, column: "warehouse_key", label: "Warehouse Code", name: "warehouseKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "warehouse_type", label: "Type", name: "warehouseType", options: ["main", "branch", "returns", "quarantine", "in_transit", "virtual"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      commonStatusField,
    ],
    key: "warehouses",
    managePermission: INVENTORY_PERMISSIONS.warehousesManage,
    searchColumns: ["warehouse_key", "name", "warehouse_type"],
    singular: "Warehouse",
    table: "inventory_warehouses",
    title: "Warehouses",
    viewPermission: INVENTORY_PERMISSIONS.warehousesView,
  },
  locations: {
    basePath: "/erp/inventory/locations",
    description: "Warehouse location hierarchy.",
    fields: [
      { column: "warehouse_id", label: "Warehouse", lookup: "warehouses", name: "warehouseId", required: true, showInList: true, type: "lookup" },
      { column: "parent_location_id", label: "Parent location", lookup: "locations", name: "parentLocationId", type: "lookup" },
      { autoCode: { prefix: "LOC", scope: "company" }, column: "location_key", label: "Location Code", name: "locationKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "location_kind", label: "Kind", name: "locationKind", options: ["warehouse", "zone", "aisle", "rack", "shelf", "bin", "virtual", "staging", "quarantine"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "reservable", label: "Reservable", name: "reservable", showInList: true, type: "checkbox" },
      commonStatusField,
    ],
    key: "locations",
    managePermission: INVENTORY_PERMISSIONS.locationsManage,
    searchColumns: ["location_key", "name", "location_kind"],
    singular: "Location",
    table: "inventory_locations",
    title: "Locations",
    viewPermission: INVENTORY_PERMISSIONS.locationsView,
  },
  lots: {
    basePath: "/erp/inventory/lots",
    description: "Lot tracking records.",
    fields: [
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { column: "product_variant_id", label: "Variant", lookup: "variants", name: "productVariantId", type: "lookup" },
      { autoCode: { prefix: "LOT", scope: "company" }, column: "lot_key", label: "Lot Code", name: "lotKey", required: true, showInList: true, type: "text" },
      { column: "received_on", label: "Received on", name: "receivedOn", type: "date" },
      { column: "expires_on", label: "Expires on", name: "expiresOn", type: "date" },
      commonStatusField,
    ],
    key: "lots",
    managePermission: INVENTORY_PERMISSIONS.lotsManage,
    searchColumns: ["lot_key", "status"],
    singular: "Lot",
    table: "inventory_lots",
    title: "Lots",
    viewPermission: INVENTORY_PERMISSIONS.lotsView,
  },
  serials: {
    basePath: "/erp/inventory/serials",
    description: "Serial number tracking records.",
    fields: [
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { column: "product_variant_id", label: "Variant", lookup: "variants", name: "productVariantId", type: "lookup" },
      { column: "lot_id", label: "Lot", lookup: "lots", name: "lotId", type: "lookup" },
      { autoCode: { prefix: "SER", scope: "company" }, column: "serial_key", label: "Serial Code", name: "serialKey", required: true, showInList: true, type: "text" },
      commonStatusField,
    ],
    key: "serials",
    managePermission: INVENTORY_PERMISSIONS.serialsManage,
    searchColumns: ["serial_key", "status"],
    singular: "Serial Number",
    table: "inventory_serial_numbers",
    title: "Serial Numbers",
    viewPermission: INVENTORY_PERMISSIONS.serialsView,
  },
  "reorder-rules": {
    basePath: "/erp/inventory/reorder-rules",
    description: "Inventory reorder rules. Demand document creation is intentionally disabled in the foundation.",
    fields: [
      { column: "branch_id", label: "Branch", lookup: "branches", name: "branchId", required: true, type: "lookup" },
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { column: "product_variant_id", label: "Variant", lookup: "variants", name: "productVariantId", type: "lookup" },
      { column: "warehouse_id", label: "Warehouse", lookup: "warehouses", name: "warehouseId", required: true, showInList: true, type: "lookup" },
      { column: "location_id", label: "Location", lookup: "locations", name: "locationId", type: "lookup" },
      { autoCode: { prefix: "RR", scope: "company" }, column: "rule_key", label: "Rule Code", name: "ruleKey", required: true, showInList: true, type: "text" },
      { column: "policy", label: "Policy", name: "policy", options: ["min_max", "reorder_point", "manual_review"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "minimum_quantity", label: "Minimum", min: 0, name: "minimumQuantity", required: true, showInList: true, step: "0.000001", type: "number" },
      { column: "maximum_quantity", label: "Maximum", min: 0, name: "maximumQuantity", step: "0.000001", type: "number" },
      { column: "reorder_quantity", label: "Reorder quantity", min: 0, name: "reorderQuantity", step: "0.000001", type: "number" },
      commonStatusField,
    ],
    key: "reorder-rules",
    managePermission: INVENTORY_PERMISSIONS.reorderRulesManage,
    searchColumns: ["rule_key", "policy", "status"],
    singular: "Reorder Rule",
    table: "inventory_reorder_rules",
    title: "Reorder Rules",
    viewPermission: INVENTORY_PERMISSIONS.reorderRulesView,
  },
};

export const INVENTORY_FOUNDATION_RESOURCE_KEYS = Object.keys(INVENTORY_FOUNDATION_ENTITIES) as InventoryFoundationResourceKey[];

export function isInventoryFoundationResourceKey(value: string): value is InventoryFoundationResourceKey {
  return value in INVENTORY_FOUNDATION_ENTITIES;
}

export function getInventoryFoundationEntity(value: string): InventoryFoundationDescriptor {
  if (!isInventoryFoundationResourceKey(value)) {
    throw new Error(`Unknown inventory foundation resource: ${value}`);
  }
  return INVENTORY_FOUNDATION_ENTITIES[value];
}
