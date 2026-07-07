-- Nexora HR Policy Engine Foundation.
-- Foundation contracts only. No Attendance runtime, Payroll calculations,
-- Compensation runtime, HR Requests, ESS/MSS, workflow runtime, or CRUD screens.

create type public.hr_policy_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.hr_policy_source_level as enum ('company', 'branch', 'department', 'position', 'grade', 'employment_profile_override');
create type public.hr_policy_dependency_mode as enum ('requires', 'recommends', 'blocks-activation-without');

create table public.hr_policy_types (
  id uuid primary key default gen_random_uuid(),
  policy_type_key text not null,
  label text not null,
  description text,
  consuming_engines text[] not null default '{}'::text[],
  runtime_calculation_implemented boolean not null default false,
  simulator_ready boolean not null default true,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (policy_type_key = lower(policy_type_key)),
  check (length(trim(label)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  policy_type_id uuid not null references public.hr_policy_types(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status public.hr_policy_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'identity_only', true),
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_policy_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  policy_id uuid not null references public.hr_policies(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  effective_from date not null,
  effective_to date,
  priority integer not null default 100 check (priority >= 0),
  parent_policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  allow_override boolean not null default true,
  rule_schema jsonb not null default '{}'::jsonb,
  rule_payload jsonb not null default '{}'::jsonb,
  simulator_metadata jsonb not null default jsonb_build_object(
    'affected_employees', 0,
    'affected_employment_profiles', 0,
    'affected_departments', 0,
    'estimated_future_impact', null
  ),
  status public.hr_policy_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'runtime_calculation_implemented', false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (parent_policy_version_id is null or parent_policy_version_id <> id),
  check (jsonb_typeof(rule_schema) = 'object'),
  check (jsonb_typeof(rule_payload) = 'object'),
  check (jsonb_typeof(simulator_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_policy_versions
  add constraint hr_policy_versions_one_active_version_per_range
  exclude using gist (
    tenant_id with =,
    policy_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  policy_version_id uuid not null references public.hr_policy_versions(id) on delete restrict,
  source_level public.hr_policy_source_level not null,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  position_id uuid references public.hr_positions(id) on delete restrict,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  priority integer not null default 100 check (priority >= 0),
  status public.hr_policy_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'resolution_assignment', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (source_level <> 'employment_profile_override'),
  check (effective_to is null or effective_to >= effective_from),
  check (source_level <> 'department' or department_id is not null),
  check (source_level <> 'position' or position_id is not null),
  check (source_level <> 'grade' or grade_id is not null),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_policy_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  policy_version_id uuid not null references public.hr_policy_versions(id) on delete restrict,
  overridden_values jsonb not null default '{}'::jsonb,
  effective_from date not null,
  effective_to date,
  priority integer not null default 1000 check (priority >= 0),
  status public.hr_policy_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'source_level', 'employment_profile_override'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(overridden_values) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_policy_dependencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  policy_id uuid not null references public.hr_policies(id) on delete restrict,
  depends_on_policy_id uuid references public.hr_policies(id) on delete restrict,
  depends_on_policy_type_id uuid references public.hr_policy_types(id) on delete restrict,
  dependency_mode public.hr_policy_dependency_mode not null default 'requires',
  runtime_evaluation_implemented boolean not null default false,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (depends_on_policy_id is not null or depends_on_policy_type_id is not null),
  check (depends_on_policy_id is null or depends_on_policy_id <> policy_id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_employment_profiles
  add constraint hr_employment_profiles_attendance_policy_ref_fk foreign key (attendance_policy_ref) references public.hr_policy_versions(id) on delete restrict,
  add constraint hr_employment_profiles_leave_policy_ref_fk foreign key (leave_policy_ref) references public.hr_policy_versions(id) on delete restrict,
  add constraint hr_employment_profiles_payroll_policy_ref_fk foreign key (payroll_policy_ref) references public.hr_policy_versions(id) on delete restrict,
  add constraint hr_employment_profiles_incentive_policy_ref_fk foreign key (incentive_policy_ref) references public.hr_policy_versions(id) on delete restrict,
  add constraint hr_employment_profiles_approval_policy_ref_fk foreign key (approval_policy_ref) references public.hr_policy_versions(id) on delete restrict;

create unique index hr_policy_types_key_active_uq on public.hr_policy_types (policy_type_key) where deleted_at is null;
create unique index hr_policies_code_active_uq on public.hr_policies (tenant_id, company_id, policy_type_id, code) where deleted_at is null;
create unique index hr_policy_versions_policy_version_uq on public.hr_policy_versions (tenant_id, policy_id, version_no) where deleted_at is null;
create index hr_policy_versions_effective_idx on public.hr_policy_versions (tenant_id, company_id, policy_id, status, effective_from, effective_to) where deleted_at is null;
create index hr_policy_assignments_resolution_idx on public.hr_policy_assignments (tenant_id, company_id, branch_id, source_level, department_id, position_id, grade_id, status, priority) where deleted_at is null;
create index hr_policy_overrides_profile_idx on public.hr_policy_overrides (tenant_id, employment_profile_id, status, effective_from, effective_to, priority) where deleted_at is null;
create index hr_policy_dependencies_policy_idx on public.hr_policy_dependencies (tenant_id, company_id, policy_id, dependency_mode) where deleted_at is null;

create or replace function public.prevent_hr_policy_version_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('active', 'inactive', 'archived')
    and (
      old.policy_id is distinct from new.policy_id
      or old.version_no is distinct from new.version_no
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
      or old.priority is distinct from new.priority
      or old.parent_policy_version_id is distinct from new.parent_policy_version_id
      or old.allow_override is distinct from new.allow_override
      or old.rule_schema is distinct from new.rule_schema
      or old.rule_payload is distinct from new.rule_payload
    )
  then
    raise exception 'Historical HR policy versions are immutable; create a new policy version instead.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_policy_version_history_rewrite() from public;
grant execute on function public.prevent_hr_policy_version_history_rewrite() to authenticated;

drop trigger if exists hr_policy_versions_prevent_history_rewrite on public.hr_policy_versions;
create trigger hr_policy_versions_prevent_history_rewrite before update on public.hr_policy_versions for each row execute function public.prevent_hr_policy_version_history_rewrite();

drop trigger if exists hr_policy_types_touch_updated_at on public.hr_policy_types;
create trigger hr_policy_types_touch_updated_at before update on public.hr_policy_types for each row execute function public.touch_platform_row();
drop trigger if exists hr_policies_touch_updated_at on public.hr_policies;
create trigger hr_policies_touch_updated_at before update on public.hr_policies for each row execute function public.touch_platform_row();
drop trigger if exists hr_policy_versions_touch_updated_at on public.hr_policy_versions;
create trigger hr_policy_versions_touch_updated_at before update on public.hr_policy_versions for each row execute function public.touch_platform_row();
drop trigger if exists hr_policy_assignments_touch_updated_at on public.hr_policy_assignments;
create trigger hr_policy_assignments_touch_updated_at before update on public.hr_policy_assignments for each row execute function public.touch_platform_row();
drop trigger if exists hr_policy_overrides_touch_updated_at on public.hr_policy_overrides;
create trigger hr_policy_overrides_touch_updated_at before update on public.hr_policy_overrides for each row execute function public.touch_platform_row();
drop trigger if exists hr_policy_dependencies_touch_updated_at on public.hr_policy_dependencies;
create trigger hr_policy_dependencies_touch_updated_at before update on public.hr_policy_dependencies for each row execute function public.touch_platform_row();

alter table public.hr_policy_types enable row level security;
alter table public.hr_policies enable row level security;
alter table public.hr_policy_versions enable row level security;
alter table public.hr_policy_assignments enable row level security;
alter table public.hr_policy_overrides enable row level security;
alter table public.hr_policy_dependencies enable row level security;

alter table public.hr_policy_types force row level security;
alter table public.hr_policies force row level security;
alter table public.hr_policy_versions force row level security;
alter table public.hr_policy_assignments force row level security;
alter table public.hr_policy_overrides force row level security;
alter table public.hr_policy_dependencies force row level security;

create policy hr_policy_types_select on public.hr_policy_types for select to authenticated
  using (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.policies.view', tenant_id)));
create policy hr_policy_types_manage on public.hr_policy_types for all to authenticated
  using (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.policies.manage', tenant_id)))
  with check (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.policies.manage', tenant_id)));

create policy hr_policies_select on public.hr_policies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.policies.view', tenant_id));
create policy hr_policies_manage on public.hr_policies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id));

create policy hr_policy_versions_select on public.hr_policy_versions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.policies.view', tenant_id));
create policy hr_policy_versions_manage on public.hr_policy_versions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.policy_versions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.policy_versions.manage', tenant_id));

create policy hr_policy_assignments_select on public.hr_policy_assignments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.policies.view', tenant_id));
create policy hr_policy_assignments_manage on public.hr_policy_assignments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id));

create policy hr_policy_overrides_select on public.hr_policy_overrides for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.policies.view', tenant_id));
create policy hr_policy_overrides_manage on public.hr_policy_overrides for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.policy_overrides.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.policy_overrides.manage', tenant_id));

create policy hr_policy_dependencies_select on public.hr_policy_dependencies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.policies.view', tenant_id));
create policy hr_policy_dependencies_manage on public.hr_policy_dependencies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.policies.manage', tenant_id));

insert into public.hr_policy_types (policy_type_key, label, description, consuming_engines)
values
  ('attendance', 'Attendance Policy', 'Rules consumed by future attendance and payroll engines.', array['attendance', 'payroll']),
  ('leave', 'Leave Policy', 'Rules consumed by future leave and payroll engines.', array['leave', 'payroll']),
  ('payroll', 'Payroll Policy', 'Rules consumed by the future payroll engine.', array['payroll']),
  ('shift', 'Shift Policy', 'Rules consumed by future workforce and attendance engines.', array['workforce', 'attendance']),
  ('overtime', 'Overtime Policy', 'Rules consumed by future attendance and payroll engines.', array['attendance', 'payroll']),
  ('incentive', 'Incentive Policy', 'Rules consumed by future compensation and payroll engines.', array['compensation', 'payroll']),
  ('allowance', 'Allowance Policy', 'Rules consumed by future compensation and payroll engines.', array['compensation', 'payroll']),
  ('deduction', 'Deduction Policy', 'Rules consumed by future compensation and payroll engines.', array['compensation', 'payroll']),
  ('loan', 'Loan Policy', 'Rules consumed by future HR action and payroll engines.', array['hr-actions', 'payroll']),
  ('penalty', 'Penalty Policy', 'Rules consumed by future HR action and payroll engines.', array['hr-actions', 'payroll']),
  ('approval', 'Approval Policy', 'Rules consumed by the future HR Action Engine.', array['hr-actions']),
  ('probation', 'Probation Policy', 'Rules consumed by future lifecycle actions.', array['hr-actions']),
  ('confirmation', 'Confirmation Policy', 'Rules consumed by future lifecycle actions.', array['hr-actions']),
  ('promotion', 'Promotion Policy', 'Rules consumed by future HR action and compensation engines.', array['hr-actions', 'compensation']),
  ('transfer', 'Transfer Policy', 'Rules consumed by future HR action engine.', array['hr-actions']),
  ('document_expiry', 'Document Expiry Policy', 'Rules consumed by future document and notification engines.', array['documents', 'notifications']),
  ('custody', 'Custody Policy', 'Rules consumed by future HR action and asset engines.', array['hr-actions', 'assets']),
  ('training', 'Training Policy', 'Rules consumed by future training and lifecycle engines.', array['training', 'hr-actions']),
  ('travel_mission', 'Travel / Mission Policy', 'Rules consumed by future HR action and payroll engines.', array['hr-actions', 'payroll']),
  ('production_incentive', 'Production Incentive Policy', 'Rules consumed by future manufacturing, compensation, and payroll engines.', array['manufacturing', 'compensation', 'payroll'])
on conflict do nothing;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.policies.view', 'View HR Policies', 'Allows viewing HR policy foundation definitions, versions, assignments, and overrides.', 'high'),
  ('hr.policies.manage', 'Manage HR Policies', 'Allows managing HR policy identity, assignments, dependencies, and activation readiness.', 'critical'),
  ('hr.policy_versions.manage', 'Manage HR Policy Versions', 'Allows creating and managing immutable effective-dated HR policy versions.', 'critical'),
  ('hr.policy_overrides.manage', 'Manage HR Policy Overrides', 'Allows managing employment-profile policy overrides.', 'critical'),
  ('hr.policy_simulator.view', 'View HR Policy Simulator', 'Allows viewing future rule simulator readiness metadata.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.policies.view',
  'hr.policies.manage',
  'hr.policy_versions.manage',
  'hr.policy_overrides.manage',
  'hr.policy_simulator.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
