import { z } from "zod";

import { HR_REQUIRED_DOCUMENT_KINDS } from "../../template-lifecycle-foundation";

const documentKindSchema = z.enum(HR_REQUIRED_DOCUMENT_KINDS);

export const hrRequiredDocumentSetCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  documentKinds: z.array(documentKindSchema).min(1),
  name: z.string().trim().min(1),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("active"),
});

export const hrRequiredDocumentSetUpdateSchema = hrRequiredDocumentSetCreateSchema.extend({
  documentSetId: z.string().uuid(),
});

export const hrRequiredDocumentSetArchiveSchema = z.object({
  documentSetId: z.string().uuid(),
});

export type HrRequiredDocumentSetCreateInput = z.infer<typeof hrRequiredDocumentSetCreateSchema>;
export type HrRequiredDocumentSetUpdateInput = z.infer<typeof hrRequiredDocumentSetUpdateSchema>;

export function parseDocumentKindsFromFormData(formData: FormData): string[] {
  return formData
    .getAll("documentKinds")
    .map((value) => String(value).trim())
    .filter(Boolean);
}
