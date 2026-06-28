"use server";

import { revalidatePath } from "next/cache";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";
import { generateNextBusinessCode, setGeneratedBusinessCode } from "@/shared/business-codes-server";

import { inventoryProductMutationSchema, parseDelimitedList } from "../../application/schemas/inventory-products.schema";
import type { InventoryProductRecord } from "../../application/types/inventory-products";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import { PRODUCT_COLUMNS } from "../loaders/inventory-products.loader";

const basePath = "/erp/inventory/products";
const productCodeConfig = { prefix: "PROD", scope: "company" } as const;

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function createParts() {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.productsManage });
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  return { context, supabase };
}

function nullableUpper(value: string | null | undefined) {
  return value ? value.toUpperCase() : null;
}

function nullableLower(value: string | null | undefined) {
  return value ? value.toLowerCase() : null;
}

function toPayload(input: ReturnType<typeof inventoryProductMutationSchema.parse>, context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>) {
  const isArchived = input.status === "archived";

  return {
    allow_ratings: input.allowRatings,
    allow_reviews: input.allowReviews,
    base_uom_id: input.baseUomId,
    barcode: nullableUpper(input.barcode),
    brand: input.brand ?? null,
    branch_id: input.branchId ?? null,
    canonical_url: input.canonicalUrl ?? null,
    category_id: input.categoryId,
    commission_rate: input.commissionRate,
    company_id: context.companyId,
    country_of_origin: input.countryOfOrigin ?? null,
    cover_image_url: input.coverImageUrl ?? null,
    cost_object_key: input.costObjectKey ?? null,
    currency_id: input.currencyId ?? null,
    default_location_id: input.defaultLocationId ?? null,
    default_warehouse_id: input.defaultWarehouseId ?? null,
    description: input.description ?? null,
    discount_allowed: input.discountAllowed,
    finance_dimension_key: input.financeDimensionKey ?? null,
    gallery_urls: input.galleryUrls,
    has_lot_tracking: input.hasLotTracking || input.trackingMode === "lot",
    has_serial_tracking: input.hasSerialTracking || input.trackingMode === "serial",
    has_variants: input.hasVariants,
    height: input.height ?? null,
    hs_code: input.hsCode ?? null,
    internal_notes: input.internalNotes ?? null,
    is_active: !isArchived && input.status !== "inactive",
    is_best_seller: input.isBestSeller,
    is_discountable: input.isDiscountable,
    is_featured: input.isFeatured,
    is_manufacturable: input.isManufacturable,
    is_new_arrival: input.isNewArrival,
    is_online_visible: input.isOnlineVisible || (input.onlineEnabled && input.onlineStatus === "published"),
    is_purchasable: input.isPurchasable,
    is_sellable: input.isSellable,
    is_service: input.isService || input.productKind === "service",
    is_stockable: input.isStockable,
    length: input.length ?? null,
    manual_urls: input.manualUrls,
    maximum_stock_qty: input.maximumStockQty ?? null,
    minimum_stock_qty: input.minimumStockQty,
    name: input.name,
    name_ar: input.nameAr ?? null,
    og_image_url: input.ogImageUrl ?? null,
    online_enabled: input.onlineEnabled,
    online_features: input.onlineFeatures,
    online_long_description: input.onlineLongDescription ?? null,
    online_package_contents: input.onlinePackageContents,
    online_price: input.onlinePrice,
    online_short_description: input.onlineShortDescription ?? null,
    online_slug: nullableLower(input.onlineSlug),
    online_specifications: input.onlineSpecifications,
    online_status: input.onlineStatus,
    online_title: input.onlineTitle ?? null,
    opening_balance_qty: input.openingBalanceQty,
    price_includes_tax: input.priceIncludesTax,
    product_category_id: input.categoryId,
    product_key: input.productKey.toLowerCase(),
    product_kind: input.productKind,
    product_type_key: nullableLower(input.productTypeKey),
    purchase_price: input.purchasePrice,
    purchase_uom_id: input.purchaseUomId ?? null,
    reorder_point_qty: input.reorderPointQty ?? null,
    reservation_policy: input.reservationPolicy,
    retail_price: input.retailPrice,
    sales_uom_id: input.salesUomId ?? null,
    section_key: nullableLower(input.sectionKey),
    seo_description: input.seoDescription ?? null,
    seo_keywords: input.seoKeywords,
    seo_title: input.seoTitle ?? null,
    shipping_class: input.shippingClass ?? null,
    short_name: input.shortName ?? null,
    sku: input.sku.toUpperCase(),
    status: input.status,
    subcategory_id: input.subcategoryId ?? null,
    supplier_party_id: input.supplierPartyId ?? null,
    tax_definition_id: input.taxDefinitionId ?? null,
    tenant_id: context.tenantId,
    tracking_mode: input.trackingMode,
    updated_by: context.userId,
    video_urls: input.videoUrls,
    volume: input.volume ?? null,
    weight: input.weight ?? null,
    wholesale_price: input.wholesalePrice,
    width: input.width ?? null,
  };
}

