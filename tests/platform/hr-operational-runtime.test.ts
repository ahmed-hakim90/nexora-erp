import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { calculateEgyptPayrollBreakdown } from "@/features/hr/application/services/hr-payroll-egypt.service";
import { HR_NAV_ITEMS } from "@/features/hr/navigation/hr-navigation";
import { HR_PERMISSIONS } from "@/features/hr/permissions/permission-registry";

describe("HR operational runtime", () => {
  test("Egypt payroll breakdown applies social insurance and tax", () => {
    const result = calculateEgyptPayrollBreakdown(20000, 500);
    assert.equal(result.currency, "EGP");
    assert.ok(result.employeeSocialInsurance > 0);
    assert.ok(result.incomeTax >= 0);
    assert.equal(result.netPay, result.grossEarnings - result.totalDeductions);
  });

  test("HR navigation includes operational sprint routes", () => {
    const hrefs = new Set(HR_NAV_ITEMS.map((item) => item.href));
    assert.ok(hrefs.has("/erp/hr/attendance-devices"));
    assert.ok(hrefs.has("/erp/hr/overtime"));
    assert.ok(hrefs.has("/erp/hr/recruitment"));
    assert.ok(hrefs.has("/erp/hr/dashboards/executive"));
    assert.ok(hrefs.has("/erp/hr/dashboards/department"));
    assert.ok(hrefs.has("/erp/hr/skills-competencies/skills"));
  });

  test("portal leave runtime ships ESS submit and MSS approve actions", () => {
    const actionsSource = fs.readFileSync(
      path.join(process.cwd(), "src/features/hr/routes/actions/hr-portal.actions.ts"),
      "utf8",
    );
    assert.match(actionsSource, /createPortalLeaveRequestAction/);
    assert.match(actionsSource, /approvePortalLeaveRequestAction/);
    assert.match(actionsSource, /rejectPortalLeaveRequestAction/);
    assert.equal(HR_PERMISSIONS.leaveManageSelf, "hr.leave.manage_self");
  });

  test("portal leave migration defines self-service RLS", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260722120000_hr_portal_leave_runtime.sql"),
      "utf8",
    );
    assert.match(sql, /hr\.leave\.manage_self/);
    assert.match(sql, /hr_leave_requests_self_insert/);
    assert.match(sql, /hr_leave_requests_manager_update/);
  });
});
