import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildNavigationSections,
  filterNavigationSections,
  getVisibleNavigationItems,
  sortNavigationItems,
  workspaceNavItemToNavigationItem,
  workspaceNavItemsToNavigationItems,
  WORKSPACE_NAV_GROUP_LABELS,
} from "@/shared/ui/app-shell/workspace-navigation.logic";
import type { WorkspaceNavigationItem } from "@/shared/ui/app-shell/workspace-navigation.types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const sampleItems: readonly WorkspaceNavigationItem[] = [
  { group: "overview", id: "dashboard", isActive: true, route: "/erp/hr", title: "HR Dashboard" },
  { group: "attendance", id: "leave", route: "/erp/hr/leave", title: "Leave Management" },
  { group: "payroll", id: "payroll", route: "/erp/hr/payroll-readiness", title: "Payroll Readiness" },
  { group: "attendance", hidden: true, id: "hidden", route: "/erp/hr/hidden", title: "Hidden" },
];

test("workspace navigation utils group and filter items", () => {
  assert.equal(getVisibleNavigationItems(sampleItems).length, 3);
  const sections = buildNavigationSections(sampleItems, ["payroll"]);
  assert.deepEqual(
    sections.map((section) => section.key),
    ["overview", "attendance", "payroll"],
  );
  assert.equal(WORKSPACE_NAV_GROUP_LABELS.payroll, "Payroll");

  const filtered = filterNavigationSections(sections, "pay");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.key, "payroll");

  const sorted = sortNavigationItems(
    [
      { id: "b", route: "/b", title: "Beta" },
      { id: "a", route: "/a", title: "Alpha", priority: 1 },
    ],
    ["b"],
  );
  assert.equal(sorted[0]?.id, "b");
});

test("workspace nav item adapters preserve metadata", () => {
  const converted = workspaceNavItemToNavigationItem({
    badge: { count: 3, variant: "approval" },
    fullLabel: "Daily Production Report",
    group: "operations",
    href: "/erp/manufacturing/daily-reports",
    isActive: true,
    key: "dpr",
    label: "DPR",
    priority: 5,
  });
  assert.equal(converted.id, "dpr");
  assert.equal(converted.fullTitle, "Daily Production Report");
  assert.equal(converted.group, "operations");
  assert.equal(converted.badge?.count, 3);

  const roundTrip = workspaceNavItemsToNavigationItems([
    {
      href: "/erp/finance",
      isActive: true,
      key: "dashboard",
      label: "Dashboard",
    },
  ]);
  assert.equal(roundTrip[0]?.route, "/erp/finance");
});

test("enterprise workspace navigation component implements adaptive behavior", () => {
  const component = read("src/shared/ui/app-shell/enterprise-workspace-navigation.tsx");
  const types = read("src/shared/ui/app-shell/workspace-navigation.types.ts");
  const wrapper = read("src/shared/ui/app-shell/workspace-nav.tsx");

  assert.match(component, /EnterpriseWorkspaceNavigation/);
  assert.match(component, /GroupNavigationControl/);
  assert.match(component, /DropdownMenu/);
  assert.match(component, /workspace\.nav\.quickAccess/);
  assert.match(component, /workspace\.nav\.searchSections/);
  assert.match(component, /workspace\.nav\.recent/);
  assert.match(component, /workspace\.nav\.favorites/);
  assert.match(component, /NavigationBadge/);
  assert.match(component, /lg:hidden/);
  assert.doesNotMatch(component, /MoreHorizontal/);
  assert.doesNotMatch(component, />\s*More\s*</);

  assert.match(types, /WorkspaceNavigationItem/);
  assert.match(types, /WorkspaceNavigationGroupKey/);
  assert.match(types, /WorkspaceNavigationBadge/);
  assert.match(wrapper, /EnterpriseWorkspaceNavigation/);
});

test("hr navigation declares platform section groups", () => {
  const hrNav = read("src/features/hr/navigation/hr-navigation.ts");
  assert.match(hrNav, /group: "overview"/);
  assert.match(hrNav, /group: "attendance"/);
  assert.match(hrNav, /group: "financial"/);
  assert.match(hrNav, /group: "talent"/);
  assert.match(hrNav, /group: "reports"/);
  assert.match(hrNav, /group: "administration"/);
  assert.doesNotMatch(hrNav, /MoreHorizontal/);
});

test("app shell exports enterprise workspace navigation", () => {
  const index = read("src/shared/ui/app-shell/index.ts");
  assert.match(index, /EnterpriseWorkspaceNavigation/);
  assert.match(index, /WorkspaceNavigationItem/);
  assert.match(index, /WORKSPACE_NAV_GROUP_ICONS/);
});
