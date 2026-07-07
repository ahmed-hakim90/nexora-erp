-- OP-07 Enterprise Attendance Sync Runtime v2
-- Adds checkpoint column, preview draft expiry, and enterprise sync permissions.

alter table public.hr_attendance_devices
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists sync_checkpoint jsonb not null default '{}'::jsonb;

alter table public.hr_attendance_device_sync_sessions
  add column if not exists sync_strategy text,
  add column if not exists preview_expires_at timestamptz;

create index if not exists hr_attendance_device_sync_sessions_strategy_idx
  on public.hr_attendance_device_sync_sessions (tenant_id, company_id, sync_strategy, created_at desc)
  where deleted_at is null;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.attendance.sync', 'Attendance Sync', 'Start enterprise attendance device synchronization.', 'high'),
  ('hr.attendance.preview', 'Attendance Sync Preview', 'View and save attendance sync preview drafts.', 'normal'),
  ('hr.attendance.force-sync', 'Attendance Force Re-sync', 'Force re-download punches even if already imported.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.attendance.sync',
  'hr.attendance.preview',
  'hr.attendance.force-sync'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
