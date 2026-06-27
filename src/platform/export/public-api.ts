import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration } from "@/platform/background-jobs/public-api";
import type { DashboardWidgetType } from "@/platform/dashboard/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { ReportFormat } from "@/platform/reporting/public-api";
import type { SearchResultType } from "@/platform/search/public-api";

export type ImportExportProviderSource =
  | "platform-engine"
  | "business-app"
  | "marketplace-extension"
  | "integration";

export type ImportExportSourceEngine =
  | "import-export"
  | "reporting"
  | "dashboard"
  | "search"
  | "integration"
  | "marketplace";

export type ImportFormat = "csv" | "excel" | "json" | "xml";
export type ExportFormat = "csv" | "excel" | "json" | "pdf" | "html" | "xml";
export type ImportExportFormat = ImportFormat | ExportFormat;

export type ExportJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "dead-letter";

export type ImportJobStatus = ExportJobStatus;
export type ImportExportBatchStatus = "draft" | "previewed" | "queued" | "running" | "completed" | "failed" | "cancelled" | "dead-letter";
export type ImportBatchStatus = ImportExportBatchStatus;
export type ImportCommitMode = "dry-run" | "commit";
export type ImportRowStatus = "accepted" | "rejected" | "warning" | "pending";
export type ImportExportSensitivity = "public" | "internal" | "sensitive" | "restricted";

export type ImportExportDataType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "email"
  | "phone"
  | "object"
  | "array"
  | "custom";

export type ImportValidationRuleType =
  | "required"
  | "type"
  | "range"
  | "duplicate"
  | "lookup"
  | "custom"
  | "cross-row"
  | "permission"
  | "data-scope";

export type ImportExportSeverity = "info" | "warning" | "error";

export type ImportExportSecurityMetadata = Readonly<{
  requiredPermissions: readonly (PermissionKey | string)[];
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  requiredDataScopes?: readonly string[];
  sensitiveData: boolean;
  pii: boolean;
  auditRequired: boolean;
  sensitivity: ImportExportSensitivity;
  exportRestrictions?: readonly ("no-pii" | "masked-only" | "no-external-share" | "watermark-required")[];
}>;

export type ImportExportFormatMetadata = Readonly<{
  format: ImportExportFormat;
  contentType: string;
  fileExtension: string;
  supportsImport: boolean;
  supportsExport: boolean;
  supportsStreaming?: boolean;
  supportsMultipleSheets?: boolean;
}>;

export type ImportColumn = Readonly<{
  key: string;
  label: string;
  sourceColumn?: string;
  targetField?: string;
  dataType: ImportExportDataType;
  required?: boolean;
  localizedLabels?: Readonly<Record<string, string>>;
  exampleValue?: unknown;
  sensitive?: boolean;
  pii?: boolean;
}>;

export type ExportColumn = Readonly<{
  key: string;
  label: string;
  sourceField: string;
  dataType: ImportExportDataType;
  order: number;
  localizedLabels?: Readonly<Record<string, string>>;
  sensitive?: boolean;
  pii?: boolean;
  formatKey?: string;
}>;

export type EnumMapping = Readonly<{
  sourceValue: string;
  targetValue: string;
  label?: string;
}>;

export type ImportFieldMapping = Readonly<{
  key: string;
  sourceColumn: string;
  targetField: string;
  required?: boolean;
  defaultValue?: unknown;
  transformationKey?: string;
  validationKey?: string;
  lookupKey?: string;
  enumMapping?: readonly EnumMapping[];
  localizedLabels?: Readonly<Record<string, string>>;
}>;

export type ExportFieldMapping = Readonly<{
  key: string;
  sourceField: string;
  targetColumn: string;
  transformationKey?: string;
  defaultValue?: unknown;
  localizedLabels?: Readonly<Record<string, string>>;
}>;

export type ImportValidationRule = Readonly<{
  key: string;
  type: ImportValidationRuleType;
  fieldKey?: string;
  label?: string;
  required?: boolean;
  dataType?: ImportExportDataType;
  min?: number;
  max?: number;
  lookupKey?: string;
  customValidatorKey?: string;
  crossRowKey?: string;
  requiredPermission?: PermissionKey | string;
  requiredDataScope?: string;
  severity: ImportExportSeverity;
  message: string;
}>;

