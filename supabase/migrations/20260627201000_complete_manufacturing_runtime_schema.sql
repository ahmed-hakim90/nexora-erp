-- Complete the Manufacturing runtime schema used by the ERP production pages.
-- This extends older manufacturing tables in-place and creates the missing
-- execution/readiness tables referenced by the current UI.

alter table public.manufacturing_products add column if not exists inventory_product_id uuid;
alter table public.manufacturing_products add column if not exists default_bom_key text;
alter table public.manufacturing_products add column if not exists default_routing_key text;

alter table public.manufacturing_work_centers add column if not exists capacity numeric(18, 6) check (capacity is null or capacity >= 0);
alter table public.manufacturing_work_centers add column if not exists cost_center_key text;

alter table public.manufacturing_profiles add column if not exists company_id uuid references public.companies(id) on delete restrict;
alter table public.manufacturing_line_assignments add column if not exists company_id uuid references public.companies(id) on delete restrict;
alter table public.production_standards add column if not exists company_id uuid references public.companies(id) on delete restrict;

alter table public.manufacturing_boms add column if not exists company_id uuid references public.companies(id) on delete restrict;
alter table public.manufacturing_boms add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.manufacturing_boms add column if not exists manufacturing_product_id uuid references public.manufacturing_products(id) on delete restrict;
alter table public.manufacturing_boms add column if not exists bom_key text;
alter table public.manufacturing_boms add column if not exists version_key text;
alter table public.manufacturing_boms add column if not exists inventory_quantity_owner text not null default 'inventory' check (inventory_quantity_owner = 'inventory');
alter table public.manufacturing_boms add column if not exists cost_calculation_owner text not null default 'cost-engine' check (cost_calculation_owner = 'cost-engine');

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
  operation_kind text not null default 'run',
  standard_minutes numeric(18, 6) check (standard_minutes is null or standard_minutes >= 0),
  quality_readiness_only boolean not null default true check (quality_readiness_only = true),
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
  check (routing_key = lower(routing_key)),
  check (version_key = lower(version_key)),
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
  planned_start timestamptz,
  planned_end timestamptz,
  planned_shift_key text,
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
  check (planned_end is null or planned_start is null or planned_end >= planned_start),
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

create unique index if not exists manufacturing_workstations_runtime_scope_key_uq on public.manufacturing_workstations (tenant_id, company_id, branch_id, workstation_key) where deleted_at is null;
create unique index if not exists manufacturing_machines_runtime_scope_key_uq on public.manufacturing_machines (tenant_id, company_id, branch_id, machine_key) where deleted_at is null;
create unique index if not exists manufacturing_operations_runtime_scope_key_uq on public.manufacturing_operations (tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), operation_key) where deleted_at is null;
create unique index if not exists manufacturing_routings_runtime_scope_key_uq on public.manufacturing_routings (tenant_id, company_id, manufacturing_product_id, routing_key, version_key) where deleted_at is null;
create unique index if not exists manufacturing_plan_lines_runtime_number_uq on public.manufacturing_plan_lines (tenant_id, plan_id, line_number) where deleted_at is null;
create unique index if not exists manufacturing_orders_runtime_scope_key_uq on public.manufacturing_orders (tenant_id, company_id, branch_id, order_key) where deleted_at is null;
create unique index if not exists manufacturing_work_orders_runtime_scope_key_uq on public.manufacturing_work_orders (tenant_id, company_id, branch_id, work_order_key) where deleted_at is null;

alter table public.manufacturing_workstations enable row level security;
alter table public.manufacturing_machines enable row level security;
alter table public.manufacturing_operations enable row level security;
alter table public.manufacturing_routings enable row level security;
alter table public.manufacturing_plan_lines enable row level security;
alter table public.manufacturing_orders enable row level security;
alter table public.manufacturing_work_orders enable row level security;

alter table public.manufacturing_workstations force row level security;
alter table public.manufacturing_machines force row level security;
alter table public.manufacturing_operations force row level security;
alter table public.manufacturing_routings force row level security;
alter table public.manufacturing_plan_lines force row level security;
alter table public.manufacturing_orders force row level security;
alter table public.manufacturing_work_orders force row level security;

