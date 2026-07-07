-- Inventory Foundation Sprint 9: Reservation Engine projection-integrated foundation.
-- Demand/claims against projected availability only. No ledger posting, picking, or stock mutation.

comment on table public.inventory_reservations is
  'Inventory reservation demand headers. Claims projected availability; physical stock changes only through ledger posting.';

alter table public.inventory_reservations
  add column if not exists source_document_type text,
  add column if not exists source_document_line_id uuid,
  add column if not exists priority integer not null default 0,
  add column if not exists release_reason text,
  add column if not exists demand_status text;

alter table public.inventory_reservations
  add constraint inventory_reservations_demand_status_chk
    check (
      demand_status is null
      or demand_status in (
        'draft', 'requested', 'partially_reserved', 'reserved',
        'released', 'expired', 'cancelled', 'failed'
      )
    );

alter table public.inventory_reservation_lines
  add column if not exists object_type text,
  add column if not exists inventory_product_id uuid references public.inventory_products(id) on delete restrict,
  add column if not exists inventory_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  add column if not exists inventory_lot_id uuid references public.inventory_lots(id) on delete restrict,
  add column if not exists inventory_serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  add column if not exists inventory_handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  add column if not exists inventory_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  add column if not exists inventory_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists inventory_uom_id uuid references public.inventory_uoms(id) on delete restrict,
  add column if not exists inventory_status text,
  add column if not exists quantity numeric(24, 6),
  add column if not exists reserved_quantity numeric(24, 6) not null default 0,
  add column if not exists shortage_quantity numeric(24, 6) not null default 0,
  add column if not exists allocation_strategy text,
  add column if not exists validation_metadata jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_metadata jsonb not null default '{}'::jsonb;

alter table public.inventory_reservation_lines
  add constraint inventory_reservation_lines_object_type_chk
    check (
      object_type is null
      or object_type in ('product_quantity', 'lot_quantity', 'serial', 'handling_unit', 'child_handling_unit')
    ),
  add constraint inventory_reservation_lines_inventory_status_chk
    check (
      inventory_status is null
      or inventory_status in (
        'available', 'reserved', 'picked', 'packed', 'shipped', 'sold', 'returned',
        'qc_hold', 'damaged', 'scrap', 'service', 'blocked', 'in_transit'
      )
    ),
  add constraint inventory_reservation_lines_allocation_strategy_chk
    check (
      allocation_strategy is null
      or allocation_strategy in (
        'strict_serial', 'strict_lot', 'any_available', 'fifo', 'fefo',
        'location_priority', 'manual'
      )
    ),
  add constraint inventory_reservation_lines_reserved_quantity_chk
    check (reserved_quantity >= 0),
  add constraint inventory_reservation_lines_shortage_quantity_chk
    check (shortage_quantity >= 0),
  add constraint inventory_reservation_lines_validation_metadata_chk
    check (jsonb_typeof(validation_metadata) = 'object'),
  add constraint inventory_reservation_lines_snapshot_metadata_chk
    check (jsonb_typeof(snapshot_metadata) = 'object');

create table public.inventory_reservation_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  reservation_id uuid not null references public.inventory_reservations(id) on delete restrict,
  reservation_line_id uuid not null references public.inventory_reservation_lines(id) on delete restrict,
  allocation_status text not null default 'allocated' check (allocation_status in ('allocated', 'released', 'expired')),
  allocated_quantity numeric(24, 6) not null check (allocated_quantity > 0),
  projection_anchor_key text not null,
  object_type text not null check (object_type in ('product_quantity', 'lot_quantity', 'serial', 'handling_unit', 'child_handling_unit')),
  product_id uuid references public.inventory_products(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  correlation_id text,
  causation_id text,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  expired_at timestamptz,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(projection_anchor_key)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_reservation_expiry_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  reservation_id uuid not null references public.inventory_reservations(id) on delete restrict,
  expires_at timestamptz not null,
  queue_status text not null default 'pending' check (queue_status in ('pending', 'processing', 'completed', 'failed')),
  last_attempted_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  deleted_at timestamptz,
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create unique index inventory_reservation_allocations_active_serial_uq
  on public.inventory_reservation_allocations (tenant_id, company_id, serial_id)
  where serial_id is not null and allocation_status = 'allocated' and deleted_at is null;

create unique index inventory_reservation_allocations_active_handling_unit_uq
  on public.inventory_reservation_allocations (tenant_id, company_id, handling_unit_id)
  where handling_unit_id is not null and allocation_status = 'allocated' and deleted_at is null;

create index inventory_reservation_expiry_queue_pending_idx
  on public.inventory_reservation_expiry_queue (tenant_id, company_id, expires_at asc)
  where queue_status = 'pending' and deleted_at is null;

create or replace function public.enforce_inventory_reservation_engine_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('app.inventory_reservation_engine', true), '') not in ('on', 'true') then
    raise exception 'inventory reservations may only be written by the inventory reservation engine';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.inventory_reservation_engine_guard()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.inventory_reservation_engine', 'true', true);
end;
$$;

grant execute on function public.inventory_reservation_engine_guard() to authenticated;

create trigger inventory_reservation_allocations_engine_write
  before insert or update or delete on public.inventory_reservation_allocations
  for each row execute function public.enforce_inventory_reservation_engine_writes();

create trigger inventory_reservation_expiry_queue_engine_write
  before insert or update or delete on public.inventory_reservation_expiry_queue
  for each row execute function public.enforce_inventory_reservation_engine_writes();

alter table public.inventory_reservation_allocations enable row level security;
alter table public.inventory_reservation_allocations force row level security;
alter table public.inventory_reservation_expiry_queue enable row level security;
alter table public.inventory_reservation_expiry_queue force row level security;

create policy inventory_reservation_allocations_select on public.inventory_reservation_allocations
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.reservations.view', tenant_id)
  );

create policy inventory_reservation_allocations_manage on public.inventory_reservation_allocations
  for all to authenticated
  using (
    coalesce(current_setting('app.inventory_reservation_engine', true), '') in ('on', 'true')
    and public.is_tenant_member(tenant_id)
  ) with check (
    coalesce(current_setting('app.inventory_reservation_engine', true), '') in ('on', 'true')
    and public.is_tenant_member(tenant_id)
  );

create policy inventory_reservation_expiry_queue_select on public.inventory_reservation_expiry_queue
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.reservations.view', tenant_id)
  );

create policy inventory_reservation_expiry_queue_manage on public.inventory_reservation_expiry_queue
  for all to authenticated
  using (
    coalesce(current_setting('app.inventory_reservation_engine', true), '') in ('on', 'true')
    and public.is_tenant_member(tenant_id)
  ) with check (
    coalesce(current_setting('app.inventory_reservation_engine', true), '') in ('on', 'true')
    and public.is_tenant_member(tenant_id)
  );

comment on table public.inventory_reservation_allocations is
  'Projection-backed reservation allocations. No ledger or stock balance mutation.';
comment on table public.inventory_reservation_expiry_queue is
  'Background job readiness queue for reservation expiry processing. Scheduler not implemented in Sprint 9.';
