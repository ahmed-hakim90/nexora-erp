/**
 * MFG-01: manufacturing classification on inventory product master.
 * Stored in inventory_products.product_type_key when is_manufacturable is true.
 */

export const INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES = [
  "raw_material",
  "semi_finished",
  "finished_good",
  "packaging",
] as const;

export type InventoryManufacturingItemRole = (typeof INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES)[number];

export const INVENTORY_MANUFACTURING_ITEM_ROLE_OPTIONS = [
  { value: "raw_material", label: "Raw material" },
  { value: "semi_finished", label: "Semi-finished" },
  { value: "finished_good", label: "Finished good" },
  { value: "packaging", label: "Packaging" },
] as const;

export function isInventoryManufacturingItemRole(value: string | null | undefined): value is InventoryManufacturingItemRole {
  return typeof value === "string" && (INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES as readonly string[]).includes(value);
}

export const INVENTORY_PRODUCTION_WAREHOUSE_TYPE_OPTIONS = [
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
