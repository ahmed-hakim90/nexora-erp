-- Nexora Business App 3: Manufacturing Foundation.
-- Foundation contracts only. No Finance logic, Payroll calculations, Sales,
-- Purchasing, Quality workflows, Cost calculations, or incentive calculations.

create table if not exists public.manufacturing_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  inventory_product_id uuid references public.inventory_products(id) on delete restrict,
  product_key text not null,
  name text not null,
  default_bom_key text,
  default_routing_key text,
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'production_execution_owner', 'manufacturing', 'stock_quantity_owner', 'inventory', 'cost_owner', 'cost_engine'),
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
  capacity numeric(18, 6) check (capacity is null or capacity >= 0),
  cost_center_key text,
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

create table if not exists public.manufacturing_workstations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  work_center_id uuid not null references public.manufacturing_work_centers(id) on delete restrict,
  line_id uuid references public.manufacturing_lines(id) on delete restrict,
  workstation_key text not null,
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
  check (workstation_key = lower(workstation_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_machines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  work_center_id uuid references public.manufacturing_work_centers(id) on delete restrict,
  workstation_id uuid references public.manufacturing_workstations(id) on delete restrict,
  machine_key text not null,
  name text not null,
  machine_hour_fact_ready boolean not null default true check (machine_hour_fact_ready = true),
  maintenance_readiness_only boolean not null default true check (maintenance_readiness_only = true),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'maintenance_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (machine_key = lower(machine_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_operations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  operation_key text not null,
  name text not null,
  operation_kind text not null default 'run' check (operation_kind in ('setup', 'run', 'inspection_readiness', 'move', 'pack', 'custom')),
  standard_minutes numeric(18, 6) check (standard_minutes is null or standard_minutes >= 0),
  quality_readiness_only boolean not null default true check (quality_readiness_only = true),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'quality_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (operation_key = lower(operation_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_routings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  routing_key text not null,
  version_key text not null,
  operations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'execution_runtime_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (routing_key = lower(routing_key)),
  check (version_key = lower(version_key)),
  check (jsonb_typeof(operations) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_boms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  manufacturing_product_id uuid references public.manufacturing_products(id) on delete restrict,
  bom_key text not null,
  version_key text not null,
  components jsonb not null default '[]'::jsonb,
  inventory_quantity_owner text not null default 'inventory' check (inventory_quantity_owner = 'inventory'),
  cost_calculation_owner text not null default 'cost-engine' check (cost_calculation_owner = 'cost-engine'),
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_material_consumption', true, 'no_inventory_posting', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (bom_key = lower(bom_key)),
  check (version_key = lower(version_key)),
  check (jsonb_typeof(components) = 'array'),
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
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'no_scheduling_engine', true),
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

create table if not exists public.manufacturing_plan_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  plan_id uuid not null references public.manufacturing_plans(id) on delete cascade,
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  planned_line_id uuid not null references public.manufacturing_lines(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  planned_quantity numeric(18, 6) not null check (planned_quantity > 0),
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  planned_shift_key text not null,
  scheduling_engine_implemented boolean not null default false check (scheduling_engine_implemented = false),
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (planned_end >= planned_start),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  plan_line_id uuid references public.manufacturing_plan_lines(id) on delete restrict,
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  order_key text not null,
  planned_quantity numeric(18, 6) not null check (planned_quantity > 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  execution_runtime_implemented boolean not null default false check (execution_runtime_implemented = false),
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
  check (order_key = lower(order_key)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  manufacturing_order_id uuid not null references public.manufacturing_orders(id) on delete restrict,
  operation_id uuid references public.manufacturing_operations(id) on delete restrict,
  work_order_key text not null,
  planned_quantity numeric(18, 6) not null check (planned_quantity > 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  execution_runtime_implemented boolean not null default false check (execution_runtime_implemented = false),
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
  check (work_order_key = lower(work_order_key)),
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
  manufacturing_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  production_line_id uuid not null references public.manufacturing_lines(id) on delete restrict,
  supervisor_ref_id uuid,
  worker_refs jsonb not null default '[]'::jsonb,
  planned_quantity numeric(18, 6) not null default 0 check (planned_quantity >= 0),
  actual_quantity numeric(18, 6) not null default 0 check (actual_quantity >= 0),
  worker_output jsonb not null default '[]'::jsonb,
  scrap_quantity numeric(18, 6) not null default 0 check (scrap_quantity >= 0),
  rework_quantity numeric(18, 6) not null default 0 check (rework_quantity >= 0),
  downtime_minutes numeric(18, 6) not null default 0 check (downtime_minutes >= 0),
  notes text,
  attachment_refs jsonb not null default '[]'::jsonb,
  source_for jsonb not null default jsonb_build_array('worker_kpis', 'line_kpis', 'product_kpis', 'inventory_movements', 'cost_facts', 'quality_facts', 'dashboard_facts'),
  payroll_calculation_implemented boolean not null default false check (payroll_calculation_implemented = false),
  cost_calculation_implemented boolean not null default false check (cost_calculation_implemented = false),
  quality_workflow_implemented boolean not null default false check (quality_workflow_implemented = false),
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'source_of_kpi_facts', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (report_key = lower(report_key)),
  check (jsonb_typeof(worker_refs) = 'array'),
  check (jsonb_typeof(worker_output) = 'array'),
  check (jsonb_typeof(attachment_refs) = 'array'),
  check (jsonb_typeof(source_for) = 'array'),
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
  achievement_fact_owner text not null default 'manufacturing' check (achievement_fact_owner = 'manufacturing'),
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
  achievement_fact_owner text not null default 'manufacturing' check (achievement_fact_owner = 'manufacturing'),
  payroll_calculation_implemented boolean not null default false check (payroll_calculation_implemented = false),
  status text not null default 'active' check (status in ('draft', 'active', 'released', 'completed', 'cancelled', 'inactive', 'locked', 'archived')),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'payroll_owner', 'payroll'),
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

create unique index if not exists manufacturing_products_scope_key_uq on public.manufacturing_products (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), product_key) where deleted_at is null;
create unique index if not exists manufacturing_work_centers_scope_key_uq on public.manufacturing_work_centers (tenant_id, company_id, branch_id, work_center_key) where deleted_at is null;
create unique index if not exists manufacturing_lines_scope_key_uq on public.manufacturing_lines (tenant_id, company_id, branch_id, line_key) where deleted_at is null;
create unique index if not exists manufacturing_workstations_scope_key_uq on public.manufacturing_workstations (tenant_id, company_id, branch_id, workstation_key) where deleted_at is null;
create unique index if not exists manufacturing_machines_scope_key_uq on public.manufacturing_machines (tenant_id, company_id, branch_id, machine_key) where deleted_at is null;
create unique index if not exists manufacturing_operations_scope_key_uq on public.manufacturing_operations (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), operation_key) where deleted_at is null;
create unique index if not exists manufacturing_routings_scope_key_uq on public.manufacturing_routings (tenant_id, company_id, manufacturing_product_id, routing_key, version_key) where deleted_at is null;
create unique index if not exists manufacturing_boms_scope_key_uq on public.manufacturing_boms (tenant_id, company_id, manufacturing_product_id, bom_key, version_key) where deleted_at is null;
create unique index if not exists manufacturing_plans_scope_key_uq on public.manufacturing_plans (tenant_id, company_id, branch_id, plan_key) where deleted_at is null;
create unique index if not exists manufacturing_plan_lines_number_uq on public.manufacturing_plan_lines (tenant_id, plan_id, line_number) where deleted_at is null;
create unique index if not exists manufacturing_orders_scope_key_uq on public.manufacturing_orders (tenant_id, company_id, branch_id, order_key) where deleted_at is null;
create unique index if not exists manufacturing_work_orders_scope_key_uq on public.manufacturing_work_orders (tenant_id, company_id, branch_id, work_order_key) where deleted_at is null;
create unique index if not exists manufacturing_daily_reports_scope_key_uq on public.manufacturing_daily_reports (tenant_id, company_id, branch_id, report_key) where deleted_at is null;
create unique index if not exists manufacturing_product_targets_scope_key_uq on public.manufacturing_product_targets (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), target_key) where deleted_at is null;
create unique index if not exists manufacturing_line_targets_scope_key_uq on public.manufacturing_line_targets (tenant_id, company_id, branch_id, target_key) where deleted_at is null;
create unique index if not exists manufacturing_worker_targets_scope_key_uq on public.manufacturing_worker_targets (tenant_id, company_id, branch_id, target_key) where deleted_at is null;

create index if not exists manufacturing_plans_date_idx on public.manufacturing_plans (tenant_id, company_id, branch_id, plan_date desc, id desc) where deleted_at is null;
create index if not exists manufacturing_daily_reports_date_idx on public.manufacturing_daily_reports (tenant_id, company_id, branch_id, report_date desc, id desc) where deleted_at is null;
create index if not exists manufacturing_orders_product_idx on public.manufacturing_orders (tenant_id, company_id, manufacturing_product_id, status) where deleted_at is null;
create index if not exists manufacturing_worker_targets_worker_idx on public.manufacturing_worker_targets (tenant_id, company_id, worker_ref_id, status) where deleted_at is null;

create or replace function public.enforce_manufacturing_business_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if not exists (select 1 from public.tenants t where t.id = new.tenant_id and t.is_active = true and t.deleted_at is null) then
    raise exception 'manufacturing foundation tenant must be active';
  end if;
  if not exists (select 1 from public.companies c where c.id = new.company_id and c.tenant_id = new.tenant_id and c.is_active = true and c.deleted_at is null) then
    raise exception 'manufacturing foundation company must belong to tenant and be active';
  end if;
  if new.branch_id is not null and not exists (select 1 from public.branches b where b.id = new.branch_id and b.tenant_id = new.tenant_id and b.is_active = true and b.deleted_at is null) then
    raise exception 'manufacturing foundation branch must belong to tenant and be active';
  end if;
  if tg_table_name = 'manufacturing_plan_lines' then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_plans where id = new.plan_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id is distinct from new.branch_id then
      raise exception 'manufacturing plan line must match plan tenant, company, and branch scope';
    end if;
  elsif tg_table_name in ('manufacturing_orders', 'manufacturing_work_orders', 'manufacturing_daily_reports', 'manufacturing_line_targets', 'manufacturing_worker_targets') then
    if new.branch_id is null then
      raise exception 'manufacturing execution and achievement facts require branch scope';
    end if;
  end if;
  return new;
end;
$$;

create trigger manufacturing_products_business_scope before insert or update on public.manufacturing_products for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_work_centers_business_scope before insert or update on public.manufacturing_work_centers for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_lines_business_scope before insert or update on public.manufacturing_lines for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_workstations_business_scope before insert or update on public.manufacturing_workstations for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_machines_business_scope before insert or update on public.manufacturing_machines for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_operations_business_scope before insert or update on public.manufacturing_operations for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_routings_business_scope before insert or update on public.manufacturing_routings for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_plans_business_scope before insert or update on public.manufacturing_plans for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_plan_lines_business_scope before insert or update on public.manufacturing_plan_lines for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_orders_business_scope before insert or update on public.manufacturing_orders for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_work_orders_business_scope before insert or update on public.manufacturing_work_orders for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_daily_reports_business_scope before insert or update on public.manufacturing_daily_reports for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_product_targets_business_scope before insert or update on public.manufacturing_product_targets for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_line_targets_business_scope before insert or update on public.manufacturing_line_targets for each row execute function public.enforce_manufacturing_business_foundation_scope();
create trigger manufacturing_worker_targets_business_scope before insert or update on public.manufacturing_worker_targets for each row execute function public.enforce_manufacturing_business_foundation_scope();

alter table public.manufacturing_products enable row level security;
alter table public.manufacturing_boms enable row level security;
alter table public.manufacturing_routings enable row level security;
alter table public.manufacturing_operations enable row level security;
alter table public.manufacturing_lines enable row level security;
alter table public.manufacturing_work_centers enable row level security;
alter table public.manufacturing_workstations enable row level security;
alter table public.manufacturing_plans enable row level security;
alter table public.manufacturing_plan_lines enable row level security;
alter table public.manufacturing_orders enable row level security;
alter table public.manufacturing_work_orders enable row level security;
alter table public.manufacturing_daily_reports enable row level security;
alter table public.manufacturing_worker_targets enable row level security;
alter table public.manufacturing_line_targets enable row level security;
alter table public.manufacturing_product_targets enable row level security;

alter table public.manufacturing_products force row level security;
alter table public.manufacturing_boms force row level security;
alter table public.manufacturing_routings force row level security;
alter table public.manufacturing_operations force row level security;
alter table public.manufacturing_lines force row level security;
alter table public.manufacturing_work_centers force row level security;
alter table public.manufacturing_workstations force row level security;
alter table public.manufacturing_plans force row level security;
alter table public.manufacturing_plan_lines force row level security;
alter table public.manufacturing_orders force row level security;
alter table public.manufacturing_work_orders force row level security;
alter table public.manufacturing_daily_reports force row level security;
alter table public.manufacturing_worker_targets force row level security;
alter table public.manufacturing_line_targets force row level security;
alter table public.manufacturing_product_targets force row level security;

create policy manufacturing_products_foundation_select on public.manufacturing_products for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.view', tenant_id));
create policy manufacturing_products_foundation_write on public.manufacturing_products for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.manage', tenant_id));
create policy manufacturing_plans_foundation_select on public.manufacturing_plans for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.view', tenant_id));
create policy manufacturing_plans_foundation_write on public.manufacturing_plans for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id));
create policy manufacturing_daily_reports_foundation_select on public.manufacturing_daily_reports for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.view', tenant_id));
create policy manufacturing_daily_reports_foundation_write on public.manufacturing_daily_reports for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.daily-reports.manage', tenant_id));
create policy manufacturing_targets_foundation_select on public.manufacturing_product_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_targets_foundation_write on public.manufacturing_product_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));
create policy manufacturing_line_targets_foundation_select on public.manufacturing_line_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_line_targets_foundation_write on public.manufacturing_line_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));
create policy manufacturing_worker_targets_foundation_select on public.manufacturing_worker_targets for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.view', tenant_id));
create policy manufacturing_worker_targets_foundation_write on public.manufacturing_worker_targets for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.targets.manage', tenant_id));

