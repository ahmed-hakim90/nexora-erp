-- Inventory Foundation Sprint 1: Product Master & Tracking Policy.
-- Metadata/contracts only. No purchasing, sales, manufacturing, costing, warranty engine,
-- warehouse execution, inventory ledger, stock movements, or quantity storage is added here.

alter table public.inventory_products
  drop constraint if exists inventory_products_tracking_mode_check;

alter table public.inventory_product_variants
  drop constraint if exists inventory_product_variants_tracking_mode_check;

alter table public.inventory_products
  add column if not exists commercial_name text,
  add column if not exists serial_source text,
  add column if not exists serial_generation_timing text,
  add column if not exists serial_duplicate_validation boolean not null default true,
  add column if not exists serial_allow_manual_override boolean not null default false,
  add column if not exists lot_supplier_supported boolean not null default false,
  add column if not exists lot_internal_supported boolean not null default false,
  add column if not exists lot_expiry_supported boolean not null default false,
  add column if not exists lot_manufacturing_date_supported boolean not null default false,
  add column if not exists lot_qc_required boolean not null default false,
  add column if not exists lot_shelf_life_supported boolean not null default false,
  add column if not exists packaging_loose_units boolean not null default true,
  add column if not exists packaging_inner_box_qty integer,
  add column if not exists packaging_carton_qty integer,
  add column if not exists packaging_pallet_carton_qty integer,
  add column if not exists allow_negative_stock boolean not null default false,
  add column if not exists requires_reservation boolean not null default false,
  add column if not exists requires_qc_before_release boolean not null default false,
  add column if not exists default_putaway_strategy text,
  add column if not exists default_picking_strategy text,
  add column if not exists cycle_count_class text,
  add column if not exists warranty_eligible boolean not null default false,
  add column if not exists warranty_duration_days integer,
  add column if not exists warranty_starts_from text,
  add column if not exists search_keywords jsonb not null default '[]'::jsonb;

update public.inventory_products
set
  has_lot_tracking = tracking_mode in ('lot', 'lot_serial'),
  has_serial_tracking = tracking_mode in ('serial', 'lot_serial')
where deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_tracking_mode_check'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_tracking_mode_check
      check (tracking_mode in ('none', 'quantity_only', 'lot', 'serial', 'lot_serial'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_product_variants_tracking_mode_check'
      and conrelid = 'public.inventory_product_variants'::regclass
  ) then
    alter table public.inventory_product_variants
      add constraint inventory_product_variants_tracking_mode_check
      check (tracking_mode is null or tracking_mode in ('none', 'quantity_only', 'lot', 'serial', 'lot_serial'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_tracking_policy_flags_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_tracking_policy_flags_chk
      check (
        has_lot_tracking = (tracking_mode in ('lot', 'lot_serial'))
        and has_serial_tracking = (tracking_mode in ('serial', 'lot_serial'))
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_serial_policy_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_serial_policy_chk
      check (
        (
          tracking_mode in ('serial', 'lot_serial')
          and serial_source in ('nexora_generated', 'supplier', 'manual')
          and serial_generation_timing in ('on_receipt', 'on_production_completion', 'on_packing', 'manual')
        )
        or (
          tracking_mode not in ('serial', 'lot_serial')
          and serial_source is null
          and serial_generation_timing is null
          and serial_allow_manual_override = false
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_lot_policy_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_lot_policy_chk
      check (
        tracking_mode in ('lot', 'lot_serial')
        or (
          lot_supplier_supported = false
          and lot_internal_supported = false
          and lot_expiry_supported = false
          and lot_manufacturing_date_supported = false
          and lot_qc_required = false
          and lot_shelf_life_supported = false
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_packaging_policy_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_packaging_policy_chk
      check (
        packaging_loose_units = true
        and (packaging_inner_box_qty is null or packaging_inner_box_qty > 0)
        and (packaging_carton_qty is null or packaging_carton_qty > 0)
        and (packaging_pallet_carton_qty is null or packaging_pallet_carton_qty > 0)
        and (packaging_carton_qty is null or packaging_inner_box_qty is not null)
        and (packaging_pallet_carton_qty is null or packaging_carton_qty is not null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_inventory_policy_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_inventory_policy_chk
      check (cycle_count_class is null or cycle_count_class in ('A', 'B', 'C'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_warranty_metadata_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_warranty_metadata_chk
      check (
        (
          warranty_eligible = true
          and warranty_duration_days > 0
          and warranty_starts_from in ('invoice_date', 'delivery_date', 'manual_activation')
        )
        or (
          warranty_eligible = false
          and warranty_duration_days is null
          and warranty_starts_from is null
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_products_search_keywords_json_chk'
      and conrelid = 'public.inventory_products'::regclass
  ) then
    alter table public.inventory_products
      add constraint inventory_products_search_keywords_json_chk
      check (jsonb_typeof(search_keywords) = 'array');
  end if;
end $$;

create index if not exists inventory_products_tracking_policy_idx
  on public.inventory_products (tenant_id, company_id, tracking_mode, has_lot_tracking, has_serial_tracking)
  where deleted_at is null;

create index if not exists inventory_products_policy_readiness_idx
  on public.inventory_products (tenant_id, company_id, cycle_count_class, warranty_eligible)
  where deleted_at is null;

comment on column public.inventory_products.tracking_mode is 'Single active tracking policy: none, quantity_only, lot, serial, or lot_serial.';
comment on column public.inventory_products.serial_source is 'Serial policy metadata only. No runtime serial generation is implemented in this sprint.';
comment on column public.inventory_products.packaging_inner_box_qty is 'Product packaging policy metadata only. Handling units are not implemented.';
comment on column public.inventory_products.allow_negative_stock is 'Inventory behavior policy flag. It does not create stock movement, ledger, or warehouse execution behavior.';
comment on column public.inventory_products.warranty_eligible is 'Warranty readiness metadata only. No warranty engine is implemented.';
comment on column public.inventory_products.search_keywords is 'Product search metadata for Platform Search indexing.';
