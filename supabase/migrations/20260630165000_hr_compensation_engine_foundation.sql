-- Nexora HR Compensation Engine Foundation.
-- Foundation contracts only. No payroll calculations, payroll batch, attendance runtime,
-- HR actions, ESS/MSS, finance postings, production runtime, or CRUD screens.

create type public.hr_compensation_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.hr_compensation_earning_or_deduction as enum ('earning', 'deduction');
create type public.hr_compensation_fixed_or_formula as enum ('fixed', 'formula');
create type public.hr_compensation_rounding_rule as enum ('none', 'nearest', 'up', 'down', 'bankers');
create type public.hr_compensation_override_type as enum ('amount', 'rate', 'formula');
create type public.hr_salary_package_line_requirement as enum ('required', 'optional');

create table public.hr_compensation_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  label text not null,
  earning_or_deduction public.hr_compensation_earning_or_deduction not null,
  description text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(label)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_compensation_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  category_id uuid not null references public.hr_compensation_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status public.hr_compensation_status not null default 'draft',
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

create table public.hr_compensation_component_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  component_id uuid not null references public.hr_compensation_components(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  earning_or_deduction public.hr_compensation_earning_or_deduction not null,
  fixed_or_formula public.hr_compensation_fixed_or_formula not null default 'fixed',
  default_amount numeric(18, 4),
  default_rate numeric(18, 6),
  currency text not null default 'USD',
  taxable boolean not null default true,
  insurable boolean not null default false,
  included_in_end_of_service boolean not null default false,
  included_in_gross_salary boolean not null default true,
  appears_on_payslip boolean not null default true,
  employer_cost boolean not null default false,
  employee_cost boolean not null default true,
  display_order integer not null default 100 check (display_order >= 0),
  rounding_rule public.hr_compensation_rounding_rule not null default 'nearest',
  formula_metadata jsonb not null default jsonb_build_object('runtime_evaluation_implemented', false),
  effective_from date not null,
  effective_to date,
  status public.hr_compensation_status not null default 'draft',
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
  check (fixed_or_formula <> 'fixed' or default_amount is not null or default_rate is not null or formula_metadata <> '{}'::jsonb),
  check (jsonb_typeof(formula_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_compensation_component_versions
  add constraint hr_compensation_component_versions_one_active_version_per_range
  exclude using gist (
    tenant_id with =,
    component_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_compensation_structures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  employment_type public.hr_employment_type,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  status public.hr_compensation_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
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

create table public.hr_compensation_structure_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  structure_id uuid not null references public.hr_compensation_structures(id) on delete restrict,
  component_version_id uuid not null references public.hr_compensation_component_versions(id) on delete restrict,
  is_default boolean not null default true,
  display_order integer not null default 100 check (display_order >= 0),
  effective_from date not null,
  effective_to date,
  status public.hr_compensation_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
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

create table public.hr_salary_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  structure_id uuid not null references public.hr_compensation_structures(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  grade_id uuid references public.hr_grades(id) on delete restrict,
  employment_type public.hr_employment_type,
  status public.hr_compensation_status not null default 'draft',
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

create table public.hr_salary_package_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  salary_package_id uuid not null references public.hr_salary_packages(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  effective_from date not null,
  effective_to date,
  status public.hr_compensation_status not null default 'draft',
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
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_salary_package_versions
  add constraint hr_salary_package_versions_one_active_version_per_range
  exclude using gist (
    tenant_id with =,
    salary_package_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') with &&
  )
  where (deleted_at is null and status = 'active');

create table public.hr_salary_package_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  salary_package_version_id uuid not null references public.hr_salary_package_versions(id) on delete restrict,
  component_version_id uuid not null references public.hr_compensation_component_versions(id) on delete restrict,
  amount_override numeric(18, 4),
  rate_override numeric(18, 6),
  formula_metadata_override jsonb not null default '{}'::jsonb,
  eligibility_policy_version_id uuid references public.hr_policy_versions(id) on delete restrict,
  display_order integer not null default 100 check (display_order >= 0),
  requirement public.hr_salary_package_line_requirement not null default 'required',
  effective_from date not null,
  effective_to date,
  status public.hr_compensation_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'eligibility_policy_reference_only', true,
    'runtime_evaluation_implemented', false
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
  check (jsonb_typeof(formula_metadata_override) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_employee_compensation_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employment_profile_id uuid not null references public.hr_employment_profiles(id) on delete restrict,
  component_version_id uuid not null references public.hr_compensation_component_versions(id) on delete restrict,
  package_line_id uuid references public.hr_salary_package_lines(id) on delete restrict,
  override_type public.hr_compensation_override_type not null,
  amount numeric(18, 4),
  rate numeric(18, 6),
  formula_metadata jsonb not null default jsonb_build_object('runtime_evaluation_implemented', false),
  effective_from date not null,
  effective_to date,
  reason text,
  approval_document_ref uuid,
  status public.hr_compensation_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'does_not_mutate_package_or_component', true,
    'runtime_calculation_implemented', false
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
  check (override_type <> 'amount' or amount is not null),
  check (override_type <> 'rate' or rate is not null),
  check (jsonb_typeof(formula_metadata) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_employment_profiles
  add constraint hr_employment_profiles_salary_package_ref_fk
  foreign key (salary_package_ref) references public.hr_salary_package_versions(id) on delete restrict;

create unique index hr_compensation_categories_key_active_uq on public.hr_compensation_categories (category_key) where deleted_at is null;
create unique index hr_compensation_components_code_active_uq on public.hr_compensation_components (tenant_id, company_id, code) where deleted_at is null;
create unique index hr_compensation_component_versions_component_version_uq on public.hr_compensation_component_versions (tenant_id, component_id, version_no) where deleted_at is null;
create index hr_compensation_component_versions_effective_idx on public.hr_compensation_component_versions (tenant_id, company_id, component_id, status, effective_from, effective_to) where deleted_at is null;
create unique index hr_compensation_structures_code_active_uq on public.hr_compensation_structures (tenant_id, company_id, code) where deleted_at is null;
create index hr_compensation_structure_lines_structure_idx on public.hr_compensation_structure_lines (tenant_id, structure_id, status, effective_from, effective_to) where deleted_at is null;
create unique index hr_salary_packages_code_active_uq on public.hr_salary_packages (tenant_id, company_id, code) where deleted_at is null;
create unique index hr_salary_package_versions_package_version_uq on public.hr_salary_package_versions (tenant_id, salary_package_id, version_no) where deleted_at is null;
create index hr_salary_package_versions_effective_idx on public.hr_salary_package_versions (tenant_id, company_id, salary_package_id, status, effective_from, effective_to) where deleted_at is null;
create index hr_salary_package_lines_version_idx on public.hr_salary_package_lines (tenant_id, salary_package_version_id, status, display_order) where deleted_at is null;
create index hr_employee_compensation_overrides_profile_idx on public.hr_employee_compensation_overrides (tenant_id, employment_profile_id, status, effective_from, effective_to) where deleted_at is null;

create or replace function public.prevent_hr_compensation_component_version_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('active', 'inactive', 'archived')
    and (
      old.component_id is distinct from new.component_id
      or old.version_no is distinct from new.version_no
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
      or old.earning_or_deduction is distinct from new.earning_or_deduction
      or old.fixed_or_formula is distinct from new.fixed_or_formula
      or old.default_amount is distinct from new.default_amount
      or old.default_rate is distinct from new.default_rate
      or old.currency is distinct from new.currency
      or old.taxable is distinct from new.taxable
      or old.insurable is distinct from new.insurable
      or old.included_in_end_of_service is distinct from new.included_in_end_of_service
      or old.included_in_gross_salary is distinct from new.included_in_gross_salary
      or old.appears_on_payslip is distinct from new.appears_on_payslip
      or old.employer_cost is distinct from new.employer_cost
      or old.employee_cost is distinct from new.employee_cost
      or old.display_order is distinct from new.display_order
      or old.rounding_rule is distinct from new.rounding_rule
      or old.formula_metadata is distinct from new.formula_metadata
    )
  then
    raise exception 'Historical HR compensation component versions are immutable; create a new component version instead.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_hr_salary_package_version_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('active', 'inactive', 'archived')
    and (
      old.salary_package_id is distinct from new.salary_package_id
      or old.version_no is distinct from new.version_no
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
    )
  then
    raise exception 'Historical HR salary package versions are immutable; create a new package version instead.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_compensation_component_version_history_rewrite() from public;
grant execute on function public.prevent_hr_compensation_component_version_history_rewrite() to authenticated;
revoke all on function public.prevent_hr_salary_package_version_history_rewrite() from public;
grant execute on function public.prevent_hr_salary_package_version_history_rewrite() to authenticated;

drop trigger if exists hr_compensation_component_versions_prevent_history_rewrite on public.hr_compensation_component_versions;
create trigger hr_compensation_component_versions_prevent_history_rewrite before update on public.hr_compensation_component_versions for each row execute function public.prevent_hr_compensation_component_version_history_rewrite();

drop trigger if exists hr_salary_package_versions_prevent_history_rewrite on public.hr_salary_package_versions;
create trigger hr_salary_package_versions_prevent_history_rewrite before update on public.hr_salary_package_versions for each row execute function public.prevent_hr_salary_package_version_history_rewrite();

drop trigger if exists hr_compensation_categories_touch_updated_at on public.hr_compensation_categories;
create trigger hr_compensation_categories_touch_updated_at before update on public.hr_compensation_categories for each row execute function public.touch_platform_row();
drop trigger if exists hr_compensation_components_touch_updated_at on public.hr_compensation_components;
create trigger hr_compensation_components_touch_updated_at before update on public.hr_compensation_components for each row execute function public.touch_platform_row();
drop trigger if exists hr_compensation_component_versions_touch_updated_at on public.hr_compensation_component_versions;
create trigger hr_compensation_component_versions_touch_updated_at before update on public.hr_compensation_component_versions for each row execute function public.touch_platform_row();
drop trigger if exists hr_compensation_structures_touch_updated_at on public.hr_compensation_structures;
create trigger hr_compensation_structures_touch_updated_at before update on public.hr_compensation_structures for each row execute function public.touch_platform_row();
drop trigger if exists hr_compensation_structure_lines_touch_updated_at on public.hr_compensation_structure_lines;
create trigger hr_compensation_structure_lines_touch_updated_at before update on public.hr_compensation_structure_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_salary_packages_touch_updated_at on public.hr_salary_packages;
create trigger hr_salary_packages_touch_updated_at before update on public.hr_salary_packages for each row execute function public.touch_platform_row();
drop trigger if exists hr_salary_package_versions_touch_updated_at on public.hr_salary_package_versions;
create trigger hr_salary_package_versions_touch_updated_at before update on public.hr_salary_package_versions for each row execute function public.touch_platform_row();
drop trigger if exists hr_salary_package_lines_touch_updated_at on public.hr_salary_package_lines;
create trigger hr_salary_package_lines_touch_updated_at before update on public.hr_salary_package_lines for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_compensation_overrides_touch_updated_at on public.hr_employee_compensation_overrides;
create trigger hr_employee_compensation_overrides_touch_updated_at before update on public.hr_employee_compensation_overrides for each row execute function public.touch_platform_row();

alter table public.hr_compensation_categories enable row level security;
alter table public.hr_compensation_components enable row level security;
alter table public.hr_compensation_component_versions enable row level security;
alter table public.hr_compensation_structures enable row level security;
alter table public.hr_compensation_structure_lines enable row level security;
alter table public.hr_salary_packages enable row level security;
alter table public.hr_salary_package_versions enable row level security;
alter table public.hr_salary_package_lines enable row level security;
alter table public.hr_employee_compensation_overrides enable row level security;

alter table public.hr_compensation_categories force row level security;
alter table public.hr_compensation_components force row level security;
alter table public.hr_compensation_component_versions force row level security;
alter table public.hr_compensation_structures force row level security;
alter table public.hr_compensation_structure_lines force row level security;
alter table public.hr_salary_packages force row level security;
alter table public.hr_salary_package_versions force row level security;
alter table public.hr_salary_package_lines force row level security;
alter table public.hr_employee_compensation_overrides force row level security;

create policy hr_compensation_categories_select on public.hr_compensation_categories for select to authenticated
  using (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.compensation.view', tenant_id)));
create policy hr_compensation_categories_manage on public.hr_compensation_categories for all to authenticated
  using (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.compensation.manage', tenant_id)))
  with check (is_active = true and deleted_at is null and exists (select 1 from unnest(public.current_tenant_ids()) as tenant_id where public.has_permission('hr.compensation.manage', tenant_id)));

create policy hr_compensation_components_select on public.hr_compensation_components for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.compensation.view', tenant_id));
create policy hr_compensation_components_manage on public.hr_compensation_components for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id));

create policy hr_compensation_component_versions_select on public.hr_compensation_component_versions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.compensation.view', tenant_id));
create policy hr_compensation_component_versions_manage on public.hr_compensation_component_versions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id));

create policy hr_compensation_structures_select on public.hr_compensation_structures for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.compensation.view', tenant_id));
create policy hr_compensation_structures_manage on public.hr_compensation_structures for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id));

create policy hr_compensation_structure_lines_select on public.hr_compensation_structure_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.compensation.view', tenant_id));
create policy hr_compensation_structure_lines_manage on public.hr_compensation_structure_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.compensation.manage', tenant_id));

create policy hr_salary_packages_select on public.hr_salary_packages for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.salary_packages.view', tenant_id));
create policy hr_salary_packages_manage on public.hr_salary_packages for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id));

create policy hr_salary_package_versions_select on public.hr_salary_package_versions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.salary_packages.view', tenant_id));
create policy hr_salary_package_versions_manage on public.hr_salary_package_versions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id));

