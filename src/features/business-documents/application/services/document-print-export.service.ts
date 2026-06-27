import { defineAuditAction } from "@/platform/audit/public-api";
import { recordAuditEvent } from "@/platform/audit/server";
import { requirePermission } from "@/platform/permissions/server";
import type { TenantRequestContext } from "@/platform/auth/server";

import type {
  DocumentExportJobRepository,
  DocumentPrintSnapshotRepository,
} from "../ports/business-documents.repository";
import type { CreateExportJobInput, CreatePrintSnapshotInput } from "../types";
import { assertGenericDocumentKey } from "../../domain/rules/business-documents.rules";
import { BUSINESS_DOCUMENT_PERMISSIONS } from "../../permissions/permission-registry";
import type { BusinessDocumentService } from "./business-document.service";
import type { DocumentTimelineService } from "./document-timeline.service";

export class DocumentPrintExportService {
  constructor(
    private readonly context: TenantRequestContext,
    private readonly printRepository: DocumentPrintSnapshotRepository,
    private readonly exportRepository: DocumentExportJobRepository,
    private readonly documentService: BusinessDocumentService,
    private readonly timelineService: DocumentTimelineService,
  ) {}

  async createPrintSnapshotPlaceholder(documentId: string, input: CreatePrintSnapshotInput): Promise<{ id: string }> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.print });
    assertGenericDocumentKey(input.snapshotKey, "Snapshot key");

    const document = await this.documentService.read(documentId);
    const snapshot = await this.printRepository.createPrintSnapshot(document, input);

    await this.timelineService.record({
      document,
      eventType: "printed",
      metadata: {
        snapshotId: snapshot.id,
        snapshotKey: input.snapshotKey,
        printFormat: input.printFormat ?? "pdf",
      },
    });

    await recordAuditEvent({
      context: this.context,
      module: "documents",
      entityType: "business_document",
      entityId: document.id,
      action: defineAuditAction("documents.printed"),
      metadata: {
        documentTypeKey: document.documentTypeKey,
        documentNumber: document.documentNumber,
        snapshotId: snapshot.id,
      },
    });

    return snapshot;
  }

  async createExportJobPlaceholder(documentId: string, input: CreateExportJobInput): Promise<{ id: string }> {
    await requirePermission({ context: this.context, permission: BUSINESS_DOCUMENT_PERMISSIONS.export });
    const document = await this.documentService.read(documentId);
    const job = await this.exportRepository.createExportJob(document, input);

    await this.timelineService.record({
      document,
      eventType: "exported",
      metadata: {
        exportJobId: job.id,
        exportFormat: input.exportFormat,
      },
    });

    await recordAuditEvent({
      context: this.context,
      module: "documents",
      entityType: "business_document",
      entityId: document.id,
      action: defineAuditAction("documents.exported"),
      metadata: {
        documentTypeKey: document.documentTypeKey,
        documentNumber: document.documentNumber,
        exportJobId: job.id,
        exportFormat: input.exportFormat,
      },
    });

    return job;
  }
}
