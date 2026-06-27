import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const migrationPath = resolve("supabase/migrations/20260625133000_inventory_ledger_posting_foundation.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();
const packageJson = readFileSync(resolve("package.json"), "utf8");

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

const requiredTables = [
  "stock_ledger_entries",
  "stock_posting_batches",
  "stock_balances",
  "stock_balance_snapshots",
  "stock_posting_rules",
];
const missingTables = requiredTables.filter((table) => !normalized.includes(`create table public.${table}`));

const requiredLedgerColumns = [
  "tenant_id uuid not null",
  "branch_id uuid",
  "document_id uuid not null references public.business_documents",
  "document_type_key public.business_document_generic_key not null",
  "movement_type_key public.business_document_generic_key not null",
  "product_id uuid not null references public.products",
  "warehouse_id uuid not null references public.warehouses",
  "location_id uuid not null references public.warehouse_locations",
  "lot_id uuid",
  "serial_id uuid",
  "unit_id uuid not null references public.units",
  "quantity_delta numeric",
  "unit_cost numeric",
  "total_cost numeric",
  "direction public.stock_ledger_direction not null",
  "posted_at timestamptz not null",
  "posted_by uuid not null",
  "reversal_of_entry_id uuid references public.stock_ledger_entries",
  "correlation_id text not null",
  "causation_id uuid",
  "metadata jsonb not null default '{}'::jsonb",
].filter((fragment) => !tableBody("stock_ledger_entries").includes(fragment));

const requiredBatchColumns = [
  "document_id uuid not null references public.business_documents",
  "status public.stock_posting_batch_status not null default 'posted'",
  "posted_at timestamptz not null default now()",
  "posted_by uuid not null",
  "reversed_at timestamptz",
  "reversed_by uuid",
  "idempotency_key text not null",
  "correlation_id text not null",
  "metadata jsonb not null default '{}'::jsonb",
].filter((fragment) => !tableBody("stock_posting_batches").includes(fragment));

const requiredBalanceColumns = [
  "quantity_on_hand numeric",
  "quantity_reserved numeric",
  "quantity_available numeric",
  "generated always as (quantity_on_hand - quantity_reserved) stored",
  "last_movement_at timestamptz",
  "derived_from_stock_ledger_entries",
].filter((fragment) => !tableBody("stock_balances").includes(fragment));

const requiredSchemaFragments = [
  "stock ledger entries are append-only",
  "prevent_stock_ledger_entry_mutation",
  "stock_ledger_entries_prevent_update",
  "stock_ledger_entries_prevent_delete",
  "post_stock_entries",
  "security invoker",
  "pg_advisory_xact_lock",
  "stock_posting_idempotency",
  "current_setting('app.stock_posting_service', true) = 'on'",
  "stock_posting_batches_idempotency_uq",
  "stock_ledger_entries_reversal_once_uq",
  "stock posting batch has already been reversed",
  "status = 'reversed'",
  "insert into public.event_outbox",
  "event_outbox_inventory_stock_insert",
  "inventory.stock_posted",
  "inventory.stock_reversed",
  "inventory.balance_updated",
  "on conflict (tenant_id, idempotency_key) do nothing",
  "inventory.allow_negative_stock",
  "negative stock is not allowed",
  "stock_posting_rules",
  "'receipt', 'increase_destination'",
  "'issue', 'decrease_source'",
  "'adjustment', 'adjust_signed'",
  "'transfer', 'transfer_out_in'",
  "'inventory.stock.post'",
  "'inventory.stock.reverse'",
].filter((fragment) => !normalized.includes(fragment));

const missingRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} enable row level security`));
const missingForcedRls = requiredTables.filter((table) => !normalized.includes(`alter table public.${table} force row level security`));
const missingPolicies = requiredTables.filter((table) => !normalized.includes(` on public.${table} `) || !normalized.includes("public.has_permission") || !normalized.includes("public.is_tenant_member"));

const requiredIndexes = [
  "stock_ledger_entries_product_date_idx",
  "stock_ledger_entries_warehouse_location_date_idx",
  "stock_balances_product_idx",
  "stock_balances_warehouse_location_idx",
  "stock_balances_last_movement_idx",
  "stock_posting_batches_document_idx",
  "stock_posting_batches_status_date_idx",
].filter((indexName) => !normalized.includes(indexName));

const forbiddenMigrationFragments = [
  "create table public.production",
  "create table public.sales",
  "create table public.purchase",
  "create table public.accounting",
  "create table public.sales_orders",
  "create table public.sales_invoices",
  "create table public.purchase_orders",
  "create table public.production_orders",
  "create table public.journal_entries",
].filter((fragment) => normalized.includes(fragment));

const featureRoot = join(root, "src/features/inventory");
const appInventoryRoot = join(root, "src/app/(erp)/erp/inventory");
const featureFiles = walk(featureRoot).filter((file) => /\.(ts|tsx)$/.test(file));
const uiFiles = walk(appInventoryRoot).filter((file) => /\.(ts|tsx)$/.test(file));
const allInventorySource = [...featureFiles, ...uiFiles].map((file) => [file, readFileSync(file, "utf8")]);
const serviceSource = readFileSync(join(featureRoot, "application/services/stock-posting.service.ts"), "utf8");
const repositorySource = readFileSync(join(featureRoot, "infrastructure/repositories/inventory.repository.ts"), "utf8");

const missingServiceFragments = [
  "class StockPostingService",
  "requirePermission({ context: this.context, permission: INVENTORY_PERMISSIONS.stockPost })",
  "Stock posting quantities must be positive before conversion to ledger deltas",
  "Negative stock is disabled by inventory.allow_negative_stock",
  "postStockEntries",
  "reversal_of_entry_id",
  "inventory.stock_posted",
  "inventory.stock_reversed",
  "inventory.balance_updated",
  "this.outbox.enqueue",
  "recordAuditEvent",
].filter((fragment) => !serviceSource.includes(fragment));

const missingRepositoryFragments = [
  "rpc(\"post_stock_entries\"",
  "stock_balances",
  "readQuantityOnHand",
  "loadPostingValidationContext",
  "validatePostingLineScope",
  "Stock posting product must be active and stockable",
  "Stock posting warehouse must belong to the posting tenant and branch",
].filter((fragment) => !repositorySource.includes(fragment));

const directBalanceMutation = allInventorySource
  .filter(([file]) => !file.includes("infrastructure/repositories/inventory.repository.ts"))
  .filter(([, source]) => /from\(["']stock_balances["']\)\.(insert|update|upsert|delete)/.test(source))
  .map(([file]) => file);

const serviceRoleMisuse = allInventorySource
  .filter(([, source]) => source.includes("createServiceRoleSupabaseClient") || source.includes("service-role") || source.includes("SUPABASE_SERVICE_ROLE"))
  .map(([file]) => file);

const privateFeatureImports = featureFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return [
    "business-documents",
    "products",
    "sales",
    "production",
    "purchase",
    "accounting",
  ].some((feature) => new RegExp(`@/features/${feature}/(?!public-api)`).test(source));
});

const supabaseInUi = uiFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return source.includes(".from(") || source.includes(".rpc(") || source.includes("createRequestSupabaseClient") || source.includes("@supabase/supabase-js");
});

const forbiddenUiRoutes = [
  "transfers",
  "adjustments",
  "receipts",
  "issues",
  "production",
  "sales",
  "purchasing",
  "accounting",
].filter((route) => existsSync(join(appInventoryRoot, route)));

if (missingTables.length > 0) throw new Error(`Missing Sprint 9 tables: ${missingTables.join(", ")}`);
if (requiredLedgerColumns.length > 0) throw new Error(`Missing ledger columns: ${requiredLedgerColumns.join(", ")}`);
if (requiredBatchColumns.length > 0) throw new Error(`Missing batch columns: ${requiredBatchColumns.join(", ")}`);
if (requiredBalanceColumns.length > 0) throw new Error(`Missing balance cache columns/markers: ${requiredBalanceColumns.join(", ")}`);
if (requiredSchemaFragments.length > 0) throw new Error(`Missing schema fragments: ${requiredSchemaFragments.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingPolicies.length > 0) throw new Error(`Missing tenant permission policies: ${missingPolicies.join(", ")}`);
if (requiredIndexes.length > 0) throw new Error(`Missing stock lookup indexes: ${requiredIndexes.join(", ")}`);
if (forbiddenMigrationFragments.length > 0) throw new Error(`Forbidden workflow schema found: ${forbiddenMigrationFragments.join(", ")}`);
if (missingServiceFragments.length > 0) throw new Error(`StockPostingService missing fragments: ${missingServiceFragments.join(", ")}`);
if (missingRepositoryFragments.length > 0) throw new Error(`Inventory repository missing posting fragments: ${missingRepositoryFragments.join(", ")}`);
if (directBalanceMutation.length > 0) throw new Error(`Direct stock_balances mutation outside repository: ${directBalanceMutation.join(", ")}`);
if (serviceRoleMisuse.length > 0) throw new Error(`Service-role misuse found: ${serviceRoleMisuse.join(", ")}`);
if (privateFeatureImports.length > 0) throw new Error(`Private cross-feature imports found: ${privateFeatureImports.join(", ")}`);
if (supabaseInUi.length > 0) throw new Error(`Supabase usage found in inventory UI: ${supabaseInUi.join(", ")}`);
if (forbiddenUiRoutes.length > 0) throw new Error(`Forbidden workflow UI routes found: ${forbiddenUiRoutes.join(", ")}`);
if (!existsSync(join(appInventoryRoot, "stock-ledger/page.tsx"))) throw new Error("Stock Ledger read-only page is missing.");
if (!existsSync(join(appInventoryRoot, "stock-balances/page.tsx"))) throw new Error("Stock Balances read-only page is missing.");
if (!existsSync(join(appInventoryRoot, "posting-batches/page.tsx"))) throw new Error("Posting Batches read-only page is missing.");
if (!packageJson.includes("\"verify:sprint9\"")) throw new Error("package.json is missing verify:sprint9 script.");

console.log("Sprint 9 inventory ledger and posting foundation verification passed.");
