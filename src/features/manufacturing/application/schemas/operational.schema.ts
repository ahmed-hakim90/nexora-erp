import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const positiveQuantity = z.coerce.number().finite().positive();
const nonNegativeQuantity = z.coerce.number().finite().min(0);
const optionalDateTime = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());

export const manufacturingBomLineMutationSchema = z.object({
  componentProductId: requiredText,
  lineNumber: z.coerce.number().int().positive(),
  notes: optionalText.optional(),
  operationId: optionalText.optional(),
  quantity: positiveQuantity,
  scrapPercent: nonNegativeQuantity.max(100),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("active"),
  uomId: requiredText,
});

export const manufacturingRoutingStepMutationSchema = z.object({
  estimatedTimeMinutes: nonNegativeQuantity,
  notes: optionalText.optional(),
  operationId: requiredText,
  runTimeMinutes: nonNegativeQuantity,
  setupTimeMinutes: nonNegativeQuantity,
  status: z.enum(["draft", "active", "inactive", "archived"]).default("active"),
  stepSequence: z.coerce.number().int().positive(),
  workCenterId: requiredText,
  workstationId: optionalText.optional(),
}).refine((value) => value.estimatedTimeMinutes === 0 || value.estimatedTimeMinutes >= value.setupTimeMinutes + value.runTimeMinutes, {
  message: "Estimated time must cover setup plus run time, or be zero.",
  path: ["estimatedTimeMinutes"],
});

export const manufacturingPlanLineMutationSchema = z.object({
  lineNumber: z.coerce.number().int().positive(),
  manufacturingProductId: requiredText,
  plannedEnd: optionalDateTime.optional(),
  plannedLineId: requiredText,
  plannedQuantity: positiveQuantity,
  plannedShiftKey: requiredText,
  plannedStart: optionalDateTime.optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  status: z.enum(["draft", "ready", "released", "completed", "cancelled"]).default("draft"),
}).refine((value) => !value.plannedStart || !value.plannedEnd || value.plannedEnd >= value.plannedStart, {
  message: "Planned end must be after planned start.",
  path: ["plannedEnd"],
});

export const manufacturingOrderLifecycleSchema = z.object({
  nextStatus: z.enum(["draft", "released", "active", "completed", "cancelled"]),
});

export const manufacturingWorkOrderLifecycleSchema = z.object({
  nextStatus: z.enum(["draft", "ready", "active", "paused", "completed", "cancelled"]),
});