function jsonArray(rowValue: unknown): string[] {
  return Array.isArray(rowValue) ? rowValue.filter((value): value is string => typeof value === "string") : [];
}

function jsonObject(rowValue: unknown): Record<string, string> {
  if (!rowValue || typeof rowValue !== "object" || Array.isArray(rowValue)) return {};
  return Object.fromEntries(Object.entries(rowValue).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value ?? fallback);
}

function nullableNumber(value: unknown) {
  return value === null || typeof value === "undefined" ? null : numberValue(value);
}

function mapSavedProduct(row: Record<string, unknown>): InventoryProductRecord {
  return {
    allowRatings: row.allow_ratings as boolean,
    allowReviews: row.allow_reviews as boolean,
    baseUomId: row.base_uom_id as string,
    baseUomLabel: null,
    barcode: row.barcode as string | null,
    brand: row.brand as string | null,
    branchId: row.branch_id as string | null,
    canonicalUrl: row.canonical_url as string | null,
    categoryId: (row.category_id ?? row.product_category_id) as string | null,
    categoryLabel: null,
    commissionRate: numberValue(row.commission_rate),
    companyId: row.company_id as string,
    countryOfOrigin: row.country_of_origin as string | null,
    coverImageUrl: row.cover_image_url as string | null,
    costObjectKey: row.cost_object_key as string | null,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | null,
    currencyId: row.currency_id as string | null,
    currencyLabel: null,
    defaultLocationId: row.default_location_id as string | null,
    defaultWarehouseId: row.default_warehouse_id as string | null,
    description: row.description as string | null,
    discountAllowed: row.discount_allowed as boolean,
    financeDimensionKey: row.finance_dimension_key as string | null,
    galleryUrls: jsonArray(row.gallery_urls),
    hasLotTracking: row.has_lot_tracking as boolean,
    hasSerialTracking: row.has_serial_tracking as boolean,
    hasVariants: row.has_variants as boolean,
    height: nullableNumber(row.height),
    hsCode: row.hs_code as string | null,
    id: row.id as string,
    internalNotes: row.internal_notes as string | null,
    isActive: row.is_active as boolean,
    isBestSeller: row.is_best_seller as boolean,
    isDiscountable: row.is_discountable as boolean,
    isFeatured: row.is_featured as boolean,
    isManufacturable: row.is_manufacturable as boolean,
    isNewArrival: row.is_new_arrival as boolean,
    isOnlineVisible: row.is_online_visible as boolean,
    isPurchasable: row.is_purchasable as boolean,
    isSellable: row.is_sellable as boolean,
    isService: row.is_service as boolean,
    isStockable: row.is_stockable as boolean,
    length: nullableNumber(row.length),
    manualUrls: jsonArray(row.manual_urls),
    maximumStockQty: nullableNumber(row.maximum_stock_qty),
    minimumStockQty: numberValue(row.minimum_stock_qty),
    name: row.name as string,
    nameAr: row.name_ar as string | null,
    ogImageUrl: row.og_image_url as string | null,
    onlineEnabled: row.online_enabled as boolean,
    onlineFeatures: jsonArray(row.online_features),
    onlineLongDescription: row.online_long_description as string | null,
    onlinePackageContents: jsonArray(row.online_package_contents),
    onlinePrice: numberValue(row.online_price),
    onlineShortDescription: row.online_short_description as string | null,
    onlineSlug: row.online_slug as string | null,
    onlineSpecifications: jsonObject(row.online_specifications),
    onlineStatus: row.online_status as InventoryProductRecord["onlineStatus"],
    onlineTitle: row.online_title as string | null,
    openingBalanceQty: numberValue(row.opening_balance_qty),
    priceIncludesTax: row.price_includes_tax as boolean,
    productCategoryId: row.product_category_id as string | null,
    productTypeKey: row.product_type_key as string | null,
    purchasePrice: numberValue(row.purchase_price),
    purchaseUomId: row.purchase_uom_id as string | null,
    reorderPointQty: nullableNumber(row.reorder_point_qty),
    productKey: row.product_key as InventoryProductRecord["productKey"],
    productKind: row.product_kind as InventoryProductRecord["productKind"],
    reservationPolicy: row.reservation_policy as InventoryProductRecord["reservationPolicy"],
    retailPrice: numberValue(row.retail_price),
    salesUomId: row.sales_uom_id as string | null,
    sectionKey: row.section_key as string | null,
    seoDescription: row.seo_description as string | null,
    seoKeywords: jsonArray(row.seo_keywords),
    seoTitle: row.seo_title as string | null,
    shippingClass: row.shipping_class as string | null,
    shortName: row.short_name as string | null,
    sku: row.sku as string,
    status: row.status as InventoryProductRecord["status"],
    subcategoryId: row.subcategory_id as string | null,
    subcategoryLabel: null,
    supplierLabel: null,
    supplierPartyId: row.supplier_party_id as string | null,
    taxDefinitionId: row.tax_definition_id as string | null,
    taxDefinitionLabel: null,
    tenantId: row.tenant_id as string,
    trackingMode: row.tracking_mode as InventoryProductRecord["trackingMode"],
    updatedAt: row.updated_at as string,
    updatedBy: row.updated_by as string | null,
    archivedAt: row.archived_at as string | null,
    archivedBy: row.archived_by as string | null,
    videoUrls: jsonArray(row.video_urls),
    volume: nullableNumber(row.volume),
    weight: nullableNumber(row.weight),
    wholesalePrice: numberValue(row.wholesale_price),
    width: nullableNumber(row.width),
    version: row.version as number,
  };
}

