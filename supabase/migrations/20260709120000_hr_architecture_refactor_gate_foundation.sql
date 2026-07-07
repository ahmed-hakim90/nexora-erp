-- HR & Payroll Architecture Refactor Gate Foundation.
-- Architectural seam fixes only: no localization, no UI, no statutory payroll,
-- no leave calculation runtime, and no destructive cleanup.

do $$
begin
  create type public.hr_leave_record_status as enum ('draft', 'active', 'inactive', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_leave_request_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'posted_to_payroll');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_leave_approval_status as enum ('not_required', 'pending_approval', 'approved', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_absence_event_status as enum ('observed', 'classified', 'linked_to_leave', 'dismissed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_leave_payroll_impact_kind as enum ('paid_leave', 'unpaid_leave', 'partial_paid_leave', 'absence_deduction', 'encashment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_relationship_status as enum ('draft', 'active', 'suspended', 'ended', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_payment_method_kind as enum ('bank_transfer', 'cash', 'check', 'wallet', 'external_provider');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_currency_policy_kind as enum ('employee_currency', 'company_base_currency', 'payroll_group_currency', 'localization_pack_currency');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_typed_source_kind as enum ('leave', 'absence', 'loan', 'advance', 'penalty', 'benefit', 'attendance', 'overtime', 'manual_adjustment');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.hr_leave_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  paid boolean not null default true,
  requires_approval boolean not null default true,
  impacts_payroll boolean not null default true,
  status public.hr_leave_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'leave_runtime_implemented', false),
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

create table if not exists public.hr_absence_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  excused boolean not null default false,
  payroll_impact_kind public.hr_leave_payroll_impact_kind,
  status public.hr_leave_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'absence_runtime_implemented', false),
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

create table if not exists public.hr_leave_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  entitlement_unit text not null default 'days' check (entitlement_unit in ('days', 'hours')),
  annual_entitlement numeric(18, 4) not null default 0 check (annual_entitlement >= 0),
  carry_forward_allowed boolean not null default false,
  status public.hr_leave_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'leave_calculation_runtime_implemented', false),
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

create table if not exists public.hr_leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  entitlement_period_start date not null,
  entitlement_period_end date not null,
  entitled_quantity numeric(18, 4) not null default 0 check (entitled_quantity >= 0),
  consumed_quantity numeric(18, 4) not null default 0 check (consumed_quantity >= 0),
  pending_quantity numeric(18, 4) not null default 0 check (pending_quantity >= 0),
  status public.hr_leave_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'balance_calculation_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (entitlement_period_end >= entitlement_period_start),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_leave_balances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  as_of_date date not null,
  available_quantity numeric(18, 4) not null default 0,
  projected_quantity numeric(18, 4),
  source_entitlement_id uuid references public.hr_leave_entitlements(id) on delete restrict,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'runtime_calculation_implemented', false),
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

create table if not exists public.hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  quantity numeric(18, 4) not null check (quantity > 0),
  status public.hr_leave_request_status not null default 'draft',
  approval_status public.hr_leave_approval_status not null default 'not_required',
  assignment_resolution_ref_id uuid references public.hr_assignment_resolution_refs(id) on delete restrict,
  workflow_reference text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'workflow_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_leave_approval_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  leave_request_id uuid not null references public.hr_leave_requests(id) on delete restrict,
  approval_status public.hr_leave_approval_status not null default 'pending_approval',
  manager_scope_required boolean not null default true,
  segregation_of_duties_required boolean not null default true,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'approval_runtime_implemented', false),
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

create table if not exists public.hr_absence_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  absence_type_id uuid references public.hr_absence_types(id) on delete restrict,
  attendance_day_id uuid references public.hr_attendance_days(id) on delete restrict,
  event_date date not null,
  status public.hr_absence_event_status not null default 'observed',
  linked_leave_request_id uuid references public.hr_leave_requests(id) on delete restrict,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'attendance_mutation_runtime_implemented', false),
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

