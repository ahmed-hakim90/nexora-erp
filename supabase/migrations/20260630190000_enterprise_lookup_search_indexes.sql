-- Enterprise runtime search indexes for bounded lookup queries (Wave 4).
create extension if not exists pg_trgm with schema extensions;

-- Scope-leading btree indexes for tenant + company + branch filtered lists.
create index if not exists inventory_products_scope_branch_list_idx
  on public.inventory_products (tenant_id, company_id, branch_id, name, id)
  where deleted_at is null;

create index if not exists inventory_locations_scope_branch_list_idx
  on public.inventory_locations (tenant_id, company_id, branch_id, location_key, id)
  where deleted_at is null;

create index if not exists inventory_lots_scope_branch_list_idx
  on public.inventory_lots (tenant_id, company_id, branch_id, lot_number, id)
  where deleted_at is null;

create index if not exists inventory_serial_numbers_scope_branch_list_idx
  on public.inventory_serial_numbers (tenant_id, company_id, branch_id, serial_number, id)
  where deleted_at is null;

create index if not exists inventory_uoms_scope_list_idx
  on public.inventory_uoms (tenant_id, company_id, uom_key, name, id)
  where deleted_at is null;

create index if not exists purchase_orders_branch_status_idx
  on public.purchase_orders (tenant_id, branch_id, status, created_at desc, id desc)
  where deleted_at is null;

create index if not exists inventory_ledger_entries_branch_history_idx
  on public.inventory_ledger_entries (tenant_id, company_id, branch_id, posting_timestamp desc, id desc);

-- Trigram GIN indexes for ILIKE search used by lookup runtime.
create index if not exists inventory_products_name_trgm_idx
  on public.inventory_products using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_products_sku_trgm_idx
  on public.inventory_products using gin (sku extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_products_barcode_trgm_idx
  on public.inventory_products using gin (barcode extensions.gin_trgm_ops)
  where deleted_at is null and barcode is not null;

create index if not exists inventory_warehouses_name_trgm_idx
  on public.inventory_warehouses using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_warehouses_key_trgm_idx
  on public.inventory_warehouses using gin (warehouse_key extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_locations_key_trgm_idx
  on public.inventory_locations using gin (location_key extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_locations_name_trgm_idx
  on public.inventory_locations using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_lots_number_trgm_idx
  on public.inventory_lots using gin (lot_number extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists inventory_serial_numbers_number_trgm_idx
  on public.inventory_serial_numbers using gin (serial_number extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists purchase_orders_title_trgm_idx
  on public.purchase_orders using gin (title extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists suppliers_name_trgm_idx
  on public.suppliers using gin (name_en extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists suppliers_code_trgm_idx
  on public.suppliers using gin (supplier_code extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists branches_name_trgm_idx
  on public.branches using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists branches_code_trgm_idx
  on public.branches using gin (code extensions.gin_trgm_ops)
  where deleted_at is null;
