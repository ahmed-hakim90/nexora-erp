import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration } from "@/platform/background-jobs/public-api";
import type { CompanyBranding } from "@/platform/branding/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";

export type PrintExecutionMode = "single" | "batch";

export type PrintTemplateType =
  | "invoice"
  | "quotation"
  | "purchase-order"
  | "sales-order"
  | "delivery-note"
  | "payslip"
  | "contract"
  | "hr-letter"
  | "report"
  | "receipt"
  | "voucher"
  | "custom-document";

export type PrintTemplateProviderSource = "platform-engine" | "business-app" | "marketplace-extension";

export type PrintTemplateStatus = "draft" | "published" | "archived";

export type PrintFormat = "preview" | "html" | "pdf" | "json";

export type PrintOutputStatus = "ready" | "queued" | "failed";

export type PrintDirection = "ltr" | "rtl";

export type PrintSensitivity = "public" | "internal" | "sensitive" | "restricted";

export type PrintPageSize = "a4" | "letter" | "receipt" | "custom";

export type PrintOrientation = "portrait" | "landscape";

export type PrintTemplateSection =
  | "header"
  | "body"
  | "footer"
  | "watermark"
  | "signature"
  | "terms";

export type PrintTemplateBlockType =
  | "header"
  | "footer"
  | "body"
  | "table"
  | "section"
  | "grid"
  | "text"
  | "image"
  | "logo"
  | "qr-code"
  | "barcode"
  | "signature"
  | "watermark"
  | "page-number"
  | "repeating-rows";

export type PrintVariableKind =
  | "company"
  | "branch"
  | "party"
  | "document"
  | "user"
  | "date"
  | "amount"
  | "totals"
  | "line-items"
  | "localized-label"
  | "custom";

export type PrintVariableValueType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "object"
  | "array"
  | "image"
  | "url";

export type PrintDataSourceKind =
  | "record"
  | "collection"
  | "repository"
  | "report"
  | "snapshot"
  | "custom";

export type PrintTemplateBinding = Readonly<{
  key: string;
  label: string;
  sourcePath: string;
  isRequired?: boolean;
  isSensitive?: boolean;
}>;

export type PrintTemplateDesignerSchema = Readonly<{
  pageSize: PrintPageSize;
  orientation: PrintOrientation;
  sections: readonly PrintTemplateSection[];
  bindings: readonly PrintTemplateBinding[];
  supportsRtl: boolean;
  supportsBranding: boolean;
}>;

export type PrintTemplateDefinition = Readonly<{
  key: string;
  version: string;
  mode: PrintExecutionMode;
  requiredPermission: string;
  designerSchema?: PrintTemplateDesignerSchema;
  isOfficial?: boolean;
}>;

export type PrintTemplateDraft = Readonly<{
  key: string;
  baseTemplateKey?: string;
  versionNote?: string;
  schema: PrintTemplateDesignerSchema;
  status: "draft" | "review" | "published" | "archived";
}>;

export type PrintTemplatePage = Readonly<{
  size: PrintPageSize;
  orientation: PrintOrientation;
  margin?: Readonly<{
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  }>;
  width?: string;
  height?: string;
}>;

export type PrintTemplateStyle = Readonly<{
  colorToken?: string;
  backgroundColorToken?: string;
  fontFamilyToken?: string;
  fontSize?: string;
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right" | "justify";
  direction?: PrintDirection;
  width?: string;
  minHeight?: string;
  spacingToken?: string;
  borderToken?: string;
}>;

export type PrintTemplateRepeat = Readonly<{
  dataSourceKey?: string;
  variableKey?: string;
  emptyStateText?: string;
  maxRows?: number;
  pageBreakInside?: "avoid" | "auto";
}>;

export type PrintTemplateTableColumn = Readonly<{
  key: string;
  label: string;
  variableKey?: string;
  width?: string;
  align?: "left" | "center" | "right";
  localizedLabelKey?: string;
  sensitive?: boolean;
}>;

