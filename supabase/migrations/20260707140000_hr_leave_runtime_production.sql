-- OP-09: Leave runtime production — balance ledger, carry forward, encashment, approval history.

create type public.hr_leave_balance_movement_kind as enum (
  'entitlement_grant',
  'request_pending',
  'request_approved',
  'request_consumed',
  'request_cancelled',
  'carry_forward_in',
  'carry_forward_expired',
  'encashment',
  'manual_adjustment',
  'negative_balance'
);

create type public.hr_leave_carry_forward_scope as enum (
  'company_closing',
  'policy_closing',
  'employee_anniversary',
  'manual'
);

create type public.hr_leave_encashment_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'cancelled',
  'exported_to_payroll'
);

create type public.hr_leave_approval_event_kind as enum (
  'submitted',
  'withdrawn',
  'returned',
  'approved',
  'rejected',
  'cancelled',
  'escalated',
  'delegated'
);

alter table public.hr_leave_policies
  add column if not exists policy_rules jsonb not null default '{}'::jsonb;

alter table public.hr_leave_balances
  add column if not exists pending_quantity numeric(18, 4) not null default 0,
  add column if not exists consumed_quantity numeric(18, 4) not null default 0,
  add column if not exists carried_forward_quantity numeric(18, 4) not null default 0,
  add column if not exists scheduled_quantity numeric(18, 4) not null default 0,
  add column if not exists expired_quantity numeric(18, 4) not null default 0;

create table public.hr_leave_balance_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  balance_id uuid references public.hr_leave_balances(id) on delete restrict,
  movement_kind public.hr_leave_balance_movement_kind not null,
  quantity numeric(18, 4) not null,
  balance_after numeric(18, 4) not null,
  reference_type text,
  reference_id uuid,
  as_of_date date not null,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_leave_carry_forward_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  scope public.hr_leave_carry_forward_scope not null,
  source_period_end date not null,
  target_period_start date not null,
  employee_count integer not null default 0,
  total_quantity_carried numeric(18, 4) not null default 0,
  status public.hr_leave_record_status not null default 'draft',
  preview_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  executed_at timestamptz,
  executed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (target_period_start > source_period_end),
  check (jsonb_typeof(preview_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_leave_encashment_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  leave_type_id uuid not null references public.hr_leave_types(id) on delete restrict,
  requested_quantity numeric(18, 4) not null check (requested_quantity > 0),
  encashment_kind text not null default 'partial' check (encashment_kind in ('partial', 'full')),
  max_percentage numeric(5, 2),
  status public.hr_leave_encashment_status not null default 'draft',
  payroll_export_flag boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_leave_approval_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  leave_request_id uuid not null references public.hr_leave_requests(id) on delete restrict,
  event_kind public.hr_leave_approval_event_kind not null,
  actor_user_id uuid references auth.users(id),
  reason text,
  approval_level integer not null default 1,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index hr_leave_balance_ledger_employee_idx
  on public.hr_leave_balance_ledger (tenant_id, employee_id, leave_type_id, as_of_date)
  where deleted_at is null;

create index hr_leave_carry_forward_runs_period_idx
  on public.hr_leave_carry_forward_runs (tenant_id, company_id, source_period_end, target_period_start)
  where deleted_at is null;

create index hr_leave_encashment_requests_employee_idx
  on public.hr_leave_encashment_requests (tenant_id, employee_id, status)
  where deleted_at is null;

create index hr_leave_approval_events_request_idx
  on public.hr_leave_approval_events (tenant_id, leave_request_id, created_at)
  where deleted_at is null;

drop trigger if exists hr_leave_balance_ledger_touch_updated_at on public.hr_leave_balance_ledger;
create trigger hr_leave_balance_ledger_touch_updated_at before update on public.hr_leave_balance_ledger for each row execute function public.touch_platform_row();
drop trigger if exists hr_leave_carry_forward_runs_touch_updated_at on public.hr_leave_carry_forward_runs;
create trigger hr_leave_carry_forward_runs_touch_updated_at before update on public.hr_leave_carry_forward_runs for each row execute function public.touch_platform_row();
drop trigger if exists hr_leave_encashment_requests_touch_updated_at on public.hr_leave_encashment_requests;
create trigger hr_leave_encashment_requests_touch_updated_at before update on public.hr_leave_encashment_requests for each row execute function public.touch_platform_row();
drop trigger if exists hr_leave_approval_events_touch_updated_at on public.hr_leave_approval_events;
create trigger hr_leave_approval_events_touch_updated_at before update on public.hr_leave_approval_events for each row execute function public.touch_platform_row();

alter table public.hr_leave_balance_ledger enable row level security;
alter table public.hr_leave_carry_forward_runs enable row level security;
alter table public.hr_leave_encashment_requests enable row level security;
alter table public.hr_leave_approval_events enable row level security;

alter table public.hr_leave_balance_ledger force row level security;
alter table public.hr_leave_carry_forward_runs force row level security;
alter table public.hr_leave_encashment_requests force row level security;
alter table public.hr_leave_approval_events force row level security;

create policy hr_leave_balance_ledger_select on public.hr_leave_balance_ledger for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_balance_ledger_manage on public.hr_leave_balance_ledger for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_leave_carry_forward_runs_select on public.hr_leave_carry_forward_runs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_carry_forward_runs_manage on public.hr_leave_carry_forward_runs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.carry_forward', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.carry_forward', tenant_id));

create policy hr_leave_encashment_requests_select on public.hr_leave_encashment_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_encashment_requests_manage on public.hr_leave_encashment_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.encashment', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.encashment', tenant_id));

create policy hr_leave_approval_events_select on public.hr_leave_approval_events for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.leave.view', tenant_id));
create policy hr_leave_approval_events_manage on public.hr_leave_approval_events for insert to authenticated
  with check (is_active = true and deleted_at is null and (public.has_permission('hr.leave.manage', tenant_id) or public.has_permission('hr.leave.approve', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.leave.carry_forward', 'Execute Leave Carry Forward', 'Allows previewing and executing leave carry-forward runs.', 'critical'),
  ('hr.leave.encashment', 'Manage Leave Encashment', 'Allows creating and approving leave encashment requests.', 'critical'),
  ('hr.leave.reports.view', 'View Leave Reports', 'Allows viewing leave balance, ledger, and liability reports.', 'high'),
  ('hr.leave.calendar.manage', 'Manage Leave Holiday Calendar', 'Allows managing company holiday calendars for leave conflict checks.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.leave.carry_forward',
  'hr.leave.encashment',
  'hr.leave.reports.view',
  'hr.leave.calendar.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
