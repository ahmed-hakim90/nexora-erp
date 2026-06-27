-- Nexora Sprint 9: Inventory Ledger and Posting Foundation only.
-- Immutable stock ledger is the source of truth. stock_balances is a derived/current balance cache only.
-- No production, sales, purchasing, accounting, or full warehouse transfer workflow is implemented here.

create type public.stock_ledger_direction as enum ('in', 'out', 'neutral');
create type public.stock_posting_batch_status as enum ('posted', 'reversed');
create type public.stock_posting_rule_effect as enum ('increase_destination', 'decrease_source', 'adjust_signed', 'transfer_out_in');

create table public.stock_posting_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete restrict,
  status public.stock_posting_batch_status not null default 'posted',
  posted_at timestamptz not null default now(),
  posted_by uuid not null references auth.users(id),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id),
  idempotency_key text not null,
  correlation_id text not null,
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
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check ((status = 'posted' and reversed_at is null and reversed_by is null) or (status = 'reversed' and reversed_at is not null and reversed_by is not null)),
  check (deleted_at is null)
);

create table public.stock_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  posting_batch_id uuid not null references public.stock_posting_batches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete restrict,
  document_type_key public.business_document_generic_key not null,
  movement_type_key public.business_document_generic_key not null,
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity_delta numeric(18, 6) not null,
  unit_cost numeric(18, 6) not null default 0,
  total_cost numeric(18, 6) not null default 0,
  direction public.stock_ledger_direction not null,
  posted_at timestamptz not null default now(),
  posted_by uuid not null references auth.users(id),
  reversal_of_entry_id uuid references public.stock_ledger_entries(id) on delete restrict,
  correlation_id text not null,
  causation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (quantity_delta <> 0),
  check ((direction = 'in' and quantity_delta > 0) or (direction = 'out' and quantity_delta < 0) or (direction = 'neutral')),
  check (unit_cost >= 0),
  check (total_cost >= 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create table public.stock_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity_on_hand numeric(18, 6) not null default 0,
  quantity_reserved numeric(18, 6) not null default 0,
  quantity_available numeric(18, 6) generated always as (quantity_on_hand - quantity_reserved) stored,
  last_movement_at timestamptz,
  metadata jsonb not null default '{"cache":"derived_from_stock_ledger_entries"}'::jsonb,
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
  check (deleted_at is null)
);

