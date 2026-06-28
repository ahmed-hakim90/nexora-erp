-- Nexora Inventory Reservation Engine foundation.
-- Architecture and data contracts only. No runtime reserve/consume/release RPCs,
-- accounting, costing, or warehouse execution are implemented here.

create type public.inventory_reservation_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'reserved',
  'picked',
  'issued',
  'in_transit',
  'received',
  'completed',
  'rejected',
  'cancelled',
  'released',
  'expired',
  'consumed'
);

create type public.inventory_reservation_kind as enum (
  'soft_hold',
  'hard_reservation',
  'transfer_reservation',
  'manufacturing_reservation',
  'sales_reservation',
  'service_reservation',
  'rental_reservation',
  'project_reservation',
  'custom'
);

create type public.inventory_quantity_event_kind as enum (
  'reservation_requested',
  'reservation_created',
  'reservation_approved',
  'reservation_released',
  'reservation_consumed',
  'reservation_expired',
  'reservation_cancelled',
  'availability_changed',
  'transfer_issued',
  'transfer_received',
  'snapshot_recalculated'
);

alter table public.stock_balances
  add column quantity_pending_approval numeric(18, 6) not null default 0,
  add column quantity_in_transit numeric(18, 6) not null default 0,
  add column quantity_incoming numeric(18, 6) not null default 0,
  add column quantity_outgoing numeric(18, 6) not null default 0,
  add column quantity_damaged numeric(18, 6) not null default 0,
  add column quantity_quarantine numeric(18, 6) not null default 0,
  add constraint stock_balances_quantity_model_non_negative_chk check (
    quantity_reserved >= 0
    and quantity_pending_approval >= 0
    and quantity_in_transit >= 0
    and quantity_incoming >= 0
    and quantity_outgoing >= 0
    and quantity_damaged >= 0
    and quantity_quarantine >= 0
  );

alter table public.stock_balances drop column quantity_available;

alter table public.stock_balances
  add column quantity_available numeric(18, 6) generated always as (
    quantity_on_hand
    - quantity_reserved
    - quantity_pending_approval
    - quantity_outgoing
    - quantity_damaged
    - quantity_quarantine
  ) stored;

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  reservation_number text not null,
  reservation_kind public.inventory_reservation_kind not null,
  status public.inventory_reservation_status not null default 'draft',
  document_type_key text not null,
  document_id uuid,
  document_reference text,
  source_app text not null,
  source_module text not null,
  idempotency_key text not null,
  correlation_id text not null,
  requested_at timestamptz not null default now(),
  requested_by uuid references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  released_at timestamptz,
  released_by uuid references auth.users(id),
  expires_at timestamptz,
  reason text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'runtime_execution_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(reservation_number)) > 0),
  check (length(trim(document_type_key)) > 0),
  check (length(trim(source_app)) > 0),
  check (length(trim(source_module)) > 0),
  check (length(trim(idempotency_key)) > 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check ((approved_at is null and approved_by is null) or (approved_at is not null and approved_by is not null)),
  check ((released_at is null and released_by is null) or (released_at is not null and released_by is not null))
);

