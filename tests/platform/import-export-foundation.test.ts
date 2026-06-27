import assert from "node:assert/strict";
import test from "node:test";

import {
  IMPORT_EXPORT_FORMATS,
  canAccessExport,
  canAccessImport,
  createExportAuditMetadata,
  createExportBatch,
  createExportDashboardIntegrationContract,
  createExportJobReadinessContract,
  createExportRegistry,
  createExportReportIntegrationContract,
  createExportResult,
  createExportSearchIntegrationContract,
  createExportSecurityMetadata,
  createExportTelemetryMetadata,
  createImportAuditMetadata,
  createImportBatch,
  createImportJobReadinessContract,
  createImportPreview,
  createImportRegistry,
  createImportResult,
  createImportSearchIndexingContract,
  createImportSecurityMetadata,
  createImportTelemetryMetadata,
  defineExport,
  defineImport,
  definePermissionKey,
  registerExport,
  registerImport,
  shouldRunExportAsync,
  shouldRunImportAsync,
  validateExportDefinition,
  validateExportMappings,
  validateExportTemplate,
  validateImportDefinition,
  validateImportMappings,
  validateImportTemplate,
  validateImportValidationRules,
  type ExportContext,
  type ExportDefinition,
  type ImportContext,
  type ImportDefinition,
  type ImportRow,
  type ImportValidationRule,
} from "@/platform/public-api";

const importPermission = definePermissionKey("platform.import.execute");
const exportPermission = definePermissionKey("platform.export.execute");

const security = {
  auditRequired: true,
  branchAware: true,
  companyAware: true,
  exportRestrictions: ["masked-only", "no-external-share"],
  pii: true,
  requiredDataScopes: ["tenant", "company"],
  requiredPermissions: [importPermission],
  sensitiveData: true,
  sensitivity: "sensitive",
  tenantAware: true,
} as const;

const exportSecurity = {
  ...security,
  requiredPermissions: [exportPermission],
} as const;

const importColumns = [
  {
    dataType: "text",
    key: "externalCode",
    label: "External Code",
    localizedLabels: { ar: "Al Ramz Al Khariji" },
    required: true,
    sourceColumn: "External Code",
    targetField: "externalCode",
  },
  {
    dataType: "email",
    key: "email",
    label: "Email",
    pii: true,
    sourceColumn: "Email",
    targetField: "email",
  },
] as const;

const importMappings = [
  {
    key: "externalCode",
    localizedLabels: { ar: "Al Ramz Al Khariji" },
    required: true,
    sourceColumn: "External Code",
    targetField: "externalCode",
    validationKey: "external-code-required",
  },
  {
    defaultValue: "active",
    enumMapping: [
      { sourceValue: "A", targetValue: "active" },
      { sourceValue: "I", targetValue: "inactive" },
    ],
    key: "status",
    lookupKey: "status.lookup",
    sourceColumn: "Status",
    targetField: "status",
    transformationKey: "normalize-status",
  },
] as const;

const validationRules: readonly ImportValidationRule[] = [
  {
    fieldKey: "externalCode",
    key: "external-code-required",
    message: "External code is required.",
    severity: "error",
    type: "required",
  },
  {
    dataType: "email",
    fieldKey: "email",
    key: "email-type",
    message: "Email must be valid.",
    severity: "warning",
    type: "type",
  },
  {
    fieldKey: "amount",
    key: "amount-range",
    max: 1_000_000,
    message: "Amount is outside the allowed range.",
    min: 0,
    severity: "error",
    type: "range",
  },
  {
    fieldKey: "externalCode",
    key: "duplicate-external-code",
    message: "External code must be unique.",
    severity: "error",
    type: "duplicate",
  },
  {
    fieldKey: "partyId",
    key: "party-lookup",
    lookupKey: "party.lookup",
    message: "Party must exist.",
    severity: "error",
    type: "lookup",
  },
  {
    customValidatorKey: "platform.custom-validator",
    key: "custom-rule",
    message: "Custom validation failed.",
    severity: "warning",
    type: "custom",
  },
  {
    crossRowKey: "balanced-batch",
    key: "cross-row-balanced",
    message: "Batch rows must balance.",
    severity: "error",
    type: "cross-row",
  },
  {
    key: "permission-rule",
    message: "Import permission is required.",
    requiredPermission: importPermission,
    severity: "error",
    type: "permission",
  },
  {
    key: "data-scope-rule",
    message: "Company data scope is required.",
    requiredDataScope: "company",
    severity: "error",
    type: "data-scope",
  },
];

