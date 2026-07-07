import "server-only";

import type { BranchRequestContext } from "@/platform/auth/server";
import { type OxLookupExecutor, type OxLookupSearchInput } from "@/platform/operator-experience/lookup-runtime";
import { requirePermission } from "@/platform/permissions/server";

import { PURCHASING_PERMISSIONS } from "../../public-api";
import { SupabasePurchasingEntityLookupRepository } from "../../infrastructure/repositories/purchasing-entity-lookup.repository";

export class PurchasingEntityLookupService {
  constructor(
    private readonly context: BranchRequestContext,
    private readonly repository: SupabasePurchasingEntityLookupRepository,
  ) {}

  createExecutors(): Record<string, OxLookupExecutor> {
    return {
      "purchasing.documents.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "purchasing.documents.lookup",
            denialSource: "purchasing.entity-lookup.hydrate-documents",
            permission: PURCHASING_PERMISSIONS.view,
          });
          return this.repository.hydrateDocuments(ids);
        },
        search: async (input) => this.searchDocuments(input),
      },
      "purchasing.suppliers.lookup": {
        hydrate: async ({ ids }) => {
          await requirePermission({
            context: this.context,
            denialResource: "purchasing.suppliers.lookup",
            denialSource: "purchasing.entity-lookup.hydrate-suppliers",
            permission: PURCHASING_PERMISSIONS.view,
          });
          return this.repository.hydrateSuppliers(ids);
        },
        search: async (input) => this.searchSuppliers(input),
      },
    };
  }

  private async searchSuppliers(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "purchasing.suppliers.lookup",
      denialSource: "purchasing.entity-lookup.search-suppliers",
      permission: PURCHASING_PERMISSIONS.view,
    });
    const page = await this.repository.searchSuppliers({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }

  private async searchDocuments(input: OxLookupSearchInput) {
    await requirePermission({
      context: this.context,
      denialResource: "purchasing.documents.lookup",
      denialSource: "purchasing.entity-lookup.search-documents",
      permission: PURCHASING_PERMISSIONS.view,
    });
    const page = await this.repository.searchDocuments({
      cursor: input.cursor,
      pageSize: input.pageSize,
      term: input.query.term,
    });
    return { ...page, minSearchLength: input.provider.minSearchLength };
  }
}
