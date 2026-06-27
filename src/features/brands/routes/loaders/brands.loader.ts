import "server-only";

import { brandListQuerySchema } from "../../application/schemas/brands.schema";
import { createBrandService } from "../service-factory";

export async function listBrands(query: unknown = {}) {
  const service = await createBrandService();
  return service.list(brandListQuerySchema.parse(query));
}

export async function getBrand(id: string) {
  const service = await createBrandService();
  return service.read(id);
}