export type ImportTemplate = Readonly<{
  key: string;
  label: string;
  format: ImportFormat;
  columns: readonly ImportColumn[];
  mappings: readonly ImportFieldMapping[];
  validationRules: readonly ImportValidationRule[];
  sampleRows?: readonly Readonly<Record<string, unknown>>[];
  localizedLabels?: Readonly<Record<string, string>>;
}>;

export type ExportTemplate = Readonly<{
  key: string;
  label: string;
  format: ExportFormat;
  columns: readonly ExportColumn[];
  mappings: readonly ExportFieldMapping[];
  localizedLabels?: Readonly<Record<string, string>>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ImportContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  actorType?: ActorType | null;
  actorId?: string | null;
  principalId?: string | null;
  userId?: string | null;
  locale?: string;
  timezone?: string;
  sourceApp?: string | null;
  sourceEngine?: ImportExportSourceEngine;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  dryRun?: boolean;
  preferAsync?: boolean;
}>;

export type ExportContext = Omit<ImportContext, "dryRun"> & Readonly<{
  filters?: Readonly<Record<string, unknown>>;
  selectedColumns?: readonly string[];
}>;

export type ImportDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  providerSource: ImportExportProviderSource;
  supportedFormats: readonly ImportFormat[];
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  security: ImportExportSecurityMetadata;
  templates: readonly ImportTemplate[];
  columns: readonly ImportColumn[];
  mappings: readonly ImportFieldMapping[];
  validationRules: readonly ImportValidationRule[];
  previewRequired: boolean;
  maxFileSizeBytes: number;
  maxRows?: number;
  requiresAsync: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ExportMetadata = Readonly<{
  fileNameTemplate?: string;
  includeHeaders: boolean;
  includeFilters?: boolean;
  includeGeneratedAt?: boolean;
  compression?: "none" | "zip";
  watermarkRequired?: boolean;
  retentionDays?: number;
}>;

export type ExportDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  providerSource: ImportExportProviderSource;
  supportedFormats: readonly ExportFormat[];
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  security: ImportExportSecurityMetadata;
  templates: readonly ExportTemplate[];
  columns: readonly ExportColumn[];
  mappings: readonly ExportFieldMapping[];
  requiresAsync: boolean;
  maxRows?: number;
  metadata: ExportMetadata;
}>;

export type ImportError = Readonly<{
  rowNumber?: number;
  columnKey?: string;
  fieldKey?: string;
  code: string;
  message: string;
  severity: ImportExportSeverity;
  ruleKey?: string;
}>;

export type ImportRow = Readonly<{
  rowNumber: number;
  values: Readonly<Record<string, unknown>>;
  mappedValues?: Readonly<Record<string, unknown>>;
  status: ImportRowStatus;
  errors: readonly ImportError[];
  warnings: readonly ImportError[];
}>;

export type ImportValidationSummary = Readonly<{
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  warningRows: number;
  errorCount: number;
  warningCount: number;
}>;

export type ImportPreview = Readonly<{
  importKey: string;
  templateKey?: string;
  mode: ImportCommitMode;
  rows: readonly ImportRow[];
  validationSummary: ImportValidationSummary;
  errorSummary: readonly ImportError[];
  warningSummary: readonly ImportError[];
  dryRun: boolean;
}>;

export type ImportResult = Readonly<{
  importKey: string;
  batchId?: string;
  status: ImportBatchStatus;
  mode: ImportCommitMode;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  warningRows: number;
  successCount: number;
  failureCount: number;
  errors: readonly ImportError[];
  warnings: readonly ImportError[];
  jobKey?: string;
  jobId?: string;
  durationMs?: number;
}>;