create policy hr_salary_package_lines_select on public.hr_salary_package_lines for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.salary_packages.view', tenant_id));
create policy hr_salary_package_lines_manage on public.hr_salary_package_lines for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.salary_packages.manage', tenant_id));

create policy hr_employee_compensation_overrides_select on public.hr_employee_compensation_overrides for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.compensation_overrides.view', tenant_id));
create policy hr_employee_compensation_overrides_manage on public.hr_employee_compensation_overrides for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.compensation_overrides.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.compensation_overrides.manage', tenant_id));

insert into public.hr_compensation_categories (category_key, label, earning_or_deduction)
values
  ('basic_salary', 'Basic Salary', 'earning'),
  ('allowance', 'Allowance', 'earning'),
  ('benefit', 'Benefit', 'earning'),
  ('bonus', 'Bonus', 'earning'),
  ('incentive', 'Incentive', 'earning'),
  ('commission', 'Commission', 'earning'),
  ('overtime', 'Overtime', 'earning'),
  ('deduction', 'Deduction', 'deduction'),
  ('loan', 'Loan', 'deduction'),
  ('advance', 'Advance', 'deduction'),
  ('insurance', 'Insurance', 'deduction'),
  ('tax', 'Tax', 'deduction'),
  ('penalty', 'Penalty', 'deduction'),
  ('employer_contribution', 'Employer Contribution', 'earning'),
  ('employee_contribution', 'Employee Contribution', 'deduction'),
  ('reimbursement', 'Reimbursement', 'earning'),
  ('adjustment', 'Adjustment', 'earning')
on conflict do nothing;

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.compensation.view', 'View HR Compensation', 'Allows viewing compensation components, structures, and component versions.', 'high'),
  ('hr.compensation.manage', 'Manage HR Compensation', 'Allows managing compensation components, structures, and component versions.', 'critical'),
  ('hr.salary_packages.view', 'View Salary Packages', 'Allows viewing salary packages, versions, and package lines.', 'high'),
  ('hr.salary_packages.manage', 'Manage Salary Packages', 'Allows managing salary packages, versions, and package lines.', 'critical'),
  ('hr.compensation_overrides.view', 'View Compensation Overrides', 'Allows viewing employee compensation overrides.', 'high'),
  ('hr.compensation_overrides.manage', 'Manage Compensation Overrides', 'Allows managing employee compensation overrides.', 'critical')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.compensation.view',
  'hr.compensation.manage',
  'hr.salary_packages.view',
  'hr.salary_packages.manage',
  'hr.compensation_overrides.view',
  'hr.compensation_overrides.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
