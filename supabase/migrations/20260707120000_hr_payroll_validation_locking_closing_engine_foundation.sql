-- Nexora HR Payroll Validation, Locking & Closing Engine Foundation.
-- Controls payroll lifecycle after calculation. Independent from calculation engine.
-- No localization, accounting posting, bank files, payslip PDF, payroll UI, or ESS portal.

alter type public.hr_payroll_exception_type add value if not exists 'missing_approval';
alter type public.hr_payroll_exception_type add value if not exists 'invalid_assignment';
alter type public.hr_payroll_exception_type add value if not exists 'invalid_contract';
alter type public.hr_payroll_exception_type add value if not exists 'missing_cost_center';
alter type public.hr_payroll_exception_type add value if not exists 'missing_currency';
alter type public.hr_payroll_exception_type add value if not exists 'manual_exception';

alter type public.hr_payroll_runtime_lock_scope add value if not exists 'payroll_run';
alter type public.hr_payroll_runtime_lock_scope add value if not exists 'payroll_result';
alter type public.hr_payroll_runtime_lock_scope add value if not exists 'payslip';

create type public.hr_payroll_runtime_lock_reason as enum (
  'validation',
  'approval',
  'published',
  'closed',
  'manual_lock'
);

create type public.hr_payroll_validation_category as enum (
  'employee',
  'payroll_run',
  'payroll_period',
  'component',
  'snapshot',
  'input',
  'approval',
  'finance_readiness'
);

create type public.hr_payroll_validation_severity as enum (
  'information',
  'warning',
  'error',
  'blocking'
);

create type public.hr_payroll_exception_resolution_type as enum (
  'resolved',
  'dismissed',
  'waived',
  'deferred',
  'cancelled'
);

create type public.hr_payroll_approval_gate_status as enum (
  'ready_for_approval',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'returned'
);

create type public.hr_payroll_close_target as enum (
  'payroll_run',
  'payroll_period'
);

create type public.hr_payroll_reopen_target as enum (
  'payroll_run',
  'payroll_period'
);

create type public.hr_payroll_reopen_approval_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled'
);

alter table public.hr_payroll_exceptions
  add column if not exists assigned_to uuid references auth.users(id),
  add column if not exists resolution_notes text,
  add column if not exists resolution_date timestamptz,
  add column if not exists resolution_type public.hr_payroll_exception_resolution_type,
  add column if not exists payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict;

alter table public.hr_payroll_runtime_locks
  add column if not exists lock_reason public.hr_payroll_runtime_lock_reason not null default 'validation',
  add column if not exists payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict,
  add column if not exists payslip_id uuid references public.hr_payslips(id) on delete restrict,
  add column if not exists correlation_id text;

