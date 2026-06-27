-- Nexora Business App 2: Inventory Foundation.
-- Foundation contracts only. No Manufacturing, Sales, Purchasing, valuation
-- algorithms, accounting postings, or full warehouse operations UI.

create table public.inventory_product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  category_key text not null,
  name text not null,
  parent_category_id uuid references public.inventory_product_categories(id) on delete restrict,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(name)) > 0),
  check (parent_category_id is null or parent_category_id <> id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_uom_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  category_key text not null,
  name text not null,
  uom_kind text not null check (uom_kind in ('quantity', 'weight', 'volume', 'length', 'time', 'package', 'custom')),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_uoms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  uom_category_id uuid not null references public.inventory_uom_categories(id) on delete restrict,
  uom_key text not null,
  name text not null,
  symbol text not null,
  conversion_factor_to_base numeric(18, 9) not null default 1 check (conversion_factor_to_base > 0),
  precision_scale integer not null default 2 check (precision_scale between 0 and 9),
  is_base_uom boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (uom_key = lower(uom_key)),
  check (length(trim(name)) > 0),
  check (length(trim(symbol)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_category_id uuid references public.inventory_product_categories(id) on delete restrict,
  base_uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  product_key text not null,
  sku text not null,
  name text not null,
  product_kind text not null check (product_kind in ('stockable', 'consumable', 'service', 'asset', 'rental', 'kit')),
  tracking_mode text not null default 'none' check (tracking_mode in ('none', 'lot', 'serial')),
  reservation_policy text not null default 'soft' check (reservation_policy in ('none', 'soft', 'hard')),
  cost_object_key text,
  finance_dimension_key text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'stock_quantity_owner', 'inventory', 'cost_owner', 'cost_engine'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (product_key = lower(product_key)),
  check (sku = upper(sku)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  variant_key text not null,
  sku text not null,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  tracking_mode text check (tracking_mode is null or tracking_mode in ('none', 'lot', 'serial')),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (variant_key = lower(variant_key)),
  check (sku = upper(sku)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(attributes) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  warehouse_key text not null,
  name text not null,
  warehouse_type text not null default 'main' check (warehouse_type in ('main', 'branch', 'returns', 'quarantine', 'in_transit', 'virtual')),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (warehouse_key = lower(warehouse_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  parent_location_id uuid references public.inventory_locations(id) on delete restrict,
  location_key text not null,
  name text not null,
  location_kind text not null default 'bin' check (location_kind in ('warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin', 'virtual', 'staging', 'quarantine')),
  reservable boolean not null default true,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (location_key = lower(location_key)),
  check (length(trim(name)) > 0),
  check (parent_location_id is null or parent_location_id <> id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  lot_key text not null,
  received_on date,
  expires_on date,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (lot_key = lower(lot_key)),
  check (expires_on is null or received_on is null or expires_on >= received_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_serial_numbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_key text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(serial_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_movement_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  movement_type_key text not null,
  name text not null,
  movement_direction text not null check (movement_direction in ('in', 'out', 'internal', 'adjustment')),
  document_kind text not null check (document_kind in ('movement', 'transfer', 'adjustment', 'opening_balance')),
  affects_on_hand boolean not null default true,
  affects_reserved boolean not null default false,
  cost_engine_contract_key text,
  finance_readiness_contract_key text,
  valuation_implemented boolean not null default false check (valuation_implemented = false),
  accounting_posting_implemented boolean not null default false check (accounting_posting_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_valuation_logic', true, 'no_accounting_posting', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (movement_type_key = lower(movement_type_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  movement_type_id uuid not null references public.inventory_movement_types(id) on delete restrict,
  business_document_id uuid references public.business_documents(id) on delete restrict,
  document_number text,
  document_kind text not null check (document_kind in ('movement', 'transfer', 'adjustment', 'opening_balance')),
  movement_status text not null default 'draft' check (movement_status in ('draft', 'requested', 'completed', 'cancelled', 'archived')),
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  source_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  source_location_id uuid references public.inventory_locations(id) on delete restrict,
  destination_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  destination_location_id uuid references public.inventory_locations(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_number_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  quantity_delta numeric(18, 6) not null check (quantity_delta <> 0),
  occurred_on date not null default current_date,
  reservation_key text,
  idempotency_key text,
  cost_event_contract_key text,
  finance_readiness_contract_key text,
  valuation_implemented boolean not null default false check (valuation_implemented = false),
  accounting_posting_implemented boolean not null default false check (accounting_posting_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'quantity_owner', 'inventory', 'cost_owner', 'cost_engine', 'finance_owner', 'finance'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (document_kind <> 'transfer' or (source_location_id is not null and destination_location_id is not null and source_location_id <> destination_location_id)),
  check (document_kind <> 'movement' or (source_location_id is not null or destination_location_id is not null)),
  check (document_kind <> 'adjustment' or (source_location_id is not null or destination_location_id is not null)),
  check (document_kind <> 'opening_balance' or destination_location_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  lot_id uuid references public.inventory_lots(id) on delete restrict,
  serial_number_id uuid references public.inventory_serial_numbers(id) on delete restrict,
  uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  quantity_on_hand numeric(18, 6) not null default 0,
  quantity_reserved numeric(18, 6) not null default 0,
  quantity_available numeric(18, 6) generated always as (quantity_on_hand - quantity_reserved) stored,
  last_movement_id uuid references public.inventory_stock_movements(id) on delete restrict,
  last_movement_at timestamptz,
  reservation_ready boolean not null default true,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'quantity_owner', 'inventory', 'cost_fields_owned_by', 'cost_engine'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (quantity_reserved >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_reorder_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  product_variant_id uuid references public.inventory_product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.inventory_warehouses(id) on delete restrict,
  location_id uuid references public.inventory_locations(id) on delete restrict,
  rule_key text not null,
  policy text not null default 'manual_review' check (policy in ('min_max', 'reorder_point', 'manual_review')),
  minimum_quantity numeric(18, 6) not null default 0 check (minimum_quantity >= 0),
  maximum_quantity numeric(18, 6) check (maximum_quantity is null or maximum_quantity >= minimum_quantity),
  reorder_quantity numeric(18, 6) check (reorder_quantity is null or reorder_quantity > 0),
  creates_demand_document boolean not null default false check (creates_demand_document = false),
  trigger_event_name text not null default 'InventoryReorderRuleTriggered' check (trigger_event_name = 'InventoryReorderRuleTriggered'),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_purchasing_document_creation', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (rule_key = lower(rule_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_product_categories_scope_key_uq on public.inventory_product_categories (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), category_key) where deleted_at is null;
create unique index inventory_uom_categories_scope_key_uq on public.inventory_uom_categories (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), category_key) where deleted_at is null;
create unique index inventory_uoms_scope_key_uq on public.inventory_uoms (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), uom_key) where deleted_at is null;
create unique index inventory_uoms_one_base_uq on public.inventory_uoms (tenant_id, company_id, uom_category_id) where deleted_at is null and is_base_uom = true;
create unique index inventory_products_scope_key_uq on public.inventory_products (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), product_key) where deleted_at is null;
create unique index inventory_products_scope_sku_uq on public.inventory_products (tenant_id, company_id, sku) where deleted_at is null;
create unique index inventory_product_variants_scope_key_uq on public.inventory_product_variants (tenant_id, product_id, variant_key) where deleted_at is null;
create unique index inventory_product_variants_scope_sku_uq on public.inventory_product_variants (tenant_id, company_id, sku) where deleted_at is null;
create unique index inventory_warehouses_scope_key_uq on public.inventory_warehouses (tenant_id, company_id, branch_id, warehouse_key) where deleted_at is null;
create unique index inventory_locations_scope_key_uq on public.inventory_locations (tenant_id, warehouse_id, location_key) where deleted_at is null;
create unique index inventory_lots_scope_key_uq on public.inventory_lots (tenant_id, company_id, product_id, lot_key) where deleted_at is null;
create unique index inventory_serial_numbers_scope_key_uq on public.inventory_serial_numbers (tenant_id, company_id, product_id, serial_key) where deleted_at is null;
create unique index inventory_movement_types_scope_key_uq on public.inventory_movement_types (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), movement_type_key) where deleted_at is null;
create unique index inventory_stock_movements_idempotency_uq on public.inventory_stock_movements (tenant_id, idempotency_key) where idempotency_key is not null and deleted_at is null;
create unique index inventory_stock_balances_key_uq on public.inventory_stock_balances (tenant_id, company_id, branch_id, product_id, coalesce(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid), warehouse_id, location_id, coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(serial_number_id, '00000000-0000-0000-0000-000000000000'::uuid), uom_id) where deleted_at is null;
create unique index inventory_reorder_rules_scope_key_uq on public.inventory_reorder_rules (tenant_id, company_id, branch_id, rule_key) where deleted_at is null;

create index inventory_products_category_idx on public.inventory_products (tenant_id, company_id, product_category_id, status) where deleted_at is null;
create index inventory_product_variants_product_idx on public.inventory_product_variants (tenant_id, product_id, status) where deleted_at is null;
create index inventory_locations_warehouse_idx on public.inventory_locations (tenant_id, warehouse_id, parent_location_id, status) where deleted_at is null;
create index inventory_lots_product_idx on public.inventory_lots (tenant_id, product_id, expires_on) where deleted_at is null;
create index inventory_serial_numbers_lot_idx on public.inventory_serial_numbers (tenant_id, lot_id, status) where deleted_at is null;
create index inventory_stock_movements_product_date_idx on public.inventory_stock_movements (tenant_id, company_id, product_id, occurred_on desc, id desc) where deleted_at is null;
create index inventory_stock_movements_document_idx on public.inventory_stock_movements (tenant_id, business_document_id, occurred_on desc) where business_document_id is not null and deleted_at is null;
create index inventory_stock_balances_location_idx on public.inventory_stock_balances (tenant_id, company_id, warehouse_id, location_id, product_id) where deleted_at is null;
create index inventory_reorder_rules_product_idx on public.inventory_reorder_rules (tenant_id, company_id, product_id, warehouse_id, status) where deleted_at is null;

create or replace function public.enforce_inventory_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if not exists (select 1 from public.tenants t where t.id = new.tenant_id and t.is_active = true and t.deleted_at is null) then
    raise exception 'inventory foundation tenant must be active';
  end if;

  if not exists (select 1 from public.companies c where c.id = new.company_id and c.tenant_id = new.tenant_id and c.is_active = true and c.deleted_at is null) then
    raise exception 'inventory foundation company must belong to tenant and be active';
  end if;

  if new.branch_id is not null and not exists (select 1 from public.branches b where b.id = new.branch_id and b.tenant_id = new.tenant_id and b.is_active = true and b.deleted_at is null) then
    raise exception 'inventory foundation branch must belong to tenant and be active';
  end if;

  if tg_table_name = 'inventory_uoms' then
    select tenant_id, company_id, branch_id into parent_record from public.inventory_uom_categories where id = new.uom_category_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'inventory uom category scope must match uom scope';
    end if;
  elsif tg_table_name = 'inventory_products' then
    select tenant_id, company_id, branch_id into parent_record from public.inventory_uoms where id = new.base_uom_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'inventory product base uom scope must match product scope';
    end if;
  elsif tg_table_name = 'inventory_product_variants' then
    select tenant_id, company_id, branch_id into parent_record from public.inventory_products where id = new.product_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'inventory variant product scope must match variant scope';
    end if;
  elsif tg_table_name = 'inventory_locations' then
    select tenant_id, company_id, branch_id into parent_record from public.inventory_warehouses where id = new.warehouse_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'inventory location warehouse scope must match location scope';
    end if;
  elsif tg_table_name in ('inventory_lots', 'inventory_serial_numbers', 'inventory_stock_balances', 'inventory_reorder_rules') then
    select tenant_id, company_id into parent_record from public.inventory_products where id = new.product_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
      raise exception 'inventory product reference must match tenant and company scope';
    end if;
  elsif tg_table_name = 'inventory_stock_movements' then
    select tenant_id, company_id, branch_id, document_kind into parent_record from public.inventory_movement_types where id = new.movement_type_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'inventory movement type scope must match movement scope';
    end if;
    if parent_record.document_kind <> new.document_kind then
      raise exception 'inventory movement document kind must match movement type';
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_product_categories_scope before insert or update on public.inventory_product_categories for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_uom_categories_scope before insert or update on public.inventory_uom_categories for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_uoms_scope before insert or update on public.inventory_uoms for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_products_scope before insert or update on public.inventory_products for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_product_variants_scope before insert or update on public.inventory_product_variants for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_warehouses_scope before insert or update on public.inventory_warehouses for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_locations_scope before insert or update on public.inventory_locations for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_lots_scope before insert or update on public.inventory_lots for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_serial_numbers_scope before insert or update on public.inventory_serial_numbers for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_movement_types_scope before insert or update on public.inventory_movement_types for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_stock_movements_scope before insert or update on public.inventory_stock_movements for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_stock_balances_scope before insert or update on public.inventory_stock_balances for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_reorder_rules_scope before insert or update on public.inventory_reorder_rules for each row execute function public.enforce_inventory_foundation_scope();

create trigger inventory_product_categories_touch before update on public.inventory_product_categories for each row execute function public.touch_platform_row();
create trigger inventory_uom_categories_touch before update on public.inventory_uom_categories for each row execute function public.touch_platform_row();
create trigger inventory_uoms_touch before update on public.inventory_uoms for each row execute function public.touch_platform_row();
create trigger inventory_products_touch before update on public.inventory_products for each row execute function public.touch_platform_row();
create trigger inventory_product_variants_touch before update on public.inventory_product_variants for each row execute function public.touch_platform_row();
create trigger inventory_warehouses_touch before update on public.inventory_warehouses for each row execute function public.touch_platform_row();
create trigger inventory_locations_touch before update on public.inventory_locations for each row execute function public.touch_platform_row();
create trigger inventory_lots_touch before update on public.inventory_lots for each row execute function public.touch_platform_row();
create trigger inventory_serial_numbers_touch before update on public.inventory_serial_numbers for each row execute function public.touch_platform_row();
create trigger inventory_movement_types_touch before update on public.inventory_movement_types for each row execute function public.touch_platform_row();
create trigger inventory_stock_movements_touch before update on public.inventory_stock_movements for each row execute function public.touch_platform_row();
create trigger inventory_stock_balances_touch before update on public.inventory_stock_balances for each row execute function public.touch_platform_row();
create trigger inventory_reorder_rules_touch before update on public.inventory_reorder_rules for each row execute function public.touch_platform_row();

create trigger inventory_product_categories_prevent_id before update on public.inventory_product_categories for each row execute function public.prevent_id_change();
create trigger inventory_uom_categories_prevent_id before update on public.inventory_uom_categories for each row execute function public.prevent_id_change();
create trigger inventory_uoms_prevent_id before update on public.inventory_uoms for each row execute function public.prevent_id_change();
create trigger inventory_products_prevent_id before update on public.inventory_products for each row execute function public.prevent_id_change();
create trigger inventory_product_variants_prevent_id before update on public.inventory_product_variants for each row execute function public.prevent_id_change();
create trigger inventory_warehouses_prevent_id before update on public.inventory_warehouses for each row execute function public.prevent_id_change();
create trigger inventory_locations_prevent_id before update on public.inventory_locations for each row execute function public.prevent_id_change();
create trigger inventory_lots_prevent_id before update on public.inventory_lots for each row execute function public.prevent_id_change();
create trigger inventory_serial_numbers_prevent_id before update on public.inventory_serial_numbers for each row execute function public.prevent_id_change();
create trigger inventory_movement_types_prevent_id before update on public.inventory_movement_types for each row execute function public.prevent_id_change();
create trigger inventory_stock_movements_prevent_id before update on public.inventory_stock_movements for each row execute function public.prevent_id_change();
create trigger inventory_stock_balances_prevent_id before update on public.inventory_stock_balances for each row execute function public.prevent_id_change();
create trigger inventory_reorder_rules_prevent_id before update on public.inventory_reorder_rules for each row execute function public.prevent_id_change();

create trigger inventory_product_categories_prevent_tenant before update on public.inventory_product_categories for each row execute function public.prevent_tenant_id_change();
create trigger inventory_uom_categories_prevent_tenant before update on public.inventory_uom_categories for each row execute function public.prevent_tenant_id_change();
create trigger inventory_uoms_prevent_tenant before update on public.inventory_uoms for each row execute function public.prevent_tenant_id_change();
create trigger inventory_products_prevent_tenant before update on public.inventory_products for each row execute function public.prevent_tenant_id_change();
create trigger inventory_product_variants_prevent_tenant before update on public.inventory_product_variants for each row execute function public.prevent_tenant_id_change();
create trigger inventory_warehouses_prevent_tenant before update on public.inventory_warehouses for each row execute function public.prevent_tenant_id_change();
create trigger inventory_locations_prevent_tenant before update on public.inventory_locations for each row execute function public.prevent_tenant_id_change();
create trigger inventory_lots_prevent_tenant before update on public.inventory_lots for each row execute function public.prevent_tenant_id_change();
create trigger inventory_serial_numbers_prevent_tenant before update on public.inventory_serial_numbers for each row execute function public.prevent_tenant_id_change();
create trigger inventory_movement_types_prevent_tenant before update on public.inventory_movement_types for each row execute function public.prevent_tenant_id_change();
create trigger inventory_stock_movements_prevent_tenant before update on public.inventory_stock_movements for each row execute function public.prevent_tenant_id_change();
create trigger inventory_stock_balances_prevent_tenant before update on public.inventory_stock_balances for each row execute function public.prevent_tenant_id_change();
create trigger inventory_reorder_rules_prevent_tenant before update on public.inventory_reorder_rules for each row execute function public.prevent_tenant_id_change();

alter table public.inventory_product_categories enable row level security;
alter table public.inventory_uom_categories enable row level security;
alter table public.inventory_uoms enable row level security;
alter table public.inventory_products enable row level security;
alter table public.inventory_product_variants enable row level security;
alter table public.inventory_warehouses enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.inventory_serial_numbers enable row level security;
alter table public.inventory_movement_types enable row level security;
alter table public.inventory_stock_movements enable row level security;
alter table public.inventory_stock_balances enable row level security;
alter table public.inventory_reorder_rules enable row level security;

alter table public.inventory_product_categories force row level security;
alter table public.inventory_uom_categories force row level security;
alter table public.inventory_uoms force row level security;
alter table public.inventory_products force row level security;
alter table public.inventory_product_variants force row level security;
alter table public.inventory_warehouses force row level security;
alter table public.inventory_locations force row level security;
alter table public.inventory_lots force row level security;
alter table public.inventory_serial_numbers force row level security;
alter table public.inventory_movement_types force row level security;
alter table public.inventory_stock_movements force row level security;
alter table public.inventory_stock_balances force row level security;
alter table public.inventory_reorder_rules force row level security;

create policy inventory_product_categories_select on public.inventory_product_categories for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_categories_write on public.inventory_product_categories for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_uom_categories_select on public.inventory_uom_categories for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.view', tenant_id));
create policy inventory_uom_categories_write on public.inventory_uom_categories for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.manage', tenant_id));
create policy inventory_uoms_select on public.inventory_uoms for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.view', tenant_id));
create policy inventory_uoms_write on public.inventory_uoms for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.uoms.manage', tenant_id));
create policy inventory_products_select on public.inventory_products for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_products_write on public.inventory_products for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_product_variants_select on public.inventory_product_variants for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_variants_write on public.inventory_product_variants for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_warehouses_select on public.inventory_warehouses for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.warehouses.view', tenant_id));
create policy inventory_warehouses_write on public.inventory_warehouses for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.warehouses.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.warehouses.manage', tenant_id));
create policy inventory_locations_select on public.inventory_locations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.locations.view', tenant_id));
create policy inventory_locations_write on public.inventory_locations for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.locations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.locations.manage', tenant_id));
create policy inventory_lots_select on public.inventory_lots for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.lots.view', tenant_id));
create policy inventory_lots_write on public.inventory_lots for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.lots.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.lots.manage', tenant_id));
create policy inventory_serial_numbers_select on public.inventory_serial_numbers for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.view', tenant_id));
create policy inventory_serial_numbers_write on public.inventory_serial_numbers for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id));
create policy inventory_movement_types_select on public.inventory_movement_types for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.movements.view', tenant_id));
create policy inventory_movement_types_write on public.inventory_movement_types for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.movements.create', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.movements.create', tenant_id));
create policy inventory_stock_movements_select on public.inventory_stock_movements for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.movements.view', tenant_id));
create policy inventory_stock_movements_insert on public.inventory_stock_movements for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.movements.create', tenant_id) or public.has_permission('inventory.transfers.request', tenant_id) or public.has_permission('inventory.adjustments.create', tenant_id) or public.has_permission('inventory.opening-balances.import', tenant_id)));
create policy inventory_stock_balances_select on public.inventory_stock_balances for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy inventory_stock_balances_update_reservation on public.inventory_stock_balances for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reservations.manage', tenant_id));
create policy inventory_reorder_rules_select on public.inventory_reorder_rules for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reorder-rules.view', tenant_id));
create policy inventory_reorder_rules_write on public.inventory_reorder_rules for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reorder-rules.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.reorder-rules.manage', tenant_id));

create policy event_outbox_inventory_foundation_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('InventoryProductCreated', 'InventoryStockMovementCreated', 'InventoryStockTransferRequested', 'InventoryStockTransferCompleted', 'InventoryStockAdjustmentCreated', 'InventoryOpeningBalanceImported', 'InventoryLotCreated', 'InventorySerialNumberCreated', 'InventoryReorderRuleTriggered') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.audit.view', tenant_id));
create policy event_outbox_inventory_foundation_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('InventoryProductCreated', 'InventoryStockMovementCreated', 'InventoryStockTransferRequested', 'InventoryStockTransferCompleted', 'InventoryStockAdjustmentCreated', 'InventoryOpeningBalanceImported', 'InventoryLotCreated', 'InventorySerialNumberCreated', 'InventoryReorderRuleTriggered') and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.products.manage', tenant_id) or public.has_permission('inventory.movements.create', tenant_id) or public.has_permission('inventory.transfers.request', tenant_id) or public.has_permission('inventory.adjustments.create', tenant_id) or public.has_permission('inventory.opening-balances.import', tenant_id) or public.has_permission('inventory.reorder-rules.manage', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.products.view', 'View Inventory Products', 'View product, variant, and category foundation definitions.', 'standard'),
  ('inventory.products.manage', 'Manage Inventory Products', 'Create and update product, variant, and category foundation definitions.', 'high'),
  ('inventory.uoms.view', 'View Inventory Units', 'View UOM categories and unit definitions.', 'standard'),
  ('inventory.uoms.manage', 'Manage Inventory Units', 'Create and update UOM categories and unit definitions.', 'high'),
  ('inventory.warehouses.view', 'View Inventory Warehouses', 'View warehouse foundation definitions.', 'standard'),
  ('inventory.warehouses.manage', 'Manage Inventory Warehouses', 'Create and update warehouse definitions.', 'high'),
  ('inventory.locations.view', 'View Inventory Locations', 'View warehouse location foundation definitions.', 'standard'),
  ('inventory.locations.manage', 'Manage Inventory Locations', 'Create and update warehouse location definitions without full warehouse operations UI.', 'high'),
  ('inventory.lots.view', 'View Inventory Lots', 'View lot and batch foundation records.', 'standard'),
  ('inventory.lots.manage', 'Manage Inventory Lots', 'Create and update lot and batch foundation records.', 'high'),
  ('inventory.serials.view', 'View Inventory Serials', 'View serial number foundation records.', 'standard'),
  ('inventory.serials.manage', 'Manage Inventory Serials', 'Create and update serial number foundation records.', 'high'),
  ('inventory.movements.view', 'View Inventory Movements', 'View movement type and stock movement document contracts.', 'standard'),
  ('inventory.movements.create', 'Create Inventory Movements', 'Create stock movement contracts without valuation or accounting posting.', 'high'),
  ('inventory.transfers.request', 'Request Inventory Transfers', 'Request stock transfer contracts without full warehouse operations UI.', 'high'),
  ('inventory.transfers.complete', 'Complete Inventory Transfers', 'Complete stock transfer contracts without valuation or accounting posting.', 'high'),
  ('inventory.adjustments.create', 'Create Inventory Adjustments', 'Create stock adjustment contracts without accounting posting.', 'high'),
  ('inventory.opening-balances.import', 'Import Inventory Opening Balances', 'Import opening balance contracts through import/export readiness.', 'critical'),
  ('inventory.reservations.view', 'View Inventory Reservations', 'View stock reservation readiness metadata.', 'standard'),
  ('inventory.reservations.manage', 'Manage Inventory Reservations', 'Manage reservation-ready balance quantities without sales order workflow.', 'high'),
  ('inventory.reorder-rules.view', 'View Reorder Rules', 'View reorder rule definitions without purchasing document creation.', 'standard'),
  ('inventory.reorder-rules.manage', 'Manage Reorder Rules', 'Create and update reorder rule definitions without purchasing document creation.', 'high'),
  ('inventory.cost-integration.view', 'View Inventory Cost Integration', 'View Cost Engine contracts only; no valuation logic is granted.', 'high'),
  ('inventory.finance-integration.view', 'View Inventory Finance Integration', 'View Finance posting readiness contracts only; no accounting posting is granted.', 'high'),
  ('inventory.search.view', 'Search Inventory Foundation', 'Search product, warehouse, location, lot, and serial foundation records.', 'standard'),
  ('inventory.reports.view', 'View Inventory Readiness Reports', 'View Inventory report, print, and dashboard readiness contracts.', 'standard'),
  ('inventory.import-export.manage', 'Manage Inventory Import Export', 'Manage product and opening balance import/export readiness contracts.', 'high'),
  ('inventory.audit.view', 'View Inventory Audit Events', 'View Inventory foundation event and audit readiness records.', 'high')
on conflict do nothing;
