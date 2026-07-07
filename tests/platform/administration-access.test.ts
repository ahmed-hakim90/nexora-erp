import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { administrationAppManifest } from "@/features/administration/app.manifest";
import { formatAdministrationDataError } from "@/features/administration/data";
import {
  buildPermissionMatrix,
  canChangeOwnSuperAdminAssignment,
  createAdminAuditEvent,
  createAdministrationResolverSource,
  dataScopeAllowsRecord,
  DEFAULT_ROLE_TEMPLATES,
  getInvitationStatus,
  summarizeAppAccess,
  validateGrantablePermissions,
  type AdminAccessRecord,
  type AdminRole,
} from "@/features/administration/model";
import { financeAppManifest } from "@/features/finance/public-api";
import { inventoryAppManifest } from "@/features/inventory/public-api";
import { manufacturingAppManifest } from "@/features/manufacturing/public-api";
import { definePermissionKey, PLATFORM_PERMISSIONS, resolvePermission, type PermissionKey } from "@/platform/permissions/public-api";
import {
  buildHomeWorkspace,
  WORKSPACE_APP_CATALOG,
  type WorkspacePreferences,
} from "@/shared/workspace/public-api";

const tenantId = "tenant-1";
const userId = "user-1";
const appAccess = definePermissionKey("platform.admin.access");
const userRead = definePermissionKey("platform.user.read");
const userManage = definePermissionKey("platform.user.manage");
const roleManage = definePermissionKey("platform.role.manage");
const root = process.cwd();
const administrationMigrationPath = path.join(root, "supabase/migrations/20260628151500_administration_user_access_layer.sql");

const accessRecord: AdminAccessRecord = {
  allowedApps: ["administration", "manufacturing"],
  branchAccess: [{ branchIds: ["branch-1"], companyId: "company-1", mode: "specific" }],
  companyAccess: { companyIds: ["company-1"], mode: "specific" },
  dataScope: "branch",
  tenantId,
  userId,
};

const adminRole: AdminRole = {
  description: "Tenant admin",
  id: "role-1",
  isSystem: false,
  key: "tenant-admin",
  name: "Tenant Admin",
  permissionKeys: [appAccess, userRead, userManage, roleManage],
  scope: "tenant",
  status: "active",
  type: "tenant",
};

test("user creation and invitation flow tracks pending, expired, and accepted states", () => {
  assert.equal(getInvitationStatus({
    expiresAt: "2026-06-30T00:00:00.000Z",
    status: "pending",
  }, "2026-06-28T00:00:00.000Z"), "pending");
  assert.equal(getInvitationStatus({
    expiresAt: "2026-06-01T00:00:00.000Z",
    status: "pending",
  }, "2026-06-28T00:00:00.000Z"), "expired");
  assert.equal(getInvitationStatus({
    expiresAt: "2026-06-01T00:00:00.000Z",
    status: "accepted",
  }, "2026-06-28T00:00:00.000Z"), "accepted");
});

test("role templates include required operational administration roles", () => {
  assert.deepEqual(DEFAULT_ROLE_TEMPLATES.map((template) => template.key), [
    "super-admin",
    "tenant-admin",
    "company-admin",
    "finance-manager",
    "inventory-manager",
    "manufacturing-manager",
    "production-supervisor",
    "production-worker",
    "read-only-viewer",
  ]);
});

test("permission matrix maps apps, entities, and actions", () => {
  const matrix = buildPermissionMatrix([
    definePermissionKey("finance.accounts.view"),
    definePermissionKey("finance.accounts.create"),
    definePermissionKey("finance.accounts.edit"),
    definePermissionKey("finance.accounts.archive"),
    definePermissionKey("inventory.products.import"),
    definePermissionKey("inventory.products.export"),
    definePermissionKey("manufacturing.dpr.approve"),
  ]);

  const financeAccounts = matrix.find((row) => row.key === "finance:finance:accounts");
  const inventoryProducts = matrix.find((row) => row.key === "inventory:inventory:products");
  const manufacturingDpr = matrix.find((row) => row.key === "manufacturing:manufacturing:dpr");

  assert.equal(financeAccounts?.actions.view, "finance.accounts.view");
  assert.equal(financeAccounts?.actions.create, "finance.accounts.create");
  assert.equal(financeAccounts?.actions.edit, "finance.accounts.edit");
  assert.equal(financeAccounts?.actions.archive, "finance.accounts.archive");
  assert.equal(inventoryProducts?.actions.import, "inventory.products.import");
  assert.equal(inventoryProducts?.actions.export, "inventory.products.export");
  assert.equal(manufacturingDpr?.actions.approve, "manufacturing.dpr.approve");
});

test("app access requires both assignment and manifest permissions", () => {
  const summary = summarizeAppAccess(
    [administrationAppManifest, financeAppManifest, inventoryAppManifest, manufacturingAppManifest],
    ["administration", "finance"],
    [PLATFORM_PERMISSIONS.accessAdmin],
  );

  assert.deepEqual(summary.filter((item) => item.visible).map((item) => item.appKey), ["administration"]);
  assert.equal(summary.find((item) => item.appKey === "finance")?.reason, "missing-permission");
  assert.equal(summary.find((item) => item.appKey === "inventory")?.reason, "not-assigned");
});

test("company and branch access constrain data scope behavior", () => {
  assert.equal(dataScopeAllowsRecord(accessRecord, {
    branchId: "branch-1",
    companyId: "company-1",
    tenantId,
  }), true);
  assert.equal(dataScopeAllowsRecord(accessRecord, {
    branchId: "branch-2",
    companyId: "company-1",
    tenantId,
  }), false);
  assert.equal(dataScopeAllowsRecord({
    ...accessRecord,
    dataScope: "own",
  }, {
    ownerUserId: userId,
    tenantId,
  }), true);
});

