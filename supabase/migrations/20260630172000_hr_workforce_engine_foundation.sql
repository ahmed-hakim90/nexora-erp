-- Nexora HR Workforce Engine Foundation.
-- Foundation contracts only. No attendance calculation, biometric synchronization,
-- payroll, HR requests, workflow runtime, ESS/MSS, or CRUD screens.

create type public.hr_workforce_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.hr_work_calendar_type as enum ('company', 'branch', 'department', 'production');
create type public.hr_shift_kind as enum ('morning', 'evening', 'night', '24_hour', '12_hour', 'split', 'flexible', 'custom');
create type public.hr_shift_rotation_cadence as enum ('weekly', 'bi_weekly', 'monthly', 'custom');
create type public.hr_holiday_type as enum ('national', 'company', 'branch', 'factory_shutdown', 'emergency_closure', 'half_day', 'recurring');
create type public.hr_attendance_device_type as enum ('zkteco', 'suprema', 'anviz', 'fingertec', 'cloud_attendance', 'excel_import', 'api_import');
create type public.hr_workforce_assignment_type as enum (
  'temporary_department',
  'temporary_branch',
  'temporary_production_line',
  'temporary_supervisor',
  'temporary_work_location',
  'temporary_shift'
);

create table public.hr_work_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  code text not null,
  name text not null,
  calendar_type public.hr_work_calendar_type not null,
  timezone text not null default 'UTC',
  work_week jsonb not null default jsonb_build_object(
    'monday', true,
    'tuesday', true,
    'wednesday', true,
    'thursday', true,
    'friday', true,
    'saturday', false,
    'sunday', false
  ),
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'workforce_planning', true),
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
  check (calendar_type <> 'department' or department_id is not null),
  check (jsonb_typeof(work_week) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_shift_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  shift_kind public.hr_shift_kind not null,
  description text,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'identity_only', true),
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

