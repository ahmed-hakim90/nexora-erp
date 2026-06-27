-- Nexora Business App 1: Finance Foundation.
-- Foundation definitions only. No journal entries, posting, invoices, payments,
-- bank reconciliation, tax calculation, or general ledger balances.

create table public.finance_account_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  account_type_key text not null,
  name text not null,
  account_class text not null check (account_class in ('asset', 'liability', 'equity', 'revenue', 'expense', 'contra_asset', 'contra_liability', 'statistical')),
  normal_balance text not null check (normal_balance in ('debit', 'credit', 'none')),
  description text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (account_type_key = lower(account_type_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  account_type_id uuid not null references public.finance_account_types(id) on delete restrict,
  parent_account_id uuid references public.finance_accounts(id) on delete restrict,
  account_code text not null,
  name text not null,
  currency_code char(3),
  cost_center_required boolean not null default false,
  dimension_requirements text[] not null default array[]::text[],
  description text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_ledger_posting', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (account_code = upper(account_code)),
  check (length(trim(name)) > 0),
  check (currency_code is null or currency_code = upper(currency_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_journals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  journal_key text not null,
  name text not null,
  journal_kind text not null check (journal_kind in ('general', 'sales', 'purchase', 'cash', 'bank', 'inventory', 'payroll', 'adjustment')),
  default_currency_code char(3),
  requires_approval boolean not null default true,
  posting_enabled boolean not null default false check (posting_enabled = false),
  description text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_journal_entry_posting', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (journal_key = lower(journal_key)),
  check (length(trim(name)) > 0),
  check (default_currency_code is null or default_currency_code = upper(default_currency_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_fiscal_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  fiscal_year_key text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
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

create table public.finance_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  fiscal_year_id uuid not null references public.finance_fiscal_years(id) on delete restrict,
  fiscal_period_key text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  period_kind text not null default 'regular' check (period_kind in ('opening', 'regular', 'adjustment', 'closing')),
  status text not null default 'draft' check (status in ('draft', 'active', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (fiscal_period_key = lower(fiscal_period_key)),
  check (ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_currencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  currency_code char(3) not null,
  name text not null,
  symbol text,
  precision integer not null default 2 check (precision between 0 and 6),
  is_base_currency boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (currency_code = upper(currency_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_tax_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  tax_key text not null,
  name text not null,
  calculation_mode text not null check (calculation_mode in ('inclusive', 'exclusive')),
  rate numeric(9, 6) check (rate is null or (rate >= 0 and rate <= 1)),
  is_recoverable boolean not null default false,
  is_withholding boolean not null default false,
  calculation_supported boolean not null default false check (calculation_supported = false),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'definition_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (tax_key = lower(tax_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_payment_terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  terms_key text not null,
  name text not null,
  due_days integer not null default 0 check (due_days >= 0),
  discount_days integer check (discount_days is null or discount_days >= 0),
  discount_percent numeric(9, 6) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 1)),
  payment_execution_supported boolean not null default false check (payment_execution_supported = false),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'definition_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (terms_key = lower(terms_key)),
  check (discount_days is null or discount_days <= due_days),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.finance_dimensions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  dimension_key text not null,
  name text not null,
  dimension_kind text not null check (dimension_kind in ('company', 'branch', 'department', 'cost_center', 'project', 'warehouse', 'employee', 'customer', 'supplier', 'product', 'custom')),
  cost_center_key text,
  cost_center_ref_id uuid,
  reference_entity_type text,
  reference_entity_id uuid,
  required_for_posting boolean not null default false,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'cost_engine_contract_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (dimension_key = lower(dimension_key)),
  check (cost_center_key is null or cost_center_key = lower(cost_center_key)),
  check (reference_entity_type is null or reference_entity_type = lower(reference_entity_type)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index finance_account_types_scope_key_uq
  on public.finance_account_types (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), account_type_key)
  where deleted_at is null;
create unique index finance_accounts_scope_code_uq
  on public.finance_accounts (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), account_code)
  where deleted_at is null;
create unique index finance_journals_scope_key_uq
  on public.finance_journals (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), journal_key)
  where deleted_at is null;
create unique index finance_fiscal_years_scope_key_uq
  on public.finance_fiscal_years (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), fiscal_year_key)
  where deleted_at is null;
create unique index finance_fiscal_periods_scope_key_uq
  on public.finance_fiscal_periods (tenant_id, fiscal_year_id, fiscal_period_key)
  where deleted_at is null;
create unique index finance_currencies_scope_code_uq
  on public.finance_currencies (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), currency_code)
  where deleted_at is null;
create unique index finance_currencies_one_base_uq
  on public.finance_currencies (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null and is_base_currency = true;
create unique index finance_tax_definitions_scope_key_uq
  on public.finance_tax_definitions (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), tax_key)
  where deleted_at is null;
create unique index finance_payment_terms_scope_key_uq
  on public.finance_payment_terms (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), terms_key)
  where deleted_at is null;
create unique index finance_dimensions_scope_key_uq
  on public.finance_dimensions (tenant_id, coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), dimension_kind, dimension_key)
  where deleted_at is null;

create index finance_accounts_type_idx on public.finance_accounts (tenant_id, account_type_id) where deleted_at is null;
create index finance_journals_kind_idx on public.finance_journals (tenant_id, journal_kind, is_active) where deleted_at is null;
create index finance_fiscal_periods_dates_idx on public.finance_fiscal_periods (tenant_id, starts_on, ends_on, status) where deleted_at is null;
create index finance_dimensions_cost_center_idx on public.finance_dimensions (tenant_id, cost_center_key) where deleted_at is null and cost_center_key is not null;

create or replace function public.enforce_finance_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if not exists (select 1 from public.tenants t where t.id = new.tenant_id and t.is_active = true and t.deleted_at is null) then
    raise exception 'finance foundation tenant must be active';
  end if;

  if new.company_id is not null and not exists (select 1 from public.companies c where c.id = new.company_id and c.tenant_id = new.tenant_id and c.is_active = true and c.deleted_at is null) then
    raise exception 'finance foundation company must belong to tenant and be active';
  end if;

  if tg_table_name = 'finance_accounts' then
    select tenant_id, company_id into parent_record from public.finance_account_types where id = new.account_type_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id is distinct from new.company_id then
      raise exception 'finance account type must match account tenant and company scope';
    end if;

    if new.parent_account_id is not null then
      select tenant_id, company_id into parent_record from public.finance_accounts where id = new.parent_account_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id is distinct from new.company_id then
        raise exception 'parent finance account must match account tenant and company scope';
      end if;
    end if;
  elsif tg_table_name = 'finance_fiscal_periods' then
    select tenant_id, company_id, starts_on, ends_on into parent_record from public.finance_fiscal_years where id = new.fiscal_year_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id is distinct from new.company_id then
      raise exception 'finance fiscal period must match fiscal year tenant and company scope';
    end if;
    if new.starts_on < parent_record.starts_on or new.ends_on > parent_record.ends_on then
      raise exception 'finance fiscal period must stay inside fiscal year dates';
    end if;
  end if;

  return new;
end;
$$;

create trigger finance_account_types_scope before insert or update on public.finance_account_types for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_accounts_scope before insert or update on public.finance_accounts for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_journals_scope before insert or update on public.finance_journals for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_fiscal_years_scope before insert or update on public.finance_fiscal_years for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_fiscal_periods_scope before insert or update on public.finance_fiscal_periods for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_currencies_scope before insert or update on public.finance_currencies for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_tax_definitions_scope before insert or update on public.finance_tax_definitions for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_payment_terms_scope before insert or update on public.finance_payment_terms for each row execute function public.enforce_finance_foundation_scope();
create trigger finance_dimensions_scope before insert or update on public.finance_dimensions for each row execute function public.enforce_finance_foundation_scope();

create trigger finance_account_types_touch before update on public.finance_account_types for each row execute function public.touch_platform_row();
create trigger finance_accounts_touch before update on public.finance_accounts for each row execute function public.touch_platform_row();
create trigger finance_journals_touch before update on public.finance_journals for each row execute function public.touch_platform_row();
create trigger finance_fiscal_years_touch before update on public.finance_fiscal_years for each row execute function public.touch_platform_row();
create trigger finance_fiscal_periods_touch before update on public.finance_fiscal_periods for each row execute function public.touch_platform_row();
create trigger finance_currencies_touch before update on public.finance_currencies for each row execute function public.touch_platform_row();
create trigger finance_tax_definitions_touch before update on public.finance_tax_definitions for each row execute function public.touch_platform_row();
create trigger finance_payment_terms_touch before update on public.finance_payment_terms for each row execute function public.touch_platform_row();
create trigger finance_dimensions_touch before update on public.finance_dimensions for each row execute function public.touch_platform_row();

create trigger finance_account_types_prevent_id before update on public.finance_account_types for each row execute function public.prevent_id_change();
create trigger finance_accounts_prevent_id before update on public.finance_accounts for each row execute function public.prevent_id_change();
create trigger finance_journals_prevent_id before update on public.finance_journals for each row execute function public.prevent_id_change();
create trigger finance_fiscal_years_prevent_id before update on public.finance_fiscal_years for each row execute function public.prevent_id_change();
create trigger finance_fiscal_periods_prevent_id before update on public.finance_fiscal_periods for each row execute function public.prevent_id_change();
create trigger finance_currencies_prevent_id before update on public.finance_currencies for each row execute function public.prevent_id_change();
create trigger finance_tax_definitions_prevent_id before update on public.finance_tax_definitions for each row execute function public.prevent_id_change();
create trigger finance_payment_terms_prevent_id before update on public.finance_payment_terms for each row execute function public.prevent_id_change();
create trigger finance_dimensions_prevent_id before update on public.finance_dimensions for each row execute function public.prevent_id_change();

create trigger finance_account_types_prevent_tenant before update on public.finance_account_types for each row execute function public.prevent_tenant_id_change();
create trigger finance_accounts_prevent_tenant before update on public.finance_accounts for each row execute function public.prevent_tenant_id_change();
create trigger finance_journals_prevent_tenant before update on public.finance_journals for each row execute function public.prevent_tenant_id_change();
create trigger finance_fiscal_years_prevent_tenant before update on public.finance_fiscal_years for each row execute function public.prevent_tenant_id_change();
create trigger finance_fiscal_periods_prevent_tenant before update on public.finance_fiscal_periods for each row execute function public.prevent_tenant_id_change();
create trigger finance_currencies_prevent_tenant before update on public.finance_currencies for each row execute function public.prevent_tenant_id_change();
create trigger finance_tax_definitions_prevent_tenant before update on public.finance_tax_definitions for each row execute function public.prevent_tenant_id_change();
create trigger finance_payment_terms_prevent_tenant before update on public.finance_payment_terms for each row execute function public.prevent_tenant_id_change();
create trigger finance_dimensions_prevent_tenant before update on public.finance_dimensions for each row execute function public.prevent_tenant_id_change();

alter table public.finance_account_types enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_journals enable row level security;
alter table public.finance_fiscal_years enable row level security;
alter table public.finance_fiscal_periods enable row level security;
alter table public.finance_currencies enable row level security;
alter table public.finance_tax_definitions enable row level security;
alter table public.finance_payment_terms enable row level security;
alter table public.finance_dimensions enable row level security;

alter table public.finance_account_types force row level security;
alter table public.finance_accounts force row level security;
alter table public.finance_journals force row level security;
alter table public.finance_fiscal_years force row level security;
alter table public.finance_fiscal_periods force row level security;
alter table public.finance_currencies force row level security;
alter table public.finance_tax_definitions force row level security;
alter table public.finance_payment_terms force row level security;
alter table public.finance_dimensions force row level security;

create policy finance_account_types_select on public.finance_account_types for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.view', tenant_id));
create policy finance_account_types_insert on public.finance_account_types for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id));
create policy finance_account_types_update on public.finance_account_types for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id));

