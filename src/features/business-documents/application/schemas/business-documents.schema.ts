import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? null : value, z.string().trim().min(1).nullable());
const requiredText = z.string().trim().min(1);
const uuid = z.string().uuid();
const jsonRecord = z.record(z.string(), z.unknown()).default({});
const approvalStatus = z.enum(["not_required", "pending", "approved", "rejected", "returned", "cancelled"]);

function optionalJsonRecord(defaultValue = true) {
  const schema = z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return {};
      return JSON.parse(trimmed) as unknown;
    }

    return value ?? {};
  }, jsonRecord);

  return defaultValue ? schema.default({}) : schema.optional();
}

export const createDocumentShellSchema = z.object({
  branchId: optionalText.optional(),
  documentTypeKey: requiredText.toLowerCase(),
  title: requiredText,
  status: requiredText.toLowerCase().default("draft"),
  workflowStatus: optionalText.optional(),
  approvalStatus: approvalStatus.default("not_required"),
  ownerUserId: uuid.nullable().optional(),
  sourceModule: requiredText.toLowerCase().default("documents"),
  sourceEntityType: optionalText.optional(),
  sourceEntityId: uuid.nullable().optional(),
  fiscalYear: optionalText.optional(),
  metadata: optionalJsonRecord(),
  issuedAt: z.string().datetime().nullable().optional(),
});

export const updateDocumentMetadataSchema = z.object({
  title: requiredText.optional(),
  metadata: optionalJsonRecord(),
});

export const changeDocumentStatusSchema = z.object({
  status: requiredText.toLowerCase(),
  workflowStatus: optionalText.optional(),
  approvalStatus: approvalStatus.optional(),
  metadata: optionalJsonRecord(false),
});

export const addDocumentCommentSchema = z.object({
  parentCommentId: uuid.nullable().optional(),
  body: requiredText,
  isInternal: z.coerce.boolean().default(true),
  isPublicPlaceholder: z.coerce.boolean().default(false),
  mentionsPlaceholder: z.array(uuid).default([]),
  metadata: optionalJsonRecord(),
});

export const addDocumentReferenceSchema = z.object({
  referenceType: requiredText.toLowerCase(),
  referenceId: uuid,
  referenceRole: requiredText.toLowerCase(),
  metadata: optionalJsonRecord(),
});

export const addDocumentAttachmentRelationSchema = z.object({
  fileAttachmentId: uuid,
  attachmentRole: requiredText.toLowerCase().default("supporting"),
  metadata: optionalJsonRecord(),
});

export const createPrintSnapshotPlaceholderSchema = z.object({
  snapshotKey: requiredText.toLowerCase(),
  printFormat: z.enum(["pdf", "print"]).default("pdf"),
  snapshotMetadata: optionalJsonRecord(),
  fileAttachmentId: uuid.nullable().optional(),
});

export const createExportJobPlaceholderSchema = z.object({
  exportFormat: z.enum(["excel", "pdf", "csv", "print"]),
  filters: optionalJsonRecord(),
  metadata: optionalJsonRecord(),
  fileAttachmentId: uuid.nullable().optional(),
  idempotencyKey: requiredText,
});
