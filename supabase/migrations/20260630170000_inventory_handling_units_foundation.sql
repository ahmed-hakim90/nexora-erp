-- Inventory Foundation Sprint 3: Handling Units Foundation.
-- Container architecture only. No stock movements, ledger, picking/packing runtime,
-- PDA execution, sales, purchasing, manufacturing, service, warranty, or costing.

create table public.inventory_handling_unit_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  type_key text not null,
  name text not null,
  description text,
  level integer not null default 0 check (level >= 0),
  parent_allowed boolean not null default false,
  child_allowed boolean not null default true,
  default_capacity numeric(18, 6) check (default_capacity is null or default_capacity >= 0),
  weight_capacity numeric(18, 6) check (weight_capacity is null or weight_capacity >= 0),
  dimension_metadata jsonb not null default '{}'::jsonb,
  reusable boolean not null default true,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (type_key = lower(type_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(dimension_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_handling_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  hu_type_id uuid not null references public.inventory_handling_unit_types(id) on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  parent_hu_id uuid references public.inventory_handling_units(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  product_id uuid references public.inventory_products(id) on delete restrict,
  hu_number text not null,
  hu_status text not null default 'empty' check (hu_status in ('empty', 'packed', 'partial', 'opened', 'closed', 'reserved', 'picked', 'shipped', 'returned', 'damaged', 'scrapped', 'archived')),
  lifecycle_state text not null default 'draft' check (lifecycle_state in ('draft', 'active', 'sealed', 'opened', 'closed', 'split_ready', 'merge_ready', 'repack_ready', 'traceable', 'archived')),
  barcode text not null,
  qr_payload jsonb not null default '{}'::jsonb,
  gross_weight numeric(18, 6) check (gross_weight is null or gross_weight >= 0),
  net_weight numeric(18, 6) check (net_weight is null or net_weight >= 0),
  dimensions_metadata jsonb not null default '{}'::jsonb,
  sealed_at timestamptz,
  opened_at timestamptz,
  closed_at timestamptz,
  current_custodian jsonb not null default '{}'::jsonb,
  split_ready boolean not null default false,
  merge_ready boolean not null default false,
  repack_ready boolean not null default false,
  traceability_ready boolean not null default true,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (hu_number = upper(hu_number)),
  check (length(trim(barcode)) > 0),
  check (parent_hu_id is null or parent_hu_id <> id),
  check (jsonb_typeof(qr_payload) = 'object'),
  check (jsonb_typeof(dimensions_metadata) = 'object'),
  check (jsonb_typeof(current_custodian) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_handling_unit_contents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  handling_unit_id uuid not null references public.inventory_handling_units(id) on delete restrict,
  content_type text not null check (content_type in ('product_quantity', 'lot_quantity', 'serial_reference', 'child_handling_unit')),
  product_id uuid references public.inventory_products(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  child_hu_id uuid references public.inventory_handling_units(id) on delete restrict,
  quantity numeric(18, 6) not null default 0 check (quantity >= 0),
  uom_id uuid references public.inventory_uoms(id) on delete restrict,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  reason_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(reason_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (
    (content_type = 'product_quantity' and product_id is not null and lot_id is null and serial_id is null and child_hu_id is null and quantity > 0)
    or (content_type = 'lot_quantity' and lot_id is not null and product_id is null and serial_id is null and child_hu_id is null and quantity > 0)
    or (content_type = 'serial_reference' and serial_id is not null and product_id is null and lot_id is null and child_hu_id is null and quantity = 1)
    or (content_type = 'child_handling_unit' and child_hu_id is not null and product_id is null and lot_id is null and serial_id is null and quantity = 1)
  )
);

create unique index inventory_handling_unit_types_scope_key_uq
  on public.inventory_handling_unit_types (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), type_key)
  where deleted_at is null;
create unique index inventory_handling_units_scope_number_uq
  on public.inventory_handling_units (tenant_id, company_id, branch_id, hu_number)
  where deleted_at is null;
create unique index inventory_handling_units_scope_barcode_uq
  on public.inventory_handling_units (tenant_id, company_id, barcode)
  where deleted_at is null;
create index inventory_handling_units_hierarchy_idx
  on public.inventory_handling_units (tenant_id, company_id, warehouse_id, parent_hu_id, hu_status, lifecycle_state)
  where deleted_at is null;
create index inventory_handling_unit_contents_hu_idx
  on public.inventory_handling_unit_contents (tenant_id, company_id, handling_unit_id, content_type, removed_at)
  where deleted_at is null;
create unique index inventory_handling_unit_contents_current_serial_uq
  on public.inventory_handling_unit_contents (tenant_id, company_id, serial_id)
  where removed_at is null and serial_id is not null and deleted_at is null;
create unique index inventory_handling_unit_contents_current_child_hu_uq
  on public.inventory_handling_unit_contents (tenant_id, company_id, child_hu_id)
  where removed_at is null and child_hu_id is not null and deleted_at is null;

create or replace function public.enforce_inventory_handling_unit_architecture()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if tg_table_name = 'inventory_handling_units' then
    select tenant_id, company_id, branch_id into parent_record
    from public.inventory_handling_unit_types
    where id = new.hu_type_id and deleted_at is null;
    if parent_record.tenant_id is null then
      raise exception 'inventory handling unit type must exist';
    end if;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
      raise exception 'inventory handling unit type scope must match handling unit scope';
    end if;

    if new.warehouse_id is not null then
      select tenant_id, company_id, branch_id into parent_record
      from public.inventory_warehouses
      where id = new.warehouse_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'inventory handling unit warehouse scope must match handling unit scope';
      end if;
    end if;

    if new.location_id is not null then
      select tenant_id, company_id, branch_id, warehouse_id into parent_record
      from public.inventory_locations
      where id = new.location_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'inventory handling unit location scope must match handling unit scope';
      end if;
      if parent_record.warehouse_id <> new.warehouse_id then
        raise exception 'inventory handling unit location must belong to the same warehouse';
      end if;
    end if;

    if new.parent_hu_id is not null then
      select tenant_id, company_id, branch_id, warehouse_id into parent_record
      from public.inventory_handling_units
      where id = new.parent_hu_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'inventory parent handling unit scope must match child handling unit scope';
      end if;
      if parent_record.warehouse_id <> new.warehouse_id then
        raise exception 'inventory parent handling unit must belong to the same warehouse';
      end if;
    end if;
  elsif tg_table_name = 'inventory_handling_unit_contents' then
    select tenant_id, company_id, branch_id, warehouse_id into parent_record
    from public.inventory_handling_units
    where id = new.handling_unit_id and deleted_at is null;
    if parent_record.tenant_id is null then
      raise exception 'inventory handling unit content parent must exist';
    end if;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'inventory handling unit content scope must match handling unit scope';
    end if;

    if new.child_hu_id is not null and new.child_hu_id = new.handling_unit_id then
      raise exception 'inventory handling unit cannot contain itself';
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_handling_unit_types_scope before insert or update on public.inventory_handling_unit_types for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_handling_units_scope before insert or update on public.inventory_handling_units for each row execute function public.enforce_inventory_handling_unit_architecture();
create trigger inventory_handling_unit_contents_scope before insert or update on public.inventory_handling_unit_contents for each row execute function public.enforce_inventory_handling_unit_architecture();

create trigger inventory_handling_unit_types_touch before update on public.inventory_handling_unit_types for each row execute function public.touch_platform_row();
create trigger inventory_handling_units_touch before update on public.inventory_handling_units for each row execute function public.touch_platform_row();
create trigger inventory_handling_unit_contents_touch before update on public.inventory_handling_unit_contents for each row execute function public.touch_platform_row();

create trigger inventory_handling_unit_types_prevent_id before update on public.inventory_handling_unit_types for each row execute function public.prevent_id_change();
create trigger inventory_handling_units_prevent_id before update on public.inventory_handling_units for each row execute function public.prevent_id_change();
create trigger inventory_handling_unit_contents_prevent_id before update on public.inventory_handling_unit_contents for each row execute function public.prevent_id_change();

create trigger inventory_handling_unit_types_prevent_tenant before update on public.inventory_handling_unit_types for each row execute function public.prevent_tenant_id_change();
create trigger inventory_handling_units_prevent_tenant before update on public.inventory_handling_units for each row execute function public.prevent_tenant_id_change();
create trigger inventory_handling_unit_contents_prevent_tenant before update on public.inventory_handling_unit_contents for each row execute function public.prevent_tenant_id_change();

alter table public.inventory_handling_unit_types enable row level security;
alter table public.inventory_handling_units enable row level security;
alter table public.inventory_handling_unit_contents enable row level security;

alter table public.inventory_handling_unit_types force row level security;
alter table public.inventory_handling_units force row level security;
alter table public.inventory_handling_unit_contents force row level security;

create policy inventory_handling_unit_types_select on public.inventory_handling_unit_types for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.view', tenant_id));
create policy inventory_handling_unit_types_write on public.inventory_handling_unit_types for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id));
create policy inventory_handling_units_select on public.inventory_handling_units for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.view', tenant_id));
create policy inventory_handling_units_write on public.inventory_handling_units for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id));
create policy inventory_handling_unit_contents_select on public.inventory_handling_unit_contents for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.view', tenant_id));
create policy inventory_handling_unit_contents_write on public.inventory_handling_unit_contents for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.handling-units.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.handling-units.view', 'View Inventory Handling Units', 'View handling unit types, containers, and content traceability metadata.', 'standard'),
  ('inventory.handling-units.manage', 'Manage Inventory Handling Units', 'Create and update handling unit foundation records without stock movement runtime.', 'high')
on conflict do nothing;

comment on table public.inventory_handling_unit_types is 'Handling unit type definitions for physical containers. No stock movement or warehouse execution runtime.';
comment on table public.inventory_handling_units is 'Physical handling unit containers. Metadata only; no stock deductions, ledger posting, or movement confirmation.';
comment on table public.inventory_handling_unit_contents is 'Current and historical handling unit contents. removed_at preserves traceability; rows are never hard-deleted.';
comment on column public.inventory_handling_units.barcode is 'Barcode readiness metadata for scanning. No PDA or warehouse execution runtime.';
comment on column public.inventory_handling_units.qr_payload is 'QR payload metadata for traceability readiness only.';
comment on column public.inventory_handling_unit_contents.removed_at is 'Marks historical content removal while preserving delivery-time traceability snapshots.';
