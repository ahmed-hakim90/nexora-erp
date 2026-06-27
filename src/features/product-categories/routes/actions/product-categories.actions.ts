"use server";

import { revalidatePath } from "next/cache";

import { productCategoryMutationSchema } from "../../application/schemas/product-categories.schema";
import { createProductCategoryService } from "../service-factory";

const basePath = "/erp/master-data/product-categories";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createProductCategoryAction(formData: FormData) {
  const service = await createProductCategoryService();
  await service.create(productCategoryMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateProductCategoryAction(id: string, formData: FormData) {
  const service = await createProductCategoryService();
  await service.update(id, productCategoryMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteProductCategoryAction(id: string) {
  const service = await createProductCategoryService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
