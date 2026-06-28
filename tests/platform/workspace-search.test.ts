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
import {
  createWorkspaceSearchRegistry,
  runWorkspaceSearch,
} from "@/shared/workspace/workspace-search";

const tenantId = "foundation-review-tenant";
const companyId = "foundation-company";
const branchId = "foundation-branch";
const manifests = [
  financeAppManifest,
  inventoryAppManifest,
  manufacturingAppManifest,
] as const;
const grantedPermissions = new Set<PermissionKey>([
  ...FINANCE_PERMISSION_LIST,
  ...INVENTORY_PERMISSION_LIST,
  ...MANUFACTURING_PERMISSION_LIST,
]);
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

test("workspace search finds app catalog entries through platform search contracts", async () => {
  const workspace = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions,
      tenantId,
    },
    preferences: {
      favoriteAppKeys: ["purchasing"],
    },
    snapshot,
  });
  const registry = createWorkspaceSearchRegistry({
    apps: workspace.allApps,
    commands: manifests.flatMap((manifest) => manifest.commands),
    navigation: manifests.flatMap((manifest) => manifest.navigation),
  });

  const result = await runWorkspaceSearch(
    registry,
    {
      branchId,
      companyId,
      experience: "erp",
      tenantId,
      term: "purchasing",
    },
    {
      branchId,
      companyId,
      experience: "erp",
      favoriteEntityIds: ["purchasing"],
      grantedPermissions,
      tenantId,
    },
  );

  assert.equal(result.records[0]?.entityId, "purchasing");
  assert.equal(result.records[0]?.type, "app");
});

test("workspace search finds manifest commands and navigation with permission filtering", async () => {
  const workspace = buildHomeWorkspace({
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
  const registry = createWorkspaceSearchRegistry({
    apps: workspace.allApps,
    commands: manifests.flatMap((manifest) => manifest.commands),
    navigation: manifests.flatMap((manifest) => manifest.navigation),
  });
  const allowed = await runWorkspaceSearch(
    registry,
    {
      branchId,
      companyId,
      experience: "erp",
      tenantId,
      term: "finance",
    },
    {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions,
      tenantId,
    },
  );
  const restricted = await runWorkspaceSearch(
    registry,
    {
      branchId,
      companyId,
      experience: "erp",
      tenantId,
      term: "finance",
    },
    {
      branchId,
      companyId,
      experience: "erp",
      grantedPermissions: new Set(),
      tenantId,
    },
  );

  assert.equal(allowed.records.some((record) => record.commandKey === "finance.open"), true);
  assert.equal(allowed.records.some((record) => record.entityId === "finance.launcher"), true);
  assert.equal(restricted.records.some((record) => record.commandKey === "finance.open"), false);
});
