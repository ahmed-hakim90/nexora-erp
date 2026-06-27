-- Nexora Sprint 10: Inventory Transactions.
-- Controlled inventory transaction workflows on top of Sprint 9 posting foundation.
-- No production, sales, purchase, accounting, order, or invoice tables are created here.

create type public.inventory_transaction_type as enum (
  'stock_adjustment',
  'warehouse_transfer',
  'goods_receipt',
  'goods_issue',
  'cycle_count'
);

create type public.inventory_transaction_status as enum (
  'draft',
  'submitted',
  'posted',
  'cancelled',
  'reversed'
);

create type public.inventory_transaction_posting_kind as enum (
  'post',
  'reversal'
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  transaction_type public.inventory_transaction_type not null,
  status public.inventory_transaction_status not null default 'draft',
  title text not null,
  transaction_date date not null default current_date,
  source_warehouse_id uuid references public.warehouses(id) on delete restrict,
  source_location_id uuid references public.warehouse_locations(id) on delete restrict,
  destination_warehouse_id uuid references public.warehouses(id) on delete restrict,
  destination_location_id uuid references public.warehouse_locations(id) on delete restrict,
  reason text,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  posted_at timestamptz,
  posted_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id),
  reversal_of_transaction_id uuid references public.inventory_transactions(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(title)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (status <> 'submitted' or (submitted_at is not null and submitted_by is not null)),
  check (status <> 'posted' or (posted_at is not null and posted_by is not null)),
  check (status <> 'cancelled' or (cancelled_at is not null and cancelled_by is not null)),
  check (status <> 'reversed' or (reversed_at is not null and reversed_by is not null)),
  check (transaction_type <> 'stock_adjustment' or length(trim(coalesce(reason, ''))) > 0),
  check (
    transaction_type <> 'warehouse_transfer'
    or (
      source_warehouse_id is not null
      and source_location_id is not null
      and destination_warehouse_id is not null
      and destination_location_id is not null
      and source_location_id <> destination_location_id
    )
  ),
  check (transaction_type <> 'goods_receipt' or (destination_warehouse_id is not null and destination_location_id is not null)),
  check (transaction_type <> 'goods_issue' or (source_warehouse_id is not null and source_location_id is not null))
);

