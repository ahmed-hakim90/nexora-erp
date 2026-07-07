-- HR Attendance Device Center — enterprise sync, preview, import, logs, and mappings runtime.

do $$ begin
  create type public.hr_attendance_device_health_status as enum (
    'online', 'connecting', 'sync_running', 'offline', 'never_connected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_device_sync_status as enum (
    'queued',
    'connecting',
    'downloading_users',
    'downloading_punches',
    'validating',
    'preview_ready',
    'importing',
    'completed',
    'failed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_device_sync_phase as enum (
    'connect',
    'download_users',
    'download_punches',
    'validate',
    'build_preview',
    'ready_to_import',
    'import'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_validation_severity as enum ('info', 'warning', 'error', 'blocking');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_auto_sync_interval as enum (
    'disabled', '5min', '15min', '30min', 'hourly', 'daily', 'weekly'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_device_log_level as enum ('debug', 'info', 'warn', 'error');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_device_log_source as enum ('device', 'sync', 'diagnostic', 'system');
exception when duplicate_object then null;
end $$;

alter table public.hr_attendance_devices
  add column if not exists port integer check (port is null or (port > 0 and port <= 65535)),
  add column if not exists firmware_version text,
  add column if not exists serial_number text,
  add column if not exists health_status public.hr_attendance_device_health_status not null default 'never_connected',
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists auto_sync_interval public.hr_attendance_auto_sync_interval not null default 'disabled',
  add column if not exists last_auto_sync_at timestamptz,
  add column if not exists next_auto_sync_at timestamptz,
  add column if not exists connection_quality text not null default 'unknown'
    check (connection_quality in ('excellent', 'good', 'fair', 'poor', 'unknown')),
  add column if not exists employees_loaded_count integer not null default 0 check (employees_loaded_count >= 0),
  add column if not exists pending_queue_count integer not null default 0 check (pending_queue_count >= 0),
  add column if not exists latency_ms integer check (latency_ms is null or latency_ms >= 0),
  add column if not exists today_punches_count integer not null default 0 check (today_punches_count >= 0);

create table if not exists public.hr_attendance_device_sync_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  status public.hr_attendance_device_sync_status not null default 'queued',
  phase public.hr_attendance_device_sync_phase not null default 'connect',
  progress integer not null default 0 check (progress between 0 and 100),
  records_processed integer not null default 0 check (records_processed >= 0),
  records_total integer not null default 0 check (records_total >= 0),
  speed_records_per_sec numeric(12, 2) not null default 0 check (speed_records_per_sec >= 0),
  phase_message text not null default '',
  preview_payload jsonb not null default '{}'::jsonb,
  import_report jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  error_message text,
  idempotency_key text not null,
  correlation_id text,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(preview_payload) = 'object'),
  check (jsonb_typeof(import_report) = 'object'),
  check (jsonb_typeof(summary) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_attendance_device_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  sync_session_id uuid references public.hr_attendance_device_sync_sessions(id) on delete set null,
  log_level public.hr_attendance_device_log_level not null default 'info',
  log_source public.hr_attendance_device_log_source not null default 'system',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(message)) > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_attendance_device_employee_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  device_employee_code text not null,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(device_employee_code)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists hr_attendance_device_sync_sessions_idempotency_uq
  on public.hr_attendance_device_sync_sessions (tenant_id, idempotency_key)
  where deleted_at is null;

create index if not exists hr_attendance_device_sync_sessions_device_idx
  on public.hr_attendance_device_sync_sessions (tenant_id, company_id, device_id, status, created_at desc)
  where deleted_at is null;

create index if not exists hr_attendance_device_logs_device_idx
  on public.hr_attendance_device_logs (tenant_id, device_id, created_at desc)
  where deleted_at is null;

create index if not exists hr_attendance_device_logs_session_idx
  on public.hr_attendance_device_logs (sync_session_id, created_at desc)
  where deleted_at is null and sync_session_id is not null;

create unique index if not exists hr_attendance_device_employee_mappings_code_uq
  on public.hr_attendance_device_employee_mappings (tenant_id, device_id, device_employee_code)
  where deleted_at is null;

create index if not exists hr_attendance_device_employee_mappings_employee_idx
  on public.hr_attendance_device_employee_mappings (tenant_id, employee_id)
  where deleted_at is null;

create index if not exists hr_attendance_devices_health_idx
  on public.hr_attendance_devices (tenant_id, company_id, health_status, status)
  where deleted_at is null;

drop trigger if exists hr_attendance_device_sync_sessions_touch_updated_at on public.hr_attendance_device_sync_sessions;
create trigger hr_attendance_device_sync_sessions_touch_updated_at
  before update on public.hr_attendance_device_sync_sessions
  for each row execute function public.touch_platform_row();

drop trigger if exists hr_attendance_device_logs_touch_updated_at on public.hr_attendance_device_logs;
create trigger hr_attendance_device_logs_touch_updated_at
  before update on public.hr_attendance_device_logs
  for each row execute function public.touch_platform_row();

drop trigger if exists hr_attendance_device_employee_mappings_touch_updated_at on public.hr_attendance_device_employee_mappings;
create trigger hr_attendance_device_employee_mappings_touch_updated_at
  before update on public.hr_attendance_device_employee_mappings
  for each row execute function public.touch_platform_row();

alter table public.hr_attendance_device_sync_sessions enable row level security;
alter table public.hr_attendance_device_logs enable row level security;
alter table public.hr_attendance_device_employee_mappings enable row level security;

alter table public.hr_attendance_device_sync_sessions force row level security;
alter table public.hr_attendance_device_logs force row level security;
alter table public.hr_attendance_device_employee_mappings force row level security;

create policy hr_attendance_device_sync_sessions_select on public.hr_attendance_device_sync_sessions for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.devices.view', tenant_id)
  );

create policy hr_attendance_device_sync_sessions_manage on public.hr_attendance_device_sync_sessions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id));

create policy hr_attendance_device_logs_select on public.hr_attendance_device_logs for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.attendance.devices.logs.view', tenant_id)
  );

create policy hr_attendance_device_logs_insert on public.hr_attendance_device_logs for insert to authenticated
  with check (
    is_active = true and deleted_at is null
    and public.has_permission('hr.devices.manage', tenant_id)
  );

create policy hr_attendance_device_mappings_select on public.hr_attendance_device_employee_mappings for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.devices.view', tenant_id)
  );

create policy hr_attendance_device_mappings_manage on public.hr_attendance_device_employee_mappings for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.devices.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.attendance.devices.sync', 'Run Attendance Device Sync', 'Allows starting attendance device synchronization jobs.', 'critical'),
  ('hr.attendance.devices.sync.cancel', 'Cancel Attendance Device Sync', 'Allows cancelling in-progress device synchronization jobs.', 'critical'),
  ('hr.attendance.devices.import.approve', 'Approve Attendance Device Import', 'Allows approving attendance imports from device sync previews.', 'critical'),
  ('hr.attendance.devices.logs.view', 'View Attendance Device Logs', 'Allows viewing attendance device diagnostic and sync logs.', 'high'),
  ('hr.attendance.devices.reports.download', 'Download Attendance Device Reports', 'Allows downloading attendance device sync and import reports.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.attendance.devices.sync',
  'hr.attendance.devices.sync.cancel',
  'hr.attendance.devices.import.approve',
  'hr.attendance.devices.logs.view',
  'hr.attendance.devices.reports.download'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
