import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessDashboard,
  createDashboardAuditMetadata,
  createDashboardEventIntegrationContract,
  createDashboardJobReadinessContract,
  createDashboardPreference,
  createDashboardRegistry,
  createDashboardReportWidgetContract,
  createDashboardResult,
  createDashboardSearchWidgetContract,
  createDashboardSecurityMetadata,
  createDashboardTemplateRegistry,
  createDashboardWidgetRegistry,
  createKpiRegistry,
  defineDashboard,
  defineDashboardTemplate,
  defineDashboardWidget,
  defineKpi,
  definePermissionKey,
  definePlatformEventName,
  discoverDashboards,
  registerDashboard,
  registerDashboardTemplate,
  registerDashboardWidget,
  registerKpi,
  shouldRefreshDashboardAsync,
  validateDashboardDefinition,
  validateDashboardLayout,
  validateDashboardRefreshPolicy,
  validateDashboardTemplate,
  validateDashboardWidget,
  validateKpiDefinition,
  type DashboardDefinition,
  type DashboardExecutionContext,
  type DashboardLayout,
  type DashboardRefreshPolicy,
  type DashboardWidget,
  type KpiDefinition,
} from "@/platform/public-api";

const permission = definePermissionKey("platform.dashboard.view");
const widgetPermission = definePermissionKey("platform.dashboard.widget.view");
const reportPermission = definePermissionKey("platform.report.view");
const searchPermission = definePermissionKey("platform.search.execute");
const documentCreated = definePlatformEventName("DocumentCreated");
const workflowCompleted = definePlatformEventName("WorkflowCompleted");
const jobCompleted = definePlatformEventName("JobCompleted");

const repositoryDataSource = {
  key: "platform.dashboard.repository-source",
  label: "Repository Snapshot",
  maxSyncRows: 500,
  sourceKey: "platform.repository.snapshot",
  supportsAsync: true,
  supportsSnapshot: true,
  supportsSync: true,
  type: "repository",
} as const;

const reportDataSource = {
  key: "platform.dashboard.report-source",
  label: "Report Dataset",
  sourceKey: "platform.report.dataset",
  supportsAsync: true,
  supportsSnapshot: true,
  supportsSync: false,
  type: "reporting-engine",
} as const;

const searchDataSource = {
  key: "platform.dashboard.search-source",
  label: "Search Dataset",
  sourceKey: "platform.search.provider",
  supportsAsync: true,
  supportsSnapshot: false,
  supportsSync: true,
  type: "search-engine",
} as const;

const cachedSnapshotDataSource = {
  key: "platform.dashboard.cached-source",
  label: "Cached Snapshot",
  sourceKey: "dashboard.cache.snapshot",
  supportsAsync: false,
  supportsSnapshot: true,
  supportsSync: true,
  type: "cached-snapshot",
} as const;

const backgroundSnapshotDataSource = {
  key: "platform.dashboard.job-source",
  label: "Background Job Snapshot",
  sourceKey: "dashboard.job.snapshot",
  supportsAsync: true,
  supportsSnapshot: true,
  supportsSync: false,
  type: "background-job-snapshot",
} as const;

const externalApiDataSource = {
  key: "platform.dashboard.external-source",
  label: "External API",
  sourceKey: "external.metrics",
  supportsAsync: true,
  supportsSnapshot: false,
  supportsSync: false,
  type: "external-api",
} as const;

const kpi = defineKpi({
  aggregation: "sum",
  appKey: "platform",
  dataSource: repositoryDataSource,
  formula: {
    expression: "sum(total)",
    variableKeys: ["total"],
  },
  key: "platform.kpi.total",
  label: "Total KPI",
  refreshPolicy: {
    intervalSeconds: 300,
    kind: "interval",
  },
  target: {
    comparison: "gte",
    value: 100,
  },
  thresholds: [
    {
      key: "healthy",
      min: 100,
      severity: "success",
    },
    {
      key: "risk",
      max: 99,
      severity: "warning",
    },
  ],
  trend: {
    comparisonLabel: "Previous period",
    direction: "up",
    periodKey: "previous-period",
  },
  unit: {
    kind: "currency",
    currency: "SAR",
    precision: 2,
  },
} satisfies KpiDefinition);

