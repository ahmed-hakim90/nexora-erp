export const TAXPROFILE_PAGE_CONFIG = {
  key: "tax-profiles",
  title: "Tax Profiles",
  description: "Maintain reusable tax profile records for future sales, purchasing, and accounting integration.",
  basePath: "/erp/master-data/tax-profiles",
  columns: [
    { key: "code", header: "Code", field: "code" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "taxProfileType", header: "Tax Profile Type", field: "taxProfileType" },
    { key: "taxRate", header: "Tax Rate", field: "taxRate" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "code", label: "Tax profile code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "taxProfileType", label: "Tax profile type", type: "text", isRequired: true },
    { name: "taxRate", label: "Tax rate", type: "number", isRequired: true },
  ],
} as const;
