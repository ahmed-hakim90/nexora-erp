-- Nexora HR Assignment Engine Foundation.
-- Centralized assignment contracts only. No assignment execution runtime, no direct employment profile mutation,
-- no workflow runtime, no apply runtime, ESS/MSS, or operational data overwriting.

create type public.hr_assignment_type as enum (
  'position',
  'department',
  'section',
  'team',
  'organization_unit',
  'manager',
  'cost_center',
  'work_location',
  'shift_schedule',
  'payroll_group',
  'holiday_calendar',
  'capability_pack',
  'template_version',
  'reporting_structure',
  'production_line',
  'machine_group',
  'project'
);

create type public.hr_assignment_status as enum (
  'planned',
  'active',
  'expired',
  'cancelled',
  'superseded'
);

create type public.hr_assignment_scope as enum (
  'primary',
  'temporary',
  'acting',
  'delegated',
  'project',
  'emergency'
);

create type public.hr_reporting_structure_kind as enum (
  'direct_manager',
  'functional_manager',
  'matrix_manager',
  'acting_manager'
);

create type public.hr_assignment_effect_target as enum (
  'employment_profile',
  'workflow',
  'approval',
  'reports',
  'dashboard',
  'notifications',
  'attendance',
  'payroll_snapshot',
  'production_planning',
  'cost_center',
  'analytics',
  'timeline',
  'audit',
  'search'
);

create table public.hr_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  assignment_type public.hr_assignment_type not null,
  reference_entity_id uuid not null,
  reference_entity_type text not null,
  effective_from date not null,
  effective_to date,
  priority integer not null default 100 check (priority >= 0),
  assignment_scope public.hr_assignment_scope not null default 'primary',
  assignment_status public.hr_assignment_status not null default 'planned',
  reason text,
  hr_action_document_id uuid references public.hr_action_documents(id) on delete restrict,
  applied_by uuid references auth.users(id),
  applied_at timestamptz,
  expired_at timestamptz,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'assignment_runtime_implemented', false,
    'direct_employment_profile_mutation', false,
    'historical_assignments_immutable', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(reference_entity_type)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_assignment_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  assignment_id uuid not null references public.hr_assignments(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  assignment_type public.hr_assignment_type not null,
  previous_reference_entity_id uuid,
  new_reference_entity_id uuid not null,
  effective_from date not null,
  effective_to date,
  assignment_status public.hr_assignment_status not null,
  superseded_assignment_id uuid references public.hr_assignments(id) on delete restrict,
  hr_action_document_id uuid references public.hr_action_documents(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'history_immutable', true,
    'assignment_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_assignment_resolution_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  assignment_type public.hr_assignment_type not null,
  assignment_scope public.hr_assignment_scope not null default 'primary',
  resolved_assignment_id uuid references public.hr_assignments(id) on delete restrict,
  resolution_rule_key text not null,
  effective_date date not null,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'resolution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(resolution_rule_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_assignment_effects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  assignment_id uuid not null references public.hr_assignments(id) on delete restrict,
  assignment_type public.hr_assignment_type not null,
  effect_target public.hr_assignment_effect_target not null,
  effect_order integer not null default 100 check (effect_order >= 0),
  description text not null default '',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'effect_runtime_implemented', false
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
  check (deleted_at is null or deleted_by is not null)
);

create index hr_assignments_employee_type_status_idx
  on public.hr_assignments (tenant_id, employee_id, assignment_type, assignment_status, effective_from)
  where deleted_at is null;

create index hr_assignments_profile_scope_idx
  on public.hr_assignments (tenant_id, employment_profile_id, assignment_scope, effective_from)
  where deleted_at is null;

create index hr_assignments_action_ref_idx
  on public.hr_assignments (tenant_id, hr_action_document_id)
  where deleted_at is null and hr_action_document_id is not null;

create index hr_assignment_history_assignment_idx
  on public.hr_assignment_history (tenant_id, assignment_id, recorded_at)
  where deleted_at is null;

create index hr_assignment_history_employee_idx
  on public.hr_assignment_history (tenant_id, employee_id, assignment_type, recorded_at)
  where deleted_at is null;

create index hr_assignment_resolution_refs_employee_idx
  on public.hr_assignment_resolution_refs (tenant_id, employee_id, assignment_type, effective_date)
  where deleted_at is null;

create index hr_assignment_effects_assignment_idx
  on public.hr_assignment_effects (tenant_id, assignment_id, effect_order)
  where deleted_at is null;

drop trigger if exists hr_assignments_touch_updated_at on public.hr_assignments;
create trigger hr_assignments_touch_updated_at before update on public.hr_assignments for each row execute function public.touch_platform_row();
drop trigger if exists hr_assignment_history_touch_updated_at on public.hr_assignment_history;
create trigger hr_assignment_history_touch_updated_at before update on public.hr_assignment_history for each row execute function public.touch_platform_row();
drop trigger if exists hr_assignment_resolution_refs_touch_updated_at on public.hr_assignment_resolution_refs;
create trigger hr_assignment_resolution_refs_touch_updated_at before update on public.hr_assignment_resolution_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_assignment_effects_touch_updated_at on public.hr_assignment_effects;
create trigger hr_assignment_effects_touch_updated_at before update on public.hr_assignment_effects for each row execute function public.touch_platform_row();

alter table public.hr_assignments enable row level security;
alter table public.hr_assignment_history enable row level security;
alter table public.hr_assignment_resolution_refs enable row level security;
alter table public.hr_assignment_effects enable row level security;

alter table public.hr_assignments force row level security;
alter table public.hr_assignment_history force row level security;
alter table public.hr_assignment_resolution_refs force row level security;
alter table public.hr_assignment_effects force row level security;

create policy hr_assignments_select on public.hr_assignments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.assignments.view', tenant_id));
create policy hr_assignments_manage on public.hr_assignments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id));

create policy hr_assignment_history_select on public.hr_assignment_history for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.assignment_history.view', tenant_id));
create policy hr_assignment_history_manage on public.hr_assignment_history for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id));

create policy hr_assignment_resolution_refs_select on public.hr_assignment_resolution_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.assignment_resolution.view', tenant_id));
create policy hr_assignment_resolution_refs_manage on public.hr_assignment_resolution_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id));

create policy hr_assignment_effects_select on public.hr_assignment_effects for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.assignments.view', tenant_id));
create policy hr_assignment_effects_manage on public.hr_assignment_effects for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.assignments.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.assignments.view', 'View HR Assignments', 'Allows viewing HR assignment foundation records.', 'high'),
  ('hr.assignments.manage', 'Manage HR Assignments', 'Allows managing HR assignment foundation records.', 'critical'),
  ('hr.assignment_history.view', 'View Assignment History', 'Allows viewing immutable HR assignment history.', 'high'),
  ('hr.assignment_resolution.view', 'View Assignment Resolution', 'Allows viewing assignment resolution readiness references.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.assignments.view',
  'hr.assignments.manage',
  'hr.assignment_history.view',
  'hr.assignment_resolution.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
