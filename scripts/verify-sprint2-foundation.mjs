import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  "supabase/migrations/20260625090000_core_auth_tenant_rbac.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalizedMigration = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "profiles",
  "tenants",
  "branches",
  "tenant_memberships",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "audit_logs",
  "feature_flags",
  "app_settings",
];

const forbiddenBusinessTables = [
  "products",
  "product",
  "inventory",
  "production",
  "manufacturing",
  "sales",
  "sale",
  "accounting",
  "account",
  "pos",
  "marketplace",
  "rental",
  "warehouse",
  "invoice",
  "stock",
];

const missingTables = requiredTables.filter(
  (table) => !migration.includes(`create table public.${table}`),
);

const createdTables = Array.from(
  normalizedMigration.matchAll(/create table public\.([a-z0-9_]+)/g),
  (match) => match[1],
);

const forbiddenMatches = createdTables.filter((table) =>
  forbiddenBusinessTables.some(
    (name) => table === name || table.startsWith(`${name}_`),
  ),
);

const missingRls = requiredTables.filter(
  (table) => !migration.includes(`alter table public.${table} enable row level security`),
);

const missingForcedRls = requiredTables.filter(
  (table) => !migration.includes(`alter table public.${table} force row level security`),
);

const requiredHelpers = [
  "current_user_id()",
  "current_tenant_ids()",
  "is_tenant_member(uuid)",
  "has_permission(text, uuid)",
];

const helpersMissingAuthenticatedGrant = requiredHelpers.filter(
  (helper) => !normalizedMigration.includes(`grant execute on function public.${helper} to authenticated`),
);

const missingImmutableTenantTriggers = [
  "branches",
  "tenant_memberships",
  "roles",
  "role_permissions",
  "user_roles",
  "feature_flags",
  "app_settings",
].filter(
  (table) =>
    !normalizedMigration.includes(`${table}_prevent_tenant_id_change`),
);

if (missingTables.length > 0) {
  throw new Error(`Missing required core tables: ${missingTables.join(", ")}`);
}

if (forbiddenMatches.length > 0) {
  throw new Error(
    `Forbidden business module tables found: ${forbiddenMatches.join(", ")}`,
  );
}

if (missingRls.length > 0) {
  throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
}

if (missingForcedRls.length > 0) {
  throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
}

if (helpersMissingAuthenticatedGrant.length > 0) {
  throw new Error(
    `Missing authenticated grants for helpers: ${helpersMissingAuthenticatedGrant.join(", ")}`,
  );
}

if (missingImmutableTenantTriggers.length > 0) {
  throw new Error(
    `Missing immutable tenant triggers: ${missingImmutableTenantTriggers.join(", ")}`,
  );
}

console.log("Sprint 2 foundation migration verification passed.");
