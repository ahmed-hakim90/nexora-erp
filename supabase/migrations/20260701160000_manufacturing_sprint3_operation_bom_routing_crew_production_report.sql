-- Manufacturing Sprint 3: Operation planning, BOM lines, routing steps, crew assignment,
-- and production report document readiness only.
-- No shop-floor execution runtime, inventory posting, material issue, costing, quality execution, or payroll logic.

-- ─── BOM header normalization ───────────────────────────────────────────────

alter table public.manufacturing_boms add column if not exists bom_number text;
alter table public.manufacturing_boms add column if not exists document_number text;
alter table public.manufacturing_boms add column if not exists product_id uuid;
alter table public.manufacturing_boms add column if not exists product_variant_id uuid;
alter table public.manufacturing_boms add column if not exists version_code text;
alter table public.manufacturing_boms add column if not exists effective_from date;
alter table public.manufacturing_boms add column if not exists effective_to date;
alter table public.manufacturing_boms add column if not exists notes text;
alter table public.manufacturing_boms add column if not exists bom_metadata jsonb not null default jsonb_build_object(
  'product_master_owner', 'product-master',
  'uom_owner', 'uom',
  'components_json_legacy_only', true,
  'material_intent_only', true,
  'inventory_mutation_implemented', false,
  'cost_calculation_implemented', false
);

do $migration$
begin
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public'
      and c.relname = 'manufacturing_boms'
      and a.attname = 'status'
      and t.typname = 'manufacturing_bom_status'
  ) then
    alter table public.manufacturing_boms
      alter column status type text using (
        case status::text
          when 'obsolete' then 'inactive'
          else status::text
        end
      );
    alter table public.manufacturing_boms
      alter column status set default 'draft';
  end if;
end $migration$;

update public.manufacturing_boms
set
  bom_number = coalesce(bom_number, bom_key),
  document_number = coalesce(document_number, bom_key),
  product_id = coalesce(product_id, manufacturing_product_id),
  version_code = coalesce(version_code, version_key),
  effective_from = coalesce(effective_from, created_at::date),
  status = case
    when status in ('draft', 'active', 'inactive', 'archived') then status
    when status in ('released', 'completed') then 'active'
    when status in ('cancelled', 'locked') then 'inactive'
    else 'draft'
  end;

alter table public.manufacturing_boms alter column bom_number set not null;
alter table public.manufacturing_boms alter column document_number set not null;
alter table public.manufacturing_boms alter column product_id set not null;
alter table public.manufacturing_boms alter column version_code set not null;
alter table public.manufacturing_boms alter column effective_from set not null;

alter table public.manufacturing_boms drop constraint if exists manufacturing_boms_status_check;
alter table public.manufacturing_boms add constraint manufacturing_boms_status_check check (status in ('draft', 'active', 'inactive', 'archived'));
alter table public.manufacturing_boms drop constraint if exists manufacturing_boms_bom_metadata_check;
alter table public.manufacturing_boms add constraint manufacturing_boms_bom_metadata_check check (
  jsonb_typeof(bom_metadata) = 'object'
  and coalesce((bom_metadata ->> 'components_json_legacy_only')::boolean, false) = true
  and coalesce((bom_metadata ->> 'material_intent_only')::boolean, false) = true
  and coalesce((bom_metadata ->> 'inventory_mutation_implemented')::boolean, true) = false
  and coalesce((bom_metadata ->> 'cost_calculation_implemented')::boolean, true) = false
);
alter table public.manufacturing_boms drop constraint if exists manufacturing_boms_effective_dates_check;
alter table public.manufacturing_boms add constraint manufacturing_boms_effective_dates_check check (effective_to is null or effective_to >= effective_from);

create unique index if not exists manufacturing_boms_document_number_uq
  on public.manufacturing_boms (tenant_id, company_id, branch_id, document_number)
  where deleted_at is null;

-- ─── BOM line normalization ───────────────────────────────────────────────────

