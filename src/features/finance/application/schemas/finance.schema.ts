import { z } from "zod";

import type { FinanceEntityDescriptor, FinanceFieldDescriptor } from "../types";

export const financeListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

const checkboxSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

const optionalText = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().min(1).nullable(),
);

const tagsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}, z.array(z.string()));

function buildFieldSchema(field: FinanceFieldDescriptor): z.ZodTypeAny {
  switch (field.type) {
    case "checkbox":
      return checkboxSchema.default(false);
    case "tags":
      return tagsSchema.default([]);
    case "number": {
      let numberSchema = z.coerce.number();
      if (field.min !== undefined) numberSchema = numberSchema.min(field.min);
      if (field.max !== undefined) numberSchema = numberSchema.max(field.max);
      return field.required
        ? numberSchema
        : z.preprocess((value) => (value === "" || value === undefined ? null : value), numberSchema.nullable());
    }
    case "select": {
      const values = (field.options ?? []).map((option) => option.value);
      const enumSchema = z.enum(values as [string, ...string[]]);
      return field.required ? enumSchema : enumSchema.optional();
    }
    case "date": {
      const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected a YYYY-MM-DD date.");
      return field.required
        ? dateSchema
        : z.preprocess((value) => (value === "" || value === undefined ? null : value), dateSchema.nullable());
    }
    case "textarea":
    case "text":
    default:
      return field.required ? z.string().trim().min(1) : optionalText.optional();
  }
}

export function buildFinanceMutationSchema(descriptor: FinanceEntityDescriptor) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of descriptor.fields) {
    shape[field.name] = buildFieldSchema(field);
  }

  return z.object(shape).superRefine((input, context) => {
    if ((descriptor.key === "fiscal-years" || descriptor.key === "fiscal-periods") && typeof input.startsOn === "string" && typeof input.endsOn === "string") {
      if (input.endsOn < input.startsOn) {
        context.addIssue({
          code: "custom",
          message: "End date must be on or after start date.",
          path: ["endsOn"],
        });
      }
    }

    if (descriptor.key === "payment-terms") {
      const dueDays = typeof input.dueDays === "number" ? input.dueDays : null;
      const discountDays = typeof input.discountDays === "number" ? input.discountDays : null;
      if (dueDays !== null && discountDays !== null && discountDays > dueDays) {
        context.addIssue({
          code: "custom",
          message: "Discount days must be less than or equal to due days.",
          path: ["discountDays"],
        });
      }
    }

    if (descriptor.key === "currencies" && input.isBaseCurrency === true && input.status && input.status !== "active") {
      context.addIssue({
        code: "custom",
        message: "Base currency must be active.",
        path: ["status"],
      });
    }
  });
}

export type FinanceMutationValues = Record<string, unknown>;
