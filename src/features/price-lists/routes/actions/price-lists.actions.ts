"use server";

import { revalidatePath } from "next/cache";

import { priceListMutationSchema } from "../../application/schemas/price-lists.schema";
import { createPriceListService } from "../service-factory";

const basePath = "/erp/master-data/price-lists";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createPriceListAction(formData: FormData) {
  const service = await createPriceListService();
  await service.create(priceListMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updatePriceListAction(id: string, formData: FormData) {
  const service = await createPriceListService();
  await service.update(id, priceListMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeletePriceListAction(id: string) {
  const service = await createPriceListService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