alter table public.manufacturing_bom_lines add column if not exists component_variant_id uuid;
alter table public.manufacturing_bom_lines add column if not exists operation_reference text;
alter table public.manufacturing_bom_lines add column if not exists sequence integer;

update public.manufacturing_bom_lines
set
  sequence = coalesce(sequence, line_number)
where sequence is null;

update public.manufacturing_bom_lines
set
  operation_reference = coalesce(operation_reference, '')
where operation_reference is null;

alter table public.manufacturing_bom_lines alter column sequence set not null;

alter table public.manufacturing_bom_lines add column if not exists status text not null default 'draft';

alter table public.manufacturing_bom_lines drop constraint if exists manufacturing_bom_lines_status_check;
alter table public.manufacturing_bom_lines add constraint manufacturing_bom_lines_status_check check (status in ('draft', 'active', 'inactive', 'archived'));

create unique index if not exists manufacturing_bom_lines_scope_sequence_uq
  on public.manufacturing_bom_lines (tenant_id, bom_id, sequence)
  where deleted_at is null;

-- ─── Routing header normalization ─────────────────────────────────────────────

alter table public.manufacturing_routings add column if not exists routing_number text;
alter table public.manufacturing_routings add column if not exists document_number text;
alter table public.manufacturing_routings add column if not exists product_id uuid;
alter table public.manufacturing_routings add column if not exists product_variant_id uuid;
alter table public.manufacturing_routings add column if not exists version_code text;
alter table public.manufacturing_routings add column if not exists notes text;
alter table public.manufacturing_routings add column if not exists routing_metadata jsonb not null default jsonb_build_object(
  'product_master_owner', 'product-master',
  'operations_json_legacy_only', true,
  'planning_source', true,
  'no_scheduler', true,
  'per_worker_target_canonical', false,
  'production_execution_runtime_implemented', false
);

update public.manufacturing_routings
set
  routing_number = coalesce(routing_number, routing_key),
  document_number = coalesce(document_number, routing_key),
  product_id = coalesce(product_id, manufacturing_product_id),
  version_code = coalesce(version_code, version_key),
  status = case
    when status in ('draft', 'active', 'inactive', 'archived') then status
    when status in ('released', 'completed') then 'active'
    when status in ('cancelled', 'locked') then 'inactive'
    else 'draft'
  end;

alter table public.manufacturing_routings alter column routing_number set not null;
alter table public.manufacturing_routings alter column document_number set not null;
alter table public.manufacturing_routings alter column product_id set not null;
alter table public.manufacturing_routings alter column version_code set not null;

alter table public.manufacturing_routings drop constraint if exists manufacturing_routings_status_check;
alter table public.manufacturing_routings add constraint manufacturing_routings_status_check check (status in ('draft', 'active', 'inactive', 'archived'));
alter table public.manufacturing_routings drop constraint if exists manufacturing_routings_routing_metadata_check;
alter table public.manufacturing_routings add constraint manufacturing_routings_routing_metadata_check check (
  jsonb_typeof(routing_metadata) = 'object'
  and coalesce((routing_metadata ->> 'operations_json_legacy_only')::boolean, false) = true
  and coalesce((routing_metadata ->> 'no_scheduler')::boolean, false) = true
  and coalesce((routing_metadata ->> 'per_worker_target_canonical')::boolean, true) = false
  and coalesce((routing_metadata ->> 'production_execution_runtime_implemented')::boolean, true) = false
);

create unique index if not exists manufacturing_routings_document_number_uq
  on public.manufacturing_routings (tenant_id, company_id, branch_id, document_number)
  where deleted_at is null;

-- ─── Routing step normalization ───────────────────────────────────────────────