test("audit events are created for access changes", () => {
  const event = createAdminAuditEvent({
    action: "app-access.changed",
    actorUserId: userId,
    metadata: { allowedApps: ["administration"] },
    subjectDisplay: "User One",
    subjectId: userId,
    subjectType: "access",
  });

  assert.equal(event.action, "app-access.changed");
  assert.equal(event.metadata.auditedByAdministration, true);
});

test("administrators cannot grant permissions they do not own", () => {
  const requested = [userRead, userManage, roleManage] as readonly PermissionKey[];
  const result = validateGrantablePermissions([userRead], requested);

  assert.equal(result.allowed, false);
  assert.deepEqual(result.missingPermissions, [userManage, roleManage]);
});

test("self super admin removal requires explicit confirmation", () => {
  assert.equal(canChangeOwnSuperAdminAssignment({
    actorUserId: userId,
    confirmed: false,
    removedRoleKeys: ["super-admin"],
    targetUserId: userId,
  }), false);
  assert.equal(canChangeOwnSuperAdminAssignment({
    actorUserId: userId,
    confirmed: true,
    removedRoleKeys: ["super-admin"],
    targetUserId: userId,
  }), true);
});

test("apps launcher hides administration when permission is missing", () => {
  const emptyPreferences: WorkspacePreferences = {
    appOrder: [],
    favoriteAppKeys: [],
    hiddenAppKeys: [],
    openWorkspaceAppKeys: [],
    pinnedAppKeys: [],
    recentApps: [],
    recentDocuments: [],
  };
  const workspace = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      enabledFeatureFlags: new Set(),
      experience: "erp",
      grantedPermissions: new Set<PermissionKey>(),
      tenantId,
    },
    preferences: emptyPreferences,
    snapshot: {
      entitlements: [{ appKey: "administration", state: "enabled", tenantId }],
      installedApps: [{ appKey: "administration", installedVersion: "1.0.0", state: "enabled", tenantId }],
      manifests: [administrationAppManifest],
    },
  });

  assert.equal(workspace.allApps.some((app) => app.key === "administration" && app.permissionState === "allowed"), false);
  assert.equal(workspace.platformApps.some((app) => app.key === "platform-administration"), false);
});

test("administration manifest contributes platform workspace app when allowed", () => {
  const emptyPreferences: WorkspacePreferences = {
    appOrder: [],
    favoriteAppKeys: [],
    hiddenAppKeys: [],
    openWorkspaceAppKeys: [],
    pinnedAppKeys: [],
    recentApps: [],
    recentDocuments: [],
  };
  const workspace = buildHomeWorkspace({
    catalog: WORKSPACE_APP_CATALOG,
    context: {
      enabledFeatureFlags: new Set(),
      experience: "erp",
      grantedPermissions: new Set<PermissionKey>([
        PLATFORM_PERMISSIONS.accessAdmin,
        PLATFORM_PERMISSIONS.readUsers,
      ]),
      tenantId,
    },
    preferences: emptyPreferences,
    snapshot: {
      entitlements: [{ appKey: "administration", state: "enabled", tenantId }],
      installedApps: [{ appKey: "administration", installedVersion: "1.0.0", state: "enabled", tenantId }],
      manifests: [administrationAppManifest],
    },
  });

  const administration = workspace.platformApps.find((app) => app.key === "administration");

  assert.ok(administration);
  assert.equal(administration.permissionState, "allowed");
  assert.equal(administration.href, "/erp/admin/users");
});

test("manifest permission consistency keeps administration protected", () => {
  assert.equal(administrationAppManifest.permissions.includes(PLATFORM_PERMISSIONS.accessAdmin), true);
  assert.equal(administrationAppManifest.routes.every((route) => Boolean(route.requiredPermission)), true);
});

test("permission resolver source is official and carries data scope", async () => {
  const source = createAdministrationResolverSource({
    access: accessRecord,
    permissionKeys: adminRole.permissionKeys,
    role: adminRole,
    tenantId,
  });
  const result = await resolvePermission({
    experience: "erp",
    identity: {
      identityId: "identity-1",
      principalId: "principal-1",
      userId,
    },
    permission: userManage,
    requestedDataScope: {
      branchIds: ["branch-1"],
      companyIds: ["company-1"],
      kind: "branch",
      tenantId,
    },
    tenantId,
  }, source);

  assert.equal(result.allowed, true);
  assert.equal(result.effectiveDataScopes[0]?.kind, "branch");
});

test("administration loader surfaces Supabase error details", () => {
  assert.equal(
    formatAdministrationDataError({
      code: "42P01",
      details: "Table user_company_access was not found in the schema cache.",
      message: "Could not find the table public.user_company_access",
    }, "Administration data could not be loaded."),
    "Could not find the table public.user_company_access Table user_company_access was not found in the schema cache. 42P01",
  );
  assert.equal(
    formatAdministrationDataError(null, "Administration data could not be loaded."),
    "Administration data could not be loaded.",
  );
});

test("administration migration exposes assigned access helper functions and policies", () => {
  const sql = fs.readFileSync(administrationMigrationPath, "utf8");

  for (const fragment of [
    "create or replace function public.has_company_access",
    "create or replace function public.current_company_ids()",
    "create or replace function public.has_branch_access",
    "create or replace function public.current_branch_ids()",
    "create or replace function public.has_app_access",
    "create or replace function public.current_user_data_scope",
    "create policy companies_select_assigned_access",
    "create policy branches_select_assigned_access",
    "add column if not exists company_id uuid references public.companies",
  ]) {
    assert.ok(sql.includes(fragment), `Expected migration to include ${fragment}`);
  }
});
