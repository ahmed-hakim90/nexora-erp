-- Nexora Sprint 11: Purchasing Foundation.
-- No production, sales, accounting, supplier invoice, payment, ledger, or landed cost tables.
-- Purchase receipts prepare inventory transaction integration only; stock is never mutated here.

create type public.purchase_request_status as enum ('draft', 'submitted', 'approved', 'rejected', 'closed', 'cancelled');
create type public.purchase_rfq_status as enum ('draft', 'sent', 'quoted', 'closed', 'cancelled');
create type public.purchase_order_status as enum ('draft', 'submitted', 'approved', 'confirmed', 'partially_received', 'received', 'closed', 'cancelled');
create type public.purchase_receipt_status as enum ('draft', 'submitted', 'posted', 'reversed', 'cancelled');

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  status public.purchase_request_status not null default 'draft',
  title text not null,
  requested_by uuid references auth.users(id),
  needed_by date,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
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
  check (deleted_at is null or deleted_by is not null)
);

create table public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  needed_by date,
  note text,
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

create table public.purchase_rfqs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  purchase_request_id uuid references public.purchase_requests(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  status public.purchase_rfq_status not null default 'draft',
  title text not null,
  rfq_date date not null default current_date,
  response_due_date date,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  sent_at timestamptz,
  sent_by uuid references auth.users(id),
  quoted_at timestamptz,
  quoted_by uuid references auth.users(id),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
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
  check (deleted_at is null or deleted_by is not null)
);

