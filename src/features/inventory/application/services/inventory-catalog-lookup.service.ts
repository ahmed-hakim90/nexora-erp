import "server-only";

import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import type { BranchRequestContext } from "@/platform/auth/server";
import type { WarehouseExecutionCatalog } from "@/platform/operator-experience/warehouse-execution";
import { PURCHASING_PERMISSIONS } from "@/features/purchasing/public-api";
import { hasServerPermission, requirePermission } from "@/platform/permissions/server";

import { SupabaseInventoryEntityLookupRepository } from "../../infrastructure/repositories/inventory-entity-lookup.repository";
import { SupabaseInventoryCatalogLookupRepository } from "../../infrastructure/repositories/inventory-catalog-lookup.repository";

export type InventoryTransactionLookups = Readonly<{
  branches: readonly { id: string; label: string }[];
  locations: readonly { id: string; label: string }[];
  products: readonly { id: string; label: string }[];
  units: readonly { id: string; label: string }[];
  warehouses: readonly { id: string; label: string }[];
}>;

export class InventoryCatalogLookupService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly repository: SupabaseInventoryCatalogLookupRepository,
    private readonly entityLookupRepository: SupabaseInventoryEntityLookupRepository,
  ) {}

  async loadTransactionLookups(): Promise<InventoryTransactionLookups> {
    await Promise.all([
      requirePermission({
        context: this.context,
        denialResource: "inventory.transaction.lookups",
        denialSource: "inventory.catalog-lookup.load-transaction",
        permission: INVENTORY_PERMISSIONS.transactionView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.transaction.lookups",
        denialSource: "inventory.catalog-lookup.load-transaction",
        permission: INVENTORY_PERMISSIONS.productsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.transaction.lookups",
        denialSource: "inventory.catalog-lookup.load-transaction",
        permission: INVENTORY_PERMISSIONS.uomsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.transaction.lookups",
        denialSource: "inventory.catalog-lookup.load-transaction",
        permission: INVENTORY_PERMISSIONS.warehousesView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.transaction.lookups",
        denialSource: "inventory.catalog-lookup.load-transaction",
        permission: INVENTORY_PERMISSIONS.locationsView,
      }),
    ]);

    const { branchResult, locationResult, productResult, unitResult, warehouseResult } =
      await this.repository.loadTransactionLookups();

    return {
      branches: (branchResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.code as string} — ${row.name as string}` })),
      locations: (locationResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.location_key as string} — ${row.name as string}` })),
      products: (productResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.sku as string} — ${row.name as string}` })),
      units: (unitResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.uom_key as string} — ${row.name as string}` })),
      warehouses: (warehouseResult.data ?? []).map((row) => ({ id: row.id as string, label: `${row.warehouse_key as string} — ${row.name as string}` })),
    };
  }

  async loadWarehouseExecutionCatalog(): Promise<WarehouseExecutionCatalog> {
    await Promise.all([
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.movementsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.productsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.uomsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.warehousesView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.locationsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.lotsView,
      }),
      requirePermission({
        context: this.context,
        denialResource: "inventory.warehouse.execution",
        denialSource: "inventory.catalog-lookup.load-warehouse",
        permission: INVENTORY_PERMISSIONS.serialsView,
      }),
    ]);

    const canLoadPurchaseOrders = await hasServerPermission({
      context: this.context,
      permission: PURCHASING_PERMISSIONS.view,
    });
    void canLoadPurchaseOrders;

    const warehousePage = await this.entityLookupRepository.searchWarehouses({
      cursor: null,
      pageSize: 100,
      term: null,
    });

    return {
      documents: [],
      locations: [],
      lots: [],
      products: [],
      serials: [],
      warehouses: warehousePage.options.map((option) => ({
        id: option.id,
        label: `${option.businessCode ?? ""} — ${option.businessName}`,
        warehouseKey: option.businessCode ?? option.businessName,
      })),
    };
  }
}
