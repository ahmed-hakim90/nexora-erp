import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createHrPayrollDownloadAuthorizationContract,
  createHrPayrollEmployeePayslipVisibilityRule,
  createHrPayrollSecureAccessTokenContract,
  employeePayslipVisibilityPasses,
  HR_FOUNDATION_CONTRACTS,
  HR_OPERATIONAL_BOUNDARY_CONTRACT,
  HR_PAYROLL_ESS_READINESS_CONTRACT,
  HR_PAYROLL_MSS_READINESS_CONTRACT,
  HR_PAYROLL_PORTAL_NOTIFICATION_READINESS_CONTRACT,
  HR_PAYROLL_PORTAL_SECURITY_AUDIT_ACTIONS,
  HR_PAYROLL_PORTAL_SECURITY_EVENT_DEFINITIONS,
  HR_PAYROLL_PORTAL_SECURITY_FOUNDATION_TABLES,
  HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT,
  HR_PAYROLL_PORTAL_SECURITY_RELATED_TABLES,
  HR_PAYROLL_PORTAL_SECURITY_VALIDATION_RULES,
  HR_PAYROLL_SENSITIVE_FIELD_REGISTRY,
  HR_PERMISSION_LIST,
  HR_PERMISSIONS,
  secureAccessTokenAllowsRead,
  hrAppManifest,
} from "@/features/hr/public-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260712120000_hr_payroll_portal_security_readiness_foundation.sql");

test("portal security validation rules and sensitive field registry are registered", () => {
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_VALIDATION_RULES.length, 6);
  assert.equal(HR_PAYROLL_SENSITIVE_FIELD_REGISTRY.length, 5);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_RELATED_TABLES.length, 2);
});

test("employee payslip visibility requires publication and blocks draft exposure", () => {
  assert.equal(
    employeePayslipVisibilityPasses(
      createHrPayrollEmployeePayslipVisibilityRule({
        adminAccessRespectsSecurityEngine: true,
        employeeHasPermission: true,
        employeeOwnsPayslip: true,
        exposesDraftPayroll: false,
        exposesUnapprovedPayroll: false,
        exposesUnpublishedPayroll: false,
        payrollApproved: true,
        payslipPublished: true,
        portalSecurityReadinessEnforced: true,
      }),
    ),
    true,
  );
  assert.equal(
    employeePayslipVisibilityPasses(
      createHrPayrollEmployeePayslipVisibilityRule({
        adminAccessRespectsSecurityEngine: true,
        employeeHasPermission: true,
        employeeOwnsPayslip: true,
        exposesDraftPayroll: false,
        exposesUnapprovedPayroll: false,
        exposesUnpublishedPayroll: false,
        payrollApproved: true,
        payslipPublished: false,
        portalSecurityReadinessEnforced: true,
      }),
    ),
    false,
  );
});

test("secure access token and download authorization extend Sprint 18 without auth runtime", () => {
  const token = createHrPayrollSecureAccessTokenContract({
    employeeId: "employee-1",
    expiresAt: "2026-12-31T23:59:59.000Z",
    payslipId: "payslip-1",
    tokenKind: "download_authorization",
  });

  const download = createHrPayrollDownloadAuthorizationContract({
    employeeId: "employee-1",
    payslipId: "payslip-1",
  });

  assert.equal(token.extendsSprint18SecureAccess, true);
  assert.equal(token.authRuntimeImplemented, false);
  assert.equal(download.downloadRuntimeImplemented, false);
  assert.equal(secureAccessTokenAllowsRead({ status: "active" }), true);
  assert.equal(secureAccessTokenAllowsRead({ status: "revoked" }), false);
});

test("ESS and MSS readiness contracts remain UI-free", () => {
  assert.equal(HR_PAYROLL_ESS_READINESS_CONTRACT.essUiImplemented, false);
  assert.equal(HR_PAYROLL_ESS_READINESS_CONTRACT.consumesPublishedPayrollOnly, true);
  assert.equal(HR_PAYROLL_MSS_READINESS_CONTRACT.mssUiImplemented, false);
  assert.equal(HR_PAYROLL_MSS_READINESS_CONTRACT.exposesIndividualPayslipNumbers, false);
  assert.equal(HR_PAYROLL_PORTAL_NOTIFICATION_READINESS_CONTRACT.notificationRuntimeImplemented, false);
});

test("portal security boundary builds on Sprint 18 without delivery runtime", () => {
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT.buildsOnSprint18PayslipPublishing, true);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT.neverExposeDraftUnapprovedOrUnpublishedPayroll, true);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT.emailDeliveryImplemented, false);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_READINESS_BOUNDARY_CONTRACT.authRewriteImplemented, false);
});

test("operational boundary registers portal security readiness foundation", () => {
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsPayrollPortalSecurityReadinessFoundation, true);
  assert.equal(HR_OPERATIONAL_BOUNDARY_CONTRACT.implementsSelfServicePortal, false);
  assert.equal(HR_FOUNDATION_CONTRACTS.payrollPortalSecurityBoundary.secureAccessTokensExtendSprint18, true);
});

test("portal security permissions, events, and manifest capabilities are registered", () => {
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollPortalSecurityView), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payslipsDownloadAuthorize), true);
  assert.equal(HR_PERMISSION_LIST.includes(HR_PERMISSIONS.payrollEssReadinessView), true);
  assert.equal(hrAppManifest.capabilities.some((capability) => capability.key === "hr.payroll-portal-security-readiness"), true);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_EVENT_DEFINITIONS.length, 5);
  assert.equal(HR_PAYROLL_PORTAL_SECURITY_AUDIT_ACTIONS.secureAccessTokenIssued, "hr.payroll.portal.secure-access-token.issued");
});

test("portal security migration adds foundation tables and RLS", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const table of HR_PAYROLL_PORTAL_SECURITY_FOUNDATION_TABLES) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  for (const fragment of [
    "extends_sprint18_secure_access', true",
    "auth_runtime_implemented', false",
    "hr.payroll.portal.security.view",
    "hr.payslips.download.authorize",
    "hr.payslips.access.revoke",
    "ess_mss_ui_implemented', false",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }
});

test("portal security public contracts do not implement UI or auth rewrite", () => {
  const source = fs.readFileSync(path.join(root, "src/features/hr/payroll-portal-security-readiness-foundation.ts"), "utf8");

  for (const forbidden of [
    "renderEssPortal",
    "renderMssPortal",
    "sendPayslipEmail",
    "rewriteAuthSession",
    "generatePdfPayslip",
  ]) {
    assert.equal(source.includes(forbidden), false, `Portal security foundation must not include ${forbidden}`);
  }
});
