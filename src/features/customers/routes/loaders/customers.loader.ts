import "server-only";

import { customerListQuerySchema } from "../../application/schemas/customers.schema";
import { createCustomerService } from "../service-factory";

export async function listCustomers(query: unknown = {}) {
  const service = await createCustomerService();
  return service.list(customerListQuerySchema.parse(query));
}

export async function getCustomer(id: string) {
  const service = await createCustomerService();
  return service.read(id);
}
