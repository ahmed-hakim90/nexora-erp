"use server";

import { revalidatePath } from "next/cache";

import { customerMutationSchema } from "../../application/schemas/customers.schema";
import { createCustomerService } from "../service-factory";

const basePath = "/erp/master-data/customers";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createCustomerAction(formData: FormData) {
  const service = await createCustomerService();
  await service.create(customerMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const service = await createCustomerService();
  await service.update(id, customerMutationSchema.parse(formDataToObject(formData)));
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function softDeleteCustomerAction(id: string) {
  const service = await createCustomerService();
  await service.softDelete(id);
  revalidatePath(basePath);
}