create policy event_outbox_manufacturing_foundation_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('ProductionPlanCreated', 'ProductionPlanReleased', 'ManufacturingOrderCreated', 'WorkOrderCreated', 'DailyProductionReported', 'ProductTargetDefined', 'WorkerTargetDefined', 'LineTargetDefined', 'WorkerAchievementRecorded', 'LineAchievementRecorded', 'ProductAchievementRecorded', 'ScrapRecorded', 'ReworkRecorded', 'FinishedGoodsProduced') and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.audit.view', tenant_id));
create policy event_outbox_manufacturing_foundation_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('ProductionPlanCreated', 'ProductionPlanReleased', 'ManufacturingOrderCreated', 'WorkOrderCreated', 'DailyProductionReported', 'ProductTargetDefined', 'WorkerTargetDefined', 'LineTargetDefined', 'WorkerAchievementRecorded', 'LineAchievementRecorded', 'ProductAchievementRecorded', 'ScrapRecorded', 'ReworkRecorded', 'FinishedGoodsProduced') and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.planning.manage', tenant_id) or public.has_permission('manufacturing.execution.manage', tenant_id) or public.has_permission('manufacturing.daily-reports.manage', tenant_id) or public.has_permission('manufacturing.targets.manage', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.planning.view', 'View Manufacturing Plans', 'View production plan and plan line foundation contracts.', 'standard'),
  ('manufacturing.planning.manage', 'Manage Manufacturing Plans', 'Create and update production plan contracts without scheduling engine execution.', 'high'),
  ('manufacturing.execution.view', 'View Manufacturing Execution Contracts', 'View manufacturing order, work order, operation, material, receipt, scrap, and rework contracts.', 'standard'),
  ('manufacturing.execution.manage', 'Manage Manufacturing Execution Contracts', 'Create execution foundation records without runtime execution, costing, payroll, or quality workflows.', 'high'),
  ('manufacturing.daily-reports.view', 'View Daily Production Reports', 'View Daily Production Report facts and readiness contracts.', 'standard'),
  ('manufacturing.daily-reports.manage', 'Manage Daily Production Reports', 'Create and update Daily Production Report facts without payroll or cost calculations.', 'high'),
  ('manufacturing.targets.view', 'View Manufacturing Targets', 'View product, line, and worker target definitions.', 'standard'),
  ('manufacturing.targets.manage', 'Manage Manufacturing Targets', 'Create and update target definitions without incentive calculation.', 'high'),
  ('manufacturing.kpis.view', 'View Manufacturing KPI Facts', 'View worker, line, product, and supervisor KPI facts only.', 'standard'),
  ('manufacturing.cost-integration.view', 'View Manufacturing Cost Integration', 'View Cost Engine fact contracts only; no cost calculations are granted.', 'high'),
  ('manufacturing.inventory-integration.view', 'View Manufacturing Inventory Integration', 'View Inventory movement readiness contracts only; Inventory owns stock quantities.', 'high'),
  ('manufacturing.finance-integration.view', 'View Manufacturing Finance Integration', 'View Finance posting-readiness only; no accounting entries are granted.', 'high'),
  ('manufacturing.hr-payroll-integration.view', 'View Manufacturing HR Payroll Integration', 'View achievement and attendance readiness only; Payroll owns incentives and pay calculations.', 'high'),
  ('manufacturing.quality-readiness.view', 'View Manufacturing Quality Readiness', 'View inspection, checkpoint, NCR, defect, rework, and result readiness contracts only.', 'standard'),
  ('manufacturing.search.view', 'Search Manufacturing Foundation', 'Search Manufacturing Foundation records.', 'standard'),
  ('manufacturing.import-export.manage', 'Manage Manufacturing Import Export', 'Manage Daily Production Report import/export readiness contracts.', 'high'),
  ('manufacturing.audit.view', 'View Manufacturing Audit Events', 'View Manufacturing foundation event and audit readiness records.', 'high'),
  ('manufacturing.approvals.view', 'View Manufacturing Approval Readiness', 'View approval readiness contracts without runtime approval workflows.', 'standard'),
  ('manufacturing.workflow-readiness.view', 'View Manufacturing Workflow Readiness', 'View workflow readiness contracts without execution runtime.', 'standard'),
  ('manufacturing.notifications.view', 'View Manufacturing Notification Readiness', 'View notification readiness contracts without notification runtime.', 'standard')
on conflict do nothing;
