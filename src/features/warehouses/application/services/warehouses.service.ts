import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { WarehouseRepository } from "../ports/warehouses.repository";
import type { MasterDataListQuery, WarehouseCreateInput, WarehouseUpdateInput } from "../types";
import { assertWarehouseCanBeSaved } from "../../domain/rules/warehouses.rules";
import { WAREHOUSES_PERMISSIONS } from "../../permissions/permission-registry";

export class WarehouseService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: WarehouseRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: WAREHOUSES_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: WAREHOUSES_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Warehouse was not found." });
    }

    return record;
  }

  async create(input: WarehouseCreateInput) {
    await requirePermission({ context: this.context, permission: WAREHOUSES_PERMISSIONS.create });
    assertWarehouseCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: WarehouseUpdateInput) {
    await requirePermission({ context: this.context, permission: WAREHOUSES_PERMISSIONS.update });
    assertWarehouseCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: WAREHOUSES_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
