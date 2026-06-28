import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { CompanyRequestContext } from "@/platform/auth/server";

import type { FinanceRepository } from "../../application/ports/finance.repository";
import type {
  FinanceCursorPage,
  FinanceEntityDescriptor,
  FinanceListQuery,
  FinanceMutationInput,
  FinanceRecord,
} from "../../application/types";

const LIST_ALL_CAP = 500;

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/gu, (_, char: string) => char.toUpperCase());
}

function mapRow(row: Record<string, unknown>): FinanceRecord {
  const record: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    record[snakeToCamel(key)] = value;
  }

  return record as FinanceRecord;
}

function applyTransform(value: string, transform?: "upper" | "lower"): string {
  if (transform === "upper") return value.toUpperCase();
  if (transform === "lower") return value.toLowerCase();
  return value;
}

function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string"
      ? { createdAt: parsed.createdAt, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

function encodeCursor(record: FinanceRecord | undefined) {
  if (!record) return null;
  return Buffer.from(JSON.stringify({ createdAt: record.createdAt, id: record.id })).toString("base64url");
}

export class SupabaseFinanceRepository implements FinanceRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: CompanyRequestContext,
    private readonly descriptor: FinanceEntityDescriptor,
  ) {}

  private baseSelect() {
    let request = this.supabase
      .from(this.descriptor.table)
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    if (this.descriptor.fixedFilter) {
      request = request.eq(this.descriptor.fixedFilter.column, this.descriptor.fixedFilter.value);
    }

    return request;
  }

  private applyFilters<T extends ReturnType<SupabaseFinanceRepository["baseSelect"]>>(request: T, query: FinanceListQuery): T {
    let next = request;

    if (query.isActive !== undefined) {
      next = next.eq("is_active", query.isActive) as T;
    }

    if (query.status && this.descriptor.statusField === "status") {
      next = next.eq("status", query.status) as T;
    }

    if (query.search) {
      const term = query.search.replaceAll("%", "").replaceAll(",", "").trim();
      if (term.length > 0 && this.descriptor.searchColumns.length > 0) {
        next = next.or(this.descriptor.searchColumns.map((column) => `${column}.ilike.%${term}%`).join(",")) as T;
      }
    }

    return next;
  }

  async list(query: FinanceListQuery): Promise<FinanceCursorPage<FinanceRecord>> {
    const pageSize = Math.min(Math.max(query.pageSize, 1), 100);
    let request = this.applyFilters(this.baseSelect(), query).limit(pageSize + 1);

    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      request = request.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    request = request.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error } = await request;

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not list ${this.descriptor.title}.`,
        cause: error,
      });
    }

    const records = (data ?? []).map(mapRow);
    const visibleRecords = records.slice(0, pageSize);

    return {
      records: visibleRecords,
      nextCursor: records.length > pageSize ? encodeCursor(visibleRecords.at(-1)) : null,
      pageSize,
    };
  }

  async listAll(query: FinanceListQuery): Promise<readonly FinanceRecord[]> {
    const request = this.applyFilters(this.baseSelect(), query)
      .order("created_at", { ascending: true })
      .limit(LIST_ALL_CAP);

    const { data, error } = await request;

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not list ${this.descriptor.title}.`,
        cause: error,
      });
    }

    return (data ?? []).map(mapRow);
  }

  async findById(id: string): Promise<FinanceRecord | null> {
    let request = this.supabase
      .from(this.descriptor.table)
      .select("*")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", id)
      .is("deleted_at", null);

    if (this.descriptor.fixedFilter) {
      request = request.eq(this.descriptor.fixedFilter.column, this.descriptor.fixedFilter.value);
    }

    const { data, error } = await request.maybeSingle();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not read ${this.descriptor.singular}.`,
        cause: error,
      });
    }

    return data ? mapRow(data) : null;
  }

  private buildPayload(input: FinanceMutationInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const field of this.descriptor.fields) {
      if (!(field.name in input)) continue;
      const value = input[field.name];

      if (value === null || value === undefined) {
        payload[field.column] = null;
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        payload[field.column] = trimmed.length === 0 ? null : applyTransform(trimmed, field.transform);
        continue;
      }

      payload[field.column] = value;
    }

    if (this.descriptor.fixedFilter) {
      payload[this.descriptor.fixedFilter.column] = this.descriptor.fixedFilter.value;
    }

    return payload;
  }

  async create(input: FinanceMutationInput): Promise<FinanceRecord> {
    const payload = {
      ...this.buildPayload(input),
      tenant_id: this.context.tenantId,
      company_id: this.context.companyId,
      created_by: this.context.userId,
      updated_by: this.context.userId,
      is_active: true,
    };

    const { data, error } = await this.supabase
      .from(this.descriptor.table)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not create ${this.descriptor.singular}.`,
        cause: error,
      });
    }

    return mapRow(data);
  }

  async update(id: string, input: FinanceMutationInput): Promise<FinanceRecord> {
    const payload = {
      ...this.buildPayload(input),
      updated_by: this.context.userId,
    };

    let request = this.supabase
      .from(this.descriptor.table)
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", id)
      .is("deleted_at", null);

    if (this.descriptor.fixedFilter) {
      request = request.eq(this.descriptor.fixedFilter.column, this.descriptor.fixedFilter.value);
    }

    const { data, error } = await request.select("*").single();

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not update ${this.descriptor.singular}.`,
        cause: error,
      });
    }

    return mapRow(data);
  }

  async archive(id: string): Promise<void> {
    const payload: Record<string, unknown> = {
      deleted_at: new Date().toISOString(),
      deleted_by: this.context.userId,
      updated_by: this.context.userId,
      is_active: false,
    };

    if (this.descriptor.statusField === "status") {
      payload.status = "archived";
    }

    let request = this.supabase
      .from(this.descriptor.table)
      .update(payload)
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("id", id)
      .is("deleted_at", null);

    if (this.descriptor.fixedFilter) {
      request = request.eq(this.descriptor.fixedFilter.column, this.descriptor.fixedFilter.value);
    }

    const { error } = await request;

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not archive ${this.descriptor.singular}.`,
        cause: error,
      });
    }
  }

  async count(): Promise<number> {
    let request = this.supabase
      .from(this.descriptor.table)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null);

    if (this.descriptor.fixedFilter) {
      request = request.eq(this.descriptor.fixedFilter.column, this.descriptor.fixedFilter.value);
    }

    const { count, error } = await request;

    if (error) {
      throw new ApplicationError({
        code: "OPERATIONAL_ERROR",
        message: `Could not count ${this.descriptor.title}.`,
        cause: error,
      });
    }

    return count ?? 0;
  }
}
