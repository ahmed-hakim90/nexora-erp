export const WAREHOUSELOCATION_PAGE_CONFIG = {
  key: "warehouse-locations",
  title: "Warehouse Locations",
  description: "Maintain hierarchical warehouse bin/location records without stock quantities or movements.",
  basePath: "/erp/master-data/warehouse-locations",
  columns: [
    { key: "locationCode", header: "Location Code", field: "locationCode" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "warehouseId", header: "Warehouse Id", field: "warehouseId" },
    { key: "parentLocationId", header: "Parent Location Id", field: "parentLocationId" },
    { key: "locationType", header: "Location Type", field: "locationType" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "locationCode", label: "Location code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "warehouseId", label: "Warehouse ID", type: "text", isRequired: true },
    { name: "parentLocationId", label: "Parent location ID", type: "text", isRequired: false },
    { name: "locationType", label: "Location type", type: "text", isRequired: true },
  ],
} as const;
