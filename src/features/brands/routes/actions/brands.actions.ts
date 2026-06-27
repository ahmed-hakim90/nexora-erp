"use server";

import { revalidatePath } from "next/cache";

import { brandMutationSchema } from "../../application/schemas/brands.schema";
import { createBrandService } from "../service-factory";

const basePath = "/erp/master-data/brands";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createBrandAction(formData: FormData) {
  const service = await createBrandService();
  await service.create(brandMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateBrandAction(id: string, formData: FormData) {
  const service = await createBrandService();
  await service.update(id, brandMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteBrandAction(id: string) {
  const service = await createBrandService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
