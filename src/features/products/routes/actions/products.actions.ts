"use server";

import { revalidatePath } from "next/cache";

import { productMutationSchema } from "../../application/schemas/products.schema";
import { createProductService } from "../service-factory";

const basePath = "/erp/master-data/products";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createProductAction(formData: FormData) {
  const service = await createProductService();
  await service.create(productMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateProductAction(id: string, formData: FormData) {
  const service = await createProductService();
  await service.update(id, productMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteProductAction(id: string) {
  const service = await createProductService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
