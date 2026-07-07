-- Nexora HR Action Apply Engine Foundation.
-- Foundation contracts only. No apply runtime, operational mutation, workflow execution,
-- approval execution, payroll calculation, attendance calculation, or finance posting.

create type public.hr_action_apply_mode as enum ('dry_run', 'validate_only', 'apply', 'rollback_simulation');
create type public.hr_action_apply_request_status as enum (
  'pending',
  'validating',
  'dry_run_completed',
  'ready_to_apply',
  'applying',
  'applied',
  'failed',
  'cancelled',
  'rollback_required'
);
create type public.hr_action_apply_effect_status as enum (
  'pending',
  'validated',
  'skipped',
  'dry_run_ok',
  'ready',
  'applied',
  'failed',
  'rollback_ready',
  'rollback_completed'
);
create type public.hr_action_apply_conflict_type as enum (
  'overlapping_employment_profile_change',
  'salary_revision_conflict',
  'transfer_conflict',
  'attendance_locked',
  'payroll_locked',
  'duplicate_action',
  'policy_version_expired',
  'employee_inactive',
  'position_closed',
  'cost_center_closed'
);
create type public.hr_action_apply_rollback_readiness as enum (
  'reverse_effect_possible',
  'correction_action_required',
  'rollback_not_allowed',
  'payroll_retro_required',
  'manual_review_required'
);

create table public.hr_action_apply_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  apply_mode public.hr_action_apply_mode not null default 'validate_only',
  effective_date date not null,
  status public.hr_action_apply_request_status not null default 'pending',
  correlation_id text not null,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'apply_runtime_implemented', false,
    'direct_operational_mutation', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(correlation_id)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_apply_effects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  apply_request_id uuid not null references public.hr_action_apply_requests(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  action_effect_id uuid not null references public.hr_action_effects(id) on delete restrict,
  effect_target public.hr_action_effect_target not null,
  effect_order integer not null default 100 check (effect_order >= 0),
  handler_key text not null,
  status public.hr_action_apply_effect_status not null default 'pending',
  validation_result jsonb not null default '{}'::jsonb,
  dry_run_result jsonb not null default '{}'::jsonb,
  apply_result jsonb not null default '{}'::jsonb,
  rollback_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
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
  check (length(trim(handler_key)) > 0),
  check (length(trim(idempotency_key)) > 0),
  check (jsonb_typeof(validation_result) = 'object'),
  check (jsonb_typeof(dry_run_result) = 'object'),
  check (jsonb_typeof(apply_result) = 'object'),
  check (jsonb_typeof(rollback_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_apply_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  apply_request_id uuid not null references public.hr_action_apply_requests(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  applied_effects jsonb not null default '[]'::jsonb,
  skipped_effects jsonb not null default '[]'::jsonb,
  failed_effects jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  timeline_refs jsonb not null default '[]'::jsonb,
  audit_refs jsonb not null default '[]'::jsonb,
  event_refs jsonb not null default '[]'::jsonb,
  snapshot_impact_refs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
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
  check (jsonb_typeof(applied_effects) = 'array'),
  check (jsonb_typeof(skipped_effects) = 'array'),
  check (jsonb_typeof(failed_effects) = 'array'),
  check (jsonb_typeof(warnings) = 'array'),
  check (jsonb_typeof(conflicts) = 'array'),
  check (jsonb_typeof(timeline_refs) = 'array'),
  check (jsonb_typeof(audit_refs) = 'array'),
  check (jsonb_typeof(event_refs) = 'array'),
  check (jsonb_typeof(snapshot_impact_refs) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_apply_conflicts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  apply_request_id uuid not null references public.hr_action_apply_requests(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  conflict_type public.hr_action_apply_conflict_type not null,
  severity public.hr_payroll_exception_severity not null default 'medium',
  status public.hr_payroll_exception_status not null default 'open',
  conflict_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'resolver_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(conflict_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_apply_idempotency (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  apply_request_id uuid not null references public.hr_action_apply_requests(id) on delete restrict,
  apply_effect_id uuid not null references public.hr_action_apply_effects(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  idempotency_key text not null,
  first_applied_at timestamptz,
  last_attempted_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  result_hash text,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'same_action_effect_target_must_not_apply_twice', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(idempotency_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_action_apply_rollback_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  apply_request_id uuid not null references public.hr_action_apply_requests(id) on delete restrict,
  apply_effect_id uuid references public.hr_action_apply_effects(id) on delete restrict,
  action_document_id uuid not null references public.hr_action_documents(id) on delete restrict,
  rollback_readiness public.hr_action_apply_rollback_readiness not null,
  rollback_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'rollback_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(rollback_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_action_apply_requests_correlation_uq
  on public.hr_action_apply_requests (tenant_id, correlation_id)
  where deleted_at is null;

create index hr_action_apply_requests_document_status_idx
  on public.hr_action_apply_requests (tenant_id, action_document_id, status, apply_mode)
  where deleted_at is null;

create index hr_action_apply_effects_request_order_idx
  on public.hr_action_apply_effects (tenant_id, apply_request_id, effect_order, status)
  where deleted_at is null;

create unique index hr_action_apply_effects_idempotency_uq
  on public.hr_action_apply_effects (tenant_id, idempotency_key)
  where deleted_at is null;

create unique index hr_action_apply_results_request_uq
  on public.hr_action_apply_results (tenant_id, apply_request_id)
  where deleted_at is null;

create index hr_action_apply_conflicts_request_idx
  on public.hr_action_apply_conflicts (tenant_id, apply_request_id, conflict_type, status)
  where deleted_at is null;

create unique index hr_action_apply_idempotency_key_uq
  on public.hr_action_apply_idempotency (tenant_id, idempotency_key)
  where deleted_at is null;

create index hr_action_apply_rollback_refs_request_idx
  on public.hr_action_apply_rollback_refs (tenant_id, apply_request_id, rollback_readiness)
  where deleted_at is null;

drop trigger if exists hr_action_apply_requests_touch_updated_at on public.hr_action_apply_requests;
create trigger hr_action_apply_requests_touch_updated_at before update on public.hr_action_apply_requests for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_apply_effects_touch_updated_at on public.hr_action_apply_effects;
create trigger hr_action_apply_effects_touch_updated_at before update on public.hr_action_apply_effects for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_apply_results_touch_updated_at on public.hr_action_apply_results;
create trigger hr_action_apply_results_touch_updated_at before update on public.hr_action_apply_results for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_apply_conflicts_touch_updated_at on public.hr_action_apply_conflicts;
create trigger hr_action_apply_conflicts_touch_updated_at before update on public.hr_action_apply_conflicts for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_apply_idempotency_touch_updated_at on public.hr_action_apply_idempotency;
create trigger hr_action_apply_idempotency_touch_updated_at before update on public.hr_action_apply_idempotency for each row execute function public.touch_platform_row();
drop trigger if exists hr_action_apply_rollback_refs_touch_updated_at on public.hr_action_apply_rollback_refs;
create trigger hr_action_apply_rollback_refs_touch_updated_at before update on public.hr_action_apply_rollback_refs for each row execute function public.touch_platform_row();

alter table public.hr_action_apply_requests enable row level security;
alter table public.hr_action_apply_effects enable row level security;
alter table public.hr_action_apply_results enable row level security;
alter table public.hr_action_apply_conflicts enable row level security;
alter table public.hr_action_apply_idempotency enable row level security;
alter table public.hr_action_apply_rollback_refs enable row level security;

alter table public.hr_action_apply_requests force row level security;
alter table public.hr_action_apply_effects force row level security;
alter table public.hr_action_apply_results force row level security;
alter table public.hr_action_apply_conflicts force row level security;
alter table public.hr_action_apply_idempotency force row level security;
alter table public.hr_action_apply_rollback_refs force row level security;

create policy hr_action_apply_requests_select on public.hr_action_apply_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_requests_manage on public.hr_action_apply_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id));
create policy hr_action_apply_requests_dry_run on public.hr_action_apply_requests for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.dry_run', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.dry_run', tenant_id));
create policy hr_action_apply_requests_execute on public.hr_action_apply_requests for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.execute', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.execute', tenant_id));

create policy hr_action_apply_effects_select on public.hr_action_apply_effects for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_effects_manage on public.hr_action_apply_effects for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id));

