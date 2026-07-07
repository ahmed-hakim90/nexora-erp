-- Nexora HR Action Engine Foundation.
-- Foundation contracts only. No workflow runtime, approval execution, apply engine,
-- ESS/MSS, CRUD screens, payroll calculation, attendance calculation,
-- leave balance calculation, or finance posting.

create type public.hr_action_type as enum (
  'hiring',
  'onboarding',
  'probation_confirmation',
  'promotion',
  'transfer',
  'department_change',
  'manager_change',
  'position_change',
  'grade_change',
  'salary_revision',
  'compensation_change',
  'allowance_assignment',
  'deduction_assignment',
  'loan',
  'advance',
  'bonus',
  'production_incentive_approval',
  'penalty',
  'warning',
  'suspension',
  'mission',
  'training',
  'shift_change',
  'attendance_adjustment',
  'leave',
  'resignation',
  'termination',
  'final_settlement',
  'rehire',
  'document_renewal',
  'custody_assignment',
  'custody_return',
  'medical_examination',
  'performance_review',
  'custom_hr_action'
);
create type public.hr_action_document_status as enum (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
  'applied',
  'archived'
);
create type public.hr_action_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.hr_action_payload_kind as enum (
  'salary_revision',
  'transfer',
  'attendance_adjustment',
  'bonus',
  'leave',
  'promotion',
  'compensation_change',
  'loan',
  'advance',
  'shift_change',
  'generic'
);
create type public.hr_action_effect_target as enum (
  'employment_profile',
  'timeline',
  'payroll_snapshot',
  'compensation',
  'attendance',
  'calendar',
  'organization',
  'reporting_manager',
  'cost_center',
  'workforce'
);
create type public.hr_action_link_type as enum (
  'related_action',
  'source_record',
  'payroll_batch',
  'attendance_day',
  'compensation_package',
  'platform_document'
);

create table public.hr_action_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  action_type public.hr_action_type not null,
  document_number text not null,
  requested_by uuid references auth.users(id),
  requested_on timestamptz not null default now(),
  effective_date date not null,
  status public.hr_action_document_status not null default 'draft',
  priority public.hr_action_priority not null default 'normal',
  policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  approval_policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  workflow_instance_ref uuid,
  source_module text,
  source_reference text,
  notes text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'hr_actions_are_documents', true,
    'direct_operational_mutation', false,
    'workflow_runtime_implemented', false,
    'apply_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(document_number)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_payloads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  payload_kind public.hr_action_payload_kind not null default 'generic',
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'calculation_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(payload) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_effects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  effect_target public.hr_action_effect_target not null,
  effect_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'effects_metadata_only', true,
    'apply_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(effect_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  link_type public.hr_action_link_type not null,
  linked_record_id uuid not null,
  linked_record_type text not null,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(linked_record_type)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  comment_body text not null,
  author_user_id uuid references auth.users(id),
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'document_engine_ready', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(comment_body)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  attachment_ref uuid,
  file_name text,
  content_type text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'document_engine_ready', true,
    'upload_runtime_implemented', false
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

