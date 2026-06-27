import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { TaxProfileRepository } from "../ports/tax-profiles.repository";
import type { MasterDataListQuery, TaxProfileCreateInput, TaxProfileUpdateInput } from "../types";
import { assertTaxProfileCanBeSaved } from "../../domain/rules/tax-profiles.rules";
import { TAXPROFILES_PERMISSIONS } from "../../permissions/permission-registry";

export class TaxProfileService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: TaxProfileRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: TAXPROFILES_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: TAXPROFILES_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "TaxProfile was not found." });
    }

    return record;
  }

  async create(input: TaxProfileCreateInput) {
    await requirePermission({ context: this.context, permission: TAXPROFILES_PERMISSIONS.create });
    assertTaxProfileCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: TaxProfileUpdateInput) {
    await requirePermission({ context: this.context, permission: TAXPROFILES_PERMISSIONS.update });
    assertTaxProfileCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: TAXPROFILES_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
