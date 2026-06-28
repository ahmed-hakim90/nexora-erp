import { z } from "zod";

import type { InventoryFoundationDescriptor, InventoryFoundationField } from "../foundation-entities";

export const inventoryFoundationListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(64).optional(),
});

const optionalText = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);

function fieldSchema(field: InventoryFoundationField): z.ZodTypeAny {
  if (field.type === "checkbox") {
    return z.preprocess((value) => value === true || value === "true" || value === "on" || value === "1", z.boolean());
  }

  if (field.type === "number") {
    let schema = z.coerce.number();
    if (field.min !== undefined) schema = schema.min(field.min);
    return field.required ? schema : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }

  if (field.type === "select" && field.options) {
    const values = field.options.map((option) => option.value);
    const schema = z.enum(values as [string, ...string[]]);
    return field.required ? schema : z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
  }

  if (field.type === "date") {
    const schema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected a YYYY-MM-DD date.");
    return field.required ? schema : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }

  if (field.type === "json") {
    return z.preprocess((value) => {
      if (value === "" || value === undefined) return {};
      if (typeof value !== "string") return value;
      return JSON.parse(value) as unknown;
    }, z.record(z.string(), z.unknown()));
  }

  return field.required ? requiredText : optionalText.optional();
}

export function buildInventoryFoundationMutationSchema(descriptor: InventoryFoundationDescriptor) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of descriptor.fields) {
    shape[field.name] = fieldSchema(field);
  }

  return z.object(shape).superRefine((input, context) => {
    if (descriptor.key === "lots" && typeof input.receivedOn === "string" && typeof input.expiresOn === "string" && input.expiresOn < input.receivedOn) {
      context.addIssue({ code: "custom", message: "Expiry date must be on or after received date.", path: ["expiresOn"] });
    }

    if (descriptor.key === "reorder-rules") {
      const minimum = typeof input.minimumQuantity === "number" ? input.minimumQuantity : null;
      const maximum = typeof input.maximumQuantity === "number" ? input.maximumQuantity : null;
      if (minimum !== null && maximum !== null && maximum < minimum) {
        context.addIssue({ code: "custom", message: "Maximum quantity must be greater than or equal to minimum quantity.", path: ["maximumQuantity"] });
      }
    }
  });
}
