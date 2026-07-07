-- Nexora HR Core Foundation.
-- Foundation contracts only. No Policy Engine, Workforce/Attendance,
-- Compensation, Payroll, HR Action Engine, ESS/MSS portals, or workflows.

alter table public.permissions drop constraint if exists permissions_permission_key_check1;
alter table public.permissions add constraint permissions_permission_key_check1
  check (permission_key ~ '^[a-z0-9_-]+(\.[a-z0-9_-]+)+$');

create extension if not exists btree_gist;

create type public.hr_org_unit_kind as enum ('department', 'section', 'team');
create type public.hr_record_status as enum ('draft', 'active', 'inactive', 'locked', 'archived');
create type public.hr_position_status as enum ('planned', 'approved', 'active', 'frozen', 'closed');
create type public.hr_vacancy_status as enum ('not-budgeted', 'vacant', 'partially-filled', 'filled', 'overstaffed');
create type public.hr_employee_status as enum ('draft', 'active', 'inactive', 'suspended', 'separated', 'archived');
create type public.hr_employment_profile_status as enum ('draft', 'active', 'future', 'expired', 'superseded', 'cancelled');
create type public.hr_contract_status as enum ('draft', 'issued', 'signed', 'active', 'expired', 'terminated', 'cancelled', 'archived');
create type public.hr_lifecycle_state as enum (
  'applicant',
  'candidate',
  'offered',
  'accepted',
  'preboarding',
  'onboarding',
  'probation',
  'confirmed',
  'active',
  'temporary_assignment',
  'suspended',
  'notice_period',
  'separated',
  'final_settlement',
  'alumni',
  'rehire_eligible'
);
create type public.hr_timeline_event_type as enum (
  'hired',
  'profile_created',
  'contract_signed',
  'position_changed',
  'department_changed',
  'manager_changed',
  'salary_package_changed',
  'policy_changed',
  'document_added',
  'lifecycle_changed'
);
create type public.hr_employment_type as enum ('full-time', 'part-time', 'temporary', 'contractor', 'intern', 'seasonal', 'consultant');
create type public.hr_gender as enum ('female', 'male', 'other', 'undisclosed');
create type public.hr_marital_status as enum ('single', 'married', 'divorced', 'widowed', 'undisclosed');

