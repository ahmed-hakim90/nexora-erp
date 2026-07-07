-- HR Payroll Localization Framework Foundation.
-- Localization pack registry and statutory rule contracts only.
-- No Saudi/Egypt calculations, GOSI, tax formulas, EOS, or WPS file generation.

do $$
begin
  create type public.hr_payroll_localization_pack_status as enum ('draft', 'active', 'inactive', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hr_payroll_localization_rule_scope as enum ('country', 'legislative_data_group', 'payroll_group', 'employee', 'component');
exception
  when duplicate_object then null;
end $$;

create table public.hr_payroll_localization_packs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  pack_code text not null,
  pack_name text not null,
  country_code text not null,
  pack_version text not null default '1.0.0',
  status public.hr_payroll_localization_pack_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'plugs_into_calculation_engine', true,
    'modifies_calculation_core', false,
    'country_calculations_implemented', false,
    'statutory_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (pack_code = upper(pack_code)),
  check (length(trim(pack_name)) > 0),
  check (length(trim(country_code)) = 2),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_country_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  country_code text not null,
  profile_code text not null,
  profile_name text not null,
  default_currency text not null default 'USD',
  default_timezone text not null default 'UTC',
  localization_pack_id uuid references public.hr_payroll_localization_packs(id) on delete restrict,
  currency_policy_kind public.hr_payroll_currency_policy_kind not null default 'company_base_currency',
  status public.hr_payroll_localization_pack_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'country_calculations_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (profile_code = upper(profile_code)),
  check (length(trim(profile_name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_legislative_data_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  country_profile_id uuid not null references public.hr_payroll_country_profiles(id) on delete restrict,
  group_code text not null,
  group_name text not null,
  effective_from date not null,
  effective_to date,
  status public.hr_payroll_localization_pack_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'statutory_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (group_code = upper(group_code)),
  check (effective_to is null or effective_to >= effective_from),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_statutory_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  localization_pack_id uuid not null references public.hr_payroll_localization_packs(id) on delete restrict,
  legislative_data_group_id uuid references public.hr_payroll_legislative_data_groups(id) on delete restrict,
  rule_code text not null,
  rule_name text not null,
  rule_scope public.hr_payroll_localization_rule_scope not null default 'country',
  component_code text,
  formula_key text not null,
  priority integer not null default 100,
  status public.hr_payroll_localization_pack_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'statutory_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (rule_code = upper(rule_code)),
  check (length(trim(formula_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_statutory_component_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  localization_pack_id uuid not null references public.hr_payroll_localization_packs(id) on delete restrict,
  statutory_rule_id uuid not null references public.hr_payroll_statutory_rules(id) on delete restrict,
  platform_component_code text not null,
  localized_component_code text not null,
  earning_or_deduction text not null check (earning_or_deduction in ('earning', 'deduction', 'employer_contribution', 'informational')),
  status public.hr_payroll_localization_pack_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'mapping_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(platform_component_code)) > 0),
  check (length(trim(localized_component_code)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_payroll_country_calendar_readiness (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  country_profile_id uuid not null references public.hr_payroll_country_profiles(id) on delete restrict,
  calendar_code text not null,
  calendar_name text not null,
  public_holiday_source text,
  weekend_pattern jsonb not null default '{}'::jsonb,
  metadata jsonb not null default jsonb_build_object(
    'localization_foundation_only', true,
    'payroll_calendar_integration_ready', true,
    'holiday_calculation_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (calendar_code = upper(calendar_code)),
  check (jsonb_typeof(weekend_pattern) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_payroll_localization_packs_code_uq
  on public.hr_payroll_localization_packs (tenant_id, company_id, pack_code)
  where deleted_at is null;

create unique index hr_payroll_country_profiles_code_uq
  on public.hr_payroll_country_profiles (tenant_id, company_id, profile_code)
  where deleted_at is null;

create index hr_payroll_statutory_rules_pack_idx
  on public.hr_payroll_statutory_rules (tenant_id, localization_pack_id, status)
  where deleted_at is null;

drop trigger if exists hr_payroll_localization_packs_touch_updated_at on public.hr_payroll_localization_packs;
create trigger hr_payroll_localization_packs_touch_updated_at before update on public.hr_payroll_localization_packs for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_country_profiles_touch_updated_at on public.hr_payroll_country_profiles;
create trigger hr_payroll_country_profiles_touch_updated_at before update on public.hr_payroll_country_profiles for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_legislative_data_groups_touch_updated_at on public.hr_payroll_legislative_data_groups;
create trigger hr_payroll_legislative_data_groups_touch_updated_at before update on public.hr_payroll_legislative_data_groups for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_statutory_rules_touch_updated_at on public.hr_payroll_statutory_rules;
create trigger hr_payroll_statutory_rules_touch_updated_at before update on public.hr_payroll_statutory_rules for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_statutory_component_mappings_touch_updated_at on public.hr_payroll_statutory_component_mappings;
create trigger hr_payroll_statutory_component_mappings_touch_updated_at before update on public.hr_payroll_statutory_component_mappings for each row execute function public.touch_platform_row();
drop trigger if exists hr_payroll_country_calendar_readiness_touch_updated_at on public.hr_payroll_country_calendar_readiness;
create trigger hr_payroll_country_calendar_readiness_touch_updated_at before update on public.hr_payroll_country_calendar_readiness for each row execute function public.touch_platform_row();

alter table public.hr_payroll_localization_packs enable row level security;
alter table public.hr_payroll_country_profiles enable row level security;
alter table public.hr_payroll_legislative_data_groups enable row level security;
alter table public.hr_payroll_statutory_rules enable row level security;
alter table public.hr_payroll_statutory_component_mappings enable row level security;
alter table public.hr_payroll_country_calendar_readiness enable row level security;

alter table public.hr_payroll_localization_packs force row level security;
alter table public.hr_payroll_country_profiles force row level security;
alter table public.hr_payroll_legislative_data_groups force row level security;
alter table public.hr_payroll_statutory_rules force row level security;
alter table public.hr_payroll_statutory_component_mappings force row level security;
alter table public.hr_payroll_country_calendar_readiness force row level security;

create policy hr_payroll_localization_packs_select on public.hr_payroll_localization_packs for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.payroll.localization.view', tenant_id)
  );

create policy hr_payroll_localization_packs_manage on public.hr_payroll_localization_packs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.localization.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.localization.manage', tenant_id));

create policy hr_payroll_country_profiles_select on public.hr_payroll_country_profiles for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_permission('hr.payroll.localization.view', tenant_id)
  );

create policy hr_payroll_country_profiles_manage on public.hr_payroll_country_profiles for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.country_profiles.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.country_profiles.manage', tenant_id));

create policy hr_payroll_statutory_rules_manage on public.hr_payroll_statutory_rules for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.payroll.statutory_rules.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.payroll.statutory_rules.manage', tenant_id));
