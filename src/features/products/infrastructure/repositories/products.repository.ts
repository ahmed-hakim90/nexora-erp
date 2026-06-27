import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { ProductRepository } from "../../application/ports/products.repository";
import type { CursorPage, MasterDataListQuery, ProductCreateInput, ProductRecord, ProductUpdateInput } from "../../application/types";

const TABLE_NAME = "products";
const SELECT_COLUMNS = "id, tenant_id, branch_id, sku, barcode, name_ar, name_en, category_id, brand_id, product_type, unit_id, default_purchase_unit_id, default_sales_unit_id, costing_settings, sales_settings, purchase_settings, inventory_settings, is_manufacturable, is_stockable, is_sellable, is_purchasable, image_metadata, is_active, created_at, updated_at, version";
const SEARCH_COLUMNS = ["sku","barcode","name_ar","name_en"];

function mapRow(row: Record<string, unknown>): ProductRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    sku: row.sku as string,
    barcode: row.barcode as string | null,
    nameAr: row.name_ar as string,
    nameEn: row.name_en as string,
    categoryId: row.category_id as string | null,
    brandId: row.brand_id as string | null,
    productType: row.product_type as string,
    unitId: row.unit_id as string | null,
    defaultPurchaseUnitId: row.default_purchase_unit_id as string | null,
    defaultSalesUnitId: row.default_sales_unit_id as string | null,
    costingSettings: row.costing_settings as Record<string, unknown>,
    salesSettings: row.sales_settings as Record<string, unknown>,
    purchaseSettings: row.purchase_settings as Record<string, unknown>,
    inventorySettings: row.inventory_settings as Record<string, unknown>,
    isManufacturable: row.is_manufacturable as boolean,
    isStockable: row.is_stockable as boolean,
    isSellable: row.is_sellable as boolean,
    isPurchasable: row.is_purchasable as boolean,
    imageMetadata: row.image_metadata as Record<string, unknown>,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    version: row.version as number,
  };
}

function normalizeValue(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizePayload(input: ProductCreateInput | ProductUpdateInput, context: TenantRequestContext) {
  const payload: Record<string, unknown> = {
    tenant_id: context.tenantId,
    updated_by: context.userId,
    sku: normalizeValue(input.sku),
    barcode: normalizeValue(input.barcode),
    name_ar: normalizeValue(input.nameAr),
    name_en: normalizeValue(input.nameEn),
    category_id: normalizeValue(input.categoryId),
    brand_id: normalizeValue(input.brandId),
    product_type: normalizeValue(input.productType),
    unit_id: normalizeValue(input.unitId),
    default_purchase_unit_id: normalizeValue(input.defaultPurchaseUnitId),
    default_sales_unit_id: normalizeValue(input.defaultSalesUnitId),
    is_manufacturable: input.isManufacturable === true,
    is_stockable: input.isStockable !== false,
    is_sellable: input.isSellable !== false,
    is_purchasable: input.isPurchasable !== false,
  };

  payload.branch_id = normalizeValue(input.branchId);

  for (const key of Object.keys(payload)) {
    if (payload[key] === null && ["name_ar", "name_en"].includes(key)) {
      delete payload[key];
    }
  }

  if ("sku" in payload && typeof payload.sku === "string") payload.sku = payload.sku.toUpperCase();
  if ("code" in payload && typeof payload.code === "string") payload.code = payload.code.toUpperCase();
  if ("customer_code" in payload && typeof payload.customer_code === "string") payload.customer_code = payload.customer_code.toUpperCase();
  if ("supplier_code" in payload && typeof payload.supplier_code === "string") payload.supplier_code = payload.supplier_code.toUpperCase();
  if ("warehouse_code" in payload && typeof payload.warehouse_code === "string") payload.warehouse_code = payload.warehouse_code.toUpperCase();
  if ("location_code" in payload && typeof payload.location_code === "string") payload.location_code = payload.location_code.toUpperCase();
  if ("currency_code" in payload && typeof payload.currency_code === "string") payload.currency_code = payload.currency_code.toUpperCase();
  if ("email" in payload && typeof payload.email === "string") payload.email = payload.email.toLowerCase();
  if ("tax_rate" in payload && payload.tax_rate !== null) payload.tax_rate = Number(payload.tax_rate);

  return payload;
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function encodeCursor(record: ProductRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

export class SupabaseProductRepository implements ProductRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async list(query: MasterDataListQuery): Promise<CursorPage<ProductRecord>> {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.supabase
      .from(TABLE_NAME)
      .select(SELECT_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .limit(pageSize + 1);

    if (query.isActive !== undefined) {
      request = request.eq("is_active", query.isActive);
    }

    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term.length > 0) {
        request = request.or(SEARCH_COLUMNS.map((column) => `${column}.ilike.%${term}%`).join(","));
      }
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    request = request.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error } = await request;

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not list Products.", cause: error });
    }

    const records = (data ?? []).map(mapRow);
    const visibleRecords = records.slice(0, pageSize);

    return {
      records: visibleRecords,
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
    };
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select(SELECT_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read Product.", cause: error });
    }

    return data ? mapRow(data) : null;
  }

  async create(input: ProductCreateInput): Promise<ProductRecord> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .insert({ ...normalizePayload(input, this.context), created_by: this.context.userId })
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create Product.", cause: error });
    }

    return mapRow(data);
  }

  async update(id: string, input: ProductUpdateInput): Promise<ProductRecord> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .update(normalizePayload(input, this.context))
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update Product.", cause: error });
    }

    return mapRow(data);
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not soft delete Product.", cause: error });
    }
  }
}
