import "server-only";

import { resolveTenantRequestContext } from "@/platform/auth/server";
import { createRequestSupabaseClient } from "@/platform/database/server";

import { BusinessDocumentService } from "../application/services/business-document.service";
import { DocumentAttachmentService } from "../application/services/document-attachment.service";
import { DocumentCommentService } from "../application/services/document-comment.service";
import { DocumentNumberService } from "../application/services/document-number.service";
import { DocumentPrintExportService } from "../application/services/document-print-export.service";
import { DocumentReferenceService } from "../application/services/document-reference.service";
import { DocumentTimelineService } from "../application/services/document-timeline.service";
import {
  SupabaseBusinessDocumentRepository,
  SupabaseDocumentAttachmentRepository,
  SupabaseDocumentCommentRepository,
  SupabaseDocumentExportJobRepository,
  SupabaseDocumentNumberRepository,
  SupabaseDocumentPrintSnapshotRepository,
  SupabaseDocumentReferenceRepository,
  SupabaseDocumentTimelineRepository,
} from "../infrastructure/repositories/business-documents.repository";

export async function createBusinessDocumentServices() {
  const context = await resolveTenantRequestContext("erp");
  const supabase = createRequestSupabaseClient({ accessToken: context.accessToken });

  const timelineService = new DocumentTimelineService(
    context,
    new SupabaseDocumentTimelineRepository(supabase, context),
  );
  const numberService = new DocumentNumberService(
    context,
    new SupabaseDocumentNumberRepository(supabase, context),
  );
  const documentService = new BusinessDocumentService(
    context,
    new SupabaseBusinessDocumentRepository(supabase, context),
    numberService,
    timelineService,
  );

  return {
    documentService,
    numberService,
    timelineService,
    commentService: new DocumentCommentService(
      context,
      new SupabaseDocumentCommentRepository(supabase, context),
      documentService,
      timelineService,
    ),
    referenceService: new DocumentReferenceService(
      context,
      new SupabaseDocumentReferenceRepository(supabase, context),
      documentService,
      timelineService,
    ),
    attachmentService: new DocumentAttachmentService(
      context,
      new SupabaseDocumentAttachmentRepository(supabase, context),
      documentService,
      timelineService,
    ),
    printExportService: new DocumentPrintExportService(
      context,
      new SupabaseDocumentPrintSnapshotRepository(supabase, context),
      new SupabaseDocumentExportJobRepository(supabase, context),
      documentService,
      timelineService,
    ),
  };
}
