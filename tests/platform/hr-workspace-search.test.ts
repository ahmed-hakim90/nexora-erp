import assert from "node:assert/strict";
import test from "node:test";

import { HR_PERMISSIONS } from "@/features/hr/permissions/permission-registry";
import {
  createHrNavigationSearchProvider,
  createHrOperationalShortcutSearchProvider,
  createHrWorkspaceSearchProviders,
} from "@/features/hr/navigation/hr-workspace-search";
import { normalizeSearchQuery } from "@/platform/search/public-api";
import { createWorkspaceSearchRegistry, runWorkspaceSearch } from "@/shared/workspace/workspace-search";

const searchContext = {
  branchId: "branch-1",
  companyId: "company-1",
  experience: "erp" as const,
  grantedPermissions: new Set([
    HR_PERMISSIONS.view,
    HR_PERMISSIONS.leaveView,
    HR_PERMISSIONS.payrollView,
    HR_PERMISSIONS.searchView,
    HR_PERMISSIONS.employeesView,
  ]),
  tenantId: "tenant-1",
};

test("hr workspace search providers expose navigation and operational shortcuts", async () => {
  const providers = createHrWorkspaceSearchProviders();
  assert.equal(providers.length, 3);
  assert.ok(providers.some((provider) => provider.key === "hr.navigation.search"));
  assert.ok(providers.some((provider) => provider.key === "hr.operations.shortcuts"));
  assert.ok(providers.some((provider) => provider.key === "hr.runtime.records"));
});

test("hr navigation search finds leave and payroll routes", async () => {
  const provider = createHrNavigationSearchProvider();
  const query = normalizeSearchQuery({ experience: "erp", term: "leave" });
  const results = provider.search?.(query, searchContext) ?? [];
  assert.ok(results.some((result) => result.href === "/erp/hr/leave"));
});

test("hr operational shortcuts find payroll readiness", async () => {
  const provider = createHrOperationalShortcutSearchProvider();
  const query = normalizeSearchQuery({ experience: "erp", term: "payroll" });
  const results = provider.search?.(query, searchContext) ?? [];
  assert.ok(results.some((result) => result.href === "/erp/hr/payroll-readiness"));
});

test("hr runtime record search provider indexes operational entities", () => {
  const provider = createHrWorkspaceSearchProviders().find((item) => item.key === "hr.runtime.records");
  assert.ok(provider);
  assert.ok(provider?.entityTypes.includes("hr_leave_request"));
  assert.ok(provider?.entityTypes.includes("hr_overtime_candidate"));
  assert.ok(provider?.entityTypes.includes("hr_late_early_violation"));
});

test("workspace search registry includes hr providers", async () => {
  const registry = createWorkspaceSearchRegistry({
    additionalProviders: createHrWorkspaceSearchProviders(),
    apps: [],
    commands: [],
    navigation: [],
  });

  const page = await runWorkspaceSearch(
    registry,
    { experience: "erp", term: "dashboard", tenantId: "tenant-1" },
    searchContext,
  );

  assert.ok(page.records.some((result) => result.href === "/erp/hr"));
});
