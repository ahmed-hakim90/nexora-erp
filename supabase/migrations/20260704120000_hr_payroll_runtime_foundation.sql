-- Nexora HR Payroll Runtime Foundation.
-- First HR runtime layer. Consumes HR Foundation data without duplication.
-- No country-specific localization, GOSI, taxes, social insurance, EOS statutory
-- calculation, accounting postings, payslip PDF rendering, or payroll UI runtime.

alter table public.hr_employees
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists hr_employees_user_idx
  on public.hr_employees (tenant_id, user_id)
  where deleted_at is null and user_id is not null;

alter type public.hr_payroll_frequency add value if not exists 'semi_monthly';

alter table public.hr_payroll_periods
  add column if not exists cutoff_date date;

update public.hr_payroll_periods
set cutoff_date = end_date
where cutoff_date is null;

alter table public.hr_payroll_periods
  alter column cutoff_date set not null;

create type public.hr_payroll_run_type as enum (
  'regular',
  'off_cycle',
  'bonus',
  'adjustment',
  'final_settlement',
  'retroactive'
);

create type public.hr_payroll_run_status as enum (
  'draft',
  'validating',
  'ready',
  'processing',
  'completed',
  'under_approval',
  'approved',
  'paid',
  'cancelled',
  'failed'
);

create type public.hr_payroll_runtime_payslip_status as enum (
  'draft',
  'generated',
  'approved',
  'published',
  'cancelled'
);

create type public.hr_payroll_result_component_type as enum (
  'earning',
  'deduction',
  'employer_contribution',
  'benefit',
  'informational'
);

create type public.hr_payroll_result_component_source as enum (
  'contract',
  'assignment',
  'attendance',
  'leave',
  'overtime',
  'penalty',
  'loan',
  'manual_adjustment',
  'payroll_policy'
);

create type public.hr_payroll_posting_line_type as enum (
  'salary_expense',
  'allowance_expense',
  'deduction_liability',
  'employee_payable',
  'employer_contribution',
  'cost_center_allocation'
);

create type public.hr_payroll_retro_detection_type as enum (
  'salary_change_after_closed_period',
  'backdated_assignment',
  'backdated_attendance_correction',
  'backdated_leave_approval',
  'backdated_penalty'
);

create type public.hr_payroll_readiness_status as enum (
  'draft',
  'detected',
  'pending_review',
  'ready',
  'applied',
  'dismissed',
  'cancelled'
);

create table public.hr_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  payroll_group_id uuid not null references public.hr_payroll_groups(id) on delete restrict,
  payroll_batch_id uuid references public.hr_payroll_batches(id) on delete restrict,
  run_type public.hr_payroll_run_type not null default 'regular',
  status public.hr_payroll_run_status not null default 'draft',
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'payroll_calculation_implemented', false,
    'country_localization_implemented', false
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

alter table public.hr_payslips
  add column if not exists payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  add column if not exists runtime_payslip_status public.hr_payroll_runtime_payslip_status;

create unique index hr_payroll_runs_period_group_type_uq
  on public.hr_payroll_runs (tenant_id, payroll_period_id, payroll_group_id, run_type)
  where deleted_at is null and status not in ('cancelled', 'failed') and run_type = 'regular';

