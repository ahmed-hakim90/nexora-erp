-- Nexora HR Payroll Inputs & Adjustments Runtime Foundation.
-- Collects, validates, locks, and supplies payroll inputs before calculation.
-- No payroll calculation engine, localization, tax, insurance, EOS, accounting,
-- bank files, payslip PDF, or payroll UI runtime.

alter type public.hr_payroll_exception_type add value if not exists 'missing_attendance';
alter type public.hr_payroll_exception_type add value if not exists 'missing_payroll_group';
alter type public.hr_payroll_exception_type add value if not exists 'missing_salary_component';
alter type public.hr_payroll_exception_type add value if not exists 'duplicate_input';
alter type public.hr_payroll_exception_type add value if not exists 'closed_payroll_period';
alter type public.hr_payroll_exception_type add value if not exists 'employee_terminated';
alter type public.hr_payroll_exception_type add value if not exists 'employee_suspended';

create type public.hr_payroll_input_kind as enum (
  'manual_adjustment',
  'allowance_adjustment',
  'deduction_adjustment',
  'bonus',
  'commission',
  'incentive',
  'overtime',
  'attendance_summary',
  'leave_summary',
  'penalty_summary',
  'loan_installment',
  'advance_installment',
  'benefit_adjustment',
  'retro_adjustment'
);

create type public.hr_payroll_input_source as enum (
  'hr_contract',
  'assignment_engine',
  'attendance_engine',
  'leave_engine',
  'compensation_foundation',
  'loan_foundation',
  'advance_foundation',
  'penalty_foundation',
  'manual_entry',
  'api_integration'
);

create type public.hr_payroll_input_status as enum (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'locked',
  'rejected',
  'cancelled'
);

create type public.hr_payroll_input_approval_status as enum (
  'not_required',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled'
);

create type public.hr_payroll_adjustment_kind as enum (
  'positive',
  'negative',
  'one_time',
  'recurring',
  'retroactive'
);

create type public.hr_payroll_runtime_lock_scope as enum (
  'employee',
  'payroll_period',
  'component',
  'input',
  'approval'
);

create type public.hr_payroll_recalculation_scope as enum (
  'employee',
  'payroll_group',
  'payroll_run'
);

