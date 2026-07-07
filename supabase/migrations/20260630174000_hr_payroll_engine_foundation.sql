-- Nexora HR Payroll Engine Foundation.
-- Foundation contracts only. No salary calculation, payslip math, finance posting,
-- bank/payment execution, HR Action workflow runtime, ESS/MSS, CRUD screens,
-- attendance calculation runtime, or live source-engine querying during processing.

create type public.hr_payroll_record_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.hr_payroll_frequency as enum ('monthly', 'biweekly', 'weekly', 'daily', 'custom');
create type public.hr_payroll_period_status as enum (
  'open',
  'input_collection',
  'snapshot_ready',
  'processing',
  'review',
  'approved',
  'locked',
  'posted',
  'paid',
  'closed',
  'cancelled'
);
create type public.hr_payroll_batch_type as enum (
  'regular',
  'off_cycle',
  'correction',
  'final_settlement',
  'bonus',
  'adjustment'
);
create type public.hr_payroll_batch_status as enum (
  'draft',
  'collect_inputs',
  'snapshot',
  'ready_to_calculate',
  'calculated',
  'review',
  'approved',
  'locked',
  'posting_ready',
  'posted',
  'payment_ready',
  'paid',
  'closed',
  'cancelled'
);
create type public.hr_payslip_status as enum (
  'draft',
  'snapshot_ready',
  'calculated',
  'under_review',
  'approved',
  'locked',
  'posted',
  'paid',
  'cancelled'
);
create type public.hr_payslip_line_source_type as enum (
  'compensation',
  'attendance',
  'production_incentive',
  'loan',
  'advance',
  'tax',
  'insurance',
  'hr_action',
  'manual_adjustment',
  'retro_adjustment'
);
create type public.hr_payroll_snapshot_kind as enum (
  'employment_profile',
  'contract',
  'compensation',
  'salary_package',
  'policy',
  'attendance',
  'workforce',
  'production_incentive',
  'loan',
  'advance',
  'deduction',
  'tax',
  'insurance',
  'hr_action',
  'manual_adjustment'
);
create type public.hr_payroll_snapshot_source_engine as enum (
  'hr-core',
  'policy',
  'compensation',
  'workforce',
  'attendance',
  'production',
  'loans',
  'hr-actions',
  'tax',
  'manual'
);
create type public.hr_payroll_snapshot_lock_status as enum ('snapshot_created', 'snapshot_locked', 'snapshot_superseded');
create type public.hr_payroll_exception_type as enum (
  'missing_employment_profile',
  'missing_salary_package',
  'missing_attendance_snapshot',
  'missing_policy',
  'overlapping_compensation_override',
  'missing_currency',
  'missing_tax_rule',
  'unpaid_leave_detected',
  'attendance_not_approved',
  'payroll_period_locked',
  'calculation_blocked'
);
create type public.hr_payroll_exception_severity as enum ('low', 'medium', 'high', 'critical');
create type public.hr_payroll_exception_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type public.hr_payroll_lock_level as enum (
  'unlocked',
  'snapshot_locked',
  'calculation_locked',
  'payroll_locked',
  'period_locked'
);
create type public.hr_retro_adjustment_status as enum ('draft', 'pending', 'approved', 'applied', 'cancelled');
create type public.hr_payroll_posting_status as enum ('not_ready', 'posting_ready', 'posted', 'failed');