const importTemplate = {
  columns: importColumns,
  format: "csv",
  key: "platform.generic-import-template",
  label: "Generic Import Template",
  localizedLabels: { ar: "Qalab Istirad Aam" },
  mappings: importMappings,
  sampleRows: [{ "External Code": "EXT-1", Email: "user@example.com", Status: "A" }],
  validationRules,
} as const;

const importDefinition = defineImport({
  appKey: "platform",
  columns: importColumns,
  key: "platform.generic-import",
  label: "Generic Import",
  mappings: importMappings,
  maxFileSizeBytes: 5_000_000,
  maxRows: 1_000,
  metadata: { platformOnly: true },
  previewRequired: true,
  providerSource: "platform-engine",
  requiredPermission: importPermission,
  requiresAsync: false,
  security,
  supportedFormats: ["csv", "excel", "json", "xml"],
  templates: [importTemplate],
  validationRules,
} satisfies ImportDefinition);

const exportColumns = [
  {
    dataType: "text",
    key: "externalCode",
    label: "External Code",
    localizedLabels: { ar: "Al Ramz Al Khariji" },
    order: 1,
    sourceField: "externalCode",
  },
  {
    dataType: "email",
    key: "email",
    label: "Email",
    order: 2,
    pii: true,
    sourceField: "email",
  },
] as const;

const exportMappings = [
  {
    key: "externalCode",
    localizedLabels: { ar: "Al Ramz Al Khariji" },
    sourceField: "externalCode",
    targetColumn: "External Code",
  },
  {
    defaultValue: "",
    key: "email",
    sourceField: "email",
    targetColumn: "Email",
    transformationKey: "mask-email",
  },
] as const;

const exportTemplate = {
  columns: exportColumns,
  format: "excel",
  key: "platform.generic-export-template",
  label: "Generic Export Template",
  localizedLabels: { ar: "Qalab Tasdir Aam" },
  mappings: exportMappings,
} as const;

const exportDefinition = defineExport({
  appKey: "platform",
  columns: exportColumns,
  key: "platform.generic-export",
  label: "Generic Export",
  mappings: exportMappings,
  maxRows: 5_000,
  metadata: {
    compression: "none",
    fileNameTemplate: "generic-export-{date}",
    includeFilters: true,
    includeGeneratedAt: true,
    includeHeaders: true,
    retentionDays: 30,
    watermarkRequired: true,
  },
  providerSource: "platform-engine",
  requiredPermission: exportPermission,
  requiresAsync: false,
  security: exportSecurity,
  supportedFormats: ["csv", "excel", "json", "pdf", "html", "xml"],
  templates: [exportTemplate],
} satisfies ExportDefinition);

const importContext: ImportContext = {
  actorId: "user-1",
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:import",
  dataScopeKeys: new Set(["tenant", "company"]),
  dryRun: true,
  experience: "erp",
  grantedPermissions: new Set([importPermission, exportPermission]),
  locale: "en-US",
  principalId: "principal-1",
  requestId: "request-1",
  sourceApp: "platform",
  sourceEngine: "import-export",
  tenantId: "tenant-1",
  timezone: "Asia/Riyadh",
  userId: "user-1",
};

const exportContext: ExportContext = {
  ...importContext,
  filters: { status: "active" },
  selectedColumns: ["externalCode", "email"],
};

