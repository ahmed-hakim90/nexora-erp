import { z } from "zod";

import { HR_REQUIRED_DOCUMENT_KINDS } from "../../template-lifecycle-foundation";

const documentKindSchema = z.enum(HR_REQUIRED_DOCUMENT_KINDS);

export const hrDocumentComplianceWaiverGrantSchema = z.object({
  documentKind: documentKindSchema,
  effectiveTo: z.string().optional().nullable(),
  employeeId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export const hrDocumentComplianceWaiverRevokeSchema = z.object({
  revokeReason: z.string().trim().min(3).max(500).optional(),
  waiverId: z.string().uuid(),
});

export type HrDocumentComplianceWaiverGrantInput = z.infer<typeof hrDocumentComplianceWaiverGrantSchema>;