create table public.hr_payroll_employee_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  contract_id uuid references public.hr_contracts(id) on delete restrict,
  position_id uuid references public.hr_positions(id) on delete restrict,
  job_id uuid references public.hr_jobs(id) on delete restrict,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  cost_center_id uuid,
  payroll_group_id uuid references public.hr_payroll_groups(id) on delete restrict,
  basic_salary numeric(18, 4),
  salary_components jsonb not null default '[]'::jsonb,
  attendance_summary jsonb not null default '{}'::jsonb,
  leave_summary jsonb not null default '{}'::jsonb,
  overtime_summary jsonb not null default '{}'::jsonb,
  penalties_summary jsonb not null default '{}'::jsonb,
  loan_advance_summary jsonb not null default '{}'::jsonb,
  immutable_after_approval boolean not null default false,
  snapshot_locked_at timestamptz,
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'consumes_hr_foundation_only', true,
    'duplicates_employee_compensation', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(salary_components) = 'array'),
  check (jsonb_typeof(attendance_summary) = 'object'),
  check (jsonb_typeof(leave_summary) = 'object'),
  check (jsonb_typeof(overtime_summary) = 'object'),
  check (jsonb_typeof(penalties_summary) = 'object'),
  check (jsonb_typeof(loan_advance_summary) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  employee_snapshot_id uuid not null references public.hr_payroll_employee_snapshots(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  gross_earnings numeric(18, 4) not null default 0,
  total_deductions numeric(18, 4) not null default 0,
  total_employer_contributions numeric(18, 4) not null default 0,
  net_pay numeric(18, 4) not null default 0,
  currency text not null default 'USD',
  status public.hr_payroll_run_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'statutory_calculation_implemented', false,
    'country_localization_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (gross_earnings >= 0),
  check (total_deductions >= 0),
  check (total_employer_contributions >= 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_result_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_result_id uuid not null references public.hr_payroll_results(id) on delete restrict,
  component_code text not null,
  component_name text not null,
  component_type public.hr_payroll_result_component_type not null,
  source public.hr_payroll_result_component_source not null,
  amount numeric(18, 4) not null default 0,
  quantity numeric(18, 4),
  rate numeric(18, 6),
  currency text not null default 'USD',
  calculation_metadata jsonb not null default '{}'::jsonb,
  display_order integer not null default 100 check (display_order >= 0),
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'calculation_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(component_code)) > 0),
  check (length(trim(component_name)) > 0),
  check (jsonb_typeof(calculation_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_posting_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict,
  posting_line_type public.hr_payroll_posting_line_type not null,
  amount numeric(18, 4) not null default 0,
  cost_center_id uuid,
  currency text not null default 'USD',
  status public.hr_payroll_readiness_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'journal_posting_implemented', false,
    'accounting_runtime_implemented', false
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

create table public.hr_payroll_retro_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  affected_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  detection_type public.hr_payroll_retro_detection_type not null,
  source_record_id uuid,
  source_reference text,
  status public.hr_payroll_readiness_status not null default 'detected',
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'retro_calculation_implemented', false
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

create table public.hr_final_settlement_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  last_working_day date not null,
  unpaid_salary numeric(18, 4) not null default 0,
  leave_balance_payout numeric(18, 4) not null default 0,
  loan_balance numeric(18, 4) not null default 0,
  advances numeric(18, 4) not null default 0,
  penalties numeric(18, 4) not null default 0,
  end_of_service_placeholder numeric(18, 4) not null default 0,
  currency text not null default 'USD',
  status public.hr_payroll_readiness_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'runtime_foundation_only', true,
    'statutory_eos_calculation_implemented', false,
    'country_localization_implemented', false
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

create unique index hr_payroll_employee_snapshots_run_employee_uq
  on public.hr_payroll_employee_snapshots (tenant_id, payroll_run_id, employee_id)
  where deleted_at is null;

create unique index hr_payroll_results_run_employee_uq
  on public.hr_payroll_results (tenant_id, payroll_run_id, employee_id)
  where deleted_at is null;

create index hr_payroll_result_components_result_idx
  on public.hr_payroll_result_components (tenant_id, payroll_result_id, component_type, source)
  where deleted_at is null;

create index hr_payroll_posting_readiness_run_idx
  on public.hr_payroll_posting_readiness (tenant_id, payroll_run_id, posting_line_type, status)
  where deleted_at is null;

create index hr_payroll_retro_readiness_employee_idx
  on public.hr_payroll_retro_readiness (tenant_id, employee_id, detection_type, status)
  where deleted_at is null;

create index hr_final_settlement_readiness_employee_idx
  on public.hr_final_settlement_readiness (tenant_id, employee_id, status)
  where deleted_at is null;

create or replace function public.prevent_hr_payroll_employee_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  run_status public.hr_payroll_run_status;
begin
  if tg_op = 'DELETE' and old.deleted_at is null and old.immutable_after_approval = true then
    raise exception 'HR payroll employee snapshots are immutable after payroll run approval.';
  end if;

  if tg_op = 'UPDATE' then
    select r.status
      into run_status
    from public.hr_payroll_runs r
    where r.id = old.payroll_run_id;

    if old.immutable_after_approval = true
      or run_status in ('approved', 'paid', 'completed')
    then
      if old.employee_id is distinct from new.employee_id
        or old.employment_profile_id is distinct from new.employment_profile_id
        or old.contract_id is distinct from new.contract_id
        or old.position_id is distinct from new.position_id
        or old.job_id is distinct from new.job_id
        or old.basic_salary is distinct from new.basic_salary
        or old.salary_components is distinct from new.salary_components
        or old.attendance_summary is distinct from new.attendance_summary
        or old.leave_summary is distinct from new.leave_summary
        or old.overtime_summary is distinct from new.overtime_summary
        or old.penalties_summary is distinct from new.penalties_summary
        or old.loan_advance_summary is distinct from new.loan_advance_summary
      then
        raise exception 'HR payroll employee snapshots are immutable after payroll run approval.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_payroll_employee_snapshot_mutation() from public;
grant execute on function public.prevent_hr_payroll_employee_snapshot_mutation() to authenticated;

drop trigger if exists hr_payroll_employee_snapshots_prevent_mutation on public.hr_payroll_employee_snapshots;
create trigger hr_payroll_employee_snapshots_prevent_mutation
  before update or delete on public.hr_payroll_employee_snapshots
  for each row execute function public.prevent_hr_payroll_employee_snapshot_mutation();

drop trigger if exists hr_payroll_runs_touch_updated_at on public.hr_payroll_runs;
create trigger hr_payroll_runs_touch_updated_at before update on public.hr_payroll_runs for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_employee_snapshots_touch_updated_at on public.hr_payroll_employee_snapshots;
create trigger hr_payroll_employee_snapshots_touch_updated_at before update on public.hr_payroll_employee_snapshots for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_results_touch_updated_at on public.hr_payroll_results;
create trigger hr_payroll_results_touch_updated_at before update on public.hr_payroll_results for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_result_components_touch_updated_at on public.hr_payroll_result_components;
create trigger hr_payroll_result_components_touch_updated_at before update on public.hr_payroll_result_components for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_posting_readiness_touch_updated_at on public.hr_payroll_posting_readiness;
create trigger hr_payroll_posting_readiness_touch_updated_at before update on public.hr_payroll_posting_readiness for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_retro_readiness_touch_updated_at on public.hr_payroll_retro_readiness;
create trigger hr_payroll_retro_readiness_touch_updated_at before update on public.hr_payroll_retro_readiness for each row execute function public.touch_platform_row();
drop trigger if exists hr_final_settlement_readiness_touch_updated_at on public.hr_final_settlement_readiness;
create trigger hr_final_settlement_readiness_touch_updated_at before update on public.hr_final_settlement_readiness for each row execute function public.touch_platform_row();

alter table public.hr_payroll_runs enable row level security;
alter table public.hr_payroll_employee_snapshots enable row level security;
alter table public.hr_payroll_results enable row level security;
alter table public.hr_payroll_result_components enable row level security;
alter table public.hr_payroll_posting_readiness enable row level security;
alter table public.hr_payroll_retro_readiness enable row level security;
alter table public.hr_final_settlement_readiness enable row level security;

alter table public.hr_payroll_runs force row level security;
alter table public.hr_payroll_employee_snapshots force row level security;
alter table public.hr_payroll_results force row level security;
alter table public.hr_payroll_result_components force row level security;
alter table public.hr_payroll_posting_readiness force row level security;
alter table public.hr_payroll_retro_readiness force row level security;
alter table public.hr_final_settlement_readiness force row level security;

create policy hr_payroll_runs_select on public.hr_payroll_runs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_runs_manage on public.hr_payroll_runs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id));
create policy hr_payroll_runs_approve on public.hr_payroll_runs for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.approve', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.approve', tenant_id));

create policy hr_payroll_employee_snapshots_select on public.hr_payroll_employee_snapshots for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_employee_snapshots_manage on public.hr_payroll_employee_snapshots for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id));

