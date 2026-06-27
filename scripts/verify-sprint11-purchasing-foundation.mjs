import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260625150000_purchasing_foundation.sql");
const migration = readFileSync(migrationPath, "utf8");

const requiredTables = [
  "purchase_requests",
  "purchase_request_lines",
  "purchase_rfqs",
  "purchase_rfq_lines",
  "purchase_orders",
  "purchase_order_lines",
  "purchase_receipts",
  "purchase_receipt_lines",
];

const forbiddenFragments = [
  "production",
  "sales_",
  "accounting",
  "journal",
  "ledger",
  "supplier_invoice",
  "payment",
  "landed_cost",
];

const requiredPermissions = [
  "purchasing.view",
  "purchasing.request.create",
  "purchasing.request.approve",
  "purchasing.rfq.manage",
  "purchasing.order.create",
  "purchasing.order.approve",
  "purchasing.order.confirm",
  "purchasing.receipt.create",
  "purchasing.receipt.post",
  "purchasing.cancel",
];

const requiredEvents = [
  "purchasing.request.created",
  "purchasing.request.approved",
  "purchasing.rfq.sent",
  "purchasing.order.confirmed",
  "purchasing.order.partially_received",
  "purchasing.order.received",
  "purchasing.receipt.posted",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table public.${table}`)) throw new Error(`Missing Sprint 11 table: ${table}`);
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled for ${table}`);
  if (!migration.includes(`alter table public.${table} force row level security`)) throw new Error(`RLS is not forced for ${table}`);
  if (!migration.includes(` on public.${table} for insert`) || !migration.includes("with check")) {
    throw new Error(`Missing WITH CHECK policy for ${table}`);
  }
}

for (const fragment of forbiddenFragments) {
  const forbiddenCreate = new RegExp(`create\\s+table\\s+public\\.[a-z0-9_]*${fragment}[a-z0-9_]*`, "i");
  if (forbiddenCreate.test(migration)) throw new Error(`Sprint 11 must not create forbidden table family: ${fragment}`);
}

for (const permission of requiredPermissions) {
  if (!migration.includes(permission)) throw new Error(`Missing purchasing permission: ${permission}`);
}

for (const event of requiredEvents) {
  if (!migration.includes(event)) throw new Error(`Missing durable purchasing event policy: ${event}`);
}

for (const required of [
  "prevent_purchase_request_status_regression",
  "prevent_purchase_rfq_status_regression",
  "prevent_purchase_order_status_regression",
  "prevent_purchase_receipt_status_regression",
  "assert_purchase_reference_scope",
  "assert_purchase_line_reference_scope",
  "apply_purchase_receipt_to_order",
  "reverse_purchase_receipt_from_order",
  "app.purchasing_receipt_service",
  "purchase document product must be active and purchasable",
  "confirmed purchase orders cannot be freely edited",
  "posted purchase receipts cannot be freely edited",
  "purchase receipt line must match order line and remaining quantity",
]) {
  if (!migration.includes(required)) throw new Error(`Missing purchasing database guard: ${required}`);
}

if (migration.includes("update public.stock_balances") || migration.includes("insert into public.stock_ledger_entries")) {
  throw new Error("Purchasing migration must not mutate stock balances or stock ledger directly.");
}

const srcFiles = listFiles(resolve("src")).filter((path) => /\.(ts|tsx)$/.test(path));
const purchasingFiles = srcFiles.filter((path) => path.includes("/src/features/purchasing/") || path.includes("/src/app/(erp)/erp/purchasing/"));

const purchasingService = readFileSync(resolve("src/features/purchasing/application/services/purchasing.service.ts"), "utf8");
if (!purchasingService.includes("@/features/inventory/public-api")) throw new Error("Purchase receipt posting must use inventory public API.");
if (!purchasingService.includes("transactionService.post")) throw new Error("Purchase receipt posting must call public inventory transaction posting service.");
if (!purchasingService.includes("transactionService.reverse")) throw new Error("Purchase receipt reversal must call public inventory reversal service.");
if (!purchasingService.includes("inventoryTransactionId")) throw new Error("Purchase receipt posting must persist and reuse the inventory transaction link.");
if (!purchasingService.includes("applyReceiptToOrder")) throw new Error("Purchase receipt posting must apply received quantities to the purchase order.");
if (!purchasingService.includes("reverseReceiptFromOrder")) throw new Error("Purchase receipt reversal must reverse purchase order received quantities.");
if (purchasingService.includes("posted: [\"reversed\"]")) throw new Error("Posted purchase receipts must not reverse through generic status transitions.");
if (!purchasingService.includes("this.outbox.enqueue")) throw new Error("Purchasing events must use durable outbox.");

const purchasingRepository = readFileSync(resolve("src/features/purchasing/infrastructure/repositories/purchasing.repository.ts"), "utf8");
for (const required of [
  "assertAllProductsPurchasable",
  "assertAllUnits",
  "assertReceiptScope",
  "Purchase receipt quantity cannot exceed remaining order quantity",
  "Purchase receipt lines must match order line product and unit",
  "rpc(\"apply_purchase_receipt_to_order\"",
  "rpc(\"reverse_purchase_receipt_from_order\"",
]) {
  if (!purchasingRepository.includes(required)) throw new Error(`Missing purchasing repository guard: ${required}`);
}

for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  if (/\.from\(["']stock_balances["']\)\.(insert|update|upsert|delete)/.test(text)) {
    throw new Error(`Direct stock_balances mutation found: ${file}`);
  }
  if (/\.from\(["']stock_ledger_entries["']\)\.(insert|update|upsert|delete)/.test(text) && !file.includes("/src/features/inventory/")) {
    throw new Error(`Direct stock ledger mutation outside inventory found: ${file}`);
  }
  if (file.includes("/src/features/purchasing/") && /@\/features\/inventory\/(application|infrastructure|routes)\//.test(text)) {
    throw new Error(`Private inventory import found in purchasing: ${file}`);
  }
  if (file.includes("/src/app/") && text.includes("createRequestSupabaseClient")) {
    throw new Error(`Supabase query/client found directly in UI route: ${file}`);
  }
  if (file.includes("/src/features/") && /@\/features\/[^/]+\/(application|infrastructure|routes)\//.test(text)) {
    throw new Error(`Private cross-feature import found: ${file}`);
  }
  if (file.includes("/src/features/purchasing/") && (text.includes("createServiceRole") || text.includes("service_role"))) {
    throw new Error(`Potential service-role misuse found in purchasing: ${file}`);
  }
}

for (const file of purchasingFiles) {
  const text = readFileSync(file, "utf8");
  for (const forbidden of ["supplier_invoice", "payment", "ledger", "journal", "production", "sales"]) {
    if (text.includes(forbidden)) throw new Error(`Forbidden Sprint 11 concept found in ${file}: ${forbidden}`);
  }
}

console.log("Sprint 11 purchasing foundation verification passed.");

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return [path];
  });
}