create table public.stock_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  snapshot_at timestamptz not null,
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  lot_id uuid,
  serial_id uuid,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity_on_hand numeric(18, 6) not null,
  quantity_reserved numeric(18, 6) not null,
  quantity_available numeric(18, 6) not null,
  source_balance_id uuid references public.stock_balances(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (quantity_available = quantity_on_hand - quantity_reserved),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create table public.stock_posting_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  movement_type_key public.business_document_generic_key not null,
  effect public.stock_posting_rule_effect not null,
  direction public.stock_ledger_direction not null,
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index stock_posting_batches_idempotency_uq
  on public.stock_posting_batches (tenant_id, idempotency_key)
  where deleted_at is null;
create index stock_posting_batches_document_idx
  on public.stock_posting_batches (tenant_id, document_id, posted_at desc, id desc)
  where deleted_at is null;
create index stock_posting_batches_status_date_idx
  on public.stock_posting_batches (tenant_id, status, posted_at desc, id desc)
  where deleted_at is null;

create index stock_ledger_entries_product_date_idx
  on public.stock_ledger_entries (tenant_id, product_id, posted_at desc, id desc)
  where deleted_at is null;
create index stock_ledger_entries_warehouse_location_date_idx
  on public.stock_ledger_entries (tenant_id, warehouse_id, location_id, posted_at desc, id desc)
  where deleted_at is null;
create index stock_ledger_entries_document_idx
  on public.stock_ledger_entries (tenant_id, document_id, posted_at desc, id desc)
  where deleted_at is null;
create index stock_ledger_entries_correlation_idx
  on public.stock_ledger_entries (tenant_id, correlation_id, posted_at desc)
  where deleted_at is null;
create index stock_ledger_entries_reversal_idx
  on public.stock_ledger_entries (tenant_id, reversal_of_entry_id)
  where reversal_of_entry_id is not null and deleted_at is null;
create unique index stock_ledger_entries_reversal_once_uq
  on public.stock_ledger_entries (tenant_id, reversal_of_entry_id)
  where reversal_of_entry_id is not null and deleted_at is null;

create unique index stock_balances_cache_key_uq
  on public.stock_balances (
    tenant_id,
    product_id,
    warehouse_id,
    location_id,
    coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(serial_id, '00000000-0000-0000-0000-000000000000'::uuid),
    unit_id
  )
  where deleted_at is null;
create index stock_balances_product_idx
  on public.stock_balances (tenant_id, product_id, warehouse_id, location_id)
  where deleted_at is null;
create index stock_balances_warehouse_location_idx
  on public.stock_balances (tenant_id, warehouse_id, location_id, product_id)
  where deleted_at is null;
create index stock_balances_last_movement_idx
  on public.stock_balances (tenant_id, last_movement_at desc, id desc)
  where deleted_at is null;

create index stock_balance_snapshots_product_date_idx
  on public.stock_balance_snapshots (tenant_id, product_id, snapshot_at desc)
  where deleted_at is null;
create index stock_balance_snapshots_warehouse_location_date_idx
  on public.stock_balance_snapshots (tenant_id, warehouse_id, location_id, snapshot_at desc)
  where deleted_at is null;

create unique index stock_posting_rules_scope_key_uq
  on public.stock_posting_rules (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    movement_type_key
  )
  where deleted_at is null;

create or replace function public.prevent_stock_ledger_entry_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'stock ledger entries are append-only';
end;
$$;

create or replace function public.enforce_stock_posting_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  referenced_tenant_id uuid;
  referenced_branch_id uuid;
  referenced_warehouse_id uuid;
begin
  if tg_table_name in ('stock_posting_batches', 'stock_ledger_entries', 'stock_balance_snapshots', 'stock_posting_rules')
    and new.branch_id is not null then
    select tenant_id into referenced_tenant_id from public.branches where id = new.branch_id;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'branch must belong to the same tenant';
    end if;
  end if;

  if tg_table_name in ('stock_posting_batches', 'stock_ledger_entries') then
    select tenant_id, branch_id into referenced_tenant_id, referenced_branch_id
    from public.business_documents
    where id = new.document_id and is_active = true and deleted_at is null;

    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'posting document must belong to the same tenant';
    end if;
    if referenced_branch_id is distinct from new.branch_id then
      raise exception 'posting document branch must match posting branch';
    end if;
  end if;

  if tg_table_name in ('stock_ledger_entries', 'stock_balances', 'stock_balance_snapshots') then
    select tenant_id into referenced_tenant_id
    from public.products
    where id = new.product_id and is_stockable = true and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'stock posting product must be active, stockable, and tenant scoped';
    end if;

    select tenant_id, branch_id into referenced_tenant_id, referenced_branch_id
    from public.warehouses
    where id = new.warehouse_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'stock posting warehouse must belong to the same tenant';
    end if;
    if tg_table_name <> 'stock_balances' and referenced_branch_id is distinct from new.branch_id then
      raise exception 'stock posting warehouse branch must match posting branch';
    end if;

    select tenant_id, branch_id, warehouse_id into referenced_tenant_id, referenced_branch_id, referenced_warehouse_id
    from public.warehouse_locations
    where id = new.location_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'stock posting location must belong to the same tenant';
    end if;
    if referenced_warehouse_id is distinct from new.warehouse_id then
      raise exception 'stock posting location must belong to the same warehouse';
    end if;
    if tg_table_name <> 'stock_balances' and referenced_branch_id is distinct from new.branch_id then
      raise exception 'stock posting location branch must match posting branch';
    end if;

    select tenant_id into referenced_tenant_id
    from public.units
    where id = new.unit_id and is_active = true and deleted_at is null;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'stock posting unit must belong to the same tenant';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.inventory_allow_negative_stock(input_tenant_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select (value #>> '{}')::boolean
      from public.app_settings
      where setting_key = 'inventory.allow_negative_stock'
        and (tenant_id = input_tenant_id or tenant_id is null)
        and is_active = true
        and deleted_at is null
      order by tenant_id nulls last
      limit 1
    ),
    false
  );
$$;

create or replace function public.post_stock_entries(
  input_tenant_id uuid,
  input_branch_id uuid,
  input_document_id uuid,
  input_idempotency_key text,
  input_correlation_id text,
  input_entries jsonb,
  input_metadata jsonb default '{}'::jsonb
)
returns public.stock_posting_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  service_guard text;
  resolved_document public.business_documents%rowtype;
  existing_batch public.stock_posting_batches%rowtype;
  created_batch public.stock_posting_batches%rowtype;
  entry jsonb;
  current_balance public.stock_balances%rowtype;
  next_quantity_on_hand numeric(18, 6);
  entry_quantity_delta numeric(18, 6);
  entry_direction public.stock_ledger_direction;
  entry_product_id uuid;
  entry_warehouse_id uuid;
  entry_location_id uuid;
  entry_lot_id uuid;
  entry_serial_id uuid;
  entry_unit_id uuid;
  entry_id uuid;
  allow_negative boolean;
  reversal_source_batch_id uuid;
  reversal_source_batch public.stock_posting_batches%rowtype;
  balance_keys jsonb := '[]'::jsonb;
  inventory_event_name text;
  inventory_event_id uuid;
  balance_event_id uuid;
begin
  if not public.is_tenant_member(input_tenant_id) then
    raise exception 'tenant membership is required to post stock entries';
  end if;

  if not public.has_permission('inventory.stock.post', input_tenant_id) then
    raise exception 'inventory stock posting permission is required';
  end if;

  if not (input_tenant_id = any(public.current_tenant_ids())) then
    raise exception 'stock posting tenant must match current tenant context';
  end if;

  if input_idempotency_key is null or length(trim(input_idempotency_key)) = 0 then
    raise exception 'stock posting requires an idempotency key';
  end if;

  if input_correlation_id is null or length(trim(input_correlation_id)) = 0 then
    raise exception 'stock posting requires a correlation id';
  end if;

  if jsonb_typeof(input_entries) <> 'array' or jsonb_array_length(input_entries) = 0 then
    raise exception 'stock posting requires at least one ledger entry';
  end if;

  if jsonb_typeof(input_metadata) <> 'object' then
    raise exception 'stock posting metadata must be an object';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('stock_posting_idempotency:' || input_tenant_id::text || ':' || trim(input_idempotency_key), 0)
  );

  select * into existing_batch
  from public.stock_posting_batches
  where tenant_id = input_tenant_id
    and idempotency_key = input_idempotency_key
    and deleted_at is null;

  if existing_batch.id is not null then
    return existing_batch;
  end if;

  select * into resolved_document
  from public.business_documents
  where id = input_document_id
    and tenant_id = input_tenant_id
    and branch_id is not distinct from input_branch_id
    and source_module = 'inventory'
    and document_type_key in ('inventory_receipt', 'inventory_issue', 'inventory_adjustment', 'inventory_transfer')
    and is_active = true
    and deleted_at is null;

  if resolved_document.id is null then
    raise exception 'stock posting requires an active generic inventory business document';
  end if;

  reversal_source_batch_id := nullif(input_metadata ->> 'reversalOfPostingBatchId', '')::uuid;
  if reversal_source_batch_id is not null then
    if not public.has_permission('inventory.stock.reverse', input_tenant_id) then
      raise exception 'inventory stock reversal permission is required';
    end if;

    select * into reversal_source_batch
    from public.stock_posting_batches
    where id = reversal_source_batch_id
      and tenant_id = input_tenant_id
      and deleted_at is null
    for update;

    if reversal_source_batch.id is null then
      raise exception 'stock reversal source batch was not found';
    end if;

    if reversal_source_batch.status <> 'posted' then
      raise exception 'stock posting batch has already been reversed';
    end if;

  end if;

  service_guard := set_config('app.stock_posting_service', 'on', true);

  insert into public.stock_posting_batches (
    tenant_id,
    branch_id,
    document_id,
    status,
    posted_by,
    idempotency_key,
    correlation_id,
    metadata,
    created_by,
    updated_by
  )
  values (
    input_tenant_id,
    input_branch_id,
    input_document_id,
    'posted',
    public.current_user_id(),
    input_idempotency_key,
    input_correlation_id,
    input_metadata,
    public.current_user_id(),
    public.current_user_id()
  )
  returning * into created_batch;

  allow_negative := public.inventory_allow_negative_stock(input_tenant_id);

  for entry in select * from jsonb_array_elements(input_entries)
  loop
    entry_quantity_delta := (entry ->> 'quantity_delta')::numeric;
    entry_direction := (entry ->> 'direction')::public.stock_ledger_direction;
    entry_product_id := (entry ->> 'product_id')::uuid;
    entry_warehouse_id := (entry ->> 'warehouse_id')::uuid;
    entry_location_id := (entry ->> 'location_id')::uuid;
    entry_lot_id := nullif(entry ->> 'lot_id', '')::uuid;
    entry_serial_id := nullif(entry ->> 'serial_id', '')::uuid;
    entry_unit_id := (entry ->> 'unit_id')::uuid;

    if entry_quantity_delta = 0 then
      raise exception 'stock ledger quantity delta cannot be zero';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(
        concat_ws(
          ':',
          'stock_balance',
          input_tenant_id::text,
          entry_product_id::text,
          entry_warehouse_id::text,
          entry_location_id::text,
          coalesce(entry_lot_id::text, ''),
          coalesce(entry_serial_id::text, ''),
          entry_unit_id::text
        ),
        0
      )
    );

    select * into current_balance
    from public.stock_balances
    where tenant_id = input_tenant_id
      and product_id = entry_product_id
      and warehouse_id = entry_warehouse_id
      and location_id = entry_location_id
      and lot_id is not distinct from entry_lot_id
      and serial_id is not distinct from entry_serial_id
      and unit_id = entry_unit_id
      and deleted_at is null
    for update;

    next_quantity_on_hand := coalesce(current_balance.quantity_on_hand, 0) + entry_quantity_delta;

    if not allow_negative and next_quantity_on_hand < 0 then
      raise exception 'negative stock is not allowed';
    end if;

    entry_id := gen_random_uuid();

    insert into public.stock_ledger_entries (
      id,
      tenant_id,
      branch_id,
      posting_batch_id,
      document_id,
      document_type_key,
      movement_type_key,
      product_id,
      warehouse_id,
      location_id,
      lot_id,
      serial_id,
      unit_id,
      quantity_delta,
      unit_cost,
      total_cost,
      direction,
      posted_by,
      reversal_of_entry_id,
      correlation_id,
      causation_id,
      metadata,
      created_by,
      updated_by
    )
    values (
      entry_id,
      input_tenant_id,
      input_branch_id,
      created_batch.id,
      input_document_id,
      resolved_document.document_type_key,
      (entry ->> 'movement_type_key')::public.business_document_generic_key,
      entry_product_id,
      entry_warehouse_id,
      entry_location_id,
      entry_lot_id,
      entry_serial_id,
      entry_unit_id,
      entry_quantity_delta,
      coalesce((entry ->> 'unit_cost')::numeric, 0),
      coalesce((entry ->> 'total_cost')::numeric, 0),
      entry_direction,
      public.current_user_id(),
      nullif(entry ->> 'reversal_of_entry_id', '')::uuid,
      input_correlation_id,
      nullif(entry ->> 'causation_id', '')::uuid,
      coalesce(entry -> 'metadata', '{}'::jsonb),
      public.current_user_id(),
      public.current_user_id()
    );

    if current_balance.id is null then
      insert into public.stock_balances (
        tenant_id,
        product_id,
        warehouse_id,
        location_id,
        lot_id,
        serial_id,
        unit_id,
        quantity_on_hand,
        quantity_reserved,
        last_movement_at,
        metadata,
        created_by,
        updated_by
      )
      values (
        input_tenant_id,
        entry_product_id,
        entry_warehouse_id,
        entry_location_id,
        entry_lot_id,
        entry_serial_id,
        entry_unit_id,
        next_quantity_on_hand,
        0,
        now(),
        jsonb_build_object('cache', 'derived_from_stock_ledger_entries', 'last_entry_id', entry_id),
        public.current_user_id(),
        public.current_user_id()
      );
    else
      update public.stock_balances
      set quantity_on_hand = next_quantity_on_hand,
          last_movement_at = now(),
          metadata = current_balance.metadata || jsonb_build_object('cache', 'derived_from_stock_ledger_entries', 'last_entry_id', entry_id),
          updated_by = public.current_user_id()
      where id = current_balance.id
        and tenant_id = input_tenant_id;
    end if;

    balance_keys := balance_keys || jsonb_build_array(jsonb_build_object(
      'productId', entry_product_id,
      'warehouseId', entry_warehouse_id,
      'locationId', entry_location_id,
      'lotId', entry_lot_id,
      'serialId', entry_serial_id,
      'unitId', entry_unit_id
    ));
  end loop;

  if reversal_source_batch_id is not null then
    update public.stock_posting_batches
    set status = 'reversed',
        reversed_at = now(),
        reversed_by = public.current_user_id(),
        updated_by = public.current_user_id()
    where id = reversal_source_batch_id
      and tenant_id = input_tenant_id
      and status = 'posted'
      and deleted_at is null;

    if not found then
      raise exception 'stock posting batch reversal status could not be updated';
    end if;
  end if;

  inventory_event_name := case
    when reversal_source_batch_id is null then 'inventory.stock_posted'
    else 'inventory.stock_reversed'
  end;
  inventory_event_id := gen_random_uuid();

  insert into public.event_outbox (
    tenant_id,
    event_id,
    event_name,
    event_version,
    aggregate_id,
    aggregate_type,
    payload,
    metadata,
    idempotency_key,
    correlation_id,
    causation_id,
    created_by,
    updated_by
  )
  values (
    input_tenant_id,
    inventory_event_id,
    inventory_event_name,
    1,
    created_batch.id,
    'stock_posting_batch',
    jsonb_strip_nulls(jsonb_build_object(
      'postingBatchId', created_batch.id,
      'documentId', input_document_id,
      'tenantId', input_tenant_id,
      'balanceKeys', balance_keys,
      'reversedPostingBatchId', reversal_source_batch_id
    )),
    jsonb_build_object(
      'eventId', inventory_event_id,
      'eventName', inventory_event_name,
      'eventKind', 'domain',
      'eventVersion', 1,
      'aggregateId', created_batch.id,
      'aggregateType', 'stock_posting_batch',
      'occurredAt', now(),
      'sourceModule', 'inventory',
      'correlationId', input_correlation_id,
      'tenantId', input_tenant_id,
      'branchId', input_branch_id,
      'actor', jsonb_build_object('type', 'user', 'userId', public.current_user_id()),
      'schemaVersion', '1.0.0',
      'idempotencyKey', inventory_event_name || ':' || created_batch.id
    ),
    inventory_event_name || ':' || created_batch.id,
    input_correlation_id,
    reversal_source_batch_id,
    public.current_user_id(),
    public.current_user_id()
  )
  on conflict (tenant_id, idempotency_key) do nothing;

  balance_event_id := gen_random_uuid();

  insert into public.event_outbox (
    tenant_id,
    event_id,
    event_name,
    event_version,
    aggregate_id,
    aggregate_type,
    payload,
    metadata,
    idempotency_key,
    correlation_id,
    causation_id,
    created_by,
    updated_by
  )
  values (
    input_tenant_id,
    balance_event_id,
    'inventory.balance_updated',
    1,
    created_batch.id,
    'stock_posting_batch',
    jsonb_build_object(
      'postingBatchId', created_batch.id,
      'documentId', input_document_id,
      'tenantId', input_tenant_id,
      'balanceKeys', balance_keys
    ),
    jsonb_build_object(
      'eventId', balance_event_id,
      'eventName', 'inventory.balance_updated',
      'eventKind', 'domain',
      'eventVersion', 1,
      'aggregateId', created_batch.id,
      'aggregateType', 'stock_posting_batch',
      'occurredAt', now(),
      'sourceModule', 'inventory',
      'correlationId', input_correlation_id,
      'tenantId', input_tenant_id,
      'branchId', input_branch_id,
      'actor', jsonb_build_object('type', 'user', 'userId', public.current_user_id()),
      'schemaVersion', '1.0.0',
      'idempotencyKey', 'inventory.balance_updated:' || created_batch.id
    ),
    'inventory.balance_updated:' || created_batch.id,
    input_correlation_id,
    created_batch.id,
    public.current_user_id(),
    public.current_user_id()
  )
  on conflict (tenant_id, idempotency_key) do nothing;

  return created_batch;
