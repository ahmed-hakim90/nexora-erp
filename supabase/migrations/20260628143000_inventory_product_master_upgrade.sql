-- Inventory Product Master upgrade.
-- Additive only: canonical product master remains public.inventory_products.
-- No Sales, Purchasing, Manufacturing execution, costing, accounting, or marketplace runtime.

alter table public.inventory_products
  add column if not exists barcode text,
  add column if not exists name_ar text,
  add column if not exists short_name text,
  add column if not exists description text,
  add column if not exists internal_notes text,
  add column if not exists category_id uuid references public.inventory_product_categories(id) on delete restrict,
  add column if not exists subcategory_id uuid references public.inventory_product_categories(id) on delete restrict,
  add column if not exists brand text,
  add column if not exists supplier_party_id uuid references public.parties(id) on delete restrict,
  add column if not exists section_key text,
  add column if not exists product_type_key text,
  add column if not exists purchase_uom_id uuid references public.inventory_uoms(id) on delete restrict,
  add column if not exists sales_uom_id uuid references public.inventory_uoms(id) on delete restrict,
  add column if not exists default_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  add column if not exists default_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists opening_balance_qty numeric(18, 6) not null default 0,
  add column if not exists minimum_stock_qty numeric(18, 6) not null default 0,
  add column if not exists maximum_stock_qty numeric(18, 6),
  add column if not exists reorder_point_qty numeric(18, 6),
  add column if not exists weight numeric(18, 6),
  add column if not exists length numeric(18, 6),
  add column if not exists width numeric(18, 6),
  add column if not exists height numeric(18, 6),
  add column if not exists volume numeric(18, 6),
  add column if not exists country_of_origin text,
  add column if not exists hs_code text,
  add column if not exists shipping_class text,
  add column if not exists purchase_price numeric(18, 6) not null default 0,
  add column if not exists retail_price numeric(18, 6) not null default 0,
  add column if not exists wholesale_price numeric(18, 6) not null default 0,
  add column if not exists online_price numeric(18, 6) not null default 0,
  add column if not exists discount_allowed boolean not null default false,
  add column if not exists commission_rate numeric(9, 6) not null default 0,
  add column if not exists price_includes_tax boolean not null default false,
  add column if not exists tax_definition_id uuid references public.finance_tax_definitions(id) on delete restrict,
  add column if not exists currency_id uuid references public.finance_currencies(id) on delete restrict,
  add column if not exists online_enabled boolean not null default false,
  add column if not exists online_status text not null default 'draft',
  add column if not exists online_slug text,
  add column if not exists online_title text,
  add column if not exists online_short_description text,
  add column if not exists online_long_description text,
  add column if not exists online_features jsonb not null default '[]'::jsonb,
  add column if not exists online_specifications jsonb not null default '{}'::jsonb,
  add column if not exists online_package_contents jsonb not null default '[]'::jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords jsonb not null default '[]'::jsonb,
  add column if not exists og_image_url text,
  add column if not exists canonical_url text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_new_arrival boolean not null default false,
  add column if not exists is_best_seller boolean not null default false,
  add column if not exists allow_reviews boolean not null default true,
  add column if not exists allow_ratings boolean not null default true,
  add column if not exists cover_image_url text,
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists video_urls jsonb not null default '[]'::jsonb,
  add column if not exists manual_urls jsonb not null default '[]'::jsonb,
  add column if not exists is_stockable boolean not null default true,
  add column if not exists is_sellable boolean not null default true,
  add column if not exists is_purchasable boolean not null default true,
  add column if not exists is_manufacturable boolean not null default false,
  add column if not exists is_service boolean not null default false,
  add column if not exists has_variants boolean not null default false,
  add column if not exists has_serial_tracking boolean not null default false,
  add column if not exists has_lot_tracking boolean not null default false,
  add column if not exists is_discountable boolean not null default true,
  add column if not exists is_online_visible boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

update public.inventory_products
set category_id = product_category_id
where category_id is null and product_category_id is not null;

