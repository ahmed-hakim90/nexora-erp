-- OP-11: Late/Early runtime production — policies, violations, ledger, approval events, payroll input reader.

do $$ begin
  create type public.hr_late_early_violation_kind as enum (
    'late',
    'early_leave',
    'repeated_late',
    'repeated_early',
    'excessive_delay',
    'critical_delay',
    'habitual_late',
    'habitual_early'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_late_early_violation_status as enum (
    'draft',
    'submitted',
    'warning_only',
    'approved',
    'rejected',
    'cancelled',
    'exported_to_payroll'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_late_early_approval_event_kind as enum (
    'evaluated',
    'submitted',
    'returned',
    'approved',
    'rejected',
    'cancelled',
    'overridden',
    'exported_to_payroll'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_late_early_assignment_scope as enum (
    'company',
    'branch',
    'department',
    'shift',
    'contract',
    'employee'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.hr_late_early_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  effective_from date not null,
  effective_to date,
  grace_minutes integer not null default 15 check (grace_minutes >= 0),
  late_threshold_minutes integer not null default 1 check (late_threshold_minutes >= 0),
  early_leave_threshold_minutes integer not null default 1 check (early_leave_threshold_minutes >= 0),
  monthly_limit_minutes integer check (monthly_limit_minutes is null or monthly_limit_minutes > 0),
  weekly_limit_minutes integer check (weekly_limit_minutes is null or weekly_limit_minutes > 0),
  daily_limit_minutes integer check (daily_limit_minutes is null or daily_limit_minutes > 0),
  policy_rules jsonb not null default '{}'::jsonb,
  status public.hr_leave_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(policy_rules) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_late_early_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  policy_id uuid not null references public.hr_late_early_policies(id) on delete restrict,
  assignment_scope public.hr_late_early_assignment_scope not null default 'company',
  reference_entity_id uuid,
  effective_from date not null,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
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

create table if not exists public.hr_late_early_violations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  attendance_day_id uuid not null references public.hr_attendance_days(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  policy_id uuid references public.hr_late_early_policies(id) on delete restrict,
  work_date date not null,
  violation_kind public.hr_late_early_violation_kind not null,
  late_minutes integer not null default 0 check (late_minutes >= 0),
  early_leave_minutes integer not null default 0 check (early_leave_minutes >= 0),
  deduction_minutes integer not null default 0 check (deduction_minutes >= 0),
  grace_applied_minutes integer not null default 0 check (grace_applied_minutes >= 0),
  status public.hr_late_early_violation_status not null default 'submitted',
  payroll_export_flag boolean not null default false,
  evaluation_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(evaluation_payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_late_early_violation_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  violation_id uuid not null references public.hr_late_early_violations(id) on delete restrict,
  movement_kind text not null,
  late_minutes_delta integer not null default 0,
  early_leave_minutes_delta integer not null default 0,
  deduction_minutes_delta integer not null default 0,
  as_of_date date not null,
  metadata jsonb not null default '{}'::jsonb,
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

create table if not exists public.hr_late_early_approval_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  violation_id uuid not null references public.hr_late_early_violations(id) on delete restrict,
  event_kind public.hr_late_early_approval_event_kind not null,
  actor_user_id uuid references auth.users(id),
  reason text,
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

create index if not exists hr_late_early_policies_active_idx
  on public.hr_late_early_policies (tenant_id, company_id, effective_from, effective_to)
  where deleted_at is null and status = 'active';

create index if not exists hr_late_early_violations_employee_idx
  on public.hr_late_early_violations (tenant_id, employee_id, work_date, status)
  where deleted_at is null;

create index if not exists hr_late_early_violations_day_idx
  on public.hr_late_early_violations (tenant_id, attendance_day_id)
  where deleted_at is null;

create index if not exists hr_late_early_violation_ledger_employee_idx
  on public.hr_late_early_violation_ledger (tenant_id, employee_id, as_of_date)
  where deleted_at is null;

create index if not exists hr_late_early_approval_events_violation_idx
  on public.hr_late_early_approval_events (tenant_id, violation_id, created_at)
  where deleted_at is null;

drop trigger if exists hr_late_early_policies_touch_updated_at on public.hr_late_early_policies;
create trigger hr_late_early_policies_touch_updated_at before update on public.hr_late_early_policies for each row execute function public.touch_platform_row();
drop trigger if exists hr_late_early_policy_assignments_touch_updated_at on public.hr_late_early_policy_assignments;
create trigger hr_late_early_policy_assignments_touch_updated_at before update on public.hr_late_early_policy_assignments for each row execute function public.touch_platform_row();
drop trigger if exists hr_late_early_violations_touch_updated_at on public.hr_late_early_violations;
create trigger hr_late_early_violations_touch_updated_at before update on public.hr_late_early_violations for each row execute function public.touch_platform_row();
drop trigger if exists hr_late_early_violation_ledger_touch_updated_at on public.hr_late_early_violation_ledger;
create trigger hr_late_early_violation_ledger_touch_updated_at before update on public.hr_late_early_violation_ledger for each row execute function public.touch_platform_row();
drop trigger if exists hr_late_early_approval_events_touch_updated_at on public.hr_late_early_approval_events;
create trigger hr_late_early_approval_events_touch_updated_at before update on public.hr_late_early_approval_events for each row execute function public.touch_platform_row();

alter table public.hr_late_early_policies enable row level security;
alter table public.hr_late_early_policy_assignments enable row level security;
alter table public.hr_late_early_violations enable row level security;
alter table public.hr_late_early_violation_ledger enable row level security;
alter table public.hr_late_early_approval_events enable row level security;

alter table public.hr_late_early_policies force row level security;
alter table public.hr_late_early_policy_assignments force row level security;
alter table public.hr_late_early_violations force row level security;
alter table public.hr_late_early_violation_ledger force row level security;
alter table public.hr_late_early_approval_events force row level security;

create policy hr_late_early_policies_select on public.hr_late_early_policies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.late.view', tenant_id));
create policy hr_late_early_policies_manage on public.hr_late_early_policies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.late.policy.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.late.policy.manage', tenant_id));

create policy hr_late_early_policy_assignments_select on public.hr_late_early_policy_assignments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.late.view', tenant_id));
create policy hr_late_early_policy_assignments_manage on public.hr_late_early_policy_assignments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.late.policy.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.late.policy.manage', tenant_id));

create policy hr_late_early_violations_select on public.hr_late_early_violations for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.late.view', tenant_id));
create policy hr_late_early_violations_manage on public.hr_late_early_violations for all to authenticated
  using (is_active = true and deleted_at is null and (public.has_permission('hr.late.manage', tenant_id) or public.has_permission('hr.late.approve', tenant_id)))
  with check (is_active = true and deleted_at is null and (public.has_permission('hr.late.manage', tenant_id) or public.has_permission('hr.late.approve', tenant_id)));

create policy hr_late_early_violation_ledger_select on public.hr_late_early_violation_ledger for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.late.view', tenant_id));
create policy hr_late_early_violation_ledger_manage on public.hr_late_early_violation_ledger for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.late.manage', tenant_id));

create policy hr_late_early_approval_events_select on public.hr_late_early_approval_events for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.late.view', tenant_id));
create policy hr_late_early_approval_events_manage on public.hr_late_early_approval_events for insert to authenticated
  with check (is_active = true and deleted_at is null and (public.has_permission('hr.late.manage', tenant_id) or public.has_permission('hr.late.approve', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.late.view', 'View Late/Early', 'Allows viewing late arrival and early leave violations and policies.', 'high'),
  ('hr.late.manage', 'Manage Late/Early', 'Allows managing late/early violations and administrative actions.', 'critical'),
  ('hr.late.approve', 'Approve Late/Early', 'Allows approving or rejecting late/early violations.', 'critical'),
  ('hr.late.export', 'Export Late/Early', 'Allows exporting late/early data for payroll input.', 'critical'),
  ('hr.late.policy.manage', 'Manage Late/Early Policies', 'Allows creating and updating late/early policies and assignments.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.late.view',
  'hr.late.manage',
  'hr.late.approve',
  'hr.late.export',
  'hr.late.policy.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
