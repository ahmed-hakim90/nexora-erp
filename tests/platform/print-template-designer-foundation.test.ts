import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessPrintTemplate,
  createPrintAuditMetadata,
  createPrintBrandingContext,
  createPrintJobReadinessContract,
  createPrintOutput,
  createPrintPreviewContract,
  createPrintReportIntegrationContract,
  createPrintSecurityMetadata,
  createPrintTemplateRegistry,
  createPrintTemplateVersion,
  defineCompanyBranding,
  definePermissionKey,
  definePrintTemplate,
  discoverPrintTemplates,
  listPrintTemplates,
  registerPrintTemplate,
  shouldRenderPrintAsync,
  validatePrintBrandingContext,
  validatePrintTemplateDefinition,
  validatePrintTemplateLayout,
  validatePrintTemplateVariables,
  validatePrintTemplateVersion,
  type PrintContext,
  type PrintTemplate,
  type PrintTemplateLayout,
  type PrintTemplateVariable,
} from "@/platform/public-api";

const permission = definePermissionKey("platform.print-template.view");

const layout: PrintTemplateLayout = {
  blocks: [
    {
      children: [
        {
          key: "company-logo",
          type: "logo",
          variableKey: "company.logo",
        },
        {
          key: "title",
          localizedLabelKey: "labels.documentTitle",
          type: "text",
          variableKey: "document.title",
        },
      ],
      key: "header",
      type: "header",
    },
    {
      children: [
        {
          key: "body-text",
          text: "{{document.summary}}",
          type: "text",
          variableKey: "document.summary",
        },
        {
          key: "lines",
          repeat: {
            variableKey: "lineItems",
          },
          table: {
            columns: [
              { key: "description", label: "Description", variableKey: "lineItems.description" },
              { align: "right", key: "amount", label: "Amount", variableKey: "lineItems.amount" },
            ],
          },
          type: "table",
        },
        {
          key: "signature",
          type: "signature",
          variableKey: "user.signature",
        },
      ],
      key: "body",
      type: "body",
    },
    {
      children: [
        {
          key: "page-number",
          text: "{{page.current}} / {{page.total}}",
          type: "page-number",
        },
      ],
      key: "footer",
      type: "footer",
    },
  ],
  direction: "rtl",
  page: {
    orientation: "portrait",
    size: "a4",
  },
};

const variables: readonly PrintTemplateVariable[] = [
  {
    key: "company.logo",
    kind: "company",
    label: "Company Logo",
    sourcePath: "company.logo",
    valueType: "image",
  },
  {
    key: "document.title",
    kind: "document",
    label: "Document Title",
    localized: true,
    sourcePath: "document.title",
    valueType: "text",
  },
  {
    format: "currency",
    key: "totals.net",
    kind: "totals",
    label: "Net Total",
    sourcePath: "totals.net",
    valueType: "currency",
  },
  {
    key: "lineItems",
    kind: "line-items",
    label: "Line Items",
    repeatable: true,
    sourcePath: "lineItems",
    valueType: "array",
  },
  {
    key: "labels.documentTitle",
    kind: "localized-label",
    label: "Document Title Label",
    localized: true,
    valueType: "text",
  },
];

const version = createPrintTemplateVersion({
  changeSummary: "Initial platform print designer foundation contract.",
  createdAt: "2026-06-27T07:00:00.000Z",
  createdBy: "user-1",
  dataSources: [
    {
      key: "document",
      kind: "record",
      label: "Document Snapshot",
      sourceKey: "platform.document.snapshot",
      supportsAsync: true,
      supportsPreview: true,
      supportsSync: true,
    },
  ],
  layout,
  publishedAt: "2026-06-27T07:05:00.000Z",
  publishedBy: "user-1",
  renderers: [
    {
      contentType: "application/vnd.nexora.print-preview+json",
      format: "preview",
      key: "preview",
      rendererKey: "platform.print.preview-contract",
      requiresBackgroundJob: false,
      supportsPreview: true,
    },
    {
      contentType: "application/pdf",
      format: "pdf",
      jobKey: "print.platform.generic-document.pdf",
      key: "pdf",
      rendererKey: "platform.print.pdf-job-contract",
      requiresBackgroundJob: true,
      supportsPreview: false,
    },
  ],
  status: "published",
  templateKey: "platform.generic-document",
  variables,
});

const template: PrintTemplate = definePrintTemplate({
  appKey: "platform",
  currentVersion: version,
  defaultLocale: "ar-SA",
  key: "platform.generic-document",
  metadata: {
    asyncRecommended: false,
    brandAware: true,
    branchScoped: true,
    companyScoped: true,
    estimatedPages: 2,
    localeAware: true,
    reportCompatible: true,
    tenantScoped: true,
  },
  name: "Generic Document Print Contract",
  providerSource: "platform-engine",
  requiredPermission: permission,
  security: {
    auditRequired: true,
    branchAware: true,
    companyAware: true,
    requiredDataScopes: ["tenant", "company"],
    requiredPermissions: [permission],
    sensitiveData: true,
    sensitivity: "sensitive",
    tenantAware: true,
  },
  supportedFormats: ["preview", "html", "pdf", "json"],
  supportedLocales: ["ar-SA", "en-US"],
  type: "custom-document",
  versions: [version],
});

