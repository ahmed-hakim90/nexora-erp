import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration } from "@/platform/background-jobs/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { SearchProviderSource } from "@/platform/search/public-api";
import type { TelemetryEvent } from "@/platform/observability/public-api";

export type ReportExecutionMode = "interactive" | "async";

export type ReportCategory =
  | "platform"
  | "operational"
  | "financial"
  | "compliance"
  | "audit"
  | "analytics"
  | "integration";

export type ReportFormat = "table" | "json" | "csv" | "excel" | "pdf" | "html";

export type ReportProviderSource = "platform-engine" | "business-app" | "marketplace-extension";

export type ReportFieldType =
  | "text"
  | "number"
  | "currency"
  | "quantity"
  | "date"
  | "datetime"
  | "boolean";

export type ReportDatasetField = Readonly<{
  key: string;
  label: string;
  type: ReportFieldType;
  isDimension?: boolean;
  isMeasure?: boolean;
  isSensitive?: boolean;
}>;

export type ReportDataset = Readonly<{
  key: string;
  appKey: string;
  label: string;
  fields: readonly ReportDatasetField[];
  requiredPermission: string;
  defaultExecutionMode: ReportExecutionMode;
}>;

export type ReportFilterOperator =
  | "equals"
  | "contains"
  | "starts_with"
  | "between"
  | "gte"
  | "lte"
  | "in";

export type ReportBuilderFilter = Readonly<{
  fieldKey: string;
  operator: ReportFilterOperator;
  value?: unknown;
}>;

export type ReportLayout = Readonly<{
  type: "table" | "summary" | "chart" | "pivot";
  dimensionKeys: readonly string[];
  measureKeys: readonly string[];
  sort?: readonly { fieldKey: string; direction: "asc" | "desc" }[];
}>;

export type ReportBuilderSchema = Readonly<{
  datasetKey: string;
  filters: readonly ReportBuilderFilter[];
  layout: ReportLayout;
  allowExport: boolean;
  allowPrint: boolean;
}>;

export type ReportDefinition = Readonly<{
  key: string;
  name?: string;
  description?: string;
  category?: ReportCategory;
  appKey?: string;
  datasetKey?: string;
  mode: ReportExecutionMode;
  requiredPermission: string;
  requiredPermissions?: readonly PermissionKey[];
  parameters?: readonly ReportParameter[];
  dataSource?: ReportDataSource;
  templates?: readonly ReportTemplate[];
  supportedFormats?: readonly ReportFormat[];
  metadata?: ReportMetadata;
  providerSource?: ReportProviderSource;
  builderSchema?: ReportBuilderSchema;
}>;

export type ReportTemplate = Readonly<{
  key: string;
  format: ReportFormat;
  layout: "table" | "summary" | "document" | "export";
  titleTemplate?: string;
  description?: string;
  supportsBranding?: boolean;
}>;

export type ReportParameterType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "date-range"
  | "lookup"
  | "multi-select"
  | "custom";

export type ReportParameterValidation = Readonly<{
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  requiredBefore?: string;
  requiredAfter?: string;
  customValidatorKey?: string;
}>;

export type ReportParameter = Readonly<{
  key: string;
  label: string;
  type: ReportParameterType;
  required: boolean;
  defaultValue?: unknown;
  lookupProviderKey?: string;
  options?: readonly { label: string; value: string }[];
  validation?: ReportParameterValidation;
}>;

export type ReportDataSourceType =
  | "repository"
  | "sql"
  | "view"
  | "materialized-view"
  | "external-api"
  | "search-provider";

export type ReportDataSource = Readonly<{
  key: string;
  type: ReportDataSourceType;
  sourceKey: string;
  providerSource?: SearchProviderSource | ReportProviderSource;
  supportsSync: boolean;
  supportsAsync: boolean;
  maxSyncRows?: number;
}>;

export type ReportExecutionContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience?: AccessExperience | null;
  actorType?: ActorType | null;
  actorId?: string | null;
  principalId?: string | null;
  originatingApp?: string | null;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  preferAsync?: boolean;
}>;

export type ReportMetadata = Readonly<{
  sensitivity: "public" | "internal" | "sensitive" | "restricted";
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  requiredDataScopes?: readonly string[];
  auditRequired: boolean;
  asyncRecommended?: boolean;
  estimatedRows?: number;
}>;

