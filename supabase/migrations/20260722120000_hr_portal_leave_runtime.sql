-- ESS/MSS leave runtime: self-service submit + manager approve/reject via portal RLS.

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.leave.manage_self', 'Submit Own Leave Requests', 'Allows employees to create and submit leave requests for themselves in the self-service portal.', 'standard')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in ('hr.leave.manage_self')
where r.role_key = 'hr-self-service'
  and r.role_scope = 'template'
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;

-- Portal users can read active leave types for request forms.
drop policy if exists hr_leave_types_self_select on public.hr_leave_types;
create policy hr_leave_types_self_select on public.hr_leave_types for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and status = 'active'
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.view_self', tenant_id)
  );

-- ESS: create own leave requests (draft/submitted only).
drop policy if exists hr_leave_requests_self_insert on public.hr_leave_requests;
create policy hr_leave_requests_self_insert on public.hr_leave_requests for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.manage_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_leave_requests.tenant_id
        and e.deleted_at is null
    )
    and status in ('draft', 'submitted')
  );

-- ESS: update own leave requests while pending approval.
drop policy if exists hr_leave_requests_self_update on public.hr_leave_requests;
create policy hr_leave_requests_self_update on public.hr_leave_requests for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.manage_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_leave_requests.tenant_id
        and e.deleted_at is null
    )
    and status in ('draft', 'submitted', 'under_review')
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.manage_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_leave_requests.tenant_id
        and e.deleted_at is null
    )
  );

-- MSS: managers approve or reject direct-report leave requests.
drop policy if exists hr_leave_requests_manager_update on public.hr_leave_requests;
create policy hr_leave_requests_manager_update on public.hr_leave_requests for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.approve', tenant_id)
    and employee_id in (select public.hr_auth_manager_team_employee_ids(tenant_id))
    and status in ('submitted', 'under_review')
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.approve', tenant_id)
    and employee_id in (select public.hr_auth_manager_team_employee_ids(tenant_id))
  );
