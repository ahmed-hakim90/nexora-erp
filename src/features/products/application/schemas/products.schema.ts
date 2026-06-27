import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const productType = z.enum(["raw_material", "semi_finished", "finished_good", "packaging", "consumable", "service"]);

export const productListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const productMutationSchema = z.object({
  sku: requiredText,
  barcode: optionalText,
  nameAr: requiredText,
  nameEn: requiredText,
  categoryId: optionalText.optional(),
  brandId: optionalText.optional(),
  productType,
  unitId: optionalText.optional(),
  defaultPurchaseUnitId: optionalText.optional(),
  defaultSalesUnitId: optionalText.optional(),
  isManufacturable: z.coerce.boolean().default(false),
  isStockable: z.coerce.boolean().default(true),
  isSellable: z.coerce.boolean().default(true),
  isPurchasable: z.coerce.boolean().default(true),
  branchId: optionalText.optional(),
  isActive: z.coerce.boolean().default(true),
});
