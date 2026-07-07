import "server-only";

import type { BranchRequestContext } from "@/platform/auth/server";
import { requirePermission } from "@/platform/permissions/server";

import { PURCHASING_PERMISSIONS } from "../../permissions/permission-registry";
import { SupabasePurchasingCatalogLookupRepository } from "../../infrastructure/repositories/purchasing-catalog-lookup.repository";

export type PurchasingCatalogLookups = Readonly<{
  branches: readonly { id: string; label: string }[];
  locations: readonly { id: string; label: string }[];
  products: readonly { id: string; label: string }[];
  purchaseOrderLines: readonly { id: string; label: string; meta?: string }[];
  purchaseOrders: readonly { id: string; label: string; meta?: string }[];
  suppliers: readonly { id: string; label: string }[];
  units: readonly { id: string; label: string }[];
  warehouses: readonly { id: string; label: string }[];
}>;

export class PurchasingCatalogLookupService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly repository: SupabasePurchasingCatalogLookupRepository,
  ) {}

  async loadPurchasingLookups(): Promise<PurchasingCatalogLookups> {
    await requirePermission({
      context: this.context,
      denialResource: "purchasing.lookups",
      denialSource: "purchasing.catalog-lookup.load",
      permission: PURCHASING_PERMISSIONS.view,
    });

    const { branches, locations, orderLines, orders, products, suppliers, units, warehouses } =
      await this.repository.loadPurchasingLookups();

    return {
      branches: (branches.data ?? []).map((row) => ({ id: row.id as string, label: `${row.code as string} — ${row.name as string}` })),
      locations: (locations.data ?? []).map((row) => ({ id: row.id as string, label: `${row.location_key as string} — ${row.name as string}` })),
      products: (products.data ?? []).map((row) => ({ id: row.id as string, label: `${row.sku as string} — ${row.name as string}` })),
      purchaseOrderLines: (orderLines.data ?? []).map((row) => ({
        id: row.id as string,
        label: `Line ${String(row.line_number)} · Qty ${String(row.quantity ?? "")}`,
        meta: String(row.purchase_order_id ?? ""),
      })),
      purchaseOrders: (orders.data ?? []).map((row) => ({ id: row.id as string, label: row.title as string, meta: row.status as string })),
      suppliers: (suppliers.data ?? []).map((row) => ({
        id: row.id as string,
        label: [row.supplier_code, row.name_en ?? row.name_ar].filter(Boolean).join(" — "),
      })),
      units: (units.data ?? []).map((row) => ({ id: row.id as string, label: `${row.uom_key as string} — ${row.name as string}` })),
      warehouses: (warehouses.data ?? []).map((row) => ({ id: row.id as string, label: `${row.warehouse_key as string} — ${row.name as string}` })),
    };
  }
}
