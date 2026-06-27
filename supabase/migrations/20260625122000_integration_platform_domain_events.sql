-- Nexora Sprint 8: Integration Platform and Domain Events only.
-- No inventory transactions, production, sales, purchasing, or accounting logic.

create type public.integration_event_kind as enum ('domain', 'integration');
create type public.integration_handler_mode as enum ('sync', 'async');
create type public.event_delivery_status as enum ('pending', 'processing', 'delivered', 'failed', 'dead_lettered');
create type public.webhook_delivery_status as enum ('pending', 'success', 'failed');
create type public.integration_direction as enum ('inbound', 'outbound', 'bidirectional');
create type public.integration_channel as enum ('api', 'webhook', 'mobile', 'ai', 'background');
create type public.api_version_status as enum ('draft', 'active', 'deprecated', 'retired');
create type public.import_format as enum ('excel', 'csv', 'json');
create type public.import_job_status as enum ('uploaded', 'previewed', 'validated', 'queued', 'completed', 'failed', 'cancelled');
create type public.generic_export_format as enum ('excel', 'csv', 'json');

create table public.event_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  event_name text not null,
  event_kind public.integration_event_kind not null,
  event_version integer not null check (event_version > 0),
  payload_schema_key text,
  description text not null,
  deprecated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (event_name = lower(event_name) and event_name ~ '^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9._-]*$'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index event_registry_scope_name_version_active_uq
  on public.event_registry (tenant_id, module_key, event_name, event_version)
  where deleted_at is null;
create index event_registry_event_lookup_idx
  on public.event_registry (tenant_id, event_name, event_version)
  where deleted_at is null;

create table public.event_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event_id uuid not null,
  event_name text not null,
  event_kind public.integration_event_kind not null,
  event_version integer not null check (event_version > 0),
  aggregate_id uuid not null,
  aggregate_type text not null,
  source_module text not null,
  correlation_id text not null,
  request_id text,
  causation_id uuid,
  idempotency_key text,
  actor jsonb not null default '{}'::jsonb,
  company_id uuid references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (event_name = lower(event_name)),
  check (aggregate_type = lower(aggregate_type)),
  check (source_module = lower(source_module)),
  check (jsonb_typeof(actor) = 'object'),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create unique index event_audit_log_event_id_uq
  on public.event_audit_log (tenant_id, event_id);
create index event_audit_log_correlation_idx
  on public.event_audit_log (tenant_id, correlation_id, occurred_at desc);
create index event_audit_log_causation_idx
  on public.event_audit_log (tenant_id, causation_id)
  where causation_id is not null;
create index event_audit_log_aggregate_idx
  on public.event_audit_log (tenant_id, aggregate_type, aggregate_id, occurred_at desc);

create table public.event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_key text not null,
  event_name text not null,
  handler_module text not null,
  handler_mode public.integration_handler_mode not null,
  max_retries integer not null default 3 check (max_retries >= 0),
  dead_letter_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (subscription_key = lower(subscription_key)),
  check (event_name = lower(event_name)),
  check (handler_module = lower(handler_module)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index event_subscriptions_key_active_uq
  on public.event_subscriptions (tenant_id, subscription_key)
  where deleted_at is null;
create index event_subscriptions_event_idx
  on public.event_subscriptions (tenant_id, event_name, handler_mode)
  where deleted_at is null;

create table public.event_dead_letters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event_id uuid not null,
  event_name text not null,
  handler_key text not null,
  attempt integer not null check (attempt > 0),
  error_message text not null,
  payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  failed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (event_name = lower(event_name)),
  check (handler_key = lower(handler_key)),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create index event_dead_letters_event_idx
  on public.event_dead_letters (tenant_id, event_name, failed_at desc);

create table public.integration_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  integration_key text not null,
  module_key text not null,
  name text not null,
  channel public.integration_channel not null,
  direction public.integration_direction not null,
  api_versions jsonb not null default '[]'::jsonb,
  event_names jsonb not null default '[]'::jsonb,
  requires_credentials boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (integration_key = lower(integration_key)),
  check (module_key = lower(module_key)),
  check (jsonb_typeof(api_versions) = 'array'),
  check (jsonb_typeof(event_names) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index integration_registry_key_active_uq
  on public.integration_registry (tenant_id, integration_key)
  where deleted_at is null;
create index integration_registry_module_idx
  on public.integration_registry (tenant_id, module_key, channel)
  where deleted_at is null;

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  webhook_key text not null,
  target_url text not null,
  subscribed_events jsonb not null default '[]'::jsonb,
  secret_reference text not null,
  signature_algorithm text not null default 'hmac-sha256' check (signature_algorithm in ('hmac-sha256')),
  max_retries integer not null default 3 check (max_retries >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (webhook_key = lower(webhook_key)),
  check (target_url like 'https://%'),
  check (jsonb_typeof(subscribed_events) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index webhook_endpoints_key_active_uq
  on public.webhook_endpoints (tenant_id, webhook_key)
  where deleted_at is null;

create table public.webhook_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  webhook_endpoint_id uuid references public.webhook_endpoints(id) on delete restrict,
  delivery_id uuid not null,
  event_id uuid not null,
  event_name text not null,
  attempt integer not null check (attempt > 0),
  status public.webhook_delivery_status not null default 'pending',
  response_status_code integer,
  signature text,
  next_retry_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (event_name = lower(event_name)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create unique index webhook_delivery_logs_delivery_attempt_uq
  on public.webhook_delivery_logs (tenant_id, delivery_id, attempt);
create index webhook_delivery_logs_event_idx
  on public.webhook_delivery_logs (tenant_id, event_id, created_at desc);
create index webhook_delivery_logs_retry_idx
  on public.webhook_delivery_logs (tenant_id, status, next_retry_at)
  where status = 'failed';

create table public.api_version_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  api_version text not null,
  status public.api_version_status not null,
  introduced_at date not null,
  sunset_at date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (api_version = lower(api_version) and api_version ~ '^v[0-9]+$'),
  check (sunset_at is null or sunset_at >= introduced_at),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index api_version_registry_version_active_uq
  on public.api_version_registry (tenant_id, api_version)
  where deleted_at is null;

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  import_key text not null,
  format public.import_format not null,
  status public.import_job_status not null default 'uploaded',
  file_attachment_id uuid references public.file_attachments(id) on delete restrict,
  validation_summary jsonb not null default '{}'::jsonb,
  preview_snapshot jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (import_key = lower(import_key)),
  check (jsonb_typeof(validation_summary) = 'object'),
  check (jsonb_typeof(preview_snapshot) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index import_jobs_idempotency_uq
  on public.import_jobs (tenant_id, idempotency_key)
  where deleted_at is null;
create index import_jobs_status_idx
  on public.import_jobs (tenant_id, module_key, status, created_at desc)
  where deleted_at is null;

create table public.export_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  export_key text not null,
  supported_formats jsonb not null default '[]'::jsonb,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (export_key = lower(export_key)),
  check (jsonb_typeof(supported_formats) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index export_registry_key_active_uq
  on public.export_registry (tenant_id, module_key, export_key)
  where deleted_at is null;

create table public.event_background_handlers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  handler_key text not null,
  event_name text not null,
  queue_key text not null,
  max_retries integer not null default 3 check (max_retries >= 0),
  timeout_seconds integer not null default 60 check (timeout_seconds > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (handler_key = lower(handler_key)),
  check (event_name = lower(event_name)),
  check (queue_key = lower(queue_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index event_background_handlers_key_active_uq
  on public.event_background_handlers (tenant_id, handler_key)
  where deleted_at is null;
create index event_background_handlers_event_idx
  on public.event_background_handlers (tenant_id, event_name)
  where deleted_at is null;

create table public.event_handler_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event_id uuid not null,
  event_name text not null,
  handler_key text not null,
  idempotency_key text not null,
  status public.event_delivery_status not null default 'pending',
  attempt integer not null default 1 check (attempt > 0),
  max_retries integer not null default 3 check (max_retries >= 0),
  progress jsonb not null default '{}'::jsonb,
  cancellation_requested boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  next_retry_at timestamptz,
  error_message text,
  logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (event_name = lower(event_name)),
  check (handler_key = lower(handler_key)),
  check (jsonb_typeof(progress) = 'object'),
  check (jsonb_typeof(logs) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index event_handler_runs_idempotency_uq
  on public.event_handler_runs (tenant_id, idempotency_key)
  where deleted_at is null;
create index event_handler_runs_status_retry_idx
  on public.event_handler_runs (tenant_id, status, next_retry_at, created_at desc)
  where deleted_at is null;
create index event_handler_runs_event_idx
  on public.event_handler_runs (tenant_id, event_id, handler_key)
  where deleted_at is null;

create trigger event_registry_prevent_tenant_id_change before update on public.event_registry for each row execute function public.prevent_tenant_id_change();
create trigger event_audit_log_prevent_tenant_id_change before update on public.event_audit_log for each row execute function public.prevent_tenant_id_change();
create trigger event_subscriptions_prevent_tenant_id_change before update on public.event_subscriptions for each row execute function public.prevent_tenant_id_change();
create trigger event_dead_letters_prevent_tenant_id_change before update on public.event_dead_letters for each row execute function public.prevent_tenant_id_change();
create trigger integration_registry_prevent_tenant_id_change before update on public.integration_registry for each row execute function public.prevent_tenant_id_change();
create trigger webhook_endpoints_prevent_tenant_id_change before update on public.webhook_endpoints for each row execute function public.prevent_tenant_id_change();
create trigger webhook_delivery_logs_prevent_tenant_id_change before update on public.webhook_delivery_logs for each row execute function public.prevent_tenant_id_change();
create trigger api_version_registry_prevent_tenant_id_change before update on public.api_version_registry for each row execute function public.prevent_tenant_id_change();
create trigger import_jobs_prevent_tenant_id_change before update on public.import_jobs for each row execute function public.prevent_tenant_id_change();
create trigger export_registry_prevent_tenant_id_change before update on public.export_registry for each row execute function public.prevent_tenant_id_change();
create trigger event_background_handlers_prevent_tenant_id_change before update on public.event_background_handlers for each row execute function public.prevent_tenant_id_change();
create trigger event_handler_runs_prevent_tenant_id_change before update on public.event_handler_runs for each row execute function public.prevent_tenant_id_change();

alter table public.event_registry enable row level security;
alter table public.event_audit_log enable row level security;
alter table public.event_subscriptions enable row level security;
alter table public.event_dead_letters enable row level security;
alter table public.integration_registry enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_delivery_logs enable row level security;
alter table public.api_version_registry enable row level security;
alter table public.import_jobs enable row level security;
alter table public.export_registry enable row level security;
alter table public.event_background_handlers enable row level security;
alter table public.event_handler_runs enable row level security;

alter table public.event_registry force row level security;
alter table public.event_audit_log force row level security;
alter table public.event_subscriptions force row level security;
alter table public.event_dead_letters force row level security;
alter table public.integration_registry force row level security;
alter table public.webhook_endpoints force row level security;
alter table public.webhook_delivery_logs force row level security;
alter table public.api_version_registry force row level security;
alter table public.import_jobs force row level security;
alter table public.export_registry force row level security;
alter table public.event_background_handlers force row level security;
alter table public.event_handler_runs force row level security;

create policy event_registry_member_select on public.event_registry for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.view', tenant_id));
create policy event_registry_member_insert on public.event_registry for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));
create policy event_registry_member_update on public.event_registry for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));

create policy event_audit_log_member_select on public.event_audit_log for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.view', tenant_id));
create policy event_audit_log_member_insert on public.event_audit_log for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));

create policy event_subscriptions_member_select on public.event_subscriptions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.view', tenant_id));
create policy event_subscriptions_member_insert on public.event_subscriptions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));
create policy event_subscriptions_member_update on public.event_subscriptions for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));

create policy event_dead_letters_member_select on public.event_dead_letters for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.view', tenant_id));
create policy event_dead_letters_member_insert on public.event_dead_letters for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));

