-- Inventory Foundation Sprint 4: Lot / Batch identity foundation.
-- Identity metadata only. No quantities, balances, movements, reservations, serial runtime, or QC workflow.

alter table public.inventory_lots rename column lot_key to lot_number;
alter table public.inventory_lots rename column received_on to received_date;
alter table public.inventory_lots rename column expires_on to expiry_date;

alter table public.inventory_lots drop constraint if exists inventory_lots_lot_key_check;
alter table public.inventory_lots drop constraint if exists inventory_lots_check;
alter table public.inventory_lots drop constraint if exists inventory_lots_expires_on_check;

alter table public.inventory_lots
  add column if not exists source_type text not null default 'internal',
  add column if not exists source_reference_type text,
  add column if not exists source_reference_id uuid,
  add column if not exists supplier_party_id uuid references public.parties(id) on delete restrict,
  add column if not exists supplier_lot_number text,
  add column if not exists manufacturing_date date,
  add column if not exists qc_status text not null default 'not_required',
  add column if not exists lifecycle_state text not null default 'draft',
  add column if not exists barcode text,
  add column if not exists qr_payload jsonb not null default '{}'::jsonb,
  add column if not exists notes text,
  add column if not exists traceability_ready boolean not null default true,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

update public.inventory_lots
set
  lot_number = upper(lot_number),
  barcode = coalesce(barcode, upper(lot_number)),
  source_type = coalesce(source_type, 'internal'),
  qc_status = coalesce(qc_status, 'not_required'),
  lifecycle_state = coalesce(lifecycle_state, 'draft'),
  traceability_ready = coalesce(traceability_ready, true),
  qr_payload = coalesce(qr_payload, '{}'::jsonb),
  source_metadata = coalesce(source_metadata, '{}'::jsonb)
where deleted_at is null;

alter table public.inventory_lots alter column barcode set not null;

alter table public.inventory_lots
  add constraint inventory_lots_lot_number_upper_chk check (lot_number = upper(lot_number)),
  add constraint inventory_lots_expiry_date_chk check (expiry_date is null or received_date is null or expiry_date >= received_date),
  add constraint inventory_lots_source_type_chk check (source_type in ('supplier', 'manufacturing', 'repack', 'return', 'adjustment', 'internal', 'import')),
  add constraint inventory_lots_qc_status_chk check (qc_status in ('not_required', 'pending', 'passed', 'failed', 'hold', 'released')),
  add constraint inventory_lots_lifecycle_state_chk check (lifecycle_state in ('draft', 'active', 'qc_pending', 'qc_hold', 'released', 'blocked', 'consumed', 'expired', 'archived')),
  add constraint inventory_lots_qr_payload_object_chk check (jsonb_typeof(qr_payload) = 'object'),
  add constraint inventory_lots_source_metadata_object_chk check (jsonb_typeof(source_metadata) = 'object'),
  add constraint inventory_lots_source_supplier_chk check (
    source_type <> 'supplier'
    or (supplier_party_id is not null or supplier_lot_number is not null)
  ),
  add constraint inventory_lots_source_repack_chk check (
    source_type <> 'repack'
    or (source_reference_type is not null and source_reference_id is not null)
  ),
  add constraint inventory_lots_source_return_chk check (
    source_type <> 'return'
    or source_reference_type is not null
  ),
  add constraint inventory_lots_source_adjustment_chk check (
    source_type <> 'adjustment'
    or jsonb_typeof(source_metadata) = 'object'
  ),
  add constraint inventory_lots_source_import_chk check (
    source_type <> 'import'
    or jsonb_typeof(source_metadata) = 'object'
  );

drop index if exists inventory_lots_scope_key_uq;
create unique index inventory_lots_scope_number_uq
  on public.inventory_lots (tenant_id, company_id, product_id, lot_number)
  where deleted_at is null;
create unique index inventory_lots_scope_barcode_uq
  on public.inventory_lots (tenant_id, company_id, barcode)
  where deleted_at is null;

drop index if exists inventory_lots_product_idx;
create index inventory_lots_product_idx
  on public.inventory_lots (tenant_id, company_id, product_id, expiry_date, lifecycle_state, qc_status)
  where deleted_at is null;

comment on table public.inventory_lots is 'Lot / batch identity foundation. No quantity, balance, movement, reservation, or availability runtime.';
comment on column public.inventory_lots.lot_number is 'Business lot identity such as LOT-CN-240628 or LOT-MFG-000251.';
comment on column public.inventory_lots.barcode is 'Barcode readiness metadata for scanning. No PDA runtime.';
comment on column public.inventory_lots.qr_payload is 'QR payload metadata for traceability readiness only.';
comment on column public.inventory_lots.source_metadata is 'Adjustment/import source metadata without runtime document posting.';
