import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const migrationPath = resolve("supabase/migrations/20260625122000_integration_platform_domain_events.sql");
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.replace(/\s+/g, " ").toLowerCase();

const requiredTables = [
  "event_registry",
  "event_audit_log",
  "event_subscriptions",
  "event_dead_letters",
  "integration_registry",
  "webhook_endpoints",
  "webhook_delivery_logs",
  "api_version_registry",
  "import_jobs",
  "export_registry",
  "event_background_handlers",
  "event_handler_runs",
];

const forbiddenTables = [
  "stock_movements",
  "stock_movement_ledger",
  "inventory_transactions",
  "production_orders",
  "production_reports",
  "work_orders",
  "boms",
  "sales_orders",
  "sales_invoices",
  "purchase_orders",
  "purchase_invoices",
  "journal_entries",
  "accounting_ledger_entries",
  "pos_orders",
  "marketplace_orders",
];

function walk(directory) {
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

const createdTables = Array.from(
  normalized.matchAll(/create table public\.([a-z0-9_]+)/g),
  (match) => match[1],
);
const missingTables = requiredTables.filter((table) => !createdTables.includes(table));
const unexpectedTables = createdTables.filter((table) => !requiredTables.includes(table));
const forbiddenCreatedTables = createdTables.filter((table) => forbiddenTables.includes(table));
const missingRls = requiredTables.filter(
  (table) => !normalized.includes(`alter table public.${table} enable row level security`),
);
const missingForcedRls = requiredTables.filter(
  (table) => !normalized.includes(`alter table public.${table} force row level security`),
);
const missingTenantGuards = requiredTables.filter(
  (table) => !normalized.includes(`${table}_prevent_tenant_id_change`),
);
const unsafeForAllPolicies = Array.from(
  normalized.matchAll(/create policy ([a-z0-9_]+) on public\.([a-z0-9_]+) for all/g),
  (match) => `${match[2]}.${match[1]}`,
);
const missingPolicyWithCheck = requiredTables.filter((table) => {
  const policyStatements = Array.from(
    normalized.matchAll(new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, "g")),
    (match) => match[0],
  );
  const writes = policyStatements.filter((statement) => / for (insert|update) /.test(statement));
  return writes.length === 0 || writes.some((statement) => !statement.includes(" with check "));
});
const policiesWithoutPermission = requiredTables.filter((table) => {
  const policyStatements = Array.from(
    normalized.matchAll(new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, "g")),
    (match) => match[0],
  );
  return policyStatements.length === 0 || policyStatements.some((statement) => !statement.includes("public.has_permission"));
});
const missingTenantColumns = requiredTables.filter(
  (table) => !tableBody(table).includes("tenant_id uuid not null"),
);
const missingMetadataColumns = requiredTables.filter(
  (table) => !tableBody(table).includes("metadata jsonb not null default '{}'::jsonb"),
);

const requiredTypes = [
  "integration_event_kind",
  "integration_handler_mode",
  "event_delivery_status",
  "webhook_delivery_status",
  "integration_direction",
  "integration_channel",
  "api_version_status",
  "import_format",
  "import_job_status",
  "generic_export_format",
].filter((typeName) => !normalized.includes(`create type public.${typeName}`));

const requiredFragments = [
  "correlation_id text not null",
  "request_id text",
  "causation_id uuid",
  "idempotency_key text",
  "event_version integer not null",
  "aggregate_id uuid not null",
  "aggregate_type text not null",
  "actor jsonb not null",
  "signature_algorithm text not null default 'hmac-sha256'",
  "target_url like 'https://%'",
  "api_version text not null",
  "format public.import_format not null",
  "preview_snapshot jsonb not null",
  "supported_formats jsonb not null",
  "queue_key text not null",
  "idempotency_key text not null",
  "cancellation_requested boolean not null",
  "progress jsonb not null",
  "logs jsonb not null",
].filter((fragment) => !normalized.includes(fragment));

const forbiddenPlatformFragments = [
  "'marketplace'",
  "'pos'",
  "create table public.stock",
  "create table public.production",
  "create table public.sales",
  "create table public.purchase",
  "create table public.journal",
].filter((fragment) => normalized.includes(fragment));

const publicApi = readFileSync(resolve("src/platform/integration/public-api.ts"), "utf8");
const serverApi = readFileSync(resolve("src/platform/integration/server.ts"), "utf8");
const registrations = readFileSync(resolve("src/platform/integration/registrations.ts"), "utf8");
const packageJson = readFileSync(resolve("package.json"), "utf8");
const sprintDoc = readFileSync(resolve("docs/SPRINT8_INTEGRATION_PLATFORM.md"), "utf8");

const requiredPublicApiFragments = [
  "IntegrationEventKind",
  "EventMetadata",
  "aggregateId",
  "aggregateType",
  "tenantId: string",
  "actor:",
  "correlationId",
  "requestId",
  "causationId",
  "eventVersion",
  "defineModuleEventRegistration",
  "defineModuleIntegrationRegistration",
  "OutgoingWebhookDefinition",
  "ImportFormat",
  "GenericExportDefinition",
  "EventBackgroundHandlerDefinition",
  "createDomainEvent",
  "ImportRollbackPlaceholder",
  "EventHandlerRunRecord",
].filter((fragment) => !publicApi.includes(fragment));

