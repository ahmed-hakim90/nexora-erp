"use server";

import { revalidatePath } from "next/cache";

import { taxProfileMutationSchema } from "../../application/schemas/tax-profiles.schema";
import { createTaxProfileService } from "../service-factory";

const basePath = "/erp/master-data/tax-profiles";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createTaxProfileAction(formData: FormData) {
  const service = await createTaxProfileService();
  await service.create(taxProfileMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateTaxProfileAction(id: string, formData: FormData) {
  const service = await createTaxProfileService();
  await service.update(id, taxProfileMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteTaxProfileAction(id: string) {
  const service = await createTaxProfileService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
