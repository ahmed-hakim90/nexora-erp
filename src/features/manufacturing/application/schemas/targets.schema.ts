import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const quantity = z.coerce.number().min(0);

export const manufacturingTargetTypeSchema = z.enum(["product", "line", "worker"]);

export const manufacturingProductTargetSchema = z.object({
  manufacturingProductId: requiredText,
  status: z.enum(["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"]),
  targetKey: requiredText.regex(/^[a-z0-9][a-z0-9._-]*$/),
  targetPeriod: z.enum(["daily", "shift", "hourly"]),
  targetQuantity: quantity.min(0.000001),
});

export const manufacturingLineTargetSchema = z.object({
  actualQuantity: quantity.default(0),
  manufacturingProductId: requiredText,
  planId: requiredText,
  productionLineId: requiredText,
  plannedQuantity: quantity.min(0.000001),
  status: z.enum(["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"]),
  targetKey: requiredText.regex(/^[a-z0-9][a-z0-9._-]*$/),
});

export const manufacturingWorkerTargetSchema = z.object({
  actualQuantity: quantity.default(0),
  planId: requiredText,
  productionLineId: requiredText,
  status: z.enum(["draft", "active", "released", "completed", "cancelled", "inactive", "locked", "archived"]),
  targetKey: requiredText.regex(/^[a-z0-9][a-z0-9._-]*$/),
  targetQuantity: quantity.min(0.000001),
  workerRefId: requiredText,
});

export const manufacturingTargetMutationSchema = z.discriminatedUnion("targetType", [
  z.object({ targetType: z.literal("product"), ...manufacturingProductTargetSchema.shape }),
  z.object({ targetType: z.literal("line"), ...manufacturingLineTargetSchema.shape }),
  z.object({ targetType: z.literal("worker"), ...manufacturingWorkerTargetSchema.shape }),
]);

export const optionalTargetIdSchema = optionalText.optional();
