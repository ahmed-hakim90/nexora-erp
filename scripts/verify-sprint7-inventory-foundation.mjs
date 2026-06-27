import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const migrationPath = resolve("supabase/migrations/20260625120000_inventory_foundation.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "inventory_event_definitions",
  "inventory_integration_endpoints",
  "inventory_event_routes",
  "inventory_integration_messages",
];

const forbiddenFragments = [
  "create table public.stock_items",
  "create table public.stock_balances",
  "create table public.stock_movement_types",
  "create table public.stock_movement_drafts",
  "create table public.stock_movements",
  "create table public.stock_transfers",
  "create table public.inventory_dimensions",
  "create table public.lots_batches",
  "create table public.serial_numbers",
  "create table public.stock_reservations",
  "create table public.inventory_valuation_placeholders",
  "create table public.production_orders",
  "create table public.sales_orders",
  "create table public.sales_invoices",
  "create table public.purchase_orders",
  "create table public.journal_entries",
  "quantity_on_hand",
  "quantity_reserved",
  "quantity_available",
  "planned_quantity",
  "reserved_quantity",
  "post_stock",
  "post_inventory",
  "journal_entries",
].filter((fragment) => normalized.includes(fragment));

const requiredPermissions = [
  "inventory.events.view",
  "inventory.events.manage",
  "inventory.integration.view",
  "inventory.integration.manage",
];

function walk(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? walk(path) : [path];
  });
}

function tableBody(table) {
  const match = normalized.match(new RegExp(`create table public\\.${table} \\((.*?)\\);`));
  return match?.[1] ?? "";
}

const createdTables = Array.from(normalized.matchAll(/create table public\.([a-z0-9_]+)/g), (match) => match[1]);
const missingTables = requiredTables.filter((table) => !createdTables.includes(table));
const extraTables = createdTables.filter((table) => !requiredTables.includes(table));
const missingTenantColumns = requiredTables.filter((table) => !tableBody(table).includes("tenant_id uuid not null"));
const missingSoftDelete = requiredTables.filter((table) => !tableBody(table).includes("deleted_at timestamptz"));
const quantityColumns = requiredTables.flatMap((table) => {
  const body = tableBody(table);
  return ["quantity", "qty", "cost", "amount", "price", "debit", "credit"].filter((fragment) => body.includes(fragment)).map((fragment) => `${table}.${fragment}`);
});

const missingRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} enable row level security`));
const missingForcedRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} force row level security`));
const missingTenantGuards = requiredTables.filter((table) => !normalized.includes(`${table}_prevent_tenant_id_change`));
const missingPolicies = requiredTables.filter((table) => {
  return !normalized.includes(`create policy ${table}_select_member_permission`) ||
    !normalized.includes(`create policy ${table}_insert_member_permission`) ||
    !normalized.includes("public.has_permission") ||
    !normalized.includes("public.is_tenant_member");
});
const missingPolicyWithCheck = requiredTables.filter((table) => {
  const policyStatements = Array.from(normalized.matchAll(new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, "g")), (match) => match[0]);
  const writes = policyStatements.filter((statement) => / for (insert|update) /.test(statement));
  return writes.length === 0 || writes.some((statement) => !statement.includes(" with check "));
});
const unsafeForAllPolicies = Array.from(normalized.matchAll(/create policy ([a-z0-9_]+) on public\.([a-z0-9_]+) for all/g), (match) => `${match[2]}.${match[1]}`);

const missingIndexes = [
  "inventory_event_definitions_direction_status_idx",
  "inventory_integration_endpoints_direction_transport_idx",
  "inventory_event_routes_event_endpoint_idx",
  "inventory_integration_messages_status_idx",
  "inventory_integration_messages_event_endpoint_idx",
  "inventory_integration_messages_source_idx",
].filter((indexName) => !normalized.includes(indexName));

const missingFoundationMarkers = [
  "events and integration foundation only",
  "event contracts and integration placeholders only",
  "payload_schema_placeholder",
  "connection_settings_placeholder",
  "filter_placeholder",
  "payload_metadata_placeholder",
  "enforce_inventory_events_integration_scope",
].filter((fragment) => !normalized.includes(fragment));

const missingPermissions = requiredPermissions.filter((permission) => !normalized.includes(`'${permission}'`));

const featureRoot = join(root, "src/features/inventory");
const featureFiles = walk(featureRoot).filter((file) => /\.(ts|tsx)$/.test(file));
const appInventoryRoot = join(root, "src/app/(erp)/erp/inventory");
const uiFiles = walk(appInventoryRoot).filter((file) => /\.(ts|tsx)$/.test(file));