create table public.purchase_rfq_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  purchase_rfq_id uuid not null references public.purchase_rfqs(id) on delete cascade,
  purchase_request_line_id uuid references public.purchase_request_lines(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  quoted_unit_price numeric(18, 6) not null default 0 check (quoted_unit_price >= 0),
  note text,
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

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  purchase_request_id uuid references public.purchase_requests(id) on delete restrict,
  purchase_rfq_id uuid references public.purchase_rfqs(id) on delete restrict,
  status public.purchase_order_status not null default 'draft',
  title text not null,
  order_date date not null default current_date,
  expected_receipt_date date,
  currency_code text not null default 'SAR',
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  received_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
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
  check (length(trim(currency_code)) = 3),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  purchase_request_line_id uuid references public.purchase_request_lines(id) on delete restrict,
  purchase_rfq_line_id uuid references public.purchase_rfq_lines(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  ordered_quantity numeric(18, 6) not null check (ordered_quantity > 0),
  received_quantity numeric(18, 6) not null default 0 check (received_quantity >= 0),
  unit_price numeric(18, 6) not null default 0 check (unit_price >= 0),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (received_quantity <= ordered_quantity),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_document_id uuid not null references public.business_documents(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  inventory_transaction_id uuid references public.inventory_transactions(id) on delete restrict,
  status public.purchase_receipt_status not null default 'draft',
  title text not null,
  receipt_date date not null default current_date,
  destination_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  destination_location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  posted_at timestamptz,
  posted_by uuid references auth.users(id),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
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
  check (deleted_at is null or deleted_by is not null)
);

create table public.purchase_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  purchase_receipt_id uuid not null references public.purchase_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  received_quantity numeric(18, 6) not null check (received_quantity > 0),
  unit_price numeric(18, 6) not null default 0 check (unit_price >= 0),
  note text,
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

create unique index purchase_requests_document_uq on public.purchase_requests (tenant_id, business_document_id) where deleted_at is null;
create unique index purchase_request_lines_number_uq on public.purchase_request_lines (tenant_id, purchase_request_id, line_number) where deleted_at is null;
create unique index purchase_rfqs_document_uq on public.purchase_rfqs (tenant_id, business_document_id) where deleted_at is null;
create unique index purchase_rfq_lines_number_uq on public.purchase_rfq_lines (tenant_id, purchase_rfq_id, line_number) where deleted_at is null;
create unique index purchase_orders_document_uq on public.purchase_orders (tenant_id, business_document_id) where deleted_at is null;
create unique index purchase_order_lines_number_uq on public.purchase_order_lines (tenant_id, purchase_order_id, line_number) where deleted_at is null;
create unique index purchase_receipts_document_uq on public.purchase_receipts (tenant_id, business_document_id) where deleted_at is null;
create unique index purchase_receipt_lines_number_uq on public.purchase_receipt_lines (tenant_id, purchase_receipt_id, line_number) where deleted_at is null;

create index purchase_requests_status_idx on public.purchase_requests (tenant_id, status, created_at desc, id desc) where deleted_at is null;
create index purchase_rfqs_status_idx on public.purchase_rfqs (tenant_id, status, created_at desc, id desc) where deleted_at is null;
create index purchase_orders_status_idx on public.purchase_orders (tenant_id, status, created_at desc, id desc) where deleted_at is null;
create index purchase_receipts_status_idx on public.purchase_receipts (tenant_id, status, created_at desc, id desc) where deleted_at is null;

create or replace function public.prevent_purchase_request_status_regression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'submitted', 'cancelled') then
    raise exception 'draft purchase requests can only remain draft, submit, or cancel';
  end if;
  if old.status = 'submitted' and new.status not in ('submitted', 'approved', 'rejected', 'cancelled') then
    raise exception 'submitted purchase requests can only approve, reject, or cancel';
  end if;
  if old.status in ('approved', 'rejected') and new.status not in (old.status, 'closed', 'cancelled') then
    raise exception 'approved or rejected purchase requests can only close or cancel';
  end if;
  if old.status in ('closed', 'cancelled') then
    raise exception 'closed or cancelled purchase requests are terminal';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_purchase_rfq_status_regression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'sent', 'cancelled') then
    raise exception 'draft RFQs can only remain draft, send, or cancel';
  end if;
  if old.status = 'sent' and new.status not in ('sent', 'quoted', 'closed', 'cancelled') then
    raise exception 'sent RFQs can only be quoted, closed, or cancelled';
  end if;
  if old.status = 'quoted' and new.status not in ('quoted', 'closed', 'cancelled') then
    raise exception 'quoted RFQs can only close or cancel';
  end if;
  if old.status in ('closed', 'cancelled') then
    raise exception 'closed or cancelled RFQs are terminal';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_purchase_order_status_regression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'submitted', 'cancelled') then
    raise exception 'draft purchase orders can only remain draft, submit, or cancel';
  end if;
  if old.status = 'submitted' and new.status not in ('submitted', 'approved', 'cancelled') then
    raise exception 'submitted purchase orders can only approve or cancel';
  end if;
  if old.status = 'approved' and new.status not in ('approved', 'confirmed', 'cancelled') then
    raise exception 'approved purchase orders can only confirm or cancel';
  end if;
  if old.status = 'confirmed' and new.status not in ('confirmed', 'partially_received', 'received', 'closed', 'cancelled') then
    raise exception 'confirmed purchase orders can only receive, close, or cancel';
  end if;
  if old.status = 'partially_received' and new.status not in ('partially_received', 'received', 'closed', 'cancelled') then
    raise exception 'partially received purchase orders can only receive, close, or cancel';
  end if;
  if old.status = 'received' and new.status not in ('received', 'closed') then
    raise exception 'received purchase orders can only close';
  end if;
  if old.status in ('closed', 'cancelled') then
    raise exception 'closed or cancelled purchase orders are terminal';
  end if;
  if old.status in ('confirmed', 'partially_received', 'received') then
    if new.supplier_id is distinct from old.supplier_id
      or new.branch_id is distinct from old.branch_id
      or new.business_document_id is distinct from old.business_document_id
      or new.purchase_request_id is distinct from old.purchase_request_id
      or new.purchase_rfq_id is distinct from old.purchase_rfq_id
      or new.title is distinct from old.title
      or new.order_date is distinct from old.order_date
      or new.expected_receipt_date is distinct from old.expected_receipt_date
      or new.currency_code is distinct from old.currency_code
      or new.deleted_at is distinct from old.deleted_at
      or new.deleted_by is distinct from old.deleted_by
      or new.is_active is distinct from old.is_active then
      raise exception 'confirmed purchase orders cannot be freely edited';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_purchase_receipt_status_regression()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'submitted', 'cancelled') then
    raise exception 'draft purchase receipts can only remain draft, submit, or cancel';
  end if;
  if old.status = 'submitted' and new.status not in ('submitted', 'posted', 'cancelled') then
    raise exception 'submitted purchase receipts can only post or cancel';
  end if;
  if old.status = 'posted' and new.status not in ('posted', 'reversed') then
    raise exception 'posted purchase receipts can only reverse';
  end if;
  if old.status in ('reversed', 'cancelled') then
    raise exception 'reversed or cancelled purchase receipts are terminal';
  end if;
  if old.status = 'posted' then
    if new.purchase_order_id is distinct from old.purchase_order_id
      or new.supplier_id is distinct from old.supplier_id
      or new.business_document_id is distinct from old.business_document_id
      or new.inventory_transaction_id is distinct from old.inventory_transaction_id
      or new.title is distinct from old.title
      or new.destination_warehouse_id is distinct from old.destination_warehouse_id
      or new.destination_location_id is distinct from old.destination_location_id
      or new.receipt_date is distinct from old.receipt_date
      or new.deleted_at is distinct from old.deleted_at
      or new.deleted_by is distinct from old.deleted_by
      or new.is_active is distinct from old.is_active then
      raise exception 'posted purchase receipts cannot be freely edited';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_purchase_line_edit_after_locked_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_status text;
