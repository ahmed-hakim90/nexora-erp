-- Nexora HR Job Architecture Engine Foundation.
-- Foundation contracts only. No recruitment, payroll calculations, performance,
-- competency runtime, learning, succession planning, or CRUD screens.

create type public.hr_job_requirement_type as enum (
  'education',
  'experience',
  'certification',
  'license',
  'language'
);

create table public.hr_job_families (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  family_code text not null,
  name text not null,
  description text,
  sort_order integer not null default 100 check (sort_order >= 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'job_architecture_owner', 'job-architecture'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (family_code = lower(family_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_job_functions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_family_id uuid not null references public.hr_job_families(id) on delete restrict,
  function_code text not null,
  name text not null,
  description text,
  sort_order integer not null default 100 check (sort_order >= 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'job_architecture_owner', 'job-architecture'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (function_code = lower(function_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_job_levels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  level_code text not null,
  name text not null,
  description text,
  hierarchy_sequence integer not null check (hierarchy_sequence > 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object('foundation_only', true, 'job_architecture_owner', 'job-architecture'),
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

alter table public.hr_grades
  add column if not exists grade_level text,
  add column if not exists description text;

create table public.hr_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_code text not null,
  job_title text not null,
  job_family_id uuid not null references public.hr_job_families(id) on delete restrict,
  job_function_id uuid not null references public.hr_job_functions(id) on delete restrict,
  description text,
  responsibilities text,
  employment_type public.hr_employment_type,
  required_experience text,
  education_level text,
  default_grade_id uuid references public.hr_grades(id) on delete restrict,
  job_level_id uuid references public.hr_job_levels(id) on delete restrict,
  status public.hr_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'job_architecture_owner', 'job-architecture',
    'job_runtime_implemented', false,
    'legacy_job_title_table_superseded', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (job_code = lower(job_code)),
  check (length(trim(job_title)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_career_paths (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  path_code text not null,
  name text not null,
  description text,
  status public.hr_record_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'job_architecture_owner', 'job-architecture',
    'career_path_runtime_implemented', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (path_code = lower(path_code)),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.hr_career_path_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  career_path_id uuid not null references public.hr_career_paths(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  step_sequence integer not null check (step_sequence > 0),
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'job_architecture_owner', 'job-architecture',
    'career_path_runtime_implemented', false
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

create table public.hr_job_requirements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  job_id uuid not null references public.hr_jobs(id) on delete restrict,
  requirement_type public.hr_job_requirement_type not null,
  requirement_key text not null,
  description text,
  is_mandatory boolean not null default true,
  status public.hr_record_status not null default 'active',
  metadata jsonb not null default jsonb_build_object(
    'foundation_only', true,
    'job_architecture_owner', 'job-architecture',
    'skills_integration_ready', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (requirement_key = lower(requirement_key)),
  check (length(trim(requirement_key)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

alter table public.hr_positions
  drop column if exists job_title_id;

alter table public.hr_positions
  add column job_id uuid references public.hr_jobs(id) on delete restrict;

alter table public.hr_positions
  alter column job_id set not null;

create unique index hr_job_families_code_active_uq on public.hr_job_families (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  family_code
) where deleted_at is null;

create unique index hr_job_functions_code_active_uq on public.hr_job_functions (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  job_family_id,
  function_code
) where deleted_at is null;

create unique index hr_job_levels_code_active_uq on public.hr_job_levels (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  level_code
) where deleted_at is null;

create unique index hr_jobs_code_active_uq on public.hr_jobs (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  job_code
) where deleted_at is null;

create unique index hr_career_paths_code_active_uq on public.hr_career_paths (
  tenant_id,
  company_id,
  coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
  path_code
) where deleted_at is null;

create unique index hr_career_path_steps_sequence_active_uq on public.hr_career_path_steps (
  career_path_id,
  step_sequence
) where deleted_at is null;

create unique index hr_career_path_steps_job_active_uq on public.hr_career_path_steps (
  career_path_id,
  job_id
) where deleted_at is null;

create unique index hr_job_requirements_key_active_uq on public.hr_job_requirements (
  job_id,
  requirement_type,
  requirement_key
) where deleted_at is null;

create index hr_job_functions_family_idx on public.hr_job_functions (tenant_id, company_id, job_family_id, sort_order) where deleted_at is null;
create index hr_jobs_family_function_idx on public.hr_jobs (tenant_id, company_id, job_family_id, job_function_id, status) where deleted_at is null;
create index hr_jobs_level_grade_idx on public.hr_jobs (tenant_id, company_id, job_level_id, default_grade_id) where deleted_at is null;
create index hr_career_path_steps_path_idx on public.hr_career_path_steps (career_path_id, step_sequence) where deleted_at is null;
create index hr_job_requirements_job_idx on public.hr_job_requirements (job_id, requirement_type, is_mandatory) where deleted_at is null;
create index hr_positions_job_idx on public.hr_positions (tenant_id, company_id, job_id, status) where deleted_at is null;

drop trigger if exists hr_job_families_touch_updated_at on public.hr_job_families;
create trigger hr_job_families_touch_updated_at before update on public.hr_job_families for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_functions_touch_updated_at on public.hr_job_functions;
create trigger hr_job_functions_touch_updated_at before update on public.hr_job_functions for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_levels_touch_updated_at on public.hr_job_levels;
create trigger hr_job_levels_touch_updated_at before update on public.hr_job_levels for each row execute function public.touch_platform_row();
drop trigger if exists hr_jobs_touch_updated_at on public.hr_jobs;
create trigger hr_jobs_touch_updated_at before update on public.hr_jobs for each row execute function public.touch_platform_row();
drop trigger if exists hr_career_paths_touch_updated_at on public.hr_career_paths;
create trigger hr_career_paths_touch_updated_at before update on public.hr_career_paths for each row execute function public.touch_platform_row();
drop trigger if exists hr_career_path_steps_touch_updated_at on public.hr_career_path_steps;
create trigger hr_career_path_steps_touch_updated_at before update on public.hr_career_path_steps for each row execute function public.touch_platform_row();
drop trigger if exists hr_job_requirements_touch_updated_at on public.hr_job_requirements;
create trigger hr_job_requirements_touch_updated_at before update on public.hr_job_requirements for each row execute function public.touch_platform_row();

alter table public.hr_job_families enable row level security;
alter table public.hr_job_functions enable row level security;
alter table public.hr_job_levels enable row level security;
alter table public.hr_jobs enable row level security;
alter table public.hr_career_paths enable row level security;
alter table public.hr_career_path_steps enable row level security;
alter table public.hr_job_requirements enable row level security;

alter table public.hr_job_families force row level security;
alter table public.hr_job_functions force row level security;
alter table public.hr_job_levels force row level security;
alter table public.hr_jobs force row level security;
alter table public.hr_career_paths force row level security;
alter table public.hr_career_path_steps force row level security;
alter table public.hr_job_requirements force row level security;

create policy hr_job_families_select on public.hr_job_families for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_families_manage on public.hr_job_families for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.job_families.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.job_families.manage', tenant_id));

create policy hr_job_functions_select on public.hr_job_functions for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_functions_manage on public.hr_job_functions for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.job_functions.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.job_functions.manage', tenant_id));

create policy hr_job_levels_select on public.hr_job_levels for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_levels_manage on public.hr_job_levels for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.job_levels.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.job_levels.manage', tenant_id));

create policy hr_jobs_select on public.hr_jobs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_jobs_create on public.hr_jobs for insert to authenticated
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.create', tenant_id));
create policy hr_jobs_update on public.hr_jobs for update to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));
create policy hr_jobs_archive on public.hr_jobs for delete to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.archive', tenant_id));

create policy hr_career_paths_select on public.hr_career_paths for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_career_paths_manage on public.hr_career_paths for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_career_path_steps_select on public.hr_career_path_steps for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_career_path_steps_manage on public.hr_career_path_steps for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

create policy hr_job_requirements_select on public.hr_job_requirements for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id)) and public.has_permission('hr.jobs.view', tenant_id));
create policy hr_job_requirements_manage on public.hr_job_requirements for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.jobs.edit', tenant_id));

drop policy if exists hr_grades_select on public.hr_grades;
drop policy if exists hr_grades_manage on public.hr_grades;

create policy hr_grades_select on public.hr_grades for select to authenticated
  using (
    is_active = true and deleted_at is null
    and public.has_app_access(tenant_id, 'hr')
    and public.has_company_access(tenant_id, company_id)
    and (branch_id is null or public.has_branch_access(tenant_id, company_id, branch_id))
    and (
      public.has_permission('hr.jobs.view', tenant_id)
      or public.has_permission('hr.view', tenant_id)
    )
  );
create policy hr_grades_manage on public.hr_grades for all to authenticated
  using (
    is_active = true and deleted_at is null
    and (
      public.has_permission('hr.job_grades.manage', tenant_id)
      or public.has_permission('hr.manage', tenant_id)
    )
  )
  with check (
    is_active = true and deleted_at is null
    and (
      public.has_permission('hr.job_grades.manage', tenant_id)
      or public.has_permission('hr.manage', tenant_id)
    )
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('hr.jobs.view', 'View Jobs', 'Allows viewing job architecture definitions, families, functions, levels, career paths, and requirements.', 'standard'),
  ('hr.jobs.create', 'Create Jobs', 'Allows creating job definitions in the job architecture foundation.', 'high'),
  ('hr.jobs.edit', 'Edit Jobs', 'Allows editing job definitions, career paths, and job requirements.', 'high'),
  ('hr.jobs.archive', 'Archive Jobs', 'Allows archiving job definitions in the job architecture foundation.', 'high'),
  ('hr.job_families.manage', 'Manage Job Families', 'Allows managing HR job families.', 'high'),
  ('hr.job_functions.manage', 'Manage Job Functions', 'Allows managing HR job functions.', 'high'),
  ('hr.job_grades.manage', 'Manage Job Grades', 'Allows managing HR job grades.', 'high'),
  ('hr.job_levels.manage', 'Manage Job Levels', 'Allows managing HR job levels.', 'high')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'hr.jobs.view',
  'hr.jobs.create',
  'hr.jobs.edit',
  'hr.jobs.archive',
  'hr.job_families.manage',
  'hr.job_functions.manage',
  'hr.job_grades.manage',
  'hr.job_levels.manage'
)
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