const privateFeatureImports = featureFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return [
    "products",
    "units",
    "warehouses",
    "warehouse-locations",
    "business-documents",
    "sales",
    "production",
    "purchase",
    "accounting",
  ].some((feature) => new RegExp(`@/features/${feature}/(?!public-api)`).test(source));
});
const repositoryUsageOutsideInfrastructure = featureFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return !file.includes("/infrastructure/repositories/") &&
    (source.includes(".from(") || source.includes(".rpc(") || source.includes("@supabase/supabase-js"));
});
const serviceRoleMisuse = [...featureFiles, ...uiFiles].filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes("createServiceRoleSupabaseClient") || source.includes("service-role") || source.includes("SUPABASE_SERVICE_ROLE");
});
const supabaseInUi = uiFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes(".from(") || source.includes(".rpc(") || source.includes("createRequestSupabaseClient") || source.includes("@supabase/supabase-js");
});
const mutationActions = walk(join(featureRoot, "routes/actions")).filter((file) => /\.(ts|tsx)$/.test(file));
const oldUiRoutes = [
  "stock-balances",
  "lots-batches",
  "serial-numbers",
  "movement-drafts",
].filter((route) => existsSync(join(appInventoryRoot, route)));
const forbiddenFeatureTerms = [...featureFiles, ...uiFiles].filter((file) => {
  const source = readFileSync(file, "utf8").toLowerCase();
  return [
    "quantity_on_hand",
    "quantityreserved",
    "plannedquantity",
    "stockbalance",
    "stockdraft",
    "lotbatch",
    "serialnumber",
    "reservation",
    "salesorder",
    "purchaseorder",
    "productionorder",
    "journalentry",
  ].some((term) => source.includes(term));
});
const serviceSource = readFileSync(join(featureRoot, "application/services/inventory-foundation.service.ts"), "utf8");
const serviceMissingRules = [
  "requirePermission(",
  "assertEventsIntegrationFoundationOnly",
].filter((fragment) => !serviceSource.includes(fragment));

const packageJson = readFileSync(resolve("package.json"), "utf8");

if (missingTables.length > 0) throw new Error(`Missing Sprint 7 events/integration tables: ${missingTables.join(", ")}`);
if (extraTables.length > 0) throw new Error(`Unexpected Sprint 7 tables: ${extraTables.join(", ")}`);
if (forbiddenFragments.length > 0) throw new Error(`Forbidden posting/business fragments found: ${forbiddenFragments.join(", ")}`);
if (quantityColumns.length > 0) throw new Error(`Quantity/cost/accounting-like columns are not allowed: ${quantityColumns.join(", ")}`);
if (missingTenantColumns.length > 0) throw new Error(`Missing tenant scope columns: ${missingTenantColumns.join(", ")}`);
if (missingSoftDelete.length > 0) throw new Error(`Missing soft delete columns: ${missingSoftDelete.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingTenantGuards.length > 0) throw new Error(`Missing immutable tenant triggers: ${missingTenantGuards.join(", ")}`);
if (missingPolicies.length > 0) throw new Error(`Missing permission-aware RLS policies: ${missingPolicies.join(", ")}`);
if (missingPolicyWithCheck.length > 0) throw new Error(`Missing WITH CHECK on write policies: ${missingPolicyWithCheck.join(", ")}`);
if (unsafeForAllPolicies.length > 0) throw new Error(`FOR ALL policies are not allowed: ${unsafeForAllPolicies.join(", ")}`);
if (missingIndexes.length > 0) throw new Error(`Missing integration/event indexes: ${missingIndexes.join(", ")}`);
if (missingFoundationMarkers.length > 0) throw new Error(`Missing events/integration foundation markers: ${missingFoundationMarkers.join(", ")}`);
if (missingPermissions.length > 0) throw new Error(`Missing inventory events/integration permissions: ${missingPermissions.join(", ")}`);
if (privateFeatureImports.length > 0) throw new Error(`Private cross-feature imports found: ${privateFeatureImports.join(", ")}`);
if (repositoryUsageOutsideInfrastructure.length > 0) throw new Error(`Supabase repository access outside infrastructure: ${repositoryUsageOutsideInfrastructure.join(", ")}`);
if (serviceRoleMisuse.length > 0) throw new Error(`Service-role misuse found in inventory feature/UI: ${serviceRoleMisuse.join(", ")}`);
if (supabaseInUi.length > 0) throw new Error(`Supabase usage found in inventory UI: ${supabaseInUi.join(", ")}`);
if (mutationActions.length > 0) throw new Error(`Inventory mutation actions are not allowed in Sprint 7: ${mutationActions.join(", ")}`);
if (oldUiRoutes.length > 0) throw new Error(`Old stock UI routes are not allowed: ${oldUiRoutes.join(", ")}`);
if (forbiddenFeatureTerms.length > 0) throw new Error(`Forbidden stock/business terms found in inventory feature/UI: ${forbiddenFeatureTerms.join(", ")}`);
if (serviceMissingRules.length > 0) throw new Error(`Inventory service missing permission/rule enforcement: ${serviceMissingRules.join(", ")}`);
if (!packageJson.includes("\"verify:sprint7\"")) throw new Error("package.json is missing verify:sprint7 script.");

console.log("Sprint 7 inventory events/integration foundation verification passed.");