test("import definition validation enforces permissions, templates, columns, mappings, and rules", () => {
  const registry = registerImport(createImportRegistry(), importDefinition);

  assert.deepEqual(registry.imports.map((item) => item.key), ["platform.generic-import"]);
  assert.deepEqual(validateImportDefinition(importDefinition), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateImportDefinition({
    appKey: "",
    columns: [
      { dataType: "text", key: "externalCode", label: "External Code" },
      { dataType: "text", key: "externalCode", label: "Duplicate" },
    ],
    key: "",
    label: "",
    mappings: [],
    maxFileSizeBytes: 0,
    previewRequired: true,
    providerSource: "platform-engine",
    requiresAsync: false,
    security: { ...security, requiredPermissions: [] },
    supportedFormats: [],
    templates: [importTemplate, importTemplate],
    validationRules: [],
  }), {
    errors: [
      "Import definition key is required.",
      "Import definition app key is required.",
      "Import definition label is required.",
      "Import definition requires at least one permission.",
      "Import definition requires at least one supported format.",
      "Import definition maxFileSizeBytes must be at least 1.",
      "Duplicate import column: externalCode",
      "Duplicate import template: platform.generic-import-template",
    ],
    valid: false,
  });
});

test("export definition validation enforces permissions, formats, templates, columns, and mappings", () => {
  const registry = registerExport(createExportRegistry(), exportDefinition);

  assert.deepEqual(registry.exports.map((item) => item.key), ["platform.generic-export"]);
  assert.deepEqual(validateExportDefinition(exportDefinition), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateExportDefinition({
    appKey: "",
    columns: [
      { dataType: "text", key: "externalCode", label: "External Code", order: 1, sourceField: "externalCode" },
      { dataType: "text", key: "externalCode", label: "Duplicate", order: 2, sourceField: "duplicate" },
    ],
    key: "",
    label: "",
    mappings: [],
    metadata: { includeHeaders: true },
    providerSource: "platform-engine",
    requiresAsync: false,
    security: { ...exportSecurity, requiredPermissions: [] },
    supportedFormats: [],
    templates: [exportTemplate, exportTemplate],
  }), {
    errors: [
      "Export definition key is required.",
      "Export definition app key is required.",
      "Export definition label is required.",
      "Export definition requires at least one permission.",
      "Export definition requires at least one supported format.",
      "Duplicate export column: externalCode",
      "Duplicate export template: platform.generic-export-template",
    ],
    valid: false,
  });
});

test("column mapping validation supports source, target, defaults, transformations, lookup, enum, and localization metadata", () => {
  assert.deepEqual(validateImportMappings(importMappings), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateExportMappings(exportMappings), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateImportMappings([
    { key: "bad", sourceColumn: "", targetField: "" },
    { key: "bad", sourceColumn: "Name", targetField: "name" },
  ]), {
    errors: [
      "Duplicate import mapping: bad",
      "Import mapping bad requires a source column.",
      "Import mapping bad requires a target field.",
    ],
    valid: false,
  });
  assert.deepEqual(validateExportMappings([
    { key: "bad", sourceField: "", targetColumn: "" },
    { key: "bad", sourceField: "name", targetColumn: "Name" },
  ]), {
    errors: [
      "Duplicate export mapping: bad",
      "Export mapping bad requires a source field.",
      "Export mapping bad requires a target column.",
    ],
    valid: false,
  });
});

test("validation rule contracts cover required, type, range, duplicate, lookup, custom, cross-row, permission, and data-scope rules", () => {
  assert.deepEqual(validateImportValidationRules(validationRules), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateImportValidationRules([
    { fieldKey: "", key: "required", message: "", severity: "error", type: "required" },
    { key: "lookup", message: "Lookup", severity: "error", type: "lookup" },
    { key: "custom", message: "Custom", severity: "error", type: "custom" },
    { key: "cross", message: "Cross", severity: "error", type: "cross-row" },
    { key: "permission", message: "Permission", severity: "error", type: "permission" },
    { key: "scope", message: "Scope", severity: "error", type: "data-scope" },
    { key: "scope", message: "Duplicate", severity: "error", type: "data-scope" },
  ]), {
    errors: [
      "Duplicate import validation rule: scope",
      "Import validation rule required requires a message.",
      "Import validation rule required requires a field key.",
      "Import validation rule lookup requires a lookup key.",
      "Import validation rule custom requires a custom validator key.",
      "Import validation rule cross requires a cross-row key.",
      "Import validation rule permission requires a permission.",
      "Import validation rule scope requires a data scope.",
      "Import validation rule scope requires a data scope.",
    ],
    valid: false,
  });
});

