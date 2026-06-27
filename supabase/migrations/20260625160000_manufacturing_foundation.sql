-- Nexora Sprint 12: Manufacturing Foundation correction.
-- Employee Core is limited to safe identity/work fields required by manufacturing.
-- No duplicated production worker person table, manually configured per-worker targets, production sessions, reports, work orders, production plans, inventory posting, payroll, attendance, leaves, loans, penalties, contracts, payslips, or salary rules.

create type public.employee_core_status as enum ('active', 'inactive', 'terminated', 'on_hold');
create type public.production_line_status as enum ('active', 'inactive', 'maintenance', 'retired');
create type public.production_labor_role as enum ('production', 'packaging', 'quality', 'maintenance', 'external', 'supervisor_assistant');
create type public.manufacturing_assignment_type as enum ('permanent', 'daily_placeholder');
create type public.manufacturing_bom_status as enum ('draft', 'active', 'inactive', 'obsolete');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  parent_department_id uuid references public.departments(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.job_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  department_id uuid references public.departments(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_code text not null,
  name_ar text not null,
  name_en text not null,
  user_profile_id uuid references public.profiles(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  job_position_id uuid references public.job_positions(id) on delete restrict,
  direct_manager_employee_id uuid references public.employees(id) on delete restrict,
  employment_status public.employee_core_status not null default 'active',
  work_email text,
  work_phone text,
  hire_date date,
  termination_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (employee_code = upper(employee_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (work_email is null or position('@' in work_email) > 1),
  check (termination_date is null or hire_date is null or termination_date >= hire_date),
  check (deleted_at is null or deleted_by is not null)
);

create table public.work_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  capacity numeric(18, 6) not null default 0 check (capacity >= 0),
  standard_hours numeric(10, 2) not null default 0 check (standard_hours >= 0),
  cost_center_id uuid,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.production_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  line_code text not null,
  name_ar text not null,
  name_en text not null,
  display_order integer not null default 0,
  daily_working_hours numeric(10, 2) not null default 8 check (daily_working_hours >= 0),
  max_workers integer not null default 0 check (max_workers >= 0),
  status public.production_line_status not null default 'active',
  is_packaging_line boolean not null default false,
  is_injection_line boolean not null default false,
  default_work_center_id uuid references public.work_centers(id) on delete restrict,
  current_product_id uuid references public.products(id) on delete restrict,
  daily_target_qty numeric(18, 6) check (daily_target_qty is null or daily_target_qty >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (line_code = upper(line_code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.production_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name_ar text not null,
  name_en text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.production_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  calendar_date date not null,
  shift_id uuid not null references public.production_shifts(id) on delete restrict,
  is_working_day boolean not null default true,
  planned_hours numeric(10, 2) not null default 0 check (planned_hours >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
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

create table public.manufacturing_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  manufacturing_code text not null,
  default_line_id uuid references public.production_lines(id) on delete restrict,
  default_role public.production_labor_role not null default 'production',
  skill_level text,
  production_enabled boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (manufacturing_code = upper(manufacturing_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_line_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  manufacturing_profile_id uuid not null references public.manufacturing_profiles(id) on delete restrict,
  production_line_id uuid not null references public.production_lines(id) on delete restrict,
  shift_id uuid references public.production_shifts(id) on delete restrict,
  labor_role public.production_labor_role not null,
  counts_toward_production boolean not null default true,
  assignment_type public.manufacturing_assignment_type not null default 'permanent',
  start_date date not null,
  end_date date,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (end_date is null or end_date >= start_date),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.supervisor_line_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_id uuid references public.employees(id) on delete restrict,
  manufacturing_profile_id uuid references public.manufacturing_profiles(id) on delete restrict,
  production_line_id uuid not null references public.production_lines(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  notes text,
  metadata jsonb not null default jsonb_build_object('supervisor_scope_prepared', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (employee_id is not null or manufacturing_profile_id is not null),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.production_standards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  production_line_id uuid not null references public.production_lines(id) on delete restrict,
  shift_id uuid references public.production_shifts(id) on delete restrict,
  daily_target_qty numeric(18, 6) not null check (daily_target_qty > 0),
  hourly_target_qty numeric(18, 6) check (hourly_target_qty is null or hourly_target_qty > 0),
  standard_cycle_time_seconds integer check (standard_cycle_time_seconds is null or standard_cycle_time_seconds > 0),
  standard_crew_size integer not null default 1 check (standard_crew_size > 0),
  efficiency_target_percent numeric(8, 4) check (efficiency_target_percent is null or efficiency_target_percent > 0),
  effective_from date not null,
  effective_to date,
  notes text,
  metadata jsonb not null default jsonb_build_object(
    'resolution_priority',
    jsonb_build_array('product + line + shift', 'product + line', 'product default manufacturing target placeholder'),
    'future_formula',
    'target per worker = production standard daily target quantity / counted production workers; worker achievement percent = worker output quantity / target per worker * 100'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  settings_key text not null,
  settings_value jsonb not null default '{}'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (settings_key = lower(settings_key)),
  check (jsonb_typeof(settings_value) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_routing_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  version_code text not null,
  total_standard_time_seconds integer not null default 0 check (total_standard_time_seconds >= 0),
  total_man_time_seconds integer not null default 0 check (total_man_time_seconds >= 0),
  target_unit_seconds integer not null default 0 check (target_unit_seconds >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (version_code = upper(version_code)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_routing_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  routing_plan_id uuid not null references public.manufacturing_routing_plans(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  work_center_id uuid references public.work_centers(id) on delete restrict,
  production_line_id uuid references public.production_lines(id) on delete restrict,
  order_index integer not null check (order_index > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  workers_count integer not null default 1 check (workers_count > 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (work_center_id is not null or production_line_id is not null),
  check (length(trim(name_ar)) > 0),
  check (length(trim(name_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_boms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  version_code text not null,
  status public.manufacturing_bom_status not null default 'draft',
  effective_from date,
  effective_to date,
  notes text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (version_code = upper(version_code)),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.manufacturing_bom_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  bom_id uuid not null references public.manufacturing_boms(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  material_product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  unit_id uuid not null references public.units(id) on delete restrict,
  scrap_percentage numeric(8, 4) not null default 0 check (scrap_percentage >= 0 and scrap_percentage <= 100),
  operation_step text,
  notes text,
  metadata jsonb not null default jsonb_build_object('no_material_consumption', true, 'no_inventory_posting', true),
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

create unique index departments_tenant_code_uq on public.departments (tenant_id, code) where deleted_at is null;
create unique index job_positions_tenant_code_uq on public.job_positions (tenant_id, code) where deleted_at is null;
create unique index employees_tenant_code_uq on public.employees (tenant_id, employee_code) where deleted_at is null;
create unique index work_centers_tenant_code_uq on public.work_centers (tenant_id, code) where deleted_at is null;
create unique index production_lines_tenant_code_uq on public.production_lines (tenant_id, line_code) where deleted_at is null;
create unique index production_shifts_tenant_code_uq on public.production_shifts (tenant_id, code) where deleted_at is null;
create unique index production_calendars_tenant_day_shift_uq on public.production_calendars (tenant_id, branch_id, calendar_date, shift_id) where deleted_at is null;
create unique index manufacturing_profiles_tenant_code_uq on public.manufacturing_profiles (tenant_id, manufacturing_code) where deleted_at is null;
create unique index manufacturing_profiles_employee_uq on public.manufacturing_profiles (tenant_id, employee_id) where deleted_at is null;
create unique index manufacturing_settings_tenant_key_uq on public.manufacturing_settings (tenant_id, settings_key) where deleted_at is null;
create unique index manufacturing_routing_plans_product_version_uq on public.manufacturing_routing_plans (tenant_id, product_id, version_code) where deleted_at is null;
create unique index manufacturing_routing_steps_order_uq on public.manufacturing_routing_steps (tenant_id, routing_plan_id, order_index) where deleted_at is null;
create unique index manufacturing_boms_product_version_uq on public.manufacturing_boms (tenant_id, product_id, version_code) where deleted_at is null;
create unique index manufacturing_bom_lines_number_uq on public.manufacturing_bom_lines (tenant_id, bom_id, line_number) where deleted_at is null;

create index employees_active_idx on public.employees (tenant_id, branch_id, employment_status, is_active, created_at desc, id desc) where deleted_at is null;
create index manufacturing_profiles_active_idx on public.manufacturing_profiles (tenant_id, branch_id, default_role, production_enabled, is_active, created_at desc, id desc) where deleted_at is null;
create index manufacturing_line_assignments_active_idx on public.manufacturing_line_assignments (tenant_id, branch_id, manufacturing_profile_id, production_line_id, is_active) where deleted_at is null;
create index supervisor_line_assignments_active_idx on public.supervisor_line_assignments (tenant_id, branch_id, production_line_id, is_active) where deleted_at is null;
create index production_standards_resolution_idx on public.production_standards (tenant_id, product_id, production_line_id, shift_id, effective_from desc) where deleted_at is null and is_active = true;
create index manufacturing_boms_active_idx on public.manufacturing_boms (tenant_id, product_id, status, is_active) where deleted_at is null;
create index manufacturing_routing_plans_active_idx on public.manufacturing_routing_plans (tenant_id, product_id, is_active) where deleted_at is null;

create or replace function public.enforce_manufacturing_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
  product_record record;
begin
  if not exists (select 1 from public.tenants t where t.id = new.tenant_id and t.is_active = true and t.deleted_at is null) then
    raise exception 'manufacturing foundation tenant must be active';
  end if;

  if tg_table_name in ('departments', 'job_positions', 'employees', 'work_centers', 'production_lines', 'production_calendars', 'manufacturing_profiles', 'manufacturing_line_assignments', 'supervisor_line_assignments', 'production_standards')
    and new.branch_id is not null
    and not exists (select 1 from public.branches b where b.id = new.branch_id and b.tenant_id = new.tenant_id and b.is_active = true and b.deleted_at is null) then
    raise exception 'manufacturing foundation branch must belong to tenant and be active';
  end if;

  if tg_table_name = 'job_positions' and new.department_id is not null and not exists (select 1 from public.departments d where d.id = new.department_id and d.tenant_id = new.tenant_id and d.deleted_at is null) then
    raise exception 'job position department must belong to tenant';
  elsif tg_table_name = 'employees' then
    if new.department_id is not null and not exists (select 1 from public.departments d where d.id = new.department_id and d.tenant_id = new.tenant_id and d.deleted_at is null) then
      raise exception 'employee department must belong to tenant';
    end if;
    if new.job_position_id is not null and not exists (select 1 from public.job_positions jp where jp.id = new.job_position_id and jp.tenant_id = new.tenant_id and jp.deleted_at is null) then
      raise exception 'employee job position must belong to tenant';
    end if;
    if new.direct_manager_employee_id is not null and not exists (select 1 from public.employees manager where manager.id = new.direct_manager_employee_id and manager.tenant_id = new.tenant_id and manager.deleted_at is null) then
      raise exception 'employee manager must belong to tenant';
    end if;
  elsif tg_table_name = 'production_lines' then
    if new.default_work_center_id is not null and not exists (select 1 from public.work_centers wc where wc.id = new.default_work_center_id and wc.tenant_id = new.tenant_id and wc.branch_id = new.branch_id and wc.deleted_at is null) then
      raise exception 'production line default work center must belong to the same tenant and branch';
    end if;
    if new.current_product_id is not null and not exists (select 1 from public.products p where p.id = new.current_product_id and p.tenant_id = new.tenant_id and p.is_active = true and p.deleted_at is null) then
      raise exception 'production line current product placeholder must be an active tenant product';
    end if;
  elsif tg_table_name = 'production_calendars' then
    if not exists (select 1 from public.production_shifts s where s.id = new.shift_id and s.tenant_id = new.tenant_id and s.is_active = true and s.deleted_at is null) then
      raise exception 'production calendar shift must belong to tenant and be active';
    end if;
  elsif tg_table_name = 'manufacturing_profiles' then
    if not exists (select 1 from public.employees e where e.id = new.employee_id and e.tenant_id = new.tenant_id and e.is_active = true and e.deleted_at is null) then
      raise exception 'manufacturing profile employee reference is tenant-safe and must be active employee core';
    end if;
    if new.default_line_id is not null and not exists (select 1 from public.production_lines l where l.id = new.default_line_id and l.tenant_id = new.tenant_id and l.deleted_at is null) then
      raise exception 'manufacturing profile default line must belong to tenant';
    end if;
  elsif tg_table_name = 'manufacturing_line_assignments' then
    if not exists (select 1 from public.manufacturing_profiles mp where mp.id = new.manufacturing_profile_id and mp.tenant_id = new.tenant_id and mp.deleted_at is null) then
      raise exception 'line assignment manufacturing profile must belong to tenant';
    end if;
    if not exists (select 1 from public.production_lines l where l.id = new.production_line_id and l.tenant_id = new.tenant_id and l.branch_id = new.branch_id and l.deleted_at is null) then
      raise exception 'line assignment production line must belong to same tenant and branch';
    end if;
    if new.shift_id is not null and not exists (select 1 from public.production_shifts s where s.id = new.shift_id and s.tenant_id = new.tenant_id and s.deleted_at is null) then
      raise exception 'line assignment shift must belong to tenant';
    end if;
  elsif tg_table_name = 'supervisor_line_assignments' then
    if new.employee_id is not null and not exists (select 1 from public.employees e where e.id = new.employee_id and e.tenant_id = new.tenant_id and e.deleted_at is null) then
      raise exception 'supervisor employee reference is tenant-safe';
    end if;
    if new.manufacturing_profile_id is not null and not exists (select 1 from public.manufacturing_profiles mp where mp.id = new.manufacturing_profile_id and mp.tenant_id = new.tenant_id and mp.deleted_at is null) then
      raise exception 'supervisor manufacturing profile reference is tenant-safe';
    end if;
    if not exists (select 1 from public.production_lines l where l.id = new.production_line_id and l.tenant_id = new.tenant_id and l.branch_id = new.branch_id and l.deleted_at is null) then
      raise exception 'supervisor line assignment line must belong to same tenant and branch';
    end if;
  elsif tg_table_name = 'production_standards' then
    if not exists (select 1 from public.products p where p.id = new.product_id and p.tenant_id = new.tenant_id and p.is_active = true and p.deleted_at is null) then
      raise exception 'production standard product must be active tenant product';
    end if;
    if not exists (select 1 from public.production_lines l where l.id = new.production_line_id and l.tenant_id = new.tenant_id and l.branch_id = new.branch_id and l.deleted_at is null) then
      raise exception 'production standard line must belong to same tenant and branch';
    end if;
    if new.shift_id is not null and not exists (select 1 from public.production_shifts s where s.id = new.shift_id and s.tenant_id = new.tenant_id and s.deleted_at is null) then
      raise exception 'production standard shift must belong to tenant';
    end if;
  elsif tg_table_name = 'manufacturing_routing_plans' then
    select product_type, is_manufacturable into product_record from public.products where id = new.product_id and tenant_id = new.tenant_id and is_active = true and deleted_at is null;
    if product_record is null or product_record.product_type not in ('finished_good', 'semi_finished') or product_record.is_manufacturable is not true then
      raise exception 'routing plan product must be active, manufacturable, finished good or semi-finished';
    end if;
  elsif tg_table_name = 'manufacturing_routing_steps' then
    select tenant_id into parent_record from public.manufacturing_routing_plans where id = new.routing_plan_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id then
      raise exception 'routing step must match routing plan tenant';
    end if;
    if new.work_center_id is not null and not exists (select 1 from public.work_centers wc where wc.id = new.work_center_id and wc.tenant_id = new.tenant_id and wc.deleted_at is null) then
      raise exception 'routing step work center must belong to tenant';
    end if;
    if new.production_line_id is not null and not exists (select 1 from public.production_lines l where l.id = new.production_line_id and l.tenant_id = new.tenant_id and l.deleted_at is null) then
      raise exception 'routing step production line must belong to tenant';
    end if;
  elsif tg_table_name = 'manufacturing_boms' then
    select product_type, is_manufacturable into product_record from public.products where id = new.product_id and tenant_id = new.tenant_id and is_active = true and deleted_at is null;
    if product_record is null or product_record.product_type not in ('finished_good', 'semi_finished') or product_record.is_manufacturable is not true then
      raise exception 'BOM product must be active, manufacturable, finished good or semi-finished';
    end if;
  elsif tg_table_name = 'manufacturing_bom_lines' then
    select tenant_id into parent_record from public.manufacturing_boms where id = new.bom_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id then
      raise exception 'BOM line must match BOM tenant';
    end if;
    select product_type into product_record from public.products where id = new.material_product_id and tenant_id = new.tenant_id and is_active = true and deleted_at is null;
    if product_record is null or product_record.product_type not in ('raw_material', 'packaging') then
      raise exception 'BOM material must be active raw material or packaging product';
    end if;
    if not exists (select 1 from public.units u where u.id = new.unit_id and u.tenant_id = new.tenant_id and u.is_active = true and u.deleted_at is null) then
      raise exception 'BOM line unit must belong to tenant and be active';
    end if;
  end if;

  return new;
end;
$$;

create trigger departments_scope before insert or update on public.departments for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger job_positions_scope before insert or update on public.job_positions for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger employees_scope before insert or update on public.employees for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger work_centers_scope before insert or update on public.work_centers for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger production_lines_scope before insert or update on public.production_lines for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger production_calendars_scope before insert or update on public.production_calendars for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_profiles_scope before insert or update on public.manufacturing_profiles for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_line_assignments_scope before insert or update on public.manufacturing_line_assignments for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger supervisor_line_assignments_scope before insert or update on public.supervisor_line_assignments for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger production_standards_scope before insert or update on public.production_standards for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_routing_plans_scope before insert or update on public.manufacturing_routing_plans for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_routing_steps_scope before insert or update on public.manufacturing_routing_steps for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_boms_scope before insert or update on public.manufacturing_boms for each row execute function public.enforce_manufacturing_foundation_scope();
create trigger manufacturing_bom_lines_scope before insert or update on public.manufacturing_bom_lines for each row execute function public.enforce_manufacturing_foundation_scope();

create trigger departments_touch before update on public.departments for each row execute function public.touch_platform_row();
create trigger job_positions_touch before update on public.job_positions for each row execute function public.touch_platform_row();
create trigger employees_touch before update on public.employees for each row execute function public.touch_platform_row();
create trigger work_centers_touch before update on public.work_centers for each row execute function public.touch_platform_row();
create trigger production_lines_touch before update on public.production_lines for each row execute function public.touch_platform_row();
create trigger production_shifts_touch before update on public.production_shifts for each row execute function public.touch_platform_row();
create trigger production_calendars_touch before update on public.production_calendars for each row execute function public.touch_platform_row();
create trigger manufacturing_profiles_touch before update on public.manufacturing_profiles for each row execute function public.touch_platform_row();
create trigger manufacturing_line_assignments_touch before update on public.manufacturing_line_assignments for each row execute function public.touch_platform_row();
create trigger supervisor_line_assignments_touch before update on public.supervisor_line_assignments for each row execute function public.touch_platform_row();
create trigger production_standards_touch before update on public.production_standards for each row execute function public.touch_platform_row();
create trigger manufacturing_settings_touch before update on public.manufacturing_settings for each row execute function public.touch_platform_row();
create trigger manufacturing_routing_plans_touch before update on public.manufacturing_routing_plans for each row execute function public.touch_platform_row();
create trigger manufacturing_routing_steps_touch before update on public.manufacturing_routing_steps for each row execute function public.touch_platform_row();
create trigger manufacturing_boms_touch before update on public.manufacturing_boms for each row execute function public.touch_platform_row();
create trigger manufacturing_bom_lines_touch before update on public.manufacturing_bom_lines for each row execute function public.touch_platform_row();

create trigger departments_prevent_tenant before update on public.departments for each row execute function public.prevent_tenant_id_change();
create trigger job_positions_prevent_tenant before update on public.job_positions for each row execute function public.prevent_tenant_id_change();
create trigger employees_prevent_tenant before update on public.employees for each row execute function public.prevent_tenant_id_change();
create trigger work_centers_prevent_tenant before update on public.work_centers for each row execute function public.prevent_tenant_id_change();
create trigger production_lines_prevent_tenant before update on public.production_lines for each row execute function public.prevent_tenant_id_change();
create trigger production_shifts_prevent_tenant before update on public.production_shifts for each row execute function public.prevent_tenant_id_change();
create trigger production_calendars_prevent_tenant before update on public.production_calendars for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_profiles_prevent_tenant before update on public.manufacturing_profiles for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_line_assignments_prevent_tenant before update on public.manufacturing_line_assignments for each row execute function public.prevent_tenant_id_change();
create trigger supervisor_line_assignments_prevent_tenant before update on public.supervisor_line_assignments for each row execute function public.prevent_tenant_id_change();
create trigger production_standards_prevent_tenant before update on public.production_standards for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_settings_prevent_tenant before update on public.manufacturing_settings for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_routing_plans_prevent_tenant before update on public.manufacturing_routing_plans for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_routing_steps_prevent_tenant before update on public.manufacturing_routing_steps for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_boms_prevent_tenant before update on public.manufacturing_boms for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_bom_lines_prevent_tenant before update on public.manufacturing_bom_lines for each row execute function public.prevent_tenant_id_change();

alter table public.departments enable row level security;
alter table public.job_positions enable row level security;
alter table public.employees enable row level security;
alter table public.production_lines enable row level security;
alter table public.work_centers enable row level security;
alter table public.production_shifts enable row level security;
alter table public.production_calendars enable row level security;
alter table public.manufacturing_profiles enable row level security;
alter table public.manufacturing_line_assignments enable row level security;
alter table public.supervisor_line_assignments enable row level security;
alter table public.production_standards enable row level security;
alter table public.manufacturing_settings enable row level security;
alter table public.manufacturing_routing_plans enable row level security;
alter table public.manufacturing_routing_steps enable row level security;
alter table public.manufacturing_boms enable row level security;
alter table public.manufacturing_bom_lines enable row level security;

alter table public.departments force row level security;
alter table public.job_positions force row level security;
alter table public.employees force row level security;
alter table public.production_lines force row level security;
alter table public.work_centers force row level security;
alter table public.production_shifts force row level security;
alter table public.production_calendars force row level security;
alter table public.manufacturing_profiles force row level security;
alter table public.manufacturing_line_assignments force row level security;
alter table public.supervisor_line_assignments force row level security;
alter table public.production_standards force row level security;
alter table public.manufacturing_settings force row level security;
alter table public.manufacturing_routing_plans force row level security;
alter table public.manufacturing_routing_steps force row level security;
alter table public.manufacturing_boms force row level security;
alter table public.manufacturing_bom_lines force row level security;

create policy departments_select on public.departments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.view', tenant_id));
create policy departments_insert on public.departments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy departments_update on public.departments for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy job_positions_select on public.job_positions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.view', tenant_id));
create policy job_positions_insert on public.job_positions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy job_positions_update on public.job_positions for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy employees_select on public.employees for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.workers.view', tenant_id)));
create policy employees_insert on public.employees for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy employees_update on public.employees for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy production_lines_select on public.production_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.lines.view', tenant_id)));
create policy production_lines_insert on public.production_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.lines.manage', tenant_id)));
create policy production_lines_update on public.production_lines for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.lines.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.lines.manage', tenant_id)));

create policy work_centers_select on public.work_centers for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.work_centers.view', tenant_id)));
create policy work_centers_insert on public.work_centers for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.work_centers.manage', tenant_id)));
create policy work_centers_update on public.work_centers for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.work_centers.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.work_centers.manage', tenant_id)));

create policy production_shifts_select on public.production_shifts for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.view', tenant_id));
create policy production_shifts_insert on public.production_shifts for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy production_shifts_update on public.production_shifts for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy production_calendars_select on public.production_calendars for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.view', tenant_id));
create policy production_calendars_insert on public.production_calendars for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy production_calendars_update on public.production_calendars for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy manufacturing_profiles_select on public.manufacturing_profiles for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.workers.view', tenant_id)));
create policy manufacturing_profiles_insert on public.manufacturing_profiles for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.workers.manage', tenant_id)));
create policy manufacturing_profiles_update on public.manufacturing_profiles for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.workers.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.workers.manage', tenant_id)));

create policy manufacturing_line_assignments_select on public.manufacturing_line_assignments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.workers.view', tenant_id)));
create policy manufacturing_line_assignments_insert on public.manufacturing_line_assignments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id)));
create policy manufacturing_line_assignments_update on public.manufacturing_line_assignments for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id)));

create policy supervisor_line_assignments_select on public.supervisor_line_assignments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.workers.view', tenant_id)));
create policy supervisor_line_assignments_insert on public.supervisor_line_assignments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id)));
create policy supervisor_line_assignments_update on public.supervisor_line_assignments for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id)));

create policy production_standards_select on public.production_standards for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.targets.manage', tenant_id)));
create policy production_standards_insert on public.production_standards for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.targets.manage', tenant_id)));
create policy production_standards_update on public.production_standards for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.targets.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.targets.manage', tenant_id)));

create policy manufacturing_settings_select on public.manufacturing_settings for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.view', tenant_id));
create policy manufacturing_settings_insert on public.manufacturing_settings for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));
create policy manufacturing_settings_update on public.manufacturing_settings for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id)) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('manufacturing.manage', tenant_id));

create policy manufacturing_routing_plans_select on public.manufacturing_routing_plans for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.routing.view', tenant_id)));
create policy manufacturing_routing_plans_insert on public.manufacturing_routing_plans for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id)));
create policy manufacturing_routing_plans_update on public.manufacturing_routing_plans for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id)));

