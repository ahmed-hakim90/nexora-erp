-- Manufacturing Sprint 3: Production planning and manufacturing order foundation only.
-- No production execution runtime, Production Reports UI, inventory posting, material issue runtime, costing, quality execution, or payroll logic.

alter table public.manufacturing_plans add column if not exists plan_number text;
alter table public.manufacturing_plans add column if not exists document_number text;
alter table public.manufacturing_plans add column if not exists planning_period text;
alter table public.manufacturing_plans add column if not exists planning_source text not null default 'manual';
alter table public.manufacturing_plans add column if not exists notes text;
alter table public.manufacturing_plans add column if not exists document_type text not null default 'manufacturing.production-plan';
alter table public.manufacturing_plans add column if not exists workflow_readiness_metadata jsonb not null default jsonb_build_object('workflow_ready', true, 'workflow_runtime_implemented', false);
alter table public.manufacturing_plans add column if not exists approval_readiness_metadata jsonb not null default jsonb_build_object('approval_ready', true, 'approval_runtime_implemented', false);

update public.manufacturing_plans
set
  plan_number = coalesce(plan_number, plan_key),
  document_number = coalesce(document_number, plan_key),
  planning_period = coalesce(planning_period, plan_date::text),
  status = case
    when status in ('draft', 'approved', 'released', 'closed', 'cancelled') then status
    when status in ('active', 'completed', 'archived', 'locked') then 'closed'
    else 'draft'
  end;

alter table public.manufacturing_plans alter column plan_number set not null;
alter table public.manufacturing_plans alter column document_number set not null;
alter table public.manufacturing_plans alter column planning_period set not null;

alter table public.manufacturing_plan_lines add column if not exists product_id uuid;
alter table public.manufacturing_plan_lines add column if not exists product_variant_id uuid;
alter table public.manufacturing_plan_lines add column if not exists uom_id uuid;
alter table public.manufacturing_plan_lines add column if not exists production_line_id uuid references public.manufacturing_lines(id) on delete restrict;
alter table public.manufacturing_plan_lines add column if not exists shift_id uuid;
alter table public.manufacturing_plan_lines add column if not exists planned_start_at timestamptz;
alter table public.manufacturing_plan_lines add column if not exists planned_end_at timestamptz;
alter table public.manufacturing_plan_lines add column if not exists priority integer not null default 100 check (priority > 0);
alter table public.manufacturing_plan_lines add column if not exists status text not null default 'draft';
alter table public.manufacturing_plan_lines add column if not exists bom_version_id uuid;
alter table public.manufacturing_plan_lines add column if not exists routing_version_id uuid;
alter table public.manufacturing_plan_lines add column if not exists planning_metadata jsonb not null default jsonb_build_object(
  'product_master_owner', 'product-master',
  'uom_owner', 'uom',
  'shift_owner', 'hr-workforce',
  'bom_reference_only', true,
  'routing_reference_only', true,
  'material_reservation_implemented', false,
  'inventory_mutation_implemented', false
);

update public.manufacturing_plan_lines
set
  product_id = coalesce(product_id, manufacturing_product_id),
  production_line_id = coalesce(production_line_id, planned_line_id),
  planned_start_at = coalesce(planned_start_at, planned_start),
  planned_end_at = coalesce(planned_end_at, planned_end),
  status = case
    when status in ('draft', 'approved', 'released', 'closed', 'cancelled') then status
    when status in ('active', 'completed', 'archived', 'locked') then 'closed'
    else 'draft'
  end;

alter table public.manufacturing_plan_lines alter column product_id set not null;
alter table public.manufacturing_plan_lines alter column production_line_id set not null;
alter table public.manufacturing_plan_lines alter column planned_start_at set not null;
alter table public.manufacturing_plan_lines alter column planned_end_at set not null;

