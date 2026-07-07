-- Nexora HR Attendance Engine Foundation.
-- Foundation contracts only. No payroll calculation, biometric sync runtime,
-- full attendance calculation, ESS/MSS, HR Action workflow runtime, leave runtime, or CRUD screens.

create type public.hr_attendance_punch_type as enum ('in', 'out', 'break_in', 'break_out', 'unknown');
create type public.hr_attendance_punch_source as enum (
  'biometric_device',
  'manual_entry',
  'excel_import',
  'api_import',
  'mobile_punch',
  'admin_correction'
);
create type public.hr_attendance_punch_status as enum ('imported', 'normalized', 'ignored', 'duplicate');
create type public.hr_attendance_raw_event_type as enum (
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'unknown',
  'duplicate',
  'ignored'
);
create type public.hr_attendance_day_status as enum (
  'pending',
  'observed',
  'needs_review',
  'approved',
  'rejected',
  'locked',
  'exported_to_payroll'
);
create type public.hr_attendance_exception_type as enum (
  'missing_punch_in',
  'missing_punch_out',
  'duplicate_punch',
  'out_of_schedule',
  'late_arrival',
  'early_leave',
  'possible_absence',
  'holiday_work',
  'overtime_requires_approval',
  'device_mismatch',
  'profile_missing',
  'schedule_missing'
);
create type public.hr_attendance_exception_severity as enum ('low', 'medium', 'high', 'critical');
create type public.hr_attendance_exception_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type public.hr_attendance_adjustment_type as enum (
  'add_punch',
  'correct_punch',
  'ignore_punch',
  'approve_overtime',
  'approve_holiday_work',
  'mark_mission',
  'mark_training',
  'mark_leave',
  'mark_absence_excused'
);
create type public.hr_attendance_review_queue_item_type as enum (
  'attendance_exception',
  'missing_punch',
  'overtime_approval_needed',
  'holiday_work_approval_needed',
  'profile_schedule_mismatch',
  'device_mismatch'
);
create type public.hr_attendance_review_queue_status as enum ('pending', 'assigned', 'in_review', 'resolved', 'dismissed');
create type public.hr_attendance_lock_level as enum ('unlocked', 'review_locked', 'payroll_locked');

