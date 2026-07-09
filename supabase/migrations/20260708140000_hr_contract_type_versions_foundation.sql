-- HR Contract Type Versions foundation
-- Versioned contract types with ordered articles; legal evidence snapshot on hr_contracts.

create type public.hr_contract_type_status as enum ('active', 'archived');
create type public.hr_contract_type_version_status as enum ('draft', 'active', 'archived');

create table public.hr_contract_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  code text not null,
  name text not null,
  name_ar text,
  default_probation_days integer check (default_probation_days is null or default_probation_days >= 0),
  requires_end_date boolean not null default false,
  status public.hr_contract_type_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'legal_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(code)) > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_contract_types_code_active_uq
  on public.hr_contract_types (tenant_id, company_id, code)
  where deleted_at is null;

create index hr_contract_types_company_status_idx
  on public.hr_contract_types (tenant_id, company_id, status)
  where deleted_at is null;

create table public.hr_contract_type_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  contract_type_id uuid not null references public.hr_contract_types(id) on delete restrict,
  version_no integer not null check (version_no > 0),
  status public.hr_contract_type_version_status not null default 'draft',
  parent_version_id uuid references public.hr_contract_type_versions(id) on delete restrict,
  change_summary text,
  notes text,
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'legal_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  row_version integer not null default 1 check (row_version > 0),
  check (parent_version_id is null or parent_version_id <> id),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_contract_type_versions_no_uq
  on public.hr_contract_type_versions (contract_type_id, version_no)
  where deleted_at is null;

create unique index hr_contract_type_versions_one_active_uq
  on public.hr_contract_type_versions (contract_type_id)
  where deleted_at is null and status = 'active';

create index hr_contract_type_versions_type_status_idx
  on public.hr_contract_type_versions (tenant_id, company_id, contract_type_id, status)
  where deleted_at is null;

create table public.hr_contract_type_articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  contract_type_version_id uuid not null references public.hr_contract_type_versions(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  code text,
  title_en text not null,
  title_ar text,
  body_en text not null default '',
  body_ar text not null default '',
  is_required boolean not null default true,
  metadata jsonb not null default jsonb_build_object('foundation_only', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(title_en)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index hr_contract_type_articles_sequence_uq
  on public.hr_contract_type_articles (contract_type_version_id, sequence)
  where deleted_at is null;

create index hr_contract_type_articles_version_idx
  on public.hr_contract_type_articles (contract_type_version_id, sequence)
  where deleted_at is null;

alter table public.hr_contracts
  add column if not exists contract_type_version_id uuid references public.hr_contract_type_versions(id) on delete restrict;

create index if not exists hr_contracts_type_version_idx
  on public.hr_contracts (contract_type_version_id)
  where deleted_at is null and contract_type_version_id is not null;

drop trigger if exists hr_contract_types_touch_updated_at on public.hr_contract_types;
create trigger hr_contract_types_touch_updated_at
  before update on public.hr_contract_types
  for each row execute function public.touch_platform_row();

drop trigger if exists hr_contract_type_versions_touch_updated_at on public.hr_contract_type_versions;
create trigger hr_contract_type_versions_touch_updated_at
  before update on public.hr_contract_type_versions
  for each row execute function public.touch_platform_row();

drop trigger if exists hr_contract_type_articles_touch_updated_at on public.hr_contract_type_articles;
create trigger hr_contract_type_articles_touch_updated_at
  before update on public.hr_contract_type_articles
  for each row execute function public.touch_platform_row();

alter table public.hr_contract_types enable row level security;
alter table public.hr_contract_type_versions enable row level security;
alter table public.hr_contract_type_articles enable row level security;

alter table public.hr_contract_types force row level security;
alter table public.hr_contract_type_versions force row level security;
alter table public.hr_contract_type_articles force row level security;

create policy hr_contract_types_select on public.hr_contract_types for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.contracts.view', tenant_id)
  );

create policy hr_contract_types_manage on public.hr_contract_types for all to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  )
  with check (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  );

create policy hr_contract_type_versions_select on public.hr_contract_type_versions for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.contracts.view', tenant_id)
  );

create policy hr_contract_type_versions_manage on public.hr_contract_type_versions for all to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  )
  with check (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  );

create policy hr_contract_type_articles_select on public.hr_contract_type_articles for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and public.has_permission('hr.contracts.view', tenant_id)
  );

create policy hr_contract_type_articles_manage on public.hr_contract_type_articles for all to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  )
  with check (
    is_active = true and deleted_at is null
    and public.has_permission('hr.contracts.manage', tenant_id)
  );
