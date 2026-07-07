-- HR Payroll Finance / Cost / Bank Readiness Foundation.
-- Extends Sprint 14 hr_payroll_posting_readiness. No journal posting or bank file generation.

do $$
begin
  create type public.hr_payroll_finance_readiness_status as enum ('draft', 'ready', 'posted', 'failed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_finance_dimension_kind as enum ('cost_center', 'department', 'project', 'manufacturing_order', 'service_job', 'fleet_asset');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_labor_cost_consumer as enum ('cost_engine', 'manufacturing', 'projects', 'service', 'fleet');
exception
  when duplicate_object then null;
end $$;

alter table public.hr_payroll_posting_readiness
  add column if not exists finance_dimension_kind public.hr_payroll_finance_dimension_kind,
  add column if not exists finance_dimension_ref text,
  add column if not exists posting_reference text,
  add column if not exists audit_lineage_ref text,
  add column if not exists posting_readiness_v2 boolean not null default false;

comment on column public.hr_payroll_posting_readiness.posting_readiness_v2 is 'Marks Sprint C v2 finance dimension extension rows.';

create table public.hr_payroll_cost_center_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  payroll_result_id uuid not null references public.hr_payroll_results(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  cost_center_id uuid,
  allocation_percent numeric(8, 4) not null default 100,
  allocated_amount numeric(18, 4) not null default 0,
  currency text not null default 'USD',
  status public.hr_payroll_finance_readiness_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'finance_bank_readiness_foundation_only', true,
    'cost_engine_posting_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (allocation_percent > 0 and allocation_percent <= 100),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_labor_cost_facts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  payroll_result_id uuid not null references public.hr_payroll_results(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  consumer public.hr_payroll_labor_cost_consumer not null default 'cost_engine',
  consumer_ref text,
  gross_labor_cost numeric(18, 4) not null default 0,
  employer_contribution_cost numeric(18, 4) not null default 0,
  net_labor_cost numeric(18, 4) not null default 0,
  currency text not null default 'USD',
  audit_lineage_ref text not null,
  metadata jsonb not null default jsonb_build_object(
    'finance_bank_readiness_foundation_only', true,
    'cost_calculation_posting_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(audit_lineage_ref)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_bank_payment_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  payment_method_kind public.hr_payroll_payment_method_kind not null default 'bank_transfer',
  bank_account_ref text,
  net_pay_amount numeric(18, 4) not null default 0,
  currency text not null default 'USD',
  status public.hr_payroll_finance_readiness_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'finance_bank_readiness_foundation_only', true,
    'bank_payment_runtime_implemented', false,
    'bank_transfer_file_generation_implemented', false,
    'wps_file_generation_implemented', false
  ),
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

create table public.hr_payroll_finance_audit_lineage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  payroll_result_id uuid not null references public.hr_payroll_results(id) on delete restrict,
  posting_readiness_line_id uuid references public.hr_payroll_posting_readiness(id) on delete restrict,
  labor_cost_fact_id uuid references public.hr_payroll_labor_cost_facts(id) on delete restrict,
  correlation_id text not null,
  source_engine text not null check (source_engine in ('payroll-result', 'posting-readiness', 'cost-allocation')),
  metadata jsonb not null default jsonb_build_object(
    'finance_bank_readiness_foundation_only', true,
    'finance_posting_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index hr_payroll_cost_center_allocations_run_idx
  on public.hr_payroll_cost_center_allocations (tenant_id, payroll_run_id, payroll_result_id)
  where deleted_at is null;

create index hr_payroll_labor_cost_facts_run_idx
  on public.hr_payroll_labor_cost_facts (tenant_id, payroll_run_id, consumer)
  where deleted_at is null;

create index hr_payroll_bank_payment_readiness_run_idx
  on public.hr_payroll_bank_payment_readiness (tenant_id, payroll_run_id, status)
  where deleted_at is null;

drop trigger if exists hr_payroll_cost_center_allocations_touch_updated_at on public.hr_payroll_cost_center_allocations;
create trigger hr_payroll_cost_center_allocations_touch_updated_at before update on public.hr_payroll_cost_center_allocations for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_labor_cost_facts_touch_updated_at on public.hr_payroll_labor_cost_facts;
create trigger hr_payroll_labor_cost_facts_touch_updated_at before update on public.hr_payroll_labor_cost_facts for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_bank_payment_readiness_touch_updated_at on public.hr_payroll_bank_payment_readiness;
create trigger hr_payroll_bank_payment_readiness_touch_updated_at before update on public.hr_payroll_bank_payment_readiness for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_finance_audit_lineage_touch_updated_at on public.hr_payroll_finance_audit_lineage;
create trigger hr_payroll_finance_audit_lineage_touch_updated_at before update on public.hr_payroll_finance_audit_lineage for each row execute function public.touch_platform_row();

alter table public.hr_payroll_cost_center_allocations enable row level security;
alter table public.hr_payroll_labor_cost_facts enable row level security;
alter table public.hr_payroll_bank_payment_readiness enable row level security;
alter table public.hr_payroll_finance_audit_lineage enable row level security;

alter table public.hr_payroll_cost_center_allocations force row level security;
alter table public.hr_payroll_labor_cost_facts force row level security;
alter table public.hr_payroll_bank_payment_readiness force row level security;
alter table public.hr_payroll_finance_audit_lineage force row level security;

create policy hr_payroll_finance_readiness_select on public.hr_payroll_cost_center_allocations for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.finance.readiness.view', tenant_id));

create policy hr_payroll_finance_readiness_manage on public.hr_payroll_cost_center_allocations for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.finance.readiness.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.finance.readiness.manage', tenant_id));

create policy hr_payroll_bank_readiness_manage on public.hr_payroll_bank_payment_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.bank.readiness.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.bank.readiness.manage', tenant_id));