create table public.inventory_reservation_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  reservation_id uuid not null references public.inventory_reservations(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  destination_warehouse_id uuid references public.warehouses(id) on delete restrict,
  destination_location_id uuid references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  status public.inventory_reservation_status not null default 'draft',
  allow_negative_available boolean not null default false,
  requested_quantity numeric(18, 6) not null check (requested_quantity > 0),
  soft_held_quantity numeric(18, 6) not null default 0 check (soft_held_quantity >= 0),
  hard_reserved_quantity numeric(18, 6) not null default 0 check (hard_reserved_quantity >= 0),
  picked_quantity numeric(18, 6) not null default 0 check (picked_quantity >= 0),
  issued_quantity numeric(18, 6) not null default 0 check (issued_quantity >= 0),
  in_transit_quantity numeric(18, 6) not null default 0 check (in_transit_quantity >= 0),
  received_quantity numeric(18, 6) not null default 0 check (received_quantity >= 0),
  consumed_quantity numeric(18, 6) not null default 0 check (consumed_quantity >= 0),
  released_quantity numeric(18, 6) not null default 0 check (released_quantity >= 0),
  expired_quantity numeric(18, 6) not null default 0 check (expired_quantity >= 0),
  document_line_id uuid,
  document_line_reference text,
  idempotency_key text not null,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(idempotency_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (soft_held_quantity <= requested_quantity),
  check (hard_reserved_quantity <= requested_quantity),
  check (picked_quantity <= requested_quantity),
  check (issued_quantity <= requested_quantity),
  check (in_transit_quantity <= requested_quantity),
  check (received_quantity <= requested_quantity),
  check (consumed_quantity <= requested_quantity),
  check (released_quantity <= requested_quantity),
  check (expired_quantity <= requested_quantity)
);

create table public.inventory_quantity_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  snapshot_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity_on_hand numeric(18, 6) not null default 0,
  quantity_reserved numeric(18, 6) not null default 0,
  quantity_pending_approval numeric(18, 6) not null default 0,
  quantity_in_transit numeric(18, 6) not null default 0,
  quantity_incoming numeric(18, 6) not null default 0,
  quantity_outgoing numeric(18, 6) not null default 0,
  quantity_damaged numeric(18, 6) not null default 0,
  quantity_quarantine numeric(18, 6) not null default 0,
  quantity_available numeric(18, 6) generated always as (
    quantity_on_hand
    - quantity_reserved
    - quantity_pending_approval
    - quantity_outgoing
    - quantity_damaged
    - quantity_quarantine
  ) stored,
  source_balance_id uuid references public.stock_balances(id) on delete restrict,
  source_reservation_id uuid references public.inventory_reservations(id) on delete restrict,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (quantity_reserved >= 0),
  check (quantity_pending_approval >= 0),
  check (quantity_in_transit >= 0),
  check (quantity_incoming >= 0),
  check (quantity_outgoing >= 0),
  check (quantity_damaged >= 0),
  check (quantity_quarantine >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create table public.inventory_quantity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  event_kind public.inventory_quantity_event_kind not null,
  reservation_id uuid references public.inventory_reservations(id) on delete restrict,
  reservation_line_id uuid references public.inventory_reservation_lines(id) on delete restrict,
  document_type_key text not null,
  document_id uuid,
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity_delta_on_hand numeric(18, 6) not null default 0,
  quantity_delta_reserved numeric(18, 6) not null default 0,
  quantity_delta_pending_approval numeric(18, 6) not null default 0,
  quantity_delta_in_transit numeric(18, 6) not null default 0,
  quantity_delta_incoming numeric(18, 6) not null default 0,
  quantity_delta_outgoing numeric(18, 6) not null default 0,
  quantity_delta_damaged numeric(18, 6) not null default 0,
  quantity_delta_quarantine numeric(18, 6) not null default 0,
  occurred_at timestamptz not null default now(),
  occurred_by uuid references auth.users(id),
  idempotency_key text not null,
  correlation_id text not null,
  causation_id uuid,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(document_type_key)) > 0),
  check (length(trim(idempotency_key)) > 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create or replace view public.inventory_availability_views as
select
  sb.id as stock_balance_id,
  sb.tenant_id,
  w.company_id,
  w.branch_id,
  sb.product_id,
  null::uuid as product_variant_id,
  sb.warehouse_id,
  sb.location_id,
  sb.lot_id,
  sb.serial_id,
  sb.unit_id,
  sb.quantity_on_hand,
  sb.quantity_reserved,
  sb.quantity_pending_approval,
  sb.quantity_in_transit,
  sb.quantity_incoming,
  sb.quantity_outgoing,
  sb.quantity_damaged,
  sb.quantity_quarantine,
  (
    sb.quantity_on_hand
    - sb.quantity_reserved
    - sb.quantity_pending_approval
    - sb.quantity_outgoing
    - sb.quantity_damaged
    - sb.quantity_quarantine
  ) as quantity_available,
  sb.last_movement_at,
  sb.updated_at
from public.stock_balances sb
join public.warehouses w on w.id = sb.warehouse_id
where sb.is_active = true
  and sb.deleted_at is null
  and w.is_active = true
  and w.deleted_at is null;

create unique index inventory_reservations_idempotency_uq
  on public.inventory_reservations (tenant_id, idempotency_key)
  where deleted_at is null;
create unique index inventory_reservations_number_uq
  on public.inventory_reservations (tenant_id, company_id, reservation_number)
  where deleted_at is null;
create index inventory_reservations_document_idx
  on public.inventory_reservations (tenant_id, document_type_key, document_id, created_at desc)
  where deleted_at is null;
create index inventory_reservations_status_idx
  on public.inventory_reservations (tenant_id, company_id, branch_id, status, created_at desc)
  where deleted_at is null;

create unique index inventory_reservation_lines_idempotency_uq
  on public.inventory_reservation_lines (tenant_id, reservation_id, idempotency_key)
  where deleted_at is null;
create index inventory_reservation_lines_product_idx
  on public.inventory_reservation_lines (tenant_id, product_id, warehouse_id, location_id, status)
  where deleted_at is null;
create index inventory_reservation_lines_destination_idx
  on public.inventory_reservation_lines (tenant_id, destination_warehouse_id, destination_location_id)
  where destination_warehouse_id is not null and deleted_at is null;

create index inventory_quantity_snapshots_product_date_idx
  on public.inventory_quantity_snapshots (tenant_id, product_id, warehouse_id, location_id, snapshot_at desc)
  where deleted_at is null;
create index inventory_quantity_events_product_date_idx
  on public.inventory_quantity_events (tenant_id, product_id, warehouse_id, location_id, occurred_at desc)
  where deleted_at is null;
create unique index inventory_quantity_events_idempotency_uq
  on public.inventory_quantity_events (tenant_id, idempotency_key)
  where deleted_at is null;

create or replace function public.enforce_inventory_reservation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  referenced_tenant_id uuid;
  referenced_company_id uuid;
  referenced_branch_id uuid;
  referenced_warehouse_id uuid;
begin
  if new.branch_id is not null then
    select tenant_id, company_id into referenced_tenant_id, referenced_company_id
    from public.branches
    where id = new.branch_id and is_active = true and deleted_at is null;

    if referenced_tenant_id is distinct from new.tenant_id or referenced_company_id is distinct from new.company_id then
      raise exception 'inventory reservation branch scope must match tenant and company';
    end if;
  end if;

  if tg_table_name in ('inventory_reservation_lines', 'inventory_quantity_events') then
    if new.reservation_id is not null then
      select tenant_id, company_id, branch_id into referenced_tenant_id, referenced_company_id, referenced_branch_id
      from public.inventory_reservations
      where id = new.reservation_id and is_active = true and deleted_at is null;

      if referenced_tenant_id is distinct from new.tenant_id or referenced_company_id is distinct from new.company_id or referenced_branch_id is distinct from new.branch_id then
        raise exception 'inventory reservation line scope must match reservation scope';
      end if;
    end if;
  end if;

  if tg_table_name = 'inventory_quantity_snapshots' then
    if new.source_reservation_id is not null then
      select tenant_id, company_id, branch_id into referenced_tenant_id, referenced_company_id, referenced_branch_id
      from public.inventory_reservations
      where id = new.source_reservation_id and is_active = true and deleted_at is null;

      if referenced_tenant_id is distinct from new.tenant_id or referenced_company_id is distinct from new.company_id or referenced_branch_id is distinct from new.branch_id then
        raise exception 'inventory quantity snapshot scope must match reservation scope';
      end if;
    end if;
  end if;

  if tg_table_name in ('inventory_reservation_lines', 'inventory_quantity_snapshots', 'inventory_quantity_events') then
    select tenant_id into referenced_tenant_id
    from public.products
    where id = new.product_id and is_stockable = true and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'inventory reservation product must be active, stockable, and tenant scoped';
    end if;

    select tenant_id, company_id, branch_id into referenced_tenant_id, referenced_company_id, referenced_branch_id
    from public.warehouses
    where id = new.warehouse_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id or referenced_company_id is distinct from new.company_id then
      raise exception 'inventory reservation warehouse scope must match tenant and company';
    end if;
    if referenced_branch_id is distinct from new.branch_id then
      raise exception 'inventory reservation warehouse branch must match reservation branch';
    end if;

    select tenant_id, branch_id, warehouse_id into referenced_tenant_id, referenced_branch_id, referenced_warehouse_id
    from public.warehouse_locations
    where id = new.location_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id or referenced_branch_id is distinct from new.branch_id or referenced_warehouse_id is distinct from new.warehouse_id then
      raise exception 'inventory reservation location scope must match warehouse and branch';
    end if;

    select tenant_id into referenced_tenant_id
    from public.units
    where id = new.unit_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'inventory reservation unit must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_manual_stock_balance_quantity_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.quantity_on_hand is distinct from new.quantity_on_hand and coalesce(current_setting('app.stock_posting_service', true), '') <> 'on' then
    raise exception 'quantity_on_hand must be changed by the stock posting service';
  end if;

  if (
    old.quantity_reserved is distinct from new.quantity_reserved
    or old.quantity_pending_approval is distinct from new.quantity_pending_approval
    or old.quantity_in_transit is distinct from new.quantity_in_transit
    or old.quantity_incoming is distinct from new.quantity_incoming
    or old.quantity_outgoing is distinct from new.quantity_outgoing
    or old.quantity_damaged is distinct from new.quantity_damaged
    or old.quantity_quarantine is distinct from new.quantity_quarantine
  ) and coalesce(current_setting('app.inventory_reservation_engine', true), '') <> 'on' then
    raise exception 'inventory quantity buckets must be changed by the inventory reservation engine';
  end if;

  return new;
end;
$$;

create trigger inventory_reservations_touch_updated_at before update on public.inventory_reservations for each row execute function public.touch_platform_row();
create trigger inventory_reservations_prevent_id_change before update on public.inventory_reservations for each row execute function public.prevent_id_change();
create trigger inventory_reservations_prevent_tenant_id_change before update on public.inventory_reservations for each row execute function public.prevent_tenant_id_change();
create trigger inventory_reservations_enforce_scope before insert or update on public.inventory_reservations for each row execute function public.enforce_inventory_reservation_scope();

create trigger inventory_reservation_lines_touch_updated_at before update on public.inventory_reservation_lines for each row execute function public.touch_platform_row();
create trigger inventory_reservation_lines_prevent_id_change before update on public.inventory_reservation_lines for each row execute function public.prevent_id_change();
create trigger inventory_reservation_lines_prevent_tenant_id_change before update on public.inventory_reservation_lines for each row execute function public.prevent_tenant_id_change();
create trigger inventory_reservation_lines_enforce_scope before insert or update on public.inventory_reservation_lines for each row execute function public.enforce_inventory_reservation_scope();

create trigger inventory_quantity_snapshots_touch_updated_at before update on public.inventory_quantity_snapshots for each row execute function public.touch_platform_row();
create trigger inventory_quantity_snapshots_prevent_id_change before update on public.inventory_quantity_snapshots for each row execute function public.prevent_id_change();
create trigger inventory_quantity_snapshots_prevent_tenant_id_change before update on public.inventory_quantity_snapshots for each row execute function public.prevent_tenant_id_change();
create trigger inventory_quantity_snapshots_enforce_scope before insert or update on public.inventory_quantity_snapshots for each row execute function public.enforce_inventory_reservation_scope();

create trigger inventory_quantity_events_touch_updated_at before update on public.inventory_quantity_events for each row execute function public.touch_platform_row();
create trigger inventory_quantity_events_prevent_id_change before update on public.inventory_quantity_events for each row execute function public.prevent_id_change();
create trigger inventory_quantity_events_prevent_tenant_id_change before update on public.inventory_quantity_events for each row execute function public.prevent_tenant_id_change();
create trigger inventory_quantity_events_enforce_scope before insert or update on public.inventory_quantity_events for each row execute function public.enforce_inventory_reservation_scope();

create trigger stock_balances_prevent_manual_quantity_mutation
  before update on public.stock_balances
  for each row execute function public.prevent_manual_stock_balance_quantity_mutation();

alter table public.inventory_reservations enable row level security;
alter table public.inventory_reservation_lines enable row level security;
alter table public.inventory_quantity_snapshots enable row level security;
alter table public.inventory_quantity_events enable row level security;

alter table public.inventory_reservations force row level security;
alter table public.inventory_reservation_lines force row level security;
alter table public.inventory_quantity_snapshots force row level security;
alter table public.inventory_quantity_events force row level security;

create policy inventory_reservations_select_member_permission on public.inventory_reservations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.view', tenant_id));
create policy inventory_reservations_insert_engine_permission on public.inventory_reservations for insert to authenticated with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.create', tenant_id));
create policy inventory_reservations_update_engine_permission on public.inventory_reservations for update to authenticated using (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.reservations.approve', tenant_id) or public.has_permission('inventory.reservations.release', tenant_id) or public.has_permission('inventory.reservations.consume', tenant_id) or public.has_permission('inventory.reservations.cancel', tenant_id))) with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.reservations.approve', tenant_id) or public.has_permission('inventory.reservations.release', tenant_id) or public.has_permission('inventory.reservations.consume', tenant_id) or public.has_permission('inventory.reservations.cancel', tenant_id)));

