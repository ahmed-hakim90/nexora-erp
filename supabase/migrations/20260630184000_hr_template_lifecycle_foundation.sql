-- Nexora HR Template & Lifecycle Foundation.
-- Reusable templates, capability packs, lifecycle templates, and checklist foundations only.
-- No onboarding execution, checklist execution, workflow runtime, apply runtime, ESS/MSS, or operational data copying.

create type public.hr_template_status as enum ('draft', 'active', 'inactive', 'archived');

create type public.hr_template_component_kind as enum (
  'employment_profile_defaults',
  'organization_assignment',
  'department',
  'section',
  'team',
  'position',
  'job_title',
  'grade',
  'manager_resolution_strategy',
  'work_location',
  'cost_center',
  'employment_type',
  'salary_package',
  'compensation_structure',
  'policy',
  'shift_schedule',
  'payroll_group',
  'holiday_calendar',
  'training_set',
  'required_documents',
  'custody_set',
  'workflow_binding',
  'approval_binding',
  'apply_engine_readiness',
  'timeline_readiness',
  'capability_pack'
);

create type public.hr_capability_pack_component_kind as enum (
  'policy',
  'salary_package',
  'compensation_structure',
  'shift_policy',
  'attendance_policy',
  'leave_policy',
  'payroll_policy',
  'shift_schedule',
  'payroll_group',
  'holiday_calendar',
  'training_set',
  'custody_set',
  'required_documents'
);

create type public.hr_lifecycle_template_kind as enum (
  'onboarding',
  'probation',
  'confirmation',
  'promotion',
  'transfer',
  'department_change',
  'salary_revision',
  'suspension',
  'leave_return',
  'resignation',
  'termination',
  'final_settlement',
  'offboarding',
  'rehire'
);

create type public.hr_checklist_owner_role as enum (
  'employee',
  'manager',
  'hr',
  'finance',
  'it',
  'warehouse',
  'administration',
  'supervisor'
);

create type public.hr_checklist_completion_rule as enum (
  'document_uploaded',
  'hr_action_approved',
  'manual_confirmation',
  'system_access_revoked',
  'custody_returned',
  'clearance_granted'
);

create type public.hr_required_document_kind as enum (
  'national_id',
  'passport',
  'residence',
  'contract',
  'medical',
  'qualifications',
  'driving_license',
  'certificates',
  'other'
);

create type public.hr_required_training_category as enum ('mandatory', 'optional', 'recurring', 'expiring');

create type public.hr_required_custody_item_kind as enum (
  'laptop',
  'desktop',
  'uniform',
  'ppe',
  'mobile',
  'sim',
  'vehicle',
  'access_card',
  'keys',
  'other'
);

create type public.hr_template_effect_target as enum (
  'employment_profile',
  'compensation',
  'attendance',
  'payroll',
  'workflow',
  'timeline',
  'apply_engine'
);

