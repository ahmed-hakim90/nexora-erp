-- Inventory Foundation Sprint 5: Serial Engine foundation.
-- Serial identity, policy, uniqueness, verification, and traceability metadata only.
-- No stock movements, ledger, generation runtime, QR signing, warranty, or service runtime.

alter table public.inventory_serial_numbers rename column serial_key to serial_number;

alter table public.inventory_serial_numbers
  add column if not exists serial_source text not null default 'manual',
  add column if not exists generation_method text not null default 'manual_entry',
  add column if not exists lifecycle_state text not null default 'draft',
  add column if not exists serial_status text not null default 'active',
  add column if not exists verification_status text not null default 'not_required',
  add column if not exists verification_token_hash text,
  add column if not exists qr_payload jsonb not null default '{}'::jsonb,
  add column if not exists barcode text,
  add column if not exists current_handling_unit_id uuid references public.inventory_handling_units(id) on delete restrict,
  add column if not exists current_warehouse_id uuid references public.inventory_warehouses(id) on delete restrict,
  add column if not exists current_location_id uuid references public.inventory_locations(id) on delete restrict,
  add column if not exists current_custodian jsonb not null default '{}'::jsonb,
  add column if not exists warranty_ready boolean not null default false,
  add column if not exists service_ready boolean not null default false,
  add column if not exists traceability_ready boolean not null default true,
  add column if not exists notes text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists policy_id uuid,
  add column if not exists sold_document_reference text,
  add column if not exists service_case_reference text,
  add column if not exists first_activation_ready boolean not null default false;

update public.inventory_serial_numbers
set
  serial_number = upper(trim(serial_number)),
  barcode = coalesce(barcode, upper(trim(serial_number))),
  serial_source = coalesce(serial_source, 'manual'),
  generation_method = coalesce(generation_method, 'manual_entry'),
  lifecycle_state = coalesce(lifecycle_state, 'draft'),
  serial_status = coalesce(serial_status, 'active'),
  verification_status = coalesce(verification_status, 'not_required'),
  qr_payload = coalesce(qr_payload, '{}'::jsonb),
  current_custodian = coalesce(current_custodian, '{}'::jsonb),
  source_metadata = coalesce(source_metadata, '{}'::jsonb),
  traceability_ready = coalesce(traceability_ready, true)
where deleted_at is null;

alter table public.inventory_serial_numbers alter column barcode set not null;

