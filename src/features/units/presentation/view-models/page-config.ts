export const UNIT_PAGE_CONFIG = {
  key: "units",
  title: "Units",
  description: "Maintain unit of measure records used by products, pricing, purchasing, and sales.",
  basePath: "/erp/master-data/units",
  columns: [
    { key: "code", header: "Code", field: "code" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "unitType", header: "Unit Type", field: "unitType" },
    { key: "precisionScale", header: "Precision", field: "precisionScale" },
    { key: "isBaseUnit", header: "Base Unit", field: "isBaseUnit" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "code", label: "Unit code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "unitType", label: "Unit type", type: "text", isRequired: true },
    { name: "precisionScale", label: "Precision scale", type: "number", isRequired: true },
    { name: "isBaseUnit", label: "Base unit", type: "checkbox", isRequired: false },
  ],
} as const;
