import { ApplicationError } from "@/core/errors";
import { defineAuditAction } from "@/platform/audit/public-api";
import { recordAuditEvent } from "@/platform/audit/server";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type { BusinessDocumentRepository } from "../ports/business-documents.repository";
import type {
  BusinessDocumentRecord,
  ChangeDocumentStatusInput,
  CreateDocumentShellInput,
  UpdateDocumentMetadataInput,
} from "../types";
import { assertDocumentCanChangeStatus, assertGenericDocumentKey } from "../../domain/rules/business-documents.rules";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";
import type { DocumentNumberService } from "./document-number.service";
import type { DocumentTimelineService } from "./document-timeline.service";

export class BusinessDocumentService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly repository: BusinessDocumentRepository,
    private readonly numberService: DocumentNumberService,
    private readonly timelineService: DocumentTimelineService,
  ) {}

  async read(id: string): Promise<BusinessDocumentRecord> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.view });
    return this.requireDocument(id);
  }

  async createShell(input: CreateDocumentShellInput): Promise<BusinessDocumentRecord> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.create });
    assertGenericDocumentKey(input.documentTypeKey, "Document type key");

    const generatedNumber = await this.numberService.generate({
      branchId: input.branchId,
      documentTypeKey: input.documentTypeKey,
      fiscalYear: input.fiscalYear,
    });

    const document = await this.repository.createShell({
      ...input,
      documentNumber: generatedNumber.documentNumber,
    });

    await this.timelineService.record({
      document,
      eventType: "created",
      metadata: {
        sequenceId: generatedNumber.sequenceId,
        sequenceValue: generatedNumber.sequenceValue,
      },
    });

    return document;
  }

  async updateMetadata(id: string, input: UpdateDocumentMetadataInput): Promise<BusinessDocumentRecord> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.update });
    await this.requireDocument(id);

    const document = await this.repository.updateMetadata(id, input);
    await this.timelineService.record({
      document,
      eventType: "updated",
      metadata: { updatedMetadataKeys: Object.keys(input.metadata ?? {}) },
    });

    return document;
  }

  async changeStatus(id: string, input: ChangeDocumentStatusInput): Promise<BusinessDocumentRecord> {
    const current = await this.requireDocument(id);
    const permission = this.permissionForStatus(input.status);

    await requirePermission({ context: this.context, permission });
    assertGenericDocumentKey(input.status, "Document status");
    assertDocumentCanChangeStatus(current.status, input.status);

    const document = await this.repository.changeStatus(id, input);
    const eventType = input.status === "cancelled" ? "cancelled" : input.status === "closed" ? "closed" : "status_changed";

    await this.timelineService.record({
      document,
      eventType,
      metadata: {
        fromStatus: current.status,
        toStatus: document.status,
        workflowStatus: document.workflowStatus,
        approvalStatus: document.approvalStatus,
      },
    });

    await recordAuditEvent({
      context: this.context,
      module: "documents",
      entityType: "business_document",
      entityId: document.id,
      action: defineAuditAction(`documents.${eventType}`),
      metadata: {
        documentTypeKey: document.documentTypeKey,
        documentNumber: document.documentNumber,
        fromStatus: current.status,
        toStatus: document.status,
      },
    });

    return document;
  }

  private async requireDocument(id: string): Promise<BusinessDocumentRecord> {
    const document = await this.repository.findById(id);

    if (!document) {
      throw new ApplicationError({ code: "NOT_FOUND", message: "Business document was not found." });
    }

    return document;
  }

  private permissionForStatus(status: string) {
    if (status === "cancelled") return BUSINESS_DOCUMENT_PERMISSIONS.cancel;
    if (status === "closed") return BUSINESS_DOCUMENT_PERMISSIONS.close;
    return BUSINESS_DOCUMENT_PERMISSIONS.changeStatus;
  }
}
