import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { HR_PERMISSIONS } from "@/features/hr/server-api";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20260719120000_hr_portal_self_service_rls.sql");
const middlewarePath = path.join(root, "src/middleware.ts");
const authServerPath = path.join(root, "src/platform/auth/server.ts");
const portalLoaderPath = path.join(root, "src/features/hr/routes/loaders/hr-portal.loader.ts");
const portalLayoutPath = path.join(root, "src/app/(portal)/portal/layout.tsx");

test("portal self-service migration adds ESS and MSS RLS policies", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  for (const fragment of [
    "hr.employees.view_self",
    "hr.leave.view_self",
    "hr.attendance.view_self",
    "hr.documents.view_self",
    "hr.requests.view_self",
    "hr_employees_self_select",
    "hr_leave_requests_self_select",
    "hr_attendance_days_self_select",
    "file_attachments_hr_documents_self_select",
    "hr_payslip_publications_self_select",
    "hr_employees_manager_team_select",
    "hr_leave_requests_manager_select",
    "platform.portal.access",
  ]) {
    assert.match(sql, new RegExp(fragment.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(sql, /hr\.leave\.view', tenant_id\)/);
});

test("portal middleware protects /portal routes", () => {
  const source = fs.readFileSync(middlewarePath, "utf8");
  assert.match(source, /\/portal\/:path\*/);
});

test("portal layout requires platform portal access", () => {
  const source = fs.readFileSync(portalLayoutPath, "utf8");
  assert.match(source, /accessPortal/);
  assert.match(source, /resolveTenantRequestContext\("portal"\)/);
});

test("employee request context resolves linked employee record", () => {
  const source = fs.readFileSync(authServerPath, "utf8");
  assert.match(source, /resolveLinkedEmployeeId/);
  assert.match(source, /getCurrentEmployee\(\)/);
  assert.match(source, /\.eq\("user_id", context\.userId\)/);
});

test("portal loader scopes manager queries to assignment engine direct reports", () => {
  const source = fs.readFileSync(portalLoaderPath, "utf8");
  assert.match(source, /resolveManagerDirectReportIds/);
  assert.match(source, /assignment_type", "manager"/);
  assert.match(source, /reference_entity_id", context\.employeeId/);
  assert.match(source, /loadPortalPayslips/);
  assert.match(source, /net_amount_metadata/);
  assert.match(source, /period_name/);
});

test("portal permission registry includes self-service keys", () => {
  assert.equal(HR_PERMISSIONS.employeesViewSelf, "hr.employees.view_self");
  assert.equal(HR_PERMISSIONS.leaveViewSelf, "hr.leave.view_self");
  assert.equal(HR_PERMISSIONS.attendanceViewSelf, "hr.attendance.view_self");
  assert.equal(HR_PERMISSIONS.documentsViewSelf, "hr.documents.view_self");
  assert.equal(HR_PERMISSIONS.requestsViewSelf, "hr.requests.view_self");
});

test("duplicate migration timestamp for attendance devices is resolved", () => {
  const migrationsDir = path.join(root, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));
  const attendanceDeviceMigrations = files.filter((file) => file.includes("hr_attendance_device_center_runtime"));
  assert.equal(attendanceDeviceMigrations.length, 1);
  assert.match(attendanceDeviceMigrations[0] ?? "", /20260718130000/);
});
