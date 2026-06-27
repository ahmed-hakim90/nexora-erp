import { z } from "zod";

const optionalText = z.preprocess((value) => (value === "" ? null : value), z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);

export const purchaseDocumentKindSchema = z.enum(["request", "rfq", "order", "receipt"]);

export const purchasingListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().optional(),
});

export const purchaseLineSchema = z.object({
  productId: requiredText,
  purchaseOrderLineId: optionalText.optional(),
  quantity: z.coerce.number().positive(),
  note: optionalText.optional(),
  unitId: requiredText,
  unitPrice: z.coerce.number().min(0).default(0),
});

export const purchaseDocumentMutationSchema = z.object({
  branchId: requiredText,
  destinationLocationId: optionalText.optional(),
  destinationWarehouseId: optionalText.optional(),
  documentDate: optionalText.optional(),
  lines: z.array(purchaseLineSchema).min(1),
  neededBy: optionalText.optional(),
  purchaseOrderId: optionalText.optional(),
  purchaseRequestId: optionalText.optional(),
  purchaseRfqId: optionalText.optional(),
  supplierId: optionalText.optional(),
  title: requiredText,
});

export const receiptPostingSchema = z.object({
  idempotencyKey: requiredText,
});