export type ExportResult = Readonly<{
  exportKey: string;
  batchId?: string;
  status: ExportJobStatus;
  format: ExportFormat;
  rowCount: number;
  successCount: number;
  failureCount: number;
  fileAttachmentId?: string;
  fileName?: string;
  contentType: string;
  jobKey?: string;
  jobId?: string;
  durationMs?: number;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ImportBatch = Readonly<{
  id: string;
  importKey: string;
  format: ImportFormat;
  status: ImportBatchStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  progress: number;
  createdAt: string;
  createdBy?: string | null;
  jobKey?: string;
  jobId?: string;
  retryCount?: number;
  cancellationReason?: string | null;
  deadLetterReason?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ExportBatch = Readonly<{
  id: string;
  exportKey: string;
  format: ExportFormat;
  status: ExportJobStatus;
  rowCount: number;
  progress: number;
  createdAt: string;
  createdBy?: string | null;
  jobKey?: string;
  jobId?: string;
  retryCount?: number;
  cancellationReason?: string | null;
  deadLetterReason?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
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

export type ImportExportValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type ImportRegistry = Readonly<{
  imports: readonly ImportDefinition[];
}>;

export type ExportRegistry = Readonly<{
  exports: readonly ExportDefinition[];
}>;

export type ImportExportJobReadiness = Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  operation: "import" | "export";
  definitionKey: string;
  requiresBackgroundExecution: true;
  progressTracking: true;
  retryable: boolean;
  cancellable: boolean;
  deadLetterEnabled: boolean;
}>;

export type ExportReportIntegrationContract = Readonly<{
  reportKey: string;
  exportKey: string;
  supportedFormats: readonly Extract<ExportFormat, ReportFormat>[];
  requiresReportPermission: boolean;
  requiresExportPermission: boolean;
}>;

export type ExportDashboardIntegrationContract = Readonly<{
  dashboardKey: string;
  widgetKey?: string;
  widgetType?: DashboardWidgetType;
  exportKey: string;
  supportedFormats: readonly ExportFormat[];
  requiresDashboardPermission: boolean;
  requiresExportPermission: boolean;
}>;

export type ExportSearchIntegrationContract = Readonly<{
  searchProviderKey?: string;
  resultTypes?: readonly SearchResultType[];
  exportKey: string;
  supportedFormats: readonly ExportFormat[];
  requiresSearchPermission: boolean;
  requiresExportPermission: boolean;
}>;

export type ImportSearchIndexingContract = Readonly<{
  importKey: string;
  searchProviderKey: string;
  indexingJobKey: string;
  triggerAfterCommit: boolean;
}>;

export const IMPORT_EXPORT_FORMATS = [
  {
    contentType: "text/csv",
    fileExtension: ".csv",
    format: "csv",
    supportsExport: true,
    supportsImport: true,
    supportsStreaming: true,
  },
  {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileExtension: ".xlsx",
    format: "excel",
    supportsExport: true,
    supportsImport: true,
    supportsMultipleSheets: true,
  },
  {
    contentType: "application/json",
    fileExtension: ".json",
    format: "json",
    supportsExport: true,
    supportsImport: true,
    supportsStreaming: true,
  },
  {
    contentType: "application/pdf",
    fileExtension: ".pdf",
    format: "pdf",
    supportsExport: true,
    supportsImport: false,
  },
  {
    contentType: "text/html",
    fileExtension: ".html",
    format: "html",
    supportsExport: true,
    supportsImport: false,
  },
  {
    contentType: "application/xml",
    fileExtension: ".xml",
    format: "xml",
    supportsExport: true,
    supportsImport: true,
  },
] as const satisfies readonly ImportExportFormatMetadata[];

export function defineExport<TDefinition extends ExportDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateExportDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function defineImport<TDefinition extends ImportDefinition>(
  definition: TDefinition,
): TDefinition {
  const validation = validateImportDefinition(definition);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return definition;
}

export function validateImportDefinition(definition: ImportDefinition): ImportExportValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Import definition key is required.");
  }

  if (!definition.appKey.trim()) {
    errors.push("Import definition app key is required.");
  }

  if (!definition.label.trim()) {
    errors.push("Import definition label is required.");
  }

  if (collectImportPermissions(definition).length === 0) {
    errors.push("Import definition requires at least one permission.");
  }

  if (definition.supportedFormats.length === 0) {
    errors.push("Import definition requires at least one supported format.");
  }

  if (definition.maxFileSizeBytes < 1) {
    errors.push("Import definition maxFileSizeBytes must be at least 1.");
  }

  errors.push(...validateImportMappings(definition.mappings).errors);
  errors.push(...validateImportValidationRules(definition.validationRules).errors);

  for (const duplicate of findDuplicates(definition.columns.map((column) => column.key))) {
    errors.push(`Duplicate import column: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(definition.templates.map((template) => template.key))) {
    errors.push(`Duplicate import template: ${duplicate}`);
  }

  for (const template of definition.templates) {
    errors.push(...validateImportTemplate(template).errors);
  }

  return toValidationResult(errors);
}

export function validateExportDefinition(definition: ExportDefinition): ImportExportValidationResult {
  const errors: string[] = [];

  if (!definition.key.trim()) {
    errors.push("Export definition key is required.");
  }

  if (!definition.appKey.trim()) {
    errors.push("Export definition app key is required.");
  }

  if (!definition.label.trim()) {
    errors.push("Export definition label is required.");
  }

  if (collectExportPermissions(definition).length === 0) {
    errors.push("Export definition requires at least one permission.");
  }

  if (definition.supportedFormats.length === 0) {
    errors.push("Export definition requires at least one supported format.");
  }

  errors.push(...validateExportMappings(definition.mappings).errors);

  for (const duplicate of findDuplicates(definition.columns.map((column) => column.key))) {
    errors.push(`Duplicate export column: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(definition.templates.map((template) => template.key))) {
    errors.push(`Duplicate export template: ${duplicate}`);
  }

  for (const template of definition.templates) {
    errors.push(...validateExportTemplate(template).errors);
  }

  return toValidationResult(errors);
}

export function validateImportTemplate(template: ImportTemplate): ImportExportValidationResult {
  const errors: string[] = [];

  if (!template.key.trim()) {
    errors.push("Import template key is required.");
  }

  if (!template.label.trim()) {
    errors.push("Import template label is required.");
  }

  if (template.columns.length === 0) {
    errors.push("Import template requires at least one column.");
  }

  errors.push(...validateImportMappings(template.mappings).errors);
  errors.push(...validateImportValidationRules(template.validationRules).errors);

  return toValidationResult(errors);
}

export function validateExportTemplate(template: ExportTemplate): ImportExportValidationResult {
  const errors: string[] = [];

  if (!template.key.trim()) {
    errors.push("Export template key is required.");
  }

  if (!template.label.trim()) {
    errors.push("Export template label is required.");
  }

  if (template.columns.length === 0) {
    errors.push("Export template requires at least one column.");
  }

  errors.push(...validateExportMappings(template.mappings).errors);

  return toValidationResult(errors);
}

export function validateImportMappings(mappings: readonly ImportFieldMapping[]): ImportExportValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(mappings.map((mapping) => mapping.key))) {
    errors.push(`Duplicate import mapping: ${duplicate}`);
  }

  for (const mapping of mappings) {
    if (!mapping.key.trim()) {
      errors.push("Import mapping key is required.");
    }

    if (!mapping.sourceColumn.trim()) {
      errors.push(`Import mapping ${mapping.key} requires a source column.`);
    }

    if (!mapping.targetField.trim()) {
      errors.push(`Import mapping ${mapping.key} requires a target field.`);
    }
  }

  return toValidationResult(errors);
}