create table public.hr_payroll_validation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  rule_code text not null,
  rule_name text not null,
  rule_category public.hr_payroll_validation_category not null,
  severity public.hr_payroll_validation_severity not null default 'error',
  condition jsonb not null default '{}'::jsonb,
  recommendation text,
  auto_resolvable boolean not null default false,
  status public.hr_payroll_calculation_rule_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'validation_foundation_only', true,
    'country_specific_rule_implemented', false,
    'automatic_correction_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (rule_code = upper(rule_code)),
  check (length(trim(rule_name)) > 0),
  check (jsonb_typeof(condition) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_validation_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  validation_rule_id uuid references public.hr_payroll_validation_rules(id) on delete restrict,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  correlation_id text not null,
  rule_category public.hr_payroll_validation_category not null,
  severity public.hr_payroll_validation_severity not null,
  message text not null,
  blocking boolean not null default false,
  recommendation text,
  status public.hr_payroll_exception_status not null default 'open',
  metadata jsonb not null default jsonb_build_object(
    'validation_foundation_only', true,
    'validation_runtime_implemented', false
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
  check (length(trim(message)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_closing_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  close_target public.hr_payroll_close_target not null,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  correlation_id text not null,
  actor_id uuid references auth.users(id),
  previous_state text not null,
  new_state text not null,
  freeze_results boolean not null default true,
  freeze_payslips boolean not null default true,
  freeze_snapshots boolean not null default true,
  freeze_inputs boolean not null default true,
  closed_at timestamptz not null default now(),
  irreversible_without_reopen boolean not null default true,
  reason text,
  metadata jsonb not null default jsonb_build_object(
    'validation_foundation_only', true,
    'closing_runtime_implemented', false
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
    payroll_run_id is not null
    or payroll_period_id is not null
  ),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_reopen_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  reopen_target public.hr_payroll_reopen_target not null,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  correlation_id text not null,
  reason text not null,
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approval_status public.hr_payroll_reopen_approval_status not null default 'draft',
  approval_gate_status public.hr_payroll_approval_gate_status not null default 'submitted',
  impact_summary jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'validation_foundation_only', true,
    'reopen_runtime_implemented', false,
    'fully_auditable', true
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
    payroll_run_id is not null
    or payroll_period_id is not null
  ),
  check (length(trim(correlation_id)) > 0),
  check (length(trim(reason)) > 0),
  check (jsonb_typeof(impact_summary) = 'object'),
  check (jsonb_typeof(audit_trail) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_validation_rules_code_uq
  on public.hr_payroll_validation_rules (tenant_id, company_id, rule_code)
  where deleted_at is null;

create index hr_payroll_validation_results_run_idx
  on public.hr_payroll_validation_results (tenant_id, payroll_run_id, severity, blocking, status)
  where deleted_at is null;

create index hr_payroll_validation_results_correlation_idx
  on public.hr_payroll_validation_results (tenant_id, correlation_id, rule_category)
  where deleted_at is null;

create index hr_payroll_closing_history_target_idx
  on public.hr_payroll_closing_history (tenant_id, close_target, payroll_run_id, payroll_period_id, closed_at)
  where deleted_at is null;

create index hr_payroll_reopen_requests_target_idx
  on public.hr_payroll_reopen_requests (tenant_id, reopen_target, approval_status, payroll_run_id)
  where deleted_at is null;

create index hr_payroll_exceptions_resolution_idx
  on public.hr_payroll_exceptions (tenant_id, assigned_to, resolution_type, status)
  where deleted_at is null;

create index hr_payroll_runtime_locks_reason_idx
  on public.hr_payroll_runtime_locks (tenant_id, lock_scope, lock_reason, payroll_run_id)
  where deleted_at is null;

drop trigger if exists hr_payroll_validation_rules_touch_updated_at on public.hr_payroll_validation_rules;
create trigger hr_payroll_validation_rules_touch_updated_at before update on public.hr_payroll_validation_rules for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_validation_results_touch_updated_at on public.hr_payroll_validation_results;
create trigger hr_payroll_validation_results_touch_updated_at before update on public.hr_payroll_validation_results for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_closing_history_touch_updated_at on public.hr_payroll_closing_history;
create trigger hr_payroll_closing_history_touch_updated_at before update on public.hr_payroll_closing_history for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_reopen_requests_touch_updated_at on public.hr_payroll_reopen_requests;
create trigger hr_payroll_reopen_requests_touch_updated_at before update on public.hr_payroll_reopen_requests for each row execute function public.touch_platform_row();

alter table public.hr_payroll_validation_rules enable row level security;
alter table public.hr_payroll_validation_results enable row level security;
alter table public.hr_payroll_closing_history enable row level security;
alter table public.hr_payroll_reopen_requests enable row level security;

alter table public.hr_payroll_validation_rules force row level security;
alter table public.hr_payroll_validation_results force row level security;
alter table public.hr_payroll_closing_history force row level security;
alter table public.hr_payroll_reopen_requests force row level security;

create policy hr_payroll_validation_rules_select on public.hr_payroll_validation_rules for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_validation_rules_manage on public.hr_payroll_validation_rules for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_validation_results_select on public.hr_payroll_validation_results for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.validate', tenant_id));
create policy hr_payroll_validation_results_manage on public.hr_payroll_validation_results for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.validate', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.validate', tenant_id));

create policy hr_payroll_closing_history_select on public.hr_payroll_closing_history for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_closing_history_close on public.hr_payroll_closing_history for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.close', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.close', tenant_id));

create policy hr_payroll_reopen_requests_select on public.hr_payroll_reopen_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_reopen_requests_manage on public.hr_payroll_reopen_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.reopen', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.reopen', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payroll.validate', 'Validate Payroll', 'Allows executing payroll validation foundation contracts.', 'critical'),
  ('hr.payroll.lock', 'Lock Payroll Records', 'Allows locking payroll runtime records during validation and approval.', 'critical'),
  ('hr.payroll.unlock', 'Unlock Payroll Records', 'Allows unlocking payroll runtime records through controlled contracts.', 'critical'),
  ('hr.payroll.close', 'Close Payroll', 'Allows closing payroll runs and periods.', 'critical'),
  ('hr.payroll.reopen', 'Reopen Payroll', 'Allows controlled payroll reopen requests.', 'critical'),
  ('hr.payroll.exception.manage', 'Manage Payroll Exceptions', 'Allows managing payroll validation exceptions without automatic correction.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payroll.validate',
  'hr.payroll.lock',
  'hr.payroll.unlock',
  'hr.payroll.close',
  'hr.payroll.reopen',
  'hr.payroll.exception.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