begin
  if tg_table_name = 'purchase_request_lines' then
    select status::text into parent_status from public.purchase_requests where id = coalesce(new.purchase_request_id, old.purchase_request_id);
    if parent_status not in ('draft') then raise exception 'purchase request lines can only be changed while draft'; end if;
  elsif tg_table_name = 'purchase_rfq_lines' then
    select status::text into parent_status from public.purchase_rfqs where id = coalesce(new.purchase_rfq_id, old.purchase_rfq_id);
    if parent_status not in ('draft') then raise exception 'RFQ lines can only be changed while draft'; end if;
  elsif tg_table_name = 'purchase_order_lines' then
    select status::text into parent_status from public.purchase_orders where id = coalesce(new.purchase_order_id, old.purchase_order_id);
    if parent_status not in ('draft') then
      if tg_op = 'UPDATE'
        and current_setting('app.purchasing_receipt_service', true) = 'on'
        and new.tenant_id is not distinct from old.tenant_id
        and new.branch_id is not distinct from old.branch_id
        and new.purchase_order_id is not distinct from old.purchase_order_id
        and new.line_number is not distinct from old.line_number
        and new.product_id is not distinct from old.product_id
        and new.unit_id is not distinct from old.unit_id
        and new.ordered_quantity is not distinct from old.ordered_quantity
        and new.unit_price is not distinct from old.unit_price
        and new.note is not distinct from old.note
        and new.metadata is not distinct from old.metadata
        and new.deleted_at is not distinct from old.deleted_at
        and new.deleted_by is not distinct from old.deleted_by
        and new.is_active is not distinct from old.is_active then
        return new;
      end if;
      raise exception 'purchase order lines can only be changed while draft, except guarded receipt quantity updates';
    end if;
  elsif tg_table_name = 'purchase_receipt_lines' then
    select status::text into parent_status from public.purchase_receipts where id = coalesce(new.purchase_receipt_id, old.purchase_receipt_id);
    if parent_status not in ('draft') then raise exception 'purchase receipt lines can only be changed while draft'; end if;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.assert_purchase_line_product_is_purchasable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.products p
    where p.id = new.product_id
      and p.tenant_id = new.tenant_id
      and p.is_purchasable = true
      and p.is_active = true
      and p.deleted_at is null
  ) then
    raise exception 'purchase document product must be active and purchasable';
  end if;
  return new;
end;
$$;

create or replace function public.assert_purchase_reference_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if not exists (select 1 from public.branches b where b.id = new.branch_id and b.tenant_id = new.tenant_id and b.is_active = true and b.deleted_at is null) then
    raise exception 'purchase document branch must belong to the tenant';
  end if;

  if tg_table_name in ('purchase_rfqs', 'purchase_orders', 'purchase_receipts') and new.supplier_id is not null then
    if not exists (select 1 from public.suppliers s where s.id = new.supplier_id and s.tenant_id = new.tenant_id and s.is_active = true and s.deleted_at is null) then
      raise exception 'purchase document supplier must belong to the tenant';
    end if;
  end if;

  if tg_table_name = 'purchase_receipts' then
    select id, tenant_id, branch_id, supplier_id, status into parent_record
    from public.purchase_orders
    where id = new.purchase_order_id and deleted_at is null;

    if parent_record.id is null
      or parent_record.tenant_id <> new.tenant_id
      or parent_record.branch_id <> new.branch_id
      or parent_record.supplier_id <> new.supplier_id
      or parent_record.status not in ('confirmed', 'partially_received', 'received') then
      raise exception 'purchase receipt must reference a matching receivable purchase order';
    end if;

    if not exists (
      select 1
      from public.warehouses w
      where w.id = new.destination_warehouse_id
        and w.tenant_id = new.tenant_id
        and w.branch_id = new.branch_id
        and w.is_active = true
        and w.deleted_at is null
    ) then
      raise exception 'purchase receipt warehouse must belong to the tenant and branch';
    end if;

    if not exists (
      select 1
      from public.warehouse_locations l
      where l.id = new.destination_location_id
        and l.tenant_id = new.tenant_id
        and l.branch_id = new.branch_id
        and l.warehouse_id = new.destination_warehouse_id
        and l.is_active = true
        and l.deleted_at is null
    ) then
      raise exception 'purchase receipt location must belong to the warehouse and branch';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.assert_purchase_line_reference_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
  order_line_record record;