create table public.hr_shift_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  shift_id uuid not null references public.hr_shift_definitions(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  start_time time not null,
  end_time time not null,
  crosses_midnight boolean not null default false,
  paid_break_minutes integer not null default 0 check (paid_break_minutes >= 0),
  unpaid_break_minutes integer not null default 0 check (unpaid_break_minutes >= 0),
  total_planned_hours numeric(6, 2) not null check (total_planned_hours >= 0),
  grace_period_minutes integer not null default 0 check (grace_period_minutes >= 0),
  overtime_eligible boolean not null default true,
  shift_policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'runtime_calculation_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_shift_versions
  add constraint hr_shift_versions_one_active_version_per_range
  exclude using gist (
    tenant_id with =,
    shift_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_shift_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  weekly_pattern integer[] not null default '{}'::integer[],
  default_rest_days integer[] not null default '{}'::integer[],
  rotation_ready boolean not null default true,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'scheduler_runtime_implemented', false),
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

create table public.hr_shift_template_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  shift_template_id uuid not null references public.hr_shift_templates(id) on delete restrict,
  day_of_week integer not null check (day_of_week between 0 and 6),
  shift_version_id uuid references public.hr_shift_versions(id) on delete restrict,
  is_rest_day boolean not null default false,
  display_order integer not null default 100 check (display_order >= 0),
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
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
  check (is_rest_day = true or shift_version_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_shift_rotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  cadence public.hr_shift_rotation_cadence not null default 'weekly',
  pattern_weeks text[] not null default '{}'::text[],
  repeat_from_week_index integer not null default 0 check (repeat_from_week_index >= 0),
  description text,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'scheduler_runtime_implemented', false),
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
  check (cardinality(pattern_weeks) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_shift_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  shift_template_id uuid references public.hr_shift_templates(id) on delete restrict,
  shift_rotation_id uuid references public.hr_shift_rotations(id) on delete restrict,
  work_calendar_id uuid references public.hr_work_calendars(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'one_active_schedule_per_range', true),
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

alter table public.hr_shift_schedules
  add constraint hr_shift_schedules_one_active_schedule_per_range
  exclude using gist (
    tenant_id with =,
    employee_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_shift_schedule_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  shift_schedule_id uuid not null references public.hr_shift_schedules(id) on delete restrict,
  week_index integer not null default 0 check (week_index >= 0),
  day_of_week integer not null check (day_of_week between 0 and 6),
  shift_version_id uuid references public.hr_shift_versions(id) on delete restrict,
  is_rest_day boolean not null default false,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
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
  check (is_rest_day = true or shift_version_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_workforce_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  assignment_type public.hr_workforce_assignment_type not null,
  target_department_id uuid references public.hr_org_units(id) on delete restrict,
  target_branch_id uuid references public.branches(id) on delete restrict,
  target_production_line_ref uuid,
  target_supervisor_employee_id uuid references public.hr_employees(id) on delete restrict,
  target_work_location_id uuid references public.hr_work_locations(id) on delete restrict,
  target_shift_schedule_id uuid references public.hr_shift_schedules(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  reason text,
  approval_document_ref uuid,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'timeline_event_readiness', true,
    'approval_readiness', true,
    'hr_action_workflow_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (assignment_type <> 'temporary_department' or target_department_id is not null),
  check (assignment_type <> 'temporary_branch' or target_branch_id is not null),
  check (assignment_type <> 'temporary_production_line' or target_production_line_ref is not null),
  check (assignment_type <> 'temporary_supervisor' or target_supervisor_employee_id is not null),
  check (assignment_type <> 'temporary_work_location' or target_work_location_id is not null),
  check (assignment_type <> 'temporary_shift' or target_shift_schedule_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_holiday_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  work_calendar_id uuid references public.hr_work_calendars(id) on delete restrict,
  code text not null,
  name text not null,
  calendar_scope text not null,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
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
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  holiday_calendar_id uuid not null references public.hr_holiday_calendars(id) on delete restrict,
  holiday_type public.hr_holiday_type not null,
  name text not null,
  holiday_date date,
  is_half_day boolean not null default false,
  recurring_rule text,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(name)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (holiday_type <> 'recurring' or recurring_rule is not null),
  check (holiday_type = 'recurring' or holiday_date is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  work_location_id uuid references public.hr_work_locations(id) on delete restrict,
  code text not null,
  name text not null,
  ip_address inet,
  timezone text not null default 'UTC',
  device_type public.hr_attendance_device_type not null,
  last_sync_at timestamptz,
  status public.hr_workforce_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'synchronization_runtime_implemented', false,
    'device_readiness_only', true
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_employment_profiles
  add constraint hr_employment_profiles_shift_schedule_ref_fk
  foreign key (shift_schedule_ref) references public.hr_shift_schedules(id) on delete restrict;

create unique index hr_work_calendars_code_active_uq on public.hr_work_calendars (tenant_id, company_id, code) where deleted_at is null;
create index hr_work_calendars_effective_idx on public.hr_work_calendars (tenant_id, company_id, calendar_type, status, effective_from, effective_to) where deleted_at is null;
create unique index hr_shift_definitions_code_active_uq on public.hr_shift_definitions (tenant_id, company_id, code) where deleted_at is null;
create unique index hr_shift_versions_shift_version_uq on public.hr_shift_versions (tenant_id, shift_id, version_no) where deleted_at is null;
create index hr_shift_versions_effective_idx on public.hr_shift_versions (tenant_id, company_id, shift_id, status, effective_from, effective_to) where deleted_at is null;
create unique index hr_shift_templates_code_active_uq on public.hr_shift_templates (tenant_id, company_id, code) where deleted_at is null;
create index hr_shift_template_lines_template_idx on public.hr_shift_template_lines (tenant_id, shift_template_id, day_of_week, status) where deleted_at is null;
create unique index hr_shift_rotations_code_active_uq on public.hr_shift_rotations (tenant_id, company_id, code) where deleted_at is null;
create index hr_shift_schedules_profile_idx on public.hr_shift_schedules (tenant_id, employment_profile_id, status, effective_from, effective_to) where deleted_at is null;
create index hr_shift_schedules_employee_idx on public.hr_shift_schedules (tenant_id, employee_id, status, effective_from, effective_to) where deleted_at is null;
create index hr_shift_schedule_lines_schedule_idx on public.hr_shift_schedule_lines (tenant_id, shift_schedule_id, week_index, day_of_week) where deleted_at is null;
create index hr_workforce_assignments_profile_idx on public.hr_workforce_assignments (tenant_id, employment_profile_id, assignment_type, status, effective_from, effective_to) where deleted_at is null;
create unique index hr_holiday_calendars_code_active_uq on public.hr_holiday_calendars (tenant_id, company_id, code) where deleted_at is null;
create index hr_holidays_calendar_idx on public.hr_holidays (tenant_id, holiday_calendar_id, holiday_date, status) where deleted_at is null;
create unique index hr_attendance_devices_code_active_uq on public.hr_attendance_devices (tenant_id, company_id, code) where deleted_at is null;
create index hr_attendance_devices_branch_idx on public.hr_attendance_devices (tenant_id, company_id, branch_id, device_type, status) where deleted_at is null;

create or replace function public.prevent_hr_shift_version_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('active', 'inactive', 'archived')
    and (
      old.shift_id is distinct from new.shift_id
      or old.version_no is distinct from new.version_no
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
      or old.start_time is distinct from new.start_time
      or old.end_time is distinct from new.end_time
      or old.crosses_midnight is distinct from new.crosses_midnight
      or old.paid_break_minutes is distinct from new.paid_break_minutes
      or old.unpaid_break_minutes is distinct from new.unpaid_break_minutes
      or old.total_planned_hours is distinct from new.total_planned_hours
      or old.grace_period_minutes is distinct from new.grace_period_minutes
      or old.overtime_eligible is distinct from new.overtime_eligible
      or old.shift_policy_version_id is distinct from new.shift_policy_version_id
    )
  then
    raise exception 'Historical HR shift versions are immutable; create a new shift version instead.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_shift_version_history_rewrite() from public;
grant execute on function public.prevent_hr_shift_version_history_rewrite() to authenticated;

drop trigger if exists hr_shift_versions_prevent_history_rewrite on public.hr_shift_versions;
create trigger hr_shift_versions_prevent_history_rewrite before update on public.hr_shift_versions for each row execute function public.prevent_hr_shift_version_history_rewrite();

drop trigger if exists hr_work_calendars_touch_updated_at on public.hr_work_calendars;
create trigger hr_work_calendars_touch_updated_at before update on public.hr_work_calendars for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_definitions_touch_updated_at on public.hr_shift_definitions;
create trigger hr_shift_definitions_touch_updated_at before update on public.hr_shift_definitions for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_versions_touch_updated_at on public.hr_shift_versions;
create trigger hr_shift_versions_touch_updated_at before update on public.hr_shift_versions for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_templates_touch_updated_at on public.hr_shift_templates;
create trigger hr_shift_templates_touch_updated_at before update on public.hr_shift_templates for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_template_lines_touch_updated_at on public.hr_shift_template_lines;
create trigger hr_shift_template_lines_touch_updated_at before update on public.hr_shift_template_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_rotations_touch_updated_at on public.hr_shift_rotations;
create trigger hr_shift_rotations_touch_updated_at before update on public.hr_shift_rotations for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_schedules_touch_updated_at on public.hr_shift_schedules;
create trigger hr_shift_schedules_touch_updated_at before update on public.hr_shift_schedules for each row execute function public.touch_platform_row();
drop trigger if exists hr_shift_schedule_lines_touch_updated_at on public.hr_shift_schedule_lines;
create trigger hr_shift_schedule_lines_touch_updated_at before update on public.hr_shift_schedule_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_workforce_assignments_touch_updated_at on public.hr_workforce_assignments;
create trigger hr_workforce_assignments_touch_updated_at before update on public.hr_workforce_assignments for each row execute function public.touch_platform_row();
drop trigger if exists hr_holiday_calendars_touch_updated_at on public.hr_holiday_calendars;
create trigger hr_holiday_calendars_touch_updated_at before update on public.hr_holiday_calendars for each row execute function public.touch_platform_row();
drop trigger if exists hr_holidays_touch_updated_at on public.hr_holidays;
create trigger hr_holidays_touch_updated_at before update on public.hr_holidays for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_devices_touch_updated_at on public.hr_attendance_devices;
create trigger hr_attendance_devices_touch_updated_at before update on public.hr_attendance_devices for each row execute function public.touch_platform_row();

alter table public.hr_work_calendars enable row level security;
alter table public.hr_shift_definitions enable row level security;
alter table public.hr_shift_versions enable row level security;
alter table public.hr_shift_templates enable row level security;
alter table public.hr_shift_template_lines enable row level security;
alter table public.hr_shift_rotations enable row level security;
alter table public.hr_shift_schedules enable row level security;
alter table public.hr_shift_schedule_lines enable row level security;
alter table public.hr_workforce_assignments enable row level security;
alter table public.hr_holiday_calendars enable row level security;
alter table public.hr_holidays enable row level security;
alter table public.hr_attendance_devices enable row level security;

alter table public.hr_work_calendars force row level security;
alter table public.hr_shift_definitions force row level security;
alter table public.hr_shift_versions force row level security;
alter table public.hr_shift_templates force row level security;
alter table public.hr_shift_template_lines force row level security;
alter table public.hr_shift_rotations force row level security;
alter table public.hr_shift_schedules force row level security;
alter table public.hr_shift_schedule_lines force row level security;
alter table public.hr_workforce_assignments force row level security;
alter table public.hr_holiday_calendars force row level security;
alter table public.hr_holidays force row level security;
alter table public.hr_attendance_devices force row level security;

create policy hr_work_calendars_select on public.hr_work_calendars for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.calendars.view', tenant_id));
create policy hr_work_calendars_manage on public.hr_work_calendars for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id));

create policy hr_shift_definitions_select on public.hr_shift_definitions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.shifts.view', tenant_id));
create policy hr_shift_definitions_manage on public.hr_shift_definitions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id));

create policy hr_shift_versions_select on public.hr_shift_versions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.shifts.view', tenant_id));
create policy hr_shift_versions_manage on public.hr_shift_versions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id));

create policy hr_shift_templates_select on public.hr_shift_templates for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.shifts.view', tenant_id));
create policy hr_shift_templates_manage on public.hr_shift_templates for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id));

