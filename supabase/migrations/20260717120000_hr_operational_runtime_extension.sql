-- HR Operational Runtime Extension (OP-07→OP-23)

do $$ begin
  create type public.hr_overtime_request_status as enum ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'paid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_talent_program_type as enum ('onboarding', 'training', 'performance', 'succession');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hr_talent_program_status as enum ('draft', 'active', 'completed', 'archived', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.hr_overtime_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  work_date date not null,
  hours numeric(8,2) not null check (hours > 0),
  rate_multiplier numeric(6,2) not null default 1.5 check (rate_multiplier > 0),
  reason text not null default '',
  status public.hr_overtime_request_status not null default 'draft',
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
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

create table if not exists public.hr_talent_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  employee_id uuid references public.hr_employees(id) on delete restrict,
  program_type public.hr_talent_program_type not null,
  code text not null,
  title text not null,
  description text,
  status public.hr_talent_program_status not null default 'draft',
  starts_on date,
  ends_on date,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(title)) > 0),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table if not exists public.hr_talent_program_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  program_id uuid not null references public.hr_talent_programs(id) on delete restrict,
  item_key text not null,
  title text not null,
  status text not null default 'pending',
  due_date date,
  metadata jsonb not null default '{}'::jsonb,
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

create index if not exists hr_overtime_requests_employee_idx
  on public.hr_overtime_requests (tenant_id, company_id, employee_id, work_date, status)
  where deleted_at is null;

create index if not exists hr_talent_programs_type_idx
  on public.hr_talent_programs (tenant_id, company_id, program_type, status)
  where deleted_at is null;

create index if not exists hr_talent_program_items_program_idx
  on public.hr_talent_program_items (tenant_id, program_id, status)
  where deleted_at is null;

drop trigger if exists hr_overtime_requests_touch_updated_at on public.hr_overtime_requests;
create trigger hr_overtime_requests_touch_updated_at before update on public.hr_overtime_requests for each row execute function public.touch_platform_row();

drop trigger if exists hr_talent_programs_touch_updated_at on public.hr_talent_programs;
create trigger hr_talent_programs_touch_updated_at before update on public.hr_talent_programs for each row execute function public.touch_platform_row();

drop trigger if exists hr_talent_program_items_touch_updated_at on public.hr_talent_program_items;
create trigger hr_talent_program_items_touch_updated_at before update on public.hr_talent_program_items for each row execute function public.touch_platform_row();

alter table public.hr_overtime_requests enable row level security;
alter table public.hr_talent_programs enable row level security;
alter table public.hr_talent_program_items enable row level security;

alter table public.hr_overtime_requests force row level security;
alter table public.hr_talent_programs force row level security;
alter table public.hr_talent_program_items force row level security;

create policy hr_overtime_requests_select on public.hr_overtime_requests for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.leave.view', tenant_id));

create policy hr_overtime_requests_manage on public.hr_overtime_requests for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.leave.manage', tenant_id));

create policy hr_talent_programs_select on public.hr_talent_programs for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.employees.view', tenant_id));

create policy hr_talent_programs_manage on public.hr_talent_programs for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id));

create policy hr_talent_program_items_select on public.hr_talent_program_items for select to authenticated
  using (is_active = true and deleted_at is null and public.has_app_access(tenant_id, 'hr') and public.has_company_access(tenant_id, company_id) and public.has_permission('hr.employees.view', tenant_id));

create policy hr_talent_program_items_manage on public.hr_talent_program_items for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('hr.employees.manage', tenant_id));