end;
$$;

create trigger stock_ledger_entries_prevent_update before update on public.stock_ledger_entries for each row execute function public.prevent_stock_ledger_entry_mutation();
create trigger stock_ledger_entries_prevent_delete before delete on public.stock_ledger_entries for each row execute function public.prevent_stock_ledger_entry_mutation();

create trigger stock_posting_batches_touch_updated_at before update on public.stock_posting_batches for each row execute function public.touch_platform_row();
create trigger stock_posting_batches_prevent_id_change before update on public.stock_posting_batches for each row execute function public.prevent_id_change();
create trigger stock_posting_batches_prevent_tenant_id_change before update on public.stock_posting_batches for each row execute function public.prevent_tenant_id_change();
create trigger stock_posting_batches_enforce_scope before insert or update on public.stock_posting_batches for each row execute function public.enforce_stock_posting_scope();

create trigger stock_ledger_entries_touch_updated_at before update on public.stock_ledger_entries for each row execute function public.touch_platform_row();
create trigger stock_ledger_entries_prevent_id_change before update on public.stock_ledger_entries for each row execute function public.prevent_id_change();
create trigger stock_ledger_entries_prevent_tenant_id_change before update on public.stock_ledger_entries for each row execute function public.prevent_tenant_id_change();
create trigger stock_ledger_entries_enforce_scope before insert or update on public.stock_ledger_entries for each row execute function public.enforce_stock_posting_scope();

