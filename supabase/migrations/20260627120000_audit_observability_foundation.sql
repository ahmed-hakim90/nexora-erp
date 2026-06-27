-- Nexora Sprint 5: Audit and Observability Engine Foundation.
-- Platform audit/telemetry infrastructure only. No business module tables belong here.

do $$
begin
  create type public.audit_category as enum (
    'security',
    'identity',
    'session',
    'permission',
    'entitlement',
    'data-access',
    'app-lifecycle',
    'workflow',
    'approval',
    'document',
    'print',
    'export',
    'import',
    'connector',
    'automation',
    'ai',
    'system'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_outcome as enum (
    'success',
    'failure',
    'denied',
    'error',
    'pending'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.platform_event_severity as enum (
    'debug',
    'info',
    'notice',
    'warning',
    'error',
    'critical'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.telemetry_source as enum (
    'runtime',
    'api',
    'database',
    'query',
    'report',
    'print',
    'export',
    'import',
    'background-job',
    'webhook',
    'connector',
    'automation',
    'ai-action',
    'system'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.telemetry_outcome as enum (
    'success',
    'failure',
    'error',
    'timeout',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.prevent_platform_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Platform audit and telemetry records are append-only.';
end;
$$;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  company_id uuid,
  branch_id uuid references public.branches(id) on delete restrict,
  actor_type text not null check (actor_type in (
    'user',
    'employee',
    'customer',
    'supplier',
    'driver',
    'technician',
    'service',
    'service-account',
    'integration',
    'automation',
    'ai-agent',
    'system'
  )),
  actor_user_id uuid references auth.users(id),
  actor_identity_id text,
  actor_principal_id text,
  category public.audit_category not null,
  outcome public.audit_outcome not null default 'success',
  severity public.platform_event_severity not null default 'info',
  action text not null,
  subject_type text not null,
  subject_id text,
  subject_display text,
  source_key text not null,
  experience text,
  correlation_id text not null,
  request_id text,
  retention_policy_key text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (action = lower(action)),
  check (source_key = lower(source_key))
);

create index if not exists audit_events_tenant_time_idx
  on public.audit_events (tenant_id, occurred_at desc);
create index if not exists audit_events_category_time_idx
  on public.audit_events (category, occurred_at desc);
create index if not exists audit_events_actor_time_idx
  on public.audit_events (actor_type, actor_principal_id, occurred_at desc);
create index if not exists audit_events_subject_idx
  on public.audit_events (subject_type, subject_id, occurred_at desc);
create index if not exists audit_events_correlation_idx
  on public.audit_events (correlation_id);

drop trigger if exists audit_events_prevent_update on public.audit_events;
create trigger audit_events_prevent_update
  before update on public.audit_events
  for each row execute function public.prevent_platform_event_mutation();

drop trigger if exists audit_events_prevent_delete on public.audit_events;
create trigger audit_events_prevent_delete
  before delete on public.audit_events
  for each row execute function public.prevent_platform_event_mutation();

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

drop policy if exists audit_events_select_tenant on public.audit_events;
create policy audit_events_select_tenant
  on public.audit_events
  for select
  using (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );

drop policy if exists audit_events_insert_tenant on public.audit_events;
create policy audit_events_insert_tenant
  on public.audit_events
  for insert
  with check (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  company_id uuid,
  branch_id uuid references public.branches(id) on delete restrict,
  actor_type text,
  actor_principal_id text,
  event_name text not null,
  source public.telemetry_source not null,
  source_key text,
  severity public.platform_event_severity not null default 'info',
  outcome public.telemetry_outcome not null default 'success',
  experience text,
  correlation_id text not null,
  request_id text,
  metrics jsonb not null default '[]'::jsonb,
  span jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (event_name = lower(event_name))
);

create index if not exists telemetry_events_tenant_time_idx
  on public.telemetry_events (tenant_id, occurred_at desc);
create index if not exists telemetry_events_source_time_idx
  on public.telemetry_events (source, occurred_at desc);
create index if not exists telemetry_events_correlation_idx
  on public.telemetry_events (correlation_id);
create index if not exists telemetry_events_outcome_idx
  on public.telemetry_events (outcome, severity, occurred_at desc);

drop trigger if exists telemetry_events_prevent_update on public.telemetry_events;
create trigger telemetry_events_prevent_update
  before update on public.telemetry_events
  for each row execute function public.prevent_platform_event_mutation();

drop trigger if exists telemetry_events_prevent_delete on public.telemetry_events;
create trigger telemetry_events_prevent_delete
  before delete on public.telemetry_events
  for each row execute function public.prevent_platform_event_mutation();

alter table public.telemetry_events enable row level security;
alter table public.telemetry_events force row level security;

drop policy if exists telemetry_events_select_tenant on public.telemetry_events;
create policy telemetry_events_select_tenant
  on public.telemetry_events
  for select
  using (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );

drop policy if exists telemetry_events_insert_tenant on public.telemetry_events;
create policy telemetry_events_insert_tenant
  on public.telemetry_events
  for insert
  with check (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );

create table if not exists public.observability_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  source public.telemetry_source not null default 'system',
  severity public.platform_event_severity not null default 'info',
  message text not null,
  correlation_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists observability_logs_tenant_time_idx
  on public.observability_logs (tenant_id, occurred_at desc);
create index if not exists observability_logs_source_time_idx
  on public.observability_logs (source, severity, occurred_at desc);
create index if not exists observability_logs_correlation_idx
  on public.observability_logs (correlation_id);

drop trigger if exists observability_logs_prevent_update on public.observability_logs;
create trigger observability_logs_prevent_update
  before update on public.observability_logs
  for each row execute function public.prevent_platform_event_mutation();

drop trigger if exists observability_logs_prevent_delete on public.observability_logs;
create trigger observability_logs_prevent_delete
  before delete on public.observability_logs
  for each row execute function public.prevent_platform_event_mutation();

alter table public.observability_logs enable row level security;
alter table public.observability_logs force row level security;

drop policy if exists observability_logs_select_tenant on public.observability_logs;
create policy observability_logs_select_tenant
  on public.observability_logs
  for select
  using (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );

drop policy if exists observability_logs_insert_tenant on public.observability_logs;
create policy observability_logs_insert_tenant
  on public.observability_logs
  for insert
  with check (
    tenant_id is not null
    and tenant_id = any(public.current_tenant_ids())
  );
