import assert from "node:assert/strict";
import test from "node:test";

import { buildErpSidebarGroups } from "@/shared/workspace/erp-navigation";

test("ERP sidebar exposes ready platform capability pages", () => {
  const groups = buildErpSidebarGroups("/erp/feature-flags");
  const platform = groups.find((group) => group.key === "administration");

  if (!platform) assert.fail("Platform navigation group was not found.");
  const sections = platform.sections;
  if (!sections) assert.fail("Platform navigation group has no sections.");
  assert.equal(platform.label, "Platform");
  assert.equal(platform.status, "ready");
  assert.equal(platform.isActive, true);
  assert.deepEqual(
    sections[0]?.items.map((item) => ({
      href: item.href,
      isActive: item.isActive,
      isDisabled: item.isDisabled,
      key: item.key,
    })),
    [
      { href: "/erp/dashboard", isActive: false, isDisabled: false, key: "platform.dashboard" },
      { href: "/erp/reports", isActive: false, isDisabled: false, key: "platform.reports" },
      { href: "/erp/settings", isActive: false, isDisabled: false, key: "platform.settings" },
      { href: "/erp/feature-flags", isActive: true, isDisabled: false, key: "platform.feature-flags" },
      { href: "/erp/notifications", isActive: false, isDisabled: false, key: "platform.notifications" },
    ],
  );
});

test("ERP sidebar separates ready administration pages from planned ones", () => {
  const groups = buildErpSidebarGroups("/erp/settings");
  const platform = groups.find((group) => group.key === "administration");
  if (!platform) assert.fail("Platform navigation group was not found.");
  const sections = platform.sections;
  if (!sections) assert.fail("Platform navigation group has no sections.");
  const adminSection = sections.find((section) => section.key === "administration");

  assert.ok(adminSection);
  const readyAdminKeys = adminSection.items
    .filter((item) => !item.isDisabled)
    .map((item) => item.key);
  const plannedAdminKeys = adminSection.items
    .filter((item) => item.isDisabled)
    .map((item) => item.key);

  assert.deepEqual(readyAdminKeys, [
    "admin.users",
    "admin.roles",
    "admin.permissions",
    "admin.invitations",
    "admin.access",
  ]);
  assert.deepEqual(plannedAdminKeys, [
    "admin.companies",
    "admin.branches",
    "admin.audit",
    "admin.localization",
  ]);
  assert.equal(adminSection.items.filter((item) => item.isDisabled).every((item) => item.href === undefined), true);
});
