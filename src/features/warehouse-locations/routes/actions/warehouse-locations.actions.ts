"use server";

import { revalidatePath } from "next/cache";

import { warehouseLocationMutationSchema } from "../../application/schemas/warehouse-locations.schema";
import { createWarehouseLocationService } from "../service-factory";

const basePath = "/erp/master-data/warehouse-locations";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createWarehouseLocationAction(formData: FormData) {
  const service = await createWarehouseLocationService();
  await service.create(warehouseLocationMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateWarehouseLocationAction(id: string, formData: FormData) {
  const service = await createWarehouseLocationService();
  await service.update(id, warehouseLocationMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteWarehouseLocationAction(id: string) {
  const service = await createWarehouseLocationService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
