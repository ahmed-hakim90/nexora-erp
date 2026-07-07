-- Fix infinite recursion in hr_employees RLS policies from portal self-service migration.
-- hr_employees_self_select must not subquery hr_employees; manager team scope uses a definer helper.

create or replace function public.hr_auth_manager_team_employee_ids(p_tenant_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select a.employee_id
  from public.hr_assignments a
  join public.hr_employees mgr on mgr.id = a.reference_entity_id
  where a.assignment_type = 'manager'
    and a.reference_entity_type = 'hr_employees'
    and a.assignment_status in ('active', 'planned')
    and a.deleted_at is null
    and a.is_active = true
    and a.effective_from <= current_date
    and (a.effective_to is null or a.effective_to >= current_date)
    and mgr.user_id = auth.uid()
    and mgr.tenant_id = p_tenant_id
    and mgr.deleted_at is null;
$$;

revoke all on function public.hr_auth_manager_team_employee_ids(uuid) from public;
grant execute on function public.hr_auth_manager_team_employee_ids(uuid) to authenticated;

drop policy if exists hr_employees_self_select on public.hr_employees;
create policy hr_employees_self_select on public.hr_employees for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and user_id is not null
    and user_id = auth.uid()
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.employees.view_self', tenant_id)
  );

drop policy if exists hr_employees_manager_team_select on public.hr_employees;
create policy hr_employees_manager_team_select on public.hr_employees for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.approve', tenant_id)
    and id in (select public.hr_auth_manager_team_employee_ids(tenant_id))
  );
