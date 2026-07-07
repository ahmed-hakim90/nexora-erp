-- Nexora HR Skills & Competency Engine Foundation.
-- Foundation contracts only. No recruitment, performance, learning runtime,
-- certification renewal, skill assessment, or employee evaluation workflows.

create type public.hr_capability_record_status as enum (
  'draft',
  'active',
  'inactive',
  'expired',
  'superseded',
  'revoked',
  'archived'
);

create table public.hr_skill_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  category_key text not null,
  name text not null,
  description text,
  sort_order integer not null default 100 check (sort_order >= 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  skill_category_id uuid not null references public.hr_skill_categories(id) on delete restrict,
  skill_code text not null,
  name text not null,
  description text,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (skill_code = lower(skill_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_competency_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  category_key text not null,
  name text not null,
  description text,
  sort_order integer not null default 100 check (sort_order >= 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_competencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  competency_category_id uuid not null references public.hr_competency_categories(id) on delete restrict,
  competency_code text not null,
  name text not null,
  description text,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (competency_code = lower(competency_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_proficiency_levels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  level_code text not null,
  name text not null,
  description text,
  sequence integer not null check (sequence > 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'skills_competency_owner', 'skills-competency',
    'scoring_engine_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (level_code = lower(level_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_certification_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  certification_code text not null,
  name text not null,
  issuing_authority text,
  expiration_required boolean not null default false,
  renewal_required boolean not null default false,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'skills_competency_owner', 'skills-competency',
    'renewal_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (certification_code = lower(certification_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_license_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  license_code text not null,
  name text not null,
  validity_period_days integer check (validity_period_days is null or validity_period_days > 0),
  expiration_required boolean not null default true,
  renewal_policy text,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'skills_competency_owner', 'skills-competency',
    'reminder_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (license_code = lower(license_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_language_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  language_code text not null,
  name text not null,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (language_code = lower(language_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_qualification_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  qualification_code text not null,
  name text not null,
  description text,
  qualification_type text not null default 'education',
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'skills_competency_owner', 'skills-competency'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (qualification_code = lower(qualification_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_job_skill_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  skill_id uuid not null references public.hr_skills(id) on delete restrict,
  required_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'references_definition_only', true),
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

create table public.hr_job_competency_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  competency_id uuid not null references public.hr_competencies(id) on delete restrict,
  required_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'references_definition_only', true),
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

create table public.hr_job_certification_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  certification_definition_id uuid not null references public.hr_certification_definitions(id) on delete restrict,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'references_definition_only', true),
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

create table public.hr_job_license_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  license_definition_id uuid not null references public.hr_license_definitions(id) on delete restrict,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'references_definition_only', true),
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

create table public.hr_job_language_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  language_definition_id uuid not null references public.hr_language_definitions(id) on delete restrict,
  reading_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  writing_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  speaking_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'references_definition_only', true),
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

create table public.hr_employee_skill_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  skill_id uuid not null references public.hr_skills(id) on delete restrict,
  proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'evaluation_runtime_implemented', false
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

create table public.hr_employee_competency_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  competency_id uuid not null references public.hr_competencies(id) on delete restrict,
  proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'evaluation_runtime_implemented', false
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

create table public.hr_employee_certification_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  certification_definition_id uuid not null references public.hr_certification_definitions(id) on delete restrict,
  certificate_number text,
  issued_on date,
  expires_on date,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'renewal_runtime_implemented', false
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
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_employee_license_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  license_definition_id uuid not null references public.hr_license_definitions(id) on delete restrict,
  license_number text,
  issued_on date,
  expires_on date,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'reminder_runtime_implemented', false
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
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_employee_language_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  language_definition_id uuid not null references public.hr_language_definitions(id) on delete restrict,
  reading_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  writing_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  speaking_proficiency_level_id uuid references public.hr_proficiency_levels(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'evaluation_runtime_implemented', false),
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

create table public.hr_employee_qualification_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  qualification_definition_id uuid not null references public.hr_qualification_definitions(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  verified_by uuid references auth.users(id),
  verification_date date,
  evidence_file_id uuid,
  status public.hr_capability_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'evaluation_runtime_implemented', false),
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

create unique index hr_skill_categories_key_active_uq on public.hr_skill_categories (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), category_key
) where deleted_at is null;

create unique index hr_skills_code_active_uq on public.hr_skills (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), skill_code
) where deleted_at is null;

create unique index hr_competency_categories_key_active_uq on public.hr_competency_categories (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), category_key
) where deleted_at is null;

create unique index hr_competencies_code_active_uq on public.hr_competencies (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), competency_code
) where deleted_at is null;

create unique index hr_proficiency_levels_code_active_uq on public.hr_proficiency_levels (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), level_code
) where deleted_at is null;

create unique index hr_certification_definitions_code_active_uq on public.hr_certification_definitions (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), certification_code
) where deleted_at is null;

