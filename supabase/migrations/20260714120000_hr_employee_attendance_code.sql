-- HR employee attendance_code: device matching key on employee identity (no attendance runtime).
alter table public.hr_employees
  add column if not exists attendance_code text;

alter table public.hr_employees
  drop constraint if exists hr_employees_attendance_code_length_chk;

alter table public.hr_employees
  add constraint hr_employees_attendance_code_length_chk
  check (
    attendance_code is null
    or (
      length(trim(attendance_code)) > 0
      and length(trim(attendance_code)) <= 50
    )
  );

create unique index if not exists hr_employees_attendance_code_active_uq
  on public.hr_employees (tenant_id, company_id, lower(trim(attendance_code)))
  where deleted_at is null
    and attendance_code is not null
    and length(trim(attendance_code)) > 0;

create index if not exists hr_employees_attendance_code_search_idx
  on public.hr_employees (tenant_id, company_id, attendance_code)
  where deleted_at is null and attendance_code is not null;

create extension if not exists pg_trgm with schema extensions;

create index if not exists hr_employees_attendance_code_trgm_idx
  on public.hr_employees using gin (attendance_code extensions.gin_trgm_ops)
  where deleted_at is null and attendance_code is not null;