create trigger stock_balances_touch_updated_at before update on public.stock_balances for each row execute function public.touch_platform_row();
create trigger stock_balances_prevent_id_change before update on public.stock_balances for each row execute function public.prevent_id_change();
create trigger stock_balances_prevent_tenant_id_change before update on public.stock_balances for each row execute function public.prevent_tenant_id_change();
create trigger stock_balances_enforce_scope before insert or update on public.stock_balances for each row execute function public.enforce_stock_posting_scope();

create trigger stock_balance_snapshots_touch_updated_at before update on public.stock_balance_snapshots for each row execute function public.touch_platform_row();
create trigger stock_balance_snapshots_prevent_id_change before update on public.stock_balance_snapshots for each row execute function public.prevent_id_change();
create trigger stock_balance_snapshots_prevent_tenant_id_change before update on public.stock_balance_snapshots for each row execute function public.prevent_tenant_id_change();
create trigger stock_balance_snapshots_enforce_scope before insert or update on public.stock_balance_snapshots for each row execute function public.enforce_stock_posting_scope();

create trigger stock_posting_rules_touch_updated_at before update on public.stock_posting_rules for each row execute function public.touch_platform_row();
create trigger stock_posting_rules_prevent_id_change before update on public.stock_posting_rules for each row execute function public.prevent_id_change();
create trigger stock_posting_rules_enforce_scope before insert or update on public.stock_posting_rules for each row execute function public.enforce_stock_posting_scope();

