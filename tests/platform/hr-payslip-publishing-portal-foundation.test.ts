import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayslipSecureAccessContract,
  createHrPayslipVisibilityRule,
  defineHrEmployeePayrollPortalPreferences,
  defineHrPayslipPublication,
  HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_KINDS,
  HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_READINESS,
  HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS,
  HR_EMPLOYEE_PAYROLL_PORTAL_SURFACES,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYSLIP_PUBLICATION_ACTIONS,
  HR_PAYSLIP_PUBLICATION_SCOPES,
  HR_PAYSLIP_PUBLISHING_AUDIT_ACTIONS,
  HR_PAYSLIP_PUBLISHING_ENGINE_BOUNDARY_CONTRACT,
  HR_PAYSLIP_PUBLISHING_EVENT_DEFINITIONS,
  HR_PAYSLIP_PUBLISHING_EXPORT_CONTRACT,
  HR_PAYSLIP_PUBLISHING_FOUNDATION_TABLES,
  HR_PAYSLIP_PUBLISHING_IMPORT_CONTRACT,
  HR_PAYSLIP_PUBLISHING_NOTIFICATION_INTEGRATION_CONTRACT,
  HR_PAYSLIP_PUBLISHING_OBSERVABILITY_CONTRACT,
  HR_PAYSLIP_PUBLISHING_PERMISSION_METADATA,
  HR_PAYSLIP_PUBLISHING_PLATFORM_INTEGRATION,
  HR_PAYSLIP_PUBLISHING_RELATED_TABLES,
  HR_PAYSLIP_PUBLISHING_REPORT_READINESS,
  HR_PAYSLIP_PUBLISHING_SECURITY_MODEL,
  HR_PAYSLIP_PUBLISHING_STATUSES,
  HR_PAYSLIP_PUBLISHING_VALIDATION_RULES,
  HR_PAYSLIP_PUBLISHING_VISIBILITY_MODEL,
  HR_PAYSLIP_SECURE_ACCESS_MODES,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  HR_SEARCH_PROVIDER_CONTRACT,
  payslipIsVisibleToEmployee,
  payslipPublishingStatusAllowsPublish,
  payslipPublishingValidationPasses,
  hrAppManifest,
} from "@/features/hr/public-api";
import { validateAppManifest, defineAppManifest, type AppManifest } from "@/platform/app-registry/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260708120000_hr_payslip_publishing_portal_foundation.sql");

const platformManifest = defineAppManifest({
  capabilities: [],
  category: "platform",
  commands: [],
  dashboards: [],
  dependencies: [],
  description: "Platform v1.0 registry placeholder for app dependency validation.",
  experiences: ["erp"],
  key: "platform",
  name: "Platform",
  navigation: [],
  permissions: [],
  prints: [],
  quickActions: [],
  reports: [],
  routes: [],
  sensitiveData: "restricted",
  settings: [],
  version: "1.0.0",
} satisfies AppManifest);

test("publishing lifecycle statuses, scopes, and actions are registered", () => {
  assert.equal(HR_PAYSLIP_PUBLISHING_STATUSES.length, 6);
  assert.equal(HR_PAYSLIP_PUBLICATION_SCOPES.length, 3);
  assert.equal(HR_PAYSLIP_PUBLICATION_ACTIONS.length, 4);
  assert.equal(HR_PAYSLIP_SECURE_ACCESS_MODES.length, 3);
  assert.equal(HR_EMPLOYEE_PAYROLL_PORTAL_SURFACES.length, 5);
  assert.equal(HR_PAYSLIP_PUBLISHING_VALIDATION_RULES.length, 10);
  assert.equal(HR_PAYSLIP_PUBLISHING_ENGINE_BOUNDARY_CONTRACT.publishingIndependentFromCalculation, true);
  assert.equal(HR_PAYSLIP_PUBLISHING_ENGINE_BOUNDARY_CONTRACT.neverExposeDraftUnapprovedOrUnpublishedPayroll, true);
});