create policy inventory_reservation_lines_select_member_permission on public.inventory_reservation_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.view', tenant_id));
create policy inventory_reservation_lines_insert_engine_permission on public.inventory_reservation_lines for insert to authenticated with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.create', tenant_id));
create policy inventory_reservation_lines_update_engine_permission on public.inventory_reservation_lines for update to authenticated using (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.reservations.approve', tenant_id) or public.has_permission('inventory.reservations.release', tenant_id) or public.has_permission('inventory.reservations.consume', tenant_id) or public.has_permission('inventory.reservations.cancel', tenant_id))) with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.reservations.approve', tenant_id) or public.has_permission('inventory.reservations.release', tenant_id) or public.has_permission('inventory.reservations.consume', tenant_id) or public.has_permission('inventory.reservations.cancel', tenant_id)));

create policy inventory_quantity_snapshots_select_member_permission on public.inventory_quantity_snapshots for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy inventory_quantity_snapshots_insert_engine_permission on public.inventory_quantity_snapshots for insert to authenticated with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.snapshot', tenant_id));

create policy inventory_quantity_events_select_member_permission on public.inventory_quantity_events for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.audit', tenant_id));
create policy inventory_quantity_events_insert_engine_permission on public.inventory_quantity_events for insert to authenticated with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.audit', tenant_id));