create policy finance_accounts_select on public.finance_accounts for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.view', tenant_id));
create policy finance_accounts_insert on public.finance_accounts for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id));
create policy finance_accounts_update on public.finance_accounts for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.accounts.manage', tenant_id));

create policy finance_journals_select on public.finance_journals for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.journals.view', tenant_id));
create policy finance_journals_insert on public.finance_journals for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.journals.manage', tenant_id));
create policy finance_journals_update on public.finance_journals for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.journals.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.journals.manage', tenant_id));

create policy finance_fiscal_years_select on public.finance_fiscal_years for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.view', tenant_id));
create policy finance_fiscal_years_insert on public.finance_fiscal_years for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id));
create policy finance_fiscal_years_update on public.finance_fiscal_years for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id));

create policy finance_fiscal_periods_select on public.finance_fiscal_periods for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.view', tenant_id));
create policy finance_fiscal_periods_insert on public.finance_fiscal_periods for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id));
create policy finance_fiscal_periods_update on public.finance_fiscal_periods for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.fiscal-periods.manage', tenant_id));

create policy finance_currencies_select on public.finance_currencies for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.currencies.view', tenant_id));
create policy finance_currencies_insert on public.finance_currencies for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.currencies.manage', tenant_id));
create policy finance_currencies_update on public.finance_currencies for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.currencies.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.currencies.manage', tenant_id));