begin
  if not exists (select 1 from public.units u where u.id = new.unit_id and u.tenant_id = new.tenant_id and u.is_active = true and u.deleted_at is null) then
    raise exception 'purchase document unit must belong to the tenant';
  end if;

  if tg_table_name = 'purchase_request_lines' then
    select tenant_id, branch_id into parent_record from public.purchase_requests where id = new.purchase_request_id and deleted_at is null;
  elsif tg_table_name = 'purchase_rfq_lines' then
    select tenant_id, branch_id into parent_record from public.purchase_rfqs where id = new.purchase_rfq_id and deleted_at is null;
  elsif tg_table_name = 'purchase_order_lines' then
    select tenant_id, branch_id into parent_record from public.purchase_orders where id = new.purchase_order_id and deleted_at is null;
  elsif tg_table_name = 'purchase_receipt_lines' then
    select tenant_id, branch_id, purchase_order_id into parent_record from public.purchase_receipts where id = new.purchase_receipt_id and deleted_at is null;
  end if;

  if parent_record.tenant_id <> new.tenant_id or parent_record.branch_id <> new.branch_id then
    raise exception 'purchase document line must match parent tenant and branch';
  end if;

  if tg_table_name = 'purchase_receipt_lines' then
    select id, product_id, unit_id, ordered_quantity, received_quantity into order_line_record
    from public.purchase_order_lines
    where id = new.purchase_order_line_id
      and tenant_id = new.tenant_id
      and purchase_order_id = parent_record.purchase_order_id
      and deleted_at is null;

    if order_line_record.id is null
      or order_line_record.product_id <> new.product_id
      or order_line_record.unit_id <> new.unit_id
      or new.received_quantity > (order_line_record.ordered_quantity - order_line_record.received_quantity) then
      raise exception 'purchase receipt line must match order line and remaining quantity';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.derive_purchase_order_receipt_status(input_order_id uuid, input_tenant_id uuid)
returns public.purchase_order_status
language plpgsql
set search_path = public
as $$
declare
  total_lines integer;
  received_lines integer;
  partial_lines integer;
begin
  select count(*),
         count(*) filter (where received_quantity >= ordered_quantity),
         count(*) filter (where received_quantity > 0)
  into total_lines, received_lines, partial_lines
  from public.purchase_order_lines
  where tenant_id = input_tenant_id
    and purchase_order_id = input_order_id
    and deleted_at is null;

  if total_lines > 0 and received_lines = total_lines then
    return 'received';
  end if;

  if partial_lines > 0 then
    return 'partially_received';
  end if;

  return 'confirmed';
end;
$$;

create or replace function public.apply_purchase_receipt_to_order(input_tenant_id uuid, input_receipt_id uuid)
returns public.purchase_order_status
language plpgsql
security invoker
set search_path = public
as $$
declare
  receipt_record public.purchase_receipts%rowtype;
  next_status public.purchase_order_status;
  service_guard text;