drop policy if exists manufacturing_workstations_runtime_select on public.manufacturing_workstations;
drop policy if exists manufacturing_workstations_runtime_write on public.manufacturing_workstations;
drop policy if exists manufacturing_machines_runtime_select on public.manufacturing_machines;
drop policy if exists manufacturing_machines_runtime_write on public.manufacturing_machines;
drop policy if exists manufacturing_operations_runtime_select on public.manufacturing_operations;
drop policy if exists manufacturing_operations_runtime_write on public.manufacturing_operations;
drop policy if exists manufacturing_routings_runtime_select on public.manufacturing_routings;
drop policy if exists manufacturing_routings_runtime_write on public.manufacturing_routings;
drop policy if exists manufacturing_plan_lines_runtime_select on public.manufacturing_plan_lines;
drop policy if exists manufacturing_plan_lines_runtime_write on public.manufacturing_plan_lines;
drop policy if exists manufacturing_orders_runtime_select on public.manufacturing_orders;
drop policy if exists manufacturing_orders_runtime_write on public.manufacturing_orders;
drop policy if exists manufacturing_work_orders_runtime_select on public.manufacturing_work_orders;
drop policy if exists manufacturing_work_orders_runtime_write on public.manufacturing_work_orders;

create policy manufacturing_workstations_runtime_select on public.manufacturing_workstations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.view', tenant_id));
create policy manufacturing_workstations_runtime_write on public.manufacturing_workstations for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.manage', tenant_id));
create policy manufacturing_machines_runtime_select on public.manufacturing_machines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.view', tenant_id));
create policy manufacturing_machines_runtime_write on public.manufacturing_machines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.manage', tenant_id));
create policy manufacturing_operations_runtime_select on public.manufacturing_operations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.view', tenant_id));
create policy manufacturing_operations_runtime_write on public.manufacturing_operations for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.manage', tenant_id));
create policy manufacturing_routings_runtime_select on public.manufacturing_routings for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.view', tenant_id));
create policy manufacturing_routings_runtime_write on public.manufacturing_routings for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.manage', tenant_id));
create policy manufacturing_plan_lines_runtime_select on public.manufacturing_plan_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.view', tenant_id));
create policy manufacturing_plan_lines_runtime_write on public.manufacturing_plan_lines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id));
create policy manufacturing_orders_runtime_select on public.manufacturing_orders for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.view', tenant_id));
create policy manufacturing_orders_runtime_write on public.manufacturing_orders for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.manage', tenant_id));
create policy manufacturing_work_orders_runtime_select on public.manufacturing_work_orders for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.view', tenant_id));
create policy manufacturing_work_orders_runtime_write on public.manufacturing_work_orders for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.execution.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.workstations.view', 'View Manufacturing Workstations', 'View manufacturing workstation records.', 'standard'),
  ('manufacturing.workstations.manage', 'Manage Manufacturing Workstations', 'Manage manufacturing workstation records.', 'high'),
  ('manufacturing.machines.view', 'View Manufacturing Machines', 'View manufacturing machine records.', 'standard'),
  ('manufacturing.machines.manage', 'Manage Manufacturing Machines', 'Manage manufacturing machine records.', 'high'),
  ('manufacturing.operations.view', 'View Manufacturing Operations', 'View manufacturing operation records.', 'standard'),
  ('manufacturing.operations.manage', 'Manage Manufacturing Operations', 'Manage manufacturing operation records.', 'high'),
  ('manufacturing.routing.view', 'View Manufacturing Routing', 'View routing readiness records.', 'standard'),
  ('manufacturing.routing.manage', 'Manage Manufacturing Routing', 'Manage routing readiness records.', 'high'),
  ('manufacturing.execution.view', 'View Manufacturing Execution', 'View manufacturing execution readiness records.', 'standard'),
  ('manufacturing.execution.manage', 'Manage Manufacturing Execution', 'Manage manufacturing execution readiness records.', 'high'),
  ('manufacturing.bom.view', 'View Manufacturing BOM', 'View bill of material readiness records.', 'standard'),
  ('manufacturing.bom.manage', 'Manage Manufacturing BOM', 'Manage bill of material readiness records.', 'high')
on conflict do nothing;