create policy hr_action_apply_results_select on public.hr_action_apply_results for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_results_manage on public.hr_action_apply_results for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id));

create policy hr_action_apply_conflicts_select on public.hr_action_apply_conflicts for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_conflicts_manage on public.hr_action_apply_conflicts for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id));

create policy hr_action_apply_idempotency_select on public.hr_action_apply_idempotency for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_idempotency_manage on public.hr_action_apply_idempotency for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.manage', tenant_id));

create policy hr_action_apply_rollback_refs_select on public.hr_action_apply_rollback_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.actions.apply.view', tenant_id));
create policy hr_action_apply_rollback_refs_rollback on public.hr_action_apply_rollback_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.rollback', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.rollback', tenant_id));

create policy hr_action_apply_audit_select on public.hr_action_apply_results for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.actions.apply.audit.view', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.actions.apply.view', 'View HR Action Apply', 'Allows viewing HR action apply requests and results.', 'high'),
  ('hr.actions.apply.manage', 'Manage HR Action Apply', 'Allows managing HR action apply foundation records.', 'critical'),
  ('hr.actions.apply.dry_run', 'Dry Run HR Action Apply', 'Allows dry-run apply readiness without operational mutation.', 'critical'),
  ('hr.actions.apply.execute', 'Execute HR Action Apply', 'Allows marking apply requests ready for future execution without runtime.', 'critical'),
  ('hr.actions.apply.rollback', 'Rollback HR Action Apply', 'Allows managing rollback readiness references.', 'critical'),
  ('hr.actions.apply.audit.view', 'View HR Action Apply Audit', 'Allows viewing apply audit readiness references.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.actions.apply.view',
  'hr.actions.apply.manage',
  'hr.actions.apply.dry_run',
  'hr.actions.apply.execute',
  'hr.actions.apply.rollback',
  'hr.actions.apply.audit.view'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
