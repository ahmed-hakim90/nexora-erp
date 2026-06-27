export const PRICELIST_PAGE_CONFIG = {
  key: "price-lists",
  title: "Price Lists",
  description: "Maintain reusable price list headers for future sales and purchasing price rules.",
  basePath: "/erp/master-data/price-lists",
  columns: [
    { key: "code", header: "Code", field: "code" },
    { key: "nameAr", header: "Name Ar", field: "nameAr" },
    { key: "nameEn", header: "Name En", field: "nameEn" },
    { key: "priceListType", header: "Price List Type", field: "priceListType" },
    { key: "currencyCode", header: "Currency Code", field: "currencyCode" },
    { key: "isActive", header: "Is Active", field: "isActive" },
  ],
  formFields: [
    { name: "code", label: "Price list code", type: "text", isRequired: true },
    { name: "nameAr", label: "Arabic name", type: "text", isRequired: true },
    { name: "nameEn", label: "English name", type: "text", isRequired: true },
    { name: "priceListType", label: "Price list type", type: "text", isRequired: true },
    { name: "currencyCode", label: "Currency code", type: "text", isRequired: true },
  ],
} as const;
