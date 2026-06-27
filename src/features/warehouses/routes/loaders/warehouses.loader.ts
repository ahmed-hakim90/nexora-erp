import "server-only";

import { warehouseListQuerySchema } from "../../application/schemas/warehouses.schema";
import { createWarehouseService } from "../service-factory";

export async function listWarehouses(query: unknown = {}) {
  const service = await createWarehouseService();
  return service.list(warehouseListQuerySchema.parse(query));
}

export async function getWarehouse(id: string) {
  const service = await createWarehouseService();
  return service.read(id);
}