create table if not exists public.hr_leave_payroll_impact_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  leave_request_id uuid references public.hr_leave_requests(id) on delete restrict,
  absence_event_id uuid references public.hr_absence_events(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  impact_kind public.hr_leave_payroll_impact_kind not null,
  quantity numeric(18, 4) not null default 0,
  paid_quantity numeric(18, 4),
  unpaid_quantity numeric(18, 4),
  typed_source_ref_required boolean not null default true check (typed_source_ref_required = true),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'payroll_calculation_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (leave_request_id is not null or absence_event_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_leave_carry_forward_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  source_period_end date not null,
  target_period_start date not null,
  quantity numeric(18, 4) not null default 0,
  status public.hr_leave_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'carry_forward_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (target_period_start > source_period_end),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_relationships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  relationship_code text not null,
  effective_from date not null,
  effective_to date,
  status public.hr_payroll_relationship_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'statutory_rules_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (relationship_code = upper(relationship_code)),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_relationship_id uuid not null references public.hr_payroll_relationships(id) on delete restrict,
  payroll_group_id uuid not null references public.hr_payroll_groups(id) on delete restrict,
  payroll_calendar_id uuid not null references public.hr_payroll_calendars(id) on delete restrict,
  assignment_id uuid references public.hr_assignments(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  status public.hr_payroll_relationship_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'assignment_engine_linked', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_payment_method_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_relationship_id uuid not null references public.hr_payroll_relationships(id) on delete restrict,
  payment_method_kind public.hr_payroll_payment_method_kind not null,
  currency text not null default 'USD',
  effective_from date not null,
  effective_to date,
  status public.hr_payroll_relationship_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'payment_execution_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_currency_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_relationship_id uuid references public.hr_payroll_relationships(id) on delete restrict,
  payroll_group_id uuid references public.hr_payroll_groups(id) on delete restrict,
  currency_policy_kind public.hr_payroll_currency_policy_kind not null,
  currency text not null default 'USD',
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'fx_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (payroll_relationship_id is not null or payroll_group_id is not null),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_localization_pack_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  country_code text not null,
  localization_pack_key text not null,
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'localization_runtime_implemented', false, 'statutory_rules_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (country_code = upper(country_code)),
  check (localization_pack_key = lower(localization_pack_key)),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_payroll_typed_source_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payroll_input_id uuid references public.hr_payroll_inputs(id) on delete restrict,
  payroll_result_component_id uuid references public.hr_payroll_result_components(id) on delete restrict,
  source_kind public.hr_payroll_typed_source_kind not null,
  source_engine_key text not null,
  source_record_id uuid not null,
  source_version_id uuid,
  effective_date_used date not null,
  amount numeric(18, 4),
  quantity numeric(18, 4),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'generic_metadata_only_source_reference_allowed', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (payroll_input_id is not null or payroll_result_component_id is not null),
  check (length(trim(source_engine_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index if not exists hr_leave_requests_employee_idx on public.hr_leave_requests (tenant_id, employee_id, starts_on, status) where deleted_at is null;
create index if not exists hr_absence_events_employee_idx on public.hr_absence_events (tenant_id, employee_id, event_date, status) where deleted_at is null;
create index if not exists hr_leave_payroll_impact_refs_period_idx on public.hr_leave_payroll_impact_refs (tenant_id, payroll_period_id, impact_kind) where deleted_at is null;
create index if not exists hr_payroll_relationships_employee_idx on public.hr_payroll_relationships (tenant_id, employee_id, effective_from, status) where deleted_at is null;
create index if not exists hr_payroll_assignments_relationship_idx on public.hr_payroll_assignments (tenant_id, payroll_relationship_id, effective_from, status) where deleted_at is null;
create index if not exists hr_payroll_typed_source_refs_input_idx on public.hr_payroll_typed_source_refs (tenant_id, payroll_input_id, source_kind) where deleted_at is null;
create index if not exists hr_payroll_typed_source_refs_component_idx on public.hr_payroll_typed_source_refs (tenant_id, payroll_result_component_id, source_kind) where deleted_at is null;

alter table public.hr_payslips
  add column if not exists payroll_result_id uuid references public.hr_payroll_results(id) on delete restrict,
  add column if not exists presentation_only boolean not null default true,
  add column if not exists derived_from_result_components boolean not null default true;

alter table public.hr_payslip_lines
  add column if not exists payroll_result_component_id uuid references public.hr_payroll_result_components(id) on delete restrict,
  add column if not exists presentation_only boolean not null default true;

alter table public.hr_employment_profiles
  add column if not exists assignment_cache_classification jsonb not null default jsonb_build_object(
    'canonical_owner', 'assignment-engine',
    'profile_org_fields_are_cache', true,
    'writes_must_go_through_assignment_engine', true,
    'cache_rebuild_source', 'hr_assignments'
  );

alter table public.hr_leave_types enable row level security;
alter table public.hr_absence_types enable row level security;
alter table public.hr_leave_policies enable row level security;
alter table public.hr_leave_entitlements enable row level security;
alter table public.hr_leave_balances enable row level security;
alter table public.hr_leave_requests enable row level security;
alter table public.hr_leave_approval_readiness enable row level security;
alter table public.hr_absence_events enable row level security;
alter table public.hr_leave_payroll_impact_refs enable row level security;
alter table public.hr_leave_carry_forward_readiness enable row level security;
alter table public.hr_payroll_relationships enable row level security;
alter table public.hr_payroll_assignments enable row level security;
alter table public.hr_payroll_payment_method_readiness enable row level security;
alter table public.hr_payroll_currency_policies enable row level security;
alter table public.hr_payroll_localization_pack_readiness enable row level security;
alter table public.hr_payroll_typed_source_refs enable row level security;

alter table public.hr_leave_types force row level security;
alter table public.hr_absence_types force row level security;
alter table public.hr_leave_policies force row level security;
alter table public.hr_leave_entitlements force row level security;
alter table public.hr_leave_balances force row level security;
alter table public.hr_leave_requests force row level security;
alter table public.hr_leave_approval_readiness force row level security;
alter table public.hr_absence_events force row level security;
alter table public.hr_leave_payroll_impact_refs force row level security;
alter table public.hr_leave_carry_forward_readiness force row level security;
alter table public.hr_payroll_relationships force row level security;
alter table public.hr_payroll_assignments force row level security;
alter table public.hr_payroll_payment_method_readiness force row level security;
alter table public.hr_payroll_currency_policies force row level security;
alter table public.hr_payroll_localization_pack_readiness force row level security;
alter table public.hr_payroll_typed_source_refs force row level security;

create policy hr_leave_foundation_select on public.hr_leave_types for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_foundation_manage on public.hr_leave_types for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_absence_types_select on public.hr_absence_types for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_absence_types_manage on public.hr_absence_types for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_policies_select on public.hr_leave_policies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_policies_manage on public.hr_leave_policies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_entitlements_select on public.hr_leave_entitlements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_entitlements_manage on public.hr_leave_entitlements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_balances_select on public.hr_leave_balances for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_balances_manage on public.hr_leave_balances for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_requests_select on public.hr_leave_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_requests_manage on public.hr_leave_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_requests_self_select on public.hr_leave_requests for select to authenticated
  using (
    is_active = true and deleted_at is null and public.has_permission('hr.leave.view', tenant_id)
    and employee_id in (select e.id from public.hr_employees e where e.user_id = auth.uid() and e.tenant_id = hr_leave_requests.tenant_id and e.deleted_at is null)
  );

create policy hr_leave_approval_readiness_select on public.hr_leave_approval_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_approval_readiness_manage on public.hr_leave_approval_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.approve', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.approve', tenant_id));

create policy hr_absence_events_select on public.hr_absence_events for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_absence_events_manage on public.hr_absence_events for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_payroll_impact_refs_select on public.hr_leave_payroll_impact_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_leave_payroll_impact_refs_manage on public.hr_leave_payroll_impact_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id));

create policy hr_leave_carry_forward_readiness_select on public.hr_leave_carry_forward_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_carry_forward_readiness_manage on public.hr_leave_carry_forward_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_payroll_relationships_select on public.hr_payroll_relationships for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.payroll.relationships.view', tenant_id));
create policy hr_payroll_relationships_manage on public.hr_payroll_relationships for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id));

