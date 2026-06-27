import type {
  AddAttachmentRelationInput,
  AddCommentInput,
  AddReferenceInput,
  BusinessDocumentRecord,
  ChangeDocumentStatusInput,
  CreateDocumentShellRepositoryInput,
  CreateExportJobInput,
  CreatePrintSnapshotInput,
  DocumentTimelineEventType,
  GeneratedDocumentNumberRecord,
  JsonRecord,
  UpdateDocumentMetadataInput,
} from "../types";

export type NumberingRepository = Readonly<{
  generateBusinessDocumentNumber: (input: {
    branchId?: string | null;
    documentTypeKey: string;
    fiscalYear?: string | null;
  }) => Promise<GeneratedDocumentNumberRecord>;
}>;

export type BusinessDocumentRepository = Readonly<{
  findById: (id: string) => Promise<BusinessDocumentRecord | null>;
  createShell: (input: CreateDocumentShellRepositoryInput) => Promise<BusinessDocumentRecord>;
  updateMetadata: (id: string, input: UpdateDocumentMetadataInput) => Promise<BusinessDocumentRecord>;
  changeStatus: (id: string, input: ChangeDocumentStatusInput) => Promise<BusinessDocumentRecord>;
}>;

export type DocumentTimelineRepository = Readonly<{
  addEvent: (input: {
    document: BusinessDocumentRecord;
    eventType: DocumentTimelineEventType;
    metadata?: JsonRecord;
    requestId?: string | null;
    correlationId?: string | null;
  }) => Promise<void>;
}>;

export type DocumentCommentRepository = Readonly<{
  addComment: (document: BusinessDocumentRecord, input: AddCommentInput) => Promise<{ id: string }>;
}>;

export type DocumentReferenceRepository = Readonly<{
  addReference: (document: BusinessDocumentRecord, input: AddReferenceInput) => Promise<{ id: string }>;
}>;

export type DocumentAttachmentRepository = Readonly<{
  addAttachmentRelation: (document: BusinessDocumentRecord, input: AddAttachmentRelationInput) => Promise<{ id: string }>;
}>;

export type DocumentPrintSnapshotRepository = Readonly<{
  createPrintSnapshot: (document: BusinessDocumentRecord, input: CreatePrintSnapshotInput) => Promise<{ id: string }>;
}>;

export type DocumentExportJobRepository = Readonly<{
  createExportJob: (document: BusinessDocumentRecord, input: CreateExportJobInput) => Promise<{ id: string }>;
}>;
