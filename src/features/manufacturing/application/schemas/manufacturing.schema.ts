import { z } from "zod";

export const manufacturingResourceKeySchema = z.enum([
  "production-lines",
  "work-centers",
  "manufacturing-profiles",
  "line-assignments",
  "production-standards",
  "boms",
  "routing-plans",
]);

export const manufacturingListQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

const formValue = z.union([z.string(), z.boolean(), z.number(), z.null()]).optional();

export const manufacturingMutationSchema = z.record(z.string(), formValue).transform((input) => ({
  ...input,
  isActive: input.isActive === undefined ? true : input.isActive,
}));

export type ManufacturingResourceKeyInput = z.infer<typeof manufacturingResourceKeySchema>;