create table public.hr_action_timeline_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  timeline_event_type text not null,
  timeline_event_ref uuid,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'timeline_publisher_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(timeline_event_type)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_audit_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  audit_action_key text not null,
  audit_event_ref uuid,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'audit_ready', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(audit_action_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_action_documents_number_uq
  on public.hr_action_documents (tenant_id, company_id, document_number)
  where deleted_at is null;

create index hr_action_documents_employee_status_idx
  on public.hr_action_documents (tenant_id, employee_id, action_type, status, effective_date)
  where deleted_at is null;

create index hr_action_documents_profile_idx
  on public.hr_action_documents (tenant_id, employment_profile_id, status, effective_date)
  where deleted_at is null;

create index hr_action_payloads_document_idx
  on public.hr_action_payloads (tenant_id, action_document_id, payload_kind)
  where deleted_at is null;

create index hr_action_effects_document_idx
  on public.hr_action_effects (tenant_id, action_document_id, effect_target)
  where deleted_at is null;

create index hr_action_links_document_idx
  on public.hr_action_links (tenant_id, action_document_id, link_type)
  where deleted_at is null;

create index hr_action_comments_document_idx
  on public.hr_action_comments (tenant_id, action_document_id, created_at)
  where deleted_at is null;

create index hr_action_attachments_document_idx
  on public.hr_action_attachments (tenant_id, action_document_id)
  where deleted_at is null;

create index hr_action_timeline_refs_document_idx
  on public.hr_action_timeline_refs (tenant_id, action_document_id, timeline_event_type)
  where deleted_at is null;

create index hr_action_audit_refs_document_idx
  on public.hr_action_audit_refs (tenant_id, action_document_id, audit_action_key)
  where deleted_at is null;

drop trigger if exists hr_action_documents_touch_updated_at on public.hr_action_documents;
create trigger hr_action_documents_touch_updated_at before update on public.hr_action_documents for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_payloads_touch_updated_at on public.hr_action_payloads;
create trigger hr_action_payloads_touch_updated_at before update on public.hr_action_payloads for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_effects_touch_updated_at on public.hr_action_effects;
create trigger hr_action_effects_touch_updated_at before update on public.hr_action_effects for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_links_touch_updated_at on public.hr_action_links;
create trigger hr_action_links_touch_updated_at before update on public.hr_action_links for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_comments_touch_updated_at on public.hr_action_comments;
create trigger hr_action_comments_touch_updated_at before update on public.hr_action_comments for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_attachments_touch_updated_at on public.hr_action_attachments;
create trigger hr_action_attachments_touch_updated_at before update on public.hr_action_attachments for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_timeline_refs_touch_updated_at on public.hr_action_timeline_refs;
create trigger hr_action_timeline_refs_touch_updated_at before update on public.hr_action_timeline_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_audit_refs_touch_updated_at on public.hr_action_audit_refs;
create trigger hr_action_audit_refs_touch_updated_at before update on public.hr_action_audit_refs for each row execute function public.touch_platform_row();

alter table public.hr_action_documents enable row level security;
alter table public.hr_action_payloads enable row level security;
alter table public.hr_action_effects enable row level security;
alter table public.hr_action_links enable row level security;
alter table public.hr_action_comments enable row level security;
alter table public.hr_action_attachments enable row level security;
alter table public.hr_action_timeline_refs enable row level security;
alter table public.hr_action_audit_refs enable row level security;

alter table public.hr_action_documents force row level security;
alter table public.hr_action_payloads force row level security;
alter table public.hr_action_effects force row level security;
alter table public.hr_action_links force row level security;
alter table public.hr_action_comments force row level security;
alter table public.hr_action_attachments force row level security;
alter table public.hr_action_timeline_refs force row level security;
alter table public.hr_action_audit_refs force row level security;

create policy hr_action_documents_select on public.hr_action_documents for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_documents_manage on public.hr_action_documents for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));
create policy hr_action_documents_submit on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.submit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.submit', tenant_id));
create policy hr_action_documents_review on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.review', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.review', tenant_id));
create policy hr_action_documents_approve on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.approve', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.approve', tenant_id));
create policy hr_action_documents_apply on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply', tenant_id));
create policy hr_action_documents_cancel on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.cancel', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.cancel', tenant_id));
create policy hr_action_documents_archive on public.hr_action_documents for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.archive', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.archive', tenant_id));

create policy hr_action_payloads_select on public.hr_action_payloads for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_payloads_manage on public.hr_action_payloads for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_effects_select on public.hr_action_effects for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_effects_manage on public.hr_action_effects for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_links_select on public.hr_action_links for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_links_manage on public.hr_action_links for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_comments_select on public.hr_action_comments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_comments_manage on public.hr_action_comments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_attachments_select on public.hr_action_attachments for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_attachments_manage on public.hr_action_attachments for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_timeline_refs_select on public.hr_action_timeline_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_timeline_refs_manage on public.hr_action_timeline_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

create policy hr_action_audit_refs_select on public.hr_action_audit_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.view', tenant_id));
create policy hr_action_audit_refs_manage on public.hr_action_audit_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.actions.view', 'View HR Actions', 'Allows viewing HR action documents and payloads.', 'high'),
  ('hr.actions.manage', 'Manage HR Actions', 'Allows managing HR action document foundation records.', 'critical'),
  ('hr.actions.submit', 'Submit HR Actions', 'Allows submitting HR action documents for review.', 'critical'),
  ('hr.actions.review', 'Review HR Actions', 'Allows reviewing submitted HR action documents.', 'critical'),
  ('hr.actions.approve', 'Approve HR Actions', 'Allows approving HR action documents without workflow runtime.', 'critical'),
  ('hr.actions.apply', 'Apply HR Actions', 'Allows marking HR action documents as applied without apply engine runtime.', 'critical'),
  ('hr.actions.cancel', 'Cancel HR Actions', 'Allows cancelling HR action documents.', 'critical'),
  ('hr.actions.archive', 'Archive HR Actions', 'Allows archiving HR action documents.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.actions.view',
  'hr.actions.manage',
  'hr.actions.submit',
  'hr.actions.review',
  'hr.actions.approve',
  'hr.actions.apply',
  'hr.actions.cancel',
  'hr.actions.archive'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
