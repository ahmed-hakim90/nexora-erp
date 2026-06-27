export type AttachmentOwner = Readonly<{
  moduleKey: string;
  entityType: string;
  entityId: string;
}>;

export type AttachmentKind = "image" | "pdf" | "excel" | "document" | "other";
export type FileSecurityClassification = "public" | "internal" | "sensitive" | "restricted";
export type FileRetentionPolicy = "temporary" | "business" | "legal" | "audit";

export type AttachmentMetadata = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  owner: AttachmentOwner;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  version: number;
  storagePath: string;
  securityClassification?: FileSecurityClassification;
  retentionPolicy?: FileRetentionPolicy;
  uploadedByUserId?: string;
  metadata?: Record<string, unknown>;
}>;
