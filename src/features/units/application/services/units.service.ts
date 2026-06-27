import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { UnitRepository } from "../ports/units.repository";
import type { MasterDataListQuery, UnitCreateInput, UnitUpdateInput } from "../types";
import { assertUnitCanBeSaved } from "../../domain/rules/units.rules";
import { UNITS_PERMISSIONS } from "../../permissions/permission-registry";

export class UnitService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: UnitRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: UNITS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: UNITS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Unit was not found." });
    }

    return record;
  }

  async create(input: UnitCreateInput) {
    await requirePermission({ context: this.context, permission: UNITS_PERMISSIONS.create });
    assertUnitCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: UnitUpdateInput) {
    await requirePermission({ context: this.context, permission: UNITS_PERMISSIONS.update });
    assertUnitCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: UNITS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