async function replaceProductChildren(params: {
  context: Awaited<ReturnType<typeof resolveCompanyRequestContext>>;
  input: ReturnType<typeof inventoryProductMutationSchema.parse>;
  productId: string;
  supabase: ReturnType<typeof createRequestSupabaseClient>;
}) {
  const { context, input, productId, supabase } = params;
  const now = new Date().toISOString();
  const scope = { branch_id: input.branchId ?? null, company_id: context.companyId, tenant_id: context.tenantId };
  const baseUpdate = { deleted_at: now, deleted_by: context.userId, is_active: false, updated_by: context.userId };

  await Promise.all([
    supabase.from("inventory_product_units").update(baseUpdate).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("product_id", productId).is("deleted_at", null),
    supabase.from("inventory_product_prices").update(baseUpdate).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("product_id", productId).is("deleted_at", null),
    supabase.from("inventory_product_media").update(baseUpdate).eq("tenant_id", context.tenantId).eq("company_id", context.companyId).eq("product_id", productId).is("deleted_at", null),
  ]);

  const unitRows = [
    { uom_id: input.baseUomId, conversion_factor: 1, barcode: nullableUpper(input.barcode), is_base: true, is_purchase_default: input.purchaseUomId === input.baseUomId || !input.purchaseUomId, is_sales_default: input.salesUomId === input.baseUomId || !input.salesUomId, is_online_default: true },
    input.purchaseUomId && input.purchaseUomId !== input.baseUomId ? { uom_id: input.purchaseUomId, conversion_factor: 1, barcode: null, is_base: false, is_purchase_default: true, is_sales_default: false, is_online_default: false } : null,
    input.salesUomId && input.salesUomId !== input.baseUomId && input.salesUomId !== input.purchaseUomId ? { uom_id: input.salesUomId, conversion_factor: 1, barcode: null, is_base: false, is_purchase_default: false, is_sales_default: true, is_online_default: false } : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (unitRows.length > 0) {
    const { error } = await supabase.from("inventory_product_units").insert(unitRows.map((row) => ({ ...scope, ...row, product_id: productId, created_by: context.userId, updated_by: context.userId })));
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save product units.", cause: error });
  }

  const priceRows = [
    { price_type: "purchase", price: input.purchasePrice },
    { price_type: "retail", price: input.retailPrice },
    { price_type: "wholesale", price: input.wholesalePrice },
    { price_type: "online", price: input.onlinePrice },
  ];

  const { error: priceError } = await supabase.from("inventory_product_prices").insert(priceRows.map((row) => ({ ...scope, ...row, product_id: productId, currency_id: input.currencyId ?? null, created_by: context.userId, updated_by: context.userId })));
  if (priceError) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save product prices.", cause: priceError });

  const mediaRows = [
    input.coverImageUrl ? { media_type: "image", url: input.coverImageUrl, title: "Cover image", alt_text: input.name, sort_order: 0, is_cover: true } : null,
    ...parseDelimitedList(input.galleryUrls.join("\n")).map((url, index) => ({ media_type: "image", url, title: null, alt_text: input.name, sort_order: index + 1, is_cover: false })),
    ...parseDelimitedList(input.videoUrls.join("\n")).map((url, index) => ({ media_type: "video", url, title: null, alt_text: null, sort_order: index, is_cover: false })),
    ...parseDelimitedList(input.manualUrls.join("\n")).map((url, index) => ({ media_type: "manual", url, title: null, alt_text: null, sort_order: index, is_cover: false })),
    ...parseDelimitedList(input.attachmentUrls.join("\n")).map((url, index) => ({ media_type: "attachment", url, title: null, alt_text: null, sort_order: index, is_cover: false })),
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (mediaRows.length > 0) {
    const { error } = await supabase.from("inventory_product_media").insert(mediaRows.map((row) => ({ ...scope, ...row, product_id: productId, created_by: context.userId, updated_by: context.userId })));
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not save product media.", cause: error });
  }
}

function throwProductSaveError(error: unknown, fallback: string): never {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : fallback;
  if (message.includes("inventory_products_scope_sku_uq")) {
    throw new ApplicationError({ code: "CONFLICT", message: "SKU is already used by another product.", cause: error });
  }
  if (message.includes("inventory_products_scope_barcode_uq")) {
    throw new ApplicationError({ code: "CONFLICT", message: "Barcode is already used by another product.", cause: error });
  }
  if (message.includes("inventory_products_scope_online_slug_uq")) {
    throw new ApplicationError({ code: "CONFLICT", message: "Online slug is already used by another product.", cause: error });
  }
  throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: fallback, cause: error });
}

