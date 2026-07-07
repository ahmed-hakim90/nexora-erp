import { z } from "zod";

import type { HrFoundationDescriptor, HrFoundationField } from "../foundation-entities";

export const hrFoundationListQuerySchema = z.object({
  cursor: z.string().optional(),
  edit: z.string().uuid().optional(),
  create: z.enum(["1"]).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
  status: z.string().optional(),
});

const optionalText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().min(1).nullable(),
);
const requiredText = z.string().trim().min(1);
const optionalUuid = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().uuid().nullable(),
);

function fieldSchema(field: HrFoundationField) {
  if (field.type === "checkbox") return z.coerce.boolean().optional();
  if (field.type === "number") {
    const schema = z.coerce.number();
    return field.required
      ? schema
      : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }
  if (field.type === "lookup") return field.required ? z.string().uuid() : optionalUuid;
  if (field.type === "select") {
    const schema = z.string().trim().min(1);
    return field.required ? schema : z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
  }
  if (field.type === "date") {
    const schema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected a YYYY-MM-DD date.");
    return field.required
      ? schema
      : z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());
  }
  return field.required ? requiredText : optionalText.optional();
}

export function buildHrFoundationMutationSchema(descriptor: HrFoundationDescriptor) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of descriptor.fields) {
    shape[field.name] = fieldSchema(field);
  }
  return z.object(shape);
}