create unique index hr_license_definitions_code_active_uq on public.hr_license_definitions (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), license_code
) where deleted_at is null;

create unique index hr_language_definitions_code_active_uq on public.hr_language_definitions (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), language_code
) where deleted_at is null;

create unique index hr_qualification_definitions_code_active_uq on public.hr_qualification_definitions (
  tenant_id, company_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), qualification_code
) where deleted_at is null;

create unique index hr_job_skill_requirements_active_uq on public.hr_job_skill_requirements (job_id, skill_id) where deleted_at is null;
create unique index hr_job_competency_requirements_active_uq on public.hr_job_competency_requirements (job_id, competency_id) where deleted_at is null;
create unique index hr_job_certification_requirements_active_uq on public.hr_job_certification_requirements (job_id, certification_definition_id) where deleted_at is null;
create unique index hr_job_license_requirements_active_uq on public.hr_job_license_requirements (job_id, license_definition_id) where deleted_at is null;
create unique index hr_job_language_requirements_active_uq on public.hr_job_language_requirements (job_id, language_definition_id) where deleted_at is null;

create index hr_employee_skill_records_employee_idx on public.hr_employee_skill_records (tenant_id, employee_id, skill_id, status) where deleted_at is null;
create index hr_employee_competency_records_employee_idx on public.hr_employee_competency_records (tenant_id, employee_id, competency_id, status) where deleted_at is null;
create index hr_employee_certification_records_employee_idx on public.hr_employee_certification_records (tenant_id, employee_id, certification_definition_id, status) where deleted_at is null;
create index hr_employee_license_records_employee_idx on public.hr_employee_license_records (tenant_id, employee_id, license_definition_id, status) where deleted_at is null;
create index hr_employee_language_records_employee_idx on public.hr_employee_language_records (tenant_id, employee_id, language_definition_id, status) where deleted_at is null;
create index hr_employee_qualification_records_employee_idx on public.hr_employee_qualification_records (tenant_id, employee_id, qualification_definition_id, status) where deleted_at is null;