export type ReportOutput = Readonly<{
  format: ReportFormat;
  rowCount?: number;
  columns?: readonly ReportDatasetField[];
  contentType?: string;
  fileName?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ReportResult<TData = unknown> = Readonly<{
  reportKey: string;
  status: "ready" | "queued" | "failed";
  output: ReportOutput;
  data?: TData;
  jobKey?: string;
  errorMessage?: string;
}>;

export type ReportRegistry = Readonly<{
  reports: readonly ReportDefinition[];
}>;

export type ReportValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export function defineReportDataset<TDataset extends ReportDataset>(
  dataset: TDataset,
): TDataset {
  return dataset;
}

export function defineReport<TReport extends ReportDefinition>(
  report: TReport,
): TReport {
  const validation = validateReportDefinition(report);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return report;
}

export function validateReportDefinition(report: ReportDefinition): ReportValidationResult {
  const errors: string[] = [];

  if (!report.key.trim()) {
    errors.push("Report key is required.");
  }

  if (!report.requiredPermission && (!report.requiredPermissions || report.requiredPermissions.length === 0)) {
    errors.push("Report requires at least one permission.");
  }

  for (const duplicate of findDuplicates((report.parameters ?? []).map((parameter) => parameter.key))) {
    errors.push(`Duplicate report parameter: ${duplicate}`);
  }

  if (report.mode === "interactive" && report.dataSource && !report.dataSource.supportsSync) {
    errors.push("Interactive reports require a synchronous data source.");
  }

  if (report.mode === "async" && report.dataSource && !report.dataSource.supportsAsync) {
    errors.push("Async reports require an asynchronous data source.");
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createReportRegistry(reports: readonly ReportDefinition[] = []): ReportRegistry {
  return {
    reports: dedupeReports(reports),
  };
}

export function registerReport(registry: ReportRegistry, report: ReportDefinition): ReportRegistry {
  defineReport(report);

  return createReportRegistry([
    ...registry.reports.filter((candidate) => candidate.key !== report.key),
    report,
  ]);
}

export function unregisterReport(registry: ReportRegistry, reportKey: string): ReportRegistry {
  return createReportRegistry(registry.reports.filter((report) => report.key !== reportKey));
}

export function listReports(
  registry: ReportRegistry,
  filters: Readonly<{
    category?: ReportCategory;
    appKey?: string;
    providerSource?: ReportProviderSource;
  }> = {},
): readonly ReportDefinition[] {
  return registry.reports.filter((report) =>
    (!filters.category || report.category === filters.category)
    && (!filters.appKey || report.appKey === filters.appKey)
    && (!filters.providerSource || report.providerSource === filters.providerSource),
  );
}

export function discoverReports(
  registry: ReportRegistry,
  context?: ReportExecutionContext,
): readonly ReportDefinition[] {
  if (!context) {
    return registry.reports;
  }

  return registry.reports.filter((report) => canAccessReport(report, context));
}

export function validateReportParameters(
  parameters: readonly ReportParameter[],
  values: Readonly<Record<string, unknown>>,
): ReportValidationResult {
  const errors: string[] = [];

  for (const parameter of parameters) {
    const value = values[parameter.key] ?? parameter.defaultValue;

    if (parameter.required && (value === undefined || value === null || value === "")) {
      errors.push(`Missing required report parameter: ${parameter.key}`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (parameter.type === "date-range" && !isDateRange(value)) {
      errors.push(`Report parameter ${parameter.key} must be a date range.`);
    }

    if (parameter.type === "multi-select" && !Array.isArray(value)) {
      errors.push(`Report parameter ${parameter.key} must be an array.`);
    }

    if (parameter.validation?.min !== undefined && typeof value === "number" && value < parameter.validation.min) {
      errors.push(`Report parameter ${parameter.key} is below minimum.`);
    }

    if (parameter.validation?.max !== undefined && typeof value === "number" && value > parameter.validation.max) {
      errors.push(`Report parameter ${parameter.key} is above maximum.`);
    }

    if (parameter.validation?.minLength !== undefined && typeof value === "string" && value.length < parameter.validation.minLength) {
      errors.push(`Report parameter ${parameter.key} is shorter than minimum length.`);
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function createReportOutput(
  format: ReportFormat,
  options: Omit<ReportOutput, "format"> = {},
): ReportOutput {
  return {
    ...options,
    contentType: options.contentType ?? contentTypeForReportFormat(format),
    format,
  };
}

export function createReportResult<TData>(
  reportKey: string,
  output: ReportOutput,
  data?: TData,
): ReportResult<TData> {
  return {
    data,
    output,
    reportKey,
    status: "ready",
  };
}

export function canAccessReport(report: ReportDefinition, context: ReportExecutionContext): boolean {
  const requiredPermissions = [
    report.requiredPermission,
    ...(report.requiredPermissions ?? []),
  ].filter(Boolean);
  const hasPermissions = requiredPermissions.every((permission) =>
    context.grantedPermissions?.has(permission),
  );
  const dataScopes = report.metadata?.requiredDataScopes ?? [];
  const hasDataScopes = dataScopes.every((scope) => context.dataScopeKeys?.has(scope));

  return hasPermissions
    && hasDataScopes
    && (!report.metadata?.tenantAware || Boolean(context.tenantId));
}

export function shouldExecuteReportAsync(
  report: ReportDefinition,
  context: ReportExecutionContext,
): boolean {
  return report.mode === "async"
    || context.preferAsync === true
    || report.metadata?.asyncRecommended === true
    || Boolean(report.metadata?.estimatedRows && report.dataSource?.maxSyncRows && report.metadata.estimatedRows > report.dataSource.maxSyncRows);
}

export function createReportJobReadinessContract(report: ReportDefinition): Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  reportKey: string;
  requiresBackgroundExecution: true;
}> {
  return {
    integration: "report-generation",
    jobKey: `report.${report.key}`,
    reportKey: report.key,
    requiresBackgroundExecution: true,
  };
}

export function createReportSecurityMetadata(
  report: ReportDefinition,
  context: ReportExecutionContext,
): Readonly<{
  reportKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  dataScopes: readonly string[];
  sensitivity: ReportMetadata["sensitivity"];
  auditRequired: boolean;
}> {
  return {
    auditRequired: report.metadata?.auditRequired ?? true,
    branchId: context.branchId,
    companyId: context.companyId,
    dataScopes: report.metadata?.requiredDataScopes ?? [],
    reportKey: report.key,
    requiredPermissions: [
      report.requiredPermission,
      ...(report.requiredPermissions ?? []),
    ].filter(Boolean),
    sensitivity: report.metadata?.sensitivity ?? "internal",
    tenantId: context.tenantId,
  };
}

export function createReportAuditMetadata(
  report: ReportDefinition,
  result: ReportResult,
  context: ReportExecutionContext,
  durationMs: number,
): Readonly<{
  action: AuditAction;
  reportKey: string;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  durationMs: number;
  rowCount?: number;
  format: ReportFormat;
  originatingApp?: string | null;
}> {
  return {
    action: `report.${result.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs,
    format: result.output.format,
    originatingApp: context.originatingApp ?? report.appKey,
    principalId: context.principalId,
    reportKey: report.key,
    rowCount: result.output.rowCount,
    tenantId: context.tenantId,
  };
}

export function createReportTelemetryMetadata(
  report: ReportDefinition,
  result: ReportResult,
  context: ReportExecutionContext,
  durationMs: number,
): Pick<TelemetryEvent, "correlationId" | "requestId" | "tenantId" | "companyId" | "branchId" | "sourceKey"> &
  Readonly<{
    reportKey: string;
    durationMs: number;
    rowCount?: number;
    format: ReportFormat;
    originatingApp?: string | null;
  }> {
  return {
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs,
    format: result.output.format,
    originatingApp: context.originatingApp ?? report.appKey,
    reportKey: report.key,
    requestId: context.requestId,
    rowCount: result.output.rowCount,
    sourceKey: report.key,
    tenantId: context.tenantId,
  };
}

function contentTypeForReportFormat(format: ReportFormat): string {
  return {
    csv: "text/csv",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    html: "text/html",
    json: "application/json",
    pdf: "application/pdf",
    table: "application/vnd.nexora.report.table+json",
  }[format];
}

function isDateRange(value: unknown): value is Readonly<{ from: string; to: string }> {
  return Boolean(
    value
      && typeof value === "object"
      && "from" in value
      && "to" in value,
  );
}

function dedupeReports(reports: readonly ReportDefinition[]): readonly ReportDefinition[] {
  const byKey = new Map<string, ReportDefinition>();

  for (const report of reports) {
    byKey.set(report.key, report);
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
