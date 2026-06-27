export const BRAND_PAGE_CONFIG = {
  key: "brands",
  title: "Brands",
  description: "Maintain brand records for product classification and commercial reporting.",
  basePath: "/erp/master-data/brands",
  columns: [
    { key: "code", header: "Code", field: "code" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "code", label: "Brand code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
  ],
} as const;
