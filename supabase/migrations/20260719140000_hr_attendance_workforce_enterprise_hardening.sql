-- HR Attendance & Workforce Enterprise Hardening Sprint
-- Device commands, health, config versioning, alerts, replay, recalculation, queue metrics, recovery.

do $$ begin
  create type public.hr_device_health_score as enum (
    'healthy', 'warning', 'critical', 'offline', 'maintenance'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_device_command_status as enum (
    'queued', 'running', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_workforce_alert_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_workforce_alert_status as enum ('open', 'acknowledged', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_replay_status as enum (
    'draft', 'reading_logs', 'rebuilding', 'recalculating', 'preview', 'approved', 'published', 'rolled_back', 'failed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_attendance_recalc_status as enum (
    'queued', 'running', 'preview', 'approved', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_workforce_recovery_status as enum (
    'pending', 'in_progress', 'verified', 'failed'
  );
exception when duplicate_object then null;
end $$;

alter table public.hr_attendance_devices
  add column if not exists driver_key text,
  add column if not exists health_score public.hr_device_health_score not null default 'offline',
  add column if not exists clock_drift_seconds integer not null default 0,
  add column if not exists device_time_at timestamptz,
  add column if not exists cpu_usage_pct numeric(5, 2) check (cpu_usage_pct is null or (cpu_usage_pct >= 0 and cpu_usage_pct <= 100)),
  add column if not exists memory_usage_pct numeric(5, 2) check (memory_usage_pct is null or (memory_usage_pct >= 0 and memory_usage_pct <= 100)),
  add column if not exists storage_usage_pct numeric(5, 2) check (storage_usage_pct is null or (storage_usage_pct >= 0 and storage_usage_pct <= 100)),
  add column if not exists temperature_c numeric(6, 2),
  add column if not exists voltage_v numeric(6, 2),
  add column if not exists network_status text not null default 'unknown'
    check (network_status in ('connected', 'degraded', 'disconnected', 'unknown')),
  add column if not exists sdk_version text,
  add column if not exists user_capacity integer check (user_capacity is null or user_capacity >= 0),
  add column if not exists punch_capacity integer check (punch_capacity is null or punch_capacity >= 0),
  add column if not exists fingerprint_capacity integer check (fingerprint_capacity is null or fingerprint_capacity >= 0),
  add column if not exists face_capacity integer check (face_capacity is null or face_capacity >= 0),
  add column if not exists card_capacity integer check (card_capacity is null or card_capacity >= 0),
  add column if not exists map_zone text,
  add column if not exists map_floor text,
  add column if not exists map_building text,
  add column if not exists map_production_line text;

create table if not exists public.hr_attendance_device_commands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  command_key text not null,
  status public.hr_device_command_status not null default 'queued',
  requires_confirmation boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  execution_log text not null default '',
  error_message text,
  correlation_id text not null,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(command_key)) > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(result) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_attendance_device_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  health_score public.hr_device_health_score not null,
  connection_status text not null,
  cpu_usage_pct numeric(5, 2),
  memory_usage_pct numeric(5, 2),
  storage_usage_pct numeric(5, 2),
  temperature_c numeric(6, 2),
  voltage_v numeric(6, 2),
  network_status text not null default 'unknown',
  firmware_version text,
  sdk_version text,
  clock_drift_seconds integer not null default 0,
  current_users integer not null default 0,
  current_punches integer not null default 0,
  latency_ms integer,
  snapshot_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.hr_attendance_device_config_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  device_id uuid not null references public.hr_attendance_devices(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  config_payload jsonb not null default '{}'::jsonb,
  change_summary text not null default '',
  requires_approval boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  restored_from_version_id uuid references public.hr_attendance_device_config_versions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (jsonb_typeof(config_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.hr_workforce_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  device_id uuid references public.hr_attendance_devices(id) on delete set null,
  alert_key text not null,
  severity public.hr_workforce_alert_severity not null default 'warning',
  status public.hr_workforce_alert_status not null default 'open',
  title text not null,
  body text not null default '',
  channels jsonb not null default '["in_app"]'::jsonb,
  correlation_id text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  check (length(trim(alert_key)) > 0),
  check (length(trim(title)) > 0),
  check (jsonb_typeof(channels) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_attendance_replay_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  scope_kind text not null check (scope_kind in ('employee', 'department', 'branch', 'company', 'payroll_period')),
  scope_ref text not null,
  period_start date,
  period_end date,
  status public.hr_attendance_replay_status not null default 'draft',
  progress integer not null default 0 check (progress between 0 and 100),
  preview_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  rollback_payload jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  published_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  check (jsonb_typeof(preview_payload) = 'object'),
  check (jsonb_typeof(result_payload) = 'object'),
  check (jsonb_typeof(rollback_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_attendance_recalc_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  reason_key text not null,
  reason_label text not null default '',
  scope_kind text not null check (scope_kind in ('employee', 'department', 'branch', 'company')),
  scope_ref text not null,
  period_start date,
  period_end date,
  status public.hr_attendance_recalc_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  affected_employee_count integer not null default 0,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  preview_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  check (length(trim(reason_key)) > 0),
  check (jsonb_typeof(preview_payload) = 'object'),
  check (jsonb_typeof(result_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_workforce_recovery_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  device_id uuid references public.hr_attendance_devices(id) on delete set null,
  incident_key text not null,
  status public.hr_workforce_recovery_status not null default 'pending',
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retries integer not null default 4 check (max_retries >= 0),
  next_retry_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  correlation_id text not null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.hr_workforce_queue_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  queue_key text not null,
  waiting_count integer not null default 0,
  running_count integer not null default 0,
  retry_count integer not null default 0,
  completed_count integer not null default 0,
  cancelled_count integer not null default 0,
  failed_count integer not null default 0,
  dead_letter_count integer not null default 0,
  avg_wait_ms integer not null default 0,
  avg_execution_ms integer not null default 0,
  snapshot_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists hr_attendance_device_commands_device_idx
  on public.hr_attendance_device_commands (tenant_id, company_id, device_id, status, created_at desc)
  where deleted_at is null;

create index if not exists hr_attendance_device_health_snapshots_device_idx
  on public.hr_attendance_device_health_snapshots (tenant_id, device_id, snapshot_at desc);

create index if not exists hr_attendance_device_config_versions_device_idx
  on public.hr_attendance_device_config_versions (tenant_id, device_id, version_no desc);

create index if not exists hr_workforce_alerts_status_idx
  on public.hr_workforce_alerts (tenant_id, company_id, status, severity, created_at desc)
  where deleted_at is null;

create index if not exists hr_attendance_replay_sessions_status_idx
  on public.hr_attendance_replay_sessions (tenant_id, company_id, status, created_at desc)
  where deleted_at is null;

create index if not exists hr_attendance_recalc_sessions_status_idx
  on public.hr_attendance_recalc_sessions (tenant_id, company_id, status, created_at desc)
  where deleted_at is null;

create index if not exists hr_workforce_recovery_incidents_retry_idx
  on public.hr_workforce_recovery_incidents (tenant_id, status, next_retry_at)
  where status in ('pending', 'in_progress');

alter table public.hr_attendance_device_commands enable row level security;
alter table public.hr_attendance_device_health_snapshots enable row level security;
alter table public.hr_attendance_device_config_versions enable row level security;
alter table public.hr_workforce_alerts enable row level security;
alter table public.hr_attendance_replay_sessions enable row level security;
alter table public.hr_attendance_recalc_sessions enable row level security;
alter table public.hr_workforce_recovery_incidents enable row level security;
alter table public.hr_workforce_queue_metrics enable row level security;

alter table public.hr_attendance_device_commands force row level security;
alter table public.hr_attendance_device_health_snapshots force row level security;
alter table public.hr_attendance_device_config_versions force row level security;
alter table public.hr_workforce_alerts force row level security;
alter table public.hr_attendance_replay_sessions force row level security;
alter table public.hr_attendance_recalc_sessions force row level security;
alter table public.hr_workforce_recovery_incidents force row level security;
alter table public.hr_workforce_queue_metrics force row level security;

create policy hr_attendance_device_commands_select on public.hr_attendance_device_commands for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.devices.view', tenant_id));

create policy hr_attendance_device_commands_manage on public.hr_attendance_device_commands for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.devices.commands.run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.devices.commands.run', tenant_id));

create policy hr_attendance_device_health_snapshots_select on public.hr_attendance_device_health_snapshots for select to authenticated
  using (public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.devices.diagnostics.view', tenant_id));

create policy hr_attendance_device_config_versions_select on public.hr_attendance_device_config_versions for select to authenticated
  using (public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.devices.config.view', tenant_id));

create policy hr_attendance_device_config_versions_manage on public.hr_attendance_device_config_versions for all to authenticated
  using (public.has_permission('hr.devices.config.manage', tenant_id))
  with check (public.has_permission('hr.devices.config.manage', tenant_id));

create policy hr_workforce_alerts_select on public.hr_workforce_alerts for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.workforce.alerts.view', tenant_id));

create policy hr_workforce_alerts_manage on public.hr_workforce_alerts for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.alerts.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.alerts.manage', tenant_id));

create policy hr_attendance_replay_sessions_select on public.hr_attendance_replay_sessions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.attendance.replay.view', tenant_id));

create policy hr_attendance_replay_sessions_manage on public.hr_attendance_replay_sessions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.replay.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.replay.manage', tenant_id));

create policy hr_attendance_recalc_sessions_select on public.hr_attendance_recalc_sessions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.attendance.recalculate.view', tenant_id));

create policy hr_attendance_recalc_sessions_manage on public.hr_attendance_recalc_sessions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.attendance.recalculate.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.attendance.recalculate.manage', tenant_id));

create policy hr_workforce_recovery_incidents_select on public.hr_workforce_recovery_incidents for select to authenticated
  using (public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.devices.diagnostics.view', tenant_id));

create policy hr_workforce_queue_metrics_select on public.hr_workforce_queue_metrics for select to authenticated
  using (public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.workforce.queue.view', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.devices.commands.run', 'Run Device Commands', 'Execute remote device commands (ping, restart, sync, backup).', 'critical'),
  ('hr.devices.commands.restart', 'Restart Devices', 'Restart attendance devices remotely.', 'critical'),
  ('hr.devices.commands.shutdown', 'Shutdown Devices', 'Shutdown attendance devices remotely.', 'critical'),
  ('hr.devices.commands.factory_reset', 'Factory Reset Devices', 'Factory reset attendance devices.', 'critical'),
  ('hr.devices.config.view', 'View Device Configuration', 'View device configuration and version history.', 'high'),
  ('hr.devices.config.manage', 'Manage Device Configuration', 'Update and restore device configuration.', 'critical'),
  ('hr.devices.diagnostics.view', 'View Device Diagnostics', 'View device health, capacity, and diagnostics.', 'high'),
  ('hr.devices.drivers.manage', 'Manage Device Drivers', 'Configure device driver settings.', 'high'),
  ('hr.workforce.monitor.view', 'View Workforce Live Monitor', 'View live workforce attendance monitor.', 'standard'),
  ('hr.workforce.alerts.view', 'View Workforce Alerts', 'View workforce and device alerts.', 'standard'),
  ('hr.workforce.alerts.manage', 'Manage Workforce Alerts', 'Acknowledge and resolve workforce alerts.', 'high'),
  ('hr.workforce.queue.view', 'View Workforce Queue Metrics', 'View background job queue metrics.', 'standard'),
  ('hr.attendance.replay.view', 'View Attendance Replay', 'View attendance replay sessions.', 'high'),
  ('hr.attendance.replay.manage', 'Manage Attendance Replay', 'Run and publish attendance replay.', 'critical'),
  ('hr.attendance.recalculate.view', 'View Attendance Recalculation', 'View attendance recalculation sessions.', 'high'),
  ('hr.attendance.recalculate.manage', 'Manage Attendance Recalculation', 'Run and approve attendance recalculation.', 'critical'),
  ('hr.attendance.simulation.view', 'View Attendance Rule Simulation', 'Simulate attendance policy impact.', 'standard'),
  ('hr.workforce.reports.view', 'View Workforce Reports', 'View workforce enterprise reports.', 'standard'),
  ('hr.workforce.recovery.manage', 'Manage Disaster Recovery', 'Run device backup/restore and recovery wizard.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.devices.commands.run',
  'hr.devices.commands.restart',
  'hr.devices.commands.shutdown',
  'hr.devices.config.view',
  'hr.devices.config.manage',
  'hr.devices.diagnostics.view',
  'hr.devices.drivers.manage',
  'hr.workforce.monitor.view',
  'hr.workforce.alerts.view',
  'hr.workforce.alerts.manage',
  'hr.workforce.queue.view',
  'hr.attendance.replay.view',
  'hr.attendance.replay.manage',
  'hr.attendance.recalculate.view',
  'hr.attendance.recalculate.manage',
  'hr.attendance.simulation.view',
  'hr.workforce.reports.view',
  'hr.workforce.recovery.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
