-- Manufacturing Sprint 2: Factory structure and machine model only.
-- No production execution runtime, inventory posting, costing, quality execution, payroll logic, or warehouse/location ownership.

alter table public.manufacturing_lines add column if not exists code text;
alter table public.manufacturing_work_centers add column if not exists code text;
alter table public.manufacturing_workstations add column if not exists code text;
alter table public.manufacturing_machines add column if not exists code text;

update public.manufacturing_lines set code = coalesce(code, line_key) where code is null;
update public.manufacturing_work_centers set code = coalesce(code, work_center_key) where code is null;
update public.manufacturing_workstations set code = coalesce(code, workstation_key) where code is null;
update public.manufacturing_machines set code = coalesce(code, machine_key) where code is null;

alter table public.manufacturing_lines alter column code set not null;
alter table public.manufacturing_work_centers alter column code set not null;
alter table public.manufacturing_workstations alter column code set not null;
alter table public.manufacturing_machines alter column code set not null;

alter table public.manufacturing_machines add column if not exists capability_metadata jsonb not null default jsonb_build_object(
  'capability_keys', jsonb_build_array(),
  'supported_operation_keys', jsonb_build_array(),
  'machine_hour_fact_ready', true,
  'downtime_fact_contract_ready', true,
  'cost_calculation_implemented', false
);
alter table public.manufacturing_machines add column if not exists operational_status_metadata jsonb not null default jsonb_build_object(
  'maintenance_readiness_only', true,
  'maintenance_app_implemented', false,
  'production_execution_runtime_implemented', false
);

update public.manufacturing_lines set status = 'inactive' where status not in ('active', 'inactive', 'maintenance', 'suspended', 'archived');
update public.manufacturing_work_centers set status = 'inactive' where status not in ('active', 'inactive', 'suspended', 'archived');
update public.manufacturing_workstations set status = 'inactive' where status not in ('active', 'inactive', 'unavailable', 'archived');
update public.manufacturing_machines set status = 'unavailable' where status not in ('available', 'running', 'idle', 'maintenance', 'breakdown', 'unavailable', 'archived');

alter table public.manufacturing_lines drop constraint if exists manufacturing_lines_status_check;
alter table public.manufacturing_lines add constraint manufacturing_lines_status_check check (status in ('active', 'inactive', 'maintenance', 'suspended', 'archived'));
alter table public.manufacturing_work_centers drop constraint if exists manufacturing_work_centers_status_check;
alter table public.manufacturing_work_centers add constraint manufacturing_work_centers_status_check check (status in ('active', 'inactive', 'suspended', 'archived'));
alter table public.manufacturing_workstations drop constraint if exists manufacturing_workstations_status_check;
alter table public.manufacturing_workstations add constraint manufacturing_workstations_status_check check (status in ('active', 'inactive', 'unavailable', 'archived'));
alter table public.manufacturing_machines drop constraint if exists manufacturing_machines_status_check;
alter table public.manufacturing_machines add constraint manufacturing_machines_status_check check (status in ('available', 'running', 'idle', 'maintenance', 'breakdown', 'unavailable', 'archived'));

alter table public.manufacturing_lines drop constraint if exists manufacturing_lines_code_check;
alter table public.manufacturing_lines add constraint manufacturing_lines_code_check check (code = lower(code) and length(trim(code)) > 0);
alter table public.manufacturing_work_centers drop constraint if exists manufacturing_work_centers_code_check;
alter table public.manufacturing_work_centers add constraint manufacturing_work_centers_code_check check (code = lower(code) and length(trim(code)) > 0);
alter table public.manufacturing_workstations drop constraint if exists manufacturing_workstations_code_check;
alter table public.manufacturing_workstations add constraint manufacturing_workstations_code_check check (code = lower(code) and length(trim(code)) > 0);
alter table public.manufacturing_machines drop constraint if exists manufacturing_machines_code_check;
alter table public.manufacturing_machines add constraint manufacturing_machines_code_check check (code = lower(code) and length(trim(code)) > 0);