const widgets: readonly DashboardWidget[] = [
  defineDashboardWidget({
    appKey: "platform",
    defaultSize: "small",
    key: "total-kpi",
    kpi,
    label: "Total KPI",
    refreshPolicy: {
      intervalSeconds: 300,
      kind: "interval",
    },
    requiredPermission: widgetPermission,
    type: "kpi-card",
  }),
  defineDashboardWidget({
    appKey: "platform",
    dataSource: reportDataSource,
    defaultSize: "wide",
    key: "report-table",
    label: "Report Table",
    reportIntegration: createDashboardReportWidgetContract("platform.report", ["table", "json"]),
    requiredPermission: reportPermission,
    type: "report-widget",
  }),
  defineDashboardWidget({
    appKey: "platform",
    dataSource: searchDataSource,
    defaultSize: "medium",
    key: "search-results",
    label: "Search Results",
    requiredPermission: searchPermission,
    searchIntegration: createDashboardSearchWidgetContract({
      providerKey: "platform.search",
      resultTypes: ["document", "report", "dashboard"],
    }),
    type: "search-widget",
  }),
  defineDashboardWidget({
    appKey: "platform",
    backgroundJobIntegration: {
      integration: "dashboard-snapshot",
      jobKey: "dashboard.platform.snapshot",
      requiresBackgroundExecution: true,
      snapshotKey: "platform.dashboard.snapshot",
    },
    dataSource: backgroundSnapshotDataSource,
    defaultSize: "medium",
    key: "job-snapshot",
    label: "Job Snapshot",
    refreshPolicy: {
      jobKey: "dashboard.platform.snapshot",
      kind: "background-snapshot",
    },
    requiredPermission: widgetPermission,
    type: "metric-card",
  }),
  defineDashboardWidget({
    appKey: "platform",
    defaultSize: "small",
    eventTriggers: [
      createDashboardEventIntegrationContract(documentCreated, ["activity"]),
    ],
    key: "activity",
    label: "Activity",
    refreshPolicy: {
      eventNames: [documentCreated, workflowCompleted],
      kind: "event-driven",
    },
    requiredPermission: widgetPermission,
    type: "activity-widget",
  }),
];

const layout: DashboardLayout = {
  hiddenWidgetKeys: ["job-snapshot"],
  pages: [
    {
      default: true,
      key: "overview",
      label: "Overview",
      order: 1,
      sections: [
        {
          key: "summary",
          label: "Summary",
          order: 1,
          widgetKeys: ["total-kpi", "report-table", "search-results", "job-snapshot", "activity"],
        },
      ],
    },
  ],
  pinnedWidgetKeys: ["total-kpi"],
  positions: [
    { breakpoint: "desktop", height: 2, pinned: true, widgetKey: "total-kpi", width: 3, x: 0, y: 0 },
    { breakpoint: "desktop", height: 4, widgetKey: "report-table", width: 6, x: 3, y: 0 },
    { breakpoint: "desktop", height: 4, widgetKey: "search-results", width: 3, x: 9, y: 0 },
    { breakpoint: "desktop", height: 2, hidden: true, widgetKey: "job-snapshot", width: 3, x: 0, y: 2 },
    { breakpoint: "desktop", height: 2, widgetKey: "activity", width: 3, x: 0, y: 4 },
    { breakpoint: "tablet", height: 2, pinned: true, widgetKey: "total-kpi", width: 4, x: 0, y: 0 },
    { breakpoint: "mobile", height: 2, pinned: true, widgetKey: "total-kpi", width: 2, x: 0, y: 0 },
  ],
  responsiveGrid: {
    columns: {
      desktop: 12,
      mobile: 2,
      tablet: 8,
    },
    gap: 16,
    rowHeight: 80,
  },
};

const template = defineDashboardTemplate({
  appKey: "platform",
  defaultLayout: layout,
  key: "platform.executive-template",
  kind: "executive",
  label: "Executive Dashboard Template",
  metadata: {
    examplesOnly: ["Finance Dashboard", "HR Dashboard", "Manufacturing Dashboard", "Inventory Dashboard", "Sales Dashboard"],
  },
  providerSource: "platform-engine",
  supportedExperiences: ["erp"],
  templateOnly: true,
  widgetKeys: widgets.map((widget) => widget.key),
});