alter table public.inventory_products
  add constraint inventory_products_online_status_chk check (online_status in ('draft', 'ready', 'published', 'hidden', 'archived')),
  add constraint inventory_products_quantities_nonnegative_chk check (
    opening_balance_qty >= 0
    and minimum_stock_qty >= 0
    and (maximum_stock_qty is null or maximum_stock_qty >= 0)
    and (reorder_point_qty is null or reorder_point_qty >= 0)
  ),
  add constraint inventory_products_reorder_maximum_chk check (
    reorder_point_qty is null or maximum_stock_qty is null or reorder_point_qty <= maximum_stock_qty
  ),
  add constraint inventory_products_physical_nonnegative_chk check (
    (weight is null or weight >= 0)
    and (length is null or length >= 0)
    and (width is null or width >= 0)
    and (height is null or height >= 0)
    and (volume is null or volume >= 0)
  ),
  add constraint inventory_products_prices_nonnegative_chk check (
    purchase_price >= 0
    and retail_price >= 0
    and wholesale_price >= 0
    and online_price >= 0
    and commission_rate >= 0
  ),
  add constraint inventory_products_online_json_chk check (
    jsonb_typeof(online_features) = 'array'
    and jsonb_typeof(online_specifications) = 'object'
    and jsonb_typeof(online_package_contents) = 'array'
    and jsonb_typeof(seo_keywords) = 'array'
    and jsonb_typeof(gallery_urls) = 'array'
    and jsonb_typeof(video_urls) = 'array'
    and jsonb_typeof(manual_urls) = 'array'
  ),
  add constraint inventory_products_online_slug_required_chk check (
    online_enabled = false or (online_slug is not null and length(trim(online_slug)) > 0)
  ),
  add constraint inventory_products_archived_metadata_chk check (
    archived_at is null or archived_by is not null
  );

create unique index inventory_products_scope_barcode_uq
  on public.inventory_products (tenant_id, company_id, barcode)
  where barcode is not null and deleted_at is null;
create unique index inventory_products_scope_online_slug_uq
  on public.inventory_products (tenant_id, company_id, online_slug)
  where online_enabled = true and online_slug is not null and deleted_at is null;
create index inventory_products_sku_idx
  on public.inventory_products (tenant_id, company_id, sku)
  where deleted_at is null;
create index inventory_products_barcode_idx
  on public.inventory_products (tenant_id, company_id, barcode)
  where barcode is not null and deleted_at is null;
create index inventory_products_category_master_idx
  on public.inventory_products (tenant_id, company_id, coalesce(category_id, product_category_id), subcategory_id)
  where deleted_at is null;
create index inventory_products_online_slug_idx
  on public.inventory_products (tenant_id, company_id, online_slug)
  where online_slug is not null and deleted_at is null;
create index inventory_products_status_idx
  on public.inventory_products (tenant_id, company_id, status, online_status, tracking_mode)
  where deleted_at is null;