create policy finance_tax_definitions_select on public.finance_tax_definitions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.tax-definitions.view', tenant_id));
create policy finance_tax_definitions_insert on public.finance_tax_definitions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.tax-definitions.manage', tenant_id));
create policy finance_tax_definitions_update on public.finance_tax_definitions for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.tax-definitions.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.tax-definitions.manage', tenant_id));

create policy finance_payment_terms_select on public.finance_payment_terms for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.payment-terms.view', tenant_id));
create policy finance_payment_terms_insert on public.finance_payment_terms for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.payment-terms.manage', tenant_id));
create policy finance_payment_terms_update on public.finance_payment_terms for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.payment-terms.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.payment-terms.manage', tenant_id));

create policy finance_dimensions_select on public.finance_dimensions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.dimensions.view', tenant_id));
create policy finance_dimensions_insert on public.finance_dimensions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.dimensions.manage', tenant_id));
create policy finance_dimensions_update on public.finance_dimensions for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('finance.dimensions.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and public.has_permission('finance.dimensions.manage', tenant_id));

create policy event_outbox_finance_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('finance.definition.changed', 'finance.posting-readiness.requested') and public.is_tenant_member(tenant_id) and public.has_permission('finance.audit.view', tenant_id));
create policy event_outbox_finance_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('finance.definition.changed', 'finance.posting-readiness.requested') and public.is_tenant_member(tenant_id) and (public.has_permission('finance.accounts.manage', tenant_id) or public.has_permission('finance.journals.manage', tenant_id) or public.has_permission('finance.document-hooks.manage', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('finance.accounts.view', 'View Finance Accounts', 'View chart of accounts and account type foundation definitions.', 'standard'),
  ('finance.accounts.manage', 'Manage Finance Accounts', 'Create and update chart of accounts and account type foundation definitions without posting.', 'high'),
  ('finance.journals.view', 'View Finance Journals', 'View journal foundation definitions without journal entries.', 'standard'),
  ('finance.journals.manage', 'Manage Finance Journals', 'Create and update journal definitions while posting remains disabled.', 'high'),
  ('finance.fiscal-periods.view', 'View Finance Fiscal Periods', 'View Finance fiscal year and period definitions.', 'standard'),
  ('finance.fiscal-periods.manage', 'Manage Finance Fiscal Periods', 'Create and update Finance fiscal year and period definitions.', 'high'),
  ('finance.currencies.view', 'View Finance Currencies', 'View Finance currency enablement definitions.', 'standard'),
  ('finance.currencies.manage', 'Manage Finance Currencies', 'Create and update Finance currency enablement definitions.', 'high'),
  ('finance.tax-definitions.view', 'View Finance Tax Definitions', 'View tax definition records only; no tax calculation is granted.', 'standard'),
  ('finance.tax-definitions.manage', 'Manage Finance Tax Definitions', 'Create and update tax definition records only; no tax calculation is granted.', 'high'),
  ('finance.payment-terms.view', 'View Finance Payment Terms', 'View payment terms definitions only; no payment execution is granted.', 'standard'),
  ('finance.payment-terms.manage', 'Manage Finance Payment Terms', 'Create and update payment terms definitions only; no payment execution is granted.', 'high'),
  ('finance.dimensions.view', 'View Finance Dimensions', 'View accounting dimensions and cost center links.', 'standard'),
  ('finance.dimensions.manage', 'Manage Finance Dimensions', 'Create and update accounting dimensions and cost center links.', 'high'),
  ('finance.document-hooks.manage', 'Manage Finance Document Hooks', 'Manage future financial document hook contracts without implementing document workflows.', 'critical'),
  ('finance.posting-readiness.view', 'View Finance Posting Readiness', 'View future posting readiness contracts without executing journal posting.', 'high'),
  ('finance.reports.view', 'View Finance Readiness Reports', 'View foundation readiness report, print, and dashboard contracts.', 'standard'),
  ('finance.audit.view', 'View Finance Audit Events', 'View Finance foundation audit and event readiness records.', 'high')
on conflict do nothing;
