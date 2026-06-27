export type JsonRecord = Readonly<Record<string, unknown>>;

export type DocumentApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export type DocumentTimelineEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "workflow_transitioned"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "commented"
  | "attachment_added"
  | "printed"
  | "exported"
  | "cancelled"
  | "closed";

export type ExportFormat = "excel" | "pdf" | "csv" | "print";
export type PrintFormat = "pdf" | "print";

export type BusinessDocumentRecord = Readonly<{
  id: string;
  tenantId: string;
  branchId: string | null;
  documentNumber: string;
  documentTypeKey: string;
  title: string;
  status: string;
  workflowStatus: string | null;
  approvalStatus: DocumentApprovalStatus;
  ownerUserId: string | null;
  sourceModule: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  metadata: JsonRecord;
  issuedAt: string | null;
  postedAt: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type CreateDocumentShellInput = Readonly<{
  branchId?: string | null;
  documentTypeKey: string;
  title: string;
  status?: string;
  workflowStatus?: string | null;
  approvalStatus?: DocumentApprovalStatus;
  ownerUserId?: string | null;
  sourceModule?: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  fiscalYear?: string | null;
  metadata?: JsonRecord;
  issuedAt?: string | null;
}>;

export type CreateDocumentShellRepositoryInput = CreateDocumentShellInput & Readonly<{
  documentNumber: string;
}>;

export type UpdateDocumentMetadataInput = Readonly<{
  title?: string;
  metadata?: JsonRecord;
}>;

export type ChangeDocumentStatusInput = Readonly<{
  status: string;
  workflowStatus?: string | null;
  approvalStatus?: DocumentApprovalStatus;
  metadata?: JsonRecord;
}>;

export type AddCommentInput = Readonly<{
  parentCommentId?: string | null;
  body: string;
  isInternal?: boolean;
  isPublicPlaceholder?: boolean;
  mentionsPlaceholder?: readonly string[];
  metadata?: JsonRecord;
}>;

export type AddReferenceInput = Readonly<{
  referenceType: string;
  referenceId: string;
  referenceRole: string;
  metadata?: JsonRecord;
}>;

export type AddAttachmentRelationInput = Readonly<{
  fileAttachmentId: string;
  attachmentRole?: string;
  metadata?: JsonRecord;
}>;

export type CreatePrintSnapshotInput = Readonly<{
  snapshotKey: string;
  printFormat?: PrintFormat;
  snapshotMetadata?: JsonRecord;
  fileAttachmentId?: string | null;
}>;

export type CreateExportJobInput = Readonly<{
  exportFormat: ExportFormat;
  filters?: JsonRecord;
  metadata?: JsonRecord;
  fileAttachmentId?: string | null;
  idempotencyKey: string;
}>;

export type GeneratedDocumentNumberRecord = Readonly<{
  documentNumber: string;
  sequenceId: string;
  sequenceValue: number;
}>;