test("preview and dry-run contracts summarize rows, errors, warnings, and commit mode", () => {
  const rows: readonly ImportRow[] = [
    {
      errors: [],
      mappedValues: { externalCode: "EXT-1" },
      rowNumber: 1,
      status: "accepted",
      values: { "External Code": "EXT-1" },
      warnings: [],
    },
    {
      errors: [{ code: "REQUIRED", message: "External code is required.", rowNumber: 2, severity: "error" }],
      rowNumber: 2,
      status: "rejected",
      values: { "External Code": "" },
      warnings: [],
    },
    {
      errors: [],
      rowNumber: 3,
      status: "warning",
      values: { Email: "bad" },
      warnings: [{ code: "EMAIL", message: "Email warning.", rowNumber: 3, severity: "warning" }],
    },
  ];
  const preview = createImportPreview({
    importKey: importDefinition.key,
    rows,
    templateKey: importTemplate.key,
  });
  const result = createImportResult(importDefinition.key, preview, {
    batchId: "batch-1",
    durationMs: 250,
    status: "previewed",
  });

  assert.equal(preview.dryRun, true);
  assert.deepEqual(preview.validationSummary, {
    acceptedRows: 1,
    errorCount: 1,
    rejectedRows: 1,
    totalRows: 3,
    warningCount: 1,
    warningRows: 1,
  });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 1);
});

test("supported format metadata covers CSV, Excel, JSON, PDF, HTML, and XML", () => {
  assert.deepEqual(IMPORT_EXPORT_FORMATS.map((format) => format.format), ["csv", "excel", "json", "pdf", "html", "xml"]);
  assert.deepEqual(IMPORT_EXPORT_FORMATS.map((format) => [format.format, format.supportsImport, format.supportsExport]), [
    ["csv", true, true],
    ["excel", true, true],
    ["json", true, true],
    ["pdf", false, true],
    ["html", false, true],
    ["xml", true, true],
  ]);
  assert.deepEqual(validateImportTemplate(importTemplate), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validateExportTemplate(exportTemplate), {
    errors: [],
    valid: true,
  });
});

test("background-job readiness exposes queued import/export, progress, retry, cancellation, and dead-letter metadata", () => {
  assert.equal(shouldRunImportAsync(importDefinition, 1_001, importContext), true);
  assert.equal(shouldRunExportAsync(exportDefinition, 5_001, exportContext), true);
  assert.deepEqual(createImportJobReadinessContract(importDefinition), {
    cancellable: true,
    deadLetterEnabled: true,
    definitionKey: "platform.generic-import",
    integration: "import-export",
    jobKey: "import.platform.generic-import",
    operation: "import",
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
  });
  assert.deepEqual(createExportJobReadinessContract(exportDefinition), {
    cancellable: true,
    deadLetterEnabled: true,
    definitionKey: "platform.generic-export",
    integration: "import-export",
    jobKey: "export.platform.generic-export",
    operation: "export",
    progressTracking: true,
    requiresBackgroundExecution: true,
    retryable: true,
  });
  assert.equal(createImportBatch({
    createdAt: "2026-06-27T08:00:00.000Z",
    failureCount: 1,
    format: "csv",
    id: "import-batch-1",
    importKey: importDefinition.key,
    processedRows: 50,
    status: "running",
    successCount: 49,
    totalRows: 100,
    warningCount: 0,
  }).progress, 50);
  assert.equal(createExportBatch({
    createdAt: "2026-06-27T08:00:00.000Z",
    exportKey: exportDefinition.key,
    format: "excel",
    id: "export-batch-1",
    rowCount: 10,
    status: "completed",
  }).progress, 100);
});

