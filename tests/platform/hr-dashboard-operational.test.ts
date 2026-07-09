import assert from "node:assert/strict";
import test from "node:test";

import type { HrDashboardActionQueueItem, HrDashboardMetrics } from "@/features/hr/application/types/hr-ui.types";
import { hrMetricHelp } from "@/features/hr/application/hr-help-content";

const OPERATIONAL_METRIC_KEYS = [
  "pendingLeaveApprovals",
  "employeesOnLeaveToday",
  "openAttendanceExceptionsToday",
  "pendingOvertimeCandidates",
  "pendingLateEarlyViolations",
  "openPayrollPeriods",
  "temporaryAssignmentsActive",
  "upcomingBirthdays",
  "workAnniversariesThisMonth",
] as const satisfies readonly (keyof HrDashboardMetrics)[];

test("hr dashboard: operational metric keys are part of HrDashboardMetrics", () => {
  const sample: HrDashboardMetrics = {
    activeEmployees: 0,
    contractsExpiringSoon: 0,
    documentsExpiringSoon: 0,
    employeesWithMissingDocuments: 0,
    employeesOnLeaveToday: 0,
    newHires: 0,
    onProbation: 0,
    openAttendanceExceptionsToday: 0,
    openPayrollPeriods: 0,
    openVacancies: 0,
    payrollReadinessIssues: 0,
    pendingApprovals: 0,
    pendingHrRequests: 0,
    pendingLateEarlyViolations: 0,
    pendingLeaveApprovals: 0,
    pendingOvertimeCandidates: 0,
    temporaryAssignmentsActive: 0,
    totalEmployees: 0,
    upcomingBirthdays: 0,
    workAnniversariesThisMonth: 0,
  };

  for (const key of OPERATIONAL_METRIC_KEYS) {
    assert.equal(typeof sample[key], "number", `Expected numeric metric for ${key}`);
  }
});

test("hr dashboard: operational metrics have bilingual help entries", () => {
  for (const key of OPERATIONAL_METRIC_KEYS) {
    assert.ok(hrMetricHelp[key], `Missing help content for ${key}`);
    assert.ok(hrMetricHelp[key].en.length > 0, `Missing English help for ${key}`);
    assert.ok(hrMetricHelp[key].ar.length > 0, `Missing Arabic help for ${key}`);
  }
});

test("hr dashboard: action queue item kinds include operational workflows", () => {
  const kinds: HrDashboardActionQueueItem["kind"][] = ["leave", "hr_request", "overtime", "late_early"];
  assert.equal(kinds.length, 4);
});

test("hr dashboard: loader exports expanded workspace shape", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-dashboard.loader");
  assert.equal(typeof loader.loadHrDashboardWorkspace, "function");

  type DashboardData = Awaited<ReturnType<typeof loader.loadHrDashboardWorkspace>>;
  const requiredKeys: (keyof DashboardData)[] = [
    "actionQueue",
    "alerts",
    "metrics",
    "pendingApprovals",
    "recentChanges",
    "upcomingBirthdays",
    "workAnniversaries",
  ];

  const shape = Object.fromEntries(requiredKeys.map((key) => [key, true])) as Record<keyof DashboardData, true>;
  assert.equal(requiredKeys.length, Object.keys(shape).length);
});

test("hr dashboard: executive and department loaders are exported", async () => {
  const loader = await import("@/features/hr/routes/loaders/hr-dashboard.loader");
  assert.equal(typeof loader.loadHrExecutiveDashboardWorkspace, "function");
  assert.equal(typeof loader.loadHrDepartmentDashboardWorkspace, "function");

  type ExecutiveData = Awaited<ReturnType<typeof loader.loadHrExecutiveDashboardWorkspace>>;
  const executiveKeys: (keyof ExecutiveData)[] = ["actionQueue", "alerts", "metrics", "payrollRuns"];
  assert.equal(executiveKeys.length, 4);

  type DepartmentData = Awaited<ReturnType<typeof loader.loadHrDepartmentDashboardWorkspace>>;
  const departmentKeys: (keyof DepartmentData)[] = [
    "activeEmployees",
    "departments",
    "pendingLateEarlyViolations",
    "pendingLeaveApprovals",
    "pendingOvertimeCandidates",
    "unassignedActiveEmployees",
  ];
  assert.equal(departmentKeys.length, 6);
});
