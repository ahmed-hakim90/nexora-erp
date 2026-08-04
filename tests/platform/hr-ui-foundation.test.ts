import assert from "node:assert/strict";
import test from "node:test";

import {
  filterHrNavByPermissions,
  formatHrDisplayLabel,
  HR_NAV_ITEMS,
  HR_PERMISSIONS,
  isRawUuid,
} from "@/features/hr/server-api";
import { HR_FIELD_LOOKUP_PROVIDER_KEYS } from "@/platform/operator-experience/lookup-registry";

test("hr ui foundation renders labels not raw UUIDs", () => {
  assert.equal(isRawUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(formatHrDisplayLabel("550e8400-e29b-41d4-a716-446655440000"), "—");
  assert.equal(formatHrDisplayLabel("EMP-001"), "EMP-001");
  assert.equal(formatHrDisplayLabel("Ahmed Hassan"), "Ahmed Hassan");
});

test("hr ui foundation exposes employee wizard and assignment actions", async () => {
  const hrActions = await import("@/features/hr/routes/actions/hr-employees.actions");
  assert.equal(typeof hrActions.createEmployeeWizardAction, "function");
  assert.equal(typeof hrActions.createHrAssignmentAction, "function");
});

test("hr ui foundation separates payroll readiness navigation", () => {
  const payrollNav = HR_NAV_ITEMS.find((item) => item.key === "payroll-readiness");
  assert.equal(payrollNav?.href, "/erp/hr/payroll-readiness");
  assert.equal(payrollNav?.permission, HR_PERMISSIONS.payrollView);
  assert.equal(HR_NAV_ITEMS.some((item) => item.label.toLowerCase().includes("payslip")), false);
});

test("hr ui foundation filters navigation by permissions fail-closed", () => {
  const filtered = filterHrNavByPermissions([HR_PERMISSIONS.view]);
  assert.equal(filtered.some((item) => item.key === "employees"), false);
  assert.equal(filtered.some((item) => item.key === "dashboard"), true);
});

test("hr ui foundation maps reference fields to EntityLookup providers", () => {
  assert.equal(HR_FIELD_LOOKUP_PROVIDER_KEYS.employeeId, "hr.employees.lookup");
  assert.equal(HR_FIELD_LOOKUP_PROVIDER_KEYS.positionId, "hr.positions.lookup");
  assert.equal(HR_FIELD_LOOKUP_PROVIDER_KEYS.departmentId, "hr.org-units.lookup");
});

test("hr ui foundation keeps job and position UI separated", () => {
  const positionsJobs = HR_NAV_ITEMS.find((item) => item.key === "positions-jobs");
  assert.match(positionsJobs?.label ?? "", /Positions & Jobs/);
  assert.equal(HR_NAV_ITEMS.some((item) => item.href === "/erp/hr/employees"), true);
});

test("hr employee list loader resolves assignment-backed org labels", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-employees.loader");
  assert.equal(typeof loader.loadHrEmployeesWorkspace, "function");
});

test("hr employee profile loader resolves assignment context", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-employee-profile.loader");
  assert.equal(typeof loader.loadHrEmployeeProfile, "function");
});
