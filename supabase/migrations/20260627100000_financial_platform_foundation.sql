-- Nexora Financial Platform Foundation.
-- Shared financial infrastructure only. No Finance app, chart of accounts, journals,
-- general ledger, AR/AP, cash/bank, cost accounting, or financial reports.

create type public.financial_period_status as enum ('open', 'closed', 'locked');
create type public.financial_tax_calculation_mode as enum ('inclusive', 'exclusive');
create type public.financial_payment_status as enum (
  'unpaid',
  'partially_paid',
  'paid',
  'overdue',
  'failed',
  'refunded',
  'cancelled'
);
create type public.financial_payment_channel as enum (
  'cash',
  'bank',
  'card',
  'wallet',
  'cheque',
  'online',
  'external'
);
create type public.financial_dimension_type as enum (
  'company',
  'branch',
  'department',
  'cost-center',
  'project',
  'warehouse',
  'employee',
  'vehicle',
  'customer',
  'supplier'
);
create type public.financial_posting_state as enum (
  'draft',
  'submitted',
  'approved',
  'posted',
  'cancelled',
  'reversed'
);

create table public.financial_fiscal_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid,
  fiscal_year_key text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status public.financial_period_status not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (fiscal_year_key = lower(fiscal_year_key)),
  check (ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_fiscal_years_scope_key_active_uq
  on public.financial_fiscal_years (
    tenant_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    fiscal_year_key
  )
  where deleted_at is null;

create table public.financial_accounting_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  fiscal_year_id uuid not null references public.financial_fiscal_years(id) on delete restrict,
  company_id uuid,
  period_key text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status public.financial_period_status not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (period_key = lower(period_key)),
  check (ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_accounting_periods_scope_key_active_uq
  on public.financial_accounting_periods (
    tenant_id,
    fiscal_year_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    period_key
  )
  where deleted_at is null;
create index financial_accounting_periods_date_idx
  on public.financial_accounting_periods (tenant_id, starts_on, ends_on, status)
  where deleted_at is null;

create table public.financial_currencies (
  id uuid primary key default gen_random_uuid(),
  currency_code char(3) not null,
  name text not null,
  symbol text,
  precision integer not null default 2 check (precision between 0 and 6),
  rounding_increment numeric(18, 6) not null default 0.01 check (rounding_increment > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (currency_code = upper(currency_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_currencies_code_active_uq
  on public.financial_currencies (currency_code)
  where deleted_at is null;

create table public.financial_currency_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid,
  base_currency_code char(3) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (base_currency_code = upper(base_currency_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_currency_settings_scope_active_uq
  on public.financial_currency_settings (
    tenant_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where deleted_at is null;

create table public.financial_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  from_currency_code char(3) not null,
  to_currency_code char(3) not null,
  rate numeric(24, 12) not null check (rate > 0),
  effective_at timestamptz not null,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (from_currency_code = upper(from_currency_code)),
  check (to_currency_code = upper(to_currency_code)),
  check (from_currency_code <> to_currency_code),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_exchange_rates_scope_active_uq
  on public.financial_exchange_rates (
    tenant_id,
    from_currency_code,
    to_currency_code,
    effective_at
  )
  where deleted_at is null;

create table public.financial_tax_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tax_key text not null,
  label text not null,
  calculation_mode public.financial_tax_calculation_mode not null,
  is_recoverable boolean not null default false,
  is_withholding boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (tax_key = lower(tax_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_tax_definitions_scope_key_active_uq
  on public.financial_tax_definitions (tenant_id, tax_key)
  where deleted_at is null;

create table public.financial_tax_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tax_definition_id uuid not null references public.financial_tax_definitions(id) on delete restrict,
  rate numeric(9, 6) not null check (rate >= 0 and rate <= 1),
  effective_from date not null,
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
  check (effective_to is null or effective_to > effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index financial_tax_rates_definition_idx
  on public.financial_tax_rates (tenant_id, tax_definition_id, effective_from desc)
  where deleted_at is null;

create table public.financial_tax_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tax_group_key text not null,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (tax_group_key = lower(tax_group_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_tax_groups_scope_key_active_uq
  on public.financial_tax_groups (tenant_id, tax_group_key)
  where deleted_at is null;

create table public.financial_tax_group_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tax_group_id uuid not null references public.financial_tax_groups(id) on delete cascade,
  tax_definition_id uuid not null references public.financial_tax_definitions(id) on delete restrict,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_tax_group_members_active_uq
  on public.financial_tax_group_members (tenant_id, tax_group_id, tax_definition_id)
  where deleted_at is null;

create table public.financial_payment_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  method_key text not null,
  label text not null,
  channel public.financial_payment_channel not null,
  requires_reference boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (method_key = lower(method_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_payment_methods_scope_key_active_uq
  on public.financial_payment_methods (tenant_id, method_key)
  where deleted_at is null;

create table public.financial_payment_terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  terms_key text not null,
  label text not null,
  due_days integer not null default 0 check (due_days >= 0),
  discount_days integer check (discount_days is null or discount_days >= 0),
  discount_percent numeric(9, 6) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 1)),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (terms_key = lower(terms_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_payment_terms_scope_key_active_uq
  on public.financial_payment_terms (tenant_id, terms_key)
  where deleted_at is null;

create table public.financial_dimensions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  dimension_type public.financial_dimension_type not null,
  dimension_key text not null,
  dimension_ref_id uuid,
  label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (dimension_key = lower(dimension_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index financial_dimensions_scope_key_active_uq
  on public.financial_dimensions (tenant_id, dimension_type, dimension_key)
  where deleted_at is null;

create table public.financial_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  source_module text not null,
  source_entity_type text not null,
  source_entity_id uuid not null,
  event_key text not null,
  posting_state public.financial_posting_state not null default 'draft',
  occurred_at timestamptz not null,
  amount numeric(24, 6),
  currency_code char(3),
  dimensions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (source_module = lower(source_module)),
  check (source_entity_type = lower(source_entity_type)),
  check (event_key = lower(event_key)),
  check (currency_code is null or currency_code = upper(currency_code)),
  check ((amount is null and currency_code is null) or (amount is not null and currency_code is not null)),
  check (jsonb_typeof(dimensions) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create unique index financial_events_idempotency_uq
  on public.financial_events (tenant_id, idempotency_key)
  where deleted_at is null;
create index financial_events_source_idx
  on public.financial_events (tenant_id, source_module, source_entity_type, source_entity_id)
  where deleted_at is null;

create table public.financial_posting_lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  financial_event_id uuid not null references public.financial_events(id) on delete cascade,
  from_state public.financial_posting_state not null,
  to_state public.financial_posting_state not null,
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create index financial_posting_lifecycle_history_event_idx
  on public.financial_posting_lifecycle_history (tenant_id, financial_event_id, created_at)
  where deleted_at is null;

drop index if exists public.numbering_sequences_scope_active_uq;
alter table public.numbering_sequences
  add column if not exists company_id uuid,
  add column if not exists prefix_template text,
  add column if not exists suffix_template text,
  add column if not exists allow_gaps boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.numbering_sequences
set prefix_template = coalesce(prefix_template, prefix)
where prefix_template is null;

create unique index numbering_sequences_scope_active_uq
  on public.numbering_sequences (
    tenant_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(fiscal_year, ''),
    module_key,
    document_type,
    sequence_key
  )
  where deleted_at is null;

create or replace function public.enforce_financial_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_tenant_id uuid;
begin
  if tg_table_name = 'financial_accounting_periods' then
    select tenant_id into parent_tenant_id from public.financial_fiscal_years where id = new.fiscal_year_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'accounting period tenant must match fiscal year tenant';
    end if;
  elsif tg_table_name = 'financial_tax_rates' then
    select tenant_id into parent_tenant_id from public.financial_tax_definitions where id = new.tax_definition_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'tax rate tenant must match tax definition tenant';
    end if;
  elsif tg_table_name = 'financial_tax_group_members' then
    select tenant_id into parent_tenant_id from public.financial_tax_groups where id = new.tax_group_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'tax group member tenant must match tax group tenant';
    end if;
    select tenant_id into parent_tenant_id from public.financial_tax_definitions where id = new.tax_definition_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'tax group member tenant must match tax definition tenant';
    end if;
  elsif tg_table_name = 'financial_posting_lifecycle_history' then
    select tenant_id into parent_tenant_id from public.financial_events where id = new.financial_event_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'posting lifecycle tenant must match financial event tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger financial_fiscal_years_touch_updated_at before update on public.financial_fiscal_years for each row execute function public.touch_platform_row();
create trigger financial_fiscal_years_prevent_id_change before update on public.financial_fiscal_years for each row execute function public.prevent_id_change();
create trigger financial_fiscal_years_prevent_tenant_id_change before update on public.financial_fiscal_years for each row execute function public.prevent_tenant_id_change();
create trigger financial_accounting_periods_enforce_scope before insert or update on public.financial_accounting_periods for each row execute function public.enforce_financial_foundation_scope();
create trigger financial_accounting_periods_touch_updated_at before update on public.financial_accounting_periods for each row execute function public.touch_platform_row();
create trigger financial_accounting_periods_prevent_id_change before update on public.financial_accounting_periods for each row execute function public.prevent_id_change();
create trigger financial_accounting_periods_prevent_tenant_id_change before update on public.financial_accounting_periods for each row execute function public.prevent_tenant_id_change();
create trigger financial_currencies_touch_updated_at before update on public.financial_currencies for each row execute function public.touch_platform_row();
create trigger financial_currencies_prevent_id_change before update on public.financial_currencies for each row execute function public.prevent_id_change();
create trigger financial_currency_settings_touch_updated_at before update on public.financial_currency_settings for each row execute function public.touch_platform_row();
create trigger financial_currency_settings_prevent_id_change before update on public.financial_currency_settings for each row execute function public.prevent_id_change();
create trigger financial_currency_settings_prevent_tenant_id_change before update on public.financial_currency_settings for each row execute function public.prevent_tenant_id_change();
create trigger financial_exchange_rates_touch_updated_at before update on public.financial_exchange_rates for each row execute function public.touch_platform_row();
create trigger financial_exchange_rates_prevent_id_change before update on public.financial_exchange_rates for each row execute function public.prevent_id_change();
create trigger financial_exchange_rates_prevent_tenant_id_change before update on public.financial_exchange_rates for each row execute function public.prevent_tenant_id_change();
create trigger financial_tax_definitions_touch_updated_at before update on public.financial_tax_definitions for each row execute function public.touch_platform_row();
create trigger financial_tax_definitions_prevent_id_change before update on public.financial_tax_definitions for each row execute function public.prevent_id_change();
create trigger financial_tax_definitions_prevent_tenant_id_change before update on public.financial_tax_definitions for each row execute function public.prevent_tenant_id_change();
create trigger financial_tax_rates_enforce_scope before insert or update on public.financial_tax_rates for each row execute function public.enforce_financial_foundation_scope();
create trigger financial_tax_rates_touch_updated_at before update on public.financial_tax_rates for each row execute function public.touch_platform_row();
create trigger financial_tax_rates_prevent_id_change before update on public.financial_tax_rates for each row execute function public.prevent_id_change();
create trigger financial_tax_rates_prevent_tenant_id_change before update on public.financial_tax_rates for each row execute function public.prevent_tenant_id_change();
create trigger financial_tax_groups_touch_updated_at before update on public.financial_tax_groups for each row execute function public.touch_platform_row();
create trigger financial_tax_groups_prevent_id_change before update on public.financial_tax_groups for each row execute function public.prevent_id_change();
create trigger financial_tax_groups_prevent_tenant_id_change before update on public.financial_tax_groups for each row execute function public.prevent_tenant_id_change();
create trigger financial_tax_group_members_enforce_scope before insert or update on public.financial_tax_group_members for each row execute function public.enforce_financial_foundation_scope();
create trigger financial_tax_group_members_touch_updated_at before update on public.financial_tax_group_members for each row execute function public.touch_platform_row();
create trigger financial_tax_group_members_prevent_id_change before update on public.financial_tax_group_members for each row execute function public.prevent_id_change();
create trigger financial_tax_group_members_prevent_tenant_id_change before update on public.financial_tax_group_members for each row execute function public.prevent_tenant_id_change();
create trigger financial_payment_methods_touch_updated_at before update on public.financial_payment_methods for each row execute function public.touch_platform_row();
create trigger financial_payment_methods_prevent_id_change before update on public.financial_payment_methods for each row execute function public.prevent_id_change();
create trigger financial_payment_methods_prevent_tenant_id_change before update on public.financial_payment_methods for each row execute function public.prevent_tenant_id_change();
create trigger financial_payment_terms_touch_updated_at before update on public.financial_payment_terms for each row execute function public.touch_platform_row();
create trigger financial_payment_terms_prevent_id_change before update on public.financial_payment_terms for each row execute function public.prevent_id_change();
create trigger financial_payment_terms_prevent_tenant_id_change before update on public.financial_payment_terms for each row execute function public.prevent_tenant_id_change();
create trigger financial_dimensions_touch_updated_at before update on public.financial_dimensions for each row execute function public.touch_platform_row();
create trigger financial_dimensions_prevent_id_change before update on public.financial_dimensions for each row execute function public.prevent_id_change();
create trigger financial_dimensions_prevent_tenant_id_change before update on public.financial_dimensions for each row execute function public.prevent_tenant_id_change();
create trigger financial_events_touch_updated_at before update on public.financial_events for each row execute function public.touch_platform_row();
create trigger financial_events_prevent_id_change before update on public.financial_events for each row execute function public.prevent_id_change();
create trigger financial_events_prevent_tenant_id_change before update on public.financial_events for each row execute function public.prevent_tenant_id_change();
create trigger financial_posting_lifecycle_history_enforce_scope before insert or update on public.financial_posting_lifecycle_history for each row execute function public.enforce_financial_foundation_scope();
create trigger financial_posting_lifecycle_history_touch_updated_at before update on public.financial_posting_lifecycle_history for each row execute function public.touch_platform_row();
create trigger financial_posting_lifecycle_history_prevent_id_change before update on public.financial_posting_lifecycle_history for each row execute function public.prevent_id_change();
create trigger financial_posting_lifecycle_history_prevent_tenant_id_change before update on public.financial_posting_lifecycle_history for each row execute function public.prevent_tenant_id_change();

alter table public.financial_fiscal_years enable row level security;
alter table public.financial_accounting_periods enable row level security;
alter table public.financial_currencies enable row level security;
alter table public.financial_currency_settings enable row level security;
alter table public.financial_exchange_rates enable row level security;
alter table public.financial_tax_definitions enable row level security;
alter table public.financial_tax_rates enable row level security;
alter table public.financial_tax_groups enable row level security;
alter table public.financial_tax_group_members enable row level security;
alter table public.financial_payment_methods enable row level security;
alter table public.financial_payment_terms enable row level security;
alter table public.financial_dimensions enable row level security;
alter table public.financial_events enable row level security;
alter table public.financial_posting_lifecycle_history enable row level security;

alter table public.financial_fiscal_years force row level security;
alter table public.financial_accounting_periods force row level security;
alter table public.financial_currencies force row level security;
alter table public.financial_currency_settings force row level security;
alter table public.financial_exchange_rates force row level security;
alter table public.financial_tax_definitions force row level security;
alter table public.financial_tax_rates force row level security;
alter table public.financial_tax_groups force row level security;
alter table public.financial_tax_group_members force row level security;
alter table public.financial_payment_methods force row level security;
alter table public.financial_payment_terms force row level security;
alter table public.financial_dimensions force row level security;
alter table public.financial_events force row level security;
alter table public.financial_posting_lifecycle_history force row level security;

create policy financial_currencies_select_authenticated on public.financial_currencies for select to authenticated using (is_active = true and deleted_at is null);
create policy financial_fiscal_years_select_member on public.financial_fiscal_years for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.periods.view', tenant_id));
create policy financial_fiscal_years_manage on public.financial_fiscal_years for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.periods.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.periods.manage', tenant_id));
create policy financial_accounting_periods_select_member on public.financial_accounting_periods for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.periods.view', tenant_id));
create policy financial_accounting_periods_manage on public.financial_accounting_periods for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.periods.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.periods.manage', tenant_id));
create policy financial_currency_settings_select_member on public.financial_currency_settings for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.currencies.view', tenant_id));
create policy financial_currency_settings_manage on public.financial_currency_settings for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.currencies.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.currencies.manage', tenant_id));
create policy financial_exchange_rates_select_member on public.financial_exchange_rates for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.currencies.view', tenant_id));
create policy financial_exchange_rates_manage on public.financial_exchange_rates for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.currencies.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.currencies.manage', tenant_id));
create policy financial_tax_definitions_select_member on public.financial_tax_definitions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.taxes.view', tenant_id));
create policy financial_tax_definitions_manage on public.financial_tax_definitions for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id));
create policy financial_tax_rates_select_member on public.financial_tax_rates for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.taxes.view', tenant_id));
create policy financial_tax_rates_manage on public.financial_tax_rates for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id));
create policy financial_tax_groups_select_member on public.financial_tax_groups for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.taxes.view', tenant_id));
create policy financial_tax_groups_manage on public.financial_tax_groups for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id));
create policy financial_tax_group_members_select_member on public.financial_tax_group_members for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.taxes.view', tenant_id));
create policy financial_tax_group_members_manage on public.financial_tax_group_members for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.taxes.manage', tenant_id));
create policy financial_payment_methods_select_member on public.financial_payment_methods for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.payments.view', tenant_id));
create policy financial_payment_methods_manage on public.financial_payment_methods for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.payments.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.payments.manage', tenant_id));
create policy financial_payment_terms_select_member on public.financial_payment_terms for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.payments.view', tenant_id));
create policy financial_payment_terms_manage on public.financial_payment_terms for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.payments.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.payments.manage', tenant_id));
create policy financial_dimensions_select_member on public.financial_dimensions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.dimensions.view', tenant_id));
create policy financial_dimensions_manage on public.financial_dimensions for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.dimensions.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.dimensions.manage', tenant_id));
create policy financial_events_select_member on public.financial_events for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.events.view', tenant_id));
create policy financial_events_execute on public.financial_events for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.events.execute', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.events.execute', tenant_id));
create policy financial_posting_lifecycle_history_select_member on public.financial_posting_lifecycle_history for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('financial.events.view', tenant_id));
create policy financial_posting_lifecycle_history_execute on public.financial_posting_lifecycle_history for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('financial.events.execute', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('financial.events.execute', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('financial.periods.view', 'View financial periods', 'Allows reading fiscal years and accounting periods.', 'standard'),
  ('financial.periods.manage', 'Manage financial periods', 'Allows opening, closing, and locking fiscal periods.', 'critical'),
  ('financial.currencies.view', 'View currencies', 'Allows reading currencies and exchange rates.', 'standard'),
  ('financial.currencies.manage', 'Manage currencies', 'Allows managing base currencies and exchange rates.', 'high'),
  ('financial.taxes.view', 'View taxes', 'Allows reading financial tax definitions, groups, and rates.', 'standard'),
  ('financial.taxes.manage', 'Manage taxes', 'Allows managing financial tax definitions, groups, and rates.', 'high'),
  ('financial.payments.view', 'View payment foundation', 'Allows reading payment methods and terms.', 'standard'),
  ('financial.payments.manage', 'Manage payment foundation', 'Allows managing payment methods and terms.', 'high'),
  ('financial.numbering.view', 'View financial numbering', 'Allows reading financial numbering sequence settings.', 'standard'),
  ('financial.numbering.manage', 'Manage financial numbering', 'Allows managing financial numbering sequence settings.', 'critical'),
  ('financial.dimensions.view', 'View financial dimensions', 'Allows reading financial dimension registry entries.', 'standard'),
  ('financial.dimensions.manage', 'Manage financial dimensions', 'Allows managing financial dimension registry entries.', 'high'),
  ('financial.events.view', 'View financial events', 'Allows reading shared financial event records.', 'high'),
  ('financial.events.execute', 'Execute financial events', 'Allows creating shared financial event records.', 'critical'),
  ('financial.posting.submit', 'Submit financial posting', 'Allows submitting records into the shared posting lifecycle.', 'high'),
  ('financial.posting.approve', 'Approve financial posting', 'Allows approving records in the shared posting lifecycle.', 'critical'),
  ('financial.posting.post', 'Post financial event', 'Allows marking shared financial events as posted for future Finance processing.', 'critical'),
  ('financial.posting.reverse', 'Reverse financial event', 'Allows reversing shared financial event lifecycle state.', 'critical')
on conflict do nothing;