export async function createInventoryProductAction(formData: FormData): Promise<InventoryProductRecord> {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  setGeneratedBusinessCode(rawInput, "productKey", await generateNextBusinessCode(supabase, {
    column: "product_key",
    config: productCodeConfig,
    scope: { companyId: context.companyId, tenantId: context.tenantId },
    table: "inventory_products",
  }));
  const input = inventoryProductMutationSchema.parse(rawInput);
  const { data, error } = await supabase
    .from("inventory_products")
    .insert({ ...toPayload(input, context), created_by: context.userId })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throwProductSaveError(error, "Could not create inventory product.");
  }

  const savedRow = data as unknown as Record<string, unknown>;
  await replaceProductChildren({ context, input, productId: savedRow.id as string, supabase });
  revalidatePath(basePath);
  return mapSavedProduct(savedRow);
}

export async function updateInventoryProductAction(id: string, formData: FormData): Promise<InventoryProductRecord> {
  const { context, supabase } = await createParts();
  const rawInput = formDataToObject(formData);
  if (typeof rawInput.productKey !== "string" || rawInput.productKey.trim().length === 0) {
    const { data, error } = await supabase
      .from("inventory_products")
      .select("product_key")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read existing product code.", cause: error });
    rawInput.productKey = data.product_key as string;
  }
  const input = inventoryProductMutationSchema.parse(rawInput);
  const { data, error } = await supabase
    .from("inventory_products")
    .update(toPayload(input, context))
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    throwProductSaveError(error, "Could not update inventory product.");
  }

  await replaceProductChildren({ context, input, productId: id, supabase });
  revalidatePath(basePath);
  return mapSavedProduct(data as unknown as Record<string, unknown>);
}

export async function archiveInventoryProductAction(id: string) {
  const { context, supabase } = await createParts();
  const { error } = await supabase
    .from("inventory_products")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: context.userId,
      deleted_at: new Date().toISOString(),
      deleted_by: context.userId,
      is_active: false,
      status: "archived",
      updated_by: context.userId,
    })
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not archive inventory product.", cause: error });
  }

  revalidatePath(basePath);
}