test("report, search, dashboard, and search-indexing integration contracts are provider-neutral", () => {
  assert.deepEqual(createExportReportIntegrationContract("platform.report", exportDefinition.key), {
    exportKey: "platform.generic-export",
    reportKey: "platform.report",
    requiresExportPermission: true,
    requiresReportPermission: true,
    supportedFormats: ["csv", "excel", "json", "pdf", "html"],
  });
  assert.deepEqual(createExportDashboardIntegrationContract("platform.dashboard", exportDefinition.key, {
    supportedFormats: ["csv", "excel", "json"],
    widgetKey: "table-widget",
    widgetType: "table",
  }), {
    dashboardKey: "platform.dashboard",
    exportKey: "platform.generic-export",
    requiresDashboardPermission: true,
    requiresExportPermission: true,
    supportedFormats: ["csv", "excel", "json"],
    widgetKey: "table-widget",
    widgetType: "table",
  });
  assert.deepEqual(createExportSearchIntegrationContract(exportDefinition.key, {
    resultTypes: ["document", "report", "dashboard"],
    searchProviderKey: "platform.search",
    supportedFormats: ["csv", "json"],
  }), {
    exportKey: "platform.generic-export",
    requiresExportPermission: true,
    requiresSearchPermission: true,
    resultTypes: ["document", "report", "dashboard"],
    searchProviderKey: "platform.search",
    supportedFormats: ["csv", "json"],
  });
  assert.deepEqual(createImportSearchIndexingContract(importDefinition.key, "platform.search"), {
    importKey: "platform.generic-import",
    indexingJobKey: "search.platform.search.index-import",
    searchProviderKey: "platform.search",
    triggerAfterCommit: true,
  });
});

test("security metadata enforces permissions, tenant, company, branch, data scope, PII, and export restrictions", () => {
  assert.equal(canAccessImport(importDefinition, importContext), true);
  assert.equal(canAccessImport(importDefinition, { ...importContext, grantedPermissions: new Set() }), false);
  assert.equal(canAccessExport(exportDefinition, exportContext), true);
  assert.equal(canAccessExport(exportDefinition, { ...exportContext, companyId: null }), false);
  assert.deepEqual(createImportSecurityMetadata(importDefinition, importContext), {
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    dataScopes: ["tenant", "company"],
    exportRestrictions: ["masked-only", "no-external-share"],
    operationKey: "platform.generic-import",
    pii: true,
    requiredPermissions: ["platform.import.execute"],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantId: "tenant-1",
  });
  assert.deepEqual(createExportSecurityMetadata(exportDefinition, exportContext), {
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    dataScopes: ["tenant", "company"],
    exportRestrictions: ["masked-only", "no-external-share"],
    operationKey: "platform.generic-export",
    pii: true,
    requiredPermissions: ["platform.export.execute"],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantId: "tenant-1",
  });
});

test("audit and telemetry metadata expose correlation, actor, scope, source, counts, format, and duration", () => {
  const preview = createImportPreview({
    importKey: importDefinition.key,
    rows: [
      { errors: [], rowNumber: 1, status: "accepted", values: {}, warnings: [] },
    ],
  });
  const importResult = createImportResult(importDefinition.key, preview, {
    durationMs: 100,
    status: "completed",
  });
  const exportResult = createExportResult(exportDefinition.key, "csv", {
    durationMs: 200,
    failureCount: 1,
    fileName: "export.csv",
    rowCount: 10,
    status: "completed",
    successCount: 9,
  });

  assert.deepEqual(createImportAuditMetadata(importResult, importContext), {
    action: "import.completed",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:import",
    durationMs: 100,
    failureCount: 0,
    principalId: "principal-1",
    rowCount: 1,
    sourceApp: "platform",
    sourceEngine: "import-export",
    successCount: 1,
    tenantId: "tenant-1",
  });
  assert.deepEqual(createExportAuditMetadata(exportResult, exportContext), {
    action: "export.completed",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:import",
    durationMs: 200,
    failureCount: 1,
    fileFormat: "csv",
    principalId: "principal-1",
    rowCount: 10,
    sourceApp: "platform",
    sourceEngine: "import-export",
    successCount: 9,
    tenantId: "tenant-1",
  });
  assert.deepEqual(createImportTelemetryMetadata(importResult, importContext), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:import",
    durationMs: 100,
    failureCount: 0,
    requestId: "request-1",
    rowCount: 1,
    sourceKey: "platform.generic-import",
    successCount: 1,
    tenantId: "tenant-1",
  });
  assert.deepEqual(createExportTelemetryMetadata(exportResult, exportContext), {
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:import",
    durationMs: 200,
    failureCount: 1,
    fileFormat: "csv",
    requestId: "request-1",
    rowCount: 10,
    sourceKey: "platform.generic-export",
    successCount: 9,
    tenantId: "tenant-1",
  });
});
