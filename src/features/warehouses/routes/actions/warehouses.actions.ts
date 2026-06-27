"use server";

import { revalidatePath } from "next/cache";

import { warehouseMutationSchema } from "../../application/schemas/warehouses.schema";
import { createWarehouseService } from "../service-factory";

const basePath = "/erp/master-data/warehouses";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createWarehouseAction(formData: FormData) {
  const service = await createWarehouseService();
  await service.create(warehouseMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateWarehouseAction(id: string, formData: FormData) {
  const service = await createWarehouseService();
  await service.update(id, warehouseMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteWarehouseAction(id: string) {
  const service = await createWarehouseService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
