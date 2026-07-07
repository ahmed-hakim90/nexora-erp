insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.view', 'Manufacturing View', 'View Manufacturing foundation contracts.', 'low'),
  ('manufacturing.planning.view', 'Manufacturing Planning View', 'View production planning contracts.', 'low'),
  ('manufacturing.planning.manage', 'Manufacturing Planning Manage', 'Manage production planning contract records.', 'standard'),
  ('manufacturing.orders.view', 'Manufacturing Orders View', 'View manufacturing order and work order contracts.', 'low'),
  ('manufacturing.orders.manage', 'Manufacturing Orders Manage', 'Manage manufacturing order and work order contract records.', 'standard'),
  ('manufacturing.orders.release', 'Manufacturing Orders Release', 'Release manufacturing order contracts.', 'standard'),
  ('manufacturing.orders.close', 'Manufacturing Orders Close', 'Close manufacturing order contracts.', 'standard'),
  ('manufacturing.operations.view', 'Manufacturing Operations View', 'View operation and operation plan contracts.', 'low'),
  ('manufacturing.operations.manage', 'Manufacturing Operations Manage', 'Manage operation and operation plan contract records.', 'standard'),
  ('manufacturing.crew.view', 'Manufacturing Crew View', 'View crew assignment contracts that reference HR workers and assignments.', 'low'),
  ('manufacturing.crew.manage', 'Manufacturing Crew Manage', 'Manage crew assignment contracts that reference HR workers and assignments.', 'standard'),
  ('manufacturing.crew.approve', 'Manufacturing Crew Approve', 'Approve crew assignment contracts.', 'standard'),
  ('manufacturing.reports.view', 'Manufacturing Reports View', 'View production, downtime, scrap, rework, and KPI report contracts.', 'low'),
  ('manufacturing.reports.create', 'Manufacturing Reports Create', 'Create manufacturing report business document contracts.', 'standard'),
  ('manufacturing.reports.submit', 'Manufacturing Reports Submit', 'Submit manufacturing report business document contracts.', 'standard'),
  ('manufacturing.reports.approve', 'Manufacturing Reports Approve', 'Approve manufacturing report business document contracts.', 'high'),
  ('manufacturing.reports.post', 'Manufacturing Reports Post', 'Post manufacturing report business document contracts without inventory, cost, payroll, quality, or accounting execution.', 'high'),
  ('manufacturing.scrap.manage', 'Manufacturing Scrap Manage', 'Manage scrap report contracts.', 'standard'),
  ('manufacturing.downtime.manage', 'Manufacturing Downtime Manage', 'Manage downtime report contracts.', 'standard'),
  ('manufacturing.rework.manage', 'Manufacturing Rework Manage', 'Manage rework report contracts.', 'standard'),
  ('manufacturing.kpis.view', 'Manufacturing KPIs View', 'View Manufacturing KPI fact readiness.', 'low')
on conflict (permission_key) where deleted_at is null do update
set
  label = excluded.label,
  description = excluded.description,
  risk_level = excluded.risk_level,
  updated_at = now();
