import "server-only";

import { supplierListQuerySchema } from "../../application/schemas/suppliers.schema";
import { createSupplierService } from "../service-factory";

export async function listSuppliers(query: unknown = {}) {
  const service = await createSupplierService();
  return service.list(supplierListQuerySchema.parse(query));
}

export async function getSupplier(id: string) {
  const service = await createSupplierService();
  return service.read(id);
}
