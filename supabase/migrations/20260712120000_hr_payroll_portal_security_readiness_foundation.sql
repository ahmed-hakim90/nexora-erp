-- HR Payroll Portal & Security Readiness Foundation.
-- Builds on Sprint 18 payslip publishing. Contracts only; no UI or auth rewrite.

do $$
begin
  create type public.hr_payroll_secure_access_token_kind as enum ('portal_session', 'temporary_access', 'download_authorization');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_secure_access_token_status as enum ('active', 'expired', 'revoked', 'consumed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_sensitive_field_classification as enum ('public_summary', 'employee_self', 'manager_redacted', 'payroll_admin_only', 'restricted_pii');
exception
  when duplicate_object then null;
end $$;

create table public.hr_payroll_secure_access_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  payslip_id uuid not null references public.hr_payslips(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  token_kind public.hr_payroll_secure_access_token_kind not null default 'portal_session',
  token_status public.hr_payroll_secure_access_token_status not null default 'active',
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  metadata jsonb not null default jsonb_build_object(
    'portal_security_readiness_foundation_only', true,
    'extends_sprint18_secure_access', true,
    'auth_runtime_implemented', false,
    'download_authorization_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null),
  check (token_status <> 'revoked' or revoked_by is not null)
);

create table public.hr_payroll_sensitive_field_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  field_key text not null,
  entity_name text not null check (entity_name in ('payslip', 'payroll_result', 'payroll_result_component')),
  classification public.hr_payroll_sensitive_field_classification not null,
  visible_to_employee_self boolean not null default false,
  visible_to_manager boolean not null default false,
  visible_to_payroll_admin boolean not null default true,
  masking_required boolean not null default false,
  metadata jsonb not null default jsonb_build_object(
    'portal_security_readiness_foundation_only', true,
    'ess_mss_ui_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(field_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_sensitive_field_registry_field_uq
  on public.hr_payroll_sensitive_field_registry (tenant_id, company_id, entity_name, field_key)
  where deleted_at is null;

create index hr_payroll_secure_access_tokens_payslip_idx
  on public.hr_payroll_secure_access_tokens (tenant_id, payslip_id, token_status)
  where deleted_at is null;

create index hr_payroll_secure_access_tokens_employee_idx
  on public.hr_payroll_secure_access_tokens (tenant_id, employee_id, token_kind, token_status)
  where deleted_at is null;

drop trigger if exists hr_payroll_secure_access_tokens_touch_updated_at on public.hr_payroll_secure_access_tokens;
create trigger hr_payroll_secure_access_tokens_touch_updated_at before update on public.hr_payroll_secure_access_tokens for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_sensitive_field_registry_touch_updated_at on public.hr_payroll_sensitive_field_registry;
create trigger hr_payroll_sensitive_field_registry_touch_updated_at before update on public.hr_payroll_sensitive_field_registry for each row execute function public.touch_platform_row();

alter table public.hr_payroll_secure_access_tokens enable row level security;
alter table public.hr_payroll_sensitive_field_registry enable row level security;

alter table public.hr_payroll_secure_access_tokens force row level security;
alter table public.hr_payroll_sensitive_field_registry force row level security;

create policy hr_payroll_portal_security_select on public.hr_payroll_sensitive_field_registry for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.portal.security.view', tenant_id));

create policy hr_payroll_portal_security_manage on public.hr_payroll_sensitive_field_registry for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.portal.security.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.portal.security.manage', tenant_id));

create policy hr_payroll_secure_access_tokens_self on public.hr_payroll_secure_access_tokens for select to authenticated
  using (
    is_active = true and deleted_at is null and token_status = 'active'
    and public.has_permission('hr.payslips.view_self', tenant_id)
    and employee_id in (
      select e.id from public.hr_employees e
      where e.user_id = auth.uid() and e.tenant_id = hr_payroll_secure_access_tokens.tenant_id and e.deleted_at is null
    )
  );

create policy hr_payroll_secure_access_tokens_download on public.hr_payroll_secure_access_tokens for select to authenticated
  using (
    is_active = true and deleted_at is null and token_status = 'active'
    and token_kind = 'download_authorization'
    and public.has_permission('hr.payslips.download.authorize', tenant_id)
    and employee_id in (
      select e.id from public.hr_employees e
      where e.user_id = auth.uid() and e.tenant_id = hr_payroll_secure_access_tokens.tenant_id and e.deleted_at is null
    )
  );

create policy hr_payroll_secure_access_tokens_revoke on public.hr_payroll_secure_access_tokens for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payslips.access.revoke', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payslips.access.revoke', tenant_id));
