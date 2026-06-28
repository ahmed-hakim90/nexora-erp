import "server-only";

import { resolveCompanyRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";
import { requirePermission } from "@/platform/permissions/server";

import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";

export type InventoryOverviewMetric = Readonly<{
  key: string;
  label: string;
  value: number;
  description: string;
}>;

export type InventoryOverviewData = Readonly<{
  metrics: readonly InventoryOverviewMetric[];
  lastUpdated: string;
}>;

const inventoryTables = [
  { companyScoped: true, key: "products", label: "Products", table: "inventory_products", permission: INVENTORY_PERMISSIONS.productsView, description: "Canonical inventory products." },
  { companyScoped: true, key: "variants", label: "Product Variants", table: "inventory_product_variants", permission: INVENTORY_PERMISSIONS.productsView, description: "Product variant records." },
  { companyScoped: true, key: "categories", label: "Categories", table: "inventory_product_categories", permission: INVENTORY_PERMISSIONS.productsView, description: "Inventory product categories." },
  { companyScoped: true, key: "uoms", label: "UOM", table: "inventory_uoms", permission: INVENTORY_PERMISSIONS.uomsView, description: "Inventory units of measure." },
  { companyScoped: true, key: "warehouses", label: "Warehouses", table: "inventory_warehouses", permission: INVENTORY_PERMISSIONS.warehousesView, description: "Inventory warehouses." },
  { companyScoped: true, key: "locations", label: "Locations", table: "inventory_locations", permission: INVENTORY_PERMISSIONS.locationsView, description: "Warehouse locations." },
  { companyScoped: true, key: "lots", label: "Lots", table: "inventory_lots", permission: INVENTORY_PERMISSIONS.lotsView, description: "Lot-tracked records." },
  { companyScoped: true, key: "serials", label: "Serial Numbers", table: "inventory_serial_numbers", permission: INVENTORY_PERMISSIONS.serialsView, description: "Serial-tracked records." },
  { companyScoped: false, key: "balances", label: "Stock Balances", table: "stock_balances", permission: INVENTORY_PERMISSIONS.stockView, description: "Runtime stock balance cache derived from the stock ledger." },
  { companyScoped: false, key: "movements", label: "Stock Ledger Entries", table: "stock_ledger_entries", permission: INVENTORY_PERMISSIONS.movementsView, description: "Append-only stock movement ledger entries." },
  { companyScoped: true, key: "reorderRules", label: "Reorder Rules", table: "inventory_reorder_rules", permission: INVENTORY_PERMISSIONS.reorderRulesView, description: "Inventory reorder rules." },
] as const;

export async function loadInventoryOverview(): Promise<InventoryOverviewData> {
  const context = await resolveCompanyRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const metrics = await Promise.all(
    inventoryTables.map(async (item) => {
      await requirePermission({ context, permission: item.permission });
      let request = supabase
        .from(item.table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .is("deleted_at", null);

      if (item.companyScoped) {
        request = request.eq("company_id", context.companyId);
      }

      const { count, error } = await request;

      if (error) throw error;

      return {
        description: item.description,
        key: item.key,
        label: item.label,
        value: count ?? 0,
      };
    }),
  );

  return { lastUpdated: new Date().toISOString(), metrics };
}
