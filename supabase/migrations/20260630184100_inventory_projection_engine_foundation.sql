-- Inventory Foundation Sprint 8: Inventory Projection Engine foundation.
-- Derives current state from immutable inventory_ledger_entries. No reservation, warehouse execution, or costing runtime.

alter table public.inventory_current_state_projections
  add column if not exists causation_id text;

comment on column public.inventory_current_state_projections.causation_id is
  'Causation chain metadata copied from the ledger entry that last updated this projection.';

create unique index if not exists inventory_current_state_projections_anchor_uq
  on public.inventory_current_state_projections (
    tenant_id,
    company_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    projection_kind,
    object_type,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(serial_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(handling_unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(inventory_status, '')
  )
  where deleted_at is null;

create table public.inventory_projection_runtime_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  projection_version bigint not null default 1 check (projection_version > 0),
  last_processed_ledger_entry_id uuid references public.inventory_ledger_entries(id) on delete restrict,
  last_processed_posting_timestamp timestamptz,
  rebuild_status text not null default 'idle' check (rebuild_status in ('idle', 'rebuilding', 'failed')),
  rebuild_started_at timestamptz,
  rebuild_completed_at timestamptz,
  rebuild_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(rebuild_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_projection_applied_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  ledger_entry_id uuid not null references public.inventory_ledger_entries(id) on delete restrict,
  projection_version bigint not null check (projection_version > 0),
  correlation_id text,
  causation_id text,
  applied_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_projection_runtime_state_scope_uq
  on public.inventory_projection_runtime_state (
    tenant_id,
    company_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where deleted_at is null;
create unique index inventory_projection_applied_entries_ledger_uq
  on public.inventory_projection_applied_entries (tenant_id, company_id, ledger_entry_id)
  where deleted_at is null;
create index inventory_projection_applied_entries_version_idx
  on public.inventory_projection_applied_entries (tenant_id, company_id, projection_version desc, applied_at desc)
  where deleted_at is null;

create or replace function public.enforce_inventory_projection_service_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('app.inventory_projection_service', true), '') <> 'true' then
    raise exception 'inventory projections may only be written by the inventory projection engine';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger inventory_current_state_projections_projection_service_insert
  before insert on public.inventory_current_state_projections
  for each row execute function public.enforce_inventory_projection_service_writes();

create trigger inventory_current_state_projections_projection_service_update
  before update on public.inventory_current_state_projections
  for each row execute function public.enforce_inventory_projection_service_writes();

create trigger inventory_current_state_projections_projection_service_delete
  before delete on public.inventory_current_state_projections
  for each row execute function public.enforce_inventory_projection_service_writes();

create trigger inventory_projection_runtime_state_projection_service_write
  before insert or update or delete on public.inventory_projection_runtime_state
  for each row execute function public.enforce_inventory_projection_service_writes();

create trigger inventory_projection_applied_entries_projection_service_write
  before insert or update or delete on public.inventory_projection_applied_entries
  for each row execute function public.enforce_inventory_projection_service_writes();

alter table public.inventory_projection_runtime_state enable row level security;
alter table public.inventory_projection_runtime_state force row level security;
alter table public.inventory_projection_applied_entries enable row level security;
alter table public.inventory_projection_applied_entries force row level security;

create policy inventory_projection_runtime_state_select on public.inventory_projection_runtime_state
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  );

create policy inventory_projection_runtime_state_manage on public.inventory_projection_runtime_state
  for all to authenticated
  using (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and public.is_tenant_member(tenant_id)
  ) with check (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and public.is_tenant_member(tenant_id)
  );

create policy inventory_projection_applied_entries_select on public.inventory_projection_applied_entries
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  );

create policy inventory_projection_applied_entries_manage on public.inventory_projection_applied_entries
  for all to authenticated
  using (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and public.is_tenant_member(tenant_id)
  ) with check (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and public.is_tenant_member(tenant_id)
  );

comment on table public.inventory_projection_runtime_state is
  'Projection engine cursor and rebuild metadata. Ledger is history; projections are rebuildable current state.';
comment on table public.inventory_projection_applied_entries is
  'Idempotency ledger for projection application. Prevents double application of the same ledger entry.';

create or replace function public.inventory_projection_service_guard()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.inventory_projection_service', 'true', true);
end;
$$;

grant execute on function public.inventory_projection_service_guard() to authenticated;

create or replace function public.enforce_inventory_projection_only_identity_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('app.inventory_projection_service', true), '') <> 'true' then
    if tg_table_name = 'inventory_serial_numbers' then
      if tg_op = 'INSERT' then
        if new.current_handling_unit_id is not null
          or new.current_warehouse_id is not null
          or new.current_location_id is not null
          or new.current_custodian <> '{}'::jsonb then
          raise exception 'inventory serial current-state fields are projection-only and must be written by the projection engine';
        end if;
      elsif tg_op = 'UPDATE' then
        if new.current_handling_unit_id is distinct from old.current_handling_unit_id
          or new.current_warehouse_id is distinct from old.current_warehouse_id
          or new.current_location_id is distinct from old.current_location_id
          or new.current_custodian is distinct from old.current_custodian then
          raise exception 'inventory serial current-state fields are projection-only and must be written by the projection engine';
        end if;
      end if;
    elsif tg_table_name = 'inventory_handling_units' and tg_op = 'UPDATE' then
      if new.warehouse_id is distinct from old.warehouse_id
        or new.location_id is distinct from old.location_id
        or new.current_custodian is distinct from old.current_custodian then
        raise exception 'inventory handling unit current-state fields are projection-only and must be written by the projection engine';
      end if;
    end if;
  end if;
  return new;
end;
$$;
