import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { WarehouseLocationRepository } from "../../application/ports/warehouse-locations.repository";
import type { CursorPage, MasterDataListQuery, WarehouseLocationCreateInput, WarehouseLocationRecord, WarehouseLocationUpdateInput } from "../../application/types";

const TABLE_NAME = "warehouse_locations";
const SELECT_COLUMNS = "id, tenant_id, branch_id, location_code, name_ar, name_en, warehouse_id, parent_location_id, location_type, is_active, created_at, updated_at, version";
const SEARCH_COLUMNS = ["location_code","name_ar","name_en"];

function mapRow(row: Record<string, unknown>): WarehouseLocationRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    branchId: row.branch_id as string | null,
    locationCode: row.location_code as string,
    nameAr: row.name_ar as string,
    nameEn: row.name_en as string,
    warehouseId: row.warehouse_id as string | null,
    parentLocationId: row.parent_location_id as string | null,
    locationType: row.location_type as string,
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

function normalizePayload(input: WarehouseLocationCreateInput | WarehouseLocationUpdateInput, context: TenantRequestContext) {
  const payload: Record<string, unknown> = {
    tenant_id: context.tenantId,
    updated_by: context.userId,
    location_code: normalizeValue(input.locationCode),
    name_ar: normalizeValue(input.nameAr),
    name_en: normalizeValue(input.nameEn),
    warehouse_id: normalizeValue(input.warehouseId),
    parent_location_id: normalizeValue(input.parentLocationId),
    location_type: normalizeValue(input.locationType),
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

function encodeCursor(record: WarehouseLocationRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

export class SupabaseWarehouseLocationRepository implements WarehouseLocationRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async list(query: MasterDataListQuery): Promise<CursorPage<WarehouseLocationRecord>> {
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
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not list Warehouse Locations.", cause: error });
    }

    const records = (data ?? []).map(mapRow);
    const visibleRecords = records.slice(0, pageSize);

    return {
      records: visibleRecords,
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
    };
  }

  async findById(id: string): Promise<WarehouseLocationRecord | null> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select(SELECT_COLUMNS)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not read WarehouseLocation.", cause: error });
    }

    return data ? mapRow(data) : null;
  }

  async create(input: WarehouseLocationCreateInput): Promise<WarehouseLocationRecord> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .insert({ ...normalizePayload(input, this.context), created_by: this.context.userId })
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not create WarehouseLocation.", cause: error });
    }

    return mapRow(data);
  }

  async update(id: string, input: WarehouseLocationUpdateInput): Promise<WarehouseLocationRecord> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .update(normalizePayload(input, this.context))
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not update WarehouseLocation.", cause: error });
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
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: "Could not soft delete WarehouseLocation.", cause: error });
    }
  }
}