create policy hr_shift_template_lines_select on public.hr_shift_template_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.shifts.view', tenant_id));
create policy hr_shift_template_lines_manage on public.hr_shift_template_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id));

create policy hr_shift_rotations_select on public.hr_shift_rotations for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.shifts.view', tenant_id));
create policy hr_shift_rotations_manage on public.hr_shift_rotations for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.shifts.manage', tenant_id));

create policy hr_shift_schedules_select on public.hr_shift_schedules for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_shift_schedules_manage on public.hr_shift_schedules for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_shift_schedule_lines_select on public.hr_shift_schedule_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_shift_schedule_lines_manage on public.hr_shift_schedule_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_workforce_assignments_select on public.hr_workforce_assignments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_workforce_assignments_manage on public.hr_workforce_assignments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_holiday_calendars_select on public.hr_holiday_calendars for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.calendars.view', tenant_id));
create policy hr_holiday_calendars_manage on public.hr_holiday_calendars for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id));

create policy hr_holidays_select on public.hr_holidays for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.calendars.view', tenant_id));
create policy hr_holidays_manage on public.hr_holidays for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.calendars.manage', tenant_id));

create policy hr_attendance_devices_select on public.hr_attendance_devices for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.devices.view', tenant_id));
create policy hr_attendance_devices_manage on public.hr_attendance_devices for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.workforce.view', 'View HR Workforce', 'Allows viewing shift schedules, workforce assignments, and planning readiness metadata.', 'high'),
  ('hr.workforce.manage', 'Manage HR Workforce', 'Allows managing shift schedules, schedule lines, and workforce assignments.', 'critical'),
  ('hr.shifts.view', 'View HR Shifts', 'Allows viewing shift definitions, versions, templates, and rotations.', 'high'),
  ('hr.shifts.manage', 'Manage HR Shifts', 'Allows managing shift definitions, versions, templates, and rotations.', 'critical'),
  ('hr.calendars.view', 'View HR Calendars', 'Allows viewing work calendars, holiday calendars, and holidays.', 'high'),
  ('hr.calendars.manage', 'Manage HR Calendars', 'Allows managing work calendars, holiday calendars, and holidays.', 'critical'),
  ('hr.devices.view', 'View Attendance Devices', 'Allows viewing attendance device readiness metadata.', 'high'),
  ('hr.devices.manage', 'Manage Attendance Devices', 'Allows managing attendance device readiness metadata.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.workforce.view',
  'hr.workforce.manage',
  'hr.shifts.view',
  'hr.shifts.manage',
  'hr.calendars.view',
  'hr.calendars.manage',
  'hr.devices.view',
  'hr.devices.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