begin
  if not public.is_tenant_member(input_tenant_id) then
    raise exception 'tenant membership is required to apply purchase receipt';
  end if;

  if not public.has_permission('purchasing.receipt.post', input_tenant_id) then
    raise exception 'purchase receipt posting permission is required';
  end if;

  select * into receipt_record
  from public.purchase_receipts
  where id = input_receipt_id
    and tenant_id = input_tenant_id
    and status = 'submitted'
    and deleted_at is null
  for update;

  if receipt_record.id is null then
    raise exception 'submitted purchase receipt was not found';
  end if;

  if receipt_record.inventory_transaction_id is null then
    raise exception 'purchase receipt must be linked to an inventory transaction before applying quantities';
  end if;

  if receipt_record.metadata ->> 'orderQuantitiesApplied' = 'true' then
    return public.derive_purchase_order_receipt_status(receipt_record.purchase_order_id, input_tenant_id);
  end if;

  if exists (
    select 1
    from public.purchase_receipt_lines rl
    join public.purchase_order_lines ol on ol.id = rl.purchase_order_line_id
    where rl.purchase_receipt_id = receipt_record.id
      and rl.tenant_id = input_tenant_id
      and rl.deleted_at is null
      and (
        ol.tenant_id <> rl.tenant_id
        or ol.purchase_order_id <> receipt_record.purchase_order_id
        or ol.product_id <> rl.product_id
        or ol.unit_id <> rl.unit_id
        or ol.deleted_at is not null
        or rl.received_quantity > (ol.ordered_quantity - ol.received_quantity)
      )
  ) then
    raise exception 'purchase receipt lines do not match remaining order quantities';
  end if;

  service_guard := set_config('app.purchasing_receipt_service', 'on', true);

  update public.purchase_order_lines ol
  set received_quantity = ol.received_quantity + rollup.received_quantity,
      updated_by = public.current_user_id()
  from (
    select purchase_order_line_id, sum(received_quantity) as received_quantity
    from public.purchase_receipt_lines
    where tenant_id = input_tenant_id
      and purchase_receipt_id = receipt_record.id
      and deleted_at is null
    group by purchase_order_line_id
  ) rollup
  where ol.id = rollup.purchase_order_line_id
    and ol.tenant_id = input_tenant_id
    and ol.purchase_order_id = receipt_record.purchase_order_id;

  next_status := public.derive_purchase_order_receipt_status(receipt_record.purchase_order_id, input_tenant_id);

  update public.purchase_orders
  set status = next_status,
      received_at = case when next_status = 'received' then now() else received_at end,
      updated_by = public.current_user_id()
  where id = receipt_record.purchase_order_id
    and tenant_id = input_tenant_id
    and deleted_at is null;

  update public.purchase_receipts
  set metadata = receipt_record.metadata || '{"orderQuantitiesApplied": true}'::jsonb,
      updated_by = public.current_user_id()
  where id = receipt_record.id
    and tenant_id = input_tenant_id;

  return next_status;
end;
$$;

create or replace function public.reverse_purchase_receipt_from_order(input_tenant_id uuid, input_receipt_id uuid)
returns public.purchase_order_status
language plpgsql
security invoker
set search_path = public
as $$
declare
  receipt_record public.purchase_receipts%rowtype;
  next_status public.purchase_order_status;
  service_guard text;
begin
  if not public.is_tenant_member(input_tenant_id) then
    raise exception 'tenant membership is required to reverse purchase receipt quantities';
  end if;

  if not public.has_permission('purchasing.receipt.post', input_tenant_id) then
    raise exception 'purchase receipt posting permission is required';
  end if;

  select * into receipt_record
  from public.purchase_receipts
  where id = input_receipt_id
    and tenant_id = input_tenant_id
    and status = 'posted'
    and deleted_at is null
  for update;

  if receipt_record.id is null then
    raise exception 'posted purchase receipt was not found';
  end if;

  if receipt_record.metadata ->> 'orderQuantitiesReversed' = 'true' then
    return public.derive_purchase_order_receipt_status(receipt_record.purchase_order_id, input_tenant_id);
  end if;

  service_guard := set_config('app.purchasing_receipt_service', 'on', true);

  update public.purchase_order_lines ol
  set received_quantity = ol.received_quantity - rollup.received_quantity,
      updated_by = public.current_user_id()
  from (
    select purchase_order_line_id, sum(received_quantity) as received_quantity
    from public.purchase_receipt_lines
    where tenant_id = input_tenant_id
      and purchase_receipt_id = receipt_record.id
      and deleted_at is null
    group by purchase_order_line_id
  ) rollup
  where ol.id = rollup.purchase_order_line_id
    and ol.tenant_id = input_tenant_id
    and ol.purchase_order_id = receipt_record.purchase_order_id;

  if exists (
    select 1
    from public.purchase_order_lines
    where tenant_id = input_tenant_id
      and purchase_order_id = receipt_record.purchase_order_id
      and received_quantity < 0
      and deleted_at is null
  ) then
    raise exception 'purchase receipt reversal would create negative received quantity';
  end if;

  next_status := public.derive_purchase_order_receipt_status(receipt_record.purchase_order_id, input_tenant_id);

  update public.purchase_orders
  set status = next_status,
      received_at = case when next_status = 'received' then received_at else null end,
      updated_by = public.current_user_id()
  where id = receipt_record.purchase_order_id
    and tenant_id = input_tenant_id
    and deleted_at is null;

  update public.purchase_receipts
  set metadata = receipt_record.metadata || '{"orderQuantitiesReversed": true}'::jsonb,
      updated_by = public.current_user_id()
  where id = receipt_record.id
    and tenant_id = input_tenant_id;

  return next_status;