create policy integration_registry_member_select on public.integration_registry for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.view', tenant_id));
create policy integration_registry_member_insert on public.integration_registry for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));
create policy integration_registry_member_update on public.integration_registry for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));

create policy webhook_endpoints_member_select on public.webhook_endpoints for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));
create policy webhook_endpoints_member_insert on public.webhook_endpoints for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));
create policy webhook_endpoints_member_update on public.webhook_endpoints for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));

create policy webhook_delivery_logs_member_select on public.webhook_delivery_logs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.view', tenant_id));
create policy webhook_delivery_logs_member_insert on public.webhook_delivery_logs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));

create policy api_version_registry_member_select on public.api_version_registry for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.view', tenant_id));
create policy api_version_registry_member_insert on public.api_version_registry for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));
create policy api_version_registry_member_update on public.api_version_registry for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));

create policy import_jobs_member_select on public.import_jobs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.view', tenant_id));
create policy import_jobs_member_insert on public.import_jobs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id));
create policy import_jobs_member_update on public.import_jobs for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id));

create policy export_registry_member_select on public.export_registry for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.view', tenant_id));
create policy export_registry_member_insert on public.export_registry for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id));
create policy export_registry_member_update on public.export_registry for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.import-export.manage', tenant_id));

create policy event_background_handlers_member_select on public.event_background_handlers for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.view', tenant_id));
create policy event_background_handlers_member_insert on public.event_background_handlers for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));
create policy event_background_handlers_member_update on public.event_background_handlers for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.integration.manage', tenant_id));

create policy event_handler_runs_member_select on public.event_handler_runs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.view', tenant_id));
create policy event_handler_runs_member_insert on public.event_handler_runs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));
create policy event_handler_runs_member_update on public.event_handler_runs for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('platform.events.view', 'View Platform Events', 'View domain event audit, handler runs, and dead-letter placeholders.', 'standard'),
  ('platform.events.publish', 'Publish Platform Events', 'Publish registered platform/domain events through the event bus.', 'high'),
  ('platform.integration.view', 'View Integration Registry', 'View platform integration registries and subscriptions.', 'standard'),
  ('platform.integration.manage', 'Manage Integration Registry', 'Manage platform integration registries and handler metadata.', 'high'),
  ('platform.webhooks.view', 'View Webhook Deliveries', 'View generic webhook delivery logs.', 'standard'),
  ('platform.webhooks.manage', 'Manage Webhooks', 'Manage generic webhook endpoint definitions and delivery logs.', 'high'),
  ('platform.import-export.view', 'View Import Export Foundation', 'View generic import and export foundation records.', 'standard'),
  ('platform.import-export.manage', 'Manage Import Export Foundation', 'Manage generic import and export foundation records.', 'high')
on conflict do nothing;
