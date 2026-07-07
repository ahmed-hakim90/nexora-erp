-- Inventory Foundation Sprint 6: Inventory Document Foundation & Current State Projection Contract.
-- Document shell, line, snapshot, and projection contracts only.
-- No ledger runtime, stock movements, posting, reservation, or warehouse execution runtime.

comment on column public.inventory_serial_numbers.current_handling_unit_id is
  'Denormalized current-state projection only. Source of truth is inventory ledger projections.';
comment on column public.inventory_serial_numbers.current_warehouse_id is
  'Denormalized current-state projection only. Source of truth is inventory ledger projections.';
comment on column public.inventory_serial_numbers.current_location_id is
  'Denormalized current-state projection only. Source of truth is inventory ledger projections.';
comment on column public.inventory_serial_numbers.current_custodian is
  'Denormalized current-state projection only. Source of truth is inventory ledger projections.';
comment on column public.inventory_handling_units.warehouse_id is
  'Current placement projection. Authoritative state is derived from inventory ledger projections.';
comment on column public.inventory_handling_units.location_id is
  'Current placement projection. Authoritative state is derived from inventory ledger projections.';
comment on column public.inventory_handling_units.current_custodian is
  'Denormalized current-state projection only. Source of truth is inventory ledger projections.';

create table public.inventory_document_type_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_kind text not null,
  document_type text not null,
  label text not null,
  source_apps text[] not null default '{}'::text[],
  lifecycle_states text[] not null default array['draft', 'submitted', 'pending_approval', 'approved', 'confirmed', 'posted', 'completed', 'cancelled', 'archived'],
  approval_ready boolean not null default true,
  audit_ready boolean not null default true,
  print_ready boolean not null default true,
  posting_ready boolean not null default true,
  ledger_posting_ready boolean not null default true,
  runtime_execution_implemented boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (document_kind = lower(document_kind)),
  check (length(trim(document_kind)) > 0),
  check (length(trim(document_type)) > 0),
  check (length(trim(label)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_document_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid,
  document_kind text not null,
  line_number integer not null check (line_number > 0),
  object_type text not null check (object_type in ('product_quantity', 'lot_quantity', 'serial', 'handling_unit', 'child_handling_unit')),
  product_id uuid references public.inventory_products(id) on delete restrict,
  variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  child_handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  quantity numeric(24, 6),
  uom_id uuid references public.inventory_uoms(id) on delete restrict,
  source_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  source_location_id uuid references public.inventory_locations(id) on delete restrict,
  destination_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  destination_location_id uuid references public.inventory_locations(id) on delete restrict,
  inventory_status text not null default 'available' check (inventory_status in (
    'available', 'reserved', 'picked', 'packed', 'shipped', 'sold', 'returned',
    'qc_hold', 'damaged', 'scrap', 'service', 'blocked', 'in_transit'
  )),
  reason_code_metadata jsonb not null default '{}'::jsonb,
  snapshot_metadata jsonb not null default '{}'::jsonb,
  validation_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(reason_code_metadata) = 'object'),
  check (jsonb_typeof(snapshot_metadata) = 'object'),
  check (jsonb_typeof(validation_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_document_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid,
  line_id uuid references public.inventory_document_lines(id) on delete restrict,
  snapshot_version integer not null default 1 check (snapshot_version > 0),
  object_identity jsonb not null,
  labels jsonb not null default '{}'::jsonb,
  quantity_uom jsonb not null default '{}'::jsonb,
  locations jsonb not null default '{}'::jsonb,
  hu_contents_snapshot jsonb not null default '{}'::jsonb,
  actor_metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  correlation_id text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(object_identity) = 'object'),
  check (jsonb_typeof(labels) = 'object'),
  check (jsonb_typeof(quantity_uom) = 'object'),
  check (jsonb_typeof(locations) = 'object'),
  check (jsonb_typeof(hu_contents_snapshot) = 'object'),
  check (jsonb_typeof(actor_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_current_state_projections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  projection_kind text not null check (projection_kind in (
    'product_quantity', 'lot_quantity', 'serial_state', 'handling_unit_state',
    'availability', 'reserved_quantity', 'picked_quantity', 'shipped_quantity'
  )),
  object_type text not null check (object_type in ('product_quantity', 'lot_quantity', 'serial', 'handling_unit', 'child_handling_unit')),
  product_id uuid references public.inventory_products(id) on delete restrict,
  variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  inventory_status text check (inventory_status in (
    'available', 'reserved', 'picked', 'packed', 'shipped', 'sold', 'returned',
    'qc_hold', 'damaged', 'scrap', 'service', 'blocked', 'in_transit'
  )),
  quantity numeric(24, 6),
  uom_id uuid references public.inventory_uoms(id) on delete restrict,
  custodian jsonb not null default '{}'::jsonb,
  derived_from_document_id uuid,
  derived_from_ledger_entry_id uuid,
  projection_version bigint not null default 1 check (projection_version > 0),
  projected_at timestamptz not null default now(),
  correlation_id text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(custodian) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_document_type_registry_scope_kind_uq
  on public.inventory_document_type_registry (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), document_kind)
  where deleted_at is null;
create index inventory_document_lines_document_idx
  on public.inventory_document_lines (tenant_id, company_id, document_kind, document_id, line_number)
  where deleted_at is null;
create index inventory_document_snapshots_document_idx
  on public.inventory_document_snapshots (tenant_id, company_id, document_id, line_id, captured_at desc)
  where deleted_at is null;
create index inventory_current_state_projections_anchor_idx
  on public.inventory_current_state_projections (tenant_id, company_id, projection_kind, object_type, product_id, lot_id, serial_id, handling_unit_id)
  where deleted_at is null;

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
      if new.current_custodian is distinct from old.current_custodian then
        raise exception 'inventory handling unit current_custodian is projection-only and must be written by the projection engine';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_serial_numbers_projection_only_trg on public.inventory_serial_numbers;
create trigger inventory_serial_numbers_projection_only_trg
  before insert or update on public.inventory_serial_numbers
  for each row execute function public.enforce_inventory_projection_only_identity_fields();

drop trigger if exists inventory_handling_units_projection_only_trg on public.inventory_handling_units;
create trigger inventory_handling_units_projection_only_trg
  before insert or update on public.inventory_handling_units
  for each row execute function public.enforce_inventory_projection_only_identity_fields();

alter table public.inventory_document_type_registry enable row level security;
alter table public.inventory_document_lines enable row level security;
alter table public.inventory_document_snapshots enable row level security;
alter table public.inventory_current_state_projections enable row level security;

create policy inventory_document_type_registry_select on public.inventory_document_type_registry
  for select to authenticated using (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.view', tenant_id)
  );
create policy inventory_document_type_registry_manage on public.inventory_document_type_registry
  for all to authenticated using (
    deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  ) with check (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  );

create policy inventory_document_lines_select on public.inventory_document_lines
  for select to authenticated using (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.view', tenant_id)
  );
create policy inventory_document_lines_manage on public.inventory_document_lines
  for all to authenticated using (
    deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  ) with check (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  );

create policy inventory_document_snapshots_select on public.inventory_document_snapshots
  for select to authenticated using (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.view', tenant_id)
  );
create policy inventory_document_snapshots_manage on public.inventory_document_snapshots
  for all to authenticated using (
    deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  ) with check (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.movements.create', tenant_id)
  );

create policy inventory_current_state_projections_select on public.inventory_current_state_projections
  for select to authenticated using (
    is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  );
create policy inventory_current_state_projections_manage on public.inventory_current_state_projections
  for all to authenticated using (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  ) with check (
    coalesce(current_setting('app.inventory_projection_service', true), '') = 'true'
    and is_active = true and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  );