export function validateExportMappings(mappings: readonly ExportFieldMapping[]): ImportExportValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(mappings.map((mapping) => mapping.key))) {
    errors.push(`Duplicate export mapping: ${duplicate}`);
  }

  for (const mapping of mappings) {
    if (!mapping.key.trim()) {
      errors.push("Export mapping key is required.");
    }

    if (!mapping.sourceField.trim()) {
      errors.push(`Export mapping ${mapping.key} requires a source field.`);
    }

    if (!mapping.targetColumn.trim()) {
      errors.push(`Export mapping ${mapping.key} requires a target column.`);
    }
  }

  return toValidationResult(errors);
}

export function validateImportValidationRules(rules: readonly ImportValidationRule[]): ImportExportValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(rules.map((rule) => rule.key))) {
    errors.push(`Duplicate import validation rule: ${duplicate}`);
  }

  for (const rule of rules) {
    if (!rule.key.trim()) {
      errors.push("Import validation rule key is required.");
    }

    if (!rule.message.trim()) {
      errors.push(`Import validation rule ${rule.key} requires a message.`);
    }

    if ((rule.type === "required" || rule.type === "type" || rule.type === "range") && !rule.fieldKey) {
      errors.push(`Import validation rule ${rule.key} requires a field key.`);
    }

    if (rule.type === "lookup" && !rule.lookupKey) {
      errors.push(`Import validation rule ${rule.key} requires a lookup key.`);
    }

    if (rule.type === "custom" && !rule.customValidatorKey) {
      errors.push(`Import validation rule ${rule.key} requires a custom validator key.`);
    }

    if (rule.type === "cross-row" && !rule.crossRowKey) {
      errors.push(`Import validation rule ${rule.key} requires a cross-row key.`);
    }

    if (rule.type === "permission" && !rule.requiredPermission) {
      errors.push(`Import validation rule ${rule.key} requires a permission.`);
    }

    if (rule.type === "data-scope" && !rule.requiredDataScope) {
      errors.push(`Import validation rule ${rule.key} requires a data scope.`);
    }
  }

  return toValidationResult(errors);
}

