import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/core/errors";
import type { BranchRequestContext } from "@/platform/auth/server";

type LookupRow = Readonly<Record<string, unknown>>;

function assertNoError(result: { error: unknown | null }, message: string): asserts result is { data: LookupRow[] | null; error: null } {
  if (result.error) {
    throw new ApplicationError({ code: "OPERATIONAL_ERROR", message, cause: result.error });
  }
}

export class SupabasePurchasingCatalogLookupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadPurchasingLookups() {
    const [branches, suppliers, products, units, warehouses, locations, orders, orderLines] = await Promise.all([
      this.supabase.from("branches").select("id, code, name").eq("tenant_id", this.context.tenantId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("suppliers").select("id, supplier_code, name_en, name_ar").eq("tenant_id", this.context.tenantId).eq("is_active", true).is("deleted_at", null).order("name_en", { ascending: true }),
      this.supabase.from("inventory_products").select("id, sku, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_uoms").select("id, uom_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).eq("branch_id", this.context.branchId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_locations").select("id, location_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).eq("branch_id", this.context.branchId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("purchase_orders").select("id, title, status").eq("tenant_id", this.context.tenantId).eq("branch_id", this.context.branchId).in("status", ["confirmed", "partially_received"]).is("deleted_at", null).order("created_at", { ascending: false }),
      this.supabase.from("purchase_order_lines").select("id, line_number, quantity, purchase_order_id").eq("tenant_id", this.context.tenantId).eq("branch_id", this.context.branchId).is("deleted_at", null).order("line_number", { ascending: true }),
    ]);

    assertNoError(branches, "Could not load branch lookup.");
    assertNoError(suppliers, "Could not load supplier lookup.");
    assertNoError(products, "Could not load product lookup.");
    assertNoError(units, "Could not load UOM lookup.");
    assertNoError(warehouses, "Could not load warehouse lookup.");
    assertNoError(locations, "Could not load location lookup.");
    assertNoError(orders, "Could not load purchase order lookup.");
    assertNoError(orderLines, "Could not load purchase order line lookup.");

    return { branches, locations, orderLines, orders, products, suppliers, units, warehouses };
  }
}
