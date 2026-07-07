import "server-only";

import { INVENTORY_PERMISSIONS } from "../../permissions/permission-registry";
import type { BranchRequestContext } from "@/platform/auth/server";
import { type OxLookupExecutor, type OxLookupSearchInput } from "@/platform/operator-experience/lookup-runtime";
import { requirePermission } from "@/platform/permissions/server";
import { PURCHASING_PERMISSIONS } from "@/features/purchasing/public-api";

import { SupabaseInventoryEntityLookupRepository } from "../../infrastructure/repositories/inventory-entity-lookup.repository";

export class InventoryEntityLookupService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly repository: SupabaseInventoryEntityLookupRepository,
  ) {}

  createExecutors(): Record<string, OxLookupExecutor> {
    return {
      "inventory.locations.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.locations.lookup",
            denialSource: "inventory.entity-lookup.hydrate-locations",
            permission: INVENTORY_PERMISSIONS.locationsView,
          });
          return this.repository.hydrateLocations(ids);
        },
        search: async (input) => this.searchLocations(input),
      },
      "inventory.lots.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.lots.lookup",
            denialSource: "inventory.entity-lookup.hydrate-lots",
            permission: INVENTORY_PERMISSIONS.lotsView,
          });
          return this.repository.hydrateLots(ids);
        },
        search: async (input) => this.searchLots(input),
      },
      "inventory.products.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.products.lookup",
            denialSource: "inventory.entity-lookup.hydrate-products",
            permission: INVENTORY_PERMISSIONS.productsView,
          });
          return this.repository.hydrateProducts(ids);
        },
        search: async (input) => this.searchProducts(input),
      },
      "inventory.serials.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.serials.lookup",
            denialSource: "inventory.entity-lookup.hydrate-serials",
            permission: INVENTORY_PERMISSIONS.serialsView,
          });
          return this.repository.hydrateSerials(ids);
        },
        search: async (input) => this.searchSerials(input),
      },
      "inventory.transactions.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.transactions.lookup",
            denialSource: "inventory.entity-lookup.hydrate-transactions",
            permission: PURCHASING_PERMISSIONS.view,
          });
          return this.repository.hydrateTransactions(ids);
        },
        search: async (input) => this.searchTransactions(input),
      },
      "inventory.uoms.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.uoms.lookup",
            denialSource: "inventory.entity-lookup.hydrate-uoms",
            permission: INVENTORY_PERMISSIONS.uomsView,
          });
          return this.repository.hydrateUoms(ids);
        },
        search: async (input) => this.searchUoms(input),
      },
      "inventory.warehouses.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "inventory.warehouses.lookup",
            denialSource: "inventory.entity-lookup.hydrate-warehouses",
            permission: INVENTORY_PERMISSIONS.warehousesView,
          });
          return this.repository.hydrateWarehouses(ids);
        },
        search: async (input) => this.searchWarehouses(input),
      },
      "platform.branches.lookup": {
        hydrate: async ({ ids }) => this.repository.hydrateBranches(ids),
        search: async (input) => this.searchBranches(input),
      },
      "platform.users.lookup": {
        hydrate: async ({ ids }) => this.repository.hydrateUsers(ids),
        search: async (input) => this.searchUsers(input),
      },
    };
  }

  async resolveScan(providerKey: string, term: string) {
    const input = {
      cursor: null,
      exact: true,
      pageSize: 1,
      term,
    };

    if (providerKey === "inventory.products.lookup") {
      await requirePermission({
        context: this.context,
        denialResource: "inventory.products.lookup",
        denialSource: "inventory.entity-lookup.resolve-scan",
        permission: INVENTORY_PERMISSIONS.productsView,
      });
      const page = await this.repository.searchProducts(input);
      return page.options[0] ?? null;
    }

    if (providerKey === "inventory.locations.lookup") {
      await requirePermission({
        context: this.context,
        denialResource: "inventory.locations.lookup",
        denialSource: "inventory.entity-lookup.resolve-scan",
        permission: INVENTORY_PERMISSIONS.locationsView,
      });
      const page = await this.repository.searchLocations(input);
      return page.options[0] ?? null;
    }

    if (providerKey === "inventory.lots.lookup") {
      await requirePermission({
        context: this.context,
        denialResource: "inventory.lots.lookup",
        denialSource: "inventory.entity-lookup.resolve-scan",
        permission: INVENTORY_PERMISSIONS.lotsView,
      });
      const page = await this.repository.searchLots(input);
      return page.options[0] ?? null;
    }

    if (providerKey === "inventory.serials.lookup") {
      await requirePermission({
        context: this.context,
        denialResource: "inventory.serials.lookup",
        denialSource: "inventory.entity-lookup.resolve-scan",
        permission: INVENTORY_PERMISSIONS.serialsView,
      });
      const page = await this.repository.searchSerials(input);
      return page.options[0] ?? null;
    }

    if (providerKey === "inventory.transactions.lookup") {
      await requirePermission({
        context: this.context,
        denialResource: "inventory.transactions.lookup",
        denialSource: "inventory.entity-lookup.resolve-scan",
        permission: PURCHASING_PERMISSIONS.view,
      });
      const page = await this.repository.searchTransactions(input);
      return page.options[0] ?? null;
    }

    return null;
  }

  private async searchProducts(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.products.lookup",
      denialSource: "inventory.entity-lookup.search-products",
      permission: INVENTORY_PERMISSIONS.productsView,
    });
    const page = await this.repository.searchProducts({
      cursor: input.cursor,
      exact: input.query.mode !== "manual",
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchWarehouses(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.warehouses.lookup",
      denialSource: "inventory.entity-lookup.search-warehouses",
      permission: INVENTORY_PERMISSIONS.warehousesView,
    });
    const page = await this.repository.searchWarehouses({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchLocations(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.locations.lookup",
      denialSource: "inventory.entity-lookup.search-locations",
      permission: INVENTORY_PERMISSIONS.locationsView,
    });
    const page = await this.repository.searchLocations({
      cursor: input.cursor,
      exact: input.query.mode !== "manual",
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchLots(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.lots.lookup",
      denialSource: "inventory.entity-lookup.search-lots",
      permission: INVENTORY_PERMISSIONS.lotsView,
    });
    const page = await this.repository.searchLots({
      cursor: input.cursor,
      exact: input.query.mode !== "manual",
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchSerials(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.serials.lookup",
      denialSource: "inventory.entity-lookup.search-serials",
      permission: INVENTORY_PERMISSIONS.serialsView,
    });
    const page = await this.repository.searchSerials({
      cursor: input.cursor,
      exact: input.query.mode !== "manual",
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchTransactions(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.transactions.lookup",
      denialSource: "inventory.entity-lookup.search-transactions",
      permission: PURCHASING_PERMISSIONS.view,
    });
    const page = await this.repository.searchTransactions({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchUoms(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "inventory.uoms.lookup",
      denialSource: "inventory.entity-lookup.search-uoms",
      permission: INVENTORY_PERMISSIONS.uomsView,
    });
    const page = await this.repository.searchUoms({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchBranches(input: OxLookupSearchInput) {
    const page = await this.repository.searchBranches({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchUsers(input: OxLookupSearchInput) {
    const page = await this.repository.searchUsers({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }
}
