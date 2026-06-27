import "server-only";

import { unitListQuerySchema } from "../../application/schemas/units.schema";
import { createUnitService } from "../service-factory";

export async function listUnits(query: unknown = {}) {
  const service = await createUnitService();
  return service.list(unitListQuerySchema.parse(query));
}

export async function getUnit(id: string) {
  const service = await createUnitService();
  return service.read(id);
}