test("publishing validation and visibility rules enforce published-only employee access", () => {
  assert.equal(
    payslipPublishingValidationPasses({
      blockingExceptionsCleared: true,
      employeeActive: true,
      payrollApproved: true,
      payslipGenerated: true,
      validationPassed: true,
    }),
    true
  );
  assert.equal(
    payslipPublishingValidationPasses({
      blockingExceptionsCleared: false,
      employeeActive: true,
      payrollApproved: true,
      payslipGenerated: true,
      validationPassed: true,
    }),
    false
  );
  assert.equal(
    payslipIsVisibleToEmployee(
      createHrPayslipVisibilityRule({
        adminAccessRespectsSecurityEngine: true,
        employeeHasPermission: true,
        employeeOwnsPayslip: true,
        payrollApproved: true,
        payslipPublished: true,
      })
    ),
    true
  );
  assert.equal(
    payslipIsVisibleToEmployee(
      createHrPayslipVisibilityRule({
        adminAccessRespectsSecurityEngine: true,
        employeeHasPermission: true,
        employeeOwnsPayslip: true,
        payrollApproved: true,
        payslipPublished: false,
      })
    ),
    false
  );
  assert.equal(payslipPublishingStatusAllowsPublish("pending_publish"), true);
  assert.equal(payslipPublishingStatusAllowsPublish("published"), false);
});

test("payslip publication contract remains independent from PDF and delivery runtime", () => {
  const publication = defineHrPayslipPublication({
    blockingExceptionsCleared: true,
    branchId: null,
    companyId: "company-1",
    correlationId: "corr-publish-1",
    emailDeliveryImplemented: false,
    employeeActive: true,
    employeeId: "employee-1",
    payrollApproved: true,
    payrollRunId: "run-1",
    payslipGenerated: true,
    payslipId: "payslip-1",
    pdfRenderingImplemented: false,
    publicationAction: "publish",
    publicationScope: "payroll_run",
    publishedAt: "2026-03-01T10:00:00.000Z",
    publishedBy: "user-1",
    publishingRuntimeImplemented: false,
    publishingStatus: "published",
    tenantId: "tenant-1",
    validationPassed: true,
  });

  assert.equal(publication.publishingRuntimeImplemented, false);
  assert.equal(publication.pdfRenderingImplemented, false);
  assert.equal(publication.emailDeliveryImplemented, false);
});

test("employee payroll portal contracts expose published payroll surfaces only", () => {
  assert.equal(HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS.length, 5);
  assert.equal(HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS.every((contract) => contract.consumesPublishedPayrollOnly), true);
  assert.equal(HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS.every((contract) => contract.exposesDraftPayroll === false), true);
  assert.equal(HR_EMPLOYEE_PAYROLL_PORTAL_CONTRACTS.every((contract) => contract.portalUiImplemented === false), true);

  const preferences = defineHrEmployeePayrollPortalPreferences({
    branchId: null,
    companyId: "company-1",
    consumesPublishedPayrollOnly: true,
    employeeId: "employee-1",
    employeePortalUiImplemented: false,
    notificationPreferences: { payslipPublished: true },
    portalEnabled: true,
    preferredLanguage: "en",
    tenantId: "tenant-1",
    userId: "user-1",
  });

  assert.equal(preferences.consumesPublishedPayrollOnly, true);
  assert.equal(preferences.employeePortalUiImplemented, false);
});

test("secure access and acknowledgement readiness remain contract-only", () => {
  const access = createHrPayslipSecureAccessContract({
    accessMode: "temporary_access",
    employeeId: "employee-1",
    expiresAt: "2026-03-02T10:00:00.000Z",
    payslipId: "payslip-1",
  });

  assert.equal(access.authRuntimeImplemented, false);
  assert.equal(access.revocable, true);
  assert.equal(HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_KINDS.length, 3);
  assert.equal(HR_EMPLOYEE_PAYROLL_ACKNOWLEDGEMENT_READINESS.every((item) => item.runtimeTrackingImplemented === false), true);
  assert.equal(HR_PAYSLIP_PUBLISHING_NOTIFICATION_INTEGRATION_CONTRACT.emailDeliveryImplemented, false);
  assert.equal(HR_PAYSLIP_PUBLISHING_NOTIFICATION_INTEGRATION_CONTRACT.directEngineCoupling, false);
});

