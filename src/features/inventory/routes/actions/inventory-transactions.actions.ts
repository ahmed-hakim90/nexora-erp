"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { inventoryTransactionMutationSchema, inventoryTransactionTypeSchema } from "../../application/schemas/inventory-transactions.schema";
import type { InventoryTransactionType } from "../../application/types/inventory-transactions";
import { createInventoryTransactionServices } from "../service-factory";

const basePath = "/erp/inventory/transactions";

function formDataToObject(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    lines: [
      {
        countedQuantity: raw.countedQuantity,
        destinationLocationId: raw.lineDestinationLocationId || raw.destinationLocationId,
        destinationWarehouseId: raw.lineDestinationWarehouseId || raw.destinationWarehouseId,
        expectedQuantity: raw.expectedQuantity,
        productId: raw.productId,
        quantity: raw.quantity,
        quantityDelta: raw.quantityDelta,
        reason: raw.lineReason || raw.reason,
        sourceLocationId: raw.lineSourceLocationId || raw.sourceLocationId,
        sourceWarehouseId: raw.lineSourceWarehouseId || raw.sourceWarehouseId,
        unitCost: raw.unitCost,
        unitId: raw.unitId,
      },
    ],
  };
}

function pathForType(type: InventoryTransactionType) {
  return `${basePath}/${type.replaceAll("_", "-")}`;
}

export async function createInventoryTransactionAction(type: InventoryTransactionType, formData: FormData) {
  const transactionType = inventoryTransactionTypeSchema.parse(type);
  const input = inventoryTransactionMutationSchema.parse({
    ...formDataToObject(formData),
    transactionType,
  });
  const { transactionService } = await createInventoryTransactionServices();
  const detail = await transactionService.create(input);
  revalidatePath(basePath);
  revalidatePath(pathForType(transactionType));
  redirect(`${pathForType(transactionType)}/${detail.transaction.id}`);
}

export async function updateInventoryTransactionAction(id: string, type: InventoryTransactionType, formData: FormData) {
  const transactionType = inventoryTransactionTypeSchema.parse(type);
  const input = inventoryTransactionMutationSchema.parse({
    ...formDataToObject(formData),
    transactionType,
  });
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.update(id, input);
  revalidatePath(basePath);
  revalidatePath(pathForType(transactionType));
  revalidatePath(`${pathForType(transactionType)}/${id}`);
  redirect(`${pathForType(transactionType)}/${id}`);
}

export async function submitInventoryTransactionAction(id: string) {
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.submit(id);
  revalidatePath(basePath);
}

export async function cancelInventoryTransactionAction(id: string) {
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.cancel(id);
  revalidatePath(basePath);
}

export async function postInventoryTransactionAction(id: string, formData: FormData) {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.post(id, { idempotencyKey });
  revalidatePath(basePath);
}

export async function reverseInventoryTransactionAction(id: string, formData: FormData) {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const { transactionService } = await createInventoryTransactionServices();
  await transactionService.reverse(id, { idempotencyKey });
  revalidatePath(basePath);
}