alter table public.manufacturing_orders add column if not exists plan_id uuid references public.manufacturing_plans(id) on delete restrict;
alter table public.manufacturing_orders add column if not exists product_id uuid;
alter table public.manufacturing_orders add column if not exists product_variant_id uuid;
alter table public.manufacturing_orders add column if not exists uom_id uuid;
alter table public.manufacturing_orders add column if not exists production_line_id uuid references public.manufacturing_lines(id) on delete restrict;
alter table public.manufacturing_orders add column if not exists bom_version_id uuid;
alter table public.manufacturing_orders add column if not exists routing_version_id uuid;
alter table public.manufacturing_orders add column if not exists order_number text;
alter table public.manufacturing_orders add column if not exists document_number text;
alter table public.manufacturing_orders add column if not exists document_type text not null default 'manufacturing.manufacturing-order';
alter table public.manufacturing_orders add column if not exists document_metadata jsonb not null default jsonb_build_object('document_engine_ready', true);
alter table public.manufacturing_orders add column if not exists release_readiness_metadata jsonb not null default jsonb_build_object(
  'document_ready', true,
  'operation_planning_ready', true,
  'material_issue_runtime_implemented', false,
  'inventory_posting_implemented', false,
  'production_execution_runtime_implemented', false
);
alter table public.manufacturing_orders add column if not exists planned_start_at timestamptz;
alter table public.manufacturing_orders add column if not exists planned_end_at timestamptz;
alter table public.manufacturing_orders add column if not exists released_at timestamptz;
alter table public.manufacturing_orders add column if not exists completed_at timestamptz;
alter table public.manufacturing_orders add column if not exists material_issue_runtime_implemented boolean not null default false check (material_issue_runtime_implemented = false);
alter table public.manufacturing_orders add column if not exists inventory_posting_implemented boolean not null default false check (inventory_posting_implemented = false);
alter table public.manufacturing_orders add column if not exists cost_calculation_implemented boolean not null default false check (cost_calculation_implemented = false);
alter table public.manufacturing_orders add column if not exists quality_execution_implemented boolean not null default false check (quality_execution_implemented = false);
alter table public.manufacturing_orders add column if not exists payroll_logic_implemented boolean not null default false check (payroll_logic_implemented = false);

update public.manufacturing_orders o
set
  plan_id = coalesce(o.plan_id, pl.plan_id),
  product_id = coalesce(o.product_id, o.manufacturing_product_id),
  production_line_id = coalesce(o.production_line_id, pl.production_line_id, pl.planned_line_id),
  bom_version_id = coalesce(o.bom_version_id, pl.bom_version_id),
  routing_version_id = coalesce(o.routing_version_id, pl.routing_version_id),
  order_number = coalesce(o.order_number, o.order_key),
  document_number = coalesce(o.document_number, o.order_key),
  planned_start_at = coalesce(o.planned_start_at, pl.planned_start_at, pl.planned_start),
  planned_end_at = coalesce(o.planned_end_at, pl.planned_end_at, pl.planned_end),
  released_at = case when o.status = 'released' then coalesce(o.released_at, o.updated_at) else o.released_at end,
  completed_at = case when o.status = 'completed' then coalesce(o.completed_at, o.updated_at) else o.completed_at end,
  status = case
    when o.status in ('draft', 'released', 'in_progress', 'completed', 'closed', 'cancelled') then o.status
    when o.status in ('active') then 'released'
    when o.status in ('archived', 'locked') then 'closed'
    else 'draft'
  end
from public.manufacturing_plan_lines pl
where o.plan_line_id = pl.id;

update public.manufacturing_orders
set
  product_id = coalesce(product_id, manufacturing_product_id),
  order_number = coalesce(order_number, order_key),
  document_number = coalesce(document_number, order_key),
  status = case
    when status in ('draft', 'released', 'in_progress', 'completed', 'closed', 'cancelled') then status
    when status in ('active') then 'released'
    when status in ('archived', 'locked') then 'closed'
    else 'draft'
  end
where plan_line_id is null;

alter table public.manufacturing_orders alter column product_id set not null;
alter table public.manufacturing_orders alter column order_number set not null;
alter table public.manufacturing_orders alter column document_number set not null;

alter table public.manufacturing_plans drop constraint if exists manufacturing_plans_status_check;
alter table public.manufacturing_plans add constraint manufacturing_plans_status_check check (status in ('draft', 'approved', 'released', 'closed', 'cancelled'));
alter table public.manufacturing_plan_lines drop constraint if exists manufacturing_plan_lines_status_check;
alter table public.manufacturing_plan_lines add constraint manufacturing_plan_lines_status_check check (status in ('draft', 'approved', 'released', 'closed', 'cancelled'));
alter table public.manufacturing_orders drop constraint if exists manufacturing_orders_status_check;
alter table public.manufacturing_orders add constraint manufacturing_orders_status_check check (status in ('draft', 'released', 'in_progress', 'completed', 'closed', 'cancelled'));