end;
$$;

create trigger purchase_requests_touch_updated_at before update on public.purchase_requests for each row execute function public.touch_platform_row();
create trigger purchase_requests_prevent_id_change before update on public.purchase_requests for each row execute function public.prevent_id_change();
create trigger purchase_requests_prevent_tenant_id_change before update on public.purchase_requests for each row execute function public.prevent_tenant_id_change();
create trigger purchase_requests_prevent_status_regression before update on public.purchase_requests for each row execute function public.prevent_purchase_request_status_regression();
create trigger purchase_requests_assert_reference_scope before insert or update on public.purchase_requests for each row execute function public.assert_purchase_reference_scope();
create trigger purchase_request_lines_touch_updated_at before update on public.purchase_request_lines for each row execute function public.touch_platform_row();
create trigger purchase_request_lines_prevent_id_change before update on public.purchase_request_lines for each row execute function public.prevent_id_change();
create trigger purchase_request_lines_prevent_tenant_id_change before update on public.purchase_request_lines for each row execute function public.prevent_tenant_id_change();
create trigger purchase_request_lines_prevent_locked_edit before insert or update or delete on public.purchase_request_lines for each row execute function public.prevent_purchase_line_edit_after_locked_status();
create trigger purchase_request_lines_assert_purchasable before insert or update on public.purchase_request_lines for each row execute function public.assert_purchase_line_product_is_purchasable();
create trigger purchase_request_lines_assert_reference_scope before insert or update on public.purchase_request_lines for each row execute function public.assert_purchase_line_reference_scope();

create trigger purchase_rfqs_touch_updated_at before update on public.purchase_rfqs for each row execute function public.touch_platform_row();
create trigger purchase_rfqs_prevent_id_change before update on public.purchase_rfqs for each row execute function public.prevent_id_change();
create trigger purchase_rfqs_prevent_tenant_id_change before update on public.purchase_rfqs for each row execute function public.prevent_tenant_id_change();
create trigger purchase_rfqs_prevent_status_regression before update on public.purchase_rfqs for each row execute function public.prevent_purchase_rfq_status_regression();
create trigger purchase_rfqs_assert_reference_scope before insert or update on public.purchase_rfqs for each row execute function public.assert_purchase_reference_scope();
create trigger purchase_rfq_lines_touch_updated_at before update on public.purchase_rfq_lines for each row execute function public.touch_platform_row();
create trigger purchase_rfq_lines_prevent_id_change before update on public.purchase_rfq_lines for each row execute function public.prevent_id_change();
create trigger purchase_rfq_lines_prevent_tenant_id_change before update on public.purchase_rfq_lines for each row execute function public.prevent_tenant_id_change();
create trigger purchase_rfq_lines_prevent_locked_edit before insert or update or delete on public.purchase_rfq_lines for each row execute function public.prevent_purchase_line_edit_after_locked_status();
create trigger purchase_rfq_lines_assert_purchasable before insert or update on public.purchase_rfq_lines for each row execute function public.assert_purchase_line_product_is_purchasable();
create trigger purchase_rfq_lines_assert_reference_scope before insert or update on public.purchase_rfq_lines for each row execute function public.assert_purchase_line_reference_scope();