alter table public.manufacturing_machines drop constraint if exists manufacturing_machines_capability_metadata_check;
alter table public.manufacturing_machines add constraint manufacturing_machines_capability_metadata_check check (
  jsonb_typeof(capability_metadata) = 'object'
  and coalesce((capability_metadata ->> 'machine_hour_fact_ready')::boolean, false) = true
  and coalesce((capability_metadata ->> 'downtime_fact_contract_ready')::boolean, false) = true
  and coalesce((capability_metadata ->> 'cost_calculation_implemented')::boolean, true) = false
);
alter table public.manufacturing_machines drop constraint if exists manufacturing_machines_operational_status_metadata_check;
alter table public.manufacturing_machines add constraint manufacturing_machines_operational_status_metadata_check check (
  jsonb_typeof(operational_status_metadata) = 'object'
  and coalesce((operational_status_metadata ->> 'maintenance_readiness_only')::boolean, false) = true
  and coalesce((operational_status_metadata ->> 'maintenance_app_implemented')::boolean, true) = false
  and coalesce((operational_status_metadata ->> 'production_execution_runtime_implemented')::boolean, true) = false
);

create unique index if not exists manufacturing_lines_scope_code_uq on public.manufacturing_lines (tenant_id, company_id, branch_id, code) where deleted_at is null;
create unique index if not exists manufacturing_work_centers_scope_code_uq on public.manufacturing_work_centers (tenant_id, company_id, branch_id, code) where deleted_at is null;
create unique index if not exists manufacturing_workstations_scope_code_uq on public.manufacturing_workstations (tenant_id, company_id, branch_id, code) where deleted_at is null;
create unique index if not exists manufacturing_machines_scope_code_uq on public.manufacturing_machines (tenant_id, company_id, branch_id, code) where deleted_at is null;
create index if not exists manufacturing_lines_branch_status_idx on public.manufacturing_lines (tenant_id, company_id, branch_id, status, id) where deleted_at is null;
create index if not exists manufacturing_work_centers_branch_status_idx on public.manufacturing_work_centers (tenant_id, company_id, branch_id, status, id) where deleted_at is null;
create index if not exists manufacturing_workstations_hierarchy_idx on public.manufacturing_workstations (tenant_id, company_id, branch_id, work_center_id, line_id, status, id) where deleted_at is null;
create index if not exists manufacturing_machines_hierarchy_idx on public.manufacturing_machines (tenant_id, company_id, branch_id, work_center_id, workstation_id, status, id) where deleted_at is null;

create or replace function public.enforce_manufacturing_factory_structure_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_record record;
begin
  if new.branch_id is null then
    raise exception 'manufacturing factory structure requires branch scope';
  end if;

  if tg_table_name = 'manufacturing_lines' and new.work_center_id is not null then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_work_centers where id = new.work_center_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'manufacturing production line must match work center tenant, company, and branch scope';
    end if;
  elsif tg_table_name = 'manufacturing_workstations' then
    select tenant_id, company_id, branch_id into parent_record from public.manufacturing_work_centers where id = new.work_center_id and deleted_at is null;
    if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
      raise exception 'manufacturing workstation must match work center tenant, company, and branch scope';
    end if;
    if new.line_id is not null then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_lines where id = new.line_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing workstation must match production line tenant, company, and branch scope';
      end if;
    end if;
  elsif tg_table_name = 'manufacturing_machines' then
    if new.work_center_id is not null then
      select tenant_id, company_id, branch_id into parent_record from public.manufacturing_work_centers where id = new.work_center_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing machine must match work center tenant, company, and branch scope';
      end if;
    end if;
    if new.workstation_id is not null then
      select tenant_id, company_id, branch_id, work_center_id into parent_record from public.manufacturing_workstations where id = new.workstation_id and deleted_at is null;
      if parent_record.tenant_id <> new.tenant_id or parent_record.company_id <> new.company_id or parent_record.branch_id <> new.branch_id then
        raise exception 'manufacturing machine must match workstation tenant, company, and branch scope';
      end if;
      if new.work_center_id is not null and parent_record.work_center_id <> new.work_center_id then
        raise exception 'manufacturing machine workstation must belong to selected work center';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists manufacturing_lines_factory_structure_scope on public.manufacturing_lines;
