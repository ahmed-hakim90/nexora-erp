import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const unitType = z.enum(["quantity", "weight", "volume", "length", "time", "service", "package"]);

export const unitListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const unitMutationSchema = z.object({
  code: requiredText,
  nameAr: requiredText,
  nameEn: requiredText,
  unitType,
  precisionScale: z.coerce.number().int().min(0).max(6).default(2),
  isBaseUnit: z.coerce.boolean().default(false),
  branchId: optionalText.optional(),
  isActive: z.coerce.boolean().default(true),
});
