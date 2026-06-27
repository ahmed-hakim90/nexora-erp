import "server-only";

import { manufacturingListQuerySchema, manufacturingResourceKeySchema } from "../../application/schemas/manufacturing.schema";
import { createManufacturingFoundationService } from "../service-factory";

export async function listManufacturingRecords(resourceKey: unknown, query: unknown = {}) {
  const service = await createManufacturingFoundationService(manufacturingResourceKeySchema.parse(resourceKey));
  return service.list(manufacturingListQuerySchema.parse(query));
}

export async function getManufacturingRecord(resourceKey: unknown, id: string) {
  const service = await createManufacturingFoundationService(manufacturingResourceKeySchema.parse(resourceKey));
  return service.read(id);
}
