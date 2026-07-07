-- Nexora HR Workforce Planning Engine Foundation.
-- Foundation contracts only. No payroll runtime, recruitment, performance,
-- learning, workforce scheduling runtime, budgeting calculations, or assignment execution.

create type public.hr_workforce_plan_status as enum (
  'draft',
  'under_review',
  'approved',
  'active',
  'closed',
  'archived'
);

create type public.hr_headcount_scope_level as enum (
  'company',
  'branch',
  'department',
  'team',
  'position',
  'job'
);

create type public.hr_vacancy_reason as enum (
  'new_position',
  'replacement',
  'expansion',
  'temporary',
  'seasonal'
);

create type public.hr_workforce_vacancy_status as enum (
  'planned',
  'approved',
  'open',
  'on_hold',
  'closed',
  'cancelled'
);

create type public.hr_hiring_request_priority as enum (
  'low',
  'normal',
  'high',
  'critical'
);

create type public.hr_hiring_request_approval_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled',
  'fulfilled'
);

create type public.hr_workforce_forecast_type as enum (
  'planned_growth',
  'expected_attrition',
  'internal_transfer',
  'promotion',
  'retirement'
);

create type public.hr_organization_capacity_scope as enum (
  'company',
  'branch',
  'department',
  'team'
);

create table public.hr_workforce_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  business_unit_org_unit_id uuid references public.hr_org_units(id) on delete restrict,
  plan_code text not null,
  name text not null,
  description text,
  effective_from date not null,
  effective_to date,
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'workforce_planning_owner', 'workforce-planning',
    'planning_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (plan_code = lower(plan_code)),
  check (length(trim(name)) > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_workforce_plan_budget_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid not null references public.hr_workforce_plans(id) on delete restrict,
  budget_ref text,
  cost_center_id uuid,
  fiscal_year text not null,
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'budget_runtime_implemented', false,
    'finance_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(fiscal_year)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_headcount_plan_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid not null references public.hr_workforce_plans(id) on delete restrict,
  scope_level public.hr_headcount_scope_level not null,
  department_id uuid references public.hr_org_units(id) on delete restrict,
  team_id uuid references public.hr_org_units(id) on delete restrict,
  position_id uuid references public.hr_positions(id) on delete restrict,
  job_id uuid references public.hr_jobs(id) on delete restrict,
  planned_headcount integer not null default 0 check (planned_headcount >= 0),
  current_headcount integer not null default 0 check (current_headcount >= 0),
  approved_positions integer not null default 0 check (approved_positions >= 0),
  filled_positions integer not null default 0 check (filled_positions >= 0),
  vacant_positions integer not null default 0 check (vacant_positions >= 0),
  frozen_positions integer not null default 0 check (frozen_positions >= 0),
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'headcount_runtime_calculation_implemented', false
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

create table public.hr_position_capacity_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid references public.hr_workforce_plans(id) on delete restrict,
  position_id uuid not null references public.hr_positions(id) on delete restrict,
  approved_capacity integer not null default 1 check (approved_capacity >= 0),
  occupied_capacity integer not null default 0 check (occupied_capacity >= 0),
  vacant_capacity integer not null default 0 check (vacant_capacity >= 0),
  reserved_capacity integer not null default 0 check (reserved_capacity >= 0),
  hiring_required boolean not null default false,
  allows_multiple_employees boolean not null default true,
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'one_position_one_employee_assumption', false
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

create table public.hr_workforce_vacancies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid references public.hr_workforce_plans(id) on delete restrict,
  position_id uuid not null references public.hr_positions(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  department_id uuid not null references public.hr_org_units(id) on delete restrict,
  vacancy_reason public.hr_vacancy_reason not null,
  status public.hr_workforce_vacancy_status not null default 'planned',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'recruitment_runtime_implemented', false
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

create table public.hr_hiring_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid references public.hr_workforce_plans(id) on delete restrict,
  vacancy_id uuid references public.hr_workforce_vacancies(id) on delete restrict,
  requested_position_id uuid not null references public.hr_positions(id) on delete restrict,
  required_date date not null,
  justification text not null,
  priority public.hr_hiring_request_priority not null default 'normal',
  approval_status public.hr_hiring_request_approval_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'candidate_processing_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(justification)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_workforce_forecast_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid not null references public.hr_workforce_plans(id) on delete restrict,
  forecast_type public.hr_workforce_forecast_type not null,
  effective_from date not null,
  effective_to date,
  description text,
  planned_quantity integer check (planned_quantity is null or planned_quantity >= 0),
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'forecast_engine_implemented', false
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

create table public.hr_organization_capacity_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  workforce_plan_id uuid not null references public.hr_workforce_plans(id) on delete restrict,
  scope public.hr_organization_capacity_scope not null,
  org_unit_id uuid references public.hr_org_units(id) on delete restrict,
  planned_capacity integer not null default 0 check (planned_capacity >= 0),
  current_capacity integer not null default 0 check (current_capacity >= 0),
  available_capacity integer not null default 0 check (available_capacity >= 0),
  utilization_rate numeric(8, 4) check (utilization_rate is null or (utilization_rate >= 0 and utilization_rate <= 100)),
  status public.hr_workforce_plan_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'utilization_runtime_calculated', false
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

create unique index hr_workforce_plans_code_active_uq on public.hr_workforce_plans (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  plan_code
) where deleted_at is null;

create unique index hr_workforce_plan_budget_refs_plan_year_active_uq on public.hr_workforce_plan_budget_refs (
  workforce_plan_id,
  fiscal_year
) where deleted_at is null;

create index hr_headcount_plan_lines_plan_idx on public.hr_headcount_plan_lines (
  workforce_plan_id,
  scope_level,
  department_id,
  team_id,
  position_id,
  job_id
) where deleted_at is null;

create unique index hr_position_capacity_plans_position_plan_active_uq on public.hr_position_capacity_plans (
  position_id,
  coalesce(workforce_plan_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where deleted_at is null;

create index hr_workforce_vacancies_position_idx on public.hr_workforce_vacancies (
  tenant_id,
  company_id,
  position_id,
  job_id,
  status,
  vacancy_reason
) where deleted_at is null;

create index hr_hiring_requests_position_idx on public.hr_hiring_requests (
  tenant_id,
  company_id,
  requested_position_id,
  approval_status,
  priority
) where deleted_at is null;

create index hr_workforce_forecast_items_plan_idx on public.hr_workforce_forecast_items (
  workforce_plan_id,
  forecast_type,
  effective_from
) where deleted_at is null;

create index hr_organization_capacity_plans_plan_idx on public.hr_organization_capacity_plans (
  workforce_plan_id,
  scope,
  org_unit_id
) where deleted_at is null;

drop trigger if exists hr_workforce_plans_touch_updated_at on public.hr_workforce_plans;
create trigger hr_workforce_plans_touch_updated_at before update on public.hr_workforce_plans for each row execute function public.touch_platform_row();
drop trigger if exists hr_workforce_plan_budget_refs_touch_updated_at on public.hr_workforce_plan_budget_refs;
create trigger hr_workforce_plan_budget_refs_touch_updated_at before update on public.hr_workforce_plan_budget_refs for each row execute function public.touch_platform_row();
drop trigger if exists hr_headcount_plan_lines_touch_updated_at on public.hr_headcount_plan_lines;
create trigger hr_headcount_plan_lines_touch_updated_at before update on public.hr_headcount_plan_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_position_capacity_plans_touch_updated_at on public.hr_position_capacity_plans;
create trigger hr_position_capacity_plans_touch_updated_at before update on public.hr_position_capacity_plans for each row execute function public.touch_platform_row();
drop trigger if exists hr_workforce_vacancies_touch_updated_at on public.hr_workforce_vacancies;
create trigger hr_workforce_vacancies_touch_updated_at before update on public.hr_workforce_vacancies for each row execute function public.touch_platform_row();
drop trigger if exists hr_hiring_requests_touch_updated_at on public.hr_hiring_requests;
create trigger hr_hiring_requests_touch_updated_at before update on public.hr_hiring_requests for each row execute function public.touch_platform_row();
drop trigger if exists hr_workforce_forecast_items_touch_updated_at on public.hr_workforce_forecast_items;
create trigger hr_workforce_forecast_items_touch_updated_at before update on public.hr_workforce_forecast_items for each row execute function public.touch_platform_row();
drop trigger if exists hr_organization_capacity_plans_touch_updated_at on public.hr_organization_capacity_plans;
create trigger hr_organization_capacity_plans_touch_updated_at before update on public.hr_organization_capacity_plans for each row execute function public.touch_platform_row();

alter table public.hr_workforce_plans enable row level security;
alter table public.hr_workforce_plan_budget_refs enable row level security;
alter table public.hr_headcount_plan_lines enable row level security;
alter table public.hr_position_capacity_plans enable row level security;
alter table public.hr_workforce_vacancies enable row level security;
alter table public.hr_hiring_requests enable row level security;
alter table public.hr_workforce_forecast_items enable row level security;
alter table public.hr_organization_capacity_plans enable row level security;

alter table public.hr_workforce_plans force row level security;
alter table public.hr_workforce_plan_budget_refs force row level security;
alter table public.hr_headcount_plan_lines force row level security;
alter table public.hr_position_capacity_plans force row level security;
alter table public.hr_workforce_vacancies force row level security;
alter table public.hr_hiring_requests force row level security;
alter table public.hr_workforce_forecast_items force row level security;
alter table public.hr_organization_capacity_plans force row level security;

create policy hr_workforce_plans_select on public.hr_workforce_plans for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_workforce_plans_manage on public.hr_workforce_plans for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_workforce_plan_budget_refs_select on public.hr_workforce_plan_budget_refs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_workforce_plan_budget_refs_manage on public.hr_workforce_plan_budget_refs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_headcount_plan_lines_select on public.hr_headcount_plan_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_headcount_plan_lines_manage on public.hr_headcount_plan_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id));

create policy hr_position_capacity_plans_select on public.hr_position_capacity_plans for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_position_capacity_plans_manage on public.hr_position_capacity_plans for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id));