const dashboard = defineDashboard({
  appKey: "platform",
  builderSchema: {
    allowedWidgetKeys: widgets.map((widget) => widget.key),
    filters: [
      {
        fieldKey: "period",
        key: "period",
        label: "Period",
        operator: "between",
        required: true,
      },
    ],
    maxWidgets: 12,
    parameters: [
      {
        key: "companyId",
        label: "Company",
        required: true,
        type: "lookup",
      },
    ],
    supportsMobileLayout: true,
  },
  dataSources: [
    repositoryDataSource,
    reportDataSource,
    searchDataSource,
    cachedSnapshotDataSource,
    backgroundSnapshotDataSource,
    externalApiDataSource,
  ],
  eventTriggers: [
    createDashboardEventIntegrationContract(documentCreated, ["activity"]),
    createDashboardEventIntegrationContract(workflowCompleted, ["activity", "total-kpi"]),
    createDashboardEventIntegrationContract(jobCompleted, ["job-snapshot"]),
  ],
  experience: "erp",
  filters: [
    {
      fieldKey: "period",
      key: "period",
      label: "Period",
      operator: "between",
      required: true,
    },
  ],
  key: "platform.analytics-overview",
  label: "Platform Analytics Overview",
  layout,
  parameters: [
    {
      key: "companyId",
      label: "Company",
      required: true,
      type: "lookup",
    },
  ],
  preferences: [
    createDashboardPreference({
      dashboardKey: "platform.analytics-overview",
      favorite: true,
      key: "user:user-1:platform.analytics-overview",
      pinnedWidgetKeys: ["total-kpi"],
      savedFilters: [
        {
          key: "period",
          label: "Period",
          value: { from: "2026-01-01", to: "2026-01-31" },
        },
      ],
      scope: "user",
      userId: "user-1",
      widgetPreferences: {
        "report-table": {
          pageSize: 25,
        },
      },
    }),
  ],
  providerSource: "platform-engine",
  requiredPermission: permission,
  security: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    experienceAware: true,
    requiredDataScopes: ["tenant", "company"],
    requiredExperiences: ["erp"],
    requiredPermissions: [permission],
    sensitivity: "internal",
    tenantAware: true,
  },
  templates: [template],
  widgets,
} satisfies DashboardDefinition);

const context: DashboardExecutionContext = {
  actorId: "user-1",
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:dashboard",
  dataScopeKeys: new Set(["tenant", "company"]),
  experience: "erp",
  grantedPermissions: new Set([permission, widgetPermission, reportPermission, searchPermission]),
  locale: "en-US",
  originatingApp: "platform",
  principalId: "principal-1",
  requestId: "request-1",
  tenantId: "tenant-1",
  timezone: "Asia/Riyadh",
  userId: "user-1",
};

test("dashboard registration validates and discovers permission-aware dashboards", () => {
  const registry = registerDashboard(createDashboardRegistry(), dashboard);

  assert.deepEqual(registry.dashboards.map((item) => item.key), ["platform.analytics-overview"]);
  assert.deepEqual(discoverDashboards(registry, context).map((item) => item.key), ["platform.analytics-overview"]);
  assert.equal(canAccessDashboard(dashboard, context), true);
  assert.equal(canAccessDashboard(dashboard, { ...context, grantedPermissions: new Set() }), false);
  assert.equal(canAccessDashboard(dashboard, { ...context, companyId: null }), false);
  assert.equal(canAccessDashboard(dashboard, { ...context, experience: "portal" }), false);
});

test("widget registration supports all future widget types without rendering", () => {
  const widgetTypes = [
    "chart",
    "table",
    "list",
    "timeline",
    "calendar",
    "progress",
    "funnel",
    "heatmap",
    "map",
    "document-widget",
    "notification-widget",
    "custom-widget",
  ] as const;
  const registry = widgetTypes.reduce(
    (current, type) => registerDashboardWidget(current, defineDashboardWidget({
      appKey: "platform",
      defaultSize: "medium",
      key: `widget.${type}`,
      label: type,
      requiredPermission: widgetPermission,
      type,
    })),
    createDashboardWidgetRegistry(widgets),
  );

  assert.equal(registry.widgets.length, widgets.length + widgetTypes.length);
  assert.deepEqual(validateDashboardWidget({
    appKey: "",
    defaultSize: "small",
    key: "",
    label: "",
    type: "report-widget",
  }), {
    errors: [
      "Dashboard widget key is required.",
      "Dashboard widget app key is required.",
      "Dashboard widget label is required.",
      "Dashboard widget requires at least one permission.",
      "Report widgets require a report integration contract.",
    ],
    valid: false,
  });
  assert.deepEqual(validateDashboardWidget({
    appKey: "platform",
    defaultSize: "small",
    key: "bad-kpi",
    label: "Bad KPI",
    requiredPermission: widgetPermission,
    type: "kpi-card",
  }), {
    errors: ["KPI card widgets require a KPI key or KPI definition."],
    valid: false,
  });
});