const context: PrintContext = {
  actorId: "user-1",
  actorType: "user",
  branchId: "branch-1",
  companyId: "company-1",
  correlationId: "request:print",
  currency: "SAR",
  dataScopeKeys: new Set(["tenant", "company"]),
  direction: "rtl",
  experience: "erp",
  grantedPermissions: new Set([permission]),
  locale: "ar-SA",
  originatingApp: "platform",
  principalId: "principal-1",
  requestId: "request-1",
  tenantId: "tenant-1",
  timezone: "Asia/Riyadh",
  userId: "user-1",
};

test("template definition registers reusable platform-only print contracts", () => {
  const registry = registerPrintTemplate(createPrintTemplateRegistry(), template);

  assert.deepEqual(registry.templates.map((item) => item.key), ["platform.generic-document"]);
  assert.deepEqual(listPrintTemplates(registry, { type: "custom-document" }).map((item) => item.key), [
    "platform.generic-document",
  ]);
  assert.deepEqual(discoverPrintTemplates(registry, context).map((item) => item.key), [
    "platform.generic-document",
  ]);
  assert.deepEqual(validatePrintTemplateDefinition(template), {
    errors: [],
    valid: true,
  });
});

test("template validation catches missing keys, permissions, locales, and duplicate versions", () => {
  assert.deepEqual(validatePrintTemplateDefinition({
    appKey: "",
    defaultLocale: "fr-FR",
    key: "",
    metadata: {
      brandAware: true,
      companyScoped: true,
      localeAware: true,
      tenantScoped: true,
    },
    name: "",
    providerSource: "platform-engine",
    security: {
      auditRequired: true,
      branchAware: false,
      companyAware: true,
      requiredPermissions: [],
      sensitiveData: false,
      sensitivity: "internal",
      tenantAware: true,
    },
    supportedFormats: [],
    supportedLocales: ["en-US"],
    type: "custom-document",
    versions: [version, version],
  }), {
    errors: [
      "Print template key is required.",
      "Print template name is required.",
      "Print template app key is required.",
      "Print template requires at least one permission.",
      "Print template default locale must be included in supported locales.",
      "Print template requires at least one supported format.",
      "Duplicate print template version: 1",
    ],
    valid: false,
  });
});

test("layout block validation supports header, footer, body, table, and repeating rows", () => {
  assert.deepEqual(validatePrintTemplateLayout(layout), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validatePrintTemplateLayout({
    blocks: [
      {
        key: "header",
        type: "header",
      },
      {
        key: "header",
        type: "text",
      },
      {
        key: "empty-table",
        table: {
          columns: [],
        },
        type: "table",
      },
      {
        key: "repeat",
        type: "repeating-rows",
      },
    ],
    page: {
      orientation: "portrait",
      size: "a4",
    },
  }), {
    errors: [
      "Duplicate print layout block: header",
      "Print template layout requires a body block.",
      "Print table block empty-table requires at least one column.",
      "Print repeating rows block repeat requires a data source or variable.",
    ],
    valid: false,
  });
});

test("variable validation supports company, branch, party, document, user, date, totals, line items, labels, and custom variables", () => {
  assert.deepEqual(validatePrintTemplateVariables([
    ...variables,
    { key: "branch.name", kind: "branch", label: "Branch", valueType: "text" },
    { key: "party.name", kind: "party", label: "Party", valueType: "text" },
    { key: "user.name", kind: "user", label: "User", valueType: "text" },
    { key: "date.today", kind: "date", label: "Date", valueType: "date" },
    { key: "amount.words", kind: "amount", label: "Amount in Words", valueType: "text" },
    { key: "custom.reference", kind: "custom", label: "Reference", valueType: "text" },
  ]), {
    errors: [],
    valid: true,
  });
  assert.deepEqual(validatePrintTemplateVariables([
    { key: "lineItems", kind: "line-items", label: "Line Items", valueType: "array" },
    { format: "currency", key: "badCurrency", kind: "amount", label: "Bad", valueType: "text" },
    { key: "badCurrency", kind: "custom", label: "", valueType: "text" },
  ]), {
    errors: [
      "Duplicate print variable: badCurrency",
      "Print variable lineItems must be repeatable for line items.",
      "Print variable badCurrency must be numeric for currency formatting.",
      "Print variable badCurrency requires a label.",
    ],
    valid: false,
  });
});