create table public.inventory_product_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  conversion_factor numeric(18, 9) not null default 1 check (conversion_factor > 0),
  barcode text,
  is_base boolean not null default false,
  is_purchase_default boolean not null default false,
  is_sales_default boolean not null default false,
  is_online_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_product_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  price_type text not null check (price_type in ('purchase', 'retail', 'wholesale', 'online', 'distributor', 'custom')),
  currency_id uuid references public.finance_currencies(id) on delete restrict,
  price numeric(18, 6) not null check (price >= 0),
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_product_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  media_type text not null check (media_type in ('image', 'video', 'manual', 'certificate', 'attachment')),
  url text not null,
  title text,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  check (length(trim(url)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_product_online_attributes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  attribute_key text not null,
  attribute_label text not null,
  attribute_value text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  version integer not null default 1 check (version > 0),
  check (attribute_key = lower(attribute_key)),
  check (length(trim(attribute_label)) > 0),
  check (length(trim(attribute_value)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_product_units_product_uom_uq
  on public.inventory_product_units (tenant_id, company_id, product_id, uom_id)
  where deleted_at is null;
create unique index inventory_product_units_one_base_uq
  on public.inventory_product_units (tenant_id, company_id, product_id)
  where is_base = true and deleted_at is null;
create index inventory_product_units_barcode_idx
  on public.inventory_product_units (tenant_id, company_id, barcode)
  where barcode is not null and deleted_at is null;
create index inventory_product_prices_product_idx
  on public.inventory_product_prices (tenant_id, company_id, product_id, price_type, is_active)
  where deleted_at is null;
create index inventory_product_media_product_idx
  on public.inventory_product_media (tenant_id, company_id, product_id, media_type, sort_order)
  where deleted_at is null;
create unique index inventory_product_media_one_cover_uq
  on public.inventory_product_media (tenant_id, company_id, product_id)
  where is_cover = true and deleted_at is null;
create index inventory_product_online_attributes_product_idx
  on public.inventory_product_online_attributes (tenant_id, company_id, product_id, sort_order)
  where deleted_at is null;

create or replace function public.enforce_inventory_product_master_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  select tenant_id, company_id, branch_id into parent_record
  from public.inventory_products
  where id = new.product_id and deleted_at is null;

  if parent_record.tenant_id is null then
    raise exception 'inventory product master parent product must exist';
  end if;

  if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
    raise exception 'inventory product master child scope must match product scope';
  end if;

  return new;
end;
$$;

create trigger inventory_product_units_scope before insert or update on public.inventory_product_units for each row execute function public.enforce_inventory_product_master_scope();
create trigger inventory_product_prices_scope before insert or update on public.inventory_product_prices for each row execute function public.enforce_inventory_product_master_scope();
create trigger inventory_product_media_scope before insert or update on public.inventory_product_media for each row execute function public.enforce_inventory_product_master_scope();
create trigger inventory_product_online_attributes_scope before insert or update on public.inventory_product_online_attributes for each row execute function public.enforce_inventory_product_master_scope();

create trigger inventory_product_units_touch before update on public.inventory_product_units for each row execute function public.touch_platform_row();
create trigger inventory_product_prices_touch before update on public.inventory_product_prices for each row execute function public.touch_platform_row();
create trigger inventory_product_media_touch before update on public.inventory_product_media for each row execute function public.touch_platform_row();
create trigger inventory_product_online_attributes_touch before update on public.inventory_product_online_attributes for each row execute function public.touch_platform_row();

create trigger inventory_product_units_prevent_id before update on public.inventory_product_units for each row execute function public.prevent_id_change();
create trigger inventory_product_prices_prevent_id before update on public.inventory_product_prices for each row execute function public.prevent_id_change();
create trigger inventory_product_media_prevent_id before update on public.inventory_product_media for each row execute function public.prevent_id_change();
create trigger inventory_product_online_attributes_prevent_id before update on public.inventory_product_online_attributes for each row execute function public.prevent_id_change();

create trigger inventory_product_units_prevent_tenant before update on public.inventory_product_units for each row execute function public.prevent_tenant_id_change();
create trigger inventory_product_prices_prevent_tenant before update on public.inventory_product_prices for each row execute function public.prevent_tenant_id_change();
create trigger inventory_product_media_prevent_tenant before update on public.inventory_product_media for each row execute function public.prevent_tenant_id_change();
create trigger inventory_product_online_attributes_prevent_tenant before update on public.inventory_product_online_attributes for each row execute function public.prevent_tenant_id_change();

alter table public.inventory_product_units enable row level security;
alter table public.inventory_product_prices enable row level security;
alter table public.inventory_product_media enable row level security;
alter table public.inventory_product_online_attributes enable row level security;

alter table public.inventory_product_units force row level security;
alter table public.inventory_product_prices force row level security;
alter table public.inventory_product_media force row level security;
alter table public.inventory_product_online_attributes force row level security;

create policy inventory_product_units_select on public.inventory_product_units for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_units_write on public.inventory_product_units for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_product_prices_select on public.inventory_product_prices for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_prices_write on public.inventory_product_prices for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_product_media_select on public.inventory_product_media for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_media_write on public.inventory_product_media for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));
create policy inventory_product_online_attributes_select on public.inventory_product_online_attributes for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.view', tenant_id));
create policy inventory_product_online_attributes_write on public.inventory_product_online_attributes for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.products.manage', tenant_id));

comment on table public.inventory_product_units is 'Product unit conversions and per-unit barcodes for canonical Inventory product master.';
comment on table public.inventory_product_prices is 'Readiness-only product prices. No costing, valuation, invoicing, posting, or sales runtime.';
comment on table public.inventory_product_media is 'Product master media references for images, videos, manuals, certificates, and attachments.';
comment on table public.inventory_product_online_attributes is 'Optional visible online product attributes for product detail pages.';
