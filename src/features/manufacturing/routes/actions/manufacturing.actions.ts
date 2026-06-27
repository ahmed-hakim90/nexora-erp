"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { manufacturingMutationSchema, manufacturingResourceKeySchema } from "../../application/schemas/manufacturing.schema";
import { getManufacturingResourceDefinition } from "../../presentation/view-models/page-config";
import { createManufacturingFoundationService } from "../service-factory";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createManufacturingRecordAction(resourceKey: string, formData: FormData) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const input = manufacturingMutationSchema.parse(formDataToObject(formData));
  const service = await createManufacturingFoundationService(parsedResourceKey);
  const record = await service.create(input);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);

  revalidatePath(definition.basePath);
  redirect(`${definition.basePath}/${record.id}`);
}

export async function updateManufacturingRecordAction(resourceKey: string, id: string, formData: FormData) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const input = manufacturingMutationSchema.parse(formDataToObject(formData));
  const service = await createManufacturingFoundationService(parsedResourceKey);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);

  await service.update(id, input);
  revalidatePath(definition.basePath);
  revalidatePath(`${definition.basePath}/${id}`);
  redirect(`${definition.basePath}/${id}`);
}

export async function softDeleteManufacturingRecordAction(resourceKey: string, id: string) {
  const parsedResourceKey = manufacturingResourceKeySchema.parse(resourceKey);
  const service = await createManufacturingFoundationService(parsedResourceKey);
  const definition = getManufacturingResourceDefinition(parsedResourceKey);

  await service.softDelete(id);
  revalidatePath(definition.basePath);
}
