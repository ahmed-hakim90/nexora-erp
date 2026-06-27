import "server-only";

import { productListQuerySchema } from "../../application/schemas/products.schema";
import { createProductService } from "../service-factory";

export async function listProducts(query: unknown = {}) {
  const service = await createProductService();
  return service.list(productListQuerySchema.parse(query));
}

export async function getProduct(id: string) {
  const service = await createProductService();
  return service.read(id);
}