create table public.inventory_transaction_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  transaction_id uuid not null references public.inventory_transactions(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  source_warehouse_id uuid references public.warehouses(id) on delete restrict,
  source_location_id uuid references public.warehouse_locations(id) on delete restrict,
  destination_warehouse_id uuid references public.warehouses(id) on delete restrict,
  destination_location_id uuid references public.warehouse_locations(id) on delete restrict,
  quantity numeric(18, 6),
  quantity_delta numeric(18, 6),
  unit_cost numeric(18, 6) not null default 0,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (quantity is null or quantity > 0),
  check (quantity_delta is null or quantity_delta <> 0),
  check (quantity is not null or quantity_delta is not null),
  check (unit_cost >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_transaction_postings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  transaction_id uuid not null references public.inventory_transactions(id) on delete restrict,
  posting_batch_id uuid not null references public.stock_posting_batches(id) on delete restrict,
  posting_kind public.inventory_transaction_posting_kind not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
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
  check (deleted_at is null)
);

create table public.inventory_cycle_counts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  transaction_id uuid not null references public.inventory_transactions(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  status public.inventory_transaction_status not null default 'draft',
  count_date date not null default current_date,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  notes text,
  posted_at timestamptz,
  posted_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (status <> 'posted' or (posted_at is not null and posted_by is not null))
);

create table public.inventory_cycle_count_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  cycle_count_id uuid not null references public.inventory_cycle_counts(id) on delete cascade,
  transaction_line_id uuid references public.inventory_transaction_lines(id) on delete set null,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  expected_quantity numeric(18, 6) not null default 0,
  counted_quantity numeric(18, 6) not null,
  difference_quantity numeric(18, 6) generated always as (counted_quantity - expected_quantity) stored,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (expected_quantity >= 0),
  check (counted_quantity >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_transactions_document_uq
  on public.inventory_transactions (tenant_id, business_document_id)
  where deleted_at is null;
create index inventory_transactions_type_status_idx
  on public.inventory_transactions (tenant_id, transaction_type, status, created_at desc, id desc)
  where deleted_at is null;
create index inventory_transactions_branch_date_idx
  on public.inventory_transactions (tenant_id, branch_id, transaction_date desc, id desc)
  where deleted_at is null;

create unique index inventory_transaction_lines_number_uq
  on public.inventory_transaction_lines (tenant_id, transaction_id, line_number)
  where deleted_at is null;
create index inventory_transaction_lines_product_idx
  on public.inventory_transaction_lines (tenant_id, product_id, created_at desc)
  where deleted_at is null;

create unique index inventory_transaction_postings_kind_uq
  on public.inventory_transaction_postings (tenant_id, transaction_id, posting_kind)
  where deleted_at is null;
create unique index inventory_transaction_postings_batch_uq
  on public.inventory_transaction_postings (tenant_id, posting_batch_id)
  where deleted_at is null;
create unique index inventory_transaction_postings_idempotency_uq
  on public.inventory_transaction_postings (tenant_id, idempotency_key)
  where deleted_at is null;

create unique index inventory_cycle_counts_transaction_uq
  on public.inventory_cycle_counts (tenant_id, transaction_id)
  where deleted_at is null;
create unique index inventory_cycle_counts_document_uq
  on public.inventory_cycle_counts (tenant_id, business_document_id)
  where deleted_at is null;
create unique index inventory_cycle_count_lines_number_uq
  on public.inventory_cycle_count_lines (tenant_id, cycle_count_id, line_number)
  where deleted_at is null;

create or replace function public.prevent_posted_inventory_transaction_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'submitted', 'cancelled') then
    raise exception 'draft inventory transactions can only remain draft, submit, or cancel';
  end if;

  if old.status = 'submitted' and new.status not in ('submitted', 'posted', 'cancelled') then
    raise exception 'submitted inventory transactions can only remain submitted, post, or cancel';
  end if;

  if old.status = 'posted' and new.status not in ('reversed') then
    raise exception 'posted inventory transactions can only move to reversed';
  end if;

  if old.status = 'cancelled' then
    raise exception 'cancelled inventory transactions are terminal';
  end if;

  if old.status = 'reversed' then
    raise exception 'reversed inventory transactions are terminal';
  end if;

  if old.status = 'posted' and new.status = 'reversed' then
    if new.tenant_id is distinct from old.tenant_id
      or new.branch_id is distinct from old.branch_id
      or new.business_document_id is distinct from old.business_document_id
      or new.transaction_type is distinct from old.transaction_type
      or new.title is distinct from old.title
      or new.transaction_date is distinct from old.transaction_date
      or new.source_warehouse_id is distinct from old.source_warehouse_id
      or new.source_location_id is distinct from old.source_location_id
      or new.destination_warehouse_id is distinct from old.destination_warehouse_id
      or new.destination_location_id is distinct from old.destination_location_id
      or new.reason is distinct from old.reason
      or new.submitted_at is distinct from old.submitted_at
      or new.submitted_by is distinct from old.submitted_by
      or new.posted_at is distinct from old.posted_at
      or new.posted_by is distinct from old.posted_by
      or new.cancelled_at is distinct from old.cancelled_at
      or new.cancelled_by is distinct from old.cancelled_by
      or new.reversal_of_transaction_id is distinct from old.reversal_of_transaction_id
      or new.deleted_at is distinct from old.deleted_at
      or new.deleted_by is distinct from old.deleted_by
      or new.is_active is distinct from old.is_active then
      raise exception 'posted inventory transactions cannot be edited during reversal';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.record_inventory_transaction_posting(
  input_tenant_id uuid,
  input_branch_id uuid,
  input_transaction_id uuid,
  input_posting_batch_id uuid,
  input_posting_kind public.inventory_transaction_posting_kind,
  input_idempotency_key text,
  input_metadata jsonb default '{}'::jsonb
)
returns public.inventory_transaction_postings
language plpgsql
security invoker
set search_path = public
as $$
declare
  service_guard text;
  existing_posting public.inventory_transaction_postings%rowtype;
  created_posting public.inventory_transaction_postings%rowtype;
  transaction_record public.inventory_transactions%rowtype;
  posting_batch_record public.stock_posting_batches%rowtype;
begin
  if not public.is_tenant_member(input_tenant_id) then
    raise exception 'tenant membership is required to record inventory transaction posting';
  end if;

  if not public.has_permission('inventory.transaction.post', input_tenant_id) then
    raise exception 'inventory transaction posting permission is required';
  end if;

  if input_idempotency_key is null or length(trim(input_idempotency_key)) = 0 then
    raise exception 'inventory transaction posting requires an idempotency key';
  end if;

  if jsonb_typeof(input_metadata) <> 'object' then
    raise exception 'inventory transaction posting metadata must be an object';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('inventory_transaction_posting:' || input_tenant_id::text || ':' || input_transaction_id::text || ':' || input_posting_kind::text, 0)
  );

  select * into existing_posting
  from public.inventory_transaction_postings
  where tenant_id = input_tenant_id
    and transaction_id = input_transaction_id
    and posting_kind = input_posting_kind
    and deleted_at is null;

  if existing_posting.id is not null then
    return existing_posting;
  end if;

  select * into transaction_record
  from public.inventory_transactions
  where id = input_transaction_id
    and tenant_id = input_tenant_id
    and branch_id = input_branch_id
    and deleted_at is null
  for update;

  if transaction_record.id is null then
    raise exception 'inventory transaction was not found for posting record';
  end if;

  if input_posting_kind = 'post' and transaction_record.status <> 'submitted' then
    raise exception 'Only submitted inventory transactions can be posted';
  end if;

  if input_posting_kind = 'reversal' and transaction_record.status <> 'posted' then
    raise exception 'Only posted inventory transactions can be reversed';
  end if;

  select * into posting_batch_record
  from public.stock_posting_batches
  where id = input_posting_batch_id
    and tenant_id = input_tenant_id
    and branch_id = input_branch_id
    and deleted_at is null;

  if posting_batch_record.id is null then
    raise exception 'stock posting batch was not found for inventory transaction posting';
  end if;

  service_guard := set_config('app.inventory_transaction_service', 'on', true);

  insert into public.inventory_transaction_postings (
    tenant_id,
    branch_id,
    transaction_id,
    posting_batch_id,
    posting_kind,
    idempotency_key,
    metadata,
    created_by,
    updated_by
  )
  values (
    input_tenant_id,
    input_branch_id,
    input_transaction_id,
    input_posting_batch_id,
    input_posting_kind,
    input_idempotency_key,
    input_metadata,
    public.current_user_id(),
    public.current_user_id()
  )
  returning * into created_posting;

  return created_posting;
