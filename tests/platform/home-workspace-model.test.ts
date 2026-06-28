import assert from "node:assert/strict";
import test from "node:test";

import {
  FINANCE_PERMISSION_LIST,
  financeAppManifest,
} from "@/features/finance/public-api";
import {
  INVENTORY_PERMISSION_LIST,
  inventoryAppManifest,
} from "@/features/inventory/public-api";
import {
  MANUFACTURING_PERMISSION_LIST,
  manufacturingAppManifest,
} from "@/features/manufacturing/public-api";
import type { AppRegistrySnapshot } from "@/platform/app-registry/public-api";
import type { PermissionKey } from "@/platform/permissions/public-api";
import { WORKSPACE_APP_CATALOG } from "@/shared/workspace/app-catalog";
import { buildHomeWorkspace } from "@/shared/workspace/home-workspace-model";

const tenantId = "foundation-review-tenant";
const companyId = "foundation-company";
const branchId = "foundation-branch";
const manifests = [
  financeAppManifest,
  inventoryAppManifest,
  manufacturingAppManifest,
] as const;

const snapshot: AppRegistrySnapshot = {
  entitlements: manifests.map((manifest) => ({
    appKey: manifest.key,
    state: "enabled",
    tenantId,
  })),
  installedApps: manifests.map((manifest) => ({
    appKey: manifest.key,
    installedVersion: manifest.version,
    state: "enabled",
    tenantId,
  })),
  manifests,
};

const grantedPermissions = new Set<PermissionKey>([
  ...FINANCE_PERMISSION_LIST,
  ...INVENTORY_PERMISSION_LIST,
  ...MANUFACTURING_PERMISSION_LIST,
]);

test("home workspace model derives ready apps from accepted manifests", () => {
  const model = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions,
      tenantId,
    },
    preferences: {
      appOrder: ["manufacturing", "finance"],
      favoriteAppKeys: ["finance"],
      pinnedAppKeys: ["inventory"],
      recentApps: [
        {
          appKey: "manufacturing",
          label: "Manufacturing",
          openedAt: "2026-06-27T09:00:00.000Z",
        },
      ],
    },
    snapshot,
  });

  assert.equal(model.readyBusinessApps.length, 3);
  assert.deepEqual(
    model.readyBusinessApps.map((app) => app.key),
    ["manufacturing", "finance", "inventory"],
  );
  assert.equal(model.readyBusinessApps[0]?.source, "manifest");
  assert.equal(
    model.readyBusinessApps.find((app) => app.key === "finance")?.docsHref,
    "/erp/finance/documentation",
  );
  assert.equal(model.favoriteApps.some((app) => app.key === "finance"), true);
  assert.equal(model.pinnedApps.some((app) => app.key === "inventory"), true);
  assert.equal(model.recentApps[0]?.key, "manufacturing");
  assert.equal(model.openTabs.some((tab) => tab.key === "inventory"), true);
});

test("planned apps expose phase, dependencies, and estimated release metadata", () => {
  const model = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions,
      tenantId,
    },
    snapshot,
  });

  const purchasing = model.plannedBusinessApps.find((app) => app.key === "purchasing");

  assert.ok(purchasing);
  assert.equal(purchasing.status, "planned");
  assert.equal(purchasing.phase, "Phase 2");
  assert.ok(purchasing.dependencies.includes("Inventory Foundation"));
  assert.equal(purchasing.estimatedRelease, "After UI Phase");
});

test("workspace model calculates KPI counts and filters hidden apps", () => {
  const model = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions,
      tenantId,
    },
    preferences: {
      hiddenAppKeys: ["crm"],
    },
    snapshot,
  });

  assert.equal(model.allApps.some((app) => app.key === "crm"), false);
  assert.equal(model.hiddenApps.some((app) => app.key === "crm"), true);
  assert.equal(model.progressKpis.find((kpi) => kpi.key === "apps-ready")?.value, "3");
  assert.equal(model.progressKpis.find((kpi) => kpi.key === "apps-planned")?.value, "19");
  assert.ok(model.platformApps.some((app) => app.key === "platform-search"));
});

test("accepted manifest apps remain visible with a restricted permission indicator", () => {
  const model = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions: new Set(),
      tenantId,
    },
    snapshot,
  });

  const finance = model.readyBusinessApps.find((app) => app.key === "finance");

  assert.ok(finance);
  assert.equal(finance.permissionState, "restricted");
  assert.equal(finance.permissionLabel, "Permission required");
});
