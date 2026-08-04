/**
 * MFG-01 manufacturing catalog roles — re-exports inventory-owned classification
 * and maps warehouse types used by production flows.
 */

export {
  INVENTORY_MANUFACTURING_ITEM_ROLE_OPTIONS as MANUFACTURING_ITEM_ROLE_OPTIONS,
  INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES as MANUFACTURING_ITEM_ROLE_VALUES,
  INVENTORY_PRODUCTION_WAREHOUSE_TYPE_OPTIONS as MANUFACTURING_WAREHOUSE_TYPE_OPTIONS,
  isInventoryManufacturingItemRole as isManufacturingItemRole,
  type InventoryManufacturingItemRole as ManufacturingItemRole,
} from "@/features/inventory/domain/manufacturing-item-roles";

export const MANUFACTURING_WAREHOUSE_ROLE_MAP = {
  raw_materials: {
    warehouseType: "raw_materials",
    label: "Raw materials",
    productionRole: "raw",
  },
  production_floor: {
    warehouseType: "production_buffer",
    label: "Production floor / buffer",
    productionRole: "floor",
  },
  finished_goods: {
    warehouseType: "finished_goods",
    label: "Finished goods",
    productionRole: "finished",
  },
  scrap: {
    warehouseType: "scrap",
    label: "Scrap",
    productionRole: "scrap",
  },
  qc: {
    warehouseType: "qc",
    label: "QC hold",
    productionRole: "qc",
  },
} as const;
