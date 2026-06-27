import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessReport,
  createReportAuditMetadata,
  createReportJobReadinessContract,
  createReportOutput,
  createReportRegistry,
  createReportResult,
  createReportSecurityMetadata,
  createReportTelemetryMetadata,
  definePermissionKey,
  defineReport,
  discoverReports,
  listReports,
  registerReport,
  shouldExecuteReportAsync,
  unregisterReport,
  validateReportDefinition,
  validateReportParameters,
  type ReportDefinition,
  type ReportExecutionContext,
} from "@/platform/public-api";

const permission = definePermissionKey("platform.report.view");
const report = defineReport({
  appKey: "platform",
  category: "operational",
  dataSource: {
    key: "platform.report.source",
    maxSyncRows: 1000,
    sourceKey: "platform.repository",
    supportsAsync: true,
    supportsSync: true,
    type: "repository",
  },
  description: "Platform test report.",
  key: "platform.test-report",
  metadata: {
    asyncRecommended: false,
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    estimatedRows: 100,
    requiredDataScopes: ["tenant"],
    sensitivity: "internal",
    tenantAware: true,
  },
  mode: "interactive",
  name: "Platform Test Report",
  parameters: [
    {
      key: "period",
      label: "Period",
      required: true,
      type: "date-range",
    },
    {
      defaultValue: ["open"],
      key: "status",
      label: "Status",
      required: false,
      type: "multi-select",
    },
    {
      key: "partyId",
      label: "Party",
      lookupProviderKey: "platform.party.search",
      required: false,
      type: "lookup",
    },
  ],
  providerSource: "platform-engine",
  requiredPermission: permission,
  supportedFormats: ["table", "json", "csv", "excel", "pdf", "html"],
  templates: [
    {
      format: "table",
      key: "table",
      layout: "table",
      titleTemplate: "Platform Test Report",
    },
  ],
} satisfies ReportDefinition);

const context: ReportExecutionContext = {
  actorId: "user-1",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:report",
  dataScopeKeys: new Set(["tenant"]),
  experience: "erp",
  grantedPermissions: new Set([permission]),
  originatingApp: "platform",
  principalId: "principal-1",
  requestId: "request-1",
  tenantId: "tenant-1",
};

test("report registry registers, lists, discovers, and unregisters reports", () => {
  const registry = registerReport(createReportRegistry(), report);

  assert.deepEqual(registry.reports.map((item) => item.key), ["platform.test-report"]);
  assert.deepEqual(listReports(registry, { category: "operational" }).map((item) => item.key), ["platform.test-report"]);
  assert.deepEqual(discoverReports(registry, context).map((item) => item.key), ["platform.test-report"]);
  assert.deepEqual(unregisterReport(registry, "platform.test-report").reports, []);
});

test("report validation catches missing keys, permissions, duplicate parameters, and data source mismatch", () => {
  assert.deepEqual(validateReportDefinition(report), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateReportDefinition({
    key: "",
    mode: "interactive",
    parameters: [
      { key: "period", label: "Period", required: true, type: "date-range" },
      { key: "period", label: "Period 2", required: false, type: "date" },
    ],
    requiredPermission: "",
    dataSource: {
      key: "async-only",
      sourceKey: "view",
      supportsAsync: true,
      supportsSync: false,
      type: "view",
    },
  }), {
    errors: [
      "Report key is required.",
      "Report requires at least one permission.",
      "Duplicate report parameter: period",
      "Interactive reports require a synchronous data source.",
    ],
    valid: false,
  });
});

test("parameter validation supports required, date range, lookup, multi-select, defaults, and custom validators", () => {
  assert.deepEqual(validateReportParameters(report.parameters ?? [], {
    partyId: "party-1",
    period: { from: "2026-01-01", to: "2026-01-31" },
  }), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateReportParameters([
    { key: "period", label: "Period", required: true, type: "date-range" },
    { key: "status", label: "Status", required: true, type: "multi-select" },
    {
      key: "amount",
      label: "Amount",
      required: false,
      type: "number",
      validation: { customValidatorKey: "amount-positive", min: 1 },
    },
  ], {
    amount: 0,
    period: "bad",
    status: "open",
  }), {
    errors: [
      "Report parameter period must be a date range.",
      "Report parameter status must be an array.",
      "Report parameter amount is below minimum.",
    ],
    valid: false,
  });
});

test("output formats define table, JSON, CSV, Excel, PDF, and HTML contracts", () => {
  assert.deepEqual(["table", "json", "csv", "excel", "pdf", "html"].map((format) =>
    createReportOutput(format as Parameters<typeof createReportOutput>[0]).contentType,
  ), [
    "application/vnd.nexora.report.table+json",
    "application/json",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
    "text/html",
  ]);

  assert.deepEqual(createReportResult("platform.test-report", createReportOutput("json", { rowCount: 2 }), [{ id: 1 }]), {
    data: [{ id: 1 }],
    output: {
      contentType: "application/json",
      format: "json",
      rowCount: 2,
    },
    reportKey: "platform.test-report",
    status: "ready",
  });
});

test("security metadata enforces tenant, permission, and data scope awareness", () => {
  assert.equal(canAccessReport(report, context), true);
  assert.equal(canAccessReport(report, { ...context, grantedPermissions: new Set() }), false);
  assert.equal(canAccessReport(report, { ...context, dataScopeKeys: new Set() }), false);

  assert.deepEqual(createReportSecurityMetadata(report, context), {
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    dataScopes: ["tenant"],
    reportKey: "platform.test-report",
    requiredPermissions: ["platform.report.view"],
    sensitivity: "internal",
    tenantId: "tenant-1",
  });
});

test("background job readiness marks large reports for async execution", () => {
  const largeReport = {
    ...report,
    metadata: {
      ...report.metadata!,
      estimatedRows: 5000,
    },
  };

  assert.equal(shouldExecuteReportAsync(largeReport, context), true);
  assert.deepEqual(createReportJobReadinessContract(report), {
    integration: "report-generation",
    jobKey: "report.platform.test-report",
    reportKey: "platform.test-report",
    requiresBackgroundExecution: true,
  });
});

test("audit and telemetry metadata expose report execution context", () => {
  const result = createReportResult("platform.test-report", createReportOutput("csv", { rowCount: 25 }));

  assert.deepEqual(createReportAuditMetadata(report, result, context, 1234), {
    action: "report.ready",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:report",
    durationMs: 1234,
    format: "csv",
    originatingApp: "platform",
    principalId: "principal-1",
    reportKey: "platform.test-report",
    rowCount: 25,
    tenantId: "tenant-1",
  });
  assert.deepEqual(createReportTelemetryMetadata(report, result, context, 1234), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:report",
    durationMs: 1234,
    format: "csv",
    originatingApp: "platform",
    reportKey: "platform.test-report",
    requestId: "request-1",
    rowCount: 25,
    sourceKey: "platform.test-report",
    tenantId: "tenant-1",
  });
});