test("layout validation supports responsive grids, breakpoints, positions, hidden widgets, and pinned widgets", () => {
  assert.deepEqual(validateDashboardLayout(layout), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateDashboardLayout({
    pages: [
      { key: "overview", label: "Overview", order: 1, sections: [{ key: "summary", label: "Summary", order: 1, widgetKeys: ["a"] }] },
      { key: "overview", label: "Duplicate", order: 2, sections: [{ key: "summary", label: "Summary", order: 1, widgetKeys: ["b"] }] },
    ],
    positions: [
      { breakpoint: "desktop", height: 0, widgetKey: "a", width: 1, x: 0, y: 0 },
      { breakpoint: "desktop", height: 1, widgetKey: "a", width: 1, x: 1, y: 1 },
    ],
    responsiveGrid: {
      columns: { desktop: 0, mobile: 1, tablet: 1 },
      gap: 16,
      rowHeight: 80,
    },
  }), {
    errors: [
      "Dashboard responsive grid requires columns for desktop, tablet, and mobile.",
      "Duplicate dashboard page: overview",
      "Duplicate dashboard section: summary",
      "Duplicate dashboard widget position: a:desktop",
      "Dashboard widget position a has invalid coordinates or size.",
    ],
    valid: false,
  });
});

test("KPI validation covers formula, target, threshold, trend, unit, aggregation, refresh policy, and data source contracts", () => {
  const registry = registerKpi(createKpiRegistry(), kpi);

  assert.deepEqual(registry.kpis.map((item) => item.key), ["platform.kpi.total"]);
  assert.deepEqual(validateKpiDefinition(kpi), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateKpiDefinition({
    aggregation: "sum",
    appKey: "",
    dataSource: { ...repositoryDataSource, key: "" },
    formula: {
      expression: "",
      variableKeys: [],
    },
    key: "",
    label: "",
    refreshPolicy: {
      intervalSeconds: 0,
      kind: "interval",
    },
    thresholds: [
      { key: "risk", severity: "warning" },
      { key: "risk", severity: "critical" },
    ],
    unit: {
      kind: "number",
    },
  }), {
    errors: [
      "KPI key is required.",
      "KPI app key is required.",
      "KPI label is required.",
      "KPI formula expression is required.",
      "KPI formula requires at least one variable.",
      "KPI data source key is required.",
      "Interval dashboard refresh policies require intervalSeconds of at least 1.",
      "Duplicate KPI threshold: risk",
    ],
    valid: false,
  });
});

test("dashboard templates are contract-only examples for future app dashboards", () => {
  const registry = registerDashboardTemplate(createDashboardTemplateRegistry(), template);

  assert.deepEqual(registry.templates.map((item) => item.key), ["platform.executive-template"]);
  assert.equal(template.templateOnly, true);
  assert.deepEqual(validateDashboardTemplate({
    appKey: "",
    defaultLayout: { ...layout, pages: [], positions: [] },
    key: "",
    kind: "finance",
    label: "",
    providerSource: "business-app",
    supportedExperiences: [],
    templateOnly: true,
    widgetKeys: [],
  }), {
    errors: [
      "Dashboard template key is required.",
      "Dashboard template label is required.",
      "Dashboard template app key is required.",
      "Dashboard template requires at least one widget key.",
      "Dashboard template requires at least one supported experience.",
      "Dashboard layout requires at least one page.",
      "Dashboard layout requires at least one widget position.",
    ],
    valid: false,
  });
});

test("personalization contracts support user, team, company, default, favorite, shared, widget preferences, and saved filters", () => {
  assert.deepEqual([
    createDashboardPreference({ dashboardKey: dashboard.key, key: "user", scope: "user", userId: "user-1", favorite: true }),
    createDashboardPreference({ dashboardKey: dashboard.key, key: "team", scope: "team", teamId: "team-1", sharedWithTeamIds: ["team-2"] }),
    createDashboardPreference({ dashboardKey: dashboard.key, key: "company", scope: "company", companyId: "company-1" }),
    createDashboardPreference({ dashboardKey: dashboard.key, key: "default", scope: "default" }),
    createDashboardPreference({ dashboardKey: dashboard.key, key: "shared", scope: "shared", sharedWithUserIds: ["user-2"] }),
  ].map((preference) => preference.scope), ["user", "team", "company", "default", "shared"]);
  assert.throws(() => createDashboardPreference({ dashboardKey: "", key: "", scope: "user" }), /preference key/);
});