export function createImportPreview(input: Readonly<{
  importKey: string;
  templateKey?: string;
  rows: readonly ImportRow[];
  mode?: ImportCommitMode;
}>): ImportPreview {
  const errorSummary = input.rows.flatMap((row) => row.errors);
  const warningSummary = input.rows.flatMap((row) => row.warnings);

  return {
    dryRun: (input.mode ?? "dry-run") === "dry-run",
    errorSummary,
    importKey: input.importKey,
    mode: input.mode ?? "dry-run",
    rows: input.rows,
    templateKey: input.templateKey,
    validationSummary: {
      acceptedRows: input.rows.filter((row) => row.status === "accepted").length,
      errorCount: errorSummary.length,
      rejectedRows: input.rows.filter((row) => row.status === "rejected").length,
      totalRows: input.rows.length,
      warningCount: warningSummary.length,
      warningRows: input.rows.filter((row) => row.status === "warning").length,
    },
    warningSummary,
  };
}

export function createImportResult(
  importKey: string,
  preview: ImportPreview,
  options: Omit<ImportResult, "importKey" | "mode" | "totalRows" | "acceptedRows" | "rejectedRows" | "warningRows" | "successCount" | "failureCount" | "errors" | "warnings">,
): ImportResult {
  return {
    ...options,
    acceptedRows: preview.validationSummary.acceptedRows,
    errors: preview.errorSummary,
    failureCount: preview.validationSummary.rejectedRows,
    importKey,
    mode: preview.mode,
    rejectedRows: preview.validationSummary.rejectedRows,
    successCount: preview.validationSummary.acceptedRows,
    totalRows: preview.validationSummary.totalRows,
    warningRows: preview.validationSummary.warningRows,
    warnings: preview.warningSummary,
  };
}

export function createExportResult(
  exportKey: string,
  format: ExportFormat,
  options: Omit<ExportResult, "exportKey" | "format" | "contentType"> & Readonly<{ contentType?: string }>,
): ExportResult {
  return {
    ...options,
    contentType: options.contentType ?? contentTypeForFormat(format),
    exportKey,
    format,
  };
}

export function createImportBatch(input: Omit<ImportBatch, "progress"> & Readonly<{ progress?: number }>): ImportBatch {
  return {
    ...input,
    progress: input.progress ?? calculateProgress(input.processedRows, input.totalRows),
  };
}

export function createExportBatch(input: Omit<ExportBatch, "progress"> & Readonly<{ progress?: number }>): ExportBatch {
  return {
    ...input,
    progress: input.progress ?? calculateProgress(input.rowCount, input.rowCount),
  };
}

export function createImportRegistry(imports: readonly ImportDefinition[] = []): ImportRegistry {
  return {
    imports: dedupeByKey(imports),
  };
}

