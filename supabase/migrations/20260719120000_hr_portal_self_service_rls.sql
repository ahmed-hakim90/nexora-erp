-- HR Portal self-service RLS: ESS reads own data via portal permissions (not operator HR roles).
-- MSS manager team scope policies for direct-report assignment rows.

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.employees.view_self', 'View Own Employee Record', 'Allows employees to view their own identity record in the self-service portal.', 'standard'),
  ('hr.employment_profiles.view_self', 'View Own Employment Profile', 'Allows employees to view their own employment profile in the self-service portal.', 'standard'),
  ('hr.leave.view_self', 'View Own Leave', 'Allows employees to view their own leave requests and balances in the self-service portal.', 'standard'),
  ('hr.attendance.view_self', 'View Own Attendance', 'Allows employees to view their own attendance records in the self-service portal.', 'standard'),
  ('hr.documents.view_self', 'View Own HR Documents', 'Allows employees to view their own HR document attachments in the self-service portal.', 'standard'),
  ('hr.requests.view_self', 'View Own HR Requests', 'Allows employees to view their own HR service requests in the self-service portal.', 'standard')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'platform.portal.access',
  'hr.employees.view_self',
  'hr.employment_profiles.view_self',
  'hr.leave.view_self',
  'hr.attendance.view_self',
  'hr.documents.view_self',
  'hr.requests.view_self',
  'hr.payslips.view_self'
)
where r.role_key = 'hr-self-service'
  and r.role_scope = 'template'
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;

-- ESS: own employee identity
create policy hr_employees_self_select on public.hr_employees for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.employees.view_self', tenant_id)
    and id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_employees.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: own employment profile
create policy hr_employment_profiles_self_select on public.hr_employment_profiles for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.employment_profiles.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_employment_profiles.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: leave (fix prior policy that required operator hr.leave.view)
drop policy if exists hr_leave_requests_self_select on public.hr_leave_requests;
create policy hr_leave_requests_self_select on public.hr_leave_requests for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_leave_requests.tenant_id
        and e.deleted_at is null
    )
  );

create policy hr_leave_balances_self_select on public.hr_leave_balances for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_leave_balances.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: attendance days
create policy hr_attendance_days_self_select on public.hr_attendance_days for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.attendance.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_attendance_days.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: HR service requests
create policy hr_action_documents_self_select on public.hr_action_documents for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.requests.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_action_documents.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: own HR document attachments
create policy file_attachments_hr_documents_self_select on public.file_attachments for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and module_key = 'hr'
    and entity_type = 'hr_employee_document'
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.documents.view_self', tenant_id)
    and entity_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = file_attachments.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: payslip periods linked to published payslips
create policy hr_payroll_periods_self_select on public.hr_payroll_periods for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and id in (
      select pub.payroll_period_id
      from public.hr_payslip_publications pub
      join public.hr_employees e on e.id = pub.employee_id
      where pub.publishing_status = 'published'
        and pub.deleted_at is null
        and pub.is_active = true
        and e.user_id = auth.uid()
        and e.tenant_id = hr_payroll_periods.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: payslips (portal users do not require HR app access)
drop policy if exists hr_payslips_self_select on public.hr_payslips;
create policy hr_payslips_self_select on public.hr_payslips for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and (
      public.has_permission('platform.portal.access', tenant_id)
      or (
        public.has_app_access(tenant_id, 'hr')
        and public.has_company_access(tenant_id, company_id)
        and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
      )
    )
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_payslips.tenant_id
        and e.deleted_at is null
    )
  );

-- ESS: payslip publications (portal users do not require HR app access)
drop policy if exists hr_payslip_publications_self_select on public.hr_payslip_publications;
create policy hr_payslip_publications_self_select on public.hr_payslip_publications for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and publishing_status = 'published'
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and (
      public.has_permission('platform.portal.access', tenant_id)
      or (
        public.has_app_access(tenant_id, 'hr')
        and public.has_company_access(tenant_id, company_id)
        and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
      )
    )
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_payslip_publications.tenant_id
        and e.deleted_at is null
    )
  );

-- MSS: manager reads direct-report employees via assignment engine manager rows
create policy hr_employees_manager_team_select on public.hr_employees for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.approve', tenant_id)
    and id in (
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
        and mgr.tenant_id = hr_employees.tenant_id
        and mgr.deleted_at is null
    )
  );

-- MSS: manager reads direct-report leave requests
create policy hr_leave_requests_manager_select on public.hr_leave_requests for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('platform.portal.access', tenant_id)
    and public.has_permission('hr.leave.approve', tenant_id)
    and employee_id in (
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
        and mgr.tenant_id = hr_leave_requests.tenant_id
        and mgr.deleted_at is null
    )
  );
