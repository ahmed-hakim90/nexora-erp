-- Nexora Sprint 8.5: Durable Event Outbox and Event Persistence only.
-- No inventory transactions, production, purchasing, sales, accounting, POS, or marketplace workflows.

create type public.event_outbox_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'dead_letter',
  'cancelled'
);

create type public.webhook_delivery_persistence_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'dead_letter',
  'cancelled'
);

create table public.event_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event_id uuid not null,
  event_name text not null,
  event_version integer not null check (event_version > 0),
  aggregate_id uuid not null,
  aggregate_type text not null,
  payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  status public.event_outbox_status not null default 'pending',
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retries integer not null default 3 check (max_retries >= 0),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  error_message text,
  idempotency_key text not null,
  correlation_id text not null,
  causation_id uuid,
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
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (status <> 'processing' or (locked_at is not null and locked_by is not null)),
  check (status not in ('succeeded', 'dead_letter', 'cancelled') or processed_at is not null),
  check (retry_count <= max_retries or status in ('dead_letter', 'cancelled')),
  check (deleted_at is null)
);

create unique index event_outbox_event_id_uq
  on public.event_outbox (tenant_id, event_id);
create unique index event_outbox_idempotency_uq
  on public.event_outbox (tenant_id, idempotency_key);
create index event_outbox_claim_idx
  on public.event_outbox (tenant_id, status, next_retry_at, created_at, id)
  where deleted_at is null and status in ('pending', 'failed');
create index event_outbox_correlation_idx
  on public.event_outbox (tenant_id, correlation_id, created_at desc)
  where deleted_at is null;
create index event_outbox_aggregate_idx
  on public.event_outbox (tenant_id, aggregate_type, aggregate_id, created_at desc)
  where deleted_at is null;

alter table public.event_handler_runs
  add column retry_count integer not null default 0 check (retry_count >= 0);

alter table public.event_dead_letters
  add column reason text;

update public.event_dead_letters
set reason = error_message
where reason is null;

alter table public.event_dead_letters
  alter column reason set not null,
  add column payload_snapshot jsonb not null default '{}'::jsonb;

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  webhook_endpoint_id uuid references public.webhook_endpoints(id) on delete restrict,
  delivery_id uuid not null,
  event_id uuid not null,
  event_name text not null,
  event_version integer not null check (event_version > 0),
  status public.webhook_delivery_persistence_status not null default 'pending',
  attempt integer not null default 1 check (attempt > 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retries integer not null default 3 check (max_retries >= 0),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  delivered_at timestamptz,
  response_status_code integer,
  signed_payload_hash text not null,
  signature_algorithm text not null default 'hmac-sha256' check (signature_algorithm in ('hmac-sha256')),
  error_message text,
  idempotency_key text not null,
  correlation_id text not null,
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
  check (status <> 'processing' or (locked_at is not null and locked_by is not null)),
  check (status <> 'succeeded' or delivered_at is not null),
  check (retry_count <= max_retries or status in ('dead_letter', 'cancelled')),
  check (deleted_at is null)
);

create unique index webhook_deliveries_delivery_id_uq
  on public.webhook_deliveries (tenant_id, delivery_id);
create unique index webhook_deliveries_idempotency_uq
  on public.webhook_deliveries (tenant_id, idempotency_key);
create index webhook_deliveries_event_idx
  on public.webhook_deliveries (tenant_id, event_id, created_at desc)
  where deleted_at is null;
create index webhook_deliveries_retry_idx
  on public.webhook_deliveries (tenant_id, status, next_retry_at, created_at)
  where deleted_at is null and status in ('pending', 'failed');

create or replace function public.prevent_event_outbox_payload_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payload is distinct from old.payload then
    raise exception 'event outbox payload cannot be changed after enqueue';
  end if;

  if new.metadata is distinct from old.metadata then
    raise exception 'event outbox metadata cannot be changed after enqueue';
  end if;

  if new.event_id is distinct from old.event_id
    or new.event_name is distinct from old.event_name
    or new.event_version is distinct from old.event_version
    or new.aggregate_id is distinct from old.aggregate_id
    or new.aggregate_type is distinct from old.aggregate_type
    or new.idempotency_key is distinct from old.idempotency_key
    or new.correlation_id is distinct from old.correlation_id
    or new.causation_id is distinct from old.causation_id then
    raise exception 'event outbox envelope cannot be changed after enqueue';
  end if;

  return new;
end;
$$;

create trigger event_outbox_prevent_tenant_id_change before update on public.event_outbox for each row execute function public.prevent_tenant_id_change();
create trigger webhook_deliveries_prevent_tenant_id_change before update on public.webhook_deliveries for each row execute function public.prevent_tenant_id_change();
create trigger event_outbox_prevent_payload_change before update on public.event_outbox for each row execute function public.prevent_event_outbox_payload_change();
create trigger event_outbox_touch_updated_at before update on public.event_outbox for each row execute function public.touch_platform_row();
create trigger webhook_deliveries_touch_updated_at before update on public.webhook_deliveries for each row execute function public.touch_platform_row();

create or replace function public.claim_event_outbox(
  input_tenant_id uuid,
  input_locked_by text,
  input_limit integer default 10,
  input_now timestamptz default now()
)
returns setof public.event_outbox
language plpgsql
security invoker
set search_path = public
as $$
begin
  if input_limit < 1 or input_limit > 100 then
    raise exception 'event outbox claim limit must be between 1 and 100';
  end if;

  if input_locked_by is null or length(trim(input_locked_by)) = 0 then
    raise exception 'event outbox claim requires locked_by';
  end if;

  return query
    with claimable as (
      select id
      from public.event_outbox
      where tenant_id = input_tenant_id
        and deleted_at is null
        and status in ('pending', 'failed')
        and (next_retry_at is null or next_retry_at <= input_now)
        and retry_count <= max_retries
      order by created_at asc, id asc
      limit input_limit
      for update skip locked
    )
    update public.event_outbox outbox
    set status = 'processing',
        locked_at = input_now,
        locked_by = input_locked_by,
        updated_at = input_now,
        updated_by = public.current_user_id(),
        version = outbox.version + 1
    from claimable
    where outbox.id = claimable.id
      and outbox.tenant_id = input_tenant_id
    returning outbox.*;
end;
$$;

alter table public.event_outbox enable row level security;
alter table public.webhook_deliveries enable row level security;

alter table public.event_outbox force row level security;
alter table public.webhook_deliveries force row level security;

create policy event_outbox_member_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.view', tenant_id));
create policy event_outbox_member_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));
create policy event_outbox_member_update on public.event_outbox for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.events.publish', tenant_id));

create policy webhook_deliveries_member_select on public.webhook_deliveries for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.view', tenant_id));
create policy webhook_deliveries_member_insert on public.webhook_deliveries for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));
create policy webhook_deliveries_member_update on public.webhook_deliveries for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.webhooks.manage', tenant_id));

grant execute on function public.claim_event_outbox(uuid, text, integer, timestamptz) to authenticated;
