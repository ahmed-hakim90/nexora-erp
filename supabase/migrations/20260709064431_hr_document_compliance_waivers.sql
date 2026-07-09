-- HR document compliance waivers: per-employee exceptions for required document kinds.

create table if not exists public.hr_document_compliance_waivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  document_kind public.hr_required_document_kind not null,
  reason text not null,
  effective_from date not null default current_date,
  effective_to date,
  status public.hr_template_status not null default 'active',
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoke_reason text,
  metadata jsonb not null default jsonb_build_object(
    'document_compliance_waiver_runtime_implemented', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(reason)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists hr_document_compliance_waivers_active_uq
  on public.hr_document_compliance_waivers (tenant_id, company_id, employee_id, document_kind)
  where deleted_at is null and status = 'active' and revoked_at is null;

create index if not exists hr_document_compliance_waivers_employee_idx
  on public.hr_document_compliance_waivers (tenant_id, company_id, employee_id, status)
  where deleted_at is null;

drop trigger if exists hr_document_compliance_waivers_touch_updated_at on public.hr_document_compliance_waivers;
create trigger hr_document_compliance_waivers_touch_updated_at
  before update on public.hr_document_compliance_waivers
  for each row execute function public.touch_platform_row();

alter table public.hr_document_compliance_waivers enable row level security;
alter table public.hr_document_compliance_waivers force row level security;

drop policy if exists hr_document_compliance_waivers_select on public.hr_document_compliance_waivers;
create policy hr_document_compliance_waivers_select on public.hr_document_compliance_waivers for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.employees.view', tenant_id)
  );

drop policy if exists hr_document_compliance_waivers_manage on public.hr_document_compliance_waivers;
create policy hr_document_compliance_waivers_manage on public.hr_document_compliance_waivers for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id));