create policy event_outbox_inventory_reservations_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('InventoryReservationRequested', 'InventoryReservationCreated', 'InventoryReservationApproved', 'InventoryReservationReleased', 'InventoryReservationConsumed', 'InventoryReservationExpired', 'InventoryReservationCancelled', 'InventoryAvailabilityChanged', 'InventoryTransferIssued', 'InventoryTransferReceived') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.audit', tenant_id));
create policy event_outbox_inventory_reservations_insert on public.event_outbox for insert to authenticated with check (current_setting('app.inventory_reservation_engine', true) = 'on' and is_active = true and deleted_at is null and event_name in ('InventoryReservationRequested', 'InventoryReservationCreated', 'InventoryReservationApproved', 'InventoryReservationReleased', 'InventoryReservationConsumed', 'InventoryReservationExpired', 'InventoryReservationCancelled', 'InventoryAvailabilityChanged', 'InventoryTransferIssued', 'InventoryTransferReceived') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.audit', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.reservations.view', 'View Inventory Reservations', 'View inventory reservations, reservation lines, and availability.', 'standard'),
  ('inventory.reservations.create', 'Create Inventory Reservations', 'Create reservation requests through the Inventory Reservation Engine.', 'high'),
  ('inventory.reservations.approve', 'Approve Inventory Reservations', 'Approve reservations and promote approved demand to hard reservation contracts.', 'high'),
  ('inventory.reservations.release', 'Release Inventory Reservations', 'Release, reject, or expire reservation quantities through the Inventory Reservation Engine.', 'high'),
  ('inventory.reservations.consume', 'Consume Inventory Reservations', 'Consume reserved quantities when an approved inventory operation is issued or completed.', 'high'),
  ('inventory.reservations.cancel', 'Cancel Inventory Reservations', 'Cancel open reservations and release their quantities through the Inventory Reservation Engine.', 'high'),
  ('inventory.reservations.audit', 'Audit Inventory Reservations', 'View and write reservation audit, quantity events, and reservation event contracts.', 'high'),
  ('inventory.reservations.manage', 'Manage Inventory Reservations', 'Legacy aggregate permission retained for compatibility with foundation contracts.', 'high')
on conflict do nothing;

insert into public.app_settings (tenant_id, setting_key, value_type, value, description)
values
  (null, 'inventory.reservations.pending-approval-soft-hold', 'boolean', 'true'::jsonb, 'When enabled, pending approval documents may create soft holds through the future reservation engine.'),
  (null, 'inventory.reservations.expiry-minutes', 'number', '1440'::jsonb, 'Default reservation expiry window for future background expiration jobs.')
on conflict do nothing;