end;
$$;

create or replace function public.prevent_inventory_line_edit_after_posting()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status public.inventory_transaction_status;
begin
  select status into parent_status
  from public.inventory_transactions
  where id = coalesce(new.transaction_id, old.transaction_id);

  if parent_status in ('posted', 'cancelled', 'reversed') then
    raise exception 'inventory transaction lines cannot be changed after posting, cancellation, or reversal';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_cycle_count_edit_after_posting()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status public.inventory_transaction_status;
begin
  if tg_table_name = 'inventory_cycle_counts' then
    parent_status := old.status;
  else
    select status into parent_status
    from public.inventory_cycle_counts
    where id = coalesce(new.cycle_count_id, old.cycle_count_id);
  end if;

  if parent_status in ('posted', 'cancelled', 'reversed') then
    raise exception 'cycle count records cannot be changed after posting, cancellation, or reversal';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger inventory_transactions_touch_updated_at before update on public.inventory_transactions for each row execute function public.touch_platform_row();
create trigger inventory_transactions_prevent_id_change before update on public.inventory_transactions for each row execute function public.prevent_id_change();
create trigger inventory_transactions_prevent_tenant_id_change before update on public.inventory_transactions for each row execute function public.prevent_tenant_id_change();
create trigger inventory_transactions_prevent_posted_edit before update on public.inventory_transactions for each row execute function public.prevent_posted_inventory_transaction_edit();

