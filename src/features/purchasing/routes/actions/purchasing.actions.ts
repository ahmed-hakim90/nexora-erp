"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { purchaseDocumentKindSchema, purchaseDocumentMutationSchema, receiptPostingSchema } from "../../application/schemas/purchasing.schema";
import type { PurchaseDocumentKind, PurchaseStatus } from "../../application/types/purchasing";
import { createPurchasingService } from "../service-factory";

const basePath = "/erp/purchasing";

function formDataToObject(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    lines: [
      {
        note: raw.lineNote,
        productId: raw.productId,
        purchaseOrderLineId: raw.purchaseOrderLineId,
        quantity: raw.quantity,
        unitId: raw.unitId,
        unitPrice: raw.unitPrice,
      },
    ],
  };
}

function purchasingPathFor(kind: PurchaseDocumentKind) {
  if (kind === "request") return `${basePath}/requests`;
  if (kind === "rfq") return `${basePath}/rfqs`;
  if (kind === "order") return `${basePath}/orders`;
  return `${basePath}/receipts`;
}

export async function createPurchaseDocumentAction(kind: PurchaseDocumentKind, formData: FormData) {
  const documentKind = purchaseDocumentKindSchema.parse(kind);
  const input = purchaseDocumentMutationSchema.parse(formDataToObject(formData));
  const service = await createPurchasingService();
  const detail = await service.create(documentKind, input);
  revalidatePath(purchasingPathFor(documentKind));
  redirect(`${purchasingPathFor(documentKind)}/${detail.document.id}`);
}

export async function transitionPurchaseDocumentAction(kind: PurchaseDocumentKind, id: string, status: PurchaseStatus) {
  const documentKind = purchaseDocumentKindSchema.parse(kind);
  const service = await createPurchasingService();
  await service.transition(documentKind, id, status);
  revalidatePath(purchasingPathFor(documentKind));
  revalidatePath(`${purchasingPathFor(documentKind)}/${id}`);
}

export async function postPurchaseReceiptAction(id: string, formData: FormData) {
  const input = receiptPostingSchema.parse(Object.fromEntries(formData.entries()));
  const service = await createPurchasingService();
  await service.postReceipt(id, input);
  revalidatePath(purchasingPathFor("receipt"));
  revalidatePath(`${purchasingPathFor("receipt")}/${id}`);
}

export async function reversePurchaseReceiptAction(id: string, formData: FormData) {
  const input = receiptPostingSchema.parse(Object.fromEntries(formData.entries()));
  const service = await createPurchasingService();
  await service.reverseReceipt(id, input);
  revalidatePath(purchasingPathFor("receipt"));
  revalidatePath(`${purchasingPathFor("receipt")}/${id}`);
}
