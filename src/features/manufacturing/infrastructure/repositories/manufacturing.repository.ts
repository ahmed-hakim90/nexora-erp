import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { ManufacturingRepository } from "../../application/ports/manufacturing.repository";
import type { CursorPage, ManufacturingListQuery, ManufacturingMutationInput, ManufacturingRecord, ManufacturingResourceDefinition } from "../../application/types";

function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function mapRow(row: Record<string, unknown>): ManufacturingRecord {
  const record: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    record[toCamelCase(key)] = value;
  }

  return record as ManufacturingRecord;
}

function normalizeValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  const text = String(value).trim();
  if (text.length === 0) return null;
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

function normalizePayload(input: ManufacturingMutationInput, context: TenantRequestContext) {
  const payload: Record<string, unknown> = {
    tenant_id: context.tenantId,
    updated_by: context.userId,
  };

  for (const [key, value] of Object.entries(input)) {
    payload[toSnakeCase(key)] = normalizeValue(value);
  }

  for (const codeKey of ["line_code", "code", "employee_code", "manufacturing_code", "version_code"]) {
    if (typeof payload[codeKey] === "string") payload[codeKey] = String(payload[codeKey]).toUpperCase();
  }

  for (const numericKey of [
    "display_order",
    "daily_working_hours",
    "max_workers",
    "capacity",
    "standard_hours",
    "daily_target_qty",
    "hourly_target_qty",
    "standard_cycle_time_seconds",
    "standard_crew_size",
    "efficiency_target_percent",
    "total_standard_time_seconds",
    "total_man_time_seconds",
    "target_unit_seconds",
  ]) {
    if (payload[numericKey] !== null && payload[numericKey] !== undefined) payload[numericKey] = Number(payload[numericKey]);
  }

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

function encodeCursor(record: ManufacturingRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

export class SupabaseManufacturingRepository implements ManufacturingRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: TenantRequestContext,
  ) {}

  async list(definition: ManufacturingResourceDefinition, query: ManufacturingListQuery): Promise<CursorPage<ManufacturingRecord>> {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.supabase
      .from(definition.tableName)
      .select(definition.selectColumns)
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .limit(pageSize + 1);

    if (query.isActive !== undefined) {
      request = request.eq("is_active", query.isActive);
    }

    if (query.search) {
      const term = query.search.replaceAll("%", "").trim();
      if (term.length > 0 && definition.searchColumns.length > 0) {
        request = request.or(definition.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(","));
      }
    }

    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      request = request.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    }

    request = request.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error } = await request;

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not list ${definition.title}.`, cause: error });
    }

    const records = (data ?? []).map((row) => mapRow(row as unknown as Record<string, unknown>));
    const visibleRecords = records.slice(0, pageSize);

    return {
      records: visibleRecords,
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
    };
  }

  async findById(definition: ManufacturingResourceDefinition, id: string): Promise<ManufacturingRecord | null> {
    const { data, error } = await this.supabase
      .from(definition.tableName)
      .select(definition.selectColumns)
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not read ${definition.singularTitle}.`, cause: error });
    }

    return data ? mapRow(data as unknown as Record<string, unknown>) : null;
  }

  async create(definition: ManufacturingResourceDefinition, input: ManufacturingMutationInput): Promise<ManufacturingRecord> {
    const { data, error } = await this.supabase
      .from(definition.tableName)
      .insert({ ...normalizePayload(input, this.context), created_by: this.context.userId })
      .select(definition.selectColumns)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not create ${definition.singularTitle}.`, cause: error });
    }

    return mapRow(data as unknown as Record<string, unknown>);
  }

  async update(definition: ManufacturingResourceDefinition, id: string, input: ManufacturingMutationInput): Promise<ManufacturingRecord> {
    const { data, error } = await this.supabase
      .from(definition.tableName)
      .update(normalizePayload(input, this.context))
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select(definition.selectColumns)
      .single();

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not update ${definition.singularTitle}.`, cause: error });
    }

    return mapRow(data as unknown as Record<string, unknown>);
  }

  async softDelete(definition: ManufacturingResourceDefinition, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(definition.tableName)
      .update({ deleted_at: new Date().toISOString(), deleted_by: this.context.userId, is_active: false })
      .eq("tenant_id", this.context.tenantId)
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new ApplicationError({ code: "OPERATIONAL_ERROR", message: `Could not delete ${definition.singularTitle}.`, cause: error });
    }
  }
}
