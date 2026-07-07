import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { ApplicationError } from "@/core/errors";
import {
  resolveOperatorSafeSecurityMessage,
  sanitizeOperatorMessage,
} from "@/core/errors/operator-security-messages";
import { definePermissionKey } from "@/platform/permissions/public-api";
import {
  resolveAllowedAppKeysFailClosed,
  resolveGrantedPermissionsFailClosed,
} from "@/app/(erp)/erp-security.server";

const root = process.cwd();
const shellModelPath = path.join(root, "src/app/(erp)/erp-shell-model.ts");
const erpSecurityPath = path.join(root, "src/app/(erp)/erp-security.server.ts");
const erpLayoutPath = path.join(root, "src/app/(erp)/layout.tsx");
const firstCompanyOnboardingPath = path.join(root, "src/app/api/onboarding/first-company/route.ts");
const tenantAdminAppBackfillMigrationPath = path.join(
  root,
  "supabase/migrations/20260701130000_backfill_tenant_admin_app_access.sql",
);

const inventoryView = definePermissionKey("inventory.products.view");
const inventoryManage = definePermissionKey("inventory.products.manage");

test("fail-closed permission resolution returns no permissions when any RPC fails", () => {
  const granted = resolveGrantedPermissionsFailClosed([
    { allowed: true, permission: inventoryView },
    { error: new Error("rpc unavailable"), permission: inventoryManage },
  ]);

  assert.deepEqual(granted, []);
});

test("fail-closed permission resolution returns only explicitly allowed permissions", () => {
  const granted = resolveGrantedPermissionsFailClosed([
    { allowed: true, permission: inventoryView },
    { allowed: false, permission: inventoryManage },
  ]);

  assert.deepEqual(granted, [inventoryView]);
});

test("fail-closed app visibility returns no apps when access rows are missing", () => {
  const allowed = resolveAllowedAppKeysFailClosed(["inventory", "finance"], null);

  assert.deepEqual(allowed, []);
});

test("fail-closed app visibility returns no apps when lookup fails", () => {
  const allowed = resolveAllowedAppKeysFailClosed(
    ["inventory", "finance"],
    [{ app_key: "inventory", is_enabled: true }],
    new Error("query failed"),
  );

  assert.deepEqual(allowed, []);
});

test("fail-closed app visibility returns only enabled app keys", () => {
  const allowed = resolveAllowedAppKeysFailClosed(
    ["inventory", "finance", "hr"],
    [
      { app_key: "inventory", is_enabled: true },
      { app_key: "finance", is_enabled: false },
      { app_key: "hr", is_enabled: true },
    ],
  );

  assert.deepEqual(allowed, ["inventory", "hr"]);
});

test("erp shell model no longer grants all permissions on RPC failure", () => {
  const source = fs.readFileSync(shellModelPath, "utf8");

  assert.doesNotMatch(source, /return acceptedFoundationPermissions;/);
  assert.match(source, /resolveGrantedPermissionsFailClosed/);
  assert.match(source, /list_granted_permission_keys/);
  assert.doesNotMatch(source, /acceptedFoundationPermissions\.map\(async \(permission\)/);
});

test("erp shell model no longer exposes all apps when user_app_access is empty", () => {
  const source = fs.readFileSync(shellModelPath, "utf8");

  assert.doesNotMatch(source, /return acceptedAppKeys;/);
  assert.match(source, /resolveAllowedAppKeysFailClosed/);
});

test("erp shell fallback runtime denies access when runtime is not supplied", () => {
  const source = fs.readFileSync(shellModelPath, "utf8");

  assert.match(source, /allowedAppKeys: \[\]/);
  assert.match(source, /permissions: \[\]/);
});

test("first company onboarding grants explicit tenant admin app access", () => {
  const source = fs.readFileSync(firstCompanyOnboardingPath, "utf8");

  assert.match(source, /TENANT_ADMIN_BOOTSTRAP_APP_KEYS/);
  assert.match(source, /from\("user_app_access"\)\.insert/);
  for (const appKey of ["administration", "finance", "inventory", "manufacturing", "hr"]) {
    assert.match(source, new RegExp(`"${appKey}"`));
  }
});

test("tenant admin app access backfill preserves fail-closed explicit access rows", () => {
  const migration = fs.readFileSync(tenantAdminAppBackfillMigrationPath, "utf8");

  assert.match(migration, /insert into public\.user_app_access/);
  assert.match(migration, /r\.role_key = 'tenant-admin'/);
  assert.match(migration, /not exists \(/);
  assert.match(migration, /uaa\.app_key = apps\.app_key/);
  assert.doesNotMatch(migration, /update public\.user_app_access/i);
});

test("erp layout enforces authenticated branch request context", () => {
  const source = fs.readFileSync(erpLayoutPath, "utf8");

  assert.match(source, /resolveBranchRequestContext\("erp"\)/);
});

test("warehouse execution pages require inventory app and movement permissions", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/_components/warehouse-execution-pages.tsx"),
    "utf8",
  );

  assert.match(source, /requireErpRouteAccess/);
  assert.match(source, /INVENTORY_PERMISSIONS\.movementsView/);
  assert.match(source, /INVENTORY_PERMISSIONS\.transactionCreate/);
});