test("search registration, permissions, security model, and foundation contracts include payslip publishing", () => {
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_payslip_publication"), true);
  assert.equal(HR_SEARCH_PROVIDER_CONTRACT.entityTypes.includes("hr_employee_payroll_portal_preference"), true);
  assert.equal(HR_PAYSLIP_PUBLISHING_PERMISSION_METADATA.length, 5);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payslipsUnpublish), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payslipsAuditView), true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayslipPublishingPortalFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsSelfServicePortal, false);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayroll, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payslipPublishingTables, HR_PAYSLIP_PUBLISHING_FOUNDATION_TABLES);
  assert.equal(HR_FOUNDATION_CONTRACTS.payslipPublishingRelatedTables, HR_PAYSLIP_PUBLISHING_RELATED_TABLES);
  assert.equal(HR_PAYSLIP_PUBLISHING_VISIBILITY_MODEL.payslipPublishedRequired, true);
  assert.equal(HR_PAYSLIP_PUBLISHING_SECURITY_MODEL.publishedPayrollOnlyForEmployees, true);
  assert.equal(HR_PAYSLIP_PUBLISHING_IMPORT_CONTRACT.key, "hr.payslip.publishing.import");
  assert.equal(HR_PAYSLIP_PUBLISHING_EXPORT_CONTRACT.key, "hr.payslip.publishing.export");
  assert.equal(HR_PAYSLIP_PUBLISHING_PLATFORM_INTEGRATION.notificationReadinessRegistered, true);
  assert.equal(HR_PAYSLIP_PUBLISHING_REPORT_READINESS.dashboardDatasets.length, 3);
  assert.equal(HR_PAYSLIP_PUBLISHING_EVENT_DEFINITIONS.length, 6);
  assert.equal(HR_PAYSLIP_PUBLISHING_AUDIT_ACTIONS.payslipPublished, "hr.payslip.publishing.published");
  assert.equal(HR_PAYSLIP_PUBLISHING_OBSERVABILITY_CONTRACT.publishedByField, "published_by");
  assert.equal(validateAppManifest(hrAppManifest, [platformManifest, hrAppManifest]).valid, true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payslip-publishing-foundation"), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.employee-payroll-portal-foundation"), true);
});

test("payslip publishing migration defines tables, RLS, self-scope policies, and out-of-scope guards", () => {
  const migration = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYSLIP_PUBLISHING_FOUNDATION_TABLES) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, "i"));
  }

  assert.match(migration, /hr\.payslips\.unpublish/);
  assert.match(migration, /hr\.payslips\.audit\.view/);
  assert.match(migration, /hr\.payslips\.view_self/);
  assert.match(migration, /publishing_status = 'published'/);
  assert.match(migration, /references public\.hr_payslips/i);
  assert.match(migration, /pdf_rendering_implemented', false/);
  assert.match(migration, /employee_portal_ui_implemented', false/);
  assert.doesNotMatch(migration, /create table public\.hr_gosi/i);
  assert.doesNotMatch(migration, /render_payslip_pdf/i);
  assert.doesNotMatch(migration, /send_email/i);
  assert.doesNotMatch(migration, /send_whatsapp/i);
  assert.doesNotMatch(migration, /whatsapp_delivery/i);
});

test("payslip publishing public contracts do not implement PDF, delivery, or portal UI runtime", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payslip-publishing-portal-foundation.ts"), "utf8");

  for (const forbidden of [
    "renderPayslipPdf",
    "sendPayslipEmail",
    "sendPayslipSms",
    "sendWhatsAppMessage",
    "executePublishingRuntime",
    "renderEmployeePortalUi",
    "digitalSignatureRuntime",
  ]) {
    assert.equal(source.includes(forbidden), false, `Payslip publishing foundation must not include ${forbidden}`);
  }
});
