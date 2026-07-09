-- OP-08: Attendance payroll export runtime — lock, readiness, snapshots, export history.
-- Attendance is the canonical payroll input source. No payroll calculation in this sprint.

alter type public.hr_attendance_day_status add value if not exists 'processing';
alter type public.hr_attendance_day_status add value if not exists 'ready_for_payroll';
alter type public.hr_attendance_day_status add value if not exists 'reopened';

create type public.hr_attendance_closing_scope as enum (
  'weekly',
  'monthly',
  'department',
  'branch',
  'company'
);

create type public.hr_attendance_closing_status as enum (
  'open',
  'processing',
  'ready_for_payroll',
  'locked',
  'exported',
  'reopened'
);

create type public.hr_attendance_export_batch_status as enum (
  'draft',
  'validating',
  'completed',
  'failed',
  'cancelled',
  're_exported',
  'downloaded'
);

create table public.hr_attendance_closings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  payroll_group_id uuid,
  scope public.hr_attendance_closing_scope not null,
  period_start date not null,
  period_end date not null,
  status public.hr_attendance_closing_status not null default 'open',
  employee_count integer not null default 0 check (employee_count >= 0),
  ready_employee_count integer not null default 0 check (ready_employee_count >= 0),
  blocked_employee_count integer not null default 0 check (blocked_employee_count >= 0),
  payroll_ready_percent numeric(5, 2) not null default 0 check (payroll_ready_percent >= 0 and payroll_ready_percent <= 100),
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  exported_at timestamptz,
  exported_by uuid references auth.users(id),
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id),
  reopen_reason text,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (period_end >= period_start),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_payroll_export_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  closing_id uuid references public.hr_attendance_closings(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  payroll_group_id uuid,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  status public.hr_attendance_export_batch_status not null default 'draft',
  employee_count integer not null default 0 check (employee_count >= 0),
  validation_report jsonb not null default '{}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  downloaded_at timestamptz,
  downloaded_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  re_exported_from_batch_id uuid references public.hr_attendance_payroll_export_batches(id) on delete restrict,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true, 'payroll_calculation', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (period_end >= period_start),
  check (jsonb_typeof(validation_report) = 'object'),
  check (jsonb_typeof(filters) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_attendance_payroll_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  export_batch_id uuid not null references public.hr_attendance_payroll_export_batches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  worked_days numeric(8, 2) not null default 0,
  worked_hours numeric(10, 2) not null default 0,
  late_minutes integer not null default 0,
  early_leave_minutes integer not null default 0,
  overtime_hours numeric(10, 2) not null default 0,
  leave_days numeric(8, 2) not null default 0,
  absence_days numeric(8, 2) not null default 0,
  holiday_days numeric(8, 2) not null default 0,
  weekend_days numeric(8, 2) not null default 0,
  paid_days numeric(8, 2) not null default 0,
  unpaid_days numeric(8, 2) not null default 0,
  night_hours numeric(10, 2) not null default 0,
  shift_count integer not null default 0,
  attendance_day_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object('immutable', true, 'payroll_reads_snapshot_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (period_end >= period_start),
  check (jsonb_typeof(attendance_day_ids) = 'array'),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_attendance_closings_scope_period_uq
  on public.hr_attendance_closings (tenant_id, company_id, scope, period_start, period_end, coalesce(branch_id::text, ''), coalesce(department_id::text, ''))
  where deleted_at is null;

create index hr_attendance_closings_status_idx
  on public.hr_attendance_closings (tenant_id, company_id, status, period_start, period_end)
  where deleted_at is null;

create index hr_attendance_export_batches_period_idx
  on public.hr_attendance_payroll_export_batches (tenant_id, company_id, period_start, period_end, status)
  where deleted_at is null;

create unique index hr_attendance_payroll_snapshots_batch_employee_uq
  on public.hr_attendance_payroll_snapshots (tenant_id, export_batch_id, employee_id)
  where deleted_at is null;

create index hr_attendance_payroll_snapshots_employee_idx
  on public.hr_attendance_payroll_snapshots (tenant_id, employee_id, period_start, period_end)
  where deleted_at is null;

drop trigger if exists hr_attendance_closings_touch_updated_at on public.hr_attendance_closings;
create trigger hr_attendance_closings_touch_updated_at before update on public.hr_attendance_closings for each row execute function public.touch_platform_row();

drop trigger if exists hr_attendance_payroll_export_batches_touch_updated_at on public.hr_attendance_payroll_export_batches;
create trigger hr_attendance_payroll_export_batches_touch_updated_at before update on public.hr_attendance_payroll_export_batches for each row execute function public.touch_platform_row();

drop trigger if exists hr_attendance_payroll_snapshots_touch_updated_at on public.hr_attendance_payroll_snapshots;
create trigger hr_attendance_payroll_snapshots_touch_updated_at before update on public.hr_attendance_payroll_snapshots for each row execute function public.touch_platform_row();

create or replace function public.prevent_hr_attendance_payroll_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (
      old.worked_days is distinct from new.worked_days
      or old.worked_hours is distinct from new.worked_hours
      or old.late_minutes is distinct from new.late_minutes
      or old.early_leave_minutes is distinct from new.early_leave_minutes
      or old.overtime_hours is distinct from new.overtime_hours
      or old.leave_days is distinct from new.leave_days
      or old.absence_days is distinct from new.absence_days
      or old.holiday_days is distinct from new.holiday_days
      or old.weekend_days is distinct from new.weekend_days
      or old.paid_days is distinct from new.paid_days
      or old.unpaid_days is distinct from new.unpaid_days
      or old.night_hours is distinct from new.night_hours
      or old.shift_count is distinct from new.shift_count
      or old.payload is distinct from new.payload
      or old.attendance_day_ids is distinct from new.attendance_day_ids
    )
  then
    raise exception 'HR attendance payroll snapshots are immutable after creation.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_hr_attendance_payroll_snapshot_mutation() from public;
grant execute on function public.prevent_hr_attendance_payroll_snapshot_mutation() to authenticated;

drop trigger if exists hr_attendance_payroll_snapshots_prevent_mutation on public.hr_attendance_payroll_snapshots;
create trigger hr_attendance_payroll_snapshots_prevent_mutation
  before update on public.hr_attendance_payroll_snapshots
  for each row execute function public.prevent_hr_attendance_payroll_snapshot_mutation();

alter table public.hr_attendance_closings enable row level security;
alter table public.hr_attendance_payroll_export_batches enable row level security;
alter table public.hr_attendance_payroll_snapshots enable row level security;

alter table public.hr_attendance_closings force row level security;
alter table public.hr_attendance_payroll_export_batches force row level security;
alter table public.hr_attendance_payroll_snapshots force row level security;

create policy hr_attendance_closings_select on public.hr_attendance_closings for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.view', tenant_id));

create policy hr_attendance_closings_manage on public.hr_attendance_closings for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.lock', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.lock', tenant_id));

create policy hr_attendance_export_batches_select on public.hr_attendance_payroll_export_batches for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and (public.has_permission('hr.attendance.export', tenant_id) or public.has_permission('hr.attendance.snapshot.view', tenant_id)));

create policy hr_attendance_export_batches_manage on public.hr_attendance_payroll_export_batches for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.export', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.export', tenant_id));

create policy hr_attendance_payroll_snapshots_select on public.hr_attendance_payroll_snapshots for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.attendance.snapshot.view', tenant_id));

create policy hr_attendance_payroll_snapshots_insert on public.hr_attendance_payroll_snapshots for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.export', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.attendance.export', 'Export HR Attendance to Payroll', 'Allows exporting attendance payroll input snapshots.', 'critical'),
  ('hr.attendance.reopen', 'Reopen Locked HR Attendance', 'Allows reopening locked or exported attendance with audit trail.', 'critical'),
  ('hr.attendance.snapshot.view', 'View Attendance Payroll Snapshots', 'Allows viewing immutable attendance payroll input snapshots.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.attendance.export',
  'hr.attendance.reopen',
  'hr.attendance.snapshot.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
