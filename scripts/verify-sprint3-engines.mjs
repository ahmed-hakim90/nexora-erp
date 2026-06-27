import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  "supabase/migrations/20260625093000_platform_engines_foundation.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "workflow_definitions",
  "workflow_transition_history",
  "approval_policies",
  "approval_instances",
  "approval_steps",
  "approval_history",
  "platform_documents",
  "platform_document_comments",
  "notification_templates",
  "notification_outbox",
  "file_attachments",
  "searchable_entities",
  "numbering_sequences",
  "export_jobs",
  "background_jobs",
];

const forbiddenBusinessPrefixes = [
  "product",
  "products",
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
  "hr_",
];

const createdTables = Array.from(
  normalized.matchAll(/create table public\.([a-z0-9_]+)/g),
  (match) => match[1],
);

const missingTables = requiredTables.filter(
  (table) => !createdTables.includes(table),
);
const forbiddenTables = createdTables.filter((table) =>
  forbiddenBusinessPrefixes.some(
    (prefix) => table === prefix || table.startsWith(`${prefix}_`),
  ),
);
const missingRls = requiredTables.filter(
  (table) =>
    !normalized.includes(`alter table public.${table} enable row level security`),
);
const missingForcedRls = requiredTables.filter(
  (table) =>
    !normalized.includes(`alter table public.${table} force row level security`),
);
const unsafeForAllPolicies = Array.from(
  normalized.matchAll(/create policy ([a-z0-9_]+) on public\.([a-z0-9_]+) for all/g),
  (match) => `${match[2]}.${match[1]}`,
);
const missingTenantGuards = requiredTables
  .filter((table) => table !== "background_jobs")
  .filter(
    (table) => !normalized.includes(`${table}_prevent_tenant_id_change`),
  );

if (missingTables.length > 0) {
  throw new Error(`Missing Sprint 3 engine tables: ${missingTables.join(", ")}`);
}

if (forbiddenTables.length > 0) {
  throw new Error(`Forbidden business tables found: ${forbiddenTables.join(", ")}`);
}

if (missingRls.length > 0) {
  throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
}

if (missingForcedRls.length > 0) {
  throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
}

if (unsafeForAllPolicies.length > 0) {
  throw new Error(`FOR ALL policies are not allowed: ${unsafeForAllPolicies.join(", ")}`);
}

if (missingTenantGuards.length > 0) {
  throw new Error(`Missing immutable tenant triggers: ${missingTenantGuards.join(", ")}`);
}

console.log("Sprint 3 platform engine migration verification passed.");