create trigger purchase_orders_touch_updated_at before update on public.purchase_orders for each row execute function public.touch_platform_row();
create trigger purchase_orders_prevent_id_change before update on public.purchase_orders for each row execute function public.prevent_id_change();
create trigger purchase_orders_prevent_tenant_id_change before update on public.purchase_orders for each row execute function public.prevent_tenant_id_change();
create trigger purchase_orders_prevent_status_regression before update on public.purchase_orders for each row execute function public.prevent_purchase_order_status_regression();
create trigger purchase_orders_assert_reference_scope before insert or update on public.purchase_orders for each row execute function public.assert_purchase_reference_scope();
create trigger purchase_order_lines_touch_updated_at before update on public.purchase_order_lines for each row execute function public.touch_platform_row();
create trigger purchase_order_lines_prevent_id_change before update on public.purchase_order_lines for each row execute function public.prevent_id_change();
create trigger purchase_order_lines_prevent_tenant_id_change before update on public.purchase_order_lines for each row execute function public.prevent_tenant_id_change();
create trigger purchase_order_lines_prevent_locked_edit before insert or update or delete on public.purchase_order_lines for each row execute function public.prevent_purchase_line_edit_after_locked_status();
create trigger purchase_order_lines_assert_purchasable before insert or update on public.purchase_order_lines for each row execute function public.assert_purchase_line_product_is_purchasable();
create trigger purchase_order_lines_assert_reference_scope before insert or update on public.purchase_order_lines for each row execute function public.assert_purchase_line_reference_scope();

create trigger purchase_receipts_touch_updated_at before update on public.purchase_receipts for each row execute function public.touch_platform_row();
create trigger purchase_receipts_prevent_id_change before update on public.purchase_receipts for each row execute function public.prevent_id_change();
create trigger purchase_receipts_prevent_tenant_id_change before update on public.purchase_receipts for each row execute function public.prevent_tenant_id_change();
create trigger purchase_receipts_prevent_status_regression before update on public.purchase_receipts for each row execute function public.prevent_purchase_receipt_status_regression();
create trigger purchase_receipts_assert_reference_scope before insert or update on public.purchase_receipts for each row execute function public.assert_purchase_reference_scope();
create trigger purchase_receipt_lines_touch_updated_at before update on public.purchase_receipt_lines for each row execute function public.touch_platform_row();
create trigger purchase_receipt_lines_prevent_id_change before update on public.purchase_receipt_lines for each row execute function public.prevent_id_change();
create trigger purchase_receipt_lines_prevent_tenant_id_change before update on public.purchase_receipt_lines for each row execute function public.prevent_tenant_id_change();
create trigger purchase_receipt_lines_prevent_locked_edit before insert or update or delete on public.purchase_receipt_lines for each row execute function public.prevent_purchase_line_edit_after_locked_status();
create trigger purchase_receipt_lines_assert_purchasable before insert or update on public.purchase_receipt_lines for each row execute function public.assert_purchase_line_product_is_purchasable();
create trigger purchase_receipt_lines_assert_reference_scope before insert or update on public.purchase_receipt_lines for each row execute function public.assert_purchase_line_reference_scope();

alter table public.purchase_requests enable row level security;
alter table public.purchase_request_lines enable row level security;
alter table public.purchase_rfqs enable row level security;
alter table public.purchase_rfq_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_lines enable row level security;

alter table public.purchase_requests force row level security;
alter table public.purchase_request_lines force row level security;
alter table public.purchase_rfqs force row level security;
alter table public.purchase_rfq_lines force row level security;
alter table public.purchase_orders force row level security;
alter table public.purchase_order_lines force row level security;
alter table public.purchase_receipts force row level security;
alter table public.purchase_receipt_lines force row level security;

create policy purchase_requests_select on public.purchase_requests for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_requests_insert on public.purchase_requests for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.request.create', tenant_id));
create policy purchase_requests_update on public.purchase_requests for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'submitted', 'approved', 'rejected') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.request.create', tenant_id) or public.has_permission('purchasing.request.approve', tenant_id) or public.has_permission('purchasing.cancel', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.request.create', tenant_id) or public.has_permission('purchasing.request.approve', tenant_id) or public.has_permission('purchasing.cancel', tenant_id)));

create policy purchase_request_lines_select on public.purchase_request_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_request_lines_insert on public.purchase_request_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.request.create', tenant_id));
create policy purchase_request_lines_update on public.purchase_request_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.request.create', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.request.create', tenant_id));

create policy purchase_rfqs_select on public.purchase_rfqs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_rfqs_insert on public.purchase_rfqs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.rfq.manage', tenant_id));
create policy purchase_rfqs_update on public.purchase_rfqs for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'sent', 'quoted') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.rfq.manage', tenant_id) or public.has_permission('purchasing.cancel', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.rfq.manage', tenant_id) or public.has_permission('purchasing.cancel', tenant_id)));

