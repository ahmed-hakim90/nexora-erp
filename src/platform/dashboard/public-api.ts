import type { AccessExperience, ActorType } from "@/core/context";
import type { AuditAction } from "@/platform/audit/public-api";
import type { JobReadinessIntegration } from "@/platform/background-jobs/public-api";
import type { PlatformEventName } from "@/platform/events/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import type { ReportFormat } from "@/platform/reporting/public-api";
import type { SearchResultType } from "@/platform/search/public-api";

export type DashboardProviderSource = "platform-engine" | "business-app" | "marketplace-extension";

export type DashboardWidgetSize = "small" | "medium" | "large" | "wide";

export type DashboardWidgetType =
  | "kpi-card"
  | "metric-card"
  | "chart"
  | "table"
  | "list"
  | "timeline"
  | "calendar"
  | "progress"
  | "funnel"
  | "heatmap"
  | "map"
  | "report-widget"
  | "search-widget"
  | "document-widget"
  | "notification-widget"
  | "activity-widget"
  | "custom-widget";

export type DashboardTemplateKind =
  | "finance"
  | "hr"
  | "manufacturing"
  | "inventory"
  | "sales"
  | "executive"
  | "custom";

export type DashboardDataSourceType =
  | "reporting-engine"
  | "repository"
  | "search-engine"
  | "external-api"
  | "background-job-snapshot"
  | "cached-snapshot";

export type DashboardRefreshKind =
  | "manual"
  | "interval"
  | "event-driven"
  | "background-snapshot"
  | "cached-snapshot";

export type DashboardScope = "user" | "team" | "company" | "default" | "shared";

export type DashboardResultStatus = "ready" | "queued" | "failed" | "stale";

export type KpiAggregation =
  | "sum"
  | "average"
  | "count"
  | "min"
  | "max"
  | "median"
  | "ratio"
  | "custom";

export type KpiTrendDirection = "up" | "down" | "flat" | "unknown";

export type KpiThresholdSeverity = "info" | "success" | "warning" | "critical";

export type DashboardFilterOperator =
  | "equals"
  | "contains"
  | "between"
  | "gte"
  | "lte"
  | "in";

export type DashboardParameterType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "date-range"
  | "lookup"
  | "multi-select"
  | "custom";

export type DashboardDrilldown = Readonly<{
  label: string;
  href?: string;
  commandKey?: string;
  reportKey?: string;
  dashboardKey?: string;
}>;

export type DashboardSecurityMetadata = Readonly<{
  requiredPermissions: readonly (PermissionKey | string)[];
  tenantAware: boolean;
  companyAware: boolean;
  branchAware: boolean;
  experienceAware: boolean;
  requiredExperiences?: readonly AccessExperience[];
  requiredDataScopes?: readonly string[];
  sensitivity: "public" | "internal" | "sensitive" | "restricted";
  auditRequired: boolean;
}>;

