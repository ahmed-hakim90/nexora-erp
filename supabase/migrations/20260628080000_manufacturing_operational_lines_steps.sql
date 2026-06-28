-- Manufacturing operational readiness: normalized BOM lines and routing steps.
-- Non-destructive: legacy/foundation JSON columns manufacturing_boms.components
-- and manufacturing_routings.operations remain in place for reconciliation.

alter table public.manufacturing_plan_lines
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.manufacturing_plan_lines
  add column if not exists status text not null default 'draft' check (status in ('draft', 'ready', 'released', 'completed', 'cancelled'));

alter table public.manufacturing_work_orders
  drop constraint if exists manufacturing_work_orders_status_check;
alter table public.manufacturing_work_orders
  add constraint manufacturing_work_orders_status_check check (status in ('draft', 'ready', 'active', 'paused', 'completed', 'cancelled', 'inactive', 'locked', 'archived'));

create table if not exists public.manufacturing_bom_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  bom_id uuid not null references public.manufacturing_boms(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  component_product_id uuid not null references public.manufacturing_products(id) on delete restrict,
  quantity numeric(18, 6) not null check (quantity > 0),
  uom_id uuid not null references public.inventory_uoms(id) on delete restrict,
  scrap_percent numeric(9, 4) not null default 0 check (scrap_percent >= 0 and scrap_percent <= 100),
  operation_id uuid references public.manufacturing_operations(id) on delete restrict,
  notes text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'archived')),
  metadata jsonb not null default jsonb_build_object('operational_line', true, 'no_costing', true, 'no_inventory_reservation', true),
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

create table if not exists public.manufacturing_routing_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  routing_id uuid not null references public.manufacturing_routings(id) on delete cascade,
  step_sequence integer not null check (step_sequence > 0),
  operation_id uuid not null references public.manufacturing_operations(id) on delete restrict,
  work_center_id uuid not null references public.manufacturing_work_centers(id) on delete restrict,
  workstation_id uuid references public.manufacturing_workstations(id) on delete restrict,
  estimated_time_minutes numeric(18, 6) not null default 0 check (estimated_time_minutes >= 0),
  setup_time_minutes numeric(18, 6) not null default 0 check (setup_time_minutes >= 0),
  run_time_minutes numeric(18, 6) not null default 0 check (run_time_minutes >= 0),
  notes text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'archived')),
  metadata jsonb not null default jsonb_build_object('operational_step', true, 'no_scheduling_engine', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (estimated_time_minutes >= setup_time_minutes + run_time_minutes or estimated_time_minutes = 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists manufacturing_bom_lines_scope_line_uq
  on public.manufacturing_bom_lines (tenant_id, bom_id, line_number)
  where deleted_at is null;
create index if not exists manufacturing_bom_lines_component_idx
  on public.manufacturing_bom_lines (tenant_id, company_id, component_product_id, status)
  where deleted_at is null;

create unique index if not exists manufacturing_routing_steps_scope_sequence_uq
  on public.manufacturing_routing_steps (tenant_id, routing_id, step_sequence)
  where deleted_at is null;
create index if not exists manufacturing_routing_steps_work_center_idx
  on public.manufacturing_routing_steps (tenant_id, company_id, work_center_id, status)
  where deleted_at is null;

create or replace function public.enforce_manufacturing_operational_line_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if tg_table_name = 'manufacturing_bom_lines' then
    select tenant_id, company_id, branch_id into parent_record
      from public.manufacturing_boms
      where id = new.bom_id and deleted_at is null;
    if parent_record.tenant_id is null then
      raise exception 'manufacturing BOM line requires an active BOM header';
    end if;
  elsif tg_table_name = 'manufacturing_routing_steps' then
    select tenant_id, company_id, branch_id into parent_record
      from public.manufacturing_routings
      where id = new.routing_id and deleted_at is null;
    if parent_record.tenant_id is null then
      raise exception 'manufacturing routing step requires an active routing header';
    end if;
  end if;

  if parent_record.tenant_id <> new.tenant_id
    or parent_record.company_id <> new.company_id
    or parent_record.branch_id is distinct from new.branch_id then
    raise exception 'manufacturing operational line must match header tenant, company, and branch scope';
  end if;

  return new;
end;
$$;

create trigger manufacturing_bom_lines_scope
  before insert or update on public.manufacturing_bom_lines
  for each row execute function public.enforce_manufacturing_operational_line_scope();
create trigger manufacturing_routing_steps_scope
  before insert or update on public.manufacturing_routing_steps
  for each row execute function public.enforce_manufacturing_operational_line_scope();

create trigger manufacturing_bom_lines_touch
  before update on public.manufacturing_bom_lines
  for each row execute function public.touch_platform_row();
create trigger manufacturing_routing_steps_touch
  before update on public.manufacturing_routing_steps
  for each row execute function public.touch_platform_row();

create trigger manufacturing_bom_lines_prevent_id
  before update on public.manufacturing_bom_lines
  for each row execute function public.prevent_id_change();
create trigger manufacturing_routing_steps_prevent_id
  before update on public.manufacturing_routing_steps
  for each row execute function public.prevent_id_change();

create trigger manufacturing_bom_lines_prevent_tenant
  before update on public.manufacturing_bom_lines
  for each row execute function public.prevent_tenant_id_change();
create trigger manufacturing_routing_steps_prevent_tenant
  before update on public.manufacturing_routing_steps
  for each row execute function public.prevent_tenant_id_change();

alter table public.manufacturing_bom_lines enable row level security;
alter table public.manufacturing_routing_steps enable row level security;
alter table public.manufacturing_bom_lines force row level security;
alter table public.manufacturing_routing_steps force row level security;

drop policy if exists manufacturing_bom_lines_select on public.manufacturing_bom_lines;
drop policy if exists manufacturing_bom_lines_write on public.manufacturing_bom_lines;
drop policy if exists manufacturing_routing_steps_select on public.manufacturing_routing_steps;
drop policy if exists manufacturing_routing_steps_write on public.manufacturing_routing_steps;

create policy manufacturing_bom_lines_select
  on public.manufacturing_bom_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.bom.view', tenant_id));
create policy manufacturing_bom_lines_write
  on public.manufacturing_bom_lines for all to authenticated
  using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.bom.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.bom.manage', tenant_id));

create policy manufacturing_routing_steps_select
  on public.manufacturing_routing_steps for select to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.view', tenant_id));
create policy manufacturing_routing_steps_write
  on public.manufacturing_routing_steps for all to authenticated
  using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.routing.manage', tenant_id));

comment on table public.manufacturing_bom_lines is 'Canonical operational BOM component lines. Legacy manufacturing_boms.components JSON remains for reconciliation only.';
comment on table public.manufacturing_routing_steps is 'Canonical operational routing steps. Legacy manufacturing_routings.operations JSON remains for reconciliation only.';
