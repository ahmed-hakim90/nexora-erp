-- Nexora HR Workflow & Approval Binding Foundation.
-- Binding contracts only. No HR workflow engine, no HR approval engine, no workflow execution,
-- no approval decision runtime, no apply execution, no operational mutation, no ESS/MSS.

create type public.hr_action_binding_status as enum ('draft', 'active', 'inactive', 'archived');

create type public.hr_action_workflow_platform_status as enum (
  'draft',
  'submitted',
  'in_review',
  'completed',
  'cancelled'
);

create type public.hr_action_approval_platform_status as enum (
  'requested',
  'assigned',
  'in_progress',
  'approved',
  'rejected',
  'returned',
  'cancelled',
  'completed'
);

create type public.hr_action_delegation_scope as enum (
  'action_type',
  'approval_step',
  'company',
  'branch',
  'department'
);

create type public.hr_action_escalation_target_role as enum (
  'manager',
  'hr',
  'finance',
  'ceo',
  'custom_role'
);

create type public.hr_action_sla_breach_severity as enum ('low', 'medium', 'high', 'critical');

create table public.hr_action_workflow_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_type public.hr_action_type not null,
  workflow_definition_ref text not null,
  workflow_template_ref text not null,
  workflow_instance_ref uuid,
  status_mapping jsonb not null default '{}'::jsonb,
  effective_from date not null,
  effective_to date,
  status public.hr_action_binding_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'binding_runtime_implemented', false,
    'workflow_runtime_implemented', false,
    'platform_workflow_engine_owner', true,
    'hr_workflow_engine_implemented', false,
    'state_mutation_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(workflow_definition_ref)) > 0),
  check (length(trim(workflow_template_ref)) > 0),
  check (jsonb_typeof(status_mapping) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (effective_to is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_workflow_instance_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  workflow_definition_ref text not null,
  workflow_instance_ref uuid not null,
  current_platform_status public.hr_action_workflow_platform_status not null default 'draft',
  mapped_hr_action_status public.hr_action_document_status not null default 'draft',
  linked_at timestamptz not null default now(),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'workflow_runtime_implemented', false,
    'platform_workflow_engine_owner', true,
    'hr_workflow_engine_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(workflow_definition_ref)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_approval_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_type public.hr_action_type not null,
  approval_policy_version_id uuid not null references public.hr_policy_versions(id) on delete restrict,
  approval_definition_ref text not null,
  approval_request_ref uuid,
  approval_status_mapping jsonb not null default '{}'::jsonb,
  effective_from date not null,
  effective_to date,
  status public.hr_action_binding_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'binding_runtime_implemented', false,
    'approval_runtime_implemented', false,
    'platform_approval_engine_owner', true,
    'hr_approval_engine_implemented', false,
    'state_mutation_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(approval_definition_ref)) > 0),
  check (jsonb_typeof(approval_status_mapping) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (effective_to is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_approval_request_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  approval_definition_ref text not null,
  approval_request_ref uuid not null,
  current_platform_status public.hr_action_approval_platform_status not null default 'requested',
  mapped_hr_action_status public.hr_action_document_status not null default 'submitted',
  linked_at timestamptz not null default now(),
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'approval_runtime_implemented', false,
    'platform_approval_engine_owner', true,
    'hr_approval_engine_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(approval_definition_ref)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_approval_matrix_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_type public.hr_action_type not null,
  matrix_key text not null,
  matrix_conditions jsonb not null default '{}'::jsonb,
  approval_definition_ref text,
  workflow_definition_ref text,
  effective_from date not null,
  effective_to date,
  status public.hr_action_binding_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'matrix_runtime_implemented', false,
    'platform_approval_engine_owner', true,
    'hr_approval_engine_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(matrix_key)) > 0),
  check (jsonb_typeof(matrix_conditions) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (effective_to is null or effective_to >= effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_delegation_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid references public.hr_action_documents(id) on delete restrict,
  delegated_from uuid references auth.users(id),
  delegated_to uuid references auth.users(id),
  delegation_scope public.hr_action_delegation_scope not null default 'approval_step',
  effective_from date not null,
  effective_to date,
  reason text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'delegation_runtime_implemented', false
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

create table public.hr_action_escalation_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid references public.hr_action_documents(id) on delete restrict,
  approval_binding_id uuid references public.hr_action_approval_bindings(id) on delete restrict,
  due_after_hours integer not null default 24 check (due_after_hours > 0),
  escalate_to_role public.hr_action_escalation_target_role,
  escalate_to_user uuid references auth.users(id),
  escalation_policy_ref text,
  reminder_policy_ref text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'notification_runtime_implemented', false
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

create table public.hr_action_sla_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid references public.hr_action_documents(id) on delete restrict,
  workflow_binding_id uuid references public.hr_action_workflow_bindings(id) on delete restrict,
  approval_binding_id uuid references public.hr_action_approval_bindings(id) on delete restrict,
  expected_response_hours integer not null default 24 check (expected_response_hours > 0),
  expected_completion_hours integer not null default 72 check (expected_completion_hours > 0),
  breach_severity public.hr_action_sla_breach_severity not null default 'medium',
  breach_action_ref text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'sla_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (expected_completion_hours >= expected_response_hours),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index hr_action_workflow_bindings_scope_idx
  on public.hr_action_workflow_bindings (tenant_id, company_id, action_type, status, effective_from)
  where deleted_at is null;

create index hr_action_workflow_instance_refs_document_idx
  on public.hr_action_workflow_instance_refs (tenant_id, action_document_id, current_platform_status)
  where deleted_at is null;

create unique index hr_action_workflow_instance_refs_instance_uq
  on public.hr_action_workflow_instance_refs (tenant_id, workflow_instance_ref)
  where deleted_at is null;

create index hr_action_approval_bindings_scope_idx
  on public.hr_action_approval_bindings (tenant_id, company_id, action_type, status, effective_from)
  where deleted_at is null;

create index hr_action_approval_request_refs_document_idx
  on public.hr_action_approval_request_refs (tenant_id, action_document_id, current_platform_status)
  where deleted_at is null;

create unique index hr_action_approval_request_refs_request_uq
  on public.hr_action_approval_request_refs (tenant_id, approval_request_ref)
  where deleted_at is null;

create index hr_action_approval_matrix_refs_scope_idx
  on public.hr_action_approval_matrix_refs (tenant_id, company_id, action_type, status)
  where deleted_at is null;

create index hr_action_delegation_refs_scope_idx
  on public.hr_action_delegation_refs (tenant_id, company_id, delegation_scope, effective_from)
  where deleted_at is null;

create index hr_action_escalation_refs_document_idx
  on public.hr_action_escalation_refs (tenant_id, action_document_id, due_after_hours)
  where deleted_at is null;

create index hr_action_sla_refs_document_idx
  on public.hr_action_sla_refs (tenant_id, action_document_id, breach_severity)
  where deleted_at is null;

drop trigger if exists hr_action_workflow_bindings_touch_updated_at on public.hr_action_workflow_bindings;
create trigger hr_action_workflow_bindings_touch_updated_at before update on public.hr_action_workflow_bindings for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_workflow_instance_refs_touch_updated_at on public.hr_action_workflow_instance_refs;
create trigger hr_action_workflow_instance_refs_touch_updated_at before update on public.hr_action_workflow_instance_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_approval_bindings_touch_updated_at on public.hr_action_approval_bindings;
create trigger hr_action_approval_bindings_touch_updated_at before update on public.hr_action_approval_bindings for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_approval_request_refs_touch_updated_at on public.hr_action_approval_request_refs;
create trigger hr_action_approval_request_refs_touch_updated_at before update on public.hr_action_approval_request_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_approval_matrix_refs_touch_updated_at on public.hr_action_approval_matrix_refs;
create trigger hr_action_approval_matrix_refs_touch_updated_at before update on public.hr_action_approval_matrix_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_delegation_refs_touch_updated_at on public.hr_action_delegation_refs;
create trigger hr_action_delegation_refs_touch_updated_at before update on public.hr_action_delegation_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_escalation_refs_touch_updated_at on public.hr_action_escalation_refs;
create trigger hr_action_escalation_refs_touch_updated_at before update on public.hr_action_escalation_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_sla_refs_touch_updated_at on public.hr_action_sla_refs;
create trigger hr_action_sla_refs_touch_updated_at before update on public.hr_action_sla_refs for each row execute function public.touch_platform_row();

alter table public.hr_action_workflow_bindings enable row level security;
alter table public.hr_action_workflow_instance_refs enable row level security;
alter table public.hr_action_approval_bindings enable row level security;
alter table public.hr_action_approval_request_refs enable row level security;
alter table public.hr_action_approval_matrix_refs enable row level security;
alter table public.hr_action_delegation_refs enable row level security;
alter table public.hr_action_escalation_refs enable row level security;
alter table public.hr_action_sla_refs enable row level security;

alter table public.hr_action_workflow_bindings force row level security;
alter table public.hr_action_workflow_instance_refs force row level security;
alter table public.hr_action_approval_bindings force row level security;
alter table public.hr_action_approval_request_refs force row level security;
alter table public.hr_action_approval_matrix_refs force row level security;
alter table public.hr_action_delegation_refs force row level security;
alter table public.hr_action_escalation_refs force row level security;
alter table public.hr_action_sla_refs force row level security;

create policy hr_action_workflow_bindings_select on public.hr_action_workflow_bindings for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.workflow.view', tenant_id));
create policy hr_action_workflow_bindings_manage on public.hr_action_workflow_bindings for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id));

create policy hr_action_workflow_instance_refs_select on public.hr_action_workflow_instance_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.workflow.view', tenant_id));
create policy hr_action_workflow_instance_refs_manage on public.hr_action_workflow_instance_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id));

create policy hr_action_approval_bindings_select on public.hr_action_approval_bindings for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.approval.view', tenant_id));
create policy hr_action_approval_bindings_manage on public.hr_action_approval_bindings for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id));

