-- Inventory Foundation Sprint 2: Warehouse Structure & Location Architecture.
-- Architecture and readiness metadata only. No stock movements, ledger, handling units,
-- picking/packing execution, PDA runtime, purchasing, sales, manufacturing, or costing.

alter table public.inventory_warehouses
  drop constraint if exists inventory_warehouses_warehouse_type_check;

alter table public.inventory_locations
  drop constraint if exists inventory_locations_location_kind_check;

alter table public.inventory_warehouses
  add column if not exists manager_id uuid references public.profiles(id) on delete restrict,
  add column if not exists cost_center_id uuid references public.finance_dimensions(id) on delete restrict,
  add column if not exists default_receiving_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists default_shipping_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists default_qc_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists default_returns_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists operational_policies jsonb not null default '{}'::jsonb;

alter table public.inventory_locations
  add column if not exists barcode text,
  add column if not exists capacity_metadata jsonb not null default '{}'::jsonb,
  add column if not exists allowed_product_categories jsonb not null default '[]'::jsonb,
  add column if not exists allowed_inventory_statuses jsonb not null default '[]'::jsonb,
  add column if not exists pickable boolean not null default false,
  add column if not exists receivable boolean not null default false,
  add column if not exists shippable boolean not null default false,
  add column if not exists qc_required boolean not null default false;

update public.inventory_warehouses
set warehouse_type = case warehouse_type
  when 'branch' then 'main'
  when 'quarantine' then 'qc'
  when 'in_transit' then 'transit'
  when 'virtual' then 'transit'
  else warehouse_type
end
where warehouse_type in ('branch', 'quarantine', 'in_transit', 'virtual');

update public.inventory_locations
set
  location_kind = case location_kind
    when 'warehouse' then 'zone'
    when 'virtual' then 'transit'
    when 'staging' then 'receiving'
    when 'quarantine' then 'qc_hold'
    else location_kind
  end,
  barcode = coalesce(barcode, upper(location_key))
where deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_warehouses_warehouse_type_check'
      and conrelid = 'public.inventory_warehouses'::regclass
  ) then
    alter table public.inventory_warehouses
      add constraint inventory_warehouses_warehouse_type_check
      check (warehouse_type in ('main', 'finished_goods', 'raw_materials', 'spare_parts', 'service', 'returns', 'scrap', 'qc', 'production_buffer', 'transit'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_locations_location_kind_check'
      and conrelid = 'public.inventory_locations'::regclass
  ) then
    alter table public.inventory_locations
      add constraint inventory_locations_location_kind_check
      check (location_kind in ('zone', 'aisle', 'rack', 'shelf', 'bin', 'receiving', 'shipping', 'qc_hold', 'returns', 'scrap', 'production_input', 'production_output', 'transit'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_warehouses_policy_metadata_chk'
      and conrelid = 'public.inventory_warehouses'::regclass
  ) then
    alter table public.inventory_warehouses
      add constraint inventory_warehouses_policy_metadata_chk
      check (jsonb_typeof(operational_policies) = 'object');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_locations_architecture_metadata_chk'
      and conrelid = 'public.inventory_locations'::regclass
  ) then
    alter table public.inventory_locations
      add constraint inventory_locations_architecture_metadata_chk
      check (
        barcode is not null
        and length(trim(barcode)) > 0
        and jsonb_typeof(capacity_metadata) = 'object'
        and jsonb_typeof(allowed_product_categories) = 'array'
        and jsonb_typeof(allowed_inventory_statuses) = 'array'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_locations_operational_flags_chk'
      and conrelid = 'public.inventory_locations'::regclass
  ) then
    alter table public.inventory_locations
      add constraint inventory_locations_operational_flags_chk
      check (
        (location_kind <> 'receiving' or receivable = true)
        and (location_kind <> 'shipping' or shippable = true)
        and (location_kind <> 'qc_hold' or qc_required = true)
      );
  end if;
end $$;

create or replace function public.enforce_inventory_warehouse_location_architecture()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if tg_table_name = 'inventory_locations' and new.parent_location_id is not null then
    select tenant_id, company_id, branch_id, warehouse_id into parent_record
    from public.inventory_locations
    where id = new.parent_location_id and deleted_at is null;

    if parent_record.tenant_id is null then
      raise exception 'inventory parent location must exist';
    end if;

    if parent_record.tenant_id <> new.tenant_id
      or parent_record.company_id <> new.company_id
      or parent_record.branch_id <> new.branch_id
      or parent_record.warehouse_id <> new.warehouse_id then
      raise exception 'inventory parent location must belong to the same warehouse hierarchy';
    end if;
  end if;

  if tg_table_name = 'inventory_warehouses' then
    for parent_record in
      select location_id
      from (values
        (new.default_receiving_location_id),
        (new.default_shipping_location_id),
        (new.default_qc_location_id),
        (new.default_returns_location_id)
      ) as defaults(location_id)
      where location_id is not null
    loop
      if not exists (
        select 1
        from public.inventory_locations location
        where location.id = parent_record.location_id
          and location.tenant_id = new.tenant_id
          and location.company_id = new.company_id
          and location.branch_id = new.branch_id
          and location.warehouse_id = new.id
          and location.deleted_at is null
      ) then
        raise exception 'inventory warehouse default locations must belong to the same warehouse';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_locations_architecture_scope on public.inventory_locations;
create trigger inventory_locations_architecture_scope
  before insert or update on public.inventory_locations
  for each row execute function public.enforce_inventory_warehouse_location_architecture();

drop trigger if exists inventory_warehouses_default_locations_scope on public.inventory_warehouses;
create trigger inventory_warehouses_default_locations_scope
  before insert or update on public.inventory_warehouses
  for each row execute function public.enforce_inventory_warehouse_location_architecture();

create unique index if not exists inventory_locations_scope_barcode_uq
  on public.inventory_locations (tenant_id, company_id, warehouse_id, barcode)
  where deleted_at is null;

create index if not exists inventory_warehouses_type_idx
  on public.inventory_warehouses (tenant_id, company_id, branch_id, warehouse_type, status)
  where deleted_at is null;

create index if not exists inventory_locations_hierarchy_idx
  on public.inventory_locations (tenant_id, company_id, warehouse_id, parent_location_id, location_kind, status)
  where deleted_at is null;

comment on table public.inventory_warehouses is 'Enterprise warehouse business entities for Inventory Foundation. No stock movement, ledger, handling units, or warehouse execution runtime.';
comment on table public.inventory_locations is 'Hierarchical warehouse storage points for Inventory Foundation. No quantity, stock balance, movement, or direct inventory update fields.';
comment on column public.inventory_locations.barcode is 'Barcode-ready location identifier for scanning readiness only. No PDA or warehouse execution runtime.';
comment on column public.inventory_locations.capacity_metadata is 'Capacity metadata only; no stock quantity or balance is stored here.';
comment on column public.inventory_warehouses.operational_policies is 'Operational policy metadata only; no picking, packing, purchasing, sales, manufacturing, or costing behavior.';
