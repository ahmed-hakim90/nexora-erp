export const PRODUCTCATEGORY_PAGE_CONFIG = {
  key: "product-categories",
  title: "Product Categories",
  description: "Maintain product classification records for large catalog filtering and reporting.",
  basePath: "/erp/master-data/product-categories",
  columns: [
    { key: "code", header: "Code", field: "code" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "parentCategoryId", header: "Parent Category Id", field: "parentCategoryId" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "code", label: "Category code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "parentCategoryId", label: "Parent category ID", type: "text", isRequired: false },
  ],
} as const;