const requiredServerFragments = [
  "class EventRegistry",
  "class EventBus",
  "subscribe(",
  "publish(",
  "runWithRetry",
  "validateEventEnvelope",
  "deepFreezeClone",
  "recordDeadLetter",
  "class WebhookEngine",
  "signPayload",
  "class ImportEngine",
  "createPreview",
  "class GenericExportRegistry",
  "class BackgroundEventHandlerRegistry",
  "createRollbackPlaceholder",
].filter((fragment) => !serverApi.includes(fragment));

const requiredRegistrationFragments = [
  "platform.event.published",
  "platform.webhook.delivery_failed",
  "platform.import.preview_created",
  "platform.export.requested",
  "platform.outgoing-webhooks",
  "platform.generic-import-export",
  "v1",
  "v2",
].filter((fragment) => !registrations.includes(fragment));

const forbiddenBusinessFragments = [
  "post_stock",
  "post_inventory",
  "create table public.stock_movements",
  "create table public.stock_movement_ledger",
  "create table public.production",
  "create table public.sales",
  "create table public.purchase",
  "create table public.journal",
].filter((fragment) => normalized.includes(fragment));

const integrationFiles = walk(join(root, "src/platform/integration")).filter((file) =>
  /\.(ts|tsx)$/.test(file),
);
const platformFiles = walk(join(root, "src/platform")).filter((file) => /\.(ts|tsx)$/.test(file));
const forbiddenFeatureImports = integrationFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return /@\/features\//.test(source);
});
const platformFeatureImports = platformFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return /@\/features\//.test(source);
});
const unsafeDynamicImports = integrationFiles.filter((file) => {
  const source = readFileSync(file, "utf8");
  return /\bimport\s*\(/.test(source);
});

if (missingTables.length > 0) throw new Error(`Missing Sprint 8 tables: ${missingTables.join(", ")}`);
if (unexpectedTables.length > 0) throw new Error(`Unexpected Sprint 8 tables: ${unexpectedTables.join(", ")}`);
if (forbiddenCreatedTables.length > 0) throw new Error(`Forbidden business tables found: ${forbiddenCreatedTables.join(", ")}`);
if (missingRls.length > 0) throw new Error(`Missing RLS enable statements: ${missingRls.join(", ")}`);
if (missingForcedRls.length > 0) throw new Error(`Missing forced RLS statements: ${missingForcedRls.join(", ")}`);
if (missingTenantGuards.length > 0) throw new Error(`Missing immutable tenant triggers: ${missingTenantGuards.join(", ")}`);
if (unsafeForAllPolicies.length > 0) throw new Error(`FOR ALL policies are not allowed: ${unsafeForAllPolicies.join(", ")}`);
if (missingPolicyWithCheck.length > 0) throw new Error(`Missing WITH CHECK on write policies: ${missingPolicyWithCheck.join(", ")}`);
if (policiesWithoutPermission.length > 0) throw new Error(`Policies missing permission checks: ${policiesWithoutPermission.join(", ")}`);
if (missingTenantColumns.length > 0) throw new Error(`Missing tenant columns: ${missingTenantColumns.join(", ")}`);
if (missingMetadataColumns.length > 0) throw new Error(`Missing metadata columns: ${missingMetadataColumns.join(", ")}`);
if (requiredTypes.length > 0) throw new Error(`Missing integration enum types: ${requiredTypes.join(", ")}`);
if (requiredFragments.length > 0) throw new Error(`Missing migration fragments: ${requiredFragments.join(", ")}`);
if (forbiddenPlatformFragments.length > 0) throw new Error(`Forbidden platform/business fragments found: ${forbiddenPlatformFragments.join(", ")}`);
if (requiredPublicApiFragments.length > 0) throw new Error(`Missing public API fragments: ${requiredPublicApiFragments.join(", ")}`);
if (requiredServerFragments.length > 0) throw new Error(`Missing server API fragments: ${requiredServerFragments.join(", ")}`);
if (requiredRegistrationFragments.length > 0) throw new Error(`Missing platform registrations: ${requiredRegistrationFragments.join(", ")}`);
if (forbiddenBusinessFragments.length > 0) throw new Error(`Forbidden business logic fragments found: ${forbiddenBusinessFragments.join(", ")}`);
if (forbiddenFeatureImports.length > 0) throw new Error(`Integration platform imports feature modules: ${forbiddenFeatureImports.join(", ")}`);
if (platformFeatureImports.length > 0) throw new Error(`Platform imports feature modules: ${platformFeatureImports.join(", ")}`);
if (unsafeDynamicImports.length > 0) throw new Error(`Unsafe dynamic imports found in integration platform: ${unsafeDynamicImports.join(", ")}`);
if (!packageJson.includes("\"verify:sprint8\"")) throw new Error("package.json is missing verify:sprint8 script.");
const normalizedSprintDoc = sprintDoc.toLowerCase();
if (
  !sprintDoc.includes("Integration Platform") ||
  !normalizedSprintDoc.includes("does not implement inventory transactions")
) {
  throw new Error("Sprint 8 documentation is missing required scope and boundary statements.");
}

console.log("Sprint 8 integration platform verification passed.");