create table public.hr_work_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  location_key text not null,
  name text not null,
  address_party_id uuid references public.parties(id) on delete restrict,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (location_key = lower(location_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_job_titles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_title_key text not null,
  name text not null,
  job_family_key text,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (job_title_key = lower(job_title_key)),
  check (job_family_key is null or job_family_key = lower(job_family_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  grade_key text not null,
  name text not null,
  rank integer check (rank is null or rank > 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (grade_key = lower(grade_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_org_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  org_unit_key text not null,
  name text not null,
  kind public.hr_org_unit_kind not null,
  parent_org_unit_id uuid references public.hr_org_units(id) on delete restrict,
  manager_employee_id uuid,
  cost_center_id uuid,
  work_location_id uuid references public.hr_work_locations(id) on delete restrict,
  manager_override_ready boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'duplicates_company_branch', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (org_unit_key = lower(org_unit_key)),
  check (length(trim(name)) > 0),
  check (parent_org_unit_id is null or parent_org_unit_id <> id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  position_key text not null,
  name text not null,
  department_id uuid not null references public.hr_org_units(id) on delete restrict,
  section_id uuid references public.hr_org_units(id) on delete restrict,
  job_title_id uuid references public.hr_job_titles(id) on delete restrict,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  cost_center_id uuid,
  reporting_position_id uuid references public.hr_positions(id) on delete restrict,
  status public.hr_position_status not null default 'planned',
  budgeted_headcount integer not null default 1 check (budgeted_headcount >= 0),
  current_headcount integer not null default 0 check (current_headcount >= 0),
  vacancy_status public.hr_vacancy_status not null default 'vacant',
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'approved_seat_owner', 'hr-core'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (position_key = lower(position_key)),
  check (length(trim(name)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (reporting_position_id is null or reporting_position_id <> id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_number text not null,
  party_id uuid not null references public.parties(id) on delete restrict,
  full_name text not null,
  national_id text,
  passport_number text,
  birth_date date,
  gender public.hr_gender,
  nationality text,
  marital_status public.hr_marital_status,
  contact_info jsonb not null default '{}'::jsonb,
  emergency_contact jsonb not null default '{}'::jsonb,
  photo_file_id uuid,
  status public.hr_employee_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'identity_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (employee_number = upper(employee_number)),
  check (length(trim(full_name)) > 0),
  check (jsonb_typeof(contact_info) = 'object'),
  check (jsonb_typeof(emergency_contact) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_org_units
  add constraint hr_org_units_manager_employee_fk
  foreign key (manager_employee_id) references public.hr_employees(id) on delete restrict;

create table public.hr_employment_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  department_id uuid not null references public.hr_org_units(id) on delete restrict,
  section_id uuid references public.hr_org_units(id) on delete restrict,
  team_id uuid references public.hr_org_units(id) on delete restrict,
  position_id uuid references public.hr_positions(id) on delete restrict,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  employment_type public.hr_employment_type not null,
  work_location_id uuid references public.hr_work_locations(id) on delete restrict,
  cost_center_id uuid,
  reporting_manager_employee_id uuid references public.hr_employees(id) on delete restrict,
  reporting_manager_override boolean not null default false,
  shift_schedule_ref uuid,
  salary_package_ref uuid,
  attendance_policy_ref uuid,
  leave_policy_ref uuid,
  payroll_policy_ref uuid,
  incentive_policy_ref uuid,
  approval_policy_ref uuid,
  effective_from date not null,
  effective_to date,
  status public.hr_employment_profile_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'operational_source_of_truth', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (reporting_manager_employee_id is null or reporting_manager_employee_id <> employee_id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_employment_profiles
  add constraint hr_employment_profiles_one_active_profile_per_range
  exclude using gist (
    tenant_id with =,
    employee_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  contract_type text not null,
  contract_number text not null,
  starts_on date not null,
  ends_on date,
  probation_period_days integer check (probation_period_days is null or probation_period_days >= 0),
  legal_terms jsonb not null default '{}'::jsonb,
  signed_date date,
  document_reference_id uuid,
  status public.hr_contract_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'legal_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (contract_number = upper(contract_number)),
  check (length(trim(contract_type)) > 0),
  check (ends_on is null or ends_on >= starts_on),
  check (signed_date is null or signed_date >= starts_on),
  check (jsonb_typeof(legal_terms) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_employee_lifecycle_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  lifecycle_state public.hr_lifecycle_state not null,
  effective_from date not null,
  effective_to date,
  source_document_type text,
  source_document_id uuid,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
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

create table public.hr_employee_timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  event_type public.hr_timeline_event_type not null,
  occurred_at timestamptz not null default now(),
  source_document_type text,
  source_document_id uuid,
  audit_event_id uuid,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'event_driven', true, 'audit_aware', true),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(summary)) > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_work_locations_key_active_uq on public.hr_work_locations (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), location_key) where deleted_at is null;
create unique index hr_job_titles_key_active_uq on public.hr_job_titles (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), job_title_key) where deleted_at is null;
create unique index hr_grades_key_active_uq on public.hr_grades (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), grade_key) where deleted_at is null;
create unique index hr_org_units_key_active_uq on public.hr_org_units (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), org_unit_key) where deleted_at is null;
create unique index hr_positions_key_active_uq on public.hr_positions (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), position_key) where deleted_at is null;
create unique index hr_employees_number_active_uq on public.hr_employees (tenant_id, company_id, employee_number) where deleted_at is null;
create unique index hr_employees_party_active_uq on public.hr_employees (tenant_id, party_id) where deleted_at is null;
create unique index hr_contracts_number_active_uq on public.hr_contracts (tenant_id, company_id, contract_number) where deleted_at is null;

create index hr_org_units_hierarchy_idx on public.hr_org_units (tenant_id, company_id, branch_id, parent_org_unit_id, kind) where deleted_at is null;
create index hr_positions_assignment_idx on public.hr_positions (tenant_id, company_id, branch_id, department_id, section_id, status, vacancy_status) where deleted_at is null;
create index hr_employment_profiles_employee_idx on public.hr_employment_profiles (tenant_id, employee_id, effective_from, effective_to, status) where deleted_at is null;
create index hr_contracts_employee_idx on public.hr_contracts (tenant_id, employee_id, status, starts_on) where deleted_at is null;
create index hr_lifecycle_employee_idx on public.hr_employee_lifecycle_states (tenant_id, employee_id, lifecycle_state, effective_from) where deleted_at is null;
create index hr_timeline_employee_idx on public.hr_employee_timeline_events (tenant_id, employee_id, occurred_at desc, event_type) where deleted_at is null;

create or replace function public.prevent_hr_employment_profile_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('active', 'expired', 'superseded', 'cancelled')
    and (
      old.employee_id is distinct from new.employee_id
      or old.company_id is distinct from new.company_id
      or old.branch_id is distinct from new.branch_id
      or old.department_id is distinct from new.department_id
      or old.section_id is distinct from new.section_id
      or old.team_id is distinct from new.team_id
      or old.position_id is distinct from new.position_id
      or old.grade_id is distinct from new.grade_id
      or old.employment_type is distinct from new.employment_type
      or old.work_location_id is distinct from new.work_location_id
      or old.cost_center_id is distinct from new.cost_center_id
      or old.reporting_manager_employee_id is distinct from new.reporting_manager_employee_id
      or old.reporting_manager_override is distinct from new.reporting_manager_override
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
    )
  then
    raise exception 'Historical HR employment profiles are immutable; create a superseding effective-dated profile instead.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_employment_profile_history_rewrite() from public;
grant execute on function public.prevent_hr_employment_profile_history_rewrite() to authenticated;

drop trigger if exists hr_employment_profiles_prevent_history_rewrite on public.hr_employment_profiles;
create trigger hr_employment_profiles_prevent_history_rewrite before update on public.hr_employment_profiles for each row execute function public.prevent_hr_employment_profile_history_rewrite();

drop trigger if exists hr_work_locations_touch_updated_at on public.hr_work_locations;
create trigger hr_work_locations_touch_updated_at before update on public.hr_work_locations for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_titles_touch_updated_at on public.hr_job_titles;
create trigger hr_job_titles_touch_updated_at before update on public.hr_job_titles for each row execute function public.touch_platform_row();
drop trigger if exists hr_grades_touch_updated_at on public.hr_grades;
create trigger hr_grades_touch_updated_at before update on public.hr_grades for each row execute function public.touch_platform_row();
drop trigger if exists hr_org_units_touch_updated_at on public.hr_org_units;
create trigger hr_org_units_touch_updated_at before update on public.hr_org_units for each row execute function public.touch_platform_row();
drop trigger if exists hr_positions_touch_updated_at on public.hr_positions;
create trigger hr_positions_touch_updated_at before update on public.hr_positions for each row execute function public.touch_platform_row();
drop trigger if exists hr_employees_touch_updated_at on public.hr_employees;
create trigger hr_employees_touch_updated_at before update on public.hr_employees for each row execute function public.touch_platform_row();
drop trigger if exists hr_employment_profiles_touch_updated_at on public.hr_employment_profiles;
create trigger hr_employment_profiles_touch_updated_at before update on public.hr_employment_profiles for each row execute function public.touch_platform_row();
drop trigger if exists hr_contracts_touch_updated_at on public.hr_contracts;
create trigger hr_contracts_touch_updated_at before update on public.hr_contracts for each row execute function public.touch_platform_row();
drop trigger if exists hr_lifecycle_touch_updated_at on public.hr_employee_lifecycle_states;
create trigger hr_lifecycle_touch_updated_at before update on public.hr_employee_lifecycle_states for each row execute function public.touch_platform_row();

alter table public.hr_work_locations enable row level security;
alter table public.hr_job_titles enable row level security;
alter table public.hr_grades enable row level security;
alter table public.hr_org_units enable row level security;
alter table public.hr_positions enable row level security;
alter table public.hr_employees enable row level security;
alter table public.hr_employment_profiles enable row level security;
alter table public.hr_contracts enable row level security;
alter table public.hr_employee_lifecycle_states enable row level security;
alter table public.hr_employee_timeline_events enable row level security;

alter table public.hr_work_locations force row level security;
alter table public.hr_job_titles force row level security;
alter table public.hr_grades force row level security;
alter table public.hr_org_units force row level security;
alter table public.hr_positions force row level security;
alter table public.hr_employees force row level security;
alter table public.hr_employment_profiles force row level security;
alter table public.hr_contracts force row level security;
alter table public.hr_employee_lifecycle_states force row level security;
alter table public.hr_employee_timeline_events force row level security;

create policy hr_work_locations_select on public.hr_work_locations for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.view', tenant_id));
create policy hr_work_locations_manage on public.hr_work_locations for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id));

create policy hr_job_titles_select on public.hr_job_titles for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.view', tenant_id));
create policy hr_job_titles_manage on public.hr_job_titles for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id));

create policy hr_grades_select on public.hr_grades for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.view', tenant_id));
create policy hr_grades_manage on public.hr_grades for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id));

create policy hr_org_units_select on public.hr_org_units for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.view', tenant_id));
create policy hr_org_units_manage on public.hr_org_units for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.manage', tenant_id));

create policy hr_positions_select on public.hr_positions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.positions.view', tenant_id));
create policy hr_positions_manage on public.hr_positions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.positions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.positions.manage', tenant_id));

create policy hr_employees_select on public.hr_employees for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.employees.view', tenant_id));
create policy hr_employees_manage on public.hr_employees for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id));

