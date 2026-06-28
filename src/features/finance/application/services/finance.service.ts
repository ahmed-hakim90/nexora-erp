import { ApplicationError } from "@/core/errors";
import type { CompanyRequestContext } from "@/platform/auth/server";
import { hasServerPermission, requirePermission } from "@/platform/permissions/server";

import type { FinanceRepository } from "../ports/finance.repository";
import type { FinanceEntityDescriptor, FinanceListQuery, FinanceMutationInput } from "../types";

export class FinanceService {
  constructor(
    private readonly context: CompanyRequestContext,
    private readonly repository: FinanceRepository,
    private readonly descriptor: FinanceEntityDescriptor,
  ) {}

  async list(query: FinanceListQuery) {
    await requirePermission({ context: this.context, permission: this.descriptor.viewPermission });
    return this.repository.list(query);
  }

  async listAll(query: FinanceListQuery) {
    await requirePermission({ context: this.context, permission: this.descriptor.viewPermission });
    return this.repository.listAll(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: this.descriptor.viewPermission });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: `${this.descriptor.singular} was not found.`,
      });
    }

    return record;
  }

  async create(input: FinanceMutationInput) {
    await requirePermission({ context: this.context, permission: this.descriptor.managePermission });
    return this.repository.create(input);
  }

  async update(id: string, input: FinanceMutationInput) {
    await requirePermission({ context: this.context, permission: this.descriptor.managePermission });
    return this.repository.update(id, input);
  }

  async archive(id: string) {
    await requirePermission({ context: this.context, permission: this.descriptor.managePermission });
    await this.repository.archive(id);
  }

  async count() {
    await requirePermission({ context: this.context, permission: this.descriptor.viewPermission });
    return this.repository.count();
  }

  async getAccess() {
    const [canView, canManage] = await Promise.all([
      hasServerPermission({ context: this.context, permission: this.descriptor.viewPermission }),
      hasServerPermission({ context: this.context, permission: this.descriptor.managePermission }),
    ]);

    return { canManage, canView };
  }
}
