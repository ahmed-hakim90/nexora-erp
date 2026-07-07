-- HR operator in-app notifications for expiry scans and production readiness runtime.

create table public.hr_operator_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  event_key text not null,
  severity text not null check (severity in ('info', 'warning', 'error')),
  title text not null,
  body text not null,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  entity_type text,
  entity_id uuid,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(event_key)) > 0),
  check (length(trim(title)) > 0),
  check (length(trim(body)) > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_operator_notifications_idempotency_uq
  on public.hr_operator_notifications (tenant_id, idempotency_key)
  where deleted_at is null;

create index hr_operator_notifications_status_idx
  on public.hr_operator_notifications (tenant_id, company_id, status, created_at desc)
  where deleted_at is null;

create index hr_operator_notifications_employee_idx
  on public.hr_operator_notifications (tenant_id, employee_id, created_at desc)
  where deleted_at is null and employee_id is not null;

alter table public.hr_operator_notifications enable row level security;
alter table public.hr_operator_notifications force row level security;

create policy hr_operator_notifications_select on public.hr_operator_notifications for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.view', tenant_id)
  );

create policy hr_operator_notifications_insert on public.hr_operator_notifications for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.view', tenant_id)
  );

create policy hr_operator_notifications_update on public.hr_operator_notifications for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.view', tenant_id)
  )
  with check (
    is_active = true
    and deleted_at is null
    and public.has_permission('hr.view', tenant_id)
  );
