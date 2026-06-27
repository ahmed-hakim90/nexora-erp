import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const customerType = z.enum(["individual", "company", "government", "internal"]);

export const customerListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const customerMutationSchema = z.object({
  customerCode: requiredText,
  nameAr: requiredText,
  nameEn: requiredText,
  phone: optionalText,
  email: optionalText,
  taxNumber: optionalText,
  customerType,
  branchId: optionalText.optional(),
  isActive: z.coerce.boolean().default(true),
});