create table public.hr_attendance_punch_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  device_id uuid references public.hr_attendance_devices(id) on delete restrict,
  punch_time timestamptz not null,
  punch_type public.hr_attendance_punch_type not null,
  source public.hr_attendance_punch_source not null,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  correlation_id text,
  status public.hr_attendance_punch_status not null default 'imported',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'append_only', true,
    'device_logs_never_overwritten', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(raw_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_raw_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  source_punch_log_id uuid not null references public.hr_attendance_punch_logs(id) on delete restrict,
  event_time timestamptz not null,
  event_type public.hr_attendance_raw_event_type not null,
  source public.hr_attendance_punch_source not null,
  confidence numeric(5, 4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status public.hr_attendance_punch_status not null default 'normalized',
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

create table public.hr_attendance_days (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  work_date date not null,
  status public.hr_attendance_day_status not null default 'pending',
  attendance_policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  shift_schedule_id uuid references public.hr_shift_schedules(id) on delete restrict,
  shift_schedule_line_id uuid references public.hr_shift_schedule_lines(id) on delete restrict,
  shift_version_id uuid references public.hr_shift_versions(id) on delete restrict,
  holiday_calendar_id uuid references public.hr_holiday_calendars(id) on delete restrict,
  workforce_assignment_id uuid references public.hr_workforce_assignments(id) on delete restrict,
  expected_vs_actual jsonb not null default jsonb_build_object('runtime_calculation_implemented', false),
  calculation_metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'full_calculation_implemented', false
  ),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'date_based', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(expected_vs_actual) = 'object'),
  check (jsonb_typeof(calculation_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  attendance_day_id uuid not null references public.hr_attendance_days(id) on delete restrict,
  exception_type public.hr_attendance_exception_type not null,
  severity public.hr_attendance_exception_severity not null default 'medium',
  source text not null,
  status public.hr_attendance_exception_status not null default 'open',
  reviewer_employee_id uuid references public.hr_employees(id) on delete restrict,
  resolution_reference uuid,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(source)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_adjustment_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  attendance_day_id uuid not null references public.hr_attendance_days(id) on delete restrict,
  adjustment_type public.hr_attendance_adjustment_type not null,
  hr_action_document_ref uuid,
  punch_log_ref uuid references public.hr_attendance_punch_logs(id) on delete restrict,
  reason text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'hr_action_document_ready', true,
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_review_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  attendance_day_id uuid references public.hr_attendance_days(id) on delete restrict,
  attendance_exception_id uuid references public.hr_attendance_exceptions(id) on delete restrict,
  item_type public.hr_attendance_review_queue_item_type not null,
  status public.hr_attendance_review_queue_status not null default 'pending',
  assigned_reviewer_employee_id uuid references public.hr_employees(id) on delete restrict,
  priority integer not null default 100 check (priority >= 0),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'scoped_and_permission_aware', true,
    'runtime_ui_implemented', false
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

create table public.hr_attendance_locks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  attendance_day_id uuid not null references public.hr_attendance_days(id) on delete restrict,
  lock_level public.hr_attendance_lock_level not null default 'unlocked',
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  payroll_export_ref uuid,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'payroll_lock_runtime_implemented', false,
    'retro_adjustment_after_payroll_lock', true
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

create unique index hr_attendance_days_employee_work_date_uq
  on public.hr_attendance_days (tenant_id, employee_id, work_date)
  where deleted_at is null;

create index hr_attendance_punch_logs_employee_time_idx
  on public.hr_attendance_punch_logs (tenant_id, employee_id, punch_time, status)
  where deleted_at is null;

create index hr_attendance_punch_logs_device_idx
  on public.hr_attendance_punch_logs (tenant_id, device_id, imported_at)
  where deleted_at is null and device_id is not null;

create index hr_attendance_raw_events_punch_log_idx
  on public.hr_attendance_raw_events (tenant_id, source_punch_log_id, event_time)
  where deleted_at is null;

create index hr_attendance_days_profile_date_idx
  on public.hr_attendance_days (tenant_id, employment_profile_id, work_date, status)
  where deleted_at is null;

create index hr_attendance_exceptions_day_idx
  on public.hr_attendance_exceptions (tenant_id, attendance_day_id, exception_type, status)
  where deleted_at is null;

create index hr_attendance_adjustment_refs_day_idx
  on public.hr_attendance_adjustment_refs (tenant_id, attendance_day_id, adjustment_type)
  where deleted_at is null;

create index hr_attendance_review_queue_status_idx
  on public.hr_attendance_review_queue (tenant_id, company_id, branch_id, status, priority)
  where deleted_at is null;

create unique index hr_attendance_locks_day_active_uq
  on public.hr_attendance_locks (tenant_id, attendance_day_id)
  where deleted_at is null;

create or replace function public.prevent_hr_attendance_punch_log_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.deleted_at is null then
    raise exception 'HR attendance punch logs are append-only; punch logs cannot be deleted.';
  end if;

  if tg_op = 'UPDATE'
    and old.status in ('imported', 'normalized')
    and (
      old.employee_id is distinct from new.employee_id
      or old.employment_profile_id is distinct from new.employment_profile_id
      or old.device_id is distinct from new.device_id
      or old.punch_time is distinct from new.punch_time
      or old.punch_type is distinct from new.punch_type
      or old.source is distinct from new.source
      or old.raw_payload is distinct from new.raw_payload
      or old.imported_at is distinct from new.imported_at
      or old.correlation_id is distinct from new.correlation_id
    )
  then
    raise exception 'HR attendance punch logs are append-only; create an adjustment reference instead of rewriting imported device logs.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_attendance_punch_log_rewrite() from public;
grant execute on function public.prevent_hr_attendance_punch_log_rewrite() to authenticated;

drop trigger if exists hr_attendance_punch_logs_prevent_rewrite on public.hr_attendance_punch_logs;
create trigger hr_attendance_punch_logs_prevent_rewrite
  before update or delete on public.hr_attendance_punch_logs
  for each row execute function public.prevent_hr_attendance_punch_log_rewrite();

drop trigger if exists hr_attendance_punch_logs_touch_updated_at on public.hr_attendance_punch_logs;
create trigger hr_attendance_punch_logs_touch_updated_at before update on public.hr_attendance_punch_logs for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_raw_events_touch_updated_at on public.hr_attendance_raw_events;
create trigger hr_attendance_raw_events_touch_updated_at before update on public.hr_attendance_raw_events for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_days_touch_updated_at on public.hr_attendance_days;
create trigger hr_attendance_days_touch_updated_at before update on public.hr_attendance_days for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_exceptions_touch_updated_at on public.hr_attendance_exceptions;
create trigger hr_attendance_exceptions_touch_updated_at before update on public.hr_attendance_exceptions for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_adjustment_refs_touch_updated_at on public.hr_attendance_adjustment_refs;
create trigger hr_attendance_adjustment_refs_touch_updated_at before update on public.hr_attendance_adjustment_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_review_queue_touch_updated_at on public.hr_attendance_review_queue;
create trigger hr_attendance_review_queue_touch_updated_at before update on public.hr_attendance_review_queue for each row execute function public.touch_platform_row();
drop trigger if exists hr_attendance_locks_touch_updated_at on public.hr_attendance_locks;
create trigger hr_attendance_locks_touch_updated_at before update on public.hr_attendance_locks for each row execute function public.touch_platform_row();

alter table public.hr_attendance_punch_logs enable row level security;
alter table public.hr_attendance_raw_events enable row level security;
alter table public.hr_attendance_days enable row level security;
alter table public.hr_attendance_exceptions enable row level security;
alter table public.hr_attendance_adjustment_refs enable row level security;
alter table public.hr_attendance_review_queue enable row level security;
alter table public.hr_attendance_locks enable row level security;

alter table public.hr_attendance_punch_logs force row level security;
alter table public.hr_attendance_raw_events force row level security;
alter table public.hr_attendance_days force row level security;
alter table public.hr_attendance_exceptions force row level security;
alter table public.hr_attendance_adjustment_refs force row level security;
alter table public.hr_attendance_review_queue force row level security;
alter table public.hr_attendance_locks force row level security;

create policy hr_attendance_punch_logs_select on public.hr_attendance_punch_logs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));
create policy hr_attendance_punch_logs_manage on public.hr_attendance_punch_logs for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.manage', tenant_id));
create policy hr_attendance_punch_logs_import on public.hr_attendance_punch_logs for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.import', tenant_id));

create policy hr_attendance_raw_events_select on public.hr_attendance_raw_events for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));
create policy hr_attendance_raw_events_manage on public.hr_attendance_raw_events for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.manage', tenant_id));

