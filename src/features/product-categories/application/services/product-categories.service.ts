import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { ProductCategoryRepository } from "../ports/product-categories.repository";
import type { MasterDataListQuery, ProductCategoryCreateInput, ProductCategoryUpdateInput } from "../types";
import { assertProductCategoryCanBeSaved } from "../../domain/rules/product-categories.rules";
import { PRODUCTCATEGORIES_PERMISSIONS } from "../../permissions/permission-registry";

export class ProductCategoryService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: ProductCategoryRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: PRODUCTCATEGORIES_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: PRODUCTCATEGORIES_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "ProductCategory was not found." });
    }

    return record;
  }

  async create(input: ProductCategoryCreateInput) {
    await requirePermission({ context: this.context, permission: PRODUCTCATEGORIES_PERMISSIONS.create });
    assertProductCategoryCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: ProductCategoryUpdateInput) {
    await requirePermission({ context: this.context, permission: PRODUCTCATEGORIES_PERMISSIONS.update });
    assertProductCategoryCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: PRODUCTCATEGORIES_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
