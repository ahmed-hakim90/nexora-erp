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

function toProductOption(row: LookupRow): OxLookupOption {
  return {
    businessCode: row.sku as string,
    businessName: row.name as string,
    entityType: "product",
    id: row.id as string,
    metadata: {
      barcode: row.barcode ?? null,
      baseUomId: row.base_uom_id ?? null,
      hasLotTracking: row.has_lot_tracking ?? false,
      hasSerialTracking: row.has_serial_tracking ?? false,
    },
    status: row.status as string | undefined,
    subtitle: row.barcode ? `Barcode ${row.barcode as string}` : null,
  };
}

export class SupabaseInventoryEntityLookupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async searchProducts(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null; exact?: boolean }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_products")
      .select("id, sku, name, barcode, base_uom_id, has_lot_tracking, has_serial_tracking, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      if (input.exact) {
        query = query.or(`sku.ilike.${term},barcode.ilike.${term}`);
      } else {
        query = query.or(`sku.ilike.%${term}%,name.ilike.%${term}%,barcode.ilike.%${term}%`);
      }
    }

    const result = await query;
    assertNoError(result, "Could not search products.");
    return toOffsetPage((result.data ?? []).map(toProductOption), input.pageSize, offset);
  }

  async hydrateProducts(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_products")
      .select("id, sku, name, barcode, base_uom_id, has_lot_tracking, has_serial_tracking, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate products.");
    return (result.data ?? []).map(toProductOption);
  }

  async searchWarehouses(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_warehouses")
      .select("id, warehouse_key, name")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("branch_id", this.context.branchId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`warehouse_key.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search warehouses.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.warehouse_key as string,
        businessName: row.name as string,
        entityType: "warehouse",
        id: row.id as string,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateWarehouses(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_warehouses")
      .select("id, warehouse_key, name")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("branch_id", this.context.branchId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate warehouses.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.warehouse_key as string,
      businessName: row.name as string,
      entityType: "warehouse",
      id: row.id as string,
    }));
  }

  async searchLocations(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null; exact?: boolean; warehouseId?: string | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_locations")
      .select("id, location_key, name, warehouse_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("branch_id", this.context.branchId)
      .is("deleted_at", null)
      .order("location_key", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.warehouseId) {
      query = query.eq("warehouse_id", input.warehouseId);
    }

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      if (input.exact) {
        query = query.ilike("location_key", term);
      } else {
        query = query.or(`location_key.ilike.%${term}%,name.ilike.%${term}%`);
      }
    }

    const result = await query;
    assertNoError(result, "Could not search locations.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.location_key as string,
        businessName: row.name as string,
        entityType: "warehouse-location",
        id: row.id as string,
        metadata: { warehouseId: row.warehouse_id ?? null },
        subtitle: row.location_key as string,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateLocations(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_locations")
      .select("id, location_key, name, warehouse_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .eq("branch_id", this.context.branchId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate locations.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.location_key as string,
      businessName: row.name as string,
      entityType: "warehouse-location",
      id: row.id as string,
      metadata: { warehouseId: row.warehouse_id ?? null },
      subtitle: row.location_key as string,
    }));
  }

  async searchLots(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null; exact?: boolean; productId?: string | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_lots")
      .select("id, lot_number, product_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("lot_number", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.productId) {
      query = query.eq("product_id", input.productId);
    }

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = input.exact ? query.ilike("lot_number", term) : query.ilike("lot_number", `%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search lots.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.lot_number as string,
        businessName: row.lot_number as string,
        entityType: "lot",
        id: row.id as string,
        metadata: { lotKey: row.lot_number ?? null, productId: row.product_id ?? null },
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateLots(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_lots")
      .select("id, lot_number, product_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate lots.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.lot_number as string,
      businessName: row.lot_number as string,
      entityType: "lot",
      id: row.id as string,
      metadata: { lotKey: row.lot_number ?? null, productId: row.product_id ?? null },
    }));
  }

  async searchSerials(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null; exact?: boolean; productId?: string | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_serial_numbers")
      .select("id, serial_number, product_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("serial_number", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.productId) {
      query = query.eq("product_id", input.productId);
    }

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = input.exact ? query.ilike("serial_number", term) : query.ilike("serial_number", `%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search serials.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.serial_number as string,
        businessName: row.serial_number as string,
        entityType: "serial",
        id: row.id as string,
        metadata: { productId: row.product_id ?? null, serialKey: row.serial_number ?? null },
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateSerials(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_serial_numbers")
      .select("id, serial_number, product_id")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate serials.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.serial_number as string,
      businessName: row.serial_number as string,
      entityType: "serial",
      id: row.id as string,
      metadata: { productId: row.product_id ?? null, serialKey: row.serial_number ?? null },
    }));
  }

  async searchTransactions(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("purchase_orders")
      .select("id, title, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("branch_id", this.context.branchId)
      .in("status", ["confirmed", "partially_received"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.ilike("title", `%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search receipt documents.");
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

  async hydrateTransactions(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("purchase_orders")
      .select("id, title, status")
      .eq("tenant_id", this.context.tenantId)
      .eq("branch_id", this.context.branchId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate receipt documents.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.id as string,
      businessName: row.title as string,
      entityType: "purchase-order",
      id: row.id as string,
      status: row.status as string,
    }));
  }

  async searchUoms(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("inventory_uoms")
      .select("id, uom_key, name")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`uom_key.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search UOMs.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.uom_key as string,
        businessName: row.name as string,
        entityType: "uom",
        id: row.id as string,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateUoms(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("inventory_uoms")
      .select("id, uom_key, name")
      .eq("tenant_id", this.context.tenantId)
      .eq("company_id", this.context.companyId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate UOMs.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.uom_key as string,
      businessName: row.name as string,
      entityType: "uom",
      id: row.id as string,
    }));
  }

  async searchBranches(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("branches")
      .select("id, code, name")
      .eq("tenant_id", this.context.tenantId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`code.ilike.%${term}%,name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search branches.");
    return toOffsetPage(
      (result.data ?? []).map((row) => ({
        businessCode: row.code as string,
        businessName: row.name as string,
        entityType: "branch",
        id: row.id as string,
      })),
      input.pageSize,
      offset,
    );
  }

  async hydrateBranches(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("branches")
      .select("id, code, name")
      .eq("tenant_id", this.context.tenantId)
      .in("id", [...ids])
      .is("deleted_at", null);
    assertNoError(result, "Could not hydrate branches.");
    return (result.data ?? []).map((row) => ({
      businessCode: row.code as string,
      businessName: row.name as string,
      entityType: "branch",
      id: row.id as string,
    }));
  }

  async searchUsers(input: Readonly<{ term: string | null; pageSize: number; cursor: OxLookupCursor | null }>) {
    const offset = readOffset(input.cursor);
    let query = this.supabase
      .from("profiles")
      .select("id, email, display_name")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("display_name", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + input.pageSize);

    if (input.term) {
      const term = escapeIlike(input.term.trim());
      query = query.or(`email.ilike.%${term}%,display_name.ilike.%${term}%`);
    }

    const result = await query;
    assertNoError(result, "Could not search users.");
    return toOffsetPage(
      (result.data ?? []).map((row) => toUserOption(row)),
      input.pageSize,
      offset,
    );
  }

  async hydrateUsers(ids: readonly string[]) {
    if (ids.length === 0) return [];
    const result = await this.supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", [...ids])
      .is("deleted_at", null)
      .eq("is_active", true);
    assertNoError(result, "Could not hydrate users.");
    return (result.data ?? []).map((row) => toUserOption(row));
  }
}

function toUserOption(row: LookupRow): OxLookupOption {
  const email = typeof row.email === "string" ? row.email : "";
  const displayName = typeof row.display_name === "string" && row.display_name.trim().length > 0
    ? row.display_name.trim()
    : email || "User";

  return {
    businessCode: email || String(row.id),
    businessName: displayName,
    entityType: "user",
    id: String(row.id),
    subtitle: email && email !== displayName ? email : null,
  };
}
