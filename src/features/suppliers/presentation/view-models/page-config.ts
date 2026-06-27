export const SUPPLIER_PAGE_CONFIG = {
  key: "suppliers",
  title: "Suppliers",
  description: "Maintain supplier master records and procurement placeholders without purchase orders or ledgers.",
  basePath: "/erp/master-data/suppliers",
  columns: [
    { key: "supplierCode", header: "Supplier Code", field: "supplierCode" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "phone", header: "Phone", field: "phone" },
    { key: "email", header: "Email", field: "email" },
    { key: "supplierType", header: "Supplier Type", field: "supplierType" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "supplierCode", label: "Supplier code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "phone", label: "Phone", type: "text", isRequired: false },
    { name: "email", label: "Email", type: "email", isRequired: false },
    { name: "taxNumber", label: "Tax number", type: "text", isRequired: false },
    { name: "supplierType", label: "Supplier type", type: "text", isRequired: true },
  ],
} as const;