create trigger inventory_transaction_lines_touch_updated_at before update on public.inventory_transaction_lines for each row execute function public.touch_platform_row();
create trigger inventory_transaction_lines_prevent_id_change before update on public.inventory_transaction_lines for each row execute function public.prevent_id_change();
create trigger inventory_transaction_lines_prevent_tenant_id_change before update on public.inventory_transaction_lines for each row execute function public.prevent_tenant_id_change();
create trigger inventory_transaction_lines_prevent_posted_edit before insert or update or delete on public.inventory_transaction_lines for each row execute function public.prevent_inventory_line_edit_after_posting();

create trigger inventory_transaction_postings_touch_updated_at before update on public.inventory_transaction_postings for each row execute function public.touch_platform_row();
create trigger inventory_transaction_postings_prevent_id_change before update on public.inventory_transaction_postings for each row execute function public.prevent_id_change();
create trigger inventory_transaction_postings_prevent_tenant_id_change before update on public.inventory_transaction_postings for each row execute function public.prevent_tenant_id_change();

create trigger inventory_cycle_counts_touch_updated_at before update on public.inventory_cycle_counts for each row execute function public.touch_platform_row();
create trigger inventory_cycle_counts_prevent_id_change before update on public.inventory_cycle_counts for each row execute function public.prevent_id_change();
create trigger inventory_cycle_counts_prevent_tenant_id_change before update on public.inventory_cycle_counts for each row execute function public.prevent_tenant_id_change();
create trigger inventory_cycle_counts_prevent_posted_edit before update on public.inventory_cycle_counts for each row execute function public.prevent_cycle_count_edit_after_posting();

create trigger inventory_cycle_count_lines_touch_updated_at before update on public.inventory_cycle_count_lines for each row execute function public.touch_platform_row();
create trigger inventory_cycle_count_lines_prevent_id_change before update on public.inventory_cycle_count_lines for each row execute function public.prevent_id_change();
create trigger inventory_cycle_count_lines_prevent_tenant_id_change before update on public.inventory_cycle_count_lines for each row execute function public.prevent_tenant_id_change();
create trigger inventory_cycle_count_lines_prevent_posted_edit before insert or update or delete on public.inventory_cycle_count_lines for each row execute function public.prevent_cycle_count_edit_after_posting();

alter table public.inventory_transactions enable row level security;
alter table public.inventory_transaction_lines enable row level security;
alter table public.inventory_transaction_postings enable row level security;
alter table public.inventory_cycle_counts enable row level security;
alter table public.inventory_cycle_count_lines enable row level security;

alter table public.inventory_transactions force row level security;
alter table public.inventory_transaction_lines force row level security;
alter table public.inventory_transaction_postings force row level security;
alter table public.inventory_cycle_counts force row level security;
alter table public.inventory_cycle_count_lines force row level security;

create policy inventory_transactions_select_member_permission on public.inventory_transactions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.view', tenant_id));
create policy inventory_transactions_insert_member_permission on public.inventory_transactions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.create', tenant_id));
create policy inventory_transactions_update_member_permission on public.inventory_transactions for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'submitted', 'posted') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.transaction.update', tenant_id) or public.has_permission('inventory.transaction.submit', tenant_id) or public.has_permission('inventory.transaction.post', tenant_id) or public.has_permission('inventory.transaction.cancel', tenant_id) or public.has_permission('inventory.transaction.reverse', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.transaction.update', tenant_id) or public.has_permission('inventory.transaction.submit', tenant_id) or public.has_permission('inventory.transaction.post', tenant_id) or public.has_permission('inventory.transaction.cancel', tenant_id) or public.has_permission('inventory.transaction.reverse', tenant_id)));