create policy purchase_rfq_lines_select on public.purchase_rfq_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_rfq_lines_insert on public.purchase_rfq_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.rfq.manage', tenant_id));
create policy purchase_rfq_lines_update on public.purchase_rfq_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.rfq.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.rfq.manage', tenant_id));

create policy purchase_orders_select on public.purchase_orders for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_orders_insert on public.purchase_orders for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.order.create', tenant_id));
create policy purchase_orders_update on public.purchase_orders for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'submitted', 'approved', 'confirmed', 'partially_received', 'received') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.order.create', tenant_id) or public.has_permission('purchasing.order.approve', tenant_id) or public.has_permission('purchasing.order.confirm', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id) or public.has_permission('purchasing.cancel', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.order.create', tenant_id) or public.has_permission('purchasing.order.approve', tenant_id) or public.has_permission('purchasing.order.confirm', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id) or public.has_permission('purchasing.cancel', tenant_id)));

create policy purchase_order_lines_select on public.purchase_order_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_order_lines_insert on public.purchase_order_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.order.create', tenant_id));
create policy purchase_order_lines_update on public.purchase_order_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.order.create', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.order.create', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id)));

create policy purchase_receipts_select on public.purchase_receipts for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_receipts_insert on public.purchase_receipts for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.receipt.create', tenant_id));
create policy purchase_receipts_update on public.purchase_receipts for update to authenticated using (is_active = true and deleted_at is null and status in ('draft', 'submitted', 'posted') and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.receipt.create', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id) or public.has_permission('purchasing.cancel', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('purchasing.receipt.create', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id) or public.has_permission('purchasing.cancel', tenant_id)));

create policy purchase_receipt_lines_select on public.purchase_receipt_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.view', tenant_id));
create policy purchase_receipt_lines_insert on public.purchase_receipt_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.receipt.create', tenant_id));
create policy purchase_receipt_lines_update on public.purchase_receipt_lines for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.receipt.create', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('purchasing.receipt.create', tenant_id));

create policy event_outbox_purchasing_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('purchasing.request.created', 'purchasing.request.approved', 'purchasing.rfq.sent', 'purchasing.order.confirmed', 'purchasing.order.partially_received', 'purchasing.order.received', 'purchasing.receipt.posted') and public.is_tenant_member(tenant_id) and public.has_permission('purchasing.view', tenant_id));
create policy event_outbox_purchasing_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('purchasing.request.created', 'purchasing.request.approved', 'purchasing.rfq.sent', 'purchasing.order.confirmed', 'purchasing.order.partially_received', 'purchasing.order.received', 'purchasing.receipt.posted') and public.is_tenant_member(tenant_id) and (public.has_permission('purchasing.request.create', tenant_id) or public.has_permission('purchasing.request.approve', tenant_id) or public.has_permission('purchasing.rfq.manage', tenant_id) or public.has_permission('purchasing.order.confirm', tenant_id) or public.has_permission('purchasing.receipt.post', tenant_id)));

grant execute on function public.apply_purchase_receipt_to_order(uuid, uuid) to authenticated;
grant execute on function public.reverse_purchase_receipt_from_order(uuid, uuid) to authenticated;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('purchasing.view', 'View Purchasing', 'View purchasing foundation documents.', 'standard'),
  ('purchasing.request.create', 'Create Purchase Requests', 'Create and submit purchase requests.', 'standard'),
  ('purchasing.request.approve', 'Approve Purchase Requests', 'Approve or reject submitted purchase requests.', 'high'),
  ('purchasing.rfq.manage', 'Manage RFQs', 'Create, send, quote, close, and cancel RFQs.', 'standard'),
  ('purchasing.order.create', 'Create Purchase Orders', 'Create and submit purchase orders.', 'standard'),
  ('purchasing.order.approve', 'Approve Purchase Orders', 'Approve submitted purchase orders.', 'high'),
  ('purchasing.order.confirm', 'Confirm Purchase Orders', 'Confirm approved purchase orders.', 'high'),
  ('purchasing.receipt.create', 'Create Purchase Receipts', 'Create and submit purchase receipt documents.', 'standard'),
  ('purchasing.receipt.post', 'Post Purchase Receipts', 'Post purchase receipts through public inventory services only.', 'high'),
  ('purchasing.cancel', 'Cancel Purchasing Documents', 'Cancel eligible purchasing documents.', 'high')
on conflict (permission_key) do update
set label = excluded.label,
    description = excluded.description,
    risk_level = excluded.risk_level;
