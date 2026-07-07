-- Harden hr_operator_notifications RLS: restrict inserts/updates to HR managers.

drop policy if exists hr_operator_notifications_insert on public.hr_operator_notifications;
drop policy if exists hr_operator_notifications_update on public.hr_operator_notifications;

create policy hr_operator_notifications_insert on public.hr_operator_notifications for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.manage', tenant_id)
  );

create policy hr_operator_notifications_update on public.hr_operator_notifications for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.manage', tenant_id)
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.manage', tenant_id)
  );
