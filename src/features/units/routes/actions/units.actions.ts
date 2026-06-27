"use server";

import { revalidatePath } from "next/cache";

import { unitMutationSchema } from "../../application/schemas/units.schema";
import { createUnitService } from "../service-factory";

const basePath = "/erp/master-data/units";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createUnitAction(formData: FormData) {
  const service = await createUnitService();
  await service.create(unitMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateUnitAction(id: string, formData: FormData) {
  const service = await createUnitService();
  await service.update(id, unitMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteUnitAction(id: string) {
  const service = await createUnitService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