export type DashboardDataSource = Readonly<{
  key: string;
  label: string;
  type: DashboardDataSourceType;
  sourceKey: string;
  providerSource?: DashboardProviderSource;
  supportsSync: boolean;
  supportsAsync: boolean;
  supportsSnapshot: boolean;
  maxSyncRows?: number;
  requiredPermission?: PermissionKey | string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DashboardRefreshPolicy = Readonly<{
  kind: DashboardRefreshKind;
  intervalSeconds?: number;
  eventNames?: readonly PlatformEventName[];
  jobKey?: string;
  cacheKey?: string;
  ttlSeconds?: number;
  staleWhileRevalidate?: boolean;
}>;

export type DashboardEventTrigger = Readonly<{
  eventName: PlatformEventName;
  refreshPolicyKey?: string;
  widgetKeys?: readonly string[];
  dataSourceKeys?: readonly string[];
  debounceSeconds?: number;
}>;

export type DashboardReportIntegration = Readonly<{
  reportKey: string;
  supportedFormats: readonly ReportFormat[];
  requiresReportPermission: boolean;
}>;

export type DashboardSearchIntegration = Readonly<{
  providerKey?: string;
  resultTypes?: readonly SearchResultType[];
  queryTemplate?: string;
  requiresSearchPermission: boolean;
}>;

export type DashboardBackgroundJobIntegration = Readonly<{
  jobKey: string;
  snapshotKey?: string;
  integration: Extract<JobReadinessIntegration, "report-generation" | "search-indexing" | "print-generation" | "automation" | "ai-task" | "cost-recalculation"> | "dashboard-snapshot";
  requiresBackgroundExecution: true;
}>;

export type KpiFormula = Readonly<{
  expression: string;
  variableKeys: readonly string[];
  description?: string;
}>;

export type KpiTarget = Readonly<{
  value: number;
  comparison: "gte" | "lte" | "equals";
  label?: string;
}>;

export type KpiThreshold = Readonly<{
  key: string;
  severity: KpiThresholdSeverity;
  min?: number;
  max?: number;
  colorToken?: string;
  label?: string;
}>;

export type KpiTrend = Readonly<{
  direction: KpiTrendDirection;
  periodKey?: string;
  comparisonLabel?: string;
}>;

export type KpiUnit = Readonly<{
  kind: "number" | "currency" | "percent" | "duration" | "quantity" | "custom";
  symbol?: string;
  currency?: string;
  precision?: number;
}>;

export type KpiDefinition = Readonly<{
  key: string;
  appKey: string;
  label: string;
  description?: string;
  formula: KpiFormula;
  aggregation: KpiAggregation;
  unit: KpiUnit;
  dataSource: DashboardDataSource;
  refreshPolicy: DashboardRefreshPolicy;
  target?: KpiTarget;
  thresholds?: readonly KpiThreshold[];
  trend?: KpiTrend;
  security?: DashboardSecurityMetadata;
}>;

export type DashboardWidget = Readonly<{
  key: string;
  appKey: string;
  label: string;
  type: DashboardWidgetType;
  description?: string;
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  defaultSize: DashboardWidgetSize;
  dataSource?: DashboardDataSource;
  kpiKey?: string;
  kpi?: KpiDefinition;
  refreshPolicy?: DashboardRefreshPolicy;
  reportIntegration?: DashboardReportIntegration;
  searchIntegration?: DashboardSearchIntegration;
  backgroundJobIntegration?: DashboardBackgroundJobIntegration;
  eventTriggers?: readonly DashboardEventTrigger[];
  supportedExperiences?: readonly AccessExperience[];
  drilldowns?: readonly DashboardDrilldown[];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WidgetDefinition = DashboardWidget;

export type DashboardGridBreakpoint = "desktop" | "tablet" | "mobile";

export type DashboardWidgetPosition = Readonly<{
  widgetKey: string;
  breakpoint: DashboardGridBreakpoint;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden?: boolean;
  pinned?: boolean;
}>;

export type DashboardResponsiveGrid = Readonly<{
  columns: Readonly<Record<DashboardGridBreakpoint, number>>;
  rowHeight: number;
  gap: number;
}>;

export type DashboardSection = Readonly<{
  key: string;
  label: string;
  widgetKeys: readonly string[];
  collapsedByDefault?: boolean;
  order: number;
}>;

export type DashboardPage = Readonly<{
  key: string;
  label: string;
  sections: readonly DashboardSection[];
  order: number;
  default?: boolean;
}>;

export type DashboardLayout = Readonly<{
  responsiveGrid: DashboardResponsiveGrid;
  pages: readonly DashboardPage[];
  positions: readonly DashboardWidgetPosition[];
  hiddenWidgetKeys?: readonly string[];
  pinnedWidgetKeys?: readonly string[];
}>;

export type DashboardFilter = Readonly<{
  key: string;
  label: string;
  fieldKey?: string;
  operator?: DashboardFilterOperator;
  value?: unknown;
  defaultValue?: unknown;
  required?: boolean;
}>;

export type DashboardParameter = Readonly<{
  key: string;
  label: string;
  type: DashboardParameterType;
  required: boolean;
  defaultValue?: unknown;
  lookupProviderKey?: string;
  options?: readonly { label: string; value: string }[];
}>;

export type DashboardPreference = Readonly<{
  key: string;
  dashboardKey: string;
  scope: DashboardScope;
  userId?: string | null;
  teamId?: string | null;
  companyId?: string | null;
  favorite?: boolean;
  sharedWithUserIds?: readonly string[];
  sharedWithTeamIds?: readonly string[];
  widgetPreferences?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  savedFilters?: readonly DashboardFilter[];
  hiddenWidgetKeys?: readonly string[];
  pinnedWidgetKeys?: readonly string[];
}>;

export type DashboardBuilderSchema = Readonly<{
  allowedWidgetKeys: readonly string[];
  filters: readonly DashboardFilter[];
  parameters?: readonly DashboardParameter[];
  supportsMobileLayout: boolean;
  maxWidgets: number;
}>;

export type DashboardTemplate = Readonly<{
  key: string;
  label: string;
  kind: DashboardTemplateKind;
  appKey: string;
  providerSource: DashboardProviderSource;
  templateOnly: true;
  widgetKeys: readonly string[];
  defaultLayout: DashboardLayout;
  supportedExperiences: readonly AccessExperience[];
  requiredPermission?: PermissionKey | string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DashboardDefinition = Readonly<{
  key: string;
  label: string;
  appKey: string;
  experience: AccessExperience;
  providerSource: DashboardProviderSource;
  requiredPermission?: PermissionKey | string;
  requiredPermissions?: readonly (PermissionKey | string)[];
  security: DashboardSecurityMetadata;
  widgets: readonly DashboardWidget[];
  dataSources?: readonly DashboardDataSource[];
  filters?: readonly DashboardFilter[];
  parameters?: readonly DashboardParameter[];
  preferences?: readonly DashboardPreference[];
  templates?: readonly DashboardTemplate[];
  eventTriggers?: readonly DashboardEventTrigger[];
  builderSchema: DashboardBuilderSchema;
  layout: DashboardLayout;
}>;

export type DashboardExecutionContext = Readonly<{
  correlationId: string;
  requestId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience: AccessExperience;
  actorType?: ActorType | null;
  actorId?: string | null;
  principalId?: string | null;
  userId?: string | null;
  locale?: string;
  timezone?: string;
  originatingApp?: string | null;
  grantedPermissions?: ReadonlySet<PermissionKey | string>;
  dataScopeKeys?: ReadonlySet<string>;
  preferAsync?: boolean;
}>;

export type DashboardWidgetResult = Readonly<{
  widgetKey: string;
  status: DashboardResultStatus;
  data?: unknown;
  errorMessage?: string;
  refreshedAt?: string;
  jobKey?: string;
}>;

export type DashboardResult<TData = unknown> = Readonly<{
  dashboardKey: string;
  status: DashboardResultStatus;
  widgets: readonly DashboardWidgetResult[];
  data?: TData;
  jobKey?: string;
  generatedAt?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type DashboardRegistry = Readonly<{
  dashboards: readonly DashboardDefinition[];
}>;

export type DashboardWidgetRegistry = Readonly<{
  widgets: readonly DashboardWidget[];
}>;

export type KpiRegistry = Readonly<{
  kpis: readonly KpiDefinition[];
}>;

export type DashboardTemplateRegistry = Readonly<{
  templates: readonly DashboardTemplate[];
}>;

export type DashboardValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

export function defineDashboardWidget<TWidget extends DashboardWidget>(
  widget: TWidget,
): TWidget {
  const validation = validateDashboardWidget(widget);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return widget;
}

export function defineKpi<TKpi extends KpiDefinition>(kpi: TKpi): TKpi {
  const validation = validateKpiDefinition(kpi);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return kpi;
}

export function defineDashboardTemplate<TTemplate extends DashboardTemplate>(
  template: TTemplate,
): TTemplate {
  const validation = validateDashboardTemplate(template);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return template;
}

export function defineDashboard<TDashboard extends DashboardDefinition>(
  dashboard: TDashboard,
): TDashboard {
  const validation = validateDashboardDefinition(dashboard);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return dashboard;
}

export function validateDashboardWidget(widget: DashboardWidget): DashboardValidationResult {
  const errors: string[] = [];

  if (!widget.key.trim()) {
    errors.push("Dashboard widget key is required.");
  }

  if (!widget.appKey.trim()) {
    errors.push("Dashboard widget app key is required.");
  }

  if (!widget.label.trim()) {
    errors.push("Dashboard widget label is required.");
  }

  if (collectWidgetPermissions(widget).length === 0) {
    errors.push("Dashboard widget requires at least one permission.");
  }

  if (widget.type === "kpi-card" && !widget.kpiKey && !widget.kpi) {
    errors.push("KPI card widgets require a KPI key or KPI definition.");
  }

  if (widget.type === "report-widget" && !widget.reportIntegration) {
    errors.push("Report widgets require a report integration contract.");
  }

  if (widget.type === "search-widget" && !widget.searchIntegration) {
    errors.push("Search widgets require a search integration contract.");
  }

  if (widget.refreshPolicy) {
    errors.push(...validateDashboardRefreshPolicy(widget.refreshPolicy).errors);
  }

  if (widget.kpi) {
    errors.push(...validateKpiDefinition(widget.kpi).errors);
  }

  return toValidationResult(errors);
}

export function validateKpiDefinition(kpi: KpiDefinition): DashboardValidationResult {
  const errors: string[] = [];

  if (!kpi.key.trim()) {
    errors.push("KPI key is required.");
  }

  if (!kpi.appKey.trim()) {
    errors.push("KPI app key is required.");
  }

  if (!kpi.label.trim()) {
    errors.push("KPI label is required.");
  }

  if (!kpi.formula.expression.trim()) {
    errors.push("KPI formula expression is required.");
  }

  if (kpi.formula.variableKeys.length === 0) {
    errors.push("KPI formula requires at least one variable.");
  }

  if (!kpi.dataSource.key.trim()) {
    errors.push("KPI data source key is required.");
  }

  errors.push(...validateDashboardRefreshPolicy(kpi.refreshPolicy).errors);

  for (const duplicate of findDuplicates((kpi.thresholds ?? []).map((threshold) => threshold.key))) {
    errors.push(`Duplicate KPI threshold: ${duplicate}`);
  }

  return toValidationResult(errors);
}

export function validateDashboardLayout(layout: DashboardLayout): DashboardValidationResult {
  const errors: string[] = [];

  if (layout.pages.length === 0) {
    errors.push("Dashboard layout requires at least one page.");
  }

  if (layout.positions.length === 0) {
    errors.push("Dashboard layout requires at least one widget position.");
  }

  if (layout.responsiveGrid.columns.desktop < 1 || layout.responsiveGrid.columns.tablet < 1 || layout.responsiveGrid.columns.mobile < 1) {
    errors.push("Dashboard responsive grid requires columns for desktop, tablet, and mobile.");
  }

  for (const duplicate of findDuplicates(layout.pages.map((page) => page.key))) {
    errors.push(`Duplicate dashboard page: ${duplicate}`);
  }

  for (const duplicate of findDuplicates(layout.pages.flatMap((page) => page.sections.map((section) => section.key)))) {
    errors.push(`Duplicate dashboard section: ${duplicate}`);
  }

  const positionKeys = layout.positions.map((position) => `${position.widgetKey}:${position.breakpoint}`);
  for (const duplicate of findDuplicates(positionKeys)) {
    errors.push(`Duplicate dashboard widget position: ${duplicate}`);
  }

  for (const position of layout.positions) {
    if (position.x < 0 || position.y < 0 || position.width < 1 || position.height < 1) {
      errors.push(`Dashboard widget position ${position.widgetKey} has invalid coordinates or size.`);
    }
  }

  return toValidationResult(errors);
}

export function validateDashboardRefreshPolicy(policy: DashboardRefreshPolicy): DashboardValidationResult {
  const errors: string[] = [];

  if (policy.kind === "interval" && (policy.intervalSeconds ?? 0) < 1) {
    errors.push("Interval dashboard refresh policies require intervalSeconds of at least 1.");
  }

  if (policy.kind === "event-driven" && (!policy.eventNames || policy.eventNames.length === 0)) {
    errors.push("Event-driven dashboard refresh policies require at least one event.");
  }

  if (policy.kind === "background-snapshot" && !policy.jobKey) {
    errors.push("Background snapshot refresh policies require a job key.");
  }

  if (policy.kind === "cached-snapshot" && !policy.cacheKey) {
    errors.push("Cached snapshot refresh policies require a cache key.");
  }

  if (policy.ttlSeconds !== undefined && policy.ttlSeconds < 1) {
    errors.push("Dashboard refresh policy ttlSeconds must be at least 1.");
  }

  return toValidationResult(errors);
}

export function validateDashboardTemplate(template: DashboardTemplate): DashboardValidationResult {
  const errors: string[] = [];

  if (!template.key.trim()) {
    errors.push("Dashboard template key is required.");
  }

  if (!template.label.trim()) {
    errors.push("Dashboard template label is required.");
  }

  if (!template.appKey.trim()) {
    errors.push("Dashboard template app key is required.");
  }

  if (template.widgetKeys.length === 0) {
    errors.push("Dashboard template requires at least one widget key.");
  }

  if (template.supportedExperiences.length === 0) {
    errors.push("Dashboard template requires at least one supported experience.");
  }

  errors.push(...validateDashboardLayout(template.defaultLayout).errors);

  return toValidationResult(errors);
}

export function validateDashboardDefinition(dashboard: DashboardDefinition): DashboardValidationResult {
  const errors: string[] = [];

  if (!dashboard.key.trim()) {
    errors.push("Dashboard key is required.");
  }

  if (!dashboard.label.trim()) {
    errors.push("Dashboard label is required.");
  }

  if (!dashboard.appKey.trim()) {
    errors.push("Dashboard app key is required.");
  }

  if (collectDashboardPermissions(dashboard).length === 0) {
    errors.push("Dashboard requires at least one permission.");
  }

  if (dashboard.widgets.length === 0) {
    errors.push("Dashboard requires at least one widget.");
  }

  for (const duplicate of findDuplicates(dashboard.widgets.map((widget) => widget.key))) {
    errors.push(`Duplicate dashboard widget: ${duplicate}`);
  }

  for (const duplicate of findDuplicates((dashboard.dataSources ?? []).map((source) => source.key))) {
    errors.push(`Duplicate dashboard data source: ${duplicate}`);
  }

  for (const duplicate of findDuplicates((dashboard.parameters ?? []).map((parameter) => parameter.key))) {
    errors.push(`Duplicate dashboard parameter: ${duplicate}`);
  }

  if (dashboard.widgets.length > dashboard.builderSchema.maxWidgets) {
    errors.push("Dashboard exceeds the configured maximum widget count.");
  }

  for (const widget of dashboard.widgets) {
    errors.push(...validateDashboardWidget(widget).errors);
  }

  errors.push(...validateDashboardLayout(dashboard.layout).errors);

  const allowedWidgetKeys = new Set(dashboard.builderSchema.allowedWidgetKeys);
  const registeredWidgetKeys = new Set(dashboard.widgets.map((widget) => widget.key));
  const positionedWidgetKeys = new Set(dashboard.layout.positions.map((position) => position.widgetKey));
  const sectionWidgetKeys = new Set(dashboard.layout.pages.flatMap((page) => page.sections.flatMap((section) => section.widgetKeys)));

  for (const widgetKey of positionedWidgetKeys) {
    if (!registeredWidgetKeys.has(widgetKey)) {
      errors.push(`Dashboard layout references unknown widget ${widgetKey}.`);
    }

    if (!allowedWidgetKeys.has(widgetKey)) {
      errors.push(`Dashboard layout references disallowed widget ${widgetKey}.`);
    }
  }

  for (const widgetKey of sectionWidgetKeys) {
    if (!registeredWidgetKeys.has(widgetKey)) {
      errors.push(`Dashboard section references unknown widget ${widgetKey}.`);
    }
  }

  return toValidationResult(errors);
}

export function createDashboardRegistry(dashboards: readonly DashboardDefinition[] = []): DashboardRegistry {
  return {
    dashboards: dedupeByKey(dashboards),
  };
}

export function registerDashboard(registry: DashboardRegistry, dashboard: DashboardDefinition): DashboardRegistry {
  defineDashboard(dashboard);

  return createDashboardRegistry([
    ...registry.dashboards.filter((candidate) => candidate.key !== dashboard.key),
    dashboard,
  ]);
}

export function createDashboardWidgetRegistry(widgets: readonly DashboardWidget[] = []): DashboardWidgetRegistry {
  return {
    widgets: dedupeByKey(widgets),
  };
}

export function registerDashboardWidget(registry: DashboardWidgetRegistry, widget: DashboardWidget): DashboardWidgetRegistry {
  defineDashboardWidget(widget);

  return createDashboardWidgetRegistry([
    ...registry.widgets.filter((candidate) => candidate.key !== widget.key),
    widget,
  ]);
}

export function createKpiRegistry(kpis: readonly KpiDefinition[] = []): KpiRegistry {
  return {
    kpis: dedupeByKey(kpis),
  };
}

export function registerKpi(registry: KpiRegistry, kpi: KpiDefinition): KpiRegistry {
  defineKpi(kpi);

  return createKpiRegistry([
    ...registry.kpis.filter((candidate) => candidate.key !== kpi.key),
    kpi,
  ]);
}

export function createDashboardTemplateRegistry(
  templates: readonly DashboardTemplate[] = [],
): DashboardTemplateRegistry {
  return {
    templates: dedupeByKey(templates),
  };
}

export function registerDashboardTemplate(
  registry: DashboardTemplateRegistry,
  template: DashboardTemplate,
): DashboardTemplateRegistry {
  defineDashboardTemplate(template);

  return createDashboardTemplateRegistry([
    ...registry.templates.filter((candidate) => candidate.key !== template.key),
    template,
  ]);
}

export function discoverDashboards(
  registry: DashboardRegistry,
  context: DashboardExecutionContext,
): readonly DashboardDefinition[] {
  return registry.dashboards.filter((dashboard) => canAccessDashboard(dashboard, context));
}

export function canAccessDashboard(dashboard: DashboardDefinition, context: DashboardExecutionContext): boolean {
  const requiredPermissions = collectDashboardPermissions(dashboard);
  const hasPermissions = requiredPermissions.every((permission) => context.grantedPermissions?.has(permission));
  const requiredDataScopes = dashboard.security.requiredDataScopes ?? [];
  const hasDataScopes = requiredDataScopes.every((scope) => context.dataScopeKeys?.has(scope));
  const requiredExperiences = dashboard.security.requiredExperiences ?? [dashboard.experience];
  const hasExperience = !dashboard.security.experienceAware || requiredExperiences.includes(context.experience);

  return hasPermissions
    && hasDataScopes
    && hasExperience
    && (!dashboard.security.tenantAware || Boolean(context.tenantId))
    && (!dashboard.security.companyAware || Boolean(context.companyId))
    && (!dashboard.security.branchAware || Boolean(context.branchId));
}

export function createDashboardPreference(
  preference: DashboardPreference,
): DashboardPreference {
  if (!preference.key.trim()) {
    throw new Error("Dashboard preference key is required.");
  }

  if (!preference.dashboardKey.trim()) {
    throw new Error("Dashboard preference dashboard key is required.");
  }

  return preference;
}

export function createDashboardResult<TData>(
  dashboardKey: string,
  status: DashboardResultStatus,
  widgets: readonly DashboardWidgetResult[],
  options: Omit<DashboardResult<TData>, "dashboardKey" | "status" | "widgets"> = {},
): DashboardResult<TData> {
  return {
    ...options,
    dashboardKey,
    status,
    widgets,
  };
}

export function shouldRefreshDashboardAsync(
  dashboard: DashboardDefinition,
  context: DashboardExecutionContext,
): boolean {
  return context.preferAsync === true
    || dashboard.widgets.some((widget) => widget.refreshPolicy?.kind === "background-snapshot")
    || dashboard.widgets.some((widget) => widget.dataSource?.supportsAsync && !widget.dataSource.supportsSync);
}

export function createDashboardJobReadinessContract(
  dashboard: DashboardDefinition,
): Readonly<{
  integration: "dashboard-snapshot";
  jobKey: string;
  dashboardKey: string;
  requiresBackgroundExecution: true;
}> {
  return {
    dashboardKey: dashboard.key,
    integration: "dashboard-snapshot",
    jobKey: `dashboard.${dashboard.key}.snapshot`,
    requiresBackgroundExecution: true,
  };
}

export function createDashboardEventIntegrationContract(
  eventName: PlatformEventName,
  widgetKeys: readonly string[],
): DashboardEventTrigger {
  return {
    eventName,
    widgetKeys,
  };
}

export function createDashboardReportWidgetContract(
  reportKey: string,
  supportedFormats: readonly ReportFormat[] = ["table", "json"],
): DashboardReportIntegration {
  return {
    reportKey,
    requiresReportPermission: true,
    supportedFormats,
  };
}

export function createDashboardSearchWidgetContract(
  options: Omit<DashboardSearchIntegration, "requiresSearchPermission"> & Readonly<{
    requiresSearchPermission?: boolean;
}> = {},
): DashboardSearchIntegration {
  return {
    ...options,
    requiresSearchPermission: options.requiresSearchPermission ?? true,
  };
}

export function createDashboardSecurityMetadata(
  dashboard: DashboardDefinition,
  context: DashboardExecutionContext,
): Readonly<{
  dashboardKey: string;
  requiredPermissions: readonly string[];
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  experience: AccessExperience;
  dataScopes: readonly string[];
  sensitivity: DashboardSecurityMetadata["sensitivity"];
  auditRequired: boolean;
}> {
  return {
    auditRequired: dashboard.security.auditRequired,
    branchId: context.branchId,
    companyId: context.companyId,
    dashboardKey: dashboard.key,
    dataScopes: dashboard.security.requiredDataScopes ?? [],
    experience: context.experience,
    requiredPermissions: collectDashboardPermissions(dashboard).map(String),
    sensitivity: dashboard.security.sensitivity,
    tenantId: context.tenantId,
  };
}

export function createDashboardAuditMetadata(
  result: DashboardResult,
  context: DashboardExecutionContext,
  durationMs: number,
): Readonly<{
  action: AuditAction;
  dashboardKey: string;
  correlationId: string;
  actorId?: string | null;
  principalId?: string | null;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  durationMs: number;
  status: DashboardResultStatus;
  originatingApp?: string | null;
}> {
  return {
    action: `dashboard.${result.status}` as AuditAction,
    actorId: context.actorId,
    branchId: context.branchId,
    companyId: context.companyId,
    correlationId: context.correlationId,
    dashboardKey: result.dashboardKey,
    durationMs,
    originatingApp: context.originatingApp,
    principalId: context.principalId,
    status: result.status,
    tenantId: context.tenantId,
  };
}

function collectDashboardPermissions(dashboard: DashboardDefinition): readonly (PermissionKey | string)[] {
  return [...new Set([
    dashboard.requiredPermission,
    ...(dashboard.requiredPermissions ?? []),
    ...dashboard.security.requiredPermissions,
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
}

function collectWidgetPermissions(widget: DashboardWidget): readonly (PermissionKey | string)[] {
  return [...new Set([
    widget.requiredPermission,
    ...(widget.requiredPermissions ?? []),
  ].filter((permission): permission is PermissionKey | string => Boolean(permission)))];
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

function toValidationResult(errors: readonly string[]): DashboardValidationResult {
  return {
    errors,
    valid: errors.length === 0,
  };
}