export type PrintTemplateBlock = Readonly<{
  key: string;
  type: PrintTemplateBlockType;
  label?: string;
  variableKey?: string;
  dataSourceKey?: string;
  localizedLabelKey?: string;
  text?: string;
  altText?: string;
  children?: readonly PrintTemplateBlock[];
  style?: PrintTemplateStyle;
  table?: Readonly<{
    columns: readonly PrintTemplateTableColumn[];
    repeat?: PrintTemplateRepeat;
  }>;
  repeat?: PrintTemplateRepeat;
  visibleWhen?: string;
  sensitive?: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintTemplateLayout = Readonly<{
  page: PrintTemplatePage;
  direction?: PrintDirection;
  blocks: readonly PrintTemplateBlock[];
}>;

export type PrintTemplateVariable = Readonly<{
  key: string;
  label: string;
  kind: PrintVariableKind;
  valueType: PrintVariableValueType;
  sourcePath?: string;
  required?: boolean;
  localized?: boolean;
  sensitive?: boolean;
  repeatable?: boolean;
  defaultValue?: unknown;
  format?: "plain" | "currency" | "date" | "datetime" | "percent" | "quantity";
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintTemplateDataSource = Readonly<{
  key: string;
  label: string;
  kind: PrintDataSourceKind;
  sourceKey: string;
  supportsPreview: boolean;
  supportsSync: boolean;
  supportsAsync: boolean;
  maxPreviewRows?: number;
  requiredPermission?: PermissionKey | string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintTemplateRenderer = Readonly<{
  key: string;
  format: PrintFormat;
  rendererKey: string;
  supportsPreview: boolean;
  requiresBackgroundJob: boolean;
  jobKey?: string;
  contentType?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintTemplateVersion = Readonly<{
  templateKey: string;
  version: number;
  status: PrintTemplateStatus;
  layout: PrintTemplateLayout;
  variables: readonly PrintTemplateVariable[];
  dataSources: readonly PrintTemplateDataSource[];
  renderers: readonly PrintTemplateRenderer[];
  changeSummary: string;
  createdAt: string;
  createdBy?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  rollback?: Readonly<{
    fromVersion: number;
    reason: string;
    rolledBackAt: string;
    rolledBackBy?: string | null;
  }>;
  auditMetadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintTemplateSecurityMetadata = Readonly<{
  requiredPermissions: readonly (PermissionKey | string)[];
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  sensitivity: PrintSensitivity;
  sensitiveData: boolean;
  auditRequired: boolean;
  requiredDataScopes?: readonly string[];
}>;

export type PrintTemplateMetadata = Readonly<{
  tenantScoped: boolean;
  companyScoped: boolean;
  branchScoped?: boolean;
  brandAware: boolean;
  localeAware: boolean;
  reportCompatible?: boolean;
  asyncRecommended?: boolean;
  estimatedPages?: number;
}>;

export type PrintTemplate = Readonly<{
  key: string;
  name: string;
  type: PrintTemplateType;
  appKey: string;
  providerSource: PrintTemplateProviderSource;
  defaultLocale: string;
  supportedLocales: readonly string[];
  supportedFormats: readonly PrintFormat[];
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  security: PrintTemplateSecurityMetadata;
  metadata: PrintTemplateMetadata;
  currentVersion?: PrintTemplateVersion;
  versions?: readonly PrintTemplateVersion[];
}>;

export type PrintContext = Readonly<{
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
  locale: string;
  direction: PrintDirection;
  timezone?: string;
  currency?: string;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  originatingApp?: string | null;
  preferAsync?: boolean;
}>;

export type PrintBrandingContext = Readonly<{
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  appKey?: string | null;
  locale: string;
  direction: PrintDirection;
  currency?: string;
  timezone?: string;
  logo?: Readonly<{
    fileId?: string | null;
    url?: string | null;
    altText?: string | null;
  }>;
  colors: Readonly<{
    primary: string;
    secondary?: string;
    accent?: string;
    text?: string;
    mutedText?: string;
    border?: string;
    background?: string;
  }>;
  fonts: Readonly<{
    primary: string;
    secondary?: string;
    mono?: string;
  }>;
  companyBranding?: Pick<
    CompanyBranding,
    "displayName" | "legalName" | "logoFileId" | "documentHeaderText" | "documentFooterText" | "primaryColorToken"
  >;
}>;

export type PrintTemplatePreview = Readonly<{
  templateKey: string;
  version: number;
  format: Extract<PrintFormat, "preview" | "html" | "json">;
  context: PrintContext;
  branding: PrintBrandingContext;
  sampleData: Readonly<Record<string, unknown>>;
  requestedAt: string;
}>;

export type PrintOutput = Readonly<{
  templateKey: string;
  version: number;
  format: PrintFormat;
  status: PrintOutputStatus;
  contentType: string;
  fileName?: string;
  jobKey?: string;
  jobId?: string;
  pageCount?: number;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PrintSnapshot = Readonly<{
  id: string;
  templateKey: string;
  templateVersion: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}>;

export type PrintValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export type PrintRegistry = Readonly<{
  templates: readonly PrintTemplate[];
}>;

export type PrintRenderJobReadiness = Readonly<{
  integration: JobReadinessIntegration;
  jobKey: string;
  templateKey: string;
  format: PrintFormat;
  requiresBackgroundExecution: true;
  idempotencyKeyParts: readonly string[];
}>;

export type PrintReportIntegrationContract = Readonly<{
  reportKey: string;
  templateKey: string;
  supportedFormats: readonly Extract<PrintFormat, "html" | "pdf" | "json">[];
  requiresReportPermission: boolean;
  requiresPrintPermission: boolean;
}>;

export function definePrintTemplate<TTemplate extends PrintTemplate | PrintTemplateDefinition>(
  template: TTemplate,
): TTemplate {
  const validation = validatePrintTemplateDefinition(template);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return template;
}

export function createPrintTemplateVersion(input: Readonly<{
  templateKey: string;
  currentVersion?: number;
  status?: PrintTemplateStatus;
  layout: PrintTemplateLayout;
  variables?: readonly PrintTemplateVariable[];
  dataSources?: readonly PrintTemplateDataSource[];
  renderers?: readonly PrintTemplateRenderer[];
  changeSummary: string;
  createdAt: string;
  createdBy?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  rollback?: PrintTemplateVersion["rollback"];
  auditMetadata?: Readonly<Record<string, unknown>>;
}>): PrintTemplateVersion {
  const version: PrintTemplateVersion = {
    auditMetadata: input.auditMetadata,
    changeSummary: input.changeSummary,
    createdAt: input.createdAt,
    createdBy: input.createdBy ?? null,
    dataSources: input.dataSources ?? [],
    layout: input.layout,
    publishedAt: input.status === "published" ? input.publishedAt ?? input.createdAt : input.publishedAt,
    publishedBy: input.status === "published" ? input.publishedBy ?? input.createdBy ?? null : input.publishedBy,
    renderers: input.renderers ?? [],
    rollback: input.rollback,
    status: input.status ?? "draft",
    templateKey: input.templateKey,
    variables: input.variables ?? [],
    version: (input.currentVersion ?? 0) + 1,
  };
  const validation = validatePrintTemplateVersion(version);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return version;
}

export function validatePrintTemplateDefinition(template: PrintTemplate | PrintTemplateDefinition): PrintValidationResult {
  const errors: string[] = [];

  if (!template.key.trim()) {
    errors.push("Print template key is required.");
  }

  if (isLegacyPrintTemplateDefinition(template)) {
    if (!template.version.trim()) {
      errors.push("Print template version is required.");
    }

    if (!template.requiredPermission.trim()) {
      errors.push("Print template requires at least one permission.");
    }

    if (template.designerSchema) {
      errors.push(...validateDesignerSchema(template.designerSchema).errors);
    }

    return toValidationResult(errors);
  }

  if (!template.name.trim()) {
    errors.push("Print template name is required.");
  }

  if (!template.appKey.trim()) {
    errors.push("Print template app key is required.");
  }

  const requiredPermissions = collectTemplatePermissions(template);
  if (requiredPermissions.length === 0) {
    errors.push("Print template requires at least one permission.");
  }

  if (!template.supportedLocales.includes(template.defaultLocale)) {
    errors.push("Print template default locale must be included in supported locales.");
  }

  if (template.supportedFormats.length === 0) {
    errors.push("Print template requires at least one supported format.");
  }

  for (const duplicate of findDuplicates((template.versions ?? []).map((version) => String(version.version)))) {
    errors.push(`Duplicate print template version: ${duplicate}`);
  }

  for (const version of template.versions ?? []) {
    errors.push(...validatePrintTemplateVersion(version).errors);
  }

  if (template.currentVersion) {
    errors.push(...validatePrintTemplateVersion(template.currentVersion).errors);
  }

  return toValidationResult(errors);
}

export function validatePrintTemplateVersion(version: PrintTemplateVersion): PrintValidationResult {
  const errors: string[] = [];

  if (!version.templateKey.trim()) {
    errors.push("Print template version requires a template key.");
  }

  if (version.version < 1) {
    errors.push("Print template version must be at least 1.");
  }

  if (!version.changeSummary.trim()) {
    errors.push("Print template version requires a change summary.");
  }

  errors.push(...validatePrintTemplateLayout(version.layout).errors);
  errors.push(...validatePrintTemplateVariables(version.variables).errors);

  for (const duplicate of findDuplicates(version.dataSources.map((source) => source.key))) {
    errors.push(`Duplicate print data source: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(version.renderers.map((renderer) => renderer.key))) {
    errors.push(`Duplicate print renderer: ${duplicate}`);
  }

  if (version.status === "published" && !version.publishedAt) {
    errors.push("Published print template versions require publishedAt metadata.");
  }

  if (version.rollback && version.rollback.fromVersion < 1) {
    errors.push("Print template rollback metadata requires a valid source version.");
  }

  return toValidationResult(errors);
}

export function validatePrintTemplateLayout(layout: PrintTemplateLayout): PrintValidationResult {
  const errors: string[] = [];

  if (layout.blocks.length === 0) {
    errors.push("Print template layout requires at least one block.");
  }

  const blockKeys = flattenBlocks(layout.blocks).map((block) => block.key);
  for (const duplicate of findDuplicates(blockKeys)) {
    errors.push(`Duplicate print layout block: ${duplicate}`);
  }

  if (!flattenBlocks(layout.blocks).some((block) => block.type === "body")) {
    errors.push("Print template layout requires a body block.");
  }

  for (const block of flattenBlocks(layout.blocks)) {
    if (!block.key.trim()) {
      errors.push("Print template layout block key is required.");
    }

    if (block.type === "table" && (!block.table || block.table.columns.length === 0)) {
      errors.push(`Print table block ${block.key} requires at least one column.`);
    }

    if (block.type === "repeating-rows" && !block.repeat?.dataSourceKey && !block.repeat?.variableKey) {
      errors.push(`Print repeating rows block ${block.key} requires a data source or variable.`);
    }

    if (block.repeat?.maxRows !== undefined && block.repeat.maxRows < 1) {
      errors.push(`Print repeat block ${block.key} maxRows must be at least 1.`);
    }
  }

  return toValidationResult(errors);
}

export function validatePrintTemplateVariables(variables: readonly PrintTemplateVariable[]): PrintValidationResult {
  const errors: string[] = [];

  for (const duplicate of findDuplicates(variables.map((variable) => variable.key))) {
    errors.push(`Duplicate print variable: ${duplicate}`);
  }

  for (const variable of variables) {
    if (!variable.key.trim()) {
      errors.push("Print variable key is required.");
    }

    if (!variable.label.trim()) {
      errors.push(`Print variable ${variable.key} requires a label.`);
    }

    if (variable.kind === "line-items" && !variable.repeatable) {
      errors.push(`Print variable ${variable.key} must be repeatable for line items.`);
    }

    if (variable.format === "currency" && variable.valueType !== "currency" && variable.valueType !== "number") {
      errors.push(`Print variable ${variable.key} must be numeric for currency formatting.`);
    }
  }

  return toValidationResult(errors);
}

export function validatePrintBrandingContext(branding: PrintBrandingContext): PrintValidationResult {
  const errors: string[] = [];

  if (!branding.tenantId.trim()) {
    errors.push("Print branding context requires a tenant.");
  }

  if (!branding.locale.trim()) {
    errors.push("Print branding context requires a locale.");
  }

  if (!branding.colors.primary.trim()) {
    errors.push("Print branding context requires a primary color token.");
  }

  if (!branding.fonts.primary.trim()) {
    errors.push("Print branding context requires a primary font token.");
  }

  return toValidationResult(errors);
}

export function createPrintTemplateRegistry(templates: readonly PrintTemplate[] = []): PrintRegistry {
  return {
    templates: dedupeByKey(templates),
  };
}

export function registerPrintTemplate(registry: PrintRegistry, template: PrintTemplate): PrintRegistry {
  definePrintTemplate(template);

  return createPrintTemplateRegistry([
    ...registry.templates.filter((candidate) => candidate.key !== template.key),
    template,
  ]);
}

export function listPrintTemplates(
  registry: PrintRegistry,
  filters: Readonly<{
    type?: PrintTemplateType;
    appKey?: string;
    providerSource?: PrintTemplateProviderSource;
  }> = {},
): readonly PrintTemplate[] {
  return registry.templates.filter((template) =>
    (!filters.type || template.type === filters.type)
    && (!filters.appKey || template.appKey === filters.appKey)
    && (!filters.providerSource || template.providerSource === filters.providerSource),
  );
}

export function discoverPrintTemplates(registry: PrintRegistry, context: PrintContext): readonly PrintTemplate[] {
  return registry.templates.filter((template) => canAccessPrintTemplate(template, context));
}

export function canAccessPrintTemplate(template: PrintTemplate, context: PrintContext): boolean {
  const requiredPermissions = collectTemplatePermissions(template);
  const hasPermissions = requiredPermissions.every((permission) => context.grantedPermissions?.has(permission));
  const requiredDataScopes = template.security.requiredDataScopes ?? [];
  const hasDataScopes = requiredDataScopes.every((scope) => context.dataScopeKeys?.has(scope));

  return hasPermissions
    && hasDataScopes
    && (!template.security.tenantAware || Boolean(context.tenantId))
    && (!template.security.companyAware || Boolean(context.companyId))
    && (!template.security.branchAware || Boolean(context.branchId));
}

export function createPrintBrandingContext(input: Readonly<{
  context: PrintContext;
  branding?: CompanyBranding;
  colors?: Partial<PrintBrandingContext["colors"]>;
  fonts?: Partial<PrintBrandingContext["fonts"]>;
}>): PrintBrandingContext {
  return {
    appKey: input.branding?.appKey ?? input.context.originatingApp,
    branchId: input.branding?.branchId ?? input.context.branchId,
    colors: {
      primary: input.colors?.primary ?? input.branding?.primaryColorToken ?? "brand.primary",
      secondary: input.colors?.secondary,
      accent: input.colors?.accent,
      background: input.colors?.background,
      border: input.colors?.border,
      mutedText: input.colors?.mutedText,
      text: input.colors?.text,
    },
    companyBranding: input.branding
      ? {
        displayName: input.branding.displayName,
        documentFooterText: input.branding.documentFooterText,
        documentHeaderText: input.branding.documentHeaderText,
        legalName: input.branding.legalName,
        logoFileId: input.branding.logoFileId,
        primaryColorToken: input.branding.primaryColorToken,
      }
      : undefined,
    companyId: input.branding?.companyId ?? input.context.companyId,
    currency: input.context.currency,
    direction: input.context.direction,
    fonts: {
      mono: input.fonts?.mono,
      primary: input.fonts?.primary ?? "font.sans",
      secondary: input.fonts?.secondary,
    },
    locale: input.context.locale,
    logo: input.branding?.logoFileId
      ? {
        fileId: input.branding.logoFileId,
      }
      : undefined,
    tenantId: input.branding?.tenantId ?? input.context.tenantId,
    timezone: input.context.timezone,
  };
}

export function createPrintPreviewContract(input: Omit<PrintTemplatePreview, "format"> & Readonly<{
  format?: PrintTemplatePreview["format"];
}>): PrintTemplatePreview {
  return {
    ...input,
    format: input.format ?? "preview",
  };
}

export function createPrintOutput(
  templateKey: string,
  version: number,
  format: PrintFormat,
  options: Omit<PrintOutput, "templateKey" | "version" | "format" | "contentType" | "status"> & Readonly<{
    contentType?: string;
    status?: PrintOutputStatus;
  }> = {},
): PrintOutput {
  return {
    ...options,
    contentType: options.contentType ?? contentTypeForPrintFormat(format),
    format,
    status: options.status ?? "ready",
    templateKey,
    version,
  };
}

export function shouldRenderPrintAsync(
  template: PrintTemplate,
  format: PrintFormat,
  context: PrintContext,
): boolean {
  return format === "pdf"
    || context.preferAsync === true
    || template.metadata.asyncRecommended === true
    || Boolean(template.metadata.estimatedPages && template.metadata.estimatedPages > 20);
}

export function createPrintJobReadinessContract(
  template: PrintTemplate,
  format: PrintFormat,
): PrintRenderJobReadiness {
  return {
    format,
    idempotencyKeyParts: ["tenantId", "companyId", "templateKey", "version", "format", "entityRef"],
    integration: "print-generation",
    jobKey: `print.${template.key}.${format}`,
    requiresBackgroundExecution: true,
    templateKey: template.key,
  };
}

export function createPrintReportIntegrationContract(
  reportKey: string,
  templateKey: string,
  supportedFormats: readonly Extract<PrintFormat, "html" | "pdf" | "json">[] = ["html", "pdf"],
): PrintReportIntegrationContract {
  return {
    reportKey,
    requiresPrintPermission: true,
    requiresReportPermission: true,
    supportedFormats,
    templateKey,
  };
}

export function createPrintSecurityMetadata(
  template: PrintTemplate,
  context: PrintContext,
): Readonly<{
  templateKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  dataScopes: readonly string[];
  sensitivity: PrintSensitivity;
  sensitiveData: boolean;
  auditRequired: boolean;
}> {
  return {
    auditRequired: template.security.auditRequired,
    branchId: context.branchId,
    companyId: context.companyId,
    dataScopes: template.security.requiredDataScopes ?? [],
    requiredPermissions: collectTemplatePermissions(template).map(String),
    sensitiveData: template.security.sensitiveData,
    sensitivity: template.security.sensitivity,
    templateKey: template.key,
    tenantId: context.tenantId,
  };
}

export function createPrintAuditMetadata(
  output: PrintOutput,
  context: PrintContext,
  durationMs: number,
): Readonly<{
  action: AuditAction;
  templateKey: string;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  durationMs: number;
  format: PrintFormat;
  status: PrintOutputStatus;
  originatingApp?: string | null;
}> {
  return {
    action: `print.${output.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    durationMs,
    format: output.format,
    originatingApp: context.originatingApp,
    principalId: context.principalId,
    status: output.status,
    templateKey: output.templateKey,
    tenantId: context.tenantId,
  };
}

function isLegacyPrintTemplateDefinition(
  template: PrintTemplate | PrintTemplateDefinition,
): template is PrintTemplateDefinition {
  return "version" in template && "mode" in template;
}

function validateDesignerSchema(schema: PrintTemplateDesignerSchema): PrintValidationResult {
  const errors: string[] = [];

  if (schema.sections.length === 0) {
    errors.push("Print template designer schema requires at least one section.");
  }

  for (const duplicate of findDuplicates(schema.bindings.map((binding) => binding.key))) {
    errors.push(`Duplicate print binding: ${duplicate}`);
  }

  return toValidationResult(errors);
}

function collectTemplatePermissions(template: PrintTemplate): readonly (PermissionKey | string)[] {
  return [...new Set([
    template.requiredPermission,
    ...(template.requiredPermissions ?? []),
    ...template.security.requiredPermissions,
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function flattenBlocks(blocks: readonly PrintTemplateBlock[]): readonly PrintTemplateBlock[] {
  return blocks.flatMap((block) => [block, ...flattenBlocks(block.children ?? [])]);
}

function contentTypeForPrintFormat(format: PrintFormat): string {
  return {
    html: "text/html",
    json: "application/vnd.nexora.print+json",
    pdf: "application/pdf",
    preview: "application/vnd.nexora.print-preview+json",
  }[format];
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

function toValidationResult(errors: readonly string[]): PrintValidationResult {
  return {
    errors,
    valid: errors.length === 0,
  };
}
