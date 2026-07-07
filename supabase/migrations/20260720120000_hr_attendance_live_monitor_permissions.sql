-- HR Attendance Live Monitor permissions

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.attendance.monitor.view', 'View Attendance Live Monitor', 'View live attendance monitor dashboard and employee grid.', 'standard'),
  ('hr.attendance.monitor.manage', 'Manage Attendance Live Monitor', 'Run supervisor actions from the live attendance monitor.', 'high'),
  ('hr.attendance.exception.resolve', 'Resolve Attendance Exceptions', 'Approve or dismiss attendance exceptions from live monitor.', 'high'),
  ('hr.attendance.live.export', 'Export Attendance Live Snapshot', 'Export live attendance monitor snapshots.', 'standard')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.attendance.monitor.view',
  'hr.attendance.monitor.manage',
  'hr.attendance.exception.resolve',
  'hr.attendance.live.export'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
