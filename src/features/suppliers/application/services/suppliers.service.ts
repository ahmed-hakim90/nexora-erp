import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { SupplierRepository } from "../ports/suppliers.repository";
import type { MasterDataListQuery, SupplierCreateInput, SupplierUpdateInput } from "../types";
import { assertSupplierCanBeSaved } from "../../domain/rules/suppliers.rules";
import { SUPPLIERS_PERMISSIONS } from "../../permissions/permission-registry";

export class SupplierService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: SupplierRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: SUPPLIERS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: SUPPLIERS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Supplier was not found." });
    }

    return record;
  }

  async create(input: SupplierCreateInput) {
    await requirePermission({ context: this.context, permission: SUPPLIERS_PERMISSIONS.create });
    assertSupplierCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: SupplierUpdateInput) {
    await requirePermission({ context: this.context, permission: SUPPLIERS_PERMISSIONS.update });
    assertSupplierCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: SUPPLIERS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
