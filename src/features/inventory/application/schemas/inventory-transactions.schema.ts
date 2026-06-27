import { z } from "zod";

const optionalText = z.preprocess((value) => (value === "" ? null : value), z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const optionalNumber = z.preprocess((value) => (value === "" ? null : value), z.coerce.number().nullable().optional());

export const inventoryTransactionTypeSchema = z.enum([
  "stock_adjustment",
  "warehouse_transfer",
  "goods_receipt",
  "goods_issue",
  "cycle_count",
]);

export const inventoryTransactionLineSchema = z.object({
  productId: requiredText,
  unitId: requiredText,
  sourceWarehouseId: optionalText.optional(),
  sourceLocationId: optionalText.optional(),
  destinationWarehouseId: optionalText.optional(),
  destinationLocationId: optionalText.optional(),
  quantity: optionalNumber.refine((value) => value == null || value > 0, "Quantity must be positive."),
  quantityDelta: optionalNumber.refine((value) => value == null || value !== 0, "Quantity delta cannot be zero."),
  unitCost: z.coerce.number().min(0).default(0),
  reason: optionalText.optional(),
  expectedQuantity: z.coerce.number().min(0).optional(),
  countedQuantity: z.coerce.number().min(0).optional(),
});

export const inventoryTransactionMutationSchema = z.object({
  branchId: requiredText,
  transactionType: inventoryTransactionTypeSchema,
  title: requiredText,
  transactionDate: z.string().trim().optional(),
  sourceWarehouseId: optionalText.optional(),
  sourceLocationId: optionalText.optional(),
  destinationWarehouseId: optionalText.optional(),
  destinationLocationId: optionalText.optional(),
  reason: optionalText.optional(),
  idempotencyKey: optionalText.optional(),
  lines: z.array(inventoryTransactionLineSchema).min(1),
});

export const inventoryTransactionListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