create table public.hr_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  employment_type public.hr_employment_type,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  status public.hr_template_status not null default 'draft',
  current_version integer not null default 1 check (current_version > 0),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false,
    'execution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (effective_to is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_template_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  template_id uuid not null references public.hr_templates(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  effective_from date not null,
  effective_to date,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'assigned_employee_retains_version', true,
    'execution_runtime_implemented', false
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
  check (effective_to is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_capability_packs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  precedence_order integer not null default 100 check (precedence_order >= 0),
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false,
    'later_pack_overrides_earlier_pack', true,
    'resolve_without_duplicating_entities', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_template_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  template_version_id uuid not null references public.hr_template_versions(id) on delete restrict,
  component_kind public.hr_template_component_kind not null,
  reference_id text not null,
  sequence integer not null default 100 check (sequence >= 0),
  capability_pack_id uuid references public.hr_capability_packs(id) on delete restrict,
  precedence_order integer check (precedence_order is null or precedence_order >= 0),
  effect_target public.hr_template_effect_target,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false,
    'execution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(reference_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_capability_pack_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  capability_pack_id uuid not null references public.hr_capability_packs(id) on delete restrict,
  component_kind public.hr_capability_pack_component_kind not null,
  reference_id text not null,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(reference_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  lifecycle_kind public.hr_lifecycle_template_kind,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'execution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_checklist_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  checklist_template_id uuid not null references public.hr_checklist_templates(id) on delete restrict,
  title text not null,
  description text,
  sequence integer not null default 100 check (sequence >= 0),
  mandatory boolean not null default true,
  owner_role public.hr_checklist_owner_role not null default 'hr',
  required_document_ref text,
  required_hr_action_ref text,
  estimated_duration_hours integer check (estimated_duration_hours is null or estimated_duration_hours >= 0),
  completion_rule public.hr_checklist_completion_rule not null default 'manual_confirmation',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'execution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(title)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_lifecycle_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  kind public.hr_lifecycle_template_kind not null,
  code text not null,
  name text not null,
  description text,
  template_version_id uuid references public.hr_template_versions(id) on delete restrict,
  checklist_template_id uuid references public.hr_checklist_templates(id) on delete restrict,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'execution_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_required_document_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  document_kinds public.hr_required_document_kind[] not null default '{}',
  document_refs jsonb not null default '[]'::jsonb,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(document_refs) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_required_training_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  category public.hr_required_training_category not null default 'mandatory',
  training_refs jsonb not null default '[]'::jsonb,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(training_refs) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_required_custody_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  custody_item_kinds public.hr_required_custody_item_kind[] not null default '{}',
  custody_refs jsonb not null default '[]'::jsonb,
  status public.hr_template_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'references_only', true,
    'copied_operational_data', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(custody_refs) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_templates_scope_code_uq
  on public.hr_templates (tenant_id, company_id, code)
  where deleted_at is null;

create unique index hr_template_versions_template_version_uq
  on public.hr_template_versions (tenant_id, template_id, version_number)
  where deleted_at is null;

create index hr_template_versions_effective_idx
  on public.hr_template_versions (tenant_id, template_id, effective_from, status)
  where deleted_at is null;

create unique index hr_capability_packs_scope_code_uq
  on public.hr_capability_packs (tenant_id, company_id, code)
  where deleted_at is null;

create index hr_capability_packs_precedence_idx
  on public.hr_capability_packs (tenant_id, company_id, precedence_order, status)
  where deleted_at is null;

create index hr_template_components_version_sequence_idx
  on public.hr_template_components (tenant_id, template_version_id, sequence, component_kind)
  where deleted_at is null;

create unique index hr_template_components_version_kind_ref_uq
  on public.hr_template_components (tenant_id, template_version_id, component_kind, reference_id)
  where deleted_at is null;

create index hr_capability_pack_components_pack_idx
  on public.hr_capability_pack_components (tenant_id, capability_pack_id, component_kind)
  where deleted_at is null;

create unique index hr_capability_pack_components_pack_kind_ref_uq
  on public.hr_capability_pack_components (tenant_id, capability_pack_id, component_kind, reference_id)
  where deleted_at is null;

create unique index hr_checklist_templates_scope_code_uq
  on public.hr_checklist_templates (tenant_id, company_id, code)
  where deleted_at is null;

create index hr_checklist_items_template_sequence_idx
  on public.hr_checklist_items (tenant_id, checklist_template_id, sequence)
  where deleted_at is null;

create unique index hr_lifecycle_templates_scope_kind_code_uq
  on public.hr_lifecycle_templates (tenant_id, company_id, kind, code)
  where deleted_at is null;

create unique index hr_required_document_sets_scope_code_uq
  on public.hr_required_document_sets (tenant_id, company_id, code)
  where deleted_at is null;

create unique index hr_required_training_sets_scope_code_uq
  on public.hr_required_training_sets (tenant_id, company_id, code)
  where deleted_at is null;

create unique index hr_required_custody_sets_scope_code_uq
  on public.hr_required_custody_sets (tenant_id, company_id, code)
  where deleted_at is null;

drop trigger if exists hr_templates_touch_updated_at on public.hr_templates;
create trigger hr_templates_touch_updated_at before update on public.hr_templates for each row execute function public.touch_platform_row();
drop trigger if exists hr_template_versions_touch_updated_at on public.hr_template_versions;
create trigger hr_template_versions_touch_updated_at before update on public.hr_template_versions for each row execute function public.touch_platform_row();
drop trigger if exists hr_template_components_touch_updated_at on public.hr_template_components;
create trigger hr_template_components_touch_updated_at before update on public.hr_template_components for each row execute function public.touch_platform_row();
drop trigger if exists hr_capability_packs_touch_updated_at on public.hr_capability_packs;
create trigger hr_capability_packs_touch_updated_at before update on public.hr_capability_packs for each row execute function public.touch_platform_row();
drop trigger if exists hr_capability_pack_components_touch_updated_at on public.hr_capability_pack_components;
create trigger hr_capability_pack_components_touch_updated_at before update on public.hr_capability_pack_components for each row execute function public.touch_platform_row();
drop trigger if exists hr_lifecycle_templates_touch_updated_at on public.hr_lifecycle_templates;
create trigger hr_lifecycle_templates_touch_updated_at before update on public.hr_lifecycle_templates for each row execute function public.touch_platform_row();
drop trigger if exists hr_checklist_templates_touch_updated_at on public.hr_checklist_templates;
create trigger hr_checklist_templates_touch_updated_at before update on public.hr_checklist_templates for each row execute function public.touch_platform_row();
drop trigger if exists hr_checklist_items_touch_updated_at on public.hr_checklist_items;
create trigger hr_checklist_items_touch_updated_at before update on public.hr_checklist_items for each row execute function public.touch_platform_row();
drop trigger if exists hr_required_document_sets_touch_updated_at on public.hr_required_document_sets;
create trigger hr_required_document_sets_touch_updated_at before update on public.hr_required_document_sets for each row execute function public.touch_platform_row();
drop trigger if exists hr_required_training_sets_touch_updated_at on public.hr_required_training_sets;
create trigger hr_required_training_sets_touch_updated_at before update on public.hr_required_training_sets for each row execute function public.touch_platform_row();
drop trigger if exists hr_required_custody_sets_touch_updated_at on public.hr_required_custody_sets;
create trigger hr_required_custody_sets_touch_updated_at before update on public.hr_required_custody_sets for each row execute function public.touch_platform_row();

alter table public.hr_templates enable row level security;
alter table public.hr_template_versions enable row level security;
alter table public.hr_template_components enable row level security;
alter table public.hr_capability_packs enable row level security;
alter table public.hr_capability_pack_components enable row level security;
alter table public.hr_lifecycle_templates enable row level security;
alter table public.hr_checklist_templates enable row level security;
alter table public.hr_checklist_items enable row level security;
alter table public.hr_required_document_sets enable row level security;
alter table public.hr_required_training_sets enable row level security;
alter table public.hr_required_custody_sets enable row level security;

alter table public.hr_templates force row level security;
alter table public.hr_template_versions force row level security;
alter table public.hr_template_components force row level security;
alter table public.hr_capability_packs force row level security;
alter table public.hr_capability_pack_components force row level security;
alter table public.hr_lifecycle_templates force row level security;
alter table public.hr_checklist_templates force row level security;
alter table public.hr_checklist_items force row level security;
alter table public.hr_required_document_sets force row level security;
alter table public.hr_required_training_sets force row level security;
alter table public.hr_required_custody_sets force row level security;

create policy hr_templates_select on public.hr_templates for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_templates_manage on public.hr_templates for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

create policy hr_template_versions_select on public.hr_template_versions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_template_versions_manage on public.hr_template_versions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

create policy hr_template_components_select on public.hr_template_components for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_template_components_manage on public.hr_template_components for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

create policy hr_capability_packs_select on public.hr_capability_packs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.capability_packs.view', tenant_id));
create policy hr_capability_packs_manage on public.hr_capability_packs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.capability_packs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.capability_packs.manage', tenant_id));

create policy hr_capability_pack_components_select on public.hr_capability_pack_components for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.capability_packs.view', tenant_id));
create policy hr_capability_pack_components_manage on public.hr_capability_pack_components for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.capability_packs.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.capability_packs.manage', tenant_id));

create policy hr_lifecycle_templates_select on public.hr_lifecycle_templates for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.lifecycle_templates.view', tenant_id));
create policy hr_lifecycle_templates_manage on public.hr_lifecycle_templates for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.lifecycle_templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.lifecycle_templates.manage', tenant_id));

create policy hr_checklist_templates_select on public.hr_checklist_templates for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.checklists.view', tenant_id));
create policy hr_checklist_templates_manage on public.hr_checklist_templates for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.checklists.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.checklists.manage', tenant_id));

create policy hr_checklist_items_select on public.hr_checklist_items for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.checklists.view', tenant_id));
create policy hr_checklist_items_manage on public.hr_checklist_items for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.checklists.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.checklists.manage', tenant_id));

create policy hr_required_document_sets_select on public.hr_required_document_sets for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_required_document_sets_manage on public.hr_required_document_sets for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

create policy hr_required_training_sets_select on public.hr_required_training_sets for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_required_training_sets_manage on public.hr_required_training_sets for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

create policy hr_required_custody_sets_select on public.hr_required_custody_sets for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.templates.view', tenant_id));
create policy hr_required_custody_sets_manage on public.hr_required_custody_sets for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.templates.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.templates.view', 'View HR Templates', 'Allows viewing HR template and lifecycle foundation records.', 'high'),
  ('hr.templates.manage', 'Manage HR Templates', 'Allows managing HR template foundation records.', 'critical'),
  ('hr.capability_packs.view', 'View HR Capability Packs', 'Allows viewing HR capability pack foundation records.', 'high'),
  ('hr.capability_packs.manage', 'Manage HR Capability Packs', 'Allows managing HR capability pack foundation records.', 'critical'),
  ('hr.lifecycle_templates.view', 'View HR Lifecycle Templates', 'Allows viewing HR lifecycle template foundation records.', 'high'),
  ('hr.lifecycle_templates.manage', 'Manage HR Lifecycle Templates', 'Allows managing HR lifecycle template foundation records.', 'critical'),
  ('hr.checklists.view', 'View HR Checklists', 'Allows viewing HR checklist template foundation records.', 'high'),
  ('hr.checklists.manage', 'Manage HR Checklists', 'Allows managing HR checklist template foundation records.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.templates.view',
  'hr.templates.manage',
  'hr.capability_packs.view',
  'hr.capability_packs.manage',
  'hr.lifecycle_templates.view',
  'hr.lifecycle_templates.manage',
  'hr.checklists.view',
  'hr.checklists.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
