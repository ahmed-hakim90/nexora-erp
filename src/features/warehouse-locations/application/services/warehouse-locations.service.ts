import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { WarehouseLocationRepository } from "../ports/warehouse-locations.repository";
import type { MasterDataListQuery, WarehouseLocationCreateInput, WarehouseLocationUpdateInput } from "../types";
import { assertWarehouseLocationCanBeSaved } from "../../domain/rules/warehouse-locations.rules";
import { WAREHOUSELOCATIONS_PERMISSIONS } from "../../permissions/permission-registry";

export class WarehouseLocationService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: WarehouseLocationRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: WAREHOUSELOCATIONS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: WAREHOUSELOCATIONS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "WarehouseLocation was not found." });
    }

    return record;
  }

  async create(input: WarehouseLocationCreateInput) {
    await requirePermission({ context: this.context, permission: WAREHOUSELOCATIONS_PERMISSIONS.create });
    assertWarehouseLocationCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: WarehouseLocationUpdateInput) {
    await requirePermission({ context: this.context, permission: WAREHOUSELOCATIONS_PERMISSIONS.update });
    assertWarehouseLocationCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: WAREHOUSELOCATIONS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