test("versioning supports draft, published, archived, rollback metadata, and change summaries", () => {
  const draft = createPrintTemplateVersion({
    changeSummary: "Designer draft.",
    createdAt: "2026-06-27T07:10:00.000Z",
    currentVersion: version.version,
    layout,
    status: "draft",
    templateKey: template.key,
    variables,
  });
  const rollback = createPrintTemplateVersion({
    changeSummary: "Rollback to previous approved layout.",
    createdAt: "2026-06-27T07:20:00.000Z",
    currentVersion: draft.version,
    layout,
    rollback: {
      fromVersion: draft.version,
      reason: "Incorrect footer copy.",
      rolledBackAt: "2026-06-27T07:21:00.000Z",
      rolledBackBy: "user-1",
    },
    status: "archived",
    templateKey: template.key,
    variables,
  });

  assert.equal(draft.version, 2);
  assert.equal(draft.status, "draft");
  assert.equal(rollback.status, "archived");
  assert.equal(rollback.rollback?.fromVersion, 2);
  assert.deepEqual(validatePrintTemplateVersion({
    ...version,
    changeSummary: "",
    publishedAt: undefined,
    status: "published",
  }), {
    errors: [
      "Print template version requires a change summary.",
      "Published print template versions require publishedAt metadata.",
    ],
    valid: false,
  });
});

test("branding and localization metadata carries company brand, RTL, locale, currency, and date formatting readiness", () => {
  const companyBranding = defineCompanyBranding({
    companyId: "company-1",
    displayName: "Nexora Trading",
    documentFooterText: "Thank you",
    documentHeaderText: "Official Document",
    legalName: "Nexora Trading LLC",
    logoFileId: "file-logo",
    primaryColorToken: "brand.nexora.primary",
    scope: "company",
    tenantId: "tenant-1",
  });
  const branding = createPrintBrandingContext({
    branding: companyBranding,
    context,
    fonts: { primary: "font.arabic" },
  });

  assert.deepEqual(validatePrintBrandingContext(branding), {
    errors: [],
    valid: true,
  });
  assert.equal(branding.logo?.fileId, "file-logo");
  assert.equal(branding.direction, "rtl");
  assert.equal(branding.locale, "ar-SA");
  assert.equal(branding.currency, "SAR");
  assert.equal(branding.timezone, "Asia/Riyadh");
});

test("security metadata enforces permissions, tenant, company, branch, sensitivity, and audit flags", () => {
  assert.equal(canAccessPrintTemplate(template, context), true);
  assert.equal(canAccessPrintTemplate(template, { ...context, grantedPermissions: new Set() }), false);
  assert.equal(canAccessPrintTemplate(template, { ...context, companyId: null }), false);
  assert.equal(canAccessPrintTemplate(template, { ...context, dataScopeKeys: new Set(["tenant"]) }), false);
  assert.deepEqual(createPrintSecurityMetadata(template, context), {
    auditRequired: true,
    branchId: "branch-1",
    companyId: "company-1",
    dataScopes: ["tenant", "company"],
    requiredPermissions: ["platform.print-template.view"],
    sensitiveData: true,
    sensitivity: "sensitive",
    templateKey: "platform.generic-document",
    tenantId: "tenant-1",
  });
});

test("preview and output contracts avoid rendering while defining future render targets", () => {
  const branding = createPrintBrandingContext({ context });
  const preview = createPrintPreviewContract({
    branding,
    context,
    requestedAt: "2026-06-27T07:30:00.000Z",
    sampleData: {
      document: { title: "Preview" },
    },
    templateKey: template.key,
    version: version.version,
  });
  const pdf = createPrintOutput(template.key, version.version, "pdf", {
    fileName: "document.pdf",
    jobKey: "print.platform.generic-document.pdf",
    status: "queued",
  });

  assert.equal(preview.format, "preview");
  assert.equal(pdf.contentType, "application/pdf");
  assert.equal(pdf.status, "queued");
  assert.deepEqual(createPrintAuditMetadata(pdf, context, 500), {
    action: "print.queued",
    actorId: "user-1",
    branchId: "branch-1",
    companyId: "company-1",
    correlationId: "request:print",
    durationMs: 500,
    format: "pdf",
    originatingApp: "platform",
    principalId: "principal-1",
    status: "queued",
    templateKey: "platform.generic-document",
    tenantId: "tenant-1",
  });
});

test("background job readiness marks PDF and heavy rendering for the jobs engine", () => {
  assert.equal(shouldRenderPrintAsync(template, "html", context), false);
  assert.equal(shouldRenderPrintAsync(template, "pdf", context), true);
  assert.deepEqual(createPrintJobReadinessContract(template, "pdf"), {
    format: "pdf",
    idempotencyKeyParts: ["tenantId", "companyId", "templateKey", "version", "format", "entityRef"],
    integration: "print-generation",
    jobKey: "print.platform.generic-document.pdf",
    requiresBackgroundExecution: true,
    templateKey: "platform.generic-document",
  });
});

test("reporting integration contracts allow future report HTML and PDF output without report rendering", () => {
  assert.deepEqual(createPrintReportIntegrationContract("platform.report", template.key, ["html", "pdf", "json"]), {
    reportKey: "platform.report",
    requiresPrintPermission: true,
    requiresReportPermission: true,
    supportedFormats: ["html", "pdf", "json"],
    templateKey: "platform.generic-document",
  });
});