create trigger manufacturing_lines_factory_structure_scope before insert or update on public.manufacturing_lines for each row execute function public.enforce_manufacturing_factory_structure_scope();
drop trigger if exists manufacturing_workstations_factory_structure_scope on public.manufacturing_workstations;
create trigger manufacturing_workstations_factory_structure_scope before insert or update on public.manufacturing_workstations for each row execute function public.enforce_manufacturing_factory_structure_scope();
drop trigger if exists manufacturing_machines_factory_structure_scope on public.manufacturing_machines;
create trigger manufacturing_machines_factory_structure_scope before insert or update on public.manufacturing_machines for each row execute function public.enforce_manufacturing_factory_structure_scope();

drop policy if exists manufacturing_lines_structure_select on public.manufacturing_lines;
drop policy if exists manufacturing_lines_structure_write on public.manufacturing_lines;
drop policy if exists manufacturing_work_centers_structure_select on public.manufacturing_work_centers;
drop policy if exists manufacturing_work_centers_structure_write on public.manufacturing_work_centers;
drop policy if exists manufacturing_workstations_structure_select on public.manufacturing_workstations;
drop policy if exists manufacturing_workstations_structure_write on public.manufacturing_workstations;
drop policy if exists manufacturing_machines_structure_select on public.manufacturing_machines;
drop policy if exists manufacturing_machines_structure_write on public.manufacturing_machines;

create policy manufacturing_lines_structure_select on public.manufacturing_lines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.view', tenant_id));
create policy manufacturing_lines_structure_write on public.manufacturing_lines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.lines.manage', tenant_id));
create policy manufacturing_work_centers_structure_select on public.manufacturing_work_centers for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.view', tenant_id));
create policy manufacturing_work_centers_structure_write on public.manufacturing_work_centers for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.work-centers.manage', tenant_id));
create policy manufacturing_workstations_structure_select on public.manufacturing_workstations for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.view', tenant_id));
create policy manufacturing_workstations_structure_write on public.manufacturing_workstations for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.workstations.manage', tenant_id));
create policy manufacturing_machines_structure_select on public.manufacturing_machines for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.view', tenant_id));
create policy manufacturing_machines_structure_write on public.manufacturing_machines for all to authenticated using (deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('manufacturing.machines.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('manufacturing.lines.view', 'View Manufacturing Production Lines', 'View branch-scoped production line structure.', 'low'),
  ('manufacturing.lines.manage', 'Manage Manufacturing Production Lines', 'Manage branch-scoped production line structure without execution runtime.', 'standard'),
  ('manufacturing.work-centers.view', 'View Manufacturing Work Centers', 'View branch-scoped work center structure.', 'low'),
  ('manufacturing.work-centers.manage', 'Manage Manufacturing Work Centers', 'Manage branch-scoped work center structure without warehouse/location ownership.', 'standard'),
  ('manufacturing.workstations.view', 'View Manufacturing Workstations', 'View branch-scoped workstation structure.', 'low'),
  ('manufacturing.workstations.manage', 'Manage Manufacturing Workstations', 'Manage branch-scoped workstation structure without inventory location ownership.', 'standard'),
  ('manufacturing.machines.view', 'View Manufacturing Machines', 'View machine capability and operational status metadata.', 'low'),
  ('manufacturing.machines.manage', 'Manage Manufacturing Machines', 'Manage machine capability and operational status metadata without maintenance runtime.', 'standard')
on conflict (permission_key) where deleted_at is null do update
set
  label = excluded.label,
  description = excluded.description,
  risk_level = excluded.risk_level,
  updated_at = now();
