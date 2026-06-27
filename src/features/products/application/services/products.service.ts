import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { ProductRepository } from "../ports/products.repository";
import type { MasterDataListQuery, ProductCreateInput, ProductUpdateInput } from "../types";
import { assertProductCanBeSaved } from "../../domain/rules/products.rules";
import { PRODUCTS_PERMISSIONS } from "../../permissions/permission-registry";

export class ProductService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: ProductRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: PRODUCTS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: PRODUCTS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Product was not found." });
    }

    return record;
  }

  async create(input: ProductCreateInput) {
    await requirePermission({ context: this.context, permission: PRODUCTS_PERMISSIONS.create });
    assertProductCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: ProductUpdateInput) {
    await requirePermission({ context: this.context, permission: PRODUCTS_PERMISSIONS.update });
    assertProductCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: PRODUCTS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