alter table public.stock_ledger_entries enable row level security;
alter table public.stock_posting_batches enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_balance_snapshots enable row level security;
alter table public.stock_posting_rules enable row level security;

alter table public.stock_ledger_entries force row level security;
alter table public.stock_posting_batches force row level security;
alter table public.stock_balances force row level security;
alter table public.stock_balance_snapshots force row level security;
alter table public.stock_posting_rules force row level security;

create policy stock_ledger_entries_select_member_permission on public.stock_ledger_entries for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy stock_ledger_entries_insert_service_permission on public.stock_ledger_entries for insert to authenticated with check (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id));

create policy stock_posting_batches_select_member_permission on public.stock_posting_batches for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy stock_posting_batches_insert_service_permission on public.stock_posting_batches for insert to authenticated with check (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id));
create policy stock_posting_batches_update_service_permission on public.stock_posting_batches for update to authenticated using (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.reverse', tenant_id)) with check (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.reverse', tenant_id));

create policy stock_balances_select_member_permission on public.stock_balances for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy stock_balances_insert_service_permission on public.stock_balances for insert to authenticated with check (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id));
create policy stock_balances_update_service_permission on public.stock_balances for update to authenticated using (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id)) with check (current_setting('app.stock_posting_service', true) = 'on' and is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id));

