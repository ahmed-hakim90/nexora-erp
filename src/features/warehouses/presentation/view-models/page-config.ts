export const WAREHOUSE_PAGE_CONFIG = {
  key: "warehouses",
  title: "Warehouses",
  description: "Maintain branch-aware warehouse master records without stock balances or movements.",
  basePath: "/erp/master-data/warehouses",
  columns: [
    { key: "warehouseCode", header: "Warehouse Code", field: "warehouseCode" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "warehouseType", header: "Warehouse Type", field: "warehouseType" },
    { key: "branchId", header: "Branch Id", field: "branchId" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "warehouseCode", label: "Warehouse code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "warehouseType", label: "Warehouse type", type: "text", isRequired: true },
    { name: "branchId", label: "Branch ID", type: "text", isRequired: true },
  ],
} as const;
