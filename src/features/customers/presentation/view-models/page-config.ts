export const CUSTOMER_PAGE_CONFIG = {
  key: "customers",
  title: "Customers",
  description: "Maintain customer master records and commercial placeholders without invoices or ledgers.",
  basePath: "/erp/master-data/customers",
  columns: [
    { key: "customerCode", header: "Customer Code", field: "customerCode" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "phone", header: "Phone", field: "phone" },
    { key: "email", header: "Email", field: "email" },
    { key: "customerType", header: "Customer Type", field: "customerType" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "customerCode", label: "Customer code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "phone", label: "Phone", type: "text", isRequired: false },
    { name: "email", label: "Email", type: "email", isRequired: false },
    { name: "taxNumber", label: "Tax number", type: "text", isRequired: false },
    { name: "customerType", label: "Customer type", type: "text", isRequired: true },
  ],
} as const;