create policy manufacturing_routing_steps_select on public.manufacturing_routing_steps for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.routing.view', tenant_id)));
create policy manufacturing_routing_steps_insert on public.manufacturing_routing_steps for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id)));
create policy manufacturing_routing_steps_update on public.manufacturing_routing_steps for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id)));

create policy manufacturing_boms_select on public.manufacturing_boms for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.bom.view', tenant_id)));
create policy manufacturing_boms_insert on public.manufacturing_boms for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id)));
create policy manufacturing_boms_update on public.manufacturing_boms for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id)));

create policy manufacturing_bom_lines_select on public.manufacturing_bom_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.view', tenant_id) or public.has_permission('manufacturing.bom.view', tenant_id)));
create policy manufacturing_bom_lines_insert on public.manufacturing_bom_lines for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id)));
create policy manufacturing_bom_lines_update on public.manufacturing_bom_lines for update to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id))) with check (public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id)));

create policy event_outbox_manufacturing_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('manufacturing.line.created', 'manufacturing.line.updated', 'manufacturing.worker.created', 'manufacturing.worker.assigned', 'manufacturing.bom.created', 'manufacturing.routing.created') and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.view', tenant_id));
create policy event_outbox_manufacturing_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('manufacturing.line.created', 'manufacturing.line.updated', 'manufacturing.worker.created', 'manufacturing.worker.assigned', 'manufacturing.bom.created', 'manufacturing.routing.created') and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.manage', tenant_id) or public.has_permission('manufacturing.lines.manage', tenant_id) or public.has_permission('manufacturing.workers.manage', tenant_id) or public.has_permission('manufacturing.assignments.manage', tenant_id) or public.has_permission('manufacturing.bom.manage', tenant_id) or public.has_permission('manufacturing.routing.manage', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.view', 'View Manufacturing', 'View manufacturing foundation and minimal employee core records.', 'standard'),
  ('manufacturing.manage', 'Manage Manufacturing', 'Manage manufacturing foundation and minimal employee core records.', 'high'),
  ('manufacturing.lines.view', 'View Production Lines', 'View production line foundation records.', 'standard'),
  ('manufacturing.lines.manage', 'Manage Production Lines', 'Create and update production line foundation records.', 'standard'),
  ('manufacturing.work_centers.view', 'View Work Centers', 'View work center foundation records.', 'standard'),
  ('manufacturing.work_centers.manage', 'Manage Work Centers', 'Create and update work center foundation records.', 'standard'),
  ('manufacturing.workers.view', 'View Manufacturing Profiles', 'View employee-backed manufacturing profiles, assignments, and production standards.', 'standard'),
  ('manufacturing.workers.manage', 'Manage Manufacturing Profiles', 'Create and update employee-backed manufacturing profiles without duplicating person data.', 'standard'),
  ('manufacturing.assignments.manage', 'Manage Line Assignments', 'Manage manufacturing line and supervisor assignment foundations.', 'standard'),
  ('manufacturing.targets.manage', 'Manage Production Standards', 'Manage product-line-shift production standards used by future sessions.', 'standard'),
  ('manufacturing.bom.view', 'View Manufacturing BOMs', 'View manufacturing BOM foundation records.', 'standard'),
  ('manufacturing.bom.manage', 'Manage Manufacturing BOMs', 'Create and update manufacturing BOM foundation records without consumption posting.', 'high'),
  ('manufacturing.routing.view', 'View Manufacturing Routings', 'View manufacturing routing foundation records.', 'standard'),
  ('manufacturing.routing.manage', 'Manage Manufacturing Routings', 'Create and update manufacturing routing foundation records without execution.', 'high')
on conflict (permission_key) do update
set label = excluded.label,
    description = excluded.description,
    risk_level = excluded.risk_level;