export function registerImport(registry: ImportRegistry, definition: ImportDefinition): ImportRegistry {
  defineImport(definition);

  return createImportRegistry([
    ...registry.imports.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function createExportRegistry(exports: readonly ExportDefinition[] = []): ExportRegistry {
  return {
    exports: dedupeByKey(exports),
  };
}

export function registerExport(registry: ExportRegistry, definition: ExportDefinition): ExportRegistry {
  defineExport(definition);

  return createExportRegistry([
    ...registry.exports.filter((candidate) => candidate.key !== definition.key),
    definition,
  ]);
}

export function canAccessImport(definition: ImportDefinition, context: ImportContext): boolean {
  return canAccessOperation(definition.security, collectImportPermissions(definition), context);
}

export function canAccessExport(definition: ExportDefinition, context: ExportContext): boolean {
  return canAccessOperation(definition.security, collectExportPermissions(definition), context);
}

export function shouldRunImportAsync(definition: ImportDefinition, rowCount: number, context: ImportContext): boolean {
  return definition.requiresAsync
    || context.preferAsync === true
    || Boolean(definition.maxRows && rowCount > definition.maxRows)
    || rowCount > 1_000;
}

export function shouldRunExportAsync(definition: ExportDefinition, rowCount: number, context: ExportContext): boolean {
  return definition.requiresAsync
    || context.preferAsync === true
    || Boolean(definition.maxRows && rowCount > definition.maxRows)
    || rowCount > 5_000;
}

export function createImportJobReadinessContract(definition: ImportDefinition): ImportExportJobReadiness {
  return createJobReadiness("import", definition.key, true);
}

export function createExportJobReadinessContract(definition: ExportDefinition): ImportExportJobReadiness {
  return createJobReadiness("export", definition.key, true);
}

export function createExportReportIntegrationContract(
  reportKey: string,
  exportKey: string,
  supportedFormats: readonly Extract<ExportFormat, ReportFormat>[] = ["csv", "excel", "json", "pdf", "html"],
): ExportReportIntegrationContract {
  return {
    exportKey,
    reportKey,
    requiresExportPermission: true,
    requiresReportPermission: true,
    supportedFormats,
  };
}

export function createExportDashboardIntegrationContract(
  dashboardKey: string,
  exportKey: string,
  options: Partial<Omit<ExportDashboardIntegrationContract, "dashboardKey" | "exportKey" | "requiresDashboardPermission" | "requiresExportPermission">> & Readonly<{
    requiresDashboardPermission?: boolean;
    requiresExportPermission?: boolean;
  }> = {},
): ExportDashboardIntegrationContract {
  return {
    ...options,
    dashboardKey,
    exportKey,
    requiresDashboardPermission: options.requiresDashboardPermission ?? true,
    requiresExportPermission: options.requiresExportPermission ?? true,
    supportedFormats: options.supportedFormats ?? ["csv", "excel", "json"],
  };
}

export function createExportSearchIntegrationContract(
  exportKey: string,
  options: Partial<Omit<ExportSearchIntegrationContract, "exportKey" | "requiresSearchPermission" | "requiresExportPermission">> & Readonly<{
    requiresSearchPermission?: boolean;
    requiresExportPermission?: boolean;
  }> = {},
): ExportSearchIntegrationContract {
  return {
    ...options,
    exportKey,
    requiresExportPermission: options.requiresExportPermission ?? true,
    requiresSearchPermission: options.requiresSearchPermission ?? true,
    supportedFormats: options.supportedFormats ?? ["csv", "json"],
  };
}

export function createImportSearchIndexingContract(
  importKey: string,
  searchProviderKey: string,
): ImportSearchIndexingContract {
  return {
    importKey,
    indexingJobKey: `search.${searchProviderKey}.index-import`,
    searchProviderKey,
    triggerAfterCommit: true,
  };
}

export function createImportSecurityMetadata(
  definition: ImportDefinition,
  context: ImportContext,
): ReturnType<typeof createOperationSecurityMetadata> {
  return createOperationSecurityMetadata(definition.key, definition.security, collectImportPermissions(definition), context);
}

export function createExportSecurityMetadata(
  definition: ExportDefinition,
  context: ExportContext,
): ReturnType<typeof createOperationSecurityMetadata> {
  return createOperationSecurityMetadata(definition.key, definition.security, collectExportPermissions(definition), context);
}

export function createImportAuditMetadata(
  result: ImportResult,
  context: ImportContext,
): Readonly<{
  action: AuditAction;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: ImportExportSourceEngine;
  rowCount: number;
  format?: ImportFormat;
  successCount: number;
  failureCount: number;
  durationMs?: number;
}> {
  return {
    action: `import.${result.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    failureCount: result.failureCount,
    principalId: context.principalId,
    rowCount: result.totalRows,
    sourceApp: context.sourceApp,
    sourceEngine: context.sourceEngine ?? "import-export",
    successCount: result.successCount,
    tenantId: context.tenantId,
  };
}

export function createExportAuditMetadata(
  result: ExportResult,
  context: ExportContext,
): Readonly<{
  action: AuditAction;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceApp?: string | null;
  sourceEngine?: ImportExportSourceEngine;
  rowCount: number;
  fileFormat: ExportFormat;
  successCount: number;
  failureCount: number;
  durationMs?: number;
}> {
  return {
    action: `export.${result.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs: result.durationMs,
    failureCount: result.failureCount,
    fileFormat: result.format,
    principalId: context.principalId,
    rowCount: result.rowCount,
    sourceApp: context.sourceApp,
    sourceEngine: context.sourceEngine ?? "import-export",
    successCount: result.successCount,
    tenantId: context.tenantId,
  };
}

export function createImportTelemetryMetadata(
  result: ImportResult,
  context: ImportContext,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  rowCount: number;
  successCount: number;
  failureCount: number;
  durationMs?: number;
}> {
  return createTelemetryMetadata(result.importKey, result.totalRows, result.successCount, result.failureCount, result.durationMs, context);
}

export function createExportTelemetryMetadata(
  result: ExportResult,
  context: ExportContext,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  rowCount: number;
  successCount: number;
  failureCount: number;
  durationMs?: number;
  fileFormat: ExportFormat;
}> {
  return {
    ...createTelemetryMetadata(result.exportKey, result.rowCount, result.successCount, result.failureCount, result.durationMs, context),
    fileFormat: result.format,
  };
}

function collectImportPermissions(definition: ImportDefinition): readonly (PermissionKey | string)[] {
  return [...new Set([
    definition.requiredPermission,
    ...(definition.requiredPermissions ?? []),
    ...definition.security.requiredPermissions,
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function collectExportPermissions(definition: ExportDefinition): readonly (PermissionKey | string)[] {
  return [...new Set([
    definition.requiredPermission,
    ...(definition.requiredPermissions ?? []),
    ...definition.security.requiredPermissions,
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function canAccessOperation(
  security: ImportExportSecurityMetadata,
  requiredPermissions: readonly (PermissionKey | string)[],
  context: ImportContext | ExportContext,
): boolean {
  const hasPermissions = requiredPermissions.every((permission) => context.grantedPermissions?.has(permission));
  const hasDataScopes = (security.requiredDataScopes ?? []).every((scope) => context.dataScopeKeys?.has(scope));

  return hasPermissions
    && hasDataScopes
    && (!security.tenantAware || Boolean(context.tenantId))
    && (!security.companyAware || Boolean(context.companyId))
    && (!security.branchAware || Boolean(context.branchId));
}

function createJobReadiness(
  operation: "import" | "export",
  definitionKey: string,
  retryable: boolean,
): ImportExportJobReadiness {
  return {
    cancellable: true,
    deadLetterEnabled: true,
    definitionKey,
    integration: "import-export",
    jobKey: `${operation}.${definitionKey}`,
    operation,
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable,
  };
}

function createOperationSecurityMetadata(
  operationKey: string,
  security: ImportExportSecurityMetadata,
  requiredPermissions: readonly (PermissionKey | string)[],
  context: ImportContext | ExportContext,
): Readonly<{
  operationKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  dataScopes: readonly string[];
  sensitivity: ImportExportSensitivity;
  sensitiveData: boolean;
  pii: boolean;
  auditRequired: boolean;
  exportRestrictions: readonly string[];
}> {
  return {
    auditRequired: security.auditRequired,
    branchId: context.branchId,
    companyId: context.companyId,
    dataScopes: security.requiredDataScopes ?? [],
    exportRestrictions: security.exportRestrictions ?? [],
    operationKey,
    pii: security.pii,
    requiredPermissions: requiredPermissions.map(String),
    sensitiveData: security.sensitiveData,
    sensitivity: security.sensitivity,
    tenantId: context.tenantId,
  };
}

function createTelemetryMetadata(
  sourceKey: string,
  rowCount: number,
  successCount: number,
  failureCount: number,
  durationMs: number | undefined,
  context: ImportContext | ExportContext,
): Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  sourceKey: string;
  rowCount: number;
  successCount: number;
  failureCount: number;
  durationMs?: number;
}> {
  return {
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs,
    failureCount,
    requestId: context.requestId,
    rowCount,
    sourceKey,
    successCount,
    tenantId: context.tenantId,
  };
}

function contentTypeForFormat(format: ExportFormat): string {
  return IMPORT_EXPORT_FORMATS.find((candidate) => candidate.format === format)?.contentType ?? "application/octet-stream";
}

function calculateProgress(processed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((processed / total) * 100));
}

function dedupeByKey<TItem extends Readonly<{ key: string }>>(items: readonly TItem[]): readonly TItem[] {
  const byKey = new Map<string, TItem>();

  for (const item of items) {
    byKey.set(item.key, item);
  }

  return [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function findDuplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

function toValidationResult(errors: readonly string[]): ImportExportValidationResult {
  return {
    errors,
    valid: errors.length === 0,
  };
}
