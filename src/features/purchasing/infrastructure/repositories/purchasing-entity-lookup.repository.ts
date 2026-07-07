import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";
import {
  encodeLookupCursor,
  type OxLookupCursor,
  type OxLookupPage,
} from "@/platform/operator-experience/lookup-runtime";
import { normalizeOxLookupOption, type OxLookupOption } from "@/platform/operator-experience/public-api";

type LookupRow = Readonly<Record<string, unknown>>;

function assertNoError(result: { error: unknown | null }, message: string): asserts result is { data: LookupRow[] | null; error: null } {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function readOffset(cursor: OxLookupCursor | null): number {
  if (!cursor || cursor.sortKey !== "offset") return 0;
  const parsed = Number.parseInt(cursor.id, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toOffsetPage(
  options: readonly OxLookupOption[],
  pageSize: number,
  offset: number,
): OxLookupPage {
  const normalized = options
    .map((option) => normalizeOxLookupOption(option))
    .filter((option): option is OxLookupOption => option !== null);
  const hasMore = normalized.length > pageSize;
  const page = normalized.slice(0, pageSize);
  return {
    minSearchLength: 0,
    nextCursor: hasMore ? encodeLookupCursor({ id: String(offset + pageSize), sortKey: "offset" }) : null,
    options: page,
    pageSize,
    rejectedRawIdentifier: false,
  };
}

export class SupabasePurchasingEntityLookupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async searchSuppliers(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("suppliers")
      .select("id, supplier_code, name_en, name_ar")
      .eq("tenant_id", this.context.tenantId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name_en", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`supplier_code.ilike.%${term}%,name_en.ilike.%${term}%,name_ar.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search suppliers.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.supplier_code as string,
        businessName: (row.name_en as string) || (row.name_ar as string),
        entityType: "supplier",
        id: row.id as string,
        subtitle: row.name_ar as string | undefined,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateSuppliers(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("suppliers")
      .select("id, supplier_code, name_en, name_ar")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate suppliers.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.supplier_code as string,
      businessName: (row.name_en as string) || (row.name_ar as string),
      entityType: "supplier",
      id: row.id as string,
      subtitle: row.name_ar as string | undefined,
    }));
  }

  async searchDocuments(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("purchase_orders")
      .select("id, title, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("branch_id", this.context.branchId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.ilike("title", `%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search purchase documents.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.id as string,
        businessName: row.title as string,
        entityType: "purchase-order",
        id: row.id as string,
        status: row.status as string,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateDocuments(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("purchase_orders")
      .select("id, title, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("branch_id", this.context.branchId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate purchase documents.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.id as string,
      businessName: row.title as string,
      entityType: "purchase-order",
      id: row.id as string,
      status: row.status as string,
    }));
  }
}