create policy hr_payroll_assignments_select on public.hr_payroll_assignments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.view', tenant_id));
create policy hr_payroll_assignments_manage on public.hr_payroll_assignments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id));

create policy hr_payroll_payment_method_readiness_select on public.hr_payroll_payment_method_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.view', tenant_id));
create policy hr_payroll_payment_method_readiness_manage on public.hr_payroll_payment_method_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id));

create policy hr_payroll_currency_policies_select on public.hr_payroll_currency_policies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.view', tenant_id));
create policy hr_payroll_currency_policies_manage on public.hr_payroll_currency_policies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id));

create policy hr_payroll_localization_pack_readiness_select on public.hr_payroll_localization_pack_readiness for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.view', tenant_id));
create policy hr_payroll_localization_pack_readiness_manage on public.hr_payroll_localization_pack_readiness for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.relationships.manage', tenant_id));

create policy hr_payroll_typed_source_refs_select on public.hr_payroll_typed_source_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.view', tenant_id));
create policy hr_payroll_typed_source_refs_manage on public.hr_payroll_typed_source_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.inputs.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.leave.view', 'View Leave and Absence', 'Allows viewing leave and absence foundation records.', 'high'),
  ('hr.leave.manage', 'Manage Leave and Absence', 'Allows managing leave and absence foundation records without calculation runtime.', 'critical'),
  ('hr.leave.approve', 'Approve Leave Readiness', 'Allows managing leave approval readiness records.', 'critical'),
  ('hr.payroll.relationships.view', 'View Payroll Relationships', 'Allows viewing payroll relationship and payroll assignment foundation records.', 'high'),
  ('hr.payroll.relationships.manage', 'Manage Payroll Relationships', 'Allows managing payroll relationship foundation records without statutory runtime.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.leave.view',
  'hr.leave.manage',
  'hr.leave.approve',
  'hr.payroll.relationships.view',
  'hr.payroll.relationships.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
