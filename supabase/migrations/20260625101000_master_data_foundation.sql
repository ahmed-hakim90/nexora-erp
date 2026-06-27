-- Nexora Sprint 5: Master Data Foundation only.
-- No inventory transactions, production, sales orders, invoices, purchase orders, accounting, stock balances, movements, ledgers, or BOMs.

create type public.product_type as enum ('raw_material', 'semi_finished', 'finished_good', 'packaging', 'consumable', 'service');
create type public.unit_type as enum ('quantity', 'weight', 'volume', 'length', 'time', 'service', 'package');
create type public.warehouse_type as enum ('main', 'branch', 'operational', 'returns', 'quarantine');
create type public.warehouse_location_type as enum ('zone', 'aisle', 'rack', 'shelf', 'bin', 'virtual');
create type public.customer_type as enum ('individual', 'company', 'government', 'internal');
create type public.supplier_type as enum ('local', 'international', 'manufacturer', 'service_provider', 'internal');
create type public.price_list_type as enum ('sales', 'purchase', 'internal');
create type public.tax_profile_type as enum ('sales', 'purchase', 'withholding', 'exempt');

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  parent_category_id uuid references public.product_categories(id) on delete restrict,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (parent_category_id is null or parent_category_id <> id),
  check (deleted_at is null or deleted_by is not null)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  unit_type public.unit_type not null default 'quantity',
  precision_scale integer not null default 2 check (precision_scale between 0 and 6),
  is_base_unit boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  warehouse_code text not null,
  name_ar text not null,
  name_en text not null,
  warehouse_type public.warehouse_type not null default 'main',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (warehouse_code = upper(warehouse_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  parent_location_id uuid references public.warehouse_locations(id) on delete restrict,
  location_code text not null,
  name_ar text not null,
  name_en text not null,
  location_type public.warehouse_location_type not null default 'bin',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (location_code = upper(location_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (parent_location_id is null or parent_location_id <> id),
  check (deleted_at is null or deleted_by is not null)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  customer_code text not null,
  name_ar text not null,
  name_en text not null,
  phone text,
  email text,
  tax_number text,
  customer_type public.customer_type not null default 'company',
  credit_limit_placeholder numeric(18, 4) not null default 0 check (credit_limit_placeholder >= 0),
  payment_terms_placeholder jsonb not null default '{}'::jsonb,
  billing_address_placeholder jsonb not null default '{}'::jsonb,
  shipping_address_placeholder jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (customer_code = upper(customer_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (email is null or email = lower(email)),
  check (jsonb_typeof(payment_terms_placeholder) = 'object'),
  check (jsonb_typeof(billing_address_placeholder) = 'object'),
  check (jsonb_typeof(shipping_address_placeholder) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  supplier_code text not null,
  name_ar text not null,
  name_en text not null,
  phone text,
  email text,
  tax_number text,
  supplier_type public.supplier_type not null default 'local',
  payment_terms_placeholder jsonb not null default '{}'::jsonb,
  address_placeholder jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (supplier_code = upper(supplier_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (email is null or email = lower(email)),
  check (jsonb_typeof(payment_terms_placeholder) = 'object'),
  check (jsonb_typeof(address_placeholder) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  price_list_type public.price_list_type not null default 'sales',
  currency_code char(3) not null,
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (currency_code = upper(currency_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.tax_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  tax_profile_type public.tax_profile_type not null default 'sales',
  tax_rate numeric(9, 6) not null default 0 check (tax_rate >= 0 and tax_rate <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  sku text not null,
  barcode text,
  name_ar text not null,
  name_en text not null,
  category_id uuid references public.product_categories(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete restrict,
  product_type public.product_type not null,
  unit_id uuid references public.units(id) on delete restrict,
  default_purchase_unit_id uuid references public.units(id) on delete restrict,
  default_sales_unit_id uuid references public.units(id) on delete restrict,
  costing_settings jsonb not null default '{}'::jsonb,
  sales_settings jsonb not null default '{}'::jsonb,
  purchase_settings jsonb not null default '{}'::jsonb,
  inventory_settings jsonb not null default '{}'::jsonb,
  is_manufacturable boolean not null default false,
  is_stockable boolean not null default true,
  is_sellable boolean not null default true,
  is_purchasable boolean not null default true,
  image_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (sku = upper(sku)),
  check (barcode is null or length(trim(barcode)) > 0),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(costing_settings) = 'object'),
  check (jsonb_typeof(sales_settings) = 'object'),
  check (jsonb_typeof(purchase_settings) = 'object'),
  check (jsonb_typeof(inventory_settings) = 'object'),
  check (jsonb_typeof(image_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (product_type <> 'service' or is_stockable = false),
  check (deleted_at is null or deleted_by is not null)
);

create unique index product_categories_tenant_code_active_uq on public.product_categories (tenant_id, code) where deleted_at is null;
create index product_categories_tenant_active_idx on public.product_categories (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index product_categories_tenant_updated_idx on public.product_categories (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index product_categories_branch_idx on public.product_categories (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index product_categories_search_idx on public.product_categories (tenant_id, lower(code), lower(name_ar), lower(name_en)) where deleted_at is null;
create index product_categories_parent_idx on public.product_categories (tenant_id, parent_category_id) where deleted_at is null;

create unique index units_tenant_code_active_uq on public.units (tenant_id, code) where deleted_at is null;
create index units_tenant_active_idx on public.units (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index units_tenant_updated_idx on public.units (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index units_branch_idx on public.units (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index units_search_idx on public.units (tenant_id, lower(code), lower(name_ar), lower(name_en)) where deleted_at is null;

create unique index brands_tenant_code_active_uq on public.brands (tenant_id, code) where deleted_at is null;
create index brands_tenant_active_idx on public.brands (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index brands_tenant_updated_idx on public.brands (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index brands_branch_idx on public.brands (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index brands_search_idx on public.brands (tenant_id, lower(code), lower(name_ar), lower(name_en)) where deleted_at is null;

create unique index warehouses_tenant_code_active_uq on public.warehouses (tenant_id, warehouse_code) where deleted_at is null;
create index warehouses_tenant_branch_active_idx on public.warehouses (tenant_id, branch_id, is_active, created_at desc, id desc) where deleted_at is null;
create index warehouses_tenant_updated_idx on public.warehouses (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index warehouses_search_idx on public.warehouses (tenant_id, lower(warehouse_code), lower(name_ar), lower(name_en)) where deleted_at is null;

create unique index warehouse_locations_tenant_warehouse_code_active_uq on public.warehouse_locations (tenant_id, warehouse_id, location_code) where deleted_at is null;
create index warehouse_locations_tenant_active_idx on public.warehouse_locations (tenant_id, warehouse_id, is_active, created_at desc, id desc) where deleted_at is null;
create index warehouse_locations_branch_idx on public.warehouse_locations (tenant_id, branch_id, is_active, created_at desc, id desc) where deleted_at is null;
create index warehouse_locations_tenant_updated_idx on public.warehouse_locations (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index warehouse_locations_search_idx on public.warehouse_locations (tenant_id, lower(location_code), lower(name_ar), lower(name_en)) where deleted_at is null;
create index warehouse_locations_parent_idx on public.warehouse_locations (tenant_id, parent_location_id) where deleted_at is null;

create unique index customers_tenant_code_active_uq on public.customers (tenant_id, customer_code) where deleted_at is null;
create index customers_tenant_active_idx on public.customers (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index customers_tenant_updated_idx on public.customers (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index customers_branch_idx on public.customers (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index customers_search_idx on public.customers (tenant_id, lower(customer_code), lower(name_ar), lower(name_en), lower(phone), lower(email), lower(tax_number)) where deleted_at is null;

create unique index suppliers_tenant_code_active_uq on public.suppliers (tenant_id, supplier_code) where deleted_at is null;
create index suppliers_tenant_active_idx on public.suppliers (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index suppliers_tenant_updated_idx on public.suppliers (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index suppliers_branch_idx on public.suppliers (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index suppliers_search_idx on public.suppliers (tenant_id, lower(supplier_code), lower(name_ar), lower(name_en), lower(phone), lower(email), lower(tax_number)) where deleted_at is null;

create unique index price_lists_tenant_code_active_uq on public.price_lists (tenant_id, code) where deleted_at is null;
create index price_lists_tenant_active_idx on public.price_lists (tenant_id, price_list_type, is_active, created_at desc, id desc) where deleted_at is null;
create index price_lists_tenant_updated_idx on public.price_lists (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index price_lists_branch_idx on public.price_lists (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index price_lists_search_idx on public.price_lists (tenant_id, lower(code), lower(name_ar), lower(name_en), currency_code) where deleted_at is null;

create unique index tax_profiles_tenant_code_active_uq on public.tax_profiles (tenant_id, code) where deleted_at is null;
create index tax_profiles_tenant_active_idx on public.tax_profiles (tenant_id, tax_profile_type, is_active, created_at desc, id desc) where deleted_at is null;
create index tax_profiles_tenant_updated_idx on public.tax_profiles (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index tax_profiles_branch_idx on public.tax_profiles (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index tax_profiles_search_idx on public.tax_profiles (tenant_id, lower(code), lower(name_ar), lower(name_en)) where deleted_at is null;

create unique index products_tenant_sku_active_uq on public.products (tenant_id, sku) where deleted_at is null;
create unique index products_tenant_barcode_active_uq on public.products (tenant_id, barcode) where barcode is not null and deleted_at is null;
create index products_tenant_type_active_idx on public.products (tenant_id, product_type, is_active, created_at desc, id desc) where deleted_at is null;
create index products_tenant_updated_idx on public.products (tenant_id, updated_at desc, id desc) where deleted_at is null;
create index products_branch_idx on public.products (tenant_id, branch_id, is_active) where branch_id is not null and deleted_at is null;
create index products_category_idx on public.products (tenant_id, category_id, is_active) where deleted_at is null;
create index products_brand_idx on public.products (tenant_id, brand_id, is_active) where deleted_at is null;
create index products_unit_idx on public.products (tenant_id, unit_id) where deleted_at is null;
create index products_search_idx on public.products (tenant_id, lower(sku), lower(barcode), lower(name_ar), lower(name_en)) where deleted_at is null;

create or replace function public.enforce_master_data_reference_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  referenced_tenant_id uuid;
  referenced_branch_id uuid;
begin
  if new.branch_id is not null then
    select tenant_id into referenced_tenant_id from public.branches where id = new.branch_id;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'branch_id must belong to the same tenant';
    end if;
  end if;

  if tg_table_name = 'product_categories' and new.parent_category_id is not null then
    select tenant_id into referenced_tenant_id from public.product_categories where id = new.parent_category_id;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'parent category must belong to the same tenant';
    end if;
  elsif tg_table_name = 'warehouse_locations' then
    select tenant_id, branch_id into referenced_tenant_id, referenced_branch_id from public.warehouses where id = new.warehouse_id;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'warehouse must belong to the same tenant';
    end if;
    if new.branch_id is null then
      new.branch_id = referenced_branch_id;
    elsif referenced_branch_id is not null and new.branch_id is distinct from referenced_branch_id then
      raise exception 'warehouse location branch must match the warehouse branch';
    end if;
    if new.parent_location_id is not null then
      select tenant_id, warehouse_id into referenced_tenant_id, referenced_branch_id from public.warehouse_locations where id = new.parent_location_id;
      if referenced_tenant_id is distinct from new.tenant_id or referenced_branch_id is distinct from new.warehouse_id then
        raise exception 'parent location must belong to the same tenant and warehouse';
      end if;
    end if;
  elsif tg_table_name = 'products' then
    if new.category_id is not null then
      select tenant_id into referenced_tenant_id from public.product_categories where id = new.category_id;
      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'product category must belong to the same tenant'; end if;
    end if;
    if new.brand_id is not null then
      select tenant_id into referenced_tenant_id from public.brands where id = new.brand_id;
      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'brand must belong to the same tenant'; end if;
    end if;
    if new.unit_id is not null then
      select tenant_id into referenced_tenant_id from public.units where id = new.unit_id;
      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'unit must belong to the same tenant'; end if;
    end if;
    if new.default_purchase_unit_id is not null then
      select tenant_id into referenced_tenant_id from public.units where id = new.default_purchase_unit_id;
      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'purchase unit must belong to the same tenant'; end if;
    end if;
    if new.default_sales_unit_id is not null then
      select tenant_id into referenced_tenant_id from public.units where id = new.default_sales_unit_id;
      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'sales unit must belong to the same tenant'; end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger products_enforce_reference_scope before insert or update on public.products for each row execute function public.enforce_master_data_reference_scope();
create trigger product_categories_enforce_reference_scope before insert or update on public.product_categories for each row execute function public.enforce_master_data_reference_scope();
create trigger units_enforce_reference_scope before insert or update on public.units for each row execute function public.enforce_master_data_reference_scope();
create trigger brands_enforce_reference_scope before insert or update on public.brands for each row execute function public.enforce_master_data_reference_scope();
create trigger warehouses_enforce_reference_scope before insert or update on public.warehouses for each row execute function public.enforce_master_data_reference_scope();
create trigger warehouse_locations_enforce_reference_scope before insert or update on public.warehouse_locations for each row execute function public.enforce_master_data_reference_scope();
create trigger customers_enforce_reference_scope before insert or update on public.customers for each row execute function public.enforce_master_data_reference_scope();
create trigger suppliers_enforce_reference_scope before insert or update on public.suppliers for each row execute function public.enforce_master_data_reference_scope();
create trigger price_lists_enforce_reference_scope before insert or update on public.price_lists for each row execute function public.enforce_master_data_reference_scope();
create trigger tax_profiles_enforce_reference_scope before insert or update on public.tax_profiles for each row execute function public.enforce_master_data_reference_scope();

create trigger products_touch_updated_at before update on public.products for each row execute function public.touch_platform_row();
create trigger products_prevent_id_change before update on public.products for each row execute function public.prevent_id_change();
create trigger products_prevent_tenant_id_change before update on public.products for each row execute function public.prevent_tenant_id_change();
create trigger product_categories_touch_updated_at before update on public.product_categories for each row execute function public.touch_platform_row();
create trigger product_categories_prevent_id_change before update on public.product_categories for each row execute function public.prevent_id_change();
create trigger product_categories_prevent_tenant_id_change before update on public.product_categories for each row execute function public.prevent_tenant_id_change();
create trigger units_touch_updated_at before update on public.units for each row execute function public.touch_platform_row();
create trigger units_prevent_id_change before update on public.units for each row execute function public.prevent_id_change();
create trigger units_prevent_tenant_id_change before update on public.units for each row execute function public.prevent_tenant_id_change();
create trigger brands_touch_updated_at before update on public.brands for each row execute function public.touch_platform_row();
create trigger brands_prevent_id_change before update on public.brands for each row execute function public.prevent_id_change();
create trigger brands_prevent_tenant_id_change before update on public.brands for each row execute function public.prevent_tenant_id_change();
create trigger warehouses_touch_updated_at before update on public.warehouses for each row execute function public.touch_platform_row();
create trigger warehouses_prevent_id_change before update on public.warehouses for each row execute function public.prevent_id_change();
create trigger warehouses_prevent_tenant_id_change before update on public.warehouses for each row execute function public.prevent_tenant_id_change();
create trigger warehouse_locations_touch_updated_at before update on public.warehouse_locations for each row execute function public.touch_platform_row();
create trigger warehouse_locations_prevent_id_change before update on public.warehouse_locations for each row execute function public.prevent_id_change();
create trigger warehouse_locations_prevent_tenant_id_change before update on public.warehouse_locations for each row execute function public.prevent_tenant_id_change();
create trigger customers_touch_updated_at before update on public.customers for each row execute function public.touch_platform_row();
create trigger customers_prevent_id_change before update on public.customers for each row execute function public.prevent_id_change();
create trigger customers_prevent_tenant_id_change before update on public.customers for each row execute function public.prevent_tenant_id_change();
create trigger suppliers_touch_updated_at before update on public.suppliers for each row execute function public.touch_platform_row();
create trigger suppliers_prevent_id_change before update on public.suppliers for each row execute function public.prevent_id_change();
create trigger suppliers_prevent_tenant_id_change before update on public.suppliers for each row execute function public.prevent_tenant_id_change();
create trigger price_lists_touch_updated_at before update on public.price_lists for each row execute function public.touch_platform_row();
create trigger price_lists_prevent_id_change before update on public.price_lists for each row execute function public.prevent_id_change();
create trigger price_lists_prevent_tenant_id_change before update on public.price_lists for each row execute function public.prevent_tenant_id_change();
create trigger tax_profiles_touch_updated_at before update on public.tax_profiles for each row execute function public.touch_platform_row();
create trigger tax_profiles_prevent_id_change before update on public.tax_profiles for each row execute function public.prevent_id_change();
create trigger tax_profiles_prevent_tenant_id_change before update on public.tax_profiles for each row execute function public.prevent_tenant_id_change();

alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.units enable row level security;
alter table public.brands enable row level security;
alter table public.warehouses enable row level security;
alter table public.warehouse_locations enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.price_lists enable row level security;
alter table public.tax_profiles enable row level security;
alter table public.products force row level security;
alter table public.product_categories force row level security;
alter table public.units force row level security;
alter table public.brands force row level security;
alter table public.warehouses force row level security;
alter table public.warehouse_locations force row level security;
alter table public.customers force row level security;
alter table public.suppliers force row level security;
alter table public.price_lists force row level security;
alter table public.tax_profiles force row level security;


create policy products_select_member_permission on public.products
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.products.read', tenant_id)
  );

create policy products_insert_member_permission on public.products
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.products.create', tenant_id)
  );

create policy products_update_member_permission on public.products
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.products.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.products.update', tenant_id)
    )
  );


create policy product_categories_select_member_permission on public.product_categories
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.product-categories.read', tenant_id)
  );

create policy product_categories_insert_member_permission on public.product_categories
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.product-categories.create', tenant_id)
  );

create policy product_categories_update_member_permission on public.product_categories
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.product-categories.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.product-categories.update', tenant_id)
    )
  );


create policy units_select_member_permission on public.units
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.units.read', tenant_id)
  );

create policy units_insert_member_permission on public.units
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.units.create', tenant_id)
  );

create policy units_update_member_permission on public.units
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.units.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.units.update', tenant_id)
    )
  );


create policy brands_select_member_permission on public.brands
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.brands.read', tenant_id)
  );

create policy brands_insert_member_permission on public.brands
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.brands.create', tenant_id)
  );

create policy brands_update_member_permission on public.brands
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.brands.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.brands.update', tenant_id)
    )
  );


create policy warehouses_select_member_permission on public.warehouses
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouses.read', tenant_id)
  );

create policy warehouses_insert_member_permission on public.warehouses
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouses.create', tenant_id)
  );

create policy warehouses_update_member_permission on public.warehouses
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.warehouses.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.warehouses.update', tenant_id)
    )
  );


create policy warehouse_locations_select_member_permission on public.warehouse_locations
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouse-locations.read', tenant_id)
  );

create policy warehouse_locations_insert_member_permission on public.warehouse_locations
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouse-locations.create', tenant_id)
  );

create policy warehouse_locations_update_member_permission on public.warehouse_locations
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.warehouse-locations.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.warehouse-locations.update', tenant_id)
    )
  );


create policy customers_select_member_permission on public.customers
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.customers.read', tenant_id)
  );

create policy customers_insert_member_permission on public.customers
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.customers.create', tenant_id)
  );

create policy customers_update_member_permission on public.customers
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.customers.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.customers.update', tenant_id)
    )
  );


create policy suppliers_select_member_permission on public.suppliers
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.suppliers.read', tenant_id)
  );

create policy suppliers_insert_member_permission on public.suppliers
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.suppliers.create', tenant_id)
  );

create policy suppliers_update_member_permission on public.suppliers
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.suppliers.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.suppliers.update', tenant_id)
    )
  );


create policy price_lists_select_member_permission on public.price_lists
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.price-lists.read', tenant_id)
  );

create policy price_lists_insert_member_permission on public.price_lists
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.price-lists.create', tenant_id)
  );

create policy price_lists_update_member_permission on public.price_lists
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.price-lists.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.price-lists.update', tenant_id)
    )
  );