alter table public.manufacturing_plans drop constraint if exists manufacturing_plans_document_ready_check;
alter table public.manufacturing_plans add constraint manufacturing_plans_document_ready_check check (
  document_type = 'manufacturing.production-plan'
  and jsonb_typeof(workflow_readiness_metadata) = 'object'
  and jsonb_typeof(approval_readiness_metadata) = 'object'
  and coalesce((workflow_readiness_metadata ->> 'workflow_runtime_implemented')::boolean, true) = false
  and coalesce((approval_readiness_metadata ->> 'approval_runtime_implemented')::boolean, true) = false
);
alter table public.manufacturing_plan_lines drop constraint if exists manufacturing_plan_lines_planning_metadata_check;
alter table public.manufacturing_plan_lines add constraint manufacturing_plan_lines_planning_metadata_check check (
  jsonb_typeof(planning_metadata) = 'object'
  and coalesce((planning_metadata ->> 'bom_reference_only')::boolean, false) = true
  and coalesce((planning_metadata ->> 'routing_reference_only')::boolean, false) = true
  and coalesce((planning_metadata ->> 'material_reservation_implemented')::boolean, true) = false
  and coalesce((planning_metadata ->> 'inventory_mutation_implemented')::boolean, true) = false
);
alter table public.manufacturing_orders drop constraint if exists manufacturing_orders_document_release_ready_check;
alter table public.manufacturing_orders add constraint manufacturing_orders_document_release_ready_check check (
  document_type = 'manufacturing.manufacturing-order'
  and jsonb_typeof(document_metadata) = 'object'
  and jsonb_typeof(release_readiness_metadata) = 'object'
  and coalesce((release_readiness_metadata ->> 'material_issue_runtime_implemented')::boolean, true) = false
  and coalesce((release_readiness_metadata ->> 'inventory_posting_implemented')::boolean, true) = false
  and coalesce((release_readiness_metadata ->> 'production_execution_runtime_implemented')::boolean, true) = false
);

alter table public.manufacturing_plan_lines drop constraint if exists manufacturing_plan_lines_planned_dates_check;
alter table public.manufacturing_plan_lines add constraint manufacturing_plan_lines_planned_dates_check check (planned_end_at >= planned_start_at);
alter table public.manufacturing_orders drop constraint if exists manufacturing_orders_planned_dates_check;
alter table public.manufacturing_orders add constraint manufacturing_orders_planned_dates_check check (planned_end_at is null or planned_start_at is null or planned_end_at >= planned_start_at);

create unique index if not exists manufacturing_plans_document_number_uq on public.manufacturing_plans (tenant_id, company_id, branch_id, document_number) where deleted_at is null;
create index if not exists manufacturing_plans_period_status_idx on public.manufacturing_plans (tenant_id, company_id, branch_id, planning_period, status, id) where deleted_at is null;
create index if not exists manufacturing_plan_lines_planning_refs_idx on public.manufacturing_plan_lines (tenant_id, company_id, branch_id, product_id, production_line_id, status, id) where deleted_at is null;
create unique index if not exists manufacturing_orders_document_number_uq on public.manufacturing_orders (tenant_id, company_id, branch_id, document_number) where deleted_at is null;
create index if not exists manufacturing_orders_plan_refs_idx on public.manufacturing_orders (tenant_id, company_id, branch_id, plan_id, plan_line_id, status, id) where deleted_at is null;
create index if not exists manufacturing_orders_release_readiness_idx on public.manufacturing_orders (tenant_id, company_id, branch_id, status, released_at, completed_at, id) where deleted_at is null;

