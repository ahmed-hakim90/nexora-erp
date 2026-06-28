import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260625141000_inventory_transactions.sql");
const migration = readFileSync(migrationPath, "utf8");

const requiredTables = [
  "inventory_transactions",
  "inventory_transaction_lines",
  "inventory_transaction_postings",
  "inventory_cycle_counts",
  "inventory_cycle_count_lines",
];

const forbiddenTables = [
  "sales_order",
  "sales_invoice",
  "purchase_order",
  "production_order",
  "accounting",
  "general_ledger",
];

const requiredPermissions = [
  "inventory.transaction.view",
  "inventory.transaction.create",
  "inventory.transaction.update",
  "inventory.transaction.submit",
  "inventory.transaction.post",
  "inventory.transaction.cancel",
  "inventory.transaction.reverse",
  "inventory.cycle-count.view",
  "inventory.cycle-count.manage",
  "inventory.cycle-count.post",
];

const requiredEvents = [
  "inventory.transaction.created",
  "inventory.transaction.submitted",
  "inventory.transaction.posted",
  "inventory.transaction.cancelled",
  "inventory.transaction.reversed",
  "inventory.cycle-count.posted",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table public.${table}`)) throw new Error(`Missing Sprint 10 table: ${table}`);
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled for ${table}`);
  if (!migration.includes(`alter table public.${table} force row level security`)) throw new Error(`RLS is not forced for ${table}`);
  if (!migration.includes(` on public.${table} for insert`) || !migration.includes("with check")) {
    throw new Error(`Missing WITH CHECK insert policy for ${table}`);
  }
}

for (const fragment of forbiddenTables) {
  if (migration.includes(`create table public.${fragment}`) || migration.includes(`create table ${fragment}`)) {
    throw new Error(`Sprint 10 must not create forbidden table family: ${fragment}`);
  }
}

for (const permission of requiredPermissions) {
  if (!migration.includes(permission)) throw new Error(`Missing permission: ${permission}`);
}

for (const event of requiredEvents) {
  if (!migration.includes(event)) throw new Error(`Missing durable event policy for: ${event}`);
}

for (const required of [
  "record_inventory_transaction_posting",
  "app.inventory_transaction_service",
  "pg_advisory_xact_lock",
  "draft inventory transactions can only remain draft, submit, or cancel",
  "submitted inventory transactions can only remain submitted, post, or cancel",
  "posted inventory transactions cannot be edited during reversal",
]) {
  if (!migration.includes(required)) throw new Error(`Missing transaction database guard: ${required}`);
}

const servicePath = resolve("src/features/inventory/application/services/inventory-transaction.service.ts");
const service = readFileSync(servicePath, "utf8");
const repositoryPath = resolve("src/features/inventory/infrastructure/repositories/inventory-transactions.repository.ts");
const repository = readFileSync(repositoryPath, "utf8");
const foundationRepositoryPath = resolve("src/features/inventory/infrastructure/repositories/inventory.repository.ts");
const foundationRepository = readFileSync(foundationRepositoryPath, "utf8");
const stabilizationMigrationPath = resolve("supabase/migrations/20260628101500_stabilize_current_app_models.sql");
const stabilizationMigration = readFileSync(stabilizationMigrationPath, "utf8");

for (const className of [
  "InventoryTransactionService",
  "StockAdjustmentService",
  "WarehouseTransferService",
  "GoodsReceiptService",
  "GoodsIssueService",
  "CycleCountService",
]) {
  if (!service.includes(`class ${className}`)) throw new Error(`Missing service class: ${className}`);
}

for (const required of [
  "this.stockPostingService.post",
  "this.stockPostingService.reverse",
  "idempotencyKey",
  "has already been posted",
  "Only draft inventory transactions can be edited",
  "Only submitted inventory transactions can be posted",
  "Only posted inventory transactions can be reversed",
  "this.outbox.enqueue",
]) {
  if (!service.includes(required)) throw new Error(`Missing transaction service guard: ${required}`);
}

if (!repository.includes("rpc(\"record_inventory_transaction_posting\"")) {
  throw new Error("Inventory transaction posting records must be written through guarded RPC.");
}

for (const [canonical, legacy] of [
  ["inventory_products", "products"],
  ["inventory_warehouses", "warehouses"],
  ["inventory_locations", "warehouse_locations"],
  ["inventory_uoms", "units"],
]) {
  if (!stabilizationMigration.includes(`references public.${canonical}(id)`)) {
    throw new Error(`Missing canonical FK stabilization for ${canonical}`);
  }
  const legacyQueryPattern = new RegExp(`\\.from\\(["']${legacy}["']\\)`);
  if (legacyQueryPattern.test(repository) || legacyQueryPattern.test(foundationRepository)) {
    throw new Error(`Inventory runtime repository must not validate against legacy table: ${legacy}`);
  }
}

const srcFiles = listFiles(resolve("src")).filter((path) => /\.(ts|tsx)$/.test(path));
const migrationFiles = listFiles(resolve("supabase/migrations")).filter((path) => path.endsWith(".sql"));

for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  if (/\.from\(["']stock_balances["']\)\.(insert|update|upsert|delete)/.test(text)) {
    throw new Error(`Direct stock_balances mutation found outside posting RPC: ${file}`);
  }
  if (file.includes("/src/features/inventory/") && (text.includes("createServiceRole") || text.includes("service_role"))) {
    throw new Error(`Potential service-role misuse found: ${file}`);
  }
  if (file.includes("/src/app/") && text.includes("createRequestSupabaseClient")) {
    throw new Error(`Supabase query/client found directly in UI route: ${file}`);
  }
  if (file.includes("/src/features/") && /@\/features\/[^/]+\/(application|infrastructure|routes)\//.test(text)) {
    throw new Error(`Private cross-feature import found: ${file}`);
  }
}

for (const file of migrationFiles) {
  if (file === migrationPath) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes("update public.stock_balances") && !file.endsWith("20260625133000_inventory_ledger_posting_foundation.sql")) {
    throw new Error(`Direct stock_balances update found outside Sprint 9 posting foundation: ${file}`);
  }
}

console.log("Sprint 10 inventory transactions verification passed.");

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return [path];
  });
}
