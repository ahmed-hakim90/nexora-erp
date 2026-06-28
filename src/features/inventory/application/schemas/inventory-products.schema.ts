import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1, "This field is required.");
const optionalNumber = z.preprocess((value) => value === "" || value === null || typeof value === "undefined" ? null : value, z.coerce.number().min(0, "Use zero or a positive number.").nullable());
const requiredNumber = z.coerce.number().min(0, "Use zero or a positive number.");
const optionalBoolean = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());
const slugText = z.preprocess((value) => value === "" ? null : value, z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by dashes.").nullable());

export const inventoryProductStatusValues = ["draft", "active", "inactive", "locked", "archived"] as const;
export const inventoryProductKindValues = ["stockable", "consumable", "service", "asset", "rental", "kit"] as const;
export const inventoryTrackingModeValues = ["none", "lot", "serial"] as const;
export const inventoryReservationPolicyValues = ["none", "soft", "hard"] as const;
export const inventoryOnlineStatusValues = ["draft", "ready", "published", "hidden", "archived"] as const;

function csvToArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function keyValueTextToObject(value: unknown) {
  if (typeof value !== "string") return {};
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim()];
      })
      .filter(([key, val]) => key.length > 0 && val.length > 0),
  );
}

export function parseDelimitedList(value: unknown): string[] {
  return csvToArray(value);
}

export const inventoryProductListQuerySchema = z.object({
  categoryId: optionalText.optional(),
  cursor: z.string().optional().nullable(),
  hasLotTracking: z.coerce.boolean().optional(),
  hasSerialTracking: z.coerce.boolean().optional(),
  hasVariants: z.coerce.boolean().optional(),
  onlineStatus: z.enum(inventoryOnlineStatusValues).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  productKind: z.enum(inventoryProductKindValues).optional(),
  search: z.string().trim().max(120).optional(),
  sellable: z.coerce.boolean().optional(),
  status: z.enum(inventoryProductStatusValues).optional(),
  stockable: z.coerce.boolean().optional(),
  purchasable: z.coerce.boolean().optional(),
  trackingMode: z.enum(inventoryTrackingModeValues).optional(),
});

export const inventoryProductMutationSchema = z.object({
  allowRatings: optionalBoolean.default(true),
  allowReviews: optionalBoolean.default(true),
  attachmentUrls: z.preprocess(csvToArray, z.array(z.string().url("Enter a valid URL.")).default([])),
  barcode: optionalText.optional(),
  baseUomId: requiredText,
  brand: optionalText.optional(),
  branchId: optionalText.optional(),
  canonicalUrl: optionalText.optional(),
  categoryId: requiredText,
  commissionRate: requiredNumber.default(0),
  costObjectKey: optionalText.optional(),
  countryOfOrigin: optionalText.optional(),
  coverImageUrl: optionalText.optional(),
  currencyId: optionalText.optional(),
  defaultLocationId: optionalText.optional(),
  defaultWarehouseId: optionalText.optional(),
  description: optionalText.optional(),
  discountAllowed: optionalBoolean.default(false),
  financeDimensionKey: optionalText.optional(),
  galleryUrls: z.preprocess(csvToArray, z.array(z.string().url("Enter a valid URL.")).default([])),
  hasLotTracking: optionalBoolean.default(false),
  hasSerialTracking: optionalBoolean.default(false),
  hasVariants: optionalBoolean.default(false),
  height: optionalNumber.optional(),
  hsCode: optionalText.optional(),
  internalNotes: optionalText.optional(),
  isBestSeller: optionalBoolean.default(false),
  isDiscountable: optionalBoolean.default(true),
  isFeatured: optionalBoolean.default(false),
  isManufacturable: optionalBoolean.default(false),
  isNewArrival: optionalBoolean.default(false),
  isOnlineVisible: optionalBoolean.default(false),
  isPurchasable: optionalBoolean.default(true),
  isSellable: optionalBoolean.default(true),
  isService: optionalBoolean.default(false),
  isStockable: optionalBoolean.default(true),
  length: optionalNumber.optional(),
  manualUrls: z.preprocess(csvToArray, z.array(z.string().url("Enter a valid URL.")).default([])),
  maximumStockQty: optionalNumber.optional(),
  minimumStockQty: requiredNumber.default(0),
  name: requiredText,
  nameAr: optionalText.optional(),
  ogImageUrl: optionalText.optional(),
  onlineEnabled: optionalBoolean.default(false),
  onlineFeatures: z.preprocess(csvToArray, z.array(z.string()).default([])),
  onlineLongDescription: optionalText.optional(),
  onlinePackageContents: z.preprocess(csvToArray, z.array(z.string()).default([])),
  onlinePrice: requiredNumber.default(0),
  onlineShortDescription: optionalText.optional(),
  onlineSlug: slugText.optional(),
  onlineSpecifications: z.preprocess(keyValueTextToObject, z.record(z.string(), z.string()).default({})),
  onlineStatus: z.enum(inventoryOnlineStatusValues),
  onlineTitle: optionalText.optional(),
  openingBalanceQty: requiredNumber.default(0),
  priceIncludesTax: optionalBoolean.default(false),
  productCategoryId: optionalText.optional(),
  productKey: requiredText.regex(/^[a-z0-9][a-z0-9._-]*$/, "Use lowercase letters, numbers, dots, dashes, or underscores."),
  productKind: z.enum(inventoryProductKindValues),
  productTypeKey: optionalText.optional(),
  purchasePrice: requiredNumber.default(0),
  purchaseUomId: optionalText.optional(),
  reorderPointQty: optionalNumber.optional(),
  reservationPolicy: z.enum(inventoryReservationPolicyValues),
  retailPrice: requiredNumber.default(0),
  salesUomId: optionalText.optional(),
  sectionKey: optionalText.optional(),
  seoDescription: optionalText.optional(),
  seoKeywords: z.preprocess(csvToArray, z.array(z.string()).default([])),
  seoTitle: optionalText.optional(),
  shippingClass: optionalText.optional(),
  shortName: optionalText.optional(),
  sku: requiredText,
  status: z.enum(inventoryProductStatusValues),
  subcategoryId: optionalText.optional(),
  supplierPartyId: optionalText.optional(),
  taxDefinitionId: optionalText.optional(),
  trackingMode: z.enum(inventoryTrackingModeValues),
  videoUrls: z.preprocess(csvToArray, z.array(z.string().url("Enter a valid URL.")).default([])),
  volume: optionalNumber.optional(),
  weight: optionalNumber.optional(),
  wholesalePrice: requiredNumber.default(0),
  width: optionalNumber.optional(),
}).superRefine((value, context) => {
  if (value.onlineEnabled && !value.onlineSlug) {
    context.addIssue({ code: "custom", message: "Enter a slug before enabling online sales.", path: ["onlineSlug"] });
  }

  if (value.maximumStockQty !== null && value.reorderPointQty !== null && value.maximumStockQty !== undefined && value.reorderPointQty !== undefined && value.reorderPointQty > value.maximumStockQty) {
    context.addIssue({ code: "custom", message: "Reorder point must be less than or equal to maximum stock.", path: ["reorderPointQty"] });
  }
});