create policy hr_workforce_vacancies_select on public.hr_workforce_vacancies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_workforce_vacancies_manage on public.hr_workforce_vacancies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.vacancies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.vacancies.manage', tenant_id));

create policy hr_hiring_requests_select on public.hr_hiring_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_hiring_requests_manage on public.hr_hiring_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.hiring_requests.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.hiring_requests.manage', tenant_id));

create policy hr_workforce_forecast_items_select on public.hr_workforce_forecast_items for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_workforce_forecast_items_manage on public.hr_workforce_forecast_items for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.workforce.manage', tenant_id));

create policy hr_organization_capacity_plans_select on public.hr_organization_capacity_plans for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.workforce.view', tenant_id));
create policy hr_organization_capacity_plans_manage on public.hr_organization_capacity_plans for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.headcount.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.headcount.manage', 'Manage Headcount Planning', 'Allows managing headcount plan lines, position capacity, and organization capacity plans.', 'high'),
  ('hr.vacancies.manage', 'Manage Workforce Vacancies', 'Allows managing workforce vacancy definitions.', 'high'),
  ('hr.hiring_requests.manage', 'Manage Hiring Requests', 'Allows managing hiring request foundation records.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.headcount.manage',
  'hr.vacancies.manage',
  'hr.hiring_requests.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
