-- HR Compensation Batch Issuance — bulk bonuses, incentives, and penalties.

create table if not exists public.hr_compensation_issuance_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  batch_code text not null,
  document_kind text not null check (document_kind in ('bonus', 'incentive', 'penalty')),
  document_subtype text not null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'preview_ready',
      'processing',
      'submitted',
      'approved',
      'partially_approved',
      'rejected',
      'failed'
    )
  ),
  effective_date date not null,
  payroll_period text,
  reason text,
  notes text,
  selection_mode text not null check (
    selection_mode in ('manual', 'by_position', 'by_department', 'by_branch', 'all_active', 'import', 'combined')
  ),
  selection_filters jsonb not null default '{}'::jsonb,
  amount_mode text not null check (amount_mode in ('fixed', 'by_position', 'per_employee')),
  amount_config jsonb not null default '{}'::jsonb,
  employee_count integer not null default 0 check (employee_count >= 0),
  total_amount numeric(18, 2) not null default 0,
  currency_code text not null default 'SAR',
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejection_reason text,
  processing_error text,
  background_job_id uuid references public.background_jobs(id) on delete set null,
  metadata jsonb not null default jsonb_build_object('runtime_implemented', true),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  check (jsonb_typeof(selection_filters) = 'object'),
  check (jsonb_typeof(amount_config) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists hr_compensation_issuance_batches_code_uq
  on public.hr_compensation_issuance_batches (tenant_id, company_id, batch_code)
  where deleted_at is null;

create index if not exists hr_compensation_issuance_batches_status_idx
  on public.hr_compensation_issuance_batches (tenant_id, company_id, document_kind, status, created_at desc)
  where deleted_at is null;

create table if not exists public.hr_compensation_issuance_batch_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  batch_id uuid not null references public.hr_compensation_issuance_batches(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete restrict,
  position_id uuid,
  position_label text,
  amount numeric(18, 2),
  percentage numeric(8, 4),
  currency_code text not null default 'SAR',
  line_status text not null default 'pending' check (
    line_status in ('pending', 'created', 'skipped', 'error')
  ),
  target_document_id uuid,
  target_document_number text,
  skip_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object'),
  unique (batch_id, employee_id)
);

create index if not exists hr_compensation_issuance_batch_lines_batch_idx
  on public.hr_compensation_issuance_batch_lines (batch_id, line_status);

create index if not exists hr_compensation_issuance_batch_lines_employee_idx
  on public.hr_compensation_issuance_batch_lines (tenant_id, employee_id);

alter table public.hr_employee_bonuses
  add column if not exists batch_id uuid references public.hr_compensation_issuance_batches(id) on delete set null;

alter table public.hr_employee_incentives
  add column if not exists batch_id uuid references public.hr_compensation_issuance_batches(id) on delete set null;

alter table public.hr_employee_penalties
  add column if not exists batch_id uuid references public.hr_compensation_issuance_batches(id) on delete set null;

create index if not exists idx_hr_employee_bonuses_batch
  on public.hr_employee_bonuses (tenant_id, batch_id)
  where deleted_at is null and batch_id is not null;

create index if not exists idx_hr_employee_incentives_batch
  on public.hr_employee_incentives (tenant_id, batch_id)
  where deleted_at is null and batch_id is not null;

create index if not exists idx_hr_employee_penalties_batch
  on public.hr_employee_penalties (tenant_id, batch_id)
  where deleted_at is null and batch_id is not null;

drop trigger if exists hr_compensation_issuance_batches_touch_updated_at on public.hr_compensation_issuance_batches;
create trigger hr_compensation_issuance_batches_touch_updated_at
  before update on public.hr_compensation_issuance_batches
  for each row execute function public.touch_platform_row();

drop trigger if exists hr_compensation_issuance_batch_lines_touch_updated_at on public.hr_compensation_issuance_batch_lines;
create trigger hr_compensation_issuance_batch_lines_touch_updated_at
  before update on public.hr_compensation_issuance_batch_lines
  for each row execute function public.touch_platform_row();

alter table public.hr_compensation_issuance_batches enable row level security;
alter table public.hr_compensation_issuance_batch_lines enable row level security;

drop policy if exists tenant_isolation_hr_compensation_issuance_batches on public.hr_compensation_issuance_batches;
create policy tenant_isolation_hr_compensation_issuance_batches
  on public.hr_compensation_issuance_batches
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

drop policy if exists tenant_isolation_hr_compensation_issuance_batch_lines on public.hr_compensation_issuance_batch_lines;
create policy tenant_isolation_hr_compensation_issuance_batch_lines
  on public.hr_compensation_issuance_batch_lines
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