drop trigger if exists hr_skill_categories_touch_updated_at on public.hr_skill_categories;
create trigger hr_skill_categories_touch_updated_at before update on public.hr_skill_categories for each row execute function public.touch_platform_row();
drop trigger if exists hr_skills_touch_updated_at on public.hr_skills;
create trigger hr_skills_touch_updated_at before update on public.hr_skills for each row execute function public.touch_platform_row();
drop trigger if exists hr_competency_categories_touch_updated_at on public.hr_competency_categories;
create trigger hr_competency_categories_touch_updated_at before update on public.hr_competency_categories for each row execute function public.touch_platform_row();
drop trigger if exists hr_competencies_touch_updated_at on public.hr_competencies;
create trigger hr_competencies_touch_updated_at before update on public.hr_competencies for each row execute function public.touch_platform_row();
drop trigger if exists hr_proficiency_levels_touch_updated_at on public.hr_proficiency_levels;
create trigger hr_proficiency_levels_touch_updated_at before update on public.hr_proficiency_levels for each row execute function public.touch_platform_row();
drop trigger if exists hr_certification_definitions_touch_updated_at on public.hr_certification_definitions;
create trigger hr_certification_definitions_touch_updated_at before update on public.hr_certification_definitions for each row execute function public.touch_platform_row();
drop trigger if exists hr_license_definitions_touch_updated_at on public.hr_license_definitions;
create trigger hr_license_definitions_touch_updated_at before update on public.hr_license_definitions for each row execute function public.touch_platform_row();
drop trigger if exists hr_language_definitions_touch_updated_at on public.hr_language_definitions;
create trigger hr_language_definitions_touch_updated_at before update on public.hr_language_definitions for each row execute function public.touch_platform_row();
drop trigger if exists hr_qualification_definitions_touch_updated_at on public.hr_qualification_definitions;
create trigger hr_qualification_definitions_touch_updated_at before update on public.hr_qualification_definitions for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_skill_requirements_touch_updated_at on public.hr_job_skill_requirements;
create trigger hr_job_skill_requirements_touch_updated_at before update on public.hr_job_skill_requirements for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_competency_requirements_touch_updated_at on public.hr_job_competency_requirements;
create trigger hr_job_competency_requirements_touch_updated_at before update on public.hr_job_competency_requirements for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_certification_requirements_touch_updated_at on public.hr_job_certification_requirements;
create trigger hr_job_certification_requirements_touch_updated_at before update on public.hr_job_certification_requirements for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_license_requirements_touch_updated_at on public.hr_job_license_requirements;
create trigger hr_job_license_requirements_touch_updated_at before update on public.hr_job_license_requirements for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_language_requirements_touch_updated_at on public.hr_job_language_requirements;
create trigger hr_job_language_requirements_touch_updated_at before update on public.hr_job_language_requirements for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_skill_records_touch_updated_at on public.hr_employee_skill_records;
create trigger hr_employee_skill_records_touch_updated_at before update on public.hr_employee_skill_records for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_competency_records_touch_updated_at on public.hr_employee_competency_records;
create trigger hr_employee_competency_records_touch_updated_at before update on public.hr_employee_competency_records for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_certification_records_touch_updated_at on public.hr_employee_certification_records;
create trigger hr_employee_certification_records_touch_updated_at before update on public.hr_employee_certification_records for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_license_records_touch_updated_at on public.hr_employee_license_records;
create trigger hr_employee_license_records_touch_updated_at before update on public.hr_employee_license_records for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_language_records_touch_updated_at on public.hr_employee_language_records;
create trigger hr_employee_language_records_touch_updated_at before update on public.hr_employee_language_records for each row execute function public.touch_platform_row();
drop trigger if exists hr_employee_qualification_records_touch_updated_at on public.hr_employee_qualification_records;
create trigger hr_employee_qualification_records_touch_updated_at before update on public.hr_employee_qualification_records for each row execute function public.touch_platform_row();

alter table public.hr_skill_categories enable row level security;
alter table public.hr_skills enable row level security;
alter table public.hr_competency_categories enable row level security;
alter table public.hr_competencies enable row level security;
alter table public.hr_proficiency_levels enable row level security;
alter table public.hr_certification_definitions enable row level security;
alter table public.hr_license_definitions enable row level security;
alter table public.hr_language_definitions enable row level security;
alter table public.hr_qualification_definitions enable row level security;
alter table public.hr_job_skill_requirements enable row level security;
alter table public.hr_job_competency_requirements enable row level security;
alter table public.hr_job_certification_requirements enable row level security;
alter table public.hr_job_license_requirements enable row level security;
alter table public.hr_job_language_requirements enable row level security;
alter table public.hr_employee_skill_records enable row level security;
alter table public.hr_employee_competency_records enable row level security;
alter table public.hr_employee_certification_records enable row level security;
alter table public.hr_employee_license_records enable row level security;
alter table public.hr_employee_language_records enable row level security;
alter table public.hr_employee_qualification_records enable row level security;

alter table public.hr_skill_categories force row level security;
alter table public.hr_skills force row level security;
alter table public.hr_competency_categories force row level security;
alter table public.hr_competencies force row level security;
alter table public.hr_proficiency_levels force row level security;
alter table public.hr_certification_definitions force row level security;
alter table public.hr_license_definitions force row level security;
alter table public.hr_language_definitions force row level security;
alter table public.hr_qualification_definitions force row level security;
alter table public.hr_job_skill_requirements force row level security;
alter table public.hr_job_competency_requirements force row level security;
alter table public.hr_job_certification_requirements force row level security;
alter table public.hr_job_license_requirements force row level security;
alter table public.hr_job_language_requirements force row level security;
alter table public.hr_employee_skill_records force row level security;
alter table public.hr_employee_competency_records force row level security;
alter table public.hr_employee_certification_records force row level security;
alter table public.hr_employee_license_records force row level security;
alter table public.hr_employee_language_records force row level security;
alter table public.hr_employee_qualification_records force row level security;

