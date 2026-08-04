import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1, "This field is required.");
const optionalNumber = z.preprocess((value) => value === "" || value === null || typeof value === "undefined" ? null : value, z.coerce.number().min(0, "Use zero or a positive number.").nullable());
const optionalPositiveInteger = z.preprocess((value) => value === "" || value === null || typeof value === "undefined" ? null : value, z.coerce.number().int("Use a whole number.").min(1, "Use one or a positive whole number.").nullable());
const requiredNumber = z.coerce.number().min(0, "Use zero or a positive number.");
const optionalBoolean = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());
const slugText = z.preprocess((value) => value === "" ? null : value, z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by dashes.").nullable());

import {
  INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES,
  isInventoryManufacturingItemRole,
} from "../../domain/manufacturing-item-roles";

export const inventoryProductStatusValues = ["draft", "active", "inactive", "locked", "archived"] as const;
export const inventoryProductKindValues = ["stockable", "consumable", "service", "asset", "rental", "kit"] as const;
export const inventoryManufacturingItemRoleValues = INVENTORY_MANUFACTURING_ITEM_ROLE_VALUES;
export const inventoryTrackingModeValues = ["none", "quantity_only", "lot", "serial", "lot_serial"] as const;
export const inventoryReservationPolicyValues = ["none", "soft", "hard"] as const;
export const inventoryOnlineStatusValues = ["draft", "ready", "published", "hidden", "archived"] as const;
export const inventorySerialSourceValues = ["nexora_generated", "supplier", "manual"] as const;
export const inventorySerialGenerationTimingValues = ["on_receipt", "on_production_completion", "on_packing", "manual"] as const;
export const inventoryWarrantyStartsFromValues = ["invoice_date", "delivery_date", "manual_activation"] as const;
export const inventoryCycleCountClassValues = ["A", "B", "C"] as const;

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
  commercialName: optionalText.optional(),
  costObjectKey: optionalText.optional(),
  countryOfOrigin: optionalText.optional(),
  coverImageUrl: optionalText.optional(),
  currencyId: optionalText.optional(),
  cycleCountClass: z.preprocess((value) => value === "" ? null : value, z.enum(inventoryCycleCountClassValues).nullable()).optional(),
  defaultLocationId: optionalText.optional(),
  defaultPickingStrategy: optionalText.optional(),
  defaultPutawayStrategy: optionalText.optional(),
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
  lotExpirySupported: optionalBoolean.default(false),
  lotInternalSupported: optionalBoolean.default(false),
  lotManufacturingDateSupported: optionalBoolean.default(false),
  lotQcRequired: optionalBoolean.default(false),
  lotShelfLifeSupported: optionalBoolean.default(false),
  lotSupplierSupported: optionalBoolean.default(false),
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
  packagingCartonQty: optionalPositiveInteger.optional(),
  packagingInnerBoxQty: optionalPositiveInteger.optional(),
  packagingLooseUnits: optionalBoolean.default(true),
  packagingPalletCartonQty: optionalPositiveInteger.optional(),
  purchasePrice: requiredNumber.default(0),
  purchaseUomId: optionalText.optional(),
  reorderPointQty: optionalNumber.optional(),
  allowNegativeStock: optionalBoolean.default(false),
  requiresQcBeforeRelease: optionalBoolean.default(false),
  requiresReservation: optionalBoolean.default(false),
  reservationPolicy: z.enum(inventoryReservationPolicyValues),
  retailPrice: requiredNumber.default(0),
  salesUomId: optionalText.optional(),
  sectionKey: optionalText.optional(),
  seoDescription: optionalText.optional(),
  seoKeywords: z.preprocess(csvToArray, z.array(z.string()).default([])),
  seoTitle: optionalText.optional(),
  searchKeywords: z.preprocess(csvToArray, z.array(z.string()).default([])),
  serialAllowManualOverride: optionalBoolean.default(false),
  serialDuplicateValidation: optionalBoolean.default(true),
  serialGenerationTiming: z.preprocess((value) => value === "" ? null : value, z.enum(inventorySerialGenerationTimingValues).nullable()).optional(),
  serialSource: z.preprocess((value) => value === "" ? null : value, z.enum(inventorySerialSourceValues).nullable()).optional(),
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
  warrantyDurationDays: optionalPositiveInteger.optional(),
  warrantyEligible: optionalBoolean.default(false),
  warrantyStartsFrom: z.preprocess((value) => value === "" ? null : value, z.enum(inventoryWarrantyStartsFromValues).nullable()).optional(),
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

  const tracksSerial = value.trackingMode === "serial" || value.trackingMode === "lot_serial";
  const tracksLot = value.trackingMode === "lot" || value.trackingMode === "lot_serial";
  if (tracksSerial && !value.serialSource) {
    context.addIssue({ code: "custom", message: "Choose a serial source for serial-tracked products.", path: ["serialSource"] });
  }
  if (tracksSerial && !value.serialGenerationTiming) {
    context.addIssue({ code: "custom", message: "Choose when serial numbers will be generated.", path: ["serialGenerationTiming"] });
  }
  if (!tracksSerial && (value.serialSource || value.serialGenerationTiming || value.serialAllowManualOverride)) {
    context.addIssue({ code: "custom", message: "Serial policy is only available when tracking includes serial numbers.", path: ["trackingMode"] });
  }
  if (!tracksLot && (value.lotSupplierSupported || value.lotInternalSupported || value.lotExpirySupported || value.lotManufacturingDateSupported || value.lotQcRequired || value.lotShelfLifeSupported)) {
    context.addIssue({ code: "custom", message: "Lot policy metadata is only available when tracking includes lots.", path: ["trackingMode"] });
  }
  if (value.packagingPalletCartonQty !== null && value.packagingPalletCartonQty !== undefined && (value.packagingCartonQty === null || value.packagingCartonQty === undefined)) {
    context.addIssue({ code: "custom", message: "Define carton quantity before pallet quantity.", path: ["packagingCartonQty"] });
  }
  if (value.packagingCartonQty !== null && value.packagingCartonQty !== undefined && (value.packagingInnerBoxQty === null || value.packagingInnerBoxQty === undefined)) {
    context.addIssue({ code: "custom", message: "Define inner box quantity before carton quantity.", path: ["packagingInnerBoxQty"] });
  }
  if (value.warrantyEligible && (!value.warrantyDurationDays || !value.warrantyStartsFrom)) {
    context.addIssue({ code: "custom", message: "Warranty duration and start basis are required for warranty-eligible products.", path: ["warrantyDurationDays"] });
  }
  if (value.isManufacturable) {
    if (!value.productTypeKey) {
      context.addIssue({
        code: "custom",
        message: "Choose a manufacturing role for manufacturable products (raw material, semi-finished, finished good, or packaging).",
        path: ["productTypeKey"],
      });
    } else if (!isInventoryManufacturingItemRole(value.productTypeKey)) {
      context.addIssue({
        code: "custom",
        message: "Manufacturing role must be raw_material, semi_finished, finished_good, or packaging.",
        path: ["productTypeKey"],
      });
    }
  } else if (value.productTypeKey && isInventoryManufacturingItemRole(value.productTypeKey)) {
    // Allow clearing manufacturable while keeping historical role key; no issue.
  }
});