alter table public.manufacturing_routing_steps add column if not exists sequence integer;
alter table public.manufacturing_routing_steps add column if not exists operation_code text;
alter table public.manufacturing_routing_steps add column if not exists operation_name text;
alter table public.manufacturing_routing_steps add column if not exists default_machine_id uuid references public.manufacturing_machines(id) on delete restrict;
alter table public.manufacturing_routing_steps add column if not exists standard_crew_size numeric(9, 2) not null default 1 check (standard_crew_size > 0);
alter table public.manufacturing_routing_steps add column if not exists standard_output_quantity numeric(18, 6) not null default 1 check (standard_output_quantity > 0);
alter table public.manufacturing_routing_steps add column if not exists standard_labor_hours numeric(18, 6) not null default 0 check (standard_labor_hours >= 0);
alter table public.manufacturing_routing_steps add column if not exists standard_machine_minutes numeric(18, 6) not null default 0 check (standard_machine_minutes >= 0);
alter table public.manufacturing_routing_steps add column if not exists setup_minutes numeric(18, 6) not null default 0 check (setup_minutes >= 0);
alter table public.manufacturing_routing_steps add column if not exists run_minutes numeric(18, 6) not null default 0 check (run_minutes >= 0);

do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'manufacturing_routing_steps'
      and column_name = 'operation_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'manufacturing_routing_steps'
      and column_name = 'step_sequence'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'manufacturing_operations'
  ) then
    execute $sql$
      update public.manufacturing_routing_steps rs
      set
        sequence = coalesce(rs.sequence, rs.step_sequence),
        setup_minutes = coalesce(rs.setup_minutes, rs.setup_time_minutes, 0),
        run_minutes = coalesce(rs.run_minutes, rs.run_time_minutes, 0),
        standard_machine_minutes = coalesce(rs.standard_machine_minutes, rs.estimated_time_minutes, 0),
        operation_code = coalesce(rs.operation_code, op.operation_key),
        operation_name = coalesce(rs.operation_name, op.name)
      from public.manufacturing_operations op
      where rs.operation_id = op.id
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'manufacturing_routing_steps'
      and column_name = 'step_sequence'
  ) then
    execute $sql$
      update public.manufacturing_routing_steps
      set
        sequence = coalesce(sequence, step_sequence),
        setup_minutes = coalesce(setup_minutes, setup_time_minutes, 0),
        run_minutes = coalesce(run_minutes, run_time_minutes, 0),
        standard_machine_minutes = coalesce(standard_machine_minutes, estimated_time_minutes, 0),
        operation_code = coalesce(operation_code, 'step-' || step_sequence::text),
        operation_name = coalesce(operation_name, 'Routing step')
      where sequence is null
         or operation_code is null
         or operation_name is null
    $sql$;
  else
    update public.manufacturing_routing_steps
    set
      sequence = coalesce(sequence, 1),
      operation_code = coalesce(operation_code, 'step-' || coalesce(sequence, 1)::text),
      operation_name = coalesce(operation_name, 'Routing step')
    where sequence is null
       or operation_code is null
       or operation_name is null;
  end if;
end $migration$;

alter table public.manufacturing_routing_steps alter column sequence set not null;
alter table public.manufacturing_routing_steps alter column operation_code set not null;
alter table public.manufacturing_routing_steps alter column operation_name set not null;

alter table public.manufacturing_routing_steps add column if not exists status text not null default 'draft';

alter table public.manufacturing_routing_steps drop constraint if exists manufacturing_routing_steps_status_check;
alter table public.manufacturing_routing_steps add constraint manufacturing_routing_steps_status_check check (status in ('draft', 'active', 'inactive', 'archived'));

create unique index if not exists manufacturing_routing_steps_scope_sequence_uq
  on public.manufacturing_routing_steps (tenant_id, routing_id, sequence)
  where deleted_at is null;

-- ─── Operation planning ───────────────────────────────────────────────────────

