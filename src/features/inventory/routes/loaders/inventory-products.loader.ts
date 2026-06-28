import "server-only";

import { ApplicationError } from "@/core/errors";
import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { inventoryProductListQuerySchema } from "../../application/schemas/inventory-products.schema";
import type { InventoryProductRecord, InventoryProductWorkspaceData } from "../../application/types/inventory-products";
import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export type { InventoryProductRecord, InventoryProductWorkspaceData } from "../../application/types/inventory-products";

export const PRODUCT_COLUMNS = [
  "id",
  "tenant_id",
  "company_id",
  "branch_id",
  "product_category_id",
  "category_id",
  "subcategory_id",
  "base_uom_id",
  "purchase_uom_id",
  "sales_uom_id",
  "default_warehouse_id",
  "default_location_id",
  "product_key",
  "sku",
  "barcode",
  "name",
  "name_ar",
  "short_name",
  "description",
  "internal_notes",
  "product_kind",
  "tracking_mode",
  "reservation_policy",
  "brand",
  "supplier_party_id",
  "section_key",
  "product_type_key",
  "opening_balance_qty",
  "minimum_stock_qty",
  "maximum_stock_qty",
  "reorder_point_qty",
  "weight",
  "length",
  "width",
  "height",
  "volume",
  "country_of_origin",
  "hs_code",
  "shipping_class",
  "purchase_price",
  "retail_price",
  "wholesale_price",
  "online_price",
  "discount_allowed",
  "commission_rate",
  "price_includes_tax",
  "tax_definition_id",
  "currency_id",
  "online_enabled",
  "online_status",
  "online_slug",
  "online_title",
  "online_short_description",
  "online_long_description",
  "online_features",
  "online_specifications",
  "online_package_contents",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "og_image_url",
  "canonical_url",
  "is_featured",
  "is_new_arrival",
  "is_best_seller",
  "allow_reviews",
  "allow_ratings",
  "cover_image_url",
  "gallery_urls",
  "video_urls",
  "manual_urls",
  "is_stockable",
  "is_sellable",
  "is_purchasable",
  "is_manufacturable",
  "is_service",
  "has_variants",
  "has_serial_tracking",
  "has_lot_tracking",
  "is_discountable",
  "is_online_visible",
  "cost_object_key",
  "finance_dimension_key",
  "status",
  "is_active",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "archived_at",
  "archived_by",
  "version",
].join(", ");