create policy hr_attendance_days_select on public.hr_attendance_days for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));
create policy hr_attendance_days_manage on public.hr_attendance_days for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.manage', tenant_id));
create policy hr_attendance_days_review on public.hr_attendance_days for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.review', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.review', tenant_id));

create policy hr_attendance_exceptions_select on public.hr_attendance_exceptions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.exceptions.view', tenant_id));
create policy hr_attendance_exceptions_manage on public.hr_attendance_exceptions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.exceptions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.exceptions.manage', tenant_id));

create policy hr_attendance_adjustment_refs_select on public.hr_attendance_adjustment_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));
create policy hr_attendance_adjustment_refs_adjust on public.hr_attendance_adjustment_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.adjust', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.adjust', tenant_id));

create policy hr_attendance_review_queue_select on public.hr_attendance_review_queue for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.review', tenant_id));
create policy hr_attendance_review_queue_manage on public.hr_attendance_review_queue for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.review', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.review', tenant_id));

create policy hr_attendance_locks_select on public.hr_attendance_locks for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));
create policy hr_attendance_locks_manage on public.hr_attendance_locks for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.lock', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.lock', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.attendance.view', 'View HR Attendance', 'Allows viewing attendance days, punch logs, and raw events.', 'high'),
  ('hr.attendance.manage', 'Manage HR Attendance', 'Allows managing attendance day foundation records.', 'critical'),
  ('hr.attendance.review', 'Review HR Attendance', 'Allows reviewing attendance exceptions and review queue items.', 'critical'),
  ('hr.attendance.adjust', 'Adjust HR Attendance', 'Allows creating attendance adjustment readiness references.', 'critical'),
  ('hr.attendance.lock', 'Lock HR Attendance', 'Allows locking attendance days for review or payroll readiness.', 'critical'),
  ('hr.attendance.import', 'Import HR Attendance', 'Allows importing append-only attendance punch logs.', 'critical'),
  ('hr.attendance.devices.view', 'View Attendance Device Links', 'Allows viewing attendance punch log device references.', 'high'),
  ('hr.attendance.exceptions.view', 'View Attendance Exceptions', 'Allows viewing attendance exception foundation records.', 'high'),
  ('hr.attendance.exceptions.manage', 'Manage Attendance Exceptions', 'Allows managing attendance exception resolution readiness.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.attendance.view',
  'hr.attendance.manage',
  'hr.attendance.review',
  'hr.attendance.adjust',
  'hr.attendance.lock',
  'hr.attendance.import',
  'hr.attendance.devices.view',
  'hr.attendance.exceptions.view',
  'hr.attendance.exceptions.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
