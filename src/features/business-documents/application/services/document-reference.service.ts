import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { DocumentReferenceRepository } from "../ports/business-documents.repository";
import type { AddReferenceInput } from "../types";
import { assertGenericDocumentKey } from "../../domain/rules/business-documents.rules";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";
import type { BusinessDocumentService } from "./business-document.service";
import type { DocumentTimelineService } from "./document-timeline.service";

export class DocumentReferenceService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: DocumentReferenceRepository,
    private readonly documentService: BusinessDocumentService,
    private readonly timelineService: DocumentTimelineService,
  ) {}

  async addReference(documentId: string, input: AddReferenceInput): Promise<{ id: string }> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.update });
    assertGenericDocumentKey(input.referenceType, "Reference type");
    assertGenericDocumentKey(input.referenceRole, "Reference role");

    const document = await this.documentService.read(documentId);
    const reference = await this.repository.addReference(document, input);

    await this.timelineService.record({
      document,
      eventType: "updated",
      metadata: {
        referenceId: reference.id,
        referenceType: input.referenceType,
        referenceRole: input.referenceRole,
      },
    });

    return reference;
  }
}