create policy hr_employment_profiles_select on public.hr_employment_profiles for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.employment_profiles.view', tenant_id));
create policy hr_employment_profiles_manage on public.hr_employment_profiles for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employment_profiles.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employment_profiles.manage', tenant_id));

create policy hr_contracts_select on public.hr_contracts for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.contracts.view', tenant_id));
create policy hr_contracts_manage on public.hr_contracts for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.contracts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.contracts.manage', tenant_id));

create policy hr_lifecycle_select on public.hr_employee_lifecycle_states for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.employees.view', tenant_id));
create policy hr_lifecycle_manage on public.hr_employee_lifecycle_states for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id));

create policy hr_timeline_select on public.hr_employee_timeline_events for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.timeline.view', tenant_id));
create policy hr_timeline_append on public.hr_employee_timeline_events for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.timeline.view', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.view', 'View HR', 'Allows access to the HR Core application.', 'standard'),
  ('hr.manage', 'Manage HR', 'Allows management of HR Core foundation setup.', 'high'),
  ('hr.employees.view', 'View Employees', 'Allows viewing employee identity records.', 'high'),
  ('hr.employees.manage', 'Manage Employees', 'Allows managing employee identity records.', 'critical'),
  ('hr.employment_profiles.view', 'View Employment Profiles', 'Allows viewing effective-dated employment profiles.', 'high'),
  ('hr.employment_profiles.manage', 'Manage Employment Profiles', 'Allows managing effective-dated employment profiles.', 'critical'),
  ('hr.positions.view', 'View Positions', 'Allows viewing HR positions.', 'standard'),
  ('hr.positions.manage', 'Manage Positions', 'Allows managing HR positions.', 'high'),
  ('hr.contracts.view', 'View HR Contracts', 'Allows viewing legal employment contracts.', 'critical'),
  ('hr.contracts.manage', 'Manage HR Contracts', 'Allows managing legal employment contracts.', 'critical'),
  ('hr.timeline.view', 'View Employee Timeline', 'Allows viewing employee timeline events.', 'high'),
  ('hr.search.view', 'Search HR', 'Allows searching HR Core records.', 'high'),
  ('hr.reports.view', 'View HR Reports', 'Allows viewing HR Core readiness reports.', 'high'),
  ('hr.import-export.manage', 'Manage HR Import Export', 'Allows HR Core imports and exports.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.view',
  'hr.manage',
  'hr.employees.view',
  'hr.employees.manage',
  'hr.employment_profiles.view',
  'hr.employment_profiles.manage',
  'hr.positions.view',
  'hr.positions.manage',
  'hr.contracts.view',
  'hr.contracts.manage',
  'hr.timeline.view',
  'hr.search.view',
  'hr.reports.view',
  'hr.import-export.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
