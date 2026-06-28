-- Runtime unblocker for the Manufacturing Targets workspace.
-- Adds the target tables used by the current UI without touching legacy
-- manufacturing tables that already exist with older shapes.

create table if not exists public.manufacturing_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  product_key text not null,
  name text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (product_key = lower(product_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_work_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  work_center_key text not null,
  name text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (work_center_key = lower(work_center_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  work_center_id uuid references public.manufacturing_work_centers(id) on delete restrict,
  line_key text not null,
  name text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (line_key = lower(line_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  plan_key text not null,
  plan_date date not null,
  scheduling_engine_implemented boolean not null default false check (scheduling_engine_implemented = false),
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (plan_key = lower(plan_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_daily_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  report_key text not null,
  report_date date not null,
  shift_key text not null,
  manufacturing_product_id uuid references public.manufacturing_products(id) on delete restrict,
  production_line_id uuid references public.manufacturing_lines(id) on delete restrict,
  planned_quantity numeric(18, 6) not null default 0 check (planned_quantity >= 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  scrap_quantity numeric(18, 6) not null default 0 check (scrap_quantity >= 0),
  rework_quantity numeric(18, 6) not null default 0 check (rework_quantity >= 0),
  downtime_minutes numeric(18, 6) not null default 0 check (downtime_minutes >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (report_key = lower(report_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_product_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  target_key text not null,
  target_period text not null check (target_period in ('daily', 'shift', 'hourly')),
  target_quantity numeric(18, 6) not null check (target_quantity > 0),
  incentive_calculation_implemented boolean not null default false check (incentive_calculation_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (target_key = lower(target_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_line_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  plan_id uuid not null references public.manufacturing_plans(id) on delete restrict,
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  production_line_id uuid not null references public.manufacturing_lines(id) on delete restrict,
  target_key text not null,
  planned_quantity numeric(18, 6) not null check (planned_quantity > 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  achievement_percent numeric(9, 4) generated always as (case when planned_quantity = 0 then null else round((actual_quantity / planned_quantity) * 100, 4) end) stored,
  incentive_calculation_implemented boolean not null default false check (incentive_calculation_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (target_key = lower(target_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_worker_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  plan_id uuid not null references public.manufacturing_plans(id) on delete restrict,
  production_line_id uuid not null references public.manufacturing_lines(id) on delete restrict,
  worker_ref_id uuid not null,
  target_key text not null,
  target_quantity numeric(18, 6) not null check (target_quantity > 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  achievement_percent numeric(9, 4) generated always as (case when target_quantity = 0 then null else round((actual_quantity / target_quantity) * 100, 4) end) stored,
  payroll_calculation_implemented boolean not null default false check (payroll_calculation_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (target_key = lower(target_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists manufacturing_products_runtime_scope_key_uq on public.manufacturing_products (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), product_key) where deleted_at is null;
create unique index if not exists manufacturing_work_centers_runtime_scope_key_uq on public.manufacturing_work_centers (tenant_id, company_id, branch_id, work_center_key) where deleted_at is null;
create unique index if not exists manufacturing_lines_runtime_scope_key_uq on public.manufacturing_lines (tenant_id, company_id, branch_id, line_key) where deleted_at is null;
create unique index if not exists manufacturing_plans_runtime_scope_key_uq on public.manufacturing_plans (tenant_id, company_id, branch_id, plan_key) where deleted_at is null;
create unique index if not exists manufacturing_daily_reports_runtime_scope_key_uq on public.manufacturing_daily_reports (tenant_id, company_id, branch_id, report_key) where deleted_at is null;
create unique index if not exists manufacturing_product_targets_runtime_scope_key_uq on public.manufacturing_product_targets (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), target_key) where deleted_at is null;
create unique index if not exists manufacturing_line_targets_runtime_scope_key_uq on public.manufacturing_line_targets (tenant_id, company_id, branch_id, target_key) where deleted_at is null;
create unique index if not exists manufacturing_worker_targets_runtime_scope_key_uq on public.manufacturing_worker_targets (tenant_id, company_id, branch_id, target_key) where deleted_at is null;

create index if not exists manufacturing_daily_reports_runtime_date_idx on public.manufacturing_daily_reports (tenant_id, company_id, branch_id, report_date desc, id desc) where deleted_at is null;

alter table public.manufacturing_products enable row level security;
alter table public.manufacturing_work_centers enable row level security;
alter table public.manufacturing_lines enable row level security;
alter table public.manufacturing_plans enable row level security;
alter table public.manufacturing_daily_reports enable row level security;
alter table public.manufacturing_product_targets enable row level security;
alter table public.manufacturing_line_targets enable row level security;
alter table public.manufacturing_worker_targets enable row level security;

alter table public.manufacturing_products force row level security;
alter table public.manufacturing_work_centers force row level security;
alter table public.manufacturing_lines force row level security;
alter table public.manufacturing_plans force row level security;
alter table public.manufacturing_daily_reports force row level security;
alter table public.manufacturing_product_targets force row level security;
alter table public.manufacturing_line_targets force row level security;
alter table public.manufacturing_worker_targets force row level security;

drop policy if exists manufacturing_products_runtime_select on public.manufacturing_products;
drop policy if exists manufacturing_products_runtime_write on public.manufacturing_products;
drop policy if exists manufacturing_work_centers_runtime_select on public.manufacturing_work_centers;
drop policy if exists manufacturing_work_centers_runtime_write on public.manufacturing_work_centers;
drop policy if exists manufacturing_lines_runtime_select on public.manufacturing_lines;
drop policy if exists manufacturing_lines_runtime_write on public.manufacturing_lines;
drop policy if exists manufacturing_plans_runtime_select on public.manufacturing_plans;
drop policy if exists manufacturing_plans_runtime_write on public.manufacturing_plans;
drop policy if exists manufacturing_daily_reports_runtime_select on public.manufacturing_daily_reports;
drop policy if exists manufacturing_daily_reports_runtime_write on public.manufacturing_daily_reports;
drop policy if exists manufacturing_product_targets_runtime_select on public.manufacturing_product_targets;
drop policy if exists manufacturing_product_targets_runtime_write on public.manufacturing_product_targets;
drop policy if exists manufacturing_line_targets_runtime_select on public.manufacturing_line_targets;
drop policy if exists manufacturing_line_targets_runtime_write on public.manufacturing_line_targets;
drop policy if exists manufacturing_worker_targets_runtime_select on public.manufacturing_worker_targets;
drop policy if exists manufacturing_worker_targets_runtime_write on public.manufacturing_worker_targets;

create policy manufacturing_products_runtime_select on public.manufacturing_products for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.view', tenant_id));
create policy manufacturing_products_runtime_write on public.manufacturing_products for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.manage', tenant_id));
create policy manufacturing_work_centers_runtime_select on public.manufacturing_work_centers for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.view', tenant_id));
create policy manufacturing_work_centers_runtime_write on public.manufacturing_work_centers for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.manage', tenant_id));
create policy manufacturing_lines_runtime_select on public.manufacturing_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.view', tenant_id));
create policy manufacturing_lines_runtime_write on public.manufacturing_lines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.manage', tenant_id));
create policy manufacturing_plans_runtime_select on public.manufacturing_plans for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.view', tenant_id));
create policy manufacturing_plans_runtime_write on public.manufacturing_plans for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id));
create policy manufacturing_daily_reports_runtime_select on public.manufacturing_daily_reports for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.view', tenant_id));
create policy manufacturing_daily_reports_runtime_write on public.manufacturing_daily_reports for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.manage', tenant_id));
create policy manufacturing_product_targets_runtime_select on public.manufacturing_product_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_product_targets_runtime_write on public.manufacturing_product_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));
create policy manufacturing_line_targets_runtime_select on public.manufacturing_line_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_line_targets_runtime_write on public.manufacturing_line_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));
create policy manufacturing_worker_targets_runtime_select on public.manufacturing_worker_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_worker_targets_runtime_write on public.manufacturing_worker_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.view', 'View Manufacturing', 'View Manufacturing foundation records.', 'standard'),
  ('manufacturing.manage', 'Manage Manufacturing', 'Manage Manufacturing foundation records.', 'high'),
  ('manufacturing.work-centers.view', 'View Manufacturing Work Centers', 'View work center foundation records.', 'standard'),
  ('manufacturing.work-centers.manage', 'Manage Manufacturing Work Centers', 'Manage work center foundation records.', 'high'),
  ('manufacturing.lines.view', 'View Manufacturing Lines', 'View production line foundation records.', 'standard'),
  ('manufacturing.lines.manage', 'Manage Manufacturing Lines', 'Manage production line foundation records.', 'high'),
  ('manufacturing.planning.view', 'View Manufacturing Plans', 'View production plans.', 'standard'),
  ('manufacturing.planning.manage', 'Manage Manufacturing Plans', 'Manage production plans.', 'high'),
  ('manufacturing.daily-reports.view', 'View Daily Production Reports', 'View Daily Production Report facts.', 'standard'),
  ('manufacturing.daily-reports.manage', 'Manage Daily Production Reports', 'Manage Daily Production Report facts.', 'high'),
  ('manufacturing.targets.view', 'View Manufacturing Targets', 'View product, line, and worker target definitions.', 'standard'),
  ('manufacturing.targets.manage', 'Manage Manufacturing Targets', 'Manage product, line, and worker target definitions.', 'high')
on conflict do nothing;
