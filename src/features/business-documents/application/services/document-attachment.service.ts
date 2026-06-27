import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { DocumentAttachmentRepository } from "../ports/business-documents.repository";
import type { AddAttachmentRelationInput } from "../types";
import { assertGenericDocumentKey } from "../../domain/rules/business-documents.rules";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";
import type { BusinessDocumentService } from "./business-document.service";
import type { DocumentTimelineService } from "./document-timeline.service";

export class DocumentAttachmentService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: DocumentAttachmentRepository,
    private readonly documentService: BusinessDocumentService,
    private readonly timelineService: DocumentTimelineService,
  ) {}

  async addAttachmentRelation(documentId: string, input: AddAttachmentRelationInput): Promise<{ id: string }> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.attach });
    assertGenericDocumentKey(input.attachmentRole ?? "supporting", "Attachment role");

    const document = await this.documentService.read(documentId);
    const attachment = await this.repository.addAttachmentRelation(document, input);

    await this.timelineService.record({
      document,
      eventType: "attachment_added",
      metadata: {
        attachmentRelationId: attachment.id,
        fileAttachmentId: input.fileAttachmentId,
        attachmentRole: input.attachmentRole ?? "supporting",
      },
    });

    return attachment;
  }
}
