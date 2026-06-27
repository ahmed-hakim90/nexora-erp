export type ExportFormat = "excel" | "pdf" | "csv" | "print";
export type ImportFormat = "excel" | "csv" | "json";
export type ExportJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ImportJobStatus = ExportJobStatus;

export type ExportDefinition = Readonly<{
  key: string;
  appKey: string;
  supportedFormats: readonly ExportFormat[];
  requiredPermission: string;
  isSensitive?: boolean;
  requiresAsync: boolean;
}>;

export type ImportDefinition = Readonly<{
  key: string;
  appKey: string;
  supportedFormats: readonly ImportFormat[];
  requiredPermission: string;
  previewRequired: boolean;
  maxFileSizeBytes: number;
}>;

export type ExportRequest = Readonly<{
  tenantId: string;
  requestedByUserId: string;
  moduleKey: string;
  exportKey: string;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  idempotencyKey: string;
}>;

export type ExportJobSnapshot = Readonly<{
  id: string;
  status: ExportJobStatus;
  progress: number;
  fileAttachmentId?: string;
}>;

export type ImportRequest = Readonly<{
  tenantId: string;
  requestedByUserId: string;
  appKey: string;
  importKey: string;
  format: ImportFormat;
  fileAttachmentId: string;
  idempotencyKey: string;
}>;

export type ImportPreviewRow = Readonly<{
  rowNumber: number;
  values: Record<string, unknown>;
  issues: readonly string[];
}>;

export type ImportPreview = Readonly<{
  importKey: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  rows: readonly ImportPreviewRow[];
}>;

export function defineExport<TDefinition extends ExportDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}

export function defineImport<TDefinition extends ImportDefinition>(
  definition: TDefinition,
): TDefinition {
  return definition;
}