create table public.hr_payroll_inputs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  input_kind public.hr_payroll_input_kind not null,
  source public.hr_payroll_input_source not null,
  effective_date date not null,
  status public.hr_payroll_input_status not null default 'draft',
  approval_status public.hr_payroll_input_approval_status not null default 'not_required',
  amount numeric(18, 4),
  quantity numeric(18, 4),
  currency text not null default 'USD',
  notes text,
  audit_metadata jsonb not null default '{}'::jsonb,
  source_record_id uuid,
  source_reference text,
  metadata jsonb not null default jsonb_build_object(
    'inputs_runtime_foundation_only', true,
    'duplicates_source_data', false,
    'payroll_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (amount is not null or quantity is not null),
  check (jsonb_typeof(audit_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_input_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_input_id uuid not null references public.hr_payroll_inputs(id) on delete restrict,
  source public.hr_payroll_input_source not null,
  source_engine_key text not null,
  source_record_id uuid not null,
  source_version_id uuid,
  effective_date_used date not null,
  payload_ref jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'inputs_runtime_foundation_only', true,
    'duplicates_source_data', false,
    'references_source_only', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(source_engine_key)) > 0),
  check (jsonb_typeof(payload_ref) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_input_id uuid references public.hr_payroll_inputs(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  payroll_period_id uuid not null references public.hr_payroll_periods(id) on delete restrict,
  adjustment_kind public.hr_payroll_adjustment_kind not null,
  amount numeric(18, 4) not null,
  currency text not null default 'USD',
  effective_date date not null,
  status public.hr_payroll_input_status not null default 'draft',
  approval_status public.hr_payroll_input_approval_status not null default 'not_required',
  notes text,
  metadata jsonb not null default jsonb_build_object(
    'inputs_runtime_foundation_only', true,
    'adjustment_runtime_implemented', false
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

alter table public.hr_payroll_exceptions
  alter column payroll_batch_id drop not null;

alter table public.hr_payroll_exceptions
  add column if not exists payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  add column if not exists payroll_input_id uuid references public.hr_payroll_inputs(id) on delete restrict,
  add column if not exists payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict;

alter table public.hr_payroll_exceptions
  add constraint hr_payroll_exceptions_context_check
    check (
      payroll_batch_id is not null
      or payroll_run_id is not null
      or payroll_input_id is not null
      or payroll_period_id is not null
    );

create table public.hr_payroll_runtime_locks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  lock_scope public.hr_payroll_runtime_lock_scope not null,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  payroll_input_id uuid references public.hr_payroll_inputs(id) on delete restrict,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  component_code text,
  locked_at timestamptz not null default now(),
  locked_by uuid references auth.users(id),
  prevents_modification_after_approval boolean not null default true,
  metadata jsonb not null default jsonb_build_object(
    'inputs_runtime_foundation_only', true,
    'lock_runtime_implemented', false
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
    employee_id is not null
    or payroll_period_id is not null
    or payroll_input_id is not null
    or payroll_run_id is not null
    or component_code is not null
  ),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_inputs_period_employee_kind_source_uq
  on public.hr_payroll_inputs (tenant_id, payroll_period_id, employee_id, input_kind, source, coalesce(source_record_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null and status not in ('cancelled', 'rejected');

create index hr_payroll_inputs_employee_period_idx
  on public.hr_payroll_inputs (tenant_id, employee_id, payroll_period_id, status, approval_status)
  where deleted_at is null;

create index hr_payroll_input_sources_input_idx
  on public.hr_payroll_input_sources (tenant_id, payroll_input_id, source, source_engine_key)
  where deleted_at is null;

create index hr_payroll_adjustments_employee_period_idx
  on public.hr_payroll_adjustments (tenant_id, employee_id, payroll_period_id, adjustment_kind, status)
  where deleted_at is null;

create index hr_payroll_exceptions_runtime_idx
  on public.hr_payroll_exceptions (tenant_id, payroll_run_id, payroll_input_id, exception_type, status)
  where deleted_at is null;

create index hr_payroll_runtime_locks_scope_idx
  on public.hr_payroll_runtime_locks (tenant_id, lock_scope, employee_id, payroll_period_id, payroll_input_id)
  where deleted_at is null;

create or replace function public.prevent_hr_payroll_input_mutation_after_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  input_locked boolean;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'locked' or old.approval_status = 'approved' then
      if old.input_kind is distinct from new.input_kind
        or old.source is distinct from new.source
        or old.effective_date is distinct from new.effective_date
        or old.amount is distinct from new.amount
        or old.quantity is distinct from new.quantity
        or old.currency is distinct from new.currency
        or old.notes is distinct from new.notes
      then
        raise exception 'HR payroll inputs are immutable after approval or lock.';
      end if;
    end if;

    select exists (
      select 1
      from public.hr_payroll_runtime_locks l
      where l.payroll_input_id = old.id
        and l.deleted_at is null
        and l.is_active = true
        and l.prevents_modification_after_approval = true
    ) into input_locked;

    if input_locked then
      raise exception 'HR payroll input is locked and cannot be modified.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_payroll_input_mutation_after_lock() from public;
grant execute on function public.prevent_hr_payroll_input_mutation_after_lock() to authenticated;

drop trigger if exists hr_payroll_inputs_prevent_mutation_after_lock on public.hr_payroll_inputs;
create trigger hr_payroll_inputs_prevent_mutation_after_lock
  before update on public.hr_payroll_inputs
  for each row execute function public.prevent_hr_payroll_input_mutation_after_lock();

drop trigger if exists hr_payroll_inputs_touch_updated_at on public.hr_payroll_inputs;
create trigger hr_payroll_inputs_touch_updated_at before update on public.hr_payroll_inputs for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_input_sources_touch_updated_at on public.hr_payroll_input_sources;
create trigger hr_payroll_input_sources_touch_updated_at before update on public.hr_payroll_input_sources for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_adjustments_touch_updated_at on public.hr_payroll_adjustments;
create trigger hr_payroll_adjustments_touch_updated_at before update on public.hr_payroll_adjustments for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_runtime_locks_touch_updated_at on public.hr_payroll_runtime_locks;
create trigger hr_payroll_runtime_locks_touch_updated_at before update on public.hr_payroll_runtime_locks for each row execute function public.touch_platform_row();

alter table public.hr_payroll_inputs enable row level security;
alter table public.hr_payroll_input_sources enable row level security;
alter table public.hr_payroll_adjustments enable row level security;
alter table public.hr_payroll_runtime_locks enable row level security;

alter table public.hr_payroll_inputs force row level security;
alter table public.hr_payroll_input_sources force row level security;
alter table public.hr_payroll_adjustments force row level security;
alter table public.hr_payroll_runtime_locks force row level security;

create policy hr_payroll_inputs_select on public.hr_payroll_inputs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_payroll_inputs_manage on public.hr_payroll_inputs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id));
create policy hr_payroll_inputs_self_select on public.hr_payroll_inputs for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_payroll_inputs.tenant_id
        and e.deleted_at is null
    )
  );

create policy hr_payroll_input_sources_select on public.hr_payroll_input_sources for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_payroll_input_sources_manage on public.hr_payroll_input_sources for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id));

create policy hr_payroll_adjustments_select on public.hr_payroll_adjustments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_payroll_adjustments_manage on public.hr_payroll_adjustments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.adjustments.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.adjustments.manage', tenant_id));

create policy hr_payroll_runtime_locks_select on public.hr_payroll_runtime_locks for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_payroll_runtime_locks_manage on public.hr_payroll_runtime_locks for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.locks.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.locks.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payroll.inputs.view', 'View Payroll Inputs', 'Allows viewing payroll input and adjustment runtime records.', 'high'),
  ('hr.payroll.inputs.manage', 'Manage Payroll Inputs', 'Allows managing payroll input runtime records.', 'critical'),
  ('hr.payroll.adjustments.manage', 'Manage Payroll Adjustments', 'Allows managing payroll adjustment runtime records.', 'critical'),
  ('hr.payroll.exceptions.view', 'View Payroll Runtime Exceptions', 'Allows viewing payroll input runtime exceptions.', 'high'),
  ('hr.payroll.locks.manage', 'Manage Payroll Runtime Locks', 'Allows managing payroll input runtime locks.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payroll.inputs.view',
  'hr.payroll.inputs.manage',
  'hr.payroll.adjustments.manage',
  'hr.payroll.exceptions.view',
  'hr.payroll.locks.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
