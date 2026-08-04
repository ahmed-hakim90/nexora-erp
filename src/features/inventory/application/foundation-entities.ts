import { INVENTORY_PERMISSIONS } from "../permissions/permission-registry";
import type { BusinessCodeConfig } from "@/shared/business-codes";
import type { PermissionKey } from "@/platform/permissions/public-api";

const statusValues = ["draft", "active", "inactive", "locked", "archived"] as const;

export type InventoryFoundationField = Readonly<{
  name: string;
  column: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "select" | "lookup" | "json" | "tags";
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  lookup?: "branches" | "categories" | "costCenters" | "handlingUnitTypes" | "handlingUnits" | "locations" | "lots" | "managers" | "products" | "serials" | "suppliers" | "uomCategories" | "uoms" | "variants" | "warehouses";
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
  | "handling-unit-contents"
  | "handling-unit-types"
  | "handling-units"
  | "lots"
  | "reorder-rules"
  | "serials"
  | "uom-categories"
  | "uoms"
  | "variants"
  | "warehouses"
  | "locations";

const handlingUnitStatusOptions = [
  "empty",
  "packed",
  "partial",
  "opened",
  "closed",
  "reserved",
  "picked",
  "shipped",
  "returned",
  "damaged",
  "scrapped",
  "archived",
].map((value) => ({ label: value, value }));

const handlingUnitLifecycleOptions = [
  "draft",
  "active",
  "sealed",
  "opened",
  "closed",
  "split_ready",
  "merge_ready",
  "repack_ready",
  "traceable",
  "archived",
].map((value) => ({ label: value, value }));

const handlingUnitContentTypeOptions = [
  "product_quantity",
  "lot_quantity",
  "serial_reference",
  "child_handling_unit",
].map((value) => ({ label: value, value }));

const commonStatusField: InventoryFoundationField = {
  column: "status",
  label: "Status",
  name: "status",
  options: statusValues.map((value) => ({ label: value, value })),
  required: true,
  showInList: true,
  type: "select",
};

const warehouseTypeOptions = [
  { value: "raw_materials", label: "Raw materials" },
  { value: "production_buffer", label: "Production floor / buffer" },
  { value: "finished_goods", label: "Finished goods" },
  { value: "scrap", label: "Scrap" },
  { value: "qc", label: "QC hold" },
  { value: "main", label: "Main" },
  { value: "spare_parts", label: "Spare parts" },
  { value: "service", label: "Service" },
  { value: "returns", label: "Returns" },
  { value: "transit", label: "Transit" },
] as const;

const locationTypeOptions = [
  "zone",
  "aisle",
  "rack",
  "shelf",
  "bin",
  "receiving",
  "shipping",
  "qc_hold",
  "returns",
  "scrap",
  "production_input",
  "production_output",
  "transit",
].map((value) => ({ label: value, value }));

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
      { column: "attributes", label: "Attributes", name: "attributes", type: "json" },
      { column: "tracking_mode", label: "Tracking", name: "trackingMode", options: ["none", "quantity_only", "lot", "serial", "lot_serial"].map((value) => ({ label: value, value })), showInList: true, type: "select" },
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
    description: "Enterprise warehouse business entities and operational location defaults. No stock movement or quantity updates are implemented here.",
    fields: [
      { column: "branch_id", label: "Branch", lookup: "branches", name: "branchId", required: true, showInList: true, type: "lookup" },
      { autoCode: { prefix: "WH", scope: "company" }, column: "warehouse_key", label: "Warehouse Code", name: "warehouseKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "warehouse_type", label: "Type", name: "warehouseType", options: warehouseTypeOptions, required: true, showInList: true, type: "select" },
      { column: "manager_id", label: "Manager", lookup: "managers", name: "managerId", type: "lookup" },
      { column: "cost_center_id", label: "Cost Center", lookup: "costCenters", name: "costCenterId", type: "lookup" },
      { column: "default_receiving_location_id", label: "Default Receiving Location", lookup: "locations", name: "defaultReceivingLocationId", type: "lookup" },
      { column: "default_shipping_location_id", label: "Default Shipping Location", lookup: "locations", name: "defaultShippingLocationId", type: "lookup" },
      { column: "default_qc_location_id", label: "Default QC Location", lookup: "locations", name: "defaultQcLocationId", type: "lookup" },
      { column: "default_returns_location_id", label: "Default Returns Location", lookup: "locations", name: "defaultReturnsLocationId", type: "lookup" },
      { column: "operational_policies", label: "Operational Policies Metadata", name: "operationalPolicies", type: "json" },
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
    description: "Hierarchical warehouse storage points with barcode and operational readiness metadata. No quantities or stock balances are stored here.",
    fields: [
      { column: "warehouse_id", label: "Warehouse", lookup: "warehouses", name: "warehouseId", required: true, showInList: true, type: "lookup" },
      { column: "parent_location_id", label: "Parent location", lookup: "locations", name: "parentLocationId", type: "lookup" },
      { autoCode: { prefix: "LOC", scope: "company" }, column: "location_key", label: "Location Code", name: "locationKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "location_kind", label: "Location Type", name: "locationKind", options: locationTypeOptions, required: true, showInList: true, type: "select" },
      { column: "barcode", label: "Barcode", name: "barcode", showInList: true, type: "text" },
      { column: "capacity_metadata", label: "Capacity Metadata", name: "capacityMetadata", type: "json" },
      { column: "allowed_product_categories", label: "Allowed Product Categories", name: "allowedProductCategories", type: "tags" },
      { column: "allowed_inventory_statuses", label: "Allowed Inventory Statuses", name: "allowedInventoryStatuses", type: "tags" },
      { column: "pickable", label: "Pickable", name: "pickable", showInList: true, type: "checkbox" },
      { column: "receivable", label: "Receivable", name: "receivable", showInList: true, type: "checkbox" },
      { column: "shippable", label: "Shippable", name: "shippable", showInList: true, type: "checkbox" },
      { column: "qc_required", label: "QC Required", name: "qcRequired", showInList: true, type: "checkbox" },
      commonStatusField,
    ],
    key: "locations",
    managePermission: INVENTORY_PERMISSIONS.locationsManage,
    searchColumns: ["location_key", "name", "location_kind", "barcode"],
    singular: "Location",
    table: "inventory_locations",
    title: "Locations",
    viewPermission: INVENTORY_PERMISSIONS.locationsView,
  },
  lots: {
    basePath: "/erp/inventory/lots",
    description: "Lot and batch identity foundation. No quantities, balances, movements, or reservations are stored here.",
    fields: [
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { column: "product_variant_id", label: "Variant", lookup: "variants", name: "productVariantId", type: "lookup" },
      { autoCode: { prefix: "LOT", scope: "company" }, column: "lot_number", label: "Lot Number", name: "lotNumber", required: true, showInList: true, type: "text" },
      { column: "source_type", label: "Source Type", name: "sourceType", options: ["supplier", "manufacturing", "repack", "return", "adjustment", "internal", "import"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "supplier_party_id", label: "Supplier Party", lookup: "suppliers", name: "supplierPartyId", type: "lookup" },
      { column: "supplier_lot_number", label: "Supplier Lot Number", name: "supplierLotNumber", type: "text" },
      { column: "received_date", label: "Received Date", name: "receivedDate", type: "date" },
      { column: "manufacturing_date", label: "Manufacturing Date", name: "manufacturingDate", type: "date" },
      { column: "expiry_date", label: "Expiry Date", name: "expiryDate", type: "date" },
      { column: "qc_status", label: "QC Status", name: "qcStatus", options: ["not_required", "pending", "passed", "failed", "hold", "released"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "lifecycle_state", label: "Lifecycle State", name: "lifecycleState", options: ["draft", "active", "qc_pending", "qc_hold", "released", "blocked", "consumed", "expired", "archived"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "barcode", label: "Barcode", name: "barcode", required: true, showInList: true, type: "text" },
      { column: "qr_payload", label: "QR Payload Metadata", name: "qrPayload", type: "json" },
      { column: "notes", label: "Notes", name: "notes", type: "text" },
      { column: "traceability_ready", label: "Traceability Ready", name: "traceabilityReady", showInList: true, type: "checkbox" },
      { column: "source_metadata", label: "Source Metadata", name: "sourceMetadata", type: "json" },
      commonStatusField,
    ],
    key: "lots",
    managePermission: INVENTORY_PERMISSIONS.lotsManage,
    searchColumns: ["lot_number", "barcode", "supplier_lot_number", "source_type", "qc_status", "lifecycle_state"],
    singular: "Lot",
    table: "inventory_lots",
    title: "Lots",
    viewPermission: INVENTORY_PERMISSIONS.lotsView,
  },
  serials: {
    basePath: "/erp/inventory/serials",
    description: "Serial Engine identity foundation with source, policy, verification, and traceability metadata. No quantities or generation runtime.",
    fields: [
      { column: "product_id", label: "Product", lookup: "products", name: "productId", required: true, showInList: true, type: "lookup" },
      { column: "product_variant_id", label: "Variant", lookup: "variants", name: "productVariantId", type: "lookup" },
      { column: "lot_id", label: "Lot", lookup: "lots", name: "lotId", type: "lookup" },
      { autoCode: { prefix: "SER", scope: "company" }, column: "serial_number", label: "Serial Number", name: "serialNumber", required: true, showInList: true, type: "text" },
      { column: "serial_source", label: "Serial Source", name: "serialSource", options: ["nexora_generated", "supplier", "manual", "imported"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "generation_method", label: "Generation Method", name: "generationMethod", options: ["policy_range", "manual_entry", "supplier_import", "bulk_import"].map((value) => ({ label: value, value })), required: true, type: "select" },
      { column: "lifecycle_state", label: "Lifecycle State", name: "lifecycleState", options: ["draft", "generated", "imported", "packed", "available", "reserved", "picked", "shipped", "sold", "returned", "service", "repaired", "scrapped", "revoked", "archived"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "serial_status", label: "Serial Status", name: "serialStatus", options: ["active", "blocked", "damaged", "missing", "duplicate_suspected", "counterfeit_suspected", "archived"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "verification_status", label: "Verification Status", name: "verificationStatus", options: ["not_required", "pending", "valid", "invalid", "suspected_duplicate", "revoked"].map((value) => ({ label: value, value })), required: true, showInList: true, type: "select" },
      { column: "barcode", label: "Barcode", name: "barcode", required: true, showInList: true, type: "text" },
      { column: "warranty_ready", label: "Warranty Ready", name: "warrantyReady", showInList: true, type: "checkbox" },
      { column: "service_ready", label: "Service Ready", name: "serviceReady", showInList: true, type: "checkbox" },
      { column: "traceability_ready", label: "Traceability Ready", name: "traceabilityReady", showInList: true, type: "checkbox" },
      { column: "source_metadata", label: "Source Metadata", name: "sourceMetadata", type: "json" },
      commonStatusField,
    ],
    key: "serials",
    managePermission: INVENTORY_PERMISSIONS.serialsManage,
    searchColumns: ["serial_number", "barcode", "serial_source", "lifecycle_state", "serial_status", "verification_status"],
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
  "handling-unit-types": {
    basePath: "/erp/inventory/handling-unit-types",
    description: "Physical container type definitions for cartons, pallets, inner boxes, and bundles. No stock movement runtime.",
    fields: [
      { autoCode: { prefix: "HUT", scope: "company" }, column: "type_key", label: "Type Code", name: "typeKey", required: true, showInList: true, type: "text" },
      { column: "name", label: "Name", name: "name", required: true, showInList: true, type: "text" },
      { column: "description", label: "Description", name: "description", type: "text" },
      { column: "level", label: "Hierarchy Level", min: 0, name: "level", required: true, showInList: true, type: "number" },
      { column: "parent_allowed", label: "Parent Allowed", name: "parentAllowed", showInList: true, type: "checkbox" },
      { column: "child_allowed", label: "Child Allowed", name: "childAllowed", showInList: true, type: "checkbox" },
      { column: "default_capacity", label: "Default Capacity", min: 0, name: "defaultCapacity", step: "0.000001", type: "number" },
      { column: "weight_capacity", label: "Weight Capacity", min: 0, name: "weightCapacity", step: "0.000001", type: "number" },
      { column: "dimension_metadata", label: "Dimension Metadata", name: "dimensionMetadata", type: "json" },
      { column: "reusable", label: "Reusable", name: "reusable", showInList: true, type: "checkbox" },
      commonStatusField,
    ],
    key: "handling-unit-types",
    managePermission: INVENTORY_PERMISSIONS.handlingUnitsManage,
    searchColumns: ["type_key", "name", "description"],
    singular: "Handling Unit Type",
    table: "inventory_handling_unit_types",
    title: "Handling Unit Types",
    viewPermission: INVENTORY_PERMISSIONS.handlingUnitsView,
  },
  "handling-units": {
    basePath: "/erp/inventory/handling-units",
    description: "Physical handling unit containers with barcode, lifecycle, and traceability metadata. No stock deductions or movement confirmation.",
    fields: [
      { column: "hu_type_id", label: "Type", lookup: "handlingUnitTypes", name: "huTypeId", required: true, showInList: true, type: "lookup" },
      { autoCode: { prefix: "HU", scope: "company" }, column: "hu_number", label: "HU Number", name: "huNumber", required: true, showInList: true, type: "text" },
      { column: "warehouse_id", label: "Warehouse", lookup: "warehouses", name: "warehouseId", required: true, showInList: true, type: "lookup" },
      { column: "location_id", label: "Location", lookup: "locations", name: "locationId", type: "lookup" },
      { column: "parent_hu_id", label: "Parent HU", lookup: "handlingUnits", name: "parentHuId", type: "lookup" },
      { column: "lot_id", label: "Lot", lookup: "lots", name: "lotId", type: "lookup" },
      { column: "product_id", label: "Product", lookup: "products", name: "productId", type: "lookup" },
      { column: "hu_status", label: "HU Status", name: "huStatus", options: handlingUnitStatusOptions, required: true, showInList: true, type: "select" },
      { column: "lifecycle_state", label: "Lifecycle State", name: "lifecycleState", options: handlingUnitLifecycleOptions, required: true, showInList: true, type: "select" },
      { column: "barcode", label: "Barcode", name: "barcode", required: true, showInList: true, type: "text" },
      { column: "qr_payload", label: "QR Payload Metadata", name: "qrPayload", type: "json" },
      { column: "gross_weight", label: "Gross Weight", min: 0, name: "grossWeight", step: "0.000001", type: "number" },
      { column: "net_weight", label: "Net Weight", min: 0, name: "netWeight", step: "0.000001", type: "number" },
      { column: "dimensions_metadata", label: "Dimensions Metadata", name: "dimensionsMetadata", type: "json" },
      { column: "sealed_at", label: "Sealed At", name: "sealedAt", type: "text" },
      { column: "opened_at", label: "Opened At", name: "openedAt", type: "text" },
      { column: "closed_at", label: "Closed At", name: "closedAt", type: "text" },
      { column: "current_custodian", label: "Current Custodian Metadata", name: "currentCustodian", type: "json" },
      { column: "split_ready", label: "Split Ready", name: "splitReady", showInList: true, type: "checkbox" },
      { column: "merge_ready", label: "Merge Ready", name: "mergeReady", showInList: true, type: "checkbox" },
      { column: "repack_ready", label: "Repack Ready", name: "repackReady", showInList: true, type: "checkbox" },
      { column: "traceability_ready", label: "Traceability Ready", name: "traceabilityReady", showInList: true, type: "checkbox" },
      commonStatusField,
    ],
    key: "handling-units",
    managePermission: INVENTORY_PERMISSIONS.handlingUnitsManage,
    searchColumns: ["hu_number", "barcode", "hu_status", "lifecycle_state"],
    singular: "Handling Unit",
    table: "inventory_handling_units",
    title: "Handling Units",
    viewPermission: INVENTORY_PERMISSIONS.handlingUnitsView,
  },
  "handling-unit-contents": {
    basePath: "/erp/inventory/handling-unit-contents",
    description: "Current and historical handling unit contents. removed_at preserves traceability; rows are never hard-deleted.",
    fields: [
      { column: "handling_unit_id", label: "Handling Unit", lookup: "handlingUnits", name: "handlingUnitId", required: true, showInList: true, type: "lookup" },
      { column: "content_type", label: "Content Type", name: "contentType", options: handlingUnitContentTypeOptions, required: true, showInList: true, type: "select" },
      { column: "product_id", label: "Product", lookup: "products", name: "productId", type: "lookup" },
      { column: "lot_id", label: "Lot", lookup: "lots", name: "lotId", type: "lookup" },
      { column: "serial_id", label: "Serial", lookup: "serials", name: "serialId", type: "lookup" },
      { column: "child_hu_id", label: "Child HU", lookup: "handlingUnits", name: "childHuId", type: "lookup" },
      { column: "quantity", label: "Quantity", min: 0, name: "quantity", required: true, showInList: true, step: "0.000001", type: "number" },
      { column: "uom_id", label: "UOM", lookup: "uoms", name: "uomId", type: "lookup" },
      { column: "removed_at", label: "Removed At", name: "removedAt", type: "text" },
      { column: "reason_metadata", label: "Reason Metadata", name: "reasonMetadata", type: "json" },
      commonStatusField,
    ],
    key: "handling-unit-contents",
    managePermission: INVENTORY_PERMISSIONS.handlingUnitsManage,
    searchColumns: ["content_type", "status"],
    singular: "Handling Unit Content",
    table: "inventory_handling_unit_contents",
    title: "Handling Unit Contents",
    viewPermission: INVENTORY_PERMISSIONS.handlingUnitsView,
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
