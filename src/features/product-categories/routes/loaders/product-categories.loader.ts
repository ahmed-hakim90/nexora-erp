import "server-only";

import { productCategoryListQuerySchema } from "../../application/schemas/product-categories.schema";
import { createProductCategoryService } from "../service-factory";

export async function listProductCategories(query: unknown = {}) {
  const service = await createProductCategoryService();
  return service.list(productCategoryListQuerySchema.parse(query));
}

export async function getProductCategory(id: string) {
  const service = await createProductCategoryService();
  return service.read(id);
}