create table public.hr_payroll_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  frequency public.hr_payroll_frequency not null,
  timezone text not null default 'UTC',
  status public.hr_payroll_record_status not null default 'draft',
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'runtime_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_calendar_id uuid not null references public.hr_payroll_calendars(id) on delete restrict,
  period_code text not null,
  period_name text not null,
  start_date date not null,
  end_date date not null,
  payment_date date not null,
  status public.hr_payroll_period_status not null default 'open',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (end_date >= start_date),
  check (payment_date >= start_date),
  check (length(trim(period_code)) > 0),
  check (length(trim(period_name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  payroll_calendar_id uuid not null references public.hr_payroll_calendars(id) on delete restrict,
  payroll_policy_version_id uuid not null references public.hr_policy_versions(id) on delete restrict,
  code text not null,
  name text not null,
  employment_type text,
  status public.hr_payroll_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  payroll_group_id uuid not null references public.hr_payroll_groups(id) on delete restrict,
  batch_type public.hr_payroll_batch_type not null default 'regular',
  status public.hr_payroll_batch_status not null default 'draft',
  input_cutoff_date date,
  snapshot_created_at timestamptz,
  calculated_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  locked_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'runtime_calculation_implemented', false,
    'snapshot_first_processing', true
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

create table public.hr_payslips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_batch_id uuid not null references public.hr_payroll_batches(id) on delete restrict,
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  status public.hr_payslip_status not null default 'draft',
  gross_amount_metadata numeric(18, 4),
  deduction_amount_metadata numeric(18, 4),
  net_amount_metadata numeric(18, 4),
  currency text not null default 'USD',
  snapshot_ref uuid,
  approval_status public.hr_payslip_status not null default 'draft',
  lock_status public.hr_payroll_lock_level not null default 'unlocked',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'amounts_metadata_only', true,
    'runtime_calculation_implemented', false
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

create table public.hr_payslip_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payslip_id uuid not null references public.hr_payslips(id) on delete restrict,
  compensation_component_version_id uuid references public.hr_compensation_component_versions(id) on delete restrict,
  component_code_snapshot text not null,
  component_name_snapshot text not null,
  category_snapshot text not null,
  earning_or_deduction public.hr_compensation_earning_or_deduction not null,
  amount_metadata numeric(18, 4),
  quantity_metadata numeric(18, 4),
  rate_metadata numeric(18, 6),
  currency text not null default 'USD',
  source_snapshot_ref uuid,
  source_type public.hr_payslip_line_source_type not null,
  display_order integer not null default 100 check (display_order >= 0),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'amounts_metadata_only', true,
    'runtime_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(component_code_snapshot)) > 0),
  check (length(trim(component_name_snapshot)) > 0),
  check (length(trim(category_snapshot)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_batch_id uuid not null references public.hr_payroll_batches(id) on delete restrict,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid references public.hr_employment_profiles(id) on delete restrict,
  snapshot_kind public.hr_payroll_snapshot_kind not null,
  source_engine public.hr_payroll_snapshot_source_engine not null,
  source_record_id uuid not null,
  source_version_id uuid,
  effective_date_used date not null,
  payload jsonb not null default '{}'::jsonb,
  checksum_readiness text,
  lock_status public.hr_payroll_snapshot_lock_status not null default 'snapshot_created',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'immutable_after_snapshot_stage', true,
    'live_source_querying_forbidden', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_batch_id uuid not null references public.hr_payroll_batches(id) on delete restrict,
  payslip_id uuid references public.hr_payslips(id) on delete restrict,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  exception_type public.hr_payroll_exception_type not null,
  severity public.hr_payroll_exception_severity not null default 'medium',
  status public.hr_payroll_exception_status not null default 'open',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'resolver_runtime_implemented', false
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

create table public.hr_payroll_locks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_batch_id uuid references public.hr_payroll_batches(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  payslip_id uuid references public.hr_payslips(id) on delete restrict,
  lock_level public.hr_payroll_lock_level not null default 'unlocked',
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'retro_adjustment_after_payroll_locked', true,
    'destructive_changes_after_payroll_locked', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (
    payroll_batch_id is not null
    or payroll_period_id is not null
    or payslip_id is not null
  ),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_retro_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  original_payslip_id uuid not null references public.hr_payslips(id) on delete restrict,
  correction_batch_id uuid not null references public.hr_payroll_batches(id) on delete restrict,
  affected_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  reason text,
  source_reference text,
  status public.hr_retro_adjustment_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'runtime_calculation_implemented', false
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

create table public.hr_payroll_posting_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_batch_id uuid not null references public.hr_payroll_batches(id) on delete restrict,
  posting_status public.hr_payroll_posting_status not null default 'not_ready',
  posting_reference text,
  journal_readiness jsonb not null default jsonb_build_object('ready', true, 'finance_posting_implemented', false),
  cost_center_distribution_readiness jsonb not null default jsonb_build_object('ready', true, 'finance_posting_implemented', false),
  employer_cost_readiness jsonb not null default jsonb_build_object('ready', true, 'finance_posting_implemented', false),
  employee_cost_readiness jsonb not null default jsonb_build_object('ready', true, 'finance_posting_implemented', false),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'finance_posting_implemented', false,
    'bank_payment_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(journal_readiness) = 'object'),
  check (jsonb_typeof(cost_center_distribution_readiness) = 'object'),
  check (jsonb_typeof(employer_cost_readiness) = 'object'),
  check (jsonb_typeof(employee_cost_readiness) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_calendars_code_uq
  on public.hr_payroll_calendars (tenant_id, company_id, code)
  where deleted_at is null;

create unique index hr_payroll_periods_calendar_code_uq
  on public.hr_payroll_periods (tenant_id, payroll_calendar_id, period_code)
  where deleted_at is null;

create unique index hr_payroll_groups_code_uq
  on public.hr_payroll_groups (tenant_id, company_id, code)
  where deleted_at is null;

create index hr_payroll_batches_period_group_idx
  on public.hr_payroll_batches (tenant_id, payroll_period_id, payroll_group_id, status)
  where deleted_at is null;

create index hr_payslips_batch_employee_idx
  on public.hr_payslips (tenant_id, payroll_batch_id, employee_id, status)
  where deleted_at is null;

create index hr_payslip_lines_payslip_idx
  on public.hr_payslip_lines (tenant_id, payslip_id, display_order)
  where deleted_at is null;

create index hr_payroll_snapshots_batch_kind_idx
  on public.hr_payroll_snapshots (tenant_id, payroll_batch_id, snapshot_kind, source_engine)
  where deleted_at is null;

create index hr_payroll_snapshots_source_idx
  on public.hr_payroll_snapshots (tenant_id, source_engine, source_record_id, effective_date_used)
  where deleted_at is null;

create index hr_payroll_exceptions_batch_idx
  on public.hr_payroll_exceptions (tenant_id, payroll_batch_id, exception_type, status)
  where deleted_at is null;

create unique index hr_payroll_posting_refs_batch_uq
  on public.hr_payroll_posting_refs (tenant_id, payroll_batch_id)
  where deleted_at is null;

create or replace function public.prevent_hr_payroll_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_status public.hr_payroll_batch_status;
begin
  if tg_op = 'DELETE' and old.deleted_at is null then
    raise exception 'HR payroll snapshots are immutable after snapshot stage; snapshots cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' then
    select b.status
      into batch_status
    from public.hr_payroll_batches b
    where b.id = old.payroll_batch_id;

    if old.lock_status in ('snapshot_locked', 'snapshot_superseded')
      or batch_status not in ('draft', 'collect_inputs', 'snapshot')
    then
      if old.snapshot_kind is distinct from new.snapshot_kind
        or old.source_engine is distinct from new.source_engine
        or old.source_record_id is distinct from new.source_record_id
        or old.source_version_id is distinct from new.source_version_id
        or old.effective_date_used is distinct from new.effective_date_used
        or old.payload is distinct from new.payload
        or old.checksum_readiness is distinct from new.checksum_readiness
      then
        raise exception 'HR payroll snapshots are immutable after snapshot stage; create a correction batch instead.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_payroll_snapshot_mutation() from public;
grant execute on function public.prevent_hr_payroll_snapshot_mutation() to authenticated;

drop trigger if exists hr_payroll_snapshots_prevent_mutation on public.hr_payroll_snapshots;
create trigger hr_payroll_snapshots_prevent_mutation
  before update or delete on public.hr_payroll_snapshots
  for each row execute function public.prevent_hr_payroll_snapshot_mutation();

drop trigger if exists hr_payroll_calendars_touch_updated_at on public.hr_payroll_calendars;
create trigger hr_payroll_calendars_touch_updated_at before update on public.hr_payroll_calendars for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_periods_touch_updated_at on public.hr_payroll_periods;
create trigger hr_payroll_periods_touch_updated_at before update on public.hr_payroll_periods for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_groups_touch_updated_at on public.hr_payroll_groups;
create trigger hr_payroll_groups_touch_updated_at before update on public.hr_payroll_groups for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_batches_touch_updated_at on public.hr_payroll_batches;
create trigger hr_payroll_batches_touch_updated_at before update on public.hr_payroll_batches for each row execute function public.touch_platform_row();
drop trigger if exists hr_payslips_touch_updated_at on public.hr_payslips;
create trigger hr_payslips_touch_updated_at before update on public.hr_payslips for each row execute function public.touch_platform_row();
drop trigger if exists hr_payslip_lines_touch_updated_at on public.hr_payslip_lines;
create trigger hr_payslip_lines_touch_updated_at before update on public.hr_payslip_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_snapshots_touch_updated_at on public.hr_payroll_snapshots;
create trigger hr_payroll_snapshots_touch_updated_at before update on public.hr_payroll_snapshots for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_exceptions_touch_updated_at on public.hr_payroll_exceptions;
create trigger hr_payroll_exceptions_touch_updated_at before update on public.hr_payroll_exceptions for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_locks_touch_updated_at on public.hr_payroll_locks;
create trigger hr_payroll_locks_touch_updated_at before update on public.hr_payroll_locks for each row execute function public.touch_platform_row();
drop trigger if exists hr_retro_adjustments_touch_updated_at on public.hr_retro_adjustments;
create trigger hr_retro_adjustments_touch_updated_at before update on public.hr_retro_adjustments for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_posting_refs_touch_updated_at on public.hr_payroll_posting_refs;
create trigger hr_payroll_posting_refs_touch_updated_at before update on public.hr_payroll_posting_refs for each row execute function public.touch_platform_row();

alter table public.hr_payroll_calendars enable row level security;
alter table public.hr_payroll_periods enable row level security;
alter table public.hr_payroll_groups enable row level security;
alter table public.hr_payroll_batches enable row level security;
alter table public.hr_payslips enable row level security;
alter table public.hr_payslip_lines enable row level security;
alter table public.hr_payroll_snapshots enable row level security;
alter table public.hr_payroll_exceptions enable row level security;
alter table public.hr_payroll_locks enable row level security;
alter table public.hr_retro_adjustments enable row level security;
alter table public.hr_payroll_posting_refs enable row level security;

alter table public.hr_payroll_calendars force row level security;
alter table public.hr_payroll_periods force row level security;
alter table public.hr_payroll_groups force row level security;
alter table public.hr_payroll_batches force row level security;
alter table public.hr_payslips force row level security;
alter table public.hr_payslip_lines force row level security;
alter table public.hr_payroll_snapshots force row level security;
alter table public.hr_payroll_exceptions force row level security;
alter table public.hr_payroll_locks force row level security;
alter table public.hr_retro_adjustments force row level security;
alter table public.hr_payroll_posting_refs force row level security;

create policy hr_payroll_calendars_select on public.hr_payroll_calendars for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_calendars_manage on public.hr_payroll_calendars for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_periods_select on public.hr_payroll_periods for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_periods_manage on public.hr_payroll_periods for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_groups_select on public.hr_payroll_groups for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_groups_manage on public.hr_payroll_groups for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_batches_select on public.hr_payroll_batches for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll_batches.view', tenant_id));
create policy hr_payroll_batches_manage on public.hr_payroll_batches for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_batches.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_batches.manage', tenant_id));

create policy hr_payslips_select on public.hr_payslips for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payslips.view', tenant_id));
create policy hr_payslips_manage on public.hr_payslips for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payslips.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payslips.manage', tenant_id));

create policy hr_payslip_lines_select on public.hr_payslip_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payslips.view', tenant_id));
create policy hr_payslip_lines_manage on public.hr_payslip_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payslips.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payslips.manage', tenant_id));

create policy hr_payroll_snapshots_select on public.hr_payroll_snapshots for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll_snapshots.view', tenant_id));
create policy hr_payroll_snapshots_manage on public.hr_payroll_snapshots for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_snapshots.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_snapshots.manage', tenant_id));

create policy hr_payroll_exceptions_select on public.hr_payroll_exceptions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll_exceptions.view', tenant_id));
create policy hr_payroll_exceptions_manage on public.hr_payroll_exceptions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_exceptions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_exceptions.manage', tenant_id));

create policy hr_payroll_locks_select on public.hr_payroll_locks for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_locks_manage on public.hr_payroll_locks for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_locks.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_locks.manage', tenant_id));

create policy hr_retro_adjustments_select on public.hr_retro_adjustments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll_batches.view', tenant_id));
create policy hr_retro_adjustments_manage on public.hr_retro_adjustments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_batches.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_batches.manage', tenant_id));

create policy hr_payroll_posting_refs_select on public.hr_payroll_posting_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_posting_refs_manage on public.hr_payroll_posting_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll_posting.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll_posting.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payroll.view', 'View HR Payroll', 'Allows viewing payroll calendars, periods, and groups.', 'high'),
  ('hr.payroll.manage', 'Manage HR Payroll', 'Allows managing payroll calendar and period foundation records.', 'critical'),
  ('hr.payroll_batches.view', 'View Payroll Batches', 'Allows viewing payroll batch foundation records.', 'high'),
  ('hr.payroll_batches.manage', 'Manage Payroll Batches', 'Allows managing payroll batch lifecycle foundation records.', 'critical'),
  ('hr.payslips.view', 'View Payslips', 'Allows viewing payslip foundation records.', 'high'),
  ('hr.payslips.manage', 'Manage Payslips', 'Allows managing payslip foundation records.', 'critical'),
  ('hr.payroll_snapshots.view', 'View Payroll Snapshots', 'Allows viewing immutable payroll snapshot records.', 'high'),
  ('hr.payroll_snapshots.manage', 'Manage Payroll Snapshots', 'Allows creating payroll snapshots during input collection.', 'critical'),
  ('hr.payroll_locks.manage', 'Manage Payroll Locks', 'Allows managing payroll lock readiness records.', 'critical'),
  ('hr.payroll_exceptions.view', 'View Payroll Exceptions', 'Allows viewing payroll exception foundation records.', 'high'),
  ('hr.payroll_exceptions.manage', 'Manage Payroll Exceptions', 'Allows managing payroll exception readiness records.', 'critical'),
  ('hr.payroll_posting.manage', 'Manage Payroll Posting Readiness', 'Allows managing payroll posting readiness references without finance posting.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payroll.view',
  'hr.payroll.manage',
  'hr.payroll_batches.view',
  'hr.payroll_batches.manage',
  'hr.payslips.view',
  'hr.payslips.manage',
  'hr.payroll_snapshots.view',
  'hr.payroll_snapshots.manage',
  'hr.payroll_locks.manage',
  'hr.payroll_exceptions.view',
  'hr.payroll_exceptions.manage',
  'hr.payroll_posting.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
