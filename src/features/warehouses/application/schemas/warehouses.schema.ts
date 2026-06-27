import { z } from "zod";

const requiredText = z.string().trim().min(1);
const warehouseType = z.enum(["main", "branch", "operational", "returns", "quarantine"]);

export const warehouseListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const warehouseMutationSchema = z.object({
  warehouseCode: requiredText,
  nameAr: requiredText,
  nameEn: requiredText,
  warehouseType,
  branchId: requiredText,
  isActive: z.coerce.boolean().default(true),
});
