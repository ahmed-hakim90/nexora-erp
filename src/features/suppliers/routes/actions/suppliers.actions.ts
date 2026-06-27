"use server";

import { revalidatePath } from "next/cache";

import { supplierMutationSchema } from "../../application/schemas/suppliers.schema";
import { createSupplierService } from "../service-factory";

const basePath = "/erp/master-data/suppliers";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createSupplierAction(formData: FormData) {
  const service = await createSupplierService();
  await service.create(supplierMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateSupplierAction(id: string, formData: FormData) {
  const service = await createSupplierService();
  await service.update(id, supplierMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteSupplierAction(id: string) {
  const service = await createSupplierService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
