-- Nexora HR Payslip Publishing & Employee Payroll Portal Foundation.
-- Exposes approved payroll to employees through auditable publishing contracts.
-- No PDF rendering, email, SMS, WhatsApp, mobile app, ESS UI, or localization.

create type public.hr_payslip_publishing_status as enum (
  'draft',
  'generated',
  'pending_publish',
  'published',
  'unpublished',
  'archived'
);

create type public.hr_payslip_publication_scope as enum (
  'single_employee',
  'payroll_group',
  'payroll_run'
);

create type public.hr_payslip_publication_action as enum (
  'publish',
  'republish',
  'unpublish',
  'revoke'
);

create type public.hr_payslip_secure_access_mode as enum (
  'portal_session',
  'temporary_access',
  'download_authorization'
);

alter type public.hr_payroll_runtime_payslip_status add value if not exists 'pending_publish';
alter type public.hr_payroll_runtime_payslip_status add value if not exists 'unpublished';
alter type public.hr_payroll_runtime_payslip_status add value if not exists 'archived';

create table public.hr_payslip_publications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payslip_id uuid not null references public.hr_payslips(id) on delete restrict,
  payroll_run_id uuid references public.hr_payroll_runs(id) on delete restrict,
  payroll_period_id uuid references public.hr_payroll_periods(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  publication_scope public.hr_payslip_publication_scope not null default 'single_employee',
  publication_action public.hr_payslip_publication_action not null default 'publish',
  publishing_status public.hr_payslip_publishing_status not null default 'draft',
  correlation_id text not null,
  payroll_approved boolean not null default false,
  validation_passed boolean not null default false,
  blocking_exceptions_cleared boolean not null default false,
  payslip_generated boolean not null default false,
  employee_active boolean not null default true,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  viewed_at timestamptz,
  downloaded_at timestamptz,
  metadata jsonb not null default jsonb_build_object(
    'publishing_foundation_only', true,
    'publishing_runtime_implemented', false,
    'pdf_rendering_implemented', false,
    'email_delivery_implemented', false,
    'employee_portal_ui_implemented', false,
    'published_payroll_only', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (
    publishing_status <> 'published'
    or published_by is not null
  ),
  check (
    publishing_status <> 'unpublished'
    or revoked_by is not null
  )
);

create table public.hr_employee_payroll_portal_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  user_id uuid references auth.users(id),
  portal_enabled boolean not null default true,
  preferred_language text,
  notification_preferences jsonb not null default '{}'::jsonb,
  secure_access_preferences jsonb not null default jsonb_build_object(
    'portal_session_readiness', true,
    'temporary_access_readiness', true,
    'download_authorization_readiness', true,
    'revocation_readiness', true,
    'auth_runtime_implemented', false
  ),
  metadata jsonb not null default jsonb_build_object(
    'portal_foundation_only', true,
    'employee_portal_ui_implemented', false,
    'consumes_published_payroll_only', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(notification_preferences) = 'object'),
  check (jsonb_typeof(secure_access_preferences) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_employee_payroll_portal_preferences_employee_uq
  on public.hr_employee_payroll_portal_preferences (tenant_id, company_id, employee_id)
  where deleted_at is null;

create index hr_payslip_publications_payslip_idx
  on public.hr_payslip_publications (tenant_id, payslip_id, publishing_status, published_at desc)
  where deleted_at is null;

create index hr_payslip_publications_run_idx
  on public.hr_payslip_publications (tenant_id, payroll_run_id, publication_scope, publishing_status)
  where deleted_at is null;

create index hr_payslip_publications_employee_idx
  on public.hr_payslip_publications (tenant_id, employee_id, publishing_status, published_at desc)
  where deleted_at is null;

create index hr_payslip_publications_correlation_idx
  on public.hr_payslip_publications (tenant_id, correlation_id, publication_action)
  where deleted_at is null;

drop trigger if exists hr_payslip_publications_touch_updated_at on public.hr_payslip_publications;
create trigger hr_payslip_publications_touch_updated_at before update on public.hr_payslip_publications for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_payroll_portal_preferences_touch_updated_at on public.hr_employee_payroll_portal_preferences;
create trigger hr_employee_payroll_portal_preferences_touch_updated_at before update on public.hr_employee_payroll_portal_preferences for each row execute function public.touch_platform_row();

alter table public.hr_payslip_publications enable row level security;
alter table public.hr_employee_payroll_portal_preferences enable row level security;

alter table public.hr_payslip_publications force row level security;
alter table public.hr_employee_payroll_portal_preferences force row level security;

create policy hr_payslip_publications_admin_select on public.hr_payslip_publications for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.payslips.view', tenant_id)
  );

create policy hr_payslip_publications_publish on public.hr_payslip_publications for all to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.publish', tenant_id)
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.publish', tenant_id)
  );

create policy hr_payslip_publications_unpublish on public.hr_payslip_publications for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.unpublish', tenant_id)
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.unpublish', tenant_id)
  );

create policy hr_payslip_publications_audit_select on public.hr_payslip_publications for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.audit.view', tenant_id)
  );

create policy hr_payslip_publications_self_select on public.hr_payslip_publications for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and publishing_status = 'published'
    and public.has_app_access(tenant_id, 'hr')
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_payslip_publications.tenant_id
        and e.deleted_at is null
    )
  );

create policy hr_employee_payroll_portal_preferences_admin_select on public.hr_employee_payroll_portal_preferences for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.payslips.view', tenant_id)
  );

create policy hr_employee_payroll_portal_preferences_self_select on public.hr_employee_payroll_portal_preferences for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_employee_payroll_portal_preferences.tenant_id
        and e.deleted_at is null
    )
  );

create policy hr_employee_payroll_portal_preferences_self_manage on public.hr_employee_payroll_portal_preferences for all to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_employee_payroll_portal_preferences.tenant_id
        and e.deleted_at is null
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id
      from public.hr_employees e
      where e.user_id = auth.uid()
        and e.tenant_id = hr_employee_payroll_portal_preferences.tenant_id
        and e.deleted_at is null
    )
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.payslips.unpublish', 'Unpublish Payslips', 'Allows unpublishing or revoking published payslip foundation records.', 'critical'),
  ('hr.payslips.audit.view', 'View Payslip Publishing Audit', 'Allows viewing payslip publishing audit and history records.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.payslips.unpublish',
  'hr.payslips.audit.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