create policy stock_balance_snapshots_select_member_permission on public.stock_balance_snapshots for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy stock_balance_snapshots_insert_member_permission on public.stock_balance_snapshots for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.snapshot', tenant_id));

create policy stock_posting_rules_select_member_permission on public.stock_posting_rules for select to authenticated using (is_active = true and deleted_at is null and (tenant_id is null or public.is_tenant_member(tenant_id)) and (tenant_id is null or public.has_permission('inventory.stock.view', tenant_id)));
create policy stock_posting_rules_insert_member_permission on public.stock_posting_rules for insert to authenticated with check (is_active = true and deleted_at is null and tenant_id is not null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.manage_rules', tenant_id));
create policy stock_posting_rules_update_member_permission on public.stock_posting_rules for update to authenticated using (is_active = true and deleted_at is null and tenant_id is not null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.manage_rules', tenant_id)) with check (is_active = true and deleted_at is null and tenant_id is not null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.manage_rules', tenant_id));

create policy event_outbox_inventory_stock_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('inventory.stock_posted', 'inventory.stock_reversed', 'inventory.balance_updated') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.view', tenant_id));
create policy event_outbox_inventory_stock_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('inventory.stock_posted', 'inventory.stock_reversed', 'inventory.balance_updated') and public.is_tenant_member(tenant_id) and public.has_permission('inventory.stock.post', tenant_id));