create policy tax_profiles_select_member_permission on public.tax_profiles
  for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.tax-profiles.read', tenant_id)
  );

create policy tax_profiles_insert_member_permission on public.tax_profiles
  for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.tax-profiles.create', tenant_id)
  );

create policy tax_profiles_update_member_permission on public.tax_profiles
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.tax-profiles.update', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and (
      public.has_permission('master-data.tax-profiles.update', tenant_id)
    )
  );

create policy products_soft_delete_member_permission on public.products
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.products.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.products.delete', tenant_id)
  );

create policy product_categories_soft_delete_member_permission on public.product_categories
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.product-categories.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.product-categories.delete', tenant_id)
  );

create policy units_soft_delete_member_permission on public.units
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.units.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.units.delete', tenant_id)
  );

create policy brands_soft_delete_member_permission on public.brands
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.brands.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.brands.delete', tenant_id)
  );

create policy warehouses_soft_delete_member_permission on public.warehouses
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouses.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouses.delete', tenant_id)
  );

create policy warehouse_locations_soft_delete_member_permission on public.warehouse_locations
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouse-locations.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.warehouse-locations.delete', tenant_id)
  );

create policy customers_soft_delete_member_permission on public.customers
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.customers.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.customers.delete', tenant_id)
  );

create policy suppliers_soft_delete_member_permission on public.suppliers
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.suppliers.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.suppliers.delete', tenant_id)
  );