create policy hr_payroll_results_select on public.hr_payroll_results for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_results_manage on public.hr_payroll_results for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id));

create policy hr_payroll_result_components_select on public.hr_payroll_result_components for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_result_components_manage on public.hr_payroll_result_components for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id));

create policy hr_payroll_posting_readiness_select on public.hr_payroll_posting_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_posting_readiness_manage on public.hr_payroll_posting_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_retro_readiness_select on public.hr_payroll_retro_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_retro_readiness_manage on public.hr_payroll_retro_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_final_settlement_readiness_select on public.hr_final_settlement_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_final_settlement_readiness_manage on public.hr_final_settlement_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.run', tenant_id));

create policy hr_payslips_self_select on public.hr_payslips for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_payslips.tenant_id
        and e.deleted_at is null
    )
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payroll.run', 'Run Payroll', 'Allows creating and executing payroll run foundation records without statutory calculation.', 'critical'),
  ('hr.payroll.approve', 'Approve Payroll', 'Allows approving payroll runs through workflow readiness contracts.', 'critical'),
  ('hr.payroll.publish', 'Publish Payroll', 'Allows publishing approved payroll results readiness records.', 'critical'),
  ('hr.payslips.view_self', 'View Own Payslips', 'Allows employees to view their own payslip foundation records.', 'high'),
  ('hr.payslips.publish', 'Publish Payslips', 'Allows publishing payslip readiness records without PDF rendering.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payroll.run',
  'hr.payroll.approve',
  'hr.payroll.publish',
  'hr.payslips.view_self',
  'hr.payslips.publish'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
