import "server-only";

import { priceListListQuerySchema } from "../../application/schemas/price-lists.schema";
import { createPriceListService } from "../service-factory";

export async function listPriceLists(query: unknown = {}) {
  const service = await createPriceListService();
  return service.list(priceListListQuerySchema.parse(query));
}

export async function getPriceList(id: string) {
  const service = await createPriceListService();
  return service.read(id);
}
