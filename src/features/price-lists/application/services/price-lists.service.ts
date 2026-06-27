import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { PriceListRepository } from "../ports/price-lists.repository";
import type { MasterDataListQuery, PriceListCreateInput, PriceListUpdateInput } from "../types";
import { assertPriceListCanBeSaved } from "../../domain/rules/price-lists.rules";
import { PRICELISTS_PERMISSIONS } from "../../permissions/permission-registry";

export class PriceListService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: PriceListRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: PRICELISTS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: PRICELISTS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "PriceList was not found." });
    }

    return record;
  }

  async create(input: PriceListCreateInput) {
    await requirePermission({ context: this.context, permission: PRICELISTS_PERMISSIONS.create });
    assertPriceListCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: PriceListUpdateInput) {
    await requirePermission({ context: this.context, permission: PRICELISTS_PERMISSIONS.update });
    assertPriceListCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: PRICELISTS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