create or replace function public.enforce_manufacturing_planning_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if new.branch_id is null then
    raise exception 'manufacturing planning foundation requires branch scope';
  end if;

  if tg_table_name = 'manufacturing_plan_lines' then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_plans where id = new.plan_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'manufacturing plan line must match production plan tenant, company, and branch scope';
    end if;
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_lines where id = new.production_line_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'manufacturing plan line must reference a manufacturing production line in the same tenant, company, and branch';
    end if;
  elsif tg_table_name = 'manufacturing_orders' then
    if new.plan_id is not null then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_plans where id = new.plan_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing order must match production plan tenant, company, and branch scope';
      end if;
    end if;
    if new.plan_line_id is not null then
      select tenant_id, company_id, branch_id, plan_id into parent_record from public.manufacturing_plan_lines where id = new.plan_line_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing order must match production plan line tenant, company, and branch scope';
      end if;
      if new.plan_id is not null and parent_record.plan_id <> new.plan_id then
        raise exception 'manufacturing order plan line must belong to selected production plan';
      end if;
    end if;
    if new.production_line_id is not null then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_lines where id = new.production_line_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing order must reference a manufacturing production line in the same tenant, company, and branch';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists manufacturing_plan_lines_planning_foundation_scope on public.manufacturing_plan_lines;
create trigger manufacturing_plan_lines_planning_foundation_scope before insert or update on public.manufacturing_plan_lines for each row execute function public.enforce_manufacturing_planning_foundation_scope();
drop trigger if exists manufacturing_orders_planning_foundation_scope on public.manufacturing_orders;
create trigger manufacturing_orders_planning_foundation_scope before insert or update on public.manufacturing_orders for each row execute function public.enforce_manufacturing_planning_foundation_scope();

drop policy if exists manufacturing_plan_lines_planning_select on public.manufacturing_plan_lines;
drop policy if exists manufacturing_plan_lines_planning_write on public.manufacturing_plan_lines;
drop policy if exists manufacturing_orders_planning_select on public.manufacturing_orders;
drop policy if exists manufacturing_orders_planning_write on public.manufacturing_orders;

create policy manufacturing_plan_lines_planning_select on public.manufacturing_plan_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.view', tenant_id));
create policy manufacturing_plan_lines_planning_write on public.manufacturing_plan_lines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.planning.manage', tenant_id));
create policy manufacturing_orders_planning_select on public.manufacturing_orders for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.orders.view', tenant_id));
create policy manufacturing_orders_planning_write on public.manufacturing_orders for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.orders.manage', tenant_id) or public.has_permission('manufacturing.orders.release', tenant_id) or public.has_permission('manufacturing.orders.close', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.orders.manage', tenant_id) or public.has_permission('manufacturing.orders.release', tenant_id) or public.has_permission('manufacturing.orders.close', tenant_id)));

drop policy if exists event_outbox_manufacturing_planning_select on public.event_outbox;
drop policy if exists event_outbox_manufacturing_planning_insert on public.event_outbox;
create policy event_outbox_manufacturing_planning_select on public.event_outbox for select to authenticated using (is_active = true and deleted_at is null and event_name in ('ManufacturingProductionPlanCreated', 'ManufacturingProductionPlanApproved', 'ManufacturingProductionPlanReleased', 'ManufacturingProductionPlanClosed', 'ManufacturingOrderCreated', 'ManufacturingOrderReleased', 'ManufacturingOrderStarted', 'ManufacturingOrderCompleted', 'ManufacturingOrderClosed', 'ManufacturingOrderCancelled') and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.audit.view', tenant_id));
create policy event_outbox_manufacturing_planning_insert on public.event_outbox for insert to authenticated with check (is_active = true and deleted_at is null and event_name in ('ManufacturingProductionPlanCreated', 'ManufacturingProductionPlanApproved', 'ManufacturingProductionPlanReleased', 'ManufacturingProductionPlanClosed', 'ManufacturingOrderCreated', 'ManufacturingOrderReleased', 'ManufacturingOrderStarted', 'ManufacturingOrderCompleted', 'ManufacturingOrderClosed', 'ManufacturingOrderCancelled') and public.is_tenant_member(tenant_id) and (public.has_permission('manufacturing.planning.manage', tenant_id) or public.has_permission('manufacturing.orders.manage', tenant_id) or public.has_permission('manufacturing.orders.release', tenant_id) or public.has_permission('manufacturing.orders.close', tenant_id)));
