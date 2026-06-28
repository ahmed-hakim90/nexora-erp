-- Stabilization gate for the three current apps.
-- Inventory app/runtime references now align to inventory_* canonical tables.
-- Finance and Manufacturing canonical decisions are documented in docs/CURRENT_APP_FOUNDATION_DECISIONS.md.

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_source_warehouse_id_fkey,
  drop constraint if exists inventory_transactions_source_location_id_fkey,
  drop constraint if exists inventory_transactions_destination_warehouse_id_fkey,
  drop constraint if exists inventory_transactions_destination_location_id_fkey;

alter table public.inventory_transactions
  add constraint inventory_transactions_source_warehouse_id_fkey
    foreign key (source_warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint inventory_transactions_source_location_id_fkey
    foreign key (source_location_id) references public.inventory_locations(id) on delete restrict not valid,
  add constraint inventory_transactions_destination_warehouse_id_fkey
    foreign key (destination_warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint inventory_transactions_destination_location_id_fkey
    foreign key (destination_location_id) references public.inventory_locations(id) on delete restrict not valid;

alter table public.inventory_transaction_lines
  drop constraint if exists inventory_transaction_lines_product_id_fkey,
  drop constraint if exists inventory_transaction_lines_unit_id_fkey,
  drop constraint if exists inventory_transaction_lines_source_warehouse_id_fkey,
  drop constraint if exists inventory_transaction_lines_source_location_id_fkey,
  drop constraint if exists inventory_transaction_lines_destination_warehouse_id_fkey,
  drop constraint if exists inventory_transaction_lines_destination_location_id_fkey;

alter table public.inventory_transaction_lines
  add constraint inventory_transaction_lines_product_id_fkey
    foreign key (product_id) references public.inventory_products(id) on delete restrict not valid,
  add constraint inventory_transaction_lines_unit_id_fkey
    foreign key (unit_id) references public.inventory_uoms(id) on delete restrict not valid,
  add constraint inventory_transaction_lines_source_warehouse_id_fkey
    foreign key (source_warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint inventory_transaction_lines_source_location_id_fkey
    foreign key (source_location_id) references public.inventory_locations(id) on delete restrict not valid,
  add constraint inventory_transaction_lines_destination_warehouse_id_fkey
    foreign key (destination_warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint inventory_transaction_lines_destination_location_id_fkey
    foreign key (destination_location_id) references public.inventory_locations(id) on delete restrict not valid;

alter table public.inventory_cycle_counts
  drop constraint if exists inventory_cycle_counts_warehouse_id_fkey,
  drop constraint if exists inventory_cycle_counts_location_id_fkey;

alter table public.inventory_cycle_counts
  add constraint inventory_cycle_counts_warehouse_id_fkey
    foreign key (warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint inventory_cycle_counts_location_id_fkey
    foreign key (location_id) references public.inventory_locations(id) on delete restrict not valid;

alter table public.inventory_cycle_count_lines
  drop constraint if exists inventory_cycle_count_lines_product_id_fkey,
  drop constraint if exists inventory_cycle_count_lines_unit_id_fkey;

alter table public.inventory_cycle_count_lines
  add constraint inventory_cycle_count_lines_product_id_fkey
    foreign key (product_id) references public.inventory_products(id) on delete restrict not valid,
  add constraint inventory_cycle_count_lines_unit_id_fkey
    foreign key (unit_id) references public.inventory_uoms(id) on delete restrict not valid;

alter table public.stock_ledger_entries
  drop constraint if exists stock_ledger_entries_product_id_fkey,
  drop constraint if exists stock_ledger_entries_warehouse_id_fkey,
  drop constraint if exists stock_ledger_entries_location_id_fkey,
  drop constraint if exists stock_ledger_entries_unit_id_fkey,
  add constraint stock_ledger_entries_product_id_fkey
    foreign key (product_id) references public.inventory_products(id) on delete restrict not valid,
  add constraint stock_ledger_entries_warehouse_id_fkey
    foreign key (warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint stock_ledger_entries_location_id_fkey
    foreign key (location_id) references public.inventory_locations(id) on delete restrict not valid,
  add constraint stock_ledger_entries_unit_id_fkey
    foreign key (unit_id) references public.inventory_uoms(id) on delete restrict not valid;

alter table public.stock_balances
  drop constraint if exists stock_balances_product_id_fkey,
  drop constraint if exists stock_balances_warehouse_id_fkey,
  drop constraint if exists stock_balances_location_id_fkey,
  drop constraint if exists stock_balances_unit_id_fkey,
  add constraint stock_balances_product_id_fkey
    foreign key (product_id) references public.inventory_products(id) on delete restrict not valid,
  add constraint stock_balances_warehouse_id_fkey
    foreign key (warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint stock_balances_location_id_fkey
    foreign key (location_id) references public.inventory_locations(id) on delete restrict not valid,
  add constraint stock_balances_unit_id_fkey
    foreign key (unit_id) references public.inventory_uoms(id) on delete restrict not valid;

alter table public.stock_balance_snapshots
  drop constraint if exists stock_balance_snapshots_product_id_fkey,
  drop constraint if exists stock_balance_snapshots_warehouse_id_fkey,
  drop constraint if exists stock_balance_snapshots_location_id_fkey,
  drop constraint if exists stock_balance_snapshots_unit_id_fkey,
  add constraint stock_balance_snapshots_product_id_fkey
    foreign key (product_id) references public.inventory_products(id) on delete restrict not valid,
  add constraint stock_balance_snapshots_warehouse_id_fkey
    foreign key (warehouse_id) references public.inventory_warehouses(id) on delete restrict not valid,
  add constraint stock_balance_snapshots_location_id_fkey
    foreign key (location_id) references public.inventory_locations(id) on delete restrict not valid,
  add constraint stock_balance_snapshots_unit_id_fkey
    foreign key (unit_id) references public.inventory_uoms(id) on delete restrict not valid;

drop policy if exists inventory_cycle_counts_select_member_permission on public.inventory_cycle_counts;
drop policy if exists inventory_cycle_counts_insert_member_permission on public.inventory_cycle_counts;
drop policy if exists inventory_cycle_counts_update_member_permission on public.inventory_cycle_counts;
drop policy if exists inventory_cycle_count_lines_select_member_permission on public.inventory_cycle_count_lines;
drop policy if exists inventory_cycle_count_lines_insert_member_permission on public.inventory_cycle_count_lines;
drop policy if exists inventory_cycle_count_lines_update_member_permission on public.inventory_cycle_count_lines;

create policy inventory_cycle_counts_select_member_permission on public.inventory_cycle_counts for select to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.view', tenant_id));
create policy inventory_cycle_counts_insert_member_permission on public.inventory_cycle_counts for insert to authenticated
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.manage', tenant_id));
create policy inventory_cycle_counts_update_member_permission on public.inventory_cycle_counts for update to authenticated
  using (is_active = true and deleted_at is null and status in ('draft', 'submitted') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.cycle-count.manage', tenant_id) or public.has_permission('inventory.cycle-count.post', tenant_id)))
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.cycle-count.manage', tenant_id) or public.has_permission('inventory.cycle-count.post', tenant_id)));

create policy inventory_cycle_count_lines_select_member_permission on public.inventory_cycle_count_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.view', tenant_id));
create policy inventory_cycle_count_lines_insert_member_permission on public.inventory_cycle_count_lines for insert to authenticated
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.manage', tenant_id));
create policy inventory_cycle_count_lines_update_member_permission on public.inventory_cycle_count_lines for update to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle-count.manage', tenant_id));

insert into public.permission_definitions (permission_key, name, description, risk_level)
values
  ('inventory.cycle-count.view', 'View Cycle Counts', 'View inventory cycle count records.', 'standard'),
  ('inventory.cycle-count.manage', 'Manage Cycle Counts', 'Create and update draft cycle counts.', 'standard'),
  ('inventory.cycle-count.post', 'Post Cycle Counts', 'Post cycle count differences through StockPostingService.', 'high')
on conflict do nothing;

comment on table public.stock_ledger_entries is 'Append-only Inventory stock ledger. Product, warehouse, location, and UOM references use canonical inventory_* tables.';
comment on table public.stock_balances is 'Derived Inventory balance cache aligned to canonical inventory_* tables.';