create policy hr_skill_categories_select on public.hr_skill_categories for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_skill_categories_manage on public.hr_skill_categories for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

create policy hr_skills_select on public.hr_skills for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_skills_manage on public.hr_skills for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

create policy hr_competency_categories_select on public.hr_competency_categories for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_competency_categories_manage on public.hr_competency_categories for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id));

create policy hr_competencies_select on public.hr_competencies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_competencies_manage on public.hr_competencies for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id));

create policy hr_proficiency_levels_select on public.hr_proficiency_levels for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_proficiency_levels_manage on public.hr_proficiency_levels for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

create policy hr_certification_definitions_select on public.hr_certification_definitions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_certification_definitions_manage on public.hr_certification_definitions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.certifications.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.certifications.manage', tenant_id));

create policy hr_license_definitions_select on public.hr_license_definitions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_license_definitions_manage on public.hr_license_definitions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.licenses.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.licenses.manage', tenant_id));

create policy hr_language_definitions_select on public.hr_language_definitions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_language_definitions_manage on public.hr_language_definitions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.languages.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.languages.manage', tenant_id));

create policy hr_qualification_definitions_select on public.hr_qualification_definitions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_qualification_definitions_manage on public.hr_qualification_definitions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

create policy hr_job_skill_requirements_select on public.hr_job_skill_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_skill_requirements_manage on public.hr_job_skill_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_job_competency_requirements_select on public.hr_job_competency_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_competency_requirements_manage on public.hr_job_competency_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_job_certification_requirements_select on public.hr_job_certification_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_certification_requirements_manage on public.hr_job_certification_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_job_license_requirements_select on public.hr_job_license_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_license_requirements_manage on public.hr_job_license_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_job_language_requirements_select on public.hr_job_language_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_language_requirements_manage on public.hr_job_language_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_employee_skill_records_select on public.hr_employee_skill_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_skill_records_manage on public.hr_employee_skill_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

create policy hr_employee_competency_records_select on public.hr_employee_competency_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_competency_records_manage on public.hr_employee_competency_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.competencies.manage', tenant_id));

create policy hr_employee_certification_records_select on public.hr_employee_certification_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_certification_records_manage on public.hr_employee_certification_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.certifications.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.certifications.manage', tenant_id));

create policy hr_employee_license_records_select on public.hr_employee_license_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_license_records_manage on public.hr_employee_license_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.licenses.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.licenses.manage', tenant_id));

create policy hr_employee_language_records_select on public.hr_employee_language_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_language_records_manage on public.hr_employee_language_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.languages.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.languages.manage', tenant_id));

create policy hr_employee_qualification_records_select on public.hr_employee_qualification_records for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.skills.view', tenant_id));
create policy hr_employee_qualification_records_manage on public.hr_employee_qualification_records for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.skills.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.skills.view', 'View HR Skills', 'Allows viewing skills, competencies, certifications, licenses, languages, and employee capability profiles.', 'standard'),
  ('hr.skills.manage', 'Manage HR Skills', 'Allows managing skills library, proficiency levels, qualifications, and employee skill records.', 'high'),
  ('hr.competencies.manage', 'Manage HR Competencies', 'Allows managing competency library and employee competency records.', 'high'),
  ('hr.certifications.manage', 'Manage HR Certifications', 'Allows managing certification definitions and employee certification records.', 'high'),
  ('hr.licenses.manage', 'Manage HR Licenses', 'Allows managing license definitions and employee license records.', 'high'),
  ('hr.languages.manage', 'Manage HR Languages', 'Allows managing language definitions and employee language records.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.skills.view',
  'hr.skills.manage',
  'hr.competencies.manage',
  'hr.certifications.manage',
  'hr.licenses.manage',
  'hr.languages.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
