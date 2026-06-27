import "server-only";

import { taxProfileListQuerySchema } from "../../application/schemas/tax-profiles.schema";
import { createTaxProfileService } from "../service-factory";

export async function listTaxProfiles(query: unknown = {}) {
  const service = await createTaxProfileService();
  return service.list(taxProfileListQuerySchema.parse(query));
}

export async function getTaxProfile(id: string) {
  const service = await createTaxProfileService();
  return service.read(id);
}
