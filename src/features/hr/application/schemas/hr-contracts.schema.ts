import { z } from "zod";

import { HR_CONTRACT_TYPE_STATUSES } from "../../contract-type-foundation";

const articleInputSchema = z.object({
  articleId: z.string().uuid().optional(),
  bodyAr: z.string().default(""),
  bodyEn: z.string().default(""),
  code: z.string().optional(),
  sequence: z.coerce.number().int().positive(),
  titleAr: z.string().optional(),
  titleEn: z.string().min(1),
});

function parseBooleanField(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value === true || value === "true" || value === "on") return true;
  if (value === false || value === "false") return false;
  return Boolean(value);
}

export const hrContractTypeCreateSchema = z.object({
  code: z.string().min(1).transform((value) => value.trim().toUpperCase()),
  defaultProbationDays: z.coerce.number().int().min(0).optional(),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  requiredDocumentSetId: z.string().uuid().optional().or(z.literal("")),
  requiresEndDate: z.preprocess(parseBooleanField, z.boolean().optional()),
});

export const hrContractTypeUpdateSchema = hrContractTypeCreateSchema.extend({
  contractTypeId: z.string().uuid(),
  status: z.enum(HR_CONTRACT_TYPE_STATUSES).optional(),
});

export const hrContractTypeArchiveSchema = z.object({
  contractTypeId: z.string().uuid(),
});

export const hrContractTypeVersionCreateSchema = z.object({
  changeSummary: z.string().optional(),
  contractTypeId: z.string().uuid(),
  notes: z.string().optional(),
  parentVersionId: z.string().uuid().optional(),
});

export const hrContractTypeVersionActivateSchema = z.object({
  contractTypeVersionId: z.string().uuid(),
});

export const hrContractTypeVersionArchiveSchema = z.object({
  contractTypeVersionId: z.string().uuid(),
});

export const hrContractTypeArticlesSaveSchema = z.object({
  articles: z.array(articleInputSchema).min(1),
  contractTypeVersionId: z.string().uuid(),
});

export const hrContractCreateSchema = z.object({
  contractNumber: z.string().min(1),
  contractTypeVersionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  endsOn: z.string().optional(),
  startsOn: z.string().min(1),
});

export const hrContractPreviewSchema = z.object({
  contractTypeVersionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  endsOn: z.string().optional(),
  startsOn: z.string().min(1),
});

export type HrContractTypeCreateInput = z.infer<typeof hrContractTypeCreateSchema>;
export type HrContractTypeUpdateInput = z.infer<typeof hrContractTypeUpdateSchema>;
export type HrContractTypeVersionCreateInput = z.infer<typeof hrContractTypeVersionCreateSchema>;
export type HrContractTypeArticlesSaveInput = z.infer<typeof hrContractTypeArticlesSaveSchema>;
export type HrContractCreateInput = z.infer<typeof hrContractCreateSchema>;
export type HrContractPreviewInput = z.infer<typeof hrContractPreviewSchema>;