create policy inventory_transaction_lines_select_member_permission on public.inventory_transaction_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.view', tenant_id));
create policy inventory_transaction_lines_insert_member_permission on public.inventory_transaction_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.create', tenant_id));
create policy inventory_transaction_lines_update_member_permission on public.inventory_transaction_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.update', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.update', tenant_id));

create policy inventory_transaction_postings_select_member_permission on public.inventory_transaction_postings for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.view', tenant_id));
create policy inventory_transaction_postings_insert_service_permission on public.inventory_transaction_postings for insert to authenticated with check (current_setting('app.inventory_transaction_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.transaction.post', tenant_id));

create policy inventory_cycle_counts_select_member_permission on public.inventory_cycle_counts for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.view', tenant_id));
create policy inventory_cycle_counts_insert_member_permission on public.inventory_cycle_counts for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.manage', tenant_id));
create policy inventory_cycle_counts_update_member_permission on public.inventory_cycle_counts for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'submitted') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.cycle_count.manage', tenant_id) or public.has_permission('inventory.cycle_count.post', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('inventory.cycle_count.manage', tenant_id) or public.has_permission('inventory.cycle_count.post', tenant_id)));

create policy inventory_cycle_count_lines_select_member_permission on public.inventory_cycle_count_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.view', tenant_id));
create policy inventory_cycle_count_lines_insert_member_permission on public.inventory_cycle_count_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.manage', tenant_id));
create policy inventory_cycle_count_lines_update_member_permission on public.inventory_cycle_count_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.cycle_count.manage', tenant_id));

create policy event_outbox_inventory_transaction_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('inventory.transaction.created', 'inventory.transaction.submitted', 'inventory.transaction.posted', 'inventory.transaction.cancelled', 'inventory.transaction.reversed', 'inventory.cycle_count.posted') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.transaction.view', tenant_id));
create policy event_outbox_inventory_transaction_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('inventory.transaction.created', 'inventory.transaction.submitted', 'inventory.transaction.posted', 'inventory.transaction.cancelled', 'inventory.transaction.reversed', 'inventory.cycle_count.posted') and public.is_tenant_member(tenant_id) and (public.has_permission('inventory.transaction.create', tenant_id) or public.has_permission('inventory.transaction.post', tenant_id) or public.has_permission('inventory.cycle_count.post', tenant_id)));

grant execute on function public.record_inventory_transaction_posting(uuid, uuid, uuid, uuid, public.inventory_transaction_posting_kind, text, jsonb) to authenticated;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.transaction.view', 'View Inventory Transactions', 'View Sprint 10 controlled inventory transaction documents.', 'standard'),
  ('inventory.transaction.create', 'Create Inventory Transactions', 'Create draft inventory transaction documents and lines.', 'standard'),
  ('inventory.transaction.update', 'Update Inventory Transactions', 'Update draft inventory transaction documents and lines.', 'standard'),
  ('inventory.transaction.submit', 'Submit Inventory Transactions', 'Submit inventory transactions for posting.', 'high'),
  ('inventory.transaction.post', 'Post Inventory Transactions', 'Post inventory transactions through StockPostingService only.', 'high'),
  ('inventory.transaction.cancel', 'Cancel Inventory Transactions', 'Cancel draft or submitted inventory transactions.', 'high'),
  ('inventory.transaction.reverse', 'Reverse Inventory Transactions', 'Reverse posted inventory transactions through StockPostingService.', 'high'),
  ('inventory.cycle_count.view', 'View Cycle Counts', 'View Sprint 10 cycle count records.', 'standard'),
  ('inventory.cycle_count.manage', 'Manage Cycle Counts', 'Create and update draft cycle counts.', 'standard'),
  ('inventory.cycle_count.post', 'Post Cycle Counts', 'Post cycle count differences through StockPostingService.', 'high')
on conflict (permission_key) do update
set label = excluded.label,
    description = excluded.description,
    risk_level = excluded.risk_level;
