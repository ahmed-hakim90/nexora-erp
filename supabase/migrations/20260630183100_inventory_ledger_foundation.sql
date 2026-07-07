-- Inventory Foundation Sprint 7: Immutable Inventory Ledger foundation.
-- Append-only inventory history. No balance calculation, projection runtime, or posting UI.
-- Legacy stock_ledger_entries remains for Sprint 9/10 compatibility.

create table public.inventory_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  inventory_object_type text not null check (inventory_object_type in (
    'product_quantity', 'lot_quantity', 'serial', 'handling_unit', 'child_handling_unit'
  )),
  product_id uuid references public.inventory_products(id) on delete restrict,
  variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  child_handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  inventory_status text check (inventory_status in (
    'available', 'reserved', 'picked', 'packed', 'shipped', 'sold', 'returned',
    'qc_hold', 'damaged', 'scrap', 'service', 'blocked', 'in_transit'
  )),
  quantity_delta numeric(24, 6) not null check (quantity_delta <> 0),
  uom_id uuid references public.inventory_uoms(id) on delete restrict,
  movement_direction text not null check (movement_direction in ('IN', 'OUT', 'INTERNAL')),
  movement_type text not null check (movement_type in (
    'goods_receipt', 'goods_issue', 'transfer', 'adjustment', 'cycle_count',
    'production_receipt', 'material_issue', 'return', 'scrap', 'repack'
  )),
  document_type text not null,
  document_id uuid,
  document_line_id uuid references public.inventory_document_lines(id) on delete restrict,
  business_module text not null check (business_module in (
    'inventory', 'purchasing', 'sales', 'manufacturing', 'service', 'warranty', 'rental', 'fleet'
  )),
  event_type text not null check (event_type in ('created', 'posted', 'reversed')),
  parent_entry_id uuid references public.inventory_ledger_entries(id) on delete restrict,
  posting_timestamp timestamptz not null default now(),
  correlation_id text not null,
  causation_id text,
  event_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (length(trim(correlation_id)) > 0),
  check (length(trim(document_type)) > 0),
  check (jsonb_typeof(event_metadata) = 'object'),
  check (
    (event_type = 'reversed' and parent_entry_id is not null)
    or (event_type <> 'reversed')
  ),
  check (
    (movement_direction = 'IN' and quantity_delta > 0)
    or (movement_direction = 'OUT' and quantity_delta < 0)
    or (movement_direction = 'INTERNAL')
  )
);

comment on table public.inventory_ledger_entries is
  'Append-only inventory ledger. The only source of truth for inventory history. Updates and deletes are forbidden.';
comment on column public.inventory_ledger_entries.id is 'ledger_entry_id';

create index inventory_ledger_entries_history_idx
  on public.inventory_ledger_entries (
    tenant_id, company_id, posting_timestamp desc, id desc
  );
create index inventory_ledger_entries_product_idx
  on public.inventory_ledger_entries (tenant_id, company_id, product_id, posting_timestamp desc)
  where product_id is not null;
create index inventory_ledger_entries_lot_idx
  on public.inventory_ledger_entries (tenant_id, company_id, lot_id, posting_timestamp desc)
  where lot_id is not null;
create index inventory_ledger_entries_serial_idx
  on public.inventory_ledger_entries (tenant_id, company_id, serial_id, posting_timestamp desc)
  where serial_id is not null;
create index inventory_ledger_entries_handling_unit_idx
  on public.inventory_ledger_entries (tenant_id, company_id, handling_unit_id, posting_timestamp desc)
  where handling_unit_id is not null;
create index inventory_ledger_entries_document_idx
  on public.inventory_ledger_entries (tenant_id, company_id, document_type, document_id, posting_timestamp desc);
create index inventory_ledger_entries_correlation_idx
  on public.inventory_ledger_entries (tenant_id, company_id, correlation_id, posting_timestamp desc);
create index inventory_ledger_entries_parent_idx
  on public.inventory_ledger_entries (tenant_id, company_id, parent_entry_id)
  where parent_entry_id is not null;
create unique index inventory_ledger_entries_reversal_once_uq
  on public.inventory_ledger_entries (tenant_id, company_id, parent_entry_id)
  where parent_entry_id is not null and event_type = 'reversed';

alter table public.inventory_current_state_projections
  add constraint inventory_current_state_projections_ledger_entry_fk
    foreign key (derived_from_ledger_entry_id) references public.inventory_ledger_entries(id) on delete restrict;

create or replace function public.prevent_inventory_ledger_entry_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'inventory_ledger_entries is append-only; updates and deletes are forbidden';
end;
$$;

create or replace function public.enforce_inventory_ledger_entry_architecture()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('app.inventory_posting_engine', true), '') <> 'true' then
    raise exception 'inventory ledger entries may only be created by the inventory posting engine';
  end if;

  if new.document_id is null
    and coalesce((new.event_metadata ->> 'systemAdjustment')::boolean, false) is not true then
    raise exception 'inventory ledger entries require a document reference unless system adjustment metadata is set';
  end if;

  if new.document_line_id is null
    and coalesce((new.event_metadata ->> 'systemAdjustment')::boolean, false) is not true then
    raise exception 'inventory ledger entries require a document line reference unless system adjustment metadata is set';
  end if;

  if new.inventory_object_type = 'product_quantity' and (new.product_id is null or new.quantity_delta = 0) then
    raise exception 'product_quantity ledger entries require product_id and non-zero quantity_delta';
  end if;
  if new.inventory_object_type = 'lot_quantity' and new.lot_id is null then
    raise exception 'lot_quantity ledger entries require lot_id';
  end if;
  if new.inventory_object_type = 'serial' and new.serial_id is null then
    raise exception 'serial ledger entries require serial_id';
  end if;
  if new.inventory_object_type = 'handling_unit' and new.handling_unit_id is null then
    raise exception 'handling_unit ledger entries require handling_unit_id';
  end if;
  if new.inventory_object_type = 'child_handling_unit' and new.child_handling_unit_id is null then
    raise exception 'child_handling_unit ledger entries require child_handling_unit_id';
  end if;

  return new;
end;
$$;

create trigger inventory_ledger_entries_prevent_update
  before update on public.inventory_ledger_entries
  for each row execute function public.prevent_inventory_ledger_entry_mutation();

create trigger inventory_ledger_entries_prevent_delete
  before delete on public.inventory_ledger_entries
  for each row execute function public.prevent_inventory_ledger_entry_mutation();

create trigger inventory_ledger_entries_enforce_architecture
  before insert on public.inventory_ledger_entries
  for each row execute function public.enforce_inventory_ledger_entry_architecture();

alter table public.inventory_ledger_entries enable row level security;
alter table public.inventory_ledger_entries force row level security;

create policy inventory_ledger_entries_select on public.inventory_ledger_entries
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.view', tenant_id)
  );

create policy inventory_ledger_entries_insert_posting_engine on public.inventory_ledger_entries
  for insert to authenticated
  with check (
    coalesce(current_setting('app.inventory_posting_engine', true), '') = 'true'
    and public.is_tenant_member(tenant_id)
    and public.has_permission('inventory.stock.post', tenant_id)
  );
