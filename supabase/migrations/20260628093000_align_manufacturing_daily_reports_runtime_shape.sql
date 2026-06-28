-- Align existing Manufacturing DPR tables with the production-fact shape used by
-- the runtime pages and server actions. Some environments created this table
-- from the lean runtime migration before the foundation DPR columns existed.

alter table public.manufacturing_daily_reports add column if not exists supervisor_ref_id uuid;
alter table public.manufacturing_daily_reports add column if not exists worker_refs jsonb not null default '[]'::jsonb;
alter table public.manufacturing_daily_reports add column if not exists worker_output jsonb not null default '[]'::jsonb;
alter table public.manufacturing_daily_reports add column if not exists notes text;
alter table public.manufacturing_daily_reports add column if not exists attachment_refs jsonb not null default '[]'::jsonb;
alter table public.manufacturing_daily_reports add column if not exists source_for jsonb not null default jsonb_build_array('worker_kpis', 'line_kpis', 'product_kpis', 'inventory_movements', 'cost_facts', 'quality_facts', 'dashboard_facts');
alter table public.manufacturing_daily_reports add column if not exists payroll_calculation_implemented boolean not null default false;
alter table public.manufacturing_daily_reports add column if not exists cost_calculation_implemented boolean not null default false;
alter table public.manufacturing_daily_reports add column if not exists quality_workflow_implemented boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_worker_refs_array_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_worker_refs_array_chk
      check (jsonb_typeof(worker_refs) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_worker_output_array_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_worker_output_array_chk
      check (jsonb_typeof(worker_output) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_attachment_refs_array_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_attachment_refs_array_chk
      check (jsonb_typeof(attachment_refs) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_source_for_array_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_source_for_array_chk
      check (jsonb_typeof(source_for) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_payroll_not_implemented_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_payroll_not_implemented_chk
      check (payroll_calculation_implemented = false);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_cost_not_implemented_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_cost_not_implemented_chk
      check (cost_calculation_implemented = false);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'manufacturing_daily_reports_quality_not_implemented_chk'
      and conrelid = 'public.manufacturing_daily_reports'::regclass
  ) then
    alter table public.manufacturing_daily_reports
      add constraint manufacturing_daily_reports_quality_not_implemented_chk
      check (quality_workflow_implemented = false);
  end if;
end $$;

notify pgrst, 'reload schema';