grant execute on function public.post_stock_entries(uuid, uuid, uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.inventory_allow_negative_stock(uuid) to authenticated;

insert into public.stock_posting_rules (movement_type_key, effect, direction, description, metadata)
values
  ('receipt', 'increase_destination', 'in', 'Receipt increases destination stock.', '{"foundation":"sprint9"}'::jsonb),
  ('issue', 'decrease_source', 'out', 'Issue decreases source stock.', '{"foundation":"sprint9"}'::jsonb),
  ('adjustment', 'adjust_signed', 'neutral', 'Adjustment can increase or decrease stock through signed ledger deltas.', '{"foundation":"sprint9"}'::jsonb),
  ('transfer', 'transfer_out_in', 'neutral', 'Transfer foundation creates paired out and in entries; no full transfer workflow is implemented.', '{"foundation":"sprint9","workflow":"not_implemented"}'::jsonb)
on conflict do nothing;

insert into public.app_settings (tenant_id, setting_key, value_type, value, description)
values (null, 'inventory.allow_negative_stock', 'boolean', 'false'::jsonb, 'Sprint 9 placeholder. When false, issue or transfer-out posting cannot make quantity_on_hand negative.')
on conflict do nothing;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.stock.view', 'View Stock Ledger and Balances', 'View Sprint 9 inventory ledger, balance cache, and posting batches.', 'standard'),
  ('inventory.stock.post', 'Post Stock Entries', 'Post stock entries through StockPostingService only.', 'high'),
  ('inventory.stock.reverse', 'Reverse Stock Posting', 'Create reversal entries through StockPostingService reversal foundation.', 'high'),
  ('inventory.stock.snapshot', 'Create Stock Balance Snapshots', 'Create future stock balance snapshot records.', 'high'),
  ('inventory.stock.manage_rules', 'Manage Stock Posting Rules', 'Manage generic stock posting movement rules.', 'high')
on conflict (permission_key) do update
set label = excluded.label,
    description = excluded.description,
    risk_level = excluded.risk_level;