create policy price_lists_soft_delete_member_permission on public.price_lists
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.price-lists.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.price-lists.delete', tenant_id)
  );

create policy tax_profiles_soft_delete_member_permission on public.tax_profiles
  for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.tax-profiles.delete', tenant_id)
  )
  with check (
    is_active = false
    and deleted_at is not null
    and deleted_by = public.current_user_id()
    and public.is_tenant_member(tenant_id)
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id and t.is_active = true and t.deleted_at is null
    )
    and public.has_permission('master-data.tax-profiles.delete', tenant_id)
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('master-data.products.read', 'Read Products', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.products.create', 'Create Products', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.products.update', 'Update Products', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.products.delete', 'Soft delete Products', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.product-categories.read', 'Read Product Categories', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.product-categories.create', 'Create Product Categories', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.product-categories.update', 'Update Product Categories', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.product-categories.delete', 'Soft delete Product Categories', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.units.read', 'Read Units', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.units.create', 'Create Units', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.units.update', 'Update Units', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.units.delete', 'Soft delete Units', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.brands.read', 'Read Brands', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.brands.create', 'Create Brands', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.brands.update', 'Update Brands', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.brands.delete', 'Soft delete Brands', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouses.read', 'Read Warehouses', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouses.create', 'Create Warehouses', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouses.update', 'Update Warehouses', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouses.delete', 'Soft delete Warehouses', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouse-locations.read', 'Read Warehouse Locations', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouse-locations.create', 'Create Warehouse Locations', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouse-locations.update', 'Update Warehouse Locations', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.warehouse-locations.delete', 'Soft delete Warehouse Locations', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.customers.read', 'Read Customers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.customers.create', 'Create Customers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.customers.update', 'Update Customers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.customers.delete', 'Soft delete Customers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.suppliers.read', 'Read Suppliers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.suppliers.create', 'Create Suppliers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.suppliers.update', 'Update Suppliers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.suppliers.delete', 'Soft delete Suppliers', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.price-lists.read', 'Read Price Lists', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.price-lists.create', 'Create Price Lists', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.price-lists.update', 'Update Price Lists', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.price-lists.delete', 'Soft delete Price Lists', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.tax-profiles.read', 'Read Tax Profiles', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.tax-profiles.create', 'Create Tax Profiles', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.tax-profiles.update', 'Update Tax Profiles', 'Sprint 5 Master Data permission.', 'standard'),
  ('master-data.tax-profiles.delete', 'Soft delete Tax Profiles', 'Sprint 5 Master Data permission.', 'standard')
on conflict do nothing;
