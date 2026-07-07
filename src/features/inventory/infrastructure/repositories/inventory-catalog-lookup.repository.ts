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

export class SupabaseInventoryCatalogLookupRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: BranchRequestContext,
  ) {}

  async loadTransactionLookups() {
    const [branchResult, productResult, unitResult, warehouseResult, locationResult] = await Promise.all([
      this.supabase.from("branches").select("id, code, name").eq("tenant_id", this.context.tenantId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_products").select("id, sku, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_uoms").select("id, uom_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_warehouses").select("id, warehouse_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).eq("branch_id", this.context.branchId).is("deleted_at", null).order("name", { ascending: true }),
      this.supabase.from("inventory_locations").select("id, location_key, name").eq("tenant_id", this.context.tenantId).eq("company_id", this.context.companyId).eq("branch_id", this.context.branchId).is("deleted_at", null).order("name", { ascending: true }),
    ]);

    assertNoError(branchResult, "Could not load branch lookup.");
    assertNoError(productResult, "Could not load product lookup.");
    assertNoError(unitResult, "Could not load UOM lookup.");
    assertNoError(warehouseResult, "Could not load warehouse lookup.");
    assertNoError(locationResult, "Could not load location lookup.");

    return { branchResult, locationResult, productResult, unitResult, warehouseResult };
  }

  async loadWarehouseExecutionCatalog(includePurchaseOrders: boolean) {
    const [productResult, locationResult, warehouseResult, lotResult, serialResult, purchaseOrderResult] = await Promise.all([
      this.supabase
        .from("inventory_products")
        .select("id, sku, name, barcode, base_uom_id, has_lot_tracking, has_serial_tracking")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      this.supabase
        .from("inventory_locations")
        .select("id, location_key, name, warehouse_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("branch_id", this.context.branchId)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      this.supabase
        .from("inventory_warehouses")
        .select("id, warehouse_key, name")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .eq("branch_id", this.context.branchId)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      this.supabase
        .from("inventory_lots")
        .select("id, lot_number, product_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("lot_number", { ascending: true }),
      this.supabase
        .from("inventory_serial_numbers")
        .select("id, serial_number, product_id")
        .eq("tenant_id", this.context.tenantId)
        .eq("company_id", this.context.companyId)
        .is("deleted_at", null)
        .order("serial_number", { ascending: true }),
      includePurchaseOrders
        ? this.supabase
            .from("purchase_orders")
            .select("id, title, status")
            .eq("tenant_id", this.context.tenantId)
            .eq("branch_id", this.context.branchId)
            .in("status", ["confirmed", "partially_received"])
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    assertNoError(productResult, "Could not load warehouse product catalog.");
    assertNoError(locationResult, "Could not load warehouse location catalog.");
    assertNoError(warehouseResult, "Could not load warehouse catalog.");
    assertNoError(lotResult, "Could not load lot catalog.");
    assertNoError(serialResult, "Could not load serial catalog.");
    assertNoError(purchaseOrderResult, "Could not load receipt documents.");

    return { locationResult, lotResult, productResult, purchaseOrderResult, serialResult, warehouseResult };
  }
}
