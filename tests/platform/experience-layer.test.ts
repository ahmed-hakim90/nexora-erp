import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPERIENCE_DEFINITIONS,
  LOOKUP_FIRST_CONTRACTS,
  PLATFORM_FEEDBACK_INTEGRATION,
  UX_PATTERN_CONTRACTS,
  UX_SHELL_PRIMITIVE_CONTRACTS,
  createExperienceShellContract,
  createShellBrandingContext,
  normalizeAccessibilityPolicy,
  normalizeLookupOptions,
  normalizeLookupQuery,
  normalizeResponsiveLayoutPolicy,
  toLookupInteraction,
  type BrandingContext,
  type CompanyBranding,
} from "@/platform/public-api";

test("official experience definitions cover Sprint 6 UX surfaces", () => {
  assert.deepEqual(Object.keys(EXPERIENCE_DEFINITIONS).sort(), [
    "admin",
    "ai",
    "api",
    "automation",
    "customer-portal",
    "driver-app",
    "employee-portal",
    "erp",
    "marketplace",
    "supplier-portal",
    "technician-app",
  ]);

  assert.equal(EXPERIENCE_DEFINITIONS.erp.layoutType, "enterprise-workspace");
  assert.equal(EXPERIENCE_DEFINITIONS.admin.navigationStyle, "sidebar-topbar");
  assert.equal(EXPERIENCE_DEFINITIONS["driver-app"].navigationStyle, "bottom-tabs");
  assert.deepEqual(EXPERIENCE_DEFINITIONS.api.supportedDevices, ["api-client", "service"]);
  assert.equal(EXPERIENCE_DEFINITIONS.erp.brandingSupport.respectsBrandingContext, true);
});

test("shell contracts expose primitives without implementing navigation runtime", () => {
  assert.deepEqual(Object.keys(UX_SHELL_PRIMITIVE_CONTRACTS).sort(), [
    "app-launcher",
    "breadcrumbs",
    "command-palette",
    "company-branch-switcher",
    "mobile-navigation",
    "notification-area",
    "quick-actions",
    "sidebar",
    "topbar",
    "user-menu",
  ]);

  const shell = createExperienceShellContract("erp");

  assert.ok(shell);
  assert.equal(shell.feedback.engine, "platform.feedback");
  assert.equal(shell.capabilities.appLauncher, true);
  assert.ok(shell.primitives.some((primitive) => primitive.primitive === "command-palette"));
  assert.ok(shell.primitives.every((primitive) => primitive.accessibility.keyboardReachable));
});

test("UX pattern contracts standardize platform states and feedback routing", () => {
  assert.equal(UX_PATTERN_CONTRACTS.form?.mobilePolicy, "mobile-first");
  assert.equal(UX_PATTERN_CONTRACTS.form?.lookupFirstRequired, true);
  assert.equal(UX_PATTERN_CONTRACTS.feedback?.feedbackPolicy, "platform-feedback");
  assert.equal(UX_PATTERN_CONTRACTS["bulk-actions"]?.feedbackPolicy, "platform-feedback");
  assert.ok(UX_PATTERN_CONTRACTS["error-state"]?.requiredAccessibility.includes("screen reader labels"));
});

test("lookup-first contracts reject raw UUID entry and normalize options", () => {
  const rawUuid = normalizeLookupQuery("550e8400-e29b-41d4-a716-446655440000", {
    minSearchLength: 2,
  });
  const query = normalizeLookupQuery("  Acme   Trading  ", { minSearchLength: 2 });

  assert.deepEqual(rawUuid, {
    minSearchLength: 2,
    rejectedRawId: true,
    search: null,
  });
  assert.deepEqual(query, {
    minSearchLength: 2,
    rejectedRawId: false,
    search: "Acme Trading",
  });
  assert.equal(LOOKUP_FIRST_CONTRACTS["lookup-field"].allowRawIdInput, false);
  assert.deepEqual(toLookupInteraction(LOOKUP_FIRST_CONTRACTS["lookup-field"]), {
    allowRawIdInput: false,
    entityType: "entity",
    minSearchLength: 2,
    searchProviderKey: "platform.lookup.entity",
  });

  assert.deepEqual(normalizeLookupOptions([
    { entityType: "company", id: " company-1 ", label: " Acme   Trading " },
    { entityType: "company", id: "company-1", label: "Duplicate" },
    { entityType: "company", id: " ", label: "Missing id" },
  ]), [
    { entityType: "company", id: "company-1", label: "Acme Trading" },
  ]);
});

test("accessibility and responsive policy helpers enforce platform minimums", () => {
  assert.deepEqual(normalizeAccessibilityPolicy({
    ariaLabelsRequired: false,
    minTouchTargetPx: 24,
  }), {
    ariaLabelsRequired: false,
    focusManagementRequired: true,
    focusVisibleRequired: true,
    keyboardNavigationRequired: true,
    minTouchTargetPx: 44,
    reducedMotionSupported: true,
    screenReaderLabelsRequired: true,
    supportsRtl: true,
  });

  assert.equal(normalizeResponsiveLayoutPolicy({
    allowWideTablesOnMobile: true,
    minTouchTargetPx: 32,
  }).minTouchTargetPx, 44);
});

test("branding-aware shell contracts resolve display identity from company branding", () => {
  const brandingContext: BrandingContext = {
    branchId: "branch-1",
    companyId: "company-1",
    outputType: "shell",
    tenantId: "tenant-1",
  };
  const branding: CompanyBranding = {
    branchId: "branch-1",
    companyId: "company-1",
    displayName: "Acme",
    legalName: "Acme Trading LLC",
    logoFileId: "file-logo",
    primaryColorToken: "--brand-primary",
    scope: "company",
    tenantId: "tenant-1",
  };

  assert.deepEqual(createShellBrandingContext(brandingContext, branding), {
    branding,
    brandingContext,
    displayName: "Acme",
    logoFileId: "file-logo",
    primaryColorToken: "--brand-primary",
  });
});

test("feedback integration contract requires the platform feedback engine", () => {
  assert.deepEqual(PLATFORM_FEEDBACK_INTEGRATION, {
    allowedSeverities: ["success", "error", "warning", "info", "loading", "progress"],
    directToastImportsAllowed: false,
    engine: "platform.feedback",
    source: "runtime",
  });
});
