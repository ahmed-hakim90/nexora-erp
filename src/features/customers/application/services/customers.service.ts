import { ApplicationError } from "@/core/errors";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { CustomerRepository } from "../ports/customers.repository";
import type { MasterDataListQuery, CustomerCreateInput, CustomerUpdateInput } from "../types";
import { assertCustomerCanBeSaved } from "../../domain/rules/customers.rules";
import { CUSTOMERS_PERMISSIONS } from "../../permissions/permission-registry";

export class CustomerService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: CustomerRepository,
  ) {}

  async list(query: MasterDataListQuery) {
    await requirePermission({ context: this.context, permission: CUSTOMERS_PERMISSIONS.read });
    return this.repository.list(query);
  }

  async read(id: string) {
    await requirePermission({ context: this.context, permission: CUSTOMERS_PERMISSIONS.read });
    const record = await this.repository.findById(id);

    if (!record) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Customer was not found." });
    }

    return record;
  }

  async create(input: CustomerCreateInput) {
    await requirePermission({ context: this.context, permission: CUSTOMERS_PERMISSIONS.create });
    assertCustomerCanBeSaved(input);
    return this.repository.create(input);
  }

  async update(id: string, input: CustomerUpdateInput) {
    await requirePermission({ context: this.context, permission: CUSTOMERS_PERMISSIONS.update });
    assertCustomerCanBeSaved(input);
    return this.repository.update(id, input);
  }

  async softDelete(id: string) {
    await requirePermission({ context: this.context, permission: CUSTOMERS_PERMISSIONS.delete });
    await this.repository.softDelete(id);
  }
}