test("transaction catalog loader delegates to inventory catalog service", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/inventory/_components/transaction-pages.tsx"),
    "utf8",
  );

  assert.match(source, /createInventoryCatalogLookupService/);
  assert.doesNotMatch(source, /createRequestSupabaseClient/);
});

test("purchasing catalog loader requires purchasing view permission", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/(erp)/erp/purchasing/_components/purchasing-pages.tsx"),
    "utf8",
  );

  assert.match(source, /resolveErpShellRuntime\(\{ permission: PURCHASING_PERMISSIONS\.view \}\)/);
  assert.match(source, /createPurchasingCatalogLookupService/);
});

test("erp workspace shells enforce app and permission guards", () => {
  for (const shellPath of [
    "src/app/(erp)/erp/inventory/_components/inventory-shell.tsx",
    "src/app/(erp)/erp/finance/_components/finance-shell.tsx",
    "src/app/(erp)/erp/manufacturing/_components/manufacturing-shell.tsx",
    "src/app/(erp)/erp/hr/_components/hr-shell.tsx",
    "src/app/(erp)/erp/admin/_components.tsx",
  ]) {
    const source = fs.readFileSync(path.join(root, shellPath), "utf8");
    assert.match(source, /resolveErpShellRuntime/);
  }
});

test("security error rendering hides UUIDs and permission keys", () => {
  const sanitized = sanitizeOperatorMessage(
    "inventory.transaction.create denied for user 550e8400-e29b-41d4-a716-446655440000 at src/features/inventory/service.ts",
  );

  assert.doesNotMatch(sanitized, /550e8400-e29b-41d4-a716-446655440000/);
  assert.match(sanitized, /\[hidden\]/);
});

test("authorization errors map to operator-safe messages", () => {
  const message = resolveOperatorSafeSecurityMessage(
    new ApplicationError({
      code: "AUTHORIZATION_ERROR",
      message: "Required permission inventory.transaction.post is missing.",
    }),
  );

  assert.equal(message, "You do not have permission to access this area.");
});

test("operational errors map to operator-safe messages without internal details", () => {
  const message = resolveOperatorSafeSecurityMessage(
    new ApplicationError({
      code: "OPERATIONAL_ERROR",
      message: "insert into inventory_transactions failed",
    }),
  );

  assert.equal(message, "This action could not be completed. Try again or contact your administrator.");
});

test("erp security module exposes route guard helpers", () => {
  const source = fs.readFileSync(erpSecurityPath, "utf8");

  assert.match(source, /export async function requireErpRouteAccess/);
  assert.match(source, /export async function resolveErpShellRuntime/);
});

test("inventory transaction service keeps permission checks before mutations", () => {
  const source = fs.readFileSync(
    path.join(root, "src/features/inventory/application/services/inventory-transaction.service.ts"),
    "utf8",
  );

  assert.match(source, /requirePermission/);
  assert.match(source, /managePermission/);
});

test("inventory catalog services scope queries to tenant, company, and branch", () => {
  const repositorySource = fs.readFileSync(
    path.join(root, "src/features/inventory/infrastructure/repositories/inventory-catalog-lookup.repository.ts"),
    "utf8",
  );

  assert.match(repositorySource, /\.eq\("tenant_id", this\.context\.tenantId\)/);
  assert.match(repositorySource, /\.eq\("company_id", this\.context\.companyId\)/);
  assert.match(repositorySource, /\.eq\("branch_id", this\.context\.branchId\)/);
});
