-- Nexora HR Payroll Calculation Engine Foundation.
-- Country-neutral calculation contracts. Consumes snapshots and approved inputs only.
-- No localization, tax, GOSI, insurance, EOS, accounting posting, payslip PDF, or payroll UI.

create type public.hr_payroll_calculation_rule_scope as enum (
  'employee',
  'payroll_group',
  'company',
  'branch',
  'component',
  'localization_pack'
);

create type public.hr_payroll_calculation_formula_type as enum (
  'fixed_amount',
  'percentage',
  'rate_quantity',
  'tiered',
  'conditional',
  'cap_floor',
  'proration'
);

create type public.hr_payroll_calculation_rule_status as enum (
  'draft',
  'active',
  'inactive',
  'archived'
);

create type public.hr_payroll_calculation_execution_status as enum (
  'started',
  'completed',
  'failed',
  'recalculated',
  'cancelled'
);

create type public.hr_payroll_rounding_method as enum (
  'half_up',
  'half_down',
  'half_even',
  'truncate',
  'ceiling',
  'floor'
);

create type public.hr_payroll_calculation_status as enum (
  'pending',
  'calculating',
  'calculated',
  'failed',
  'recalculated',
  'approved'
);

create table public.hr_payroll_calculation_rule_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  rule_set_code text not null,
  name text not null,
  description text,
  scope public.hr_payroll_calculation_rule_scope not null default 'company',
  priority integer not null default 100 check (priority >= 0),
  status public.hr_payroll_calculation_rule_status not null default 'draft',
  currency text not null default 'USD',
  metadata jsonb not null default jsonb_build_object(
    'calculation_foundation_only', true,
    'country_neutral', true,
    'localization_pack_implemented', false,
    'statutory_rules_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (rule_set_code = upper(rule_set_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  rule_set_id uuid not null references public.hr_payroll_calculation_rule_sets(id) on delete restrict,
  rule_code text not null,
  rule_name text not null,
  rule_scope public.hr_payroll_calculation_rule_scope not null default 'component',
  priority integer not null default 100 check (priority >= 0),
  component_code text,
  formula_key text not null,
  formula_type public.hr_payroll_calculation_formula_type not null,
  condition jsonb not null default '{}'::jsonb,
  depends_on_component_codes text[] not null default '{}'::text[],
  status public.hr_payroll_calculation_rule_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'calculation_foundation_only', true,
    'localization_rule_implemented', false,
    'hidden_calculation', false
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
  check (length(trim(formula_key)) > 0),
  check (jsonb_typeof(condition) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_calculation_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employee_snapshot_id uuid not null references public.hr_payroll_employee_snapshots(id) on delete restrict,
  payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict,
  rule_set_id uuid references public.hr_payroll_calculation_rule_sets(id) on delete restrict,
  correlation_id text not null,
  actor_id uuid references auth.users(id),
  calculation_date date not null,
  currency text not null default 'USD',
  status public.hr_payroll_calculation_execution_status not null default 'started',
  calculation_status public.hr_payroll_calculation_status not null default 'pending',
  execution_duration_ms integer check (execution_duration_ms is null or execution_duration_ms >= 0),
  gross_earnings numeric(18, 4),
  total_deductions numeric(18, 4),
  total_employer_contributions numeric(18, 4),
  net_pay numeric(18, 4),
  trace_summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'calculation_foundation_only', true,
    'reads_operational_tables_directly', false,
    'consumes_snapshots_and_approved_inputs_only', true,
    'statutory_calculation_implemented', false
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
  check (jsonb_typeof(trace_summary) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_calculation_traces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  calculation_execution_id uuid not null references public.hr_payroll_calculation_executions(id) on delete restrict,
  payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict,
  payroll_result_component_id uuid references public.hr_payroll_result_components(id) on delete restrict,
  rule_id uuid references public.hr_payroll_calculation_rules(id) on delete restrict,
  rule_version integer not null default 1 check (rule_version > 0),
  source_type text not null,
  source_id uuid,
  formula_key text not null,
  input_values jsonb not null default '{}'::jsonb,
  output_amount numeric(18, 4) not null default 0,
  rounding_method public.hr_payroll_rounding_method not null default 'half_up',
  calculation_timestamp timestamptz not null default now(),
  trace_metadata jsonb not null default jsonb_build_object(
    'traceable', true,
    'hidden_calculation', false,
    'localization_trace_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(source_type)) > 0),
  check (length(trim(formula_key)) > 0),
  check (jsonb_typeof(input_values) = 'object'),
  check (jsonb_typeof(trace_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_calculation_rule_sets_code_uq
  on public.hr_payroll_calculation_rule_sets (tenant_id, company_id, rule_set_code)
  where deleted_at is null;

create unique index hr_payroll_calculation_rules_set_code_uq
  on public.hr_payroll_calculation_rules (tenant_id, rule_set_id, rule_code)
  where deleted_at is null;

create index hr_payroll_calculation_rules_set_priority_idx
  on public.hr_payroll_calculation_rules (tenant_id, rule_set_id, priority, status)
  where deleted_at is null;

create unique index hr_payroll_calculation_executions_correlation_uq
  on public.hr_payroll_calculation_executions (tenant_id, correlation_id)
  where deleted_at is null;

create index hr_payroll_calculation_executions_run_employee_idx
  on public.hr_payroll_calculation_executions (tenant_id, payroll_run_id, employee_id, status)
  where deleted_at is null;

create index hr_payroll_calculation_traces_execution_idx
  on public.hr_payroll_calculation_traces (tenant_id, calculation_execution_id, rule_id, source_type)
  where deleted_at is null;

drop trigger if exists hr_payroll_calculation_rule_sets_touch_updated_at on public.hr_payroll_calculation_rule_sets;
create trigger hr_payroll_calculation_rule_sets_touch_updated_at before update on public.hr_payroll_calculation_rule_sets for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_calculation_rules_touch_updated_at on public.hr_payroll_calculation_rules;
create trigger hr_payroll_calculation_rules_touch_updated_at before update on public.hr_payroll_calculation_rules for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_calculation_executions_touch_updated_at on public.hr_payroll_calculation_executions;
create trigger hr_payroll_calculation_executions_touch_updated_at before update on public.hr_payroll_calculation_executions for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_calculation_traces_touch_updated_at on public.hr_payroll_calculation_traces;
create trigger hr_payroll_calculation_traces_touch_updated_at before update on public.hr_payroll_calculation_traces for each row execute function public.touch_platform_row();

alter table public.hr_payroll_calculation_rule_sets enable row level security;
alter table public.hr_payroll_calculation_rules enable row level security;
alter table public.hr_payroll_calculation_executions enable row level security;
alter table public.hr_payroll_calculation_traces enable row level security;

alter table public.hr_payroll_calculation_rule_sets force row level security;
alter table public.hr_payroll_calculation_rules force row level security;
alter table public.hr_payroll_calculation_executions force row level security;
alter table public.hr_payroll_calculation_traces force row level security;

create policy hr_payroll_calculation_rule_sets_select on public.hr_payroll_calculation_rule_sets for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_calculation_rule_sets_manage on public.hr_payroll_calculation_rule_sets for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_calculation_rules_select on public.hr_payroll_calculation_rules for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.view', tenant_id));
create policy hr_payroll_calculation_rules_manage on public.hr_payroll_calculation_rules for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.manage', tenant_id));

create policy hr_payroll_calculation_executions_select on public.hr_payroll_calculation_executions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.trace.view', tenant_id));
create policy hr_payroll_calculation_executions_calculate on public.hr_payroll_calculation_executions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.calculate', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.calculate', tenant_id));

create policy hr_payroll_calculation_traces_select on public.hr_payroll_calculation_traces for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.trace.view', tenant_id));
create policy hr_payroll_calculation_traces_manage on public.hr_payroll_calculation_traces for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.calculate', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.calculate', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payroll.calculate', 'Calculate Payroll', 'Allows executing payroll calculation foundation contracts without statutory localization.', 'critical'),
  ('hr.payroll.recalculate', 'Recalculate Payroll', 'Allows recalculating payroll results through calculation readiness contracts.', 'critical'),
  ('hr.payroll.trace.view', 'View Payroll Calculation Trace', 'Allows viewing payroll calculation trace and execution records.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payroll.calculate',
  'hr.payroll.recalculate',
  'hr.payroll.trace.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
