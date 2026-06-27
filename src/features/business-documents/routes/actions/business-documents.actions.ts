"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addDocumentAttachmentRelationSchema,
  addDocumentCommentSchema,
  addDocumentReferenceSchema,
  changeDocumentStatusSchema,
  createDocumentShellSchema,
  createExportJobPlaceholderSchema,
  createPrintSnapshotPlaceholderSchema,
  updateDocumentMetadataSchema,
} from "../../application/schemas/business-documents.schema";
import { createBusinessDocumentServices } from "../service-factory";

const basePath = "/erp/documents";
const idSchema = z.string().uuid();

function revalidateDocument(id: string) {
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function createDocumentShellAction(input: unknown) {
  const services = await createBusinessDocumentServices();
  const document = await services.documentService.createShell(createDocumentShellSchema.parse(input));
  revalidateDocument(document.id);
  return document;
}

export async function updateDocumentMetadataAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const document = await services.documentService.updateMetadata(
    documentId,
    updateDocumentMetadataSchema.parse(input),
  );
  revalidateDocument(document.id);
  return document;
}

export async function changeDocumentStatusAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const document = await services.documentService.changeStatus(
    documentId,
    changeDocumentStatusSchema.parse(input),
  );
  revalidateDocument(document.id);
  return document;
}

export async function addDocumentCommentAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const comment = await services.commentService.addComment(documentId, addDocumentCommentSchema.parse(input));
  revalidateDocument(documentId);
  return comment;
}

export async function addDocumentReferenceAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const reference = await services.referenceService.addReference(documentId, addDocumentReferenceSchema.parse(input));
  revalidateDocument(documentId);
  return reference;
}

export async function addDocumentAttachmentRelationAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const attachment = await services.attachmentService.addAttachmentRelation(
    documentId,
    addDocumentAttachmentRelationSchema.parse(input),
  );
  revalidateDocument(documentId);
  return attachment;
}

export async function createPrintSnapshotPlaceholderAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const snapshot = await services.printExportService.createPrintSnapshotPlaceholder(
    documentId,
    createPrintSnapshotPlaceholderSchema.parse(input),
  );
  revalidateDocument(documentId);
  return snapshot;
}

export async function createExportJobPlaceholderAction(id: string, input: unknown) {
  const documentId = idSchema.parse(id);
  const services = await createBusinessDocumentServices();
  const job = await services.printExportService.createExportJobPlaceholder(
    documentId,
    createExportJobPlaceholderSchema.parse(input),
  );
  revalidateDocument(documentId);
  return job;
}