create table public.inventory_serial_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_id uuid references public.inventory_products(id) on delete restrict,
  policy_code text not null,
  pattern text not null,
  prefix text,
  digits integer not null default 6 check (digits > 0),
  reset_scope text not null default 'company' check (reset_scope in ('global', 'company', 'branch', 'product', 'lot')),
  start_number bigint not null default 1 check (start_number > 0),
  allow_manual_override boolean not null default false,
  duplicate_validation boolean not null default true,
  generation_timing text not null default 'manual' check (generation_timing in ('on_receipt', 'on_production_completion', 'on_packing', 'manual')),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (policy_code = upper(policy_code)),
  check (length(trim(pattern)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_serial_sequence_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  policy_id uuid not null references public.inventory_serial_policies(id) on delete restrict,
  sequence_key text not null,
  current_number bigint not null default 0 check (current_number >= 0),
  reserved_from bigint not null check (reserved_from > 0),
  reserved_to bigint not null check (reserved_to >= reserved_from),
  reserved_by uuid references auth.users(id),
  reservation_status text not null default 'pending' check (reservation_status in ('pending', 'reserved', 'consumed', 'expired', 'cancelled')),
  expires_at timestamptz,
  idempotency_key text not null,
  correlation_id text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(sequence_key)) > 0),
  check (length(trim(idempotency_key)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.inventory_serial_numbers
  add constraint inventory_serial_numbers_serial_source_chk
    check (serial_source in ('nexora_generated', 'supplier', 'manual', 'imported')),
  add constraint inventory_serial_numbers_generation_method_chk
    check (generation_method in ('policy_range', 'manual_entry', 'supplier_import', 'bulk_import')),
  add constraint inventory_serial_numbers_lifecycle_state_chk
    check (lifecycle_state in ('draft', 'generated', 'imported', 'packed', 'available', 'reserved', 'picked', 'shipped', 'sold', 'returned', 'service', 'repaired', 'scrapped', 'revoked', 'archived')),
  add constraint inventory_serial_numbers_serial_status_chk
    check (serial_status in ('active', 'blocked', 'damaged', 'missing', 'duplicate_suspected', 'counterfeit_suspected', 'archived')),
  add constraint inventory_serial_numbers_verification_status_chk
    check (verification_status in ('not_required', 'pending', 'valid', 'invalid', 'suspected_duplicate', 'revoked')),
  add constraint inventory_serial_numbers_qr_payload_object_chk
    check (jsonb_typeof(qr_payload) = 'object'),
  add constraint inventory_serial_numbers_current_custodian_object_chk
    check (jsonb_typeof(current_custodian) = 'object'),
  add constraint inventory_serial_numbers_source_metadata_object_chk
    check (jsonb_typeof(source_metadata) = 'object'),
  add constraint inventory_serial_numbers_supplier_source_chk
    check (serial_source <> 'supplier' or jsonb_typeof(source_metadata) = 'object'),
  add constraint inventory_serial_numbers_imported_source_chk
    check (serial_source <> 'imported' or jsonb_typeof(source_metadata) = 'object'),
  add constraint inventory_serial_numbers_manual_source_chk
    check (serial_source <> 'manual' or jsonb_typeof(source_metadata) = 'object');

alter table public.inventory_serial_numbers
  add constraint inventory_serial_numbers_policy_fk
    foreign key (policy_id) references public.inventory_serial_policies(id) on delete restrict;

drop index if exists inventory_serial_numbers_scope_key_uq;
create unique index inventory_serial_numbers_scope_number_uq
  on public.inventory_serial_numbers (tenant_id, company_id, serial_number)
  where deleted_at is null;
create unique index inventory_serial_numbers_scope_barcode_uq
  on public.inventory_serial_numbers (tenant_id, company_id, barcode)
  where deleted_at is null;
create unique index inventory_serial_numbers_current_hu_uq
  on public.inventory_serial_numbers (tenant_id, company_id, current_handling_unit_id)
  where deleted_at is null and current_handling_unit_id is not null;

create unique index inventory_serial_policies_scope_code_uq
  on public.inventory_serial_policies (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), policy_code)
  where deleted_at is null;
create unique index inventory_serial_sequence_reservations_idempotency_uq
  on public.inventory_serial_sequence_reservations (tenant_id, company_id, idempotency_key)
  where deleted_at is null and reservation_status not in ('cancelled', 'expired');
create index inventory_serial_numbers_traceability_idx
  on public.inventory_serial_numbers (tenant_id, company_id, product_id, lot_id, lifecycle_state, serial_status, verification_status)
  where deleted_at is null;

create or replace function public.enforce_inventory_serial_engine_architecture()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if tg_table_name = 'inventory_serial_numbers' then
    select tenant_id, company_id, branch_id, product_id, product_variant_id into parent_record
    from public.inventory_products
    where id = new.product_id and deleted_at is null;
    if parent_record.tenant_id is null then
      raise exception 'inventory serial product must exist';
    end if;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
      raise exception 'inventory serial product scope must match serial scope';
    end if;

    if new.lot_id is not null then
      select tenant_id, company_id, product_id, product_variant_id into parent_record
      from public.inventory_lots
      where id = new.lot_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
        raise exception 'inventory serial lot scope must match serial scope';
      end if;
      if parent_record.product_id <> new.product_id then
        raise exception 'inventory serial lot must belong to the same product';
      end if;
      if new.product_variant_id is not null and parent_record.product_variant_id is not null and parent_record.product_variant_id <> new.product_variant_id then
        raise exception 'inventory serial lot variant must match serial variant';
      end if;
    end if;

    if new.current_handling_unit_id is not null then
      select tenant_id, company_id, branch_id into parent_record
      from public.inventory_handling_units
      where id = new.current_handling_unit_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
        raise exception 'inventory serial current handling unit scope must match serial scope';
      end if;
    end if;

    if new.current_warehouse_id is not null then
      select tenant_id, company_id, branch_id into parent_record
      from public.inventory_warehouses
      where id = new.current_warehouse_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
        raise exception 'inventory serial current warehouse scope must match serial scope';
      end if;
    end if;

    if new.current_location_id is not null then
      select tenant_id, company_id, branch_id, warehouse_id into parent_record
      from public.inventory_locations
      where id = new.current_location_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
        raise exception 'inventory serial current location scope must match serial scope';
      end if;
      if new.current_warehouse_id is not null and parent_record.warehouse_id <> new.current_warehouse_id then
        raise exception 'inventory serial current location must belong to the current warehouse';
      end if;
    end if;
  elsif tg_table_name = 'inventory_serial_sequence_reservations' then
    select tenant_id, company_id, branch_id into parent_record
    from public.inventory_serial_policies
    where id = new.policy_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id then
      raise exception 'inventory serial sequence reservation policy scope must match reservation scope';
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_serial_numbers_engine_scope
  before insert or update on public.inventory_serial_numbers
  for each row execute function public.enforce_inventory_serial_engine_architecture();
create trigger inventory_serial_policies_scope
  before insert or update on public.inventory_serial_policies
  for each row execute function public.enforce_inventory_foundation_scope();
create trigger inventory_serial_sequence_reservations_scope
  before insert or update on public.inventory_serial_sequence_reservations
  for each row execute function public.enforce_inventory_serial_engine_architecture();

create trigger inventory_serial_policies_touch before update on public.inventory_serial_policies for each row execute function public.touch_platform_row();
create trigger inventory_serial_sequence_reservations_touch before update on public.inventory_serial_sequence_reservations for each row execute function public.touch_platform_row();

create trigger inventory_serial_policies_prevent_id before update on public.inventory_serial_policies for each row execute function public.prevent_id_change();
create trigger inventory_serial_sequence_reservations_prevent_id before update on public.inventory_serial_sequence_reservations for each row execute function public.prevent_id_change();
create trigger inventory_serial_policies_prevent_tenant before update on public.inventory_serial_policies for each row execute function public.prevent_tenant_id_change();
create trigger inventory_serial_sequence_reservations_prevent_tenant before update on public.inventory_serial_sequence_reservations for each row execute function public.prevent_tenant_id_change();

alter table public.inventory_serial_policies enable row level security;
alter table public.inventory_serial_sequence_reservations enable row level security;
alter table public.inventory_serial_policies force row level security;
alter table public.inventory_serial_sequence_reservations force row level security;

create policy inventory_serial_policies_select on public.inventory_serial_policies for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.view', tenant_id));
create policy inventory_serial_policies_write on public.inventory_serial_policies for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id));
create policy inventory_serial_sequence_reservations_select on public.inventory_serial_sequence_reservations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.view', tenant_id));
create policy inventory_serial_sequence_reservations_write on public.inventory_serial_sequence_reservations for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('inventory.serials.manage', tenant_id));

comment on table public.inventory_serial_numbers is 'Serial Engine identity records. No quantity, movement, ledger, generation runtime, or warranty/service runtime.';
comment on table public.inventory_serial_policies is 'Serial Engine policy definitions. Validation helpers only; no generation runtime.';
comment on table public.inventory_serial_sequence_reservations is 'Serial range reservation readiness. Transactional generation deferred to later runtime.';
comment on column public.inventory_serial_numbers.serial_number is 'Unique physical unit identity such as AF260000001 or SUP-MTR-99881.';
comment on column public.inventory_serial_numbers.verification_token_hash is 'Anti-counterfeit readiness metadata. No QR signing runtime.';
comment on column public.inventory_serial_sequence_reservations.idempotency_key is 'Prevents duplicate range reservation on retry.';
