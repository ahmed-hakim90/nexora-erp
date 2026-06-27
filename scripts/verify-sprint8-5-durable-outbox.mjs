import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve("supabase/migrations/20260625124500_durable_event_outbox.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();
const publicApi = readFileSync(resolve("src/platform/integration/public-api.ts"), "utf8");
const serverApi = readFileSync(resolve("src/platform/integration/server.ts"), "utf8");
const packageJson = readFileSync(resolve("package.json"), "utf8");

function tableBody(table) {
  const match = normalized.match(new RegExp(`create table public\\.${table} \\((.*?)\\);`));
  return match?.[1] ?? "";
}

const requiredCreatedTables = ["event_outbox", "webhook_deliveries"];
const missingCreatedTables = requiredCreatedTables.filter(
  (table) => !normalized.includes(`create table public.${table}`),
);

const requiredOutboxColumns = [
  "tenant_id uuid not null",
  "event_id uuid not null",
  "event_name text not null",
  "event_version integer not null",
  "aggregate_id uuid not null",
  "aggregate_type text not null",
  "payload jsonb not null",
  "metadata jsonb not null default '{}'::jsonb",
  "status public.event_outbox_status not null default 'pending'",
  "retry_count integer not null default 0",
  "max_retries integer not null default 3",
  "next_retry_at timestamptz",
  "locked_at timestamptz",
  "locked_by text",
  "processed_at timestamptz",
  "error_message text",
  "idempotency_key text not null",
  "correlation_id text not null",
  "causation_id uuid",
].filter((fragment) => !tableBody("event_outbox").includes(fragment));

const requiredWebhookColumns = [
  "tenant_id uuid not null",
  "webhook_endpoint_id uuid references public.webhook_endpoints",
  "delivery_id uuid not null",
  "event_id uuid not null",
  "event_name text not null",
  "event_version integer not null",
  "status public.webhook_delivery_persistence_status not null default 'pending'",
  "retry_count integer not null default 0",
  "max_retries integer not null default 3",
  "next_retry_at timestamptz",
  "signed_payload_hash text not null",
  "idempotency_key text not null",
  "correlation_id text not null",
  "metadata jsonb not null default '{}'::jsonb",
].filter((fragment) => !tableBody("webhook_deliveries").includes(fragment));

const requiredStatusValues = [
  "'pending'",
  "'processing'",
  "'succeeded'",
  "'failed'",
  "'dead_letter'",
  "'cancelled'",
].filter((fragment) => !normalized.includes(fragment));

const requiredSchemaFragments = [
  "create type public.event_outbox_status as enum",
  "create type public.webhook_delivery_persistence_status as enum",
  "create unique index event_outbox_event_id_uq on public.event_outbox (tenant_id, event_id)",
  "create unique index event_outbox_idempotency_uq on public.event_outbox (tenant_id, idempotency_key)",
  "create index event_outbox_claim_idx",
  "create unique index webhook_deliveries_idempotency_uq",
  "alter table public.event_handler_runs add column retry_count integer not null default 0",
  "alter table public.event_dead_letters add column reason text",
  "add column payload_snapshot jsonb not null default '{}'::jsonb",
  "prevent_event_outbox_payload_change",
  "event outbox metadata cannot be changed after enqueue",
  "event_outbox_prevent_payload_change",
  "event_outbox_touch_updated_at",
  "webhook_deliveries_touch_updated_at",
  "claim_event_outbox",
  "for update skip locked",
  "security invoker",
  "grant execute on function public.claim_event_outbox",
].filter((fragment) => !normalized.includes(fragment));

const missingRls = requiredCreatedTables.filter(
  (table) => !normalized.includes(`alter table public.${table} enable row level security`),
);
const missingForcedRls = requiredCreatedTables.filter(
  (table) => !normalized.includes(`alter table public.${table} force row level security`),
);
const missingTenantGuards = requiredCreatedTables.filter(
  (table) => !normalized.includes(`${table}_prevent_tenant_id_change`),
);
const missingPolicies = requiredCreatedTables.filter((table) => {
  const statements = Array.from(
    normalized.matchAll(new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, "g")),
    (match) => match[0],
  );

  return (
    statements.length === 0 ||
    statements.some(
      (statement) =>
        !statement.includes("public.is_tenant_member(tenant_id)") ||
        !statement.includes("public.has_permission") ||
        (/ for (insert|update) /.test(statement) && !statement.includes(" with check ")),
    )
  );
});