create policy hr_action_approval_request_refs_select on public.hr_action_approval_request_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.approval.view', tenant_id));
create policy hr_action_approval_request_refs_manage on public.hr_action_approval_request_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id));

create policy hr_action_approval_matrix_refs_select on public.hr_action_approval_matrix_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.approval_matrix.view', tenant_id));
create policy hr_action_approval_matrix_refs_manage on public.hr_action_approval_matrix_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval_matrix.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval_matrix.manage', tenant_id));

create policy hr_action_delegation_refs_select on public.hr_action_delegation_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.delegation.view', tenant_id));
create policy hr_action_delegation_refs_manage on public.hr_action_delegation_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.delegation.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.delegation.manage', tenant_id));

create policy hr_action_escalation_refs_select on public.hr_action_escalation_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.approval.view', tenant_id));
create policy hr_action_escalation_refs_manage on public.hr_action_escalation_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.approval.manage', tenant_id));

create policy hr_action_sla_refs_select on public.hr_action_sla_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.workflow.view', tenant_id));
create policy hr_action_sla_refs_manage on public.hr_action_sla_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.workflow.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.actions.workflow.view', 'View HR Action Workflow Bindings', 'Allows viewing HR action workflow binding foundation records.', 'high'),
  ('hr.actions.workflow.manage', 'Manage HR Action Workflow Bindings', 'Allows managing HR action workflow binding foundation records.', 'critical'),
  ('hr.actions.approval.view', 'View HR Action Approval Bindings', 'Allows viewing HR action approval binding foundation records.', 'high'),
  ('hr.actions.approval.manage', 'Manage HR Action Approval Bindings', 'Allows managing HR action approval binding foundation records.', 'critical'),
  ('hr.actions.approval_matrix.view', 'View HR Approval Matrix', 'Allows viewing HR approval matrix readiness references.', 'high'),
  ('hr.actions.approval_matrix.manage', 'Manage HR Approval Matrix', 'Allows managing HR approval matrix readiness references.', 'critical'),
  ('hr.actions.delegation.view', 'View HR Approval Delegation', 'Allows viewing HR approval delegation readiness references.', 'high'),
  ('hr.actions.delegation.manage', 'Manage HR Approval Delegation', 'Allows managing HR approval delegation readiness references.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.actions.workflow.view',
  'hr.actions.workflow.manage',
  'hr.actions.approval.view',
  'hr.actions.approval.manage',
  'hr.actions.approval_matrix.view',
  'hr.actions.approval_matrix.manage',
  'hr.actions.delegation.view',
  'hr.actions.delegation.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
