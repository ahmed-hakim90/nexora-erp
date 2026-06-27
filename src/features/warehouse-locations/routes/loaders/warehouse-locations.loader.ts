import "server-only";

import { warehouseLocationListQuerySchema } from "../../application/schemas/warehouse-locations.schema";
import { createWarehouseLocationService } from "../service-factory";

export async function listWarehouseLocations(query: unknown = {}) {
  const service = await createWarehouseLocationService();
  return service.list(warehouseLocationListQuerySchema.parse(query));
}

export async function getWarehouseLocation(id: string) {
  const service = await createWarehouseLocationService();
  return service.read(id);
}
