import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260625101000_master_data_foundation.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "products",
  "product_categories",
  "units",
  "brands",
  "warehouses",
  "warehouse_locations",
  "customers",
  "suppliers",
  "price_lists",
  "tax_profiles"
];
const forbiddenTables = [
  "inventory_movements",
  "stock_movements",
  "stock_balances",
  "production_orders",
  "boms",
  "sales_orders",
  "sales_invoices",
  "purchase_orders",
  "journal_entries",
  "accounting_ledger_entries",
];

const createdTables = Array.from(normalized.matchAll(/create table public\.([a-z0-9_]+)/g), (match) => match[1]);
const missingTables = requiredTables.filter((table) => !createdTables.includes(table));
const extraTables = createdTables.filter((table) => !requiredTables.includes(table));
const forbiddenCreatedTables = createdTables.filter((table) => forbiddenTables.includes(table));
const missingRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} enable row level security`));
const missingForcedRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} force row level security`));
const missingTenantGuards = requiredTables.filter((table) => !normalized.includes(`${table}_prevent_tenant_id_change`));
const missingIndexes = requiredTables.filter((table) => !normalized.includes(`${table}_search_idx`) || !normalized.includes(`${table}_tenant`));
const missingPolicies = requiredTables.filter((table) => !normalized.includes(`create policy ${table}_select_member_permission`) || !normalized.includes("public.has_permission"));
const unsafeForAllPolicies = Array.from(normalized.matchAll(/create policy ([a-z0-9_]+) on public\.([a-z0-9_]+) for all/g), (match) => `${match[2]}.${match[1]}`);

if (missingTables.length > 0) throw new Error(`Missing Sprint 5 master data tables: ${missingTables.join(", ")}`);
if (extraTables.length > 0) throw new Error(`Unexpected Sprint 5 tables: ${extraTables.join(", ")}`);
if (forbiddenCreatedTables.length > 0) throw new Error(`Forbidden business transaction tables found: ${forbiddenCreatedTables.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingTenantGuards.length > 0) throw new Error(`Missing immutable tenant triggers: ${missingTenantGuards.join(", ")}`);
if (missingIndexes.length > 0) throw new Error(`Missing required indexes: ${missingIndexes.join(", ")}`);
if (missingPolicies.length > 0) throw new Error(`Missing permission-aware RLS policies: ${missingPolicies.join(", ")}`);
if (unsafeForAllPolicies.length > 0) throw new Error(`FOR ALL policies are not allowed: ${unsafeForAllPolicies.join(", ")}`);

console.log("Sprint 5 master data migration verification passed.");
