import type { TenantRequestContext } from "@/platform/auth/server";

import type { DocumentTimelineRepository } from "../ports/business-documents.repository";
import type { BusinessDocumentRecord, DocumentTimelineEventType, JsonRecord } from "../types";

export class DocumentTimelineService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: DocumentTimelineRepository,
  ) {}

  async record(input: {
    document: BusinessDocumentRecord;
    eventType: DocumentTimelineEventType;
    metadata?: JsonRecord;
    requestId?: string | null;
  }): Promise<void> {
    await this.repository.addEvent({
      ...input,
      correlationId: this.context.correlationId,
    });
  }
}