create table if not exists public.manufacturing_operation_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  manufacturing_order_id uuid not null references public.manufacturing_orders(id) on delete restrict,
  work_order_id uuid references public.manufacturing_work_orders(id) on delete restrict,
  routing_step_id uuid references public.manufacturing_routing_steps(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  operation_code text not null,
  operation_name text not null,
  work_center_id uuid not null references public.manufacturing_work_centers(id) on delete restrict,
  workstation_id uuid references public.manufacturing_workstations(id) on delete restrict,
  machine_id uuid references public.manufacturing_machines(id) on delete restrict,
  planned_quantity numeric(18, 6) not null check (planned_quantity > 0),
  uom_id uuid,
  planned_labor_hours numeric(18, 6) not null default 0 check (planned_labor_hours >= 0),
  planned_machine_minutes numeric(18, 6) not null default 0 check (planned_machine_minutes >= 0),
  setup_minutes numeric(18, 6) not null default 0 check (setup_minutes >= 0),
  run_minutes numeric(18, 6) not null default 0 check (run_minutes >= 0),
  status text not null default 'draft' check (status in ('draft', 'planned', 'ready', 'blocked', 'in_progress', 'completed', 'cancelled')),
  planning_metadata jsonb not null default jsonb_build_object(
    'product_master_owner', 'product-master',
    'uom_owner', 'uom',
    'routing_reference_only', true,
    'inventory_mutation_implemented', false,
    'material_issue_implemented', false,
    'cost_calculation_implemented', false,
    'quality_execution_implemented', false,
    'payroll_logic_implemented', false,
    'production_execution_runtime_implemented', false,
    'per_worker_target_canonical', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (operation_code = lower(operation_code)),
  check (length(trim(operation_name)) > 0),
  check (jsonb_typeof(planning_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

-- ─── Crew assignment ──────────────────────────────────────────────────────────

create table if not exists public.manufacturing_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  manufacturing_order_id uuid not null references public.manufacturing_orders(id) on delete restrict,
  work_order_id uuid references public.manufacturing_work_orders(id) on delete restrict,
  operation_id uuid not null references public.manufacturing_operation_plans(id) on delete restrict,
  production_line_id uuid references public.manufacturing_lines(id) on delete restrict,
  shift_id uuid,
  supervisor_employee_id uuid,
  status text not null default 'draft' check (status in ('draft', 'active', 'replaced', 'closed', 'cancelled')),
  effective_from timestamptz not null,
  effective_to timestamptz,
  reason text,
  crew_metadata jsonb not null default jsonb_build_object(
    'employee_master_owner', 'hr',
    'hr_assignment_owner', 'hr',
    'owns_employee_master_data', false,
    'payroll_logic_implemented', false,
    'production_execution_runtime_implemented', false
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
  check (jsonb_typeof(crew_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_crew_assignment_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  crew_assignment_id uuid not null references public.manufacturing_crew_assignments(id) on delete cascade,
  employee_id uuid not null,
  hr_assignment_id uuid references public.hr_assignments(id) on delete restrict,
  crew_role text not null check (crew_role in ('operator', 'lead_operator', 'helper', 'acting_supervisor', 'quality_observer', 'maintenance_support', 'temporary_worker')),
  effective_from timestamptz not null,
  effective_to timestamptz,
  is_temporary boolean not null default false,
  is_acting boolean not null default false,
  replacement_of_member_id uuid references public.manufacturing_crew_assignment_members(id) on delete restrict,
  notes text,
  member_metadata jsonb not null default jsonb_build_object(
    'employee_master_owner', 'hr',
    'hr_assignment_owner', 'hr'
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
  check (jsonb_typeof(member_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

-- ─── Production report document ───────────────────────────────────────────────

create table if not exists public.manufacturing_production_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  document_number text not null,
  manufacturing_order_id uuid not null references public.manufacturing_orders(id) on delete restrict,
  work_order_id uuid references public.manufacturing_work_orders(id) on delete restrict,
  operation_id uuid not null references public.manufacturing_operation_plans(id) on delete restrict,
  product_id uuid not null,
  product_variant_id uuid,
  production_line_id uuid not null references public.manufacturing_lines(id) on delete restrict,
  shift_id uuid,
  report_date date not null,
  produced_quantity numeric(18, 6) not null default 0 check (produced_quantity >= 0),
  scrap_quantity numeric(18, 6) not null default 0 check (scrap_quantity >= 0),
  rework_quantity numeric(18, 6) not null default 0 check (rework_quantity >= 0),
  uom_id uuid,
  machine_id uuid references public.manufacturing_machines(id) on delete restrict,
  crew_assignment_id uuid references public.manufacturing_crew_assignments(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'posted', 'closed', 'cancelled')),
  notes text,
  document_type text not null default 'manufacturing.production-report',
  document_metadata jsonb not null default jsonb_build_object(
    'document_engine_ready', true,
    'uses_document_engine', true,
    'business_document', true
  ),
  report_metadata jsonb not null default jsonb_build_object(
    'product_master_owner', 'product-master',
    'uom_owner', 'uom',
    'shift_owner', 'hr-workforce',
    'inventory_mutation_implemented', false,
    'cost_calculation_implemented', false,
    'payroll_logic_implemented', false,
    'quality_execution_implemented', false,
    'production_facts_only', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (document_type = 'manufacturing.production-report'),
  check (jsonb_typeof(document_metadata) = 'object'),
  check (jsonb_typeof(report_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_production_report_crew (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  production_report_id uuid not null references public.manufacturing_production_reports(id) on delete cascade,
  crew_assignment_id uuid references public.manufacturing_crew_assignments(id) on delete restrict,
  crew_member_id uuid references public.manufacturing_crew_assignment_members(id) on delete restrict,
  employee_id uuid not null,
  crew_role text not null,
  participation_minutes numeric(18, 6) not null default 0 check (participation_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_production_report_downtime (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  production_report_id uuid not null references public.manufacturing_production_reports(id) on delete cascade,
  machine_id uuid references public.manufacturing_machines(id) on delete restrict,
  downtime_minutes numeric(18, 6) not null check (downtime_minutes > 0),
  reason_code text,
  reason_notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (ended_at is null or started_at is null or ended_at >= started_at),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_production_report_scrap (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  production_report_id uuid not null references public.manufacturing_production_reports(id) on delete cascade,
  product_id uuid not null,
  product_variant_id uuid,
  scrap_quantity numeric(18, 6) not null check (scrap_quantity > 0),
  uom_id uuid,
  reason_code text,
  reason_notes text,
  inventory_disposition_owner text not null default 'inventory' check (inventory_disposition_owner = 'inventory'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.manufacturing_production_report_rework (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  production_report_id uuid not null references public.manufacturing_production_reports(id) on delete cascade,
  product_id uuid not null,
  product_variant_id uuid,
  rework_quantity numeric(18, 6) not null check (rework_quantity > 0),
  uom_id uuid,
  reason_code text,
  reason_notes text,
  quality_decision_owner text not null default 'quality' check (quality_decision_owner = 'quality'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create unique index if not exists manufacturing_operation_plans_scope_sequence_uq
  on public.manufacturing_operation_plans (tenant_id, manufacturing_order_id, sequence)
  where deleted_at is null;
create index if not exists manufacturing_operation_plans_status_idx
  on public.manufacturing_operation_plans (tenant_id, company_id, branch_id, status, id)
  where deleted_at is null;

create index if not exists manufacturing_crew_assignments_operation_idx
  on public.manufacturing_crew_assignments (tenant_id, company_id, branch_id, operation_id, status, effective_from)
  where deleted_at is null;
create index if not exists manufacturing_crew_assignment_members_employee_idx
  on public.manufacturing_crew_assignment_members (tenant_id, employee_id, effective_from)
  where deleted_at is null;

create unique index if not exists manufacturing_production_reports_document_number_uq
  on public.manufacturing_production_reports (tenant_id, company_id, branch_id, document_number)
  where deleted_at is null;
create index if not exists manufacturing_production_reports_report_date_idx
  on public.manufacturing_production_reports (tenant_id, company_id, branch_id, report_date, status, id)
  where deleted_at is null;

-- ─── Scope enforcement ────────────────────────────────────────────────────────

create or replace function public.enforce_manufacturing_sprint3_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if new.branch_id is null then
    raise exception 'manufacturing sprint 3 foundation requires branch scope';
  end if;

  if tg_table_name = 'manufacturing_operation_plans' then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_orders where id = new.manufacturing_order_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'operation plan must match manufacturing order tenant, company, and branch scope';
    end if;
    if new.work_order_id is not null then
      select tenant_id, company_id, branch_id, manufacturing_order_id into parent_record from public.manufacturing_work_orders where id = new.work_order_id and deleted_at is null;
      if parent_record.manufacturing_order_id <> new.manufacturing_order_id then
        raise exception 'operation plan work order must belong to selected manufacturing order';
      end if;
    end if;
    if new.work_center_id is not null then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_work_centers where id = new.work_center_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'operation plan must reference work center in the same tenant, company, and branch';
      end if;
    end if;
  elsif tg_table_name = 'manufacturing_crew_assignments' then
    select tenant_id, company_id, branch_id, manufacturing_order_id into parent_record from public.manufacturing_operation_plans where id = new.operation_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'crew assignment must match operation plan tenant, company, and branch scope';
    end if;
    if new.manufacturing_order_id <> parent_record.manufacturing_order_id then
      raise exception 'crew assignment manufacturing order must match operation plan manufacturing order';
    end if;
  elsif tg_table_name = 'manufacturing_crew_assignment_members' then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_crew_assignments where id = new.crew_assignment_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'crew assignment member must match crew assignment tenant, company, and branch scope';
    end if;
  elsif tg_table_name in ('manufacturing_production_reports', 'manufacturing_production_report_crew', 'manufacturing_production_report_downtime', 'manufacturing_production_report_scrap', 'manufacturing_production_report_rework') then
    if tg_table_name = 'manufacturing_production_reports' then
      select tenant_id, company_id, branch_id, manufacturing_order_id into parent_record from public.manufacturing_operation_plans where id = new.operation_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'production report must match operation plan tenant, company, and branch scope';
      end if;
      if new.manufacturing_order_id <> parent_record.manufacturing_order_id then
        raise exception 'production report manufacturing order must match operation plan manufacturing order';
      end if;
    elsif tg_table_name <> 'manufacturing_production_reports' then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_production_reports where id = new.production_report_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'production report child row must match production report tenant, company, and branch scope';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists manufacturing_operation_plans_sprint3_scope on public.manufacturing_operation_plans;
create trigger manufacturing_operation_plans_sprint3_scope before insert or update on public.manufacturing_operation_plans for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_crew_assignments_sprint3_scope on public.manufacturing_crew_assignments;
create trigger manufacturing_crew_assignments_sprint3_scope before insert or update on public.manufacturing_crew_assignments for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_crew_assignment_members_sprint3_scope on public.manufacturing_crew_assignment_members;
create trigger manufacturing_crew_assignment_members_sprint3_scope before insert or update on public.manufacturing_crew_assignment_members for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_production_reports_sprint3_scope on public.manufacturing_production_reports;
create trigger manufacturing_production_reports_sprint3_scope before insert or update on public.manufacturing_production_reports for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_production_report_crew_sprint3_scope on public.manufacturing_production_report_crew;
create trigger manufacturing_production_report_crew_sprint3_scope before insert or update on public.manufacturing_production_report_crew for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_production_report_downtime_sprint3_scope on public.manufacturing_production_report_downtime;
create trigger manufacturing_production_report_downtime_sprint3_scope before insert or update on public.manufacturing_production_report_downtime for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_production_report_scrap_sprint3_scope on public.manufacturing_production_report_scrap;
create trigger manufacturing_production_report_scrap_sprint3_scope before insert or update on public.manufacturing_production_report_scrap for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();
drop trigger if exists manufacturing_production_report_rework_sprint3_scope on public.manufacturing_production_report_rework;
create trigger manufacturing_production_report_rework_sprint3_scope before insert or update on public.manufacturing_production_report_rework for each row execute function public.enforce_manufacturing_sprint3_foundation_scope();

-- ─── Touch / prevent triggers ─────────────────────────────────────────────────

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'manufacturing_operation_plans',
    'manufacturing_crew_assignments',
    'manufacturing_crew_assignment_members',
    'manufacturing_production_reports',
    'manufacturing_production_report_crew',
    'manufacturing_production_report_downtime',
    'manufacturing_production_report_scrap',
    'manufacturing_production_report_rework'
  ]
  loop
    execute format('drop trigger if exists %I_touch on public.%I', table_name, table_name);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_platform_row()', table_name, table_name);
    execute format('drop trigger if exists %I_prevent_id on public.%I', table_name, table_name);
    execute format('create trigger %I_prevent_id before update on public.%I for each row execute function public.prevent_id_change()', table_name, table_name);
    execute format('drop trigger if exists %I_prevent_tenant on public.%I', table_name, table_name);
    execute format('create trigger %I_prevent_tenant before update on public.%I for each row execute function public.prevent_tenant_id_change()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

-- ─── RLS policies ─────────────────────────────────────────────────────────────

drop policy if exists manufacturing_operation_plans_select on public.manufacturing_operation_plans;
drop policy if exists manufacturing_operation_plans_write on public.manufacturing_operation_plans;
create policy manufacturing_operation_plans_select on public.manufacturing_operation_plans for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.view', tenant_id));
create policy manufacturing_operation_plans_write on public.manufacturing_operation_plans for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.operations.manage', tenant_id));

drop policy if exists manufacturing_crew_assignments_select on public.manufacturing_crew_assignments;
drop policy if exists manufacturing_crew_assignments_write on public.manufacturing_crew_assignments;
create policy manufacturing_crew_assignments_select on public.manufacturing_crew_assignments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.view', tenant_id));
create policy manufacturing_crew_assignments_write on public.manufacturing_crew_assignments for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.manage', tenant_id));

drop policy if exists manufacturing_crew_assignment_members_select on public.manufacturing_crew_assignment_members;
drop policy if exists manufacturing_crew_assignment_members_write on public.manufacturing_crew_assignment_members;
create policy manufacturing_crew_assignment_members_select on public.manufacturing_crew_assignment_members for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.view', tenant_id));
create policy manufacturing_crew_assignment_members_write on public.manufacturing_crew_assignment_members for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.crew.manage', tenant_id));

drop policy if exists manufacturing_production_reports_select on public.manufacturing_production_reports;
drop policy if exists manufacturing_production_reports_write on public.manufacturing_production_reports;
create policy manufacturing_production_reports_select on public.manufacturing_production_reports for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.reports.view', tenant_id));
create policy manufacturing_production_reports_write on public.manufacturing_production_reports for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.reports.create', tenant_id) or public.has_permission('manufacturing.reports.submit', tenant_id) or public.has_permission('manufacturing.reports.approve', tenant_id) or public.has_permission('manufacturing.reports.post', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.reports.create', tenant_id) or public.has_permission('manufacturing.reports.submit', tenant_id) or public.has_permission('manufacturing.reports.approve', tenant_id) or public.has_permission('manufacturing.reports.post', tenant_id)));

drop policy if exists manufacturing_production_report_crew_select on public.manufacturing_production_report_crew;
drop policy if exists manufacturing_production_report_crew_write on public.manufacturing_production_report_crew;
create policy manufacturing_production_report_crew_select on public.manufacturing_production_report_crew for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.reports.view', tenant_id));
create policy manufacturing_production_report_crew_write on public.manufacturing_production_report_crew for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.reports.create', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.reports.create', tenant_id));

drop policy if exists manufacturing_production_report_downtime_select on public.manufacturing_production_report_downtime;
drop policy if exists manufacturing_production_report_downtime_write on public.manufacturing_production_report_downtime;
create policy manufacturing_production_report_downtime_select on public.manufacturing_production_report_downtime for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.downtime.manage', tenant_id));
create policy manufacturing_production_report_downtime_write on public.manufacturing_production_report_downtime for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.downtime.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.downtime.manage', tenant_id));

drop policy if exists manufacturing_production_report_scrap_select on public.manufacturing_production_report_scrap;
drop policy if exists manufacturing_production_report_scrap_write on public.manufacturing_production_report_scrap;
create policy manufacturing_production_report_scrap_select on public.manufacturing_production_report_scrap for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.scrap.manage', tenant_id));
create policy manufacturing_production_report_scrap_write on public.manufacturing_production_report_scrap for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.scrap.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.scrap.manage', tenant_id));

drop policy if exists manufacturing_production_report_rework_select on public.manufacturing_production_report_rework;
drop policy if exists manufacturing_production_report_rework_write on public.manufacturing_production_report_rework;
create policy manufacturing_production_report_rework_select on public.manufacturing_production_report_rework for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.rework.manage', tenant_id));
create policy manufacturing_production_report_rework_write on public.manufacturing_production_report_rework for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.rework.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.rework.manage', tenant_id));

-- ─── Event outbox readiness ───────────────────────────────────────────────────

drop policy if exists event_outbox_manufacturing_sprint3_select on public.event_outbox;
drop policy if exists event_outbox_manufacturing_sprint3_insert on public.event_outbox;
create policy event_outbox_manufacturing_sprint3_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in (
  'ManufacturingOperationPlanned', 'ManufacturingOperationReady', 'ManufacturingOperationBlocked', 'ManufacturingOperationStarted', 'ManufacturingOperationCompleted', 'ManufacturingOperationCancelled',
  'ManufacturingBomActivated', 'ManufacturingRoutingActivated',
  'ManufacturingCrewAssigned', 'ManufacturingCrewReplaced',
  'ManufacturingProductionReportCreated', 'ManufacturingProductionReportSubmitted', 'ManufacturingProductionReportApproved', 'ManufacturingProductionReportPosted',
  'ManufacturingDowntimeReported', 'ManufacturingScrapReported', 'ManufacturingReworkReported'
) and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.audit.view', tenant_id));
create policy event_outbox_manufacturing_sprint3_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in (
  'ManufacturingOperationPlanned', 'ManufacturingOperationReady', 'ManufacturingOperationBlocked', 'ManufacturingOperationStarted', 'ManufacturingOperationCompleted', 'ManufacturingOperationCancelled',
  'ManufacturingBomActivated', 'ManufacturingRoutingActivated',
  'ManufacturingCrewAssigned', 'ManufacturingCrewReplaced',
  'ManufacturingProductionReportCreated', 'ManufacturingProductionReportSubmitted', 'ManufacturingProductionReportApproved', 'ManufacturingProductionReportPosted',
  'ManufacturingDowntimeReported', 'ManufacturingScrapReported', 'ManufacturingReworkReported'
) and public.is_tenant_member(tenant_id) and (
  public.has_permission('manufacturing.operations.manage', tenant_id)
  or public.has_permission('manufacturing.crew.manage', tenant_id)
  or public.has_permission('manufacturing.reports.create', tenant_id)
  or public.has_permission('manufacturing.bom.manage', tenant_id)
  or public.has_permission('manufacturing.routing.manage', tenant_id)
));

comment on table public.manufacturing_operation_plans is 'Operation planning rows for manufacturing orders. References routing steps but does not own routing master data. No execution runtime side effects.';
comment on table public.manufacturing_crew_assignments is 'Effective-dated crew assignment headers referencing HR workers through member rows. Operation-level assignment only.';
comment on table public.manufacturing_crew_assignment_members is 'Crew members assigned to an operation with HR employee and optional HR assignment references.';
comment on table public.manufacturing_production_reports is 'Document Engine-ready production report business document. Production facts only; no inventory, cost, payroll, or quality posting.';
comment on table public.manufacturing_boms is 'BOM header. manufacturing_boms.components JSON remains legacy only; canonical lines live in manufacturing_bom_lines.';
comment on table public.manufacturing_routings is 'Routing header. manufacturing_routings.operations JSON remains legacy only; canonical steps live in manufacturing_routing_steps.';
