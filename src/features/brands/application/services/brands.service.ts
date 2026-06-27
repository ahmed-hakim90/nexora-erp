import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { BrandRepository } from "../ports/brands.repository";
import type { MasterDataListQuery, BrandCreateInput, BrandUpdateInput } from "../types";
import { assertBrandCanBeSaved } from "../../domain/rules/brands.rules";
import { BRANDS_PERMISSIONS } from "../../permissions/permission-registry";

export class BrandService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: BrandRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: BRANDS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: BRANDS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Brand was not found." });
    }

    return record;
  }

  async create(input: BrandCreateInput) {
    await requirePermission({ context: this.context, permission: BRANDS_PERMISSIONS.create });
    assertBrandCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: BrandUpdateInput) {
    await requirePermission({ context: this.context, permission: BRANDS_PERMISSIONS.update });
    assertBrandCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: BRANDS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
