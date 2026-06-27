import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { DocumentCommentRepository } from "../ports/business-documents.repository";
import type { AddCommentInput } from "../types";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";
import type { BusinessDocumentService } from "./business-document.service";
import type { DocumentTimelineService } from "./document-timeline.service";

export class DocumentCommentService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: DocumentCommentRepository,
    private readonly documentService: BusinessDocumentService,
    private readonly timelineService: DocumentTimelineService,
  ) {}

  async addComment(documentId: string, input: AddCommentInput): Promise<{ id: string }> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.comment });
    const document = await this.documentService.read(documentId);
    const comment = await this.repository.addComment(document, input);

    await this.timelineService.record({
      document,
      eventType: "commented",
      metadata: {
        commentId: comment.id,
        isInternal: input.isInternal ?? true,
        isPublicPlaceholder: input.isPublicPlaceholder ?? false,
      },
    });

    return comment;
  }
}