const requiredPublicApiFragments = [
  "EventOutboxStatus",
  "EventOutboxRecord",
  "EnqueueEventOutboxInput",
  "ClaimEventOutboxInput",
  "MarkEventFailedInput",
  "MoveEventToDeadLetterInput",
  "QueueAdapter",
  "QueueMessage",
  "WebhookDeliveryPersistenceRecord",
].filter((fragment) => !publicApi.includes(fragment));

const requiredServerFragments = [
  "class OutboxService",
  "enqueue(",
  "claimPendingEvents(",
  "markProcessing(",
  "markSucceeded(",
  "markFailed(",
  "moveToDeadLetter(",
  "assertOutboxLockOwner",
  "assertLockedBy",
  "calculateNextRetryAt",
  "findByIdempotencyKey",
  "claim_event_outbox",
  ".eq(\"tenant_id\", this.context.tenantId)",
  "event_dead_letters",
].filter((fragment) => !serverApi.includes(fragment));

const forbiddenMigrationFragments = [
  "create table public.inventory_transactions",
  "create table public.stock_movements",
  "create table public.production",
  "create table public.purchase",
  "create table public.sales",
  "create table public.accounting",
  "create table public.pos",
  "create table public.marketplace",
].filter((fragment) => normalized.includes(fragment));

const forbiddenCodeFragments = [
  "createServiceRoleSupabaseClient",
  "service-role-client",
  "service_role",
  "externalQueueProvider",
  "inventoryTransaction",
  "postInventory",
  "@/features/",
].filter((fragment) => serverApi.includes(fragment) || publicApi.includes(fragment));

if (missingCreatedTables.length > 0) throw new Error(`Missing Sprint 8.5 tables: ${missingCreatedTables.join(", ")}`);
if (requiredOutboxColumns.length > 0) throw new Error(`Missing event_outbox columns: ${requiredOutboxColumns.join(", ")}`);
if (requiredWebhookColumns.length > 0) throw new Error(`Missing webhook_deliveries columns: ${requiredWebhookColumns.join(", ")}`);
if (requiredStatusValues.length > 0) throw new Error(`Missing status values: ${requiredStatusValues.join(", ")}`);
if (requiredSchemaFragments.length > 0) throw new Error(`Missing schema fragments: ${requiredSchemaFragments.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingTenantGuards.length > 0) throw new Error(`Missing tenant guards: ${missingTenantGuards.join(", ")}`);
if (missingPolicies.length > 0) throw new Error(`Missing tenant-scoped policies: ${missingPolicies.join(", ")}`);
if (requiredPublicApiFragments.length > 0) throw new Error(`Missing public API fragments: ${requiredPublicApiFragments.join(", ")}`);
if (requiredServerFragments.length > 0) throw new Error(`Missing server API fragments: ${requiredServerFragments.join(", ")}`);
if (forbiddenMigrationFragments.length > 0) throw new Error(`Forbidden workflow tables found: ${forbiddenMigrationFragments.join(", ")}`);
if (forbiddenCodeFragments.length > 0) throw new Error(`Forbidden platform code fragments found: ${forbiddenCodeFragments.join(", ")}`);
if (!packageJson.includes("\"verify:sprint8_5\"")) throw new Error("package.json is missing verify:sprint8_5 script.");

console.log("Sprint 8.5 durable outbox verification passed.");