test("security metadata captures permissions, tenant, company, branch, data scope, experience, and audit requirements", () => {
  assert.deepEqual(createDashboardSecurityMetadata(dashboard, context), {
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    dashboardKey: "platform.analytics-overview",
    dataScopes: ["tenant", "company"],
    experience: "erp",
    requiredPermissions: ["platform.dashboard.view"],
    sensitivity: "internal",
    tenantId: "tenant-1",
  });
  assert.deepEqual(createDashboardAuditMetadata(createDashboardResult(dashboard.key, "ready", []), context, 250), {
    action: "dashboard.ready",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:dashboard",
    dashboardKey: "platform.analytics-overview",
    durationMs: 250,
    originatingApp: "platform",
    principalId: "principal-1",
    status: "ready",
    tenantId: "tenant-1",
  });
});

test("refresh policies cover manual, interval, event-driven, background snapshot, and cached snapshot contracts", () => {
  const validPolicies: readonly DashboardRefreshPolicy[] = [
    { kind: "manual" },
    { intervalSeconds: 60, kind: "interval" },
    { eventNames: [documentCreated], kind: "event-driven" },
    { jobKey: "dashboard.snapshot", kind: "background-snapshot" },
    { cacheKey: "dashboard.cache", kind: "cached-snapshot", ttlSeconds: 300 },
  ];

  assert.deepEqual(validPolicies.map((policy) => validateDashboardRefreshPolicy(policy).valid), [true, true, true, true, true]);
  assert.deepEqual(validateDashboardRefreshPolicy({
    eventNames: [],
    kind: "event-driven",
    ttlSeconds: 0,
  }), {
    errors: [
      "Event-driven dashboard refresh policies require at least one event.",
      "Dashboard refresh policy ttlSeconds must be at least 1.",
    ],
    valid: false,
  });
});

test("event, report, search, and background-job integrations remain provider-neutral contracts", () => {
  assert.deepEqual(createDashboardEventIntegrationContract(documentCreated, ["activity"]), {
    eventName: "DocumentCreated",
    widgetKeys: ["activity"],
  });
  assert.deepEqual(createDashboardReportWidgetContract("platform.report", ["table", "json"]), {
    reportKey: "platform.report",
    requiresReportPermission: true,
    supportedFormats: ["table", "json"],
  });
  assert.deepEqual(createDashboardSearchWidgetContract({
    providerKey: "platform.search",
    resultTypes: ["dashboard"],
  }), {
    providerKey: "platform.search",
    requiresSearchPermission: true,
    resultTypes: ["dashboard"],
  });
  assert.deepEqual(createDashboardJobReadinessContract(dashboard), {
    dashboardKey: "platform.analytics-overview",
    integration: "dashboard-snapshot",
    jobKey: "dashboard.platform.analytics-overview.snapshot",
    requiresBackgroundExecution: true,
  });
  assert.equal(shouldRefreshDashboardAsync(dashboard, context), true);
});

test("dashboard validation catches duplicate widgets, unknown layout widgets, disallowed widgets, and max widget limits", () => {
  assert.deepEqual(validateDashboardDefinition(dashboard), {
    errors: [],
    valid: true,
  });
  const invalid = {
    ...dashboard,
    builderSchema: {
      ...dashboard.builderSchema,
      allowedWidgetKeys: ["total-kpi"],
      maxWidgets: 1,
    },
    layout: {
      ...dashboard.layout,
      positions: [
        ...dashboard.layout.positions,
        { breakpoint: "desktop" as const, height: 1, widgetKey: "unknown", width: 1, x: 0, y: 10 },
      ],
    },
    widgets: [widgets[0]!, widgets[0]!],
  };

  assert.deepEqual(validateDashboardDefinition(invalid).errors, [
    "Duplicate dashboard widget: total-kpi",
    "Dashboard exceeds the configured maximum widget count.",
    "Dashboard layout references unknown widget report-table.",
    "Dashboard layout references disallowed widget report-table.",
    "Dashboard layout references unknown widget search-results.",
    "Dashboard layout references disallowed widget search-results.",
    "Dashboard layout references unknown widget job-snapshot.",
    "Dashboard layout references disallowed widget job-snapshot.",
    "Dashboard layout references unknown widget activity.",
    "Dashboard layout references disallowed widget activity.",
    "Dashboard layout references unknown widget unknown.",
    "Dashboard layout references disallowed widget unknown.",
    "Dashboard section references unknown widget report-table.",
    "Dashboard section references unknown widget search-results.",
    "Dashboard section references unknown widget job-snapshot.",
    "Dashboard section references unknown widget activity.",
  ]);
});