type LookupMaps = Readonly<{
  categories: ReadonlyMap<string, string>;
  currencies: ReadonlyMap<string, string>;
  suppliers: ReadonlyMap<string, string>;
  taxes: ReadonlyMap<string, string>;
  uoms: ReadonlyMap<string, string>;
}>;

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function encodeCursor(record: InventoryProductRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
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

function lookupLabel(map: ReadonlyMap<string, string>, id: unknown) {
  return typeof id === "string" ? map.get(id) ?? null : null;
}

function mapProduct(row: Record<string, unknown>, lookups?: LookupMaps): InventoryProductRecord {
  const categoryId = (row.category_id ?? row.product_category_id) as string | null;

  return {
    allowRatings: row.allow_ratings as boolean,
    allowReviews: row.allow_reviews as boolean,
    baseUomId: row.base_uom_id as string,
    baseUomLabel: lookupLabel(lookups?.uoms ?? new Map(), row.base_uom_id),
    barcode: row.barcode as string | null,
    brand: row.brand as string | null,
    branchId: row.branch_id as string | null,
    canonicalUrl: row.canonical_url as string | null,
    categoryId,
    categoryLabel: lookupLabel(lookups?.categories ?? new Map(), categoryId),
    commissionRate: numberValue(row.commission_rate),
    companyId: row.company_id as string,
    countryOfOrigin: row.country_of_origin as string | null,
    coverImageUrl: row.cover_image_url as string | null,
    costObjectKey: row.cost_object_key as string | null,
    createdAt: row.created_at as string,
    createdBy: row.created_by as string | null,
    currencyId: row.currency_id as string | null,
    currencyLabel: lookupLabel(lookups?.currencies ?? new Map(), row.currency_id),
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
    productKey: row.product_key as InventoryProductRecord["productKey"],
    productKind: row.product_kind as InventoryProductRecord["productKind"],
    purchasePrice: numberValue(row.purchase_price),
    purchaseUomId: row.purchase_uom_id as string | null,
    reorderPointQty: nullableNumber(row.reorder_point_qty),
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
    subcategoryLabel: lookupLabel(lookups?.categories ?? new Map(), row.subcategory_id),
    supplierLabel: lookupLabel(lookups?.suppliers ?? new Map(), row.supplier_party_id),
    supplierPartyId: row.supplier_party_id as string | null,
    taxDefinitionId: row.tax_definition_id as string | null,
    taxDefinitionLabel: lookupLabel(lookups?.taxes ?? new Map(), row.tax_definition_id),
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

export async function loadInventoryProductsWorkspace(query: unknown = {}): Promise<InventoryProductWorkspaceData> {
  const context = await resolveCompanyRequestContext("erp");
  await requirePermission({ context, permission: INVENTORY_PERMISSIONS.productsView });

  const parsed = inventoryProductListQuerySchema.parse(query);
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);
  let request = supabase
    .from("inventory_products")
    .select(PRODUCT_COLUMNS)
    .eq("tenant_id", context.tenantId)
    .eq("company_id", context.companyId)
    .is("deleted_at", null)
    .limit(pageSize + 1);

  if (parsed.categoryId) request = request.eq("category_id", parsed.categoryId);
  if (parsed.hasLotTracking) request = request.eq("has_lot_tracking", true);
  if (parsed.hasSerialTracking) request = request.eq("has_serial_tracking", true);
  if (parsed.hasVariants) request = request.eq("has_variants", true);
  if (parsed.onlineStatus) request = request.eq("online_status", parsed.onlineStatus);
  if (parsed.productKind) request = request.eq("product_kind", parsed.productKind);
  if (parsed.sellable) request = request.eq("is_sellable", true);
  if (parsed.status) request = request.eq("status", parsed.status);
  if (parsed.stockable) request = request.eq("is_stockable", true);
  if (parsed.purchasable) request = request.eq("is_purchasable", true);
  if (parsed.trackingMode) request = request.eq("tracking_mode", parsed.trackingMode);

  if (parsed.search) {
    const term = parsed.search.replaceAll("%", "").trim();
    if (term.length > 0) request = request.or(`product_key.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%,name.ilike.%${term}%,name_ar.ilike.%${term}%,online_title.ilike.%${term}%,brand.ilike.%${term}%`);
  }

  const cursor = decodeCursor(parsed.cursor);
  if (cursor) request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);

  const [productResult, categoryResult, uomResult, branchResult, warehouseResult, locationResult, supplierResult, currencyResult, taxResult] = await Promise.all([
    request.order("created_at", { ascending: false }).order("id", { ascending: false }),
    supabase
      .from("inventory_product_categories")
      .select("id, category_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_uoms")
      .select("id, uom_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("branches")
      .select("id, code, name")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_warehouses")
      .select("id, warehouse_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_locations")
      .select("id, location_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("parties")
      .select("id, party_number, display_name")
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .order("display_name", { ascending: true }),
    supabase
      .from("finance_currencies")
      .select("id, currency_code, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("currency_code", { ascending: true }),
    supabase
      .from("finance_tax_definitions")
      .select("id, tax_key, name")
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  if (productResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load inventory products.", cause: productResult.error });
  }

  if (categoryResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load product categories.", cause: categoryResult.error });
  }

  if (uomResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load UOM records.", cause: uomResult.error });
  }

  if (branchResult.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load branch records.", cause: branchResult.error });
  }

  const optionalLookupFailure = [warehouseResult, locationResult, supplierResult, currencyResult, taxResult].find((result) => result.error);
  if (optionalLookupFailure?.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not load product lookup data.", cause: optionalLookupFailure.error });
  }

  const categories = (categoryResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.category_key as string} — ${row.name as string}`,
  }));
  const uoms = (uomResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.uom_key as string} — ${row.name as string}`,
  }));
  const suppliers = (supplierResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: [row.party_number, row.display_name].filter(Boolean).join(" — "),
  }));
  const currencies = (currencyResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.currency_code as string} — ${row.name as string}`,
  }));
  const taxes = (taxResult.data ?? []).map((row) => ({
    id: row.id as string,
    label: `${row.tax_key as string} — ${row.name as string}`,
  }));
  const lookupMaps: LookupMaps = {
    categories: new Map(categories.map((option) => [option.id, option.label])),
    currencies: new Map(currencies.map((option) => [option.id, option.label])),
    suppliers: new Map(suppliers.map((option) => [option.id, option.label])),
    taxes: new Map(taxes.map((option) => [option.id, option.label])),
    uoms: new Map(uoms.map((option) => [option.id, option.label])),
  };
  let records = (productResult.data ?? []).map((row) => mapProduct(row as unknown as Record<string, unknown>, lookupMaps));

  const editId = typeof (query as Record<string, unknown>).edit === "string" ? (query as Record<string, string>).edit : null;
  if (editId && !records.some((record) => record.id === editId)) {
    const { data: editRecord, error: editError } = await supabase
      .from("inventory_products")
      .select(PRODUCT_COLUMNS)
      .eq("tenant_id", context.tenantId)
      .eq("company_id", context.companyId)
      .eq("id", editId)
      .is("deleted_at", null)
      .single();
    if (!editError && editRecord) records = [mapProduct(editRecord as unknown as Record<string, unknown>, lookupMaps), ...records];
  }

  const visibleRecords = records.slice(0, pageSize);

  return {
    branches: (branchResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: `${row.code as string} — ${row.name as string}`,
    })),
    categories,
    currencies,
    locations: (locationResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: `${row.location_key as string} — ${row.name as string}`,
    })),
    nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
    pageSize,
    records: visibleRecords,
    subcategories: categories,
    suppliers,
    taxDefinitions: taxes,
    uoms,
    warehouses: (warehouseResult.data ?? []).map((row) => ({
      id: row.id as string,
      label: `${row.warehouse_key as string} — ${row.name as string}`,
    })),
  };
}
