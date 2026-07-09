-- OP-10: Overtime runtime production — policies, candidates, approval events, payroll input reader.

do $$ begin
  alter type public.hr_overtime_request_status add value if not exists 'under_review';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.hr_overtime_request_status add value if not exists 'returned';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.hr_overtime_request_status add value if not exists 'withdrawn';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_overtime_type as enum (
    'normal',
    'weekend',
    'holiday',
    'night',
    'emergency',
    'callout',
    'travel',
    'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_overtime_compensation_type as enum ('pay', 'time_off', 'mixed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_overtime_approval_event_kind as enum (
    'submitted',
    'returned',
    'approved',
    'rejected',
    'cancelled',
    'withdrawn',
    'escalated',
    'delegated'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_overtime_candidate_status as enum (
    'pending',
    'approved',
    'rejected',
    'ignored',
    'converted'
  );
exception when duplicate_object then null;
end $$;

alter table public.hr_overtime_requests
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  add column if not exists overtime_type public.hr_overtime_type not null default 'normal',
  add column if not exists attendance_day_id uuid references public.hr_attendance_days(id) on delete restrict,
  add column if not exists cost_center text,
  add column if not exists project_ref text,
  add column if not exists shift_id uuid references public.hr_shift_definitions(id) on delete restrict,
  add column if not exists priority integer not null default 50 check (priority >= 0 and priority <= 100),
  add column if not exists payroll_eligible boolean not null default true,
  add column if not exists compensation_type public.hr_overtime_compensation_type not null default 'pay',
  add column if not exists attachment_ref text;

create table if not exists public.hr_overtime_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  overtime_type public.hr_overtime_type not null default 'normal',
  effective_from date not null,
  effective_to date,
  rate_multiplier numeric(6, 2) not null default 1.5 check (rate_multiplier > 0),
  daily_limit_minutes integer check (daily_limit_minutes is null or daily_limit_minutes > 0),
  weekly_limit_minutes integer check (weekly_limit_minutes is null or weekly_limit_minutes > 0),
  monthly_limit_minutes integer check (monthly_limit_minutes is null or monthly_limit_minutes > 0),
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

create table if not exists public.hr_overtime_approval_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  overtime_request_id uuid not null references public.hr_overtime_requests(id) on delete restrict,
  event_kind public.hr_overtime_approval_event_kind not null,
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

create table if not exists public.hr_overtime_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  attendance_day_id uuid not null references public.hr_attendance_days(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  work_date date not null,
  candidate_minutes integer not null check (candidate_minutes > 0),
  overtime_type public.hr_overtime_type not null default 'normal',
  status public.hr_overtime_candidate_status not null default 'pending',
  overtime_request_id uuid references public.hr_overtime_requests(id) on delete restrict,
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

create index if not exists hr_overtime_policies_active_idx
  on public.hr_overtime_policies (tenant_id, company_id, overtime_type, effective_from, effective_to)
  where deleted_at is null and status = 'active';

create index if not exists hr_overtime_approval_events_request_idx
  on public.hr_overtime_approval_events (tenant_id, overtime_request_id, created_at)
  where deleted_at is null;

create index if not exists hr_overtime_candidates_day_idx
  on public.hr_overtime_candidates (tenant_id, attendance_day_id, status)
  where deleted_at is null;

create index if not exists hr_overtime_candidates_employee_idx
  on public.hr_overtime_candidates (tenant_id, employee_id, work_date, status)
  where deleted_at is null;

create unique index if not exists hr_overtime_candidates_day_unique_idx
  on public.hr_overtime_candidates (tenant_id, attendance_day_id)
  where deleted_at is null and status in ('pending', 'approved', 'converted');

drop trigger if exists hr_overtime_policies_touch_updated_at on public.hr_overtime_policies;
create trigger hr_overtime_policies_touch_updated_at before update on public.hr_overtime_policies for each row execute function public.touch_platform_row();

drop trigger if exists hr_overtime_approval_events_touch_updated_at on public.hr_overtime_approval_events;
create trigger hr_overtime_approval_events_touch_updated_at before update on public.hr_overtime_approval_events for each row execute function public.touch_platform_row();

drop trigger if exists hr_overtime_candidates_touch_updated_at on public.hr_overtime_candidates;
create trigger hr_overtime_candidates_touch_updated_at before update on public.hr_overtime_candidates for each row execute function public.touch_platform_row();

alter table public.hr_overtime_policies enable row level security;
alter table public.hr_overtime_approval_events enable row level security;
alter table public.hr_overtime_candidates enable row level security;

alter table public.hr_overtime_policies force row level security;
alter table public.hr_overtime_approval_events force row level security;
alter table public.hr_overtime_candidates force row level security;

drop policy if exists hr_overtime_requests_select on public.hr_overtime_requests;
drop policy if exists hr_overtime_requests_manage on public.hr_overtime_requests;

create policy hr_overtime_requests_select on public.hr_overtime_requests for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.overtime.view', tenant_id)
  );

create policy hr_overtime_requests_insert on public.hr_overtime_requests for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.request', tenant_id)
    )
  );

create policy hr_overtime_requests_update on public.hr_overtime_requests for update to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.approve', tenant_id)
      or public.has_permission('hr.overtime.request', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.approve', tenant_id)
      or public.has_permission('hr.overtime.request', tenant_id)
    )
  );

create policy hr_overtime_policies_select on public.hr_overtime_policies for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.overtime.view', tenant_id)
  );

create policy hr_overtime_policies_manage on public.hr_overtime_policies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.overtime.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.overtime.manage', tenant_id));

create policy hr_overtime_approval_events_select on public.hr_overtime_approval_events for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.overtime.view', tenant_id)
  );

create policy hr_overtime_approval_events_manage on public.hr_overtime_approval_events for insert to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.approve', tenant_id)
    )
  );

create policy hr_overtime_candidates_select on public.hr_overtime_candidates for select to authenticated
  using (
    is_active = true
    and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and public.has_permission('hr.overtime.view', tenant_id)
  );

create policy hr_overtime_candidates_manage on public.hr_overtime_candidates for all to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.approve', tenant_id)
    )
  )
  with check (
    is_active = true
    and deleted_at is null
    and (
      public.has_permission('hr.overtime.manage', tenant_id)
      or public.has_permission('hr.overtime.approve', tenant_id)
    )
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.overtime.view', 'View Overtime', 'Allows viewing overtime requests, candidates, and policies.', 'high'),
  ('hr.overtime.manage', 'Manage Overtime', 'Allows managing overtime policies and administrative actions.', 'critical'),
  ('hr.overtime.request', 'Request Overtime', 'Allows employees or HR to submit overtime requests.', 'high'),
  ('hr.overtime.approve', 'Approve Overtime', 'Allows approving, rejecting, and returning overtime requests.', 'critical'),
  ('hr.overtime.export', 'Export Overtime', 'Allows exporting overtime data for payroll input.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.overtime.view',
  'hr.overtime.manage',
  'hr.overtime.request',
  'hr.overtime.approve',
  'hr.overtime.export'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
