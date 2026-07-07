-- HR Employee Financial Services Foundation
-- Additive migration: bank accounts, advances, loans, bonuses, incentives, penalties
-- Non-breaking — all new tables

-- ─── Employee Bank Accounts ───────────────────────────────────────────────────

create table if not exists hr_employee_bank_accounts (
  id                  uuid default gen_random_uuid() primary key,
  tenant_id           uuid not null,
  company_id          uuid not null,
  branch_id           uuid,
  employee_id         uuid not null,
  bank_name           text not null,
  account_holder_name text not null,
  account_number      text not null,
  iban                text,
  swift_code          text,
  currency_code       text not null default 'SAR',
  account_type        text not null default 'current',
  is_primary          boolean not null default false,
  effective_from      date not null,
  effective_to        date,
  status              text not null default 'active',
  notes               text,
  metadata            jsonb,
  created_by          uuid not null,
  updated_by          uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  deleted_by          uuid
);

create index if not exists idx_hr_employee_bank_accounts_tenant on hr_employee_bank_accounts (tenant_id, company_id);
create index if not exists idx_hr_employee_bank_accounts_employee on hr_employee_bank_accounts (employee_id);

alter table hr_employee_bank_accounts enable row level security;

create policy "tenant_isolation_hr_employee_bank_accounts"
  on hr_employee_bank_accounts
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Employee Advances ────────────────────────────────────────────────────────

create table if not exists hr_employee_advances (
  id                    uuid default gen_random_uuid() primary key,
  tenant_id             uuid not null,
  company_id            uuid not null,
  branch_id             uuid,
  employee_id           uuid not null,
  document_number       text not null,
  advance_type          text not null default 'salary',
  requested_amount      numeric(18,2) not null,
  approved_amount       numeric(18,2),
  disbursed_amount      numeric(18,2),
  outstanding_balance   numeric(18,2) not null default 0,
  currency_code         text not null default 'SAR',
  status                text not null default 'draft',
  request_date          date not null,
  approval_date         date,
  disbursement_date     date,
  expected_settlement_date date,
  settlement_date       date,
  deduction_months      int,
  monthly_deduction     numeric(18,2),
  deduction_start_month text,
  reason                text,
  notes                 text,
  approved_by           uuid,
  disbursed_by          uuid,
  settled_by            uuid,
  metadata              jsonb,
  created_by            uuid not null,
  updated_by            uuid not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  deleted_by            uuid
);

create index if not exists idx_hr_employee_advances_tenant on hr_employee_advances (tenant_id, company_id);
create index if not exists idx_hr_employee_advances_employee on hr_employee_advances (employee_id);
create index if not exists idx_hr_employee_advances_status on hr_employee_advances (status);

alter table hr_employee_advances enable row level security;

create policy "tenant_isolation_hr_employee_advances"
  on hr_employee_advances
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Employee Loans ───────────────────────────────────────────────────────────

create table if not exists hr_employee_loans (
  id                    uuid default gen_random_uuid() primary key,
  tenant_id             uuid not null,
  company_id            uuid not null,
  branch_id             uuid,
  employee_id           uuid not null,
  document_number       text not null,
  loan_type             text not null default 'personal',
  principal_amount      numeric(18,2) not null,
  approved_amount       numeric(18,2),
  disbursed_amount      numeric(18,2),
  outstanding_balance   numeric(18,2) not null default 0,
  interest_rate         numeric(8,4) not null default 0,
  currency_code         text not null default 'SAR',
  status                text not null default 'draft',
  request_date          date not null,
  approval_date         date,
  agreement_date        date,
  disbursement_date     date,
  first_installment_date date,
  closure_date          date,
  term_months           int not null default 12,
  monthly_installment   numeric(18,2),
  total_installments    int,
  paid_installments     int not null default 0,
  purpose               text,
  notes                 text,
  approved_by           uuid,
  disbursed_by          uuid,
  closed_by             uuid,
  metadata              jsonb,
  created_by            uuid not null,
  updated_by            uuid not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  deleted_by            uuid
);

create index if not exists idx_hr_employee_loans_tenant on hr_employee_loans (tenant_id, company_id);
create index if not exists idx_hr_employee_loans_employee on hr_employee_loans (employee_id);
create index if not exists idx_hr_employee_loans_status on hr_employee_loans (status);

alter table hr_employee_loans enable row level security;

create policy "tenant_isolation_hr_employee_loans"
  on hr_employee_loans
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Loan Installment Schedule ────────────────────────────────────────────────

create table if not exists hr_employee_loan_installments (
  id                  uuid default gen_random_uuid() primary key,
  tenant_id           uuid not null,
  company_id          uuid not null,
  loan_id             uuid not null references hr_employee_loans(id) on delete cascade,
  employee_id         uuid not null,
  installment_number  int not null,
  due_date            date not null,
  principal_amount    numeric(18,2) not null,
  interest_amount     numeric(18,2) not null default 0,
  total_amount        numeric(18,2) not null,
  paid_amount         numeric(18,2) not null default 0,
  status              text not null default 'pending',
  paid_at             date,
  payroll_period      text,
  notes               text,
  created_by          uuid not null,
  updated_by          uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_hr_loan_installments_loan on hr_employee_loan_installments (loan_id);
create index if not exists idx_hr_loan_installments_employee on hr_employee_loan_installments (employee_id);
create index if not exists idx_hr_loan_installments_due on hr_employee_loan_installments (due_date);

alter table hr_employee_loan_installments enable row level security;

create policy "tenant_isolation_hr_employee_loan_installments"
  on hr_employee_loan_installments
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Employee Bonuses ────────────────────────────────────────────────────────

create table if not exists hr_employee_bonuses (
  id              uuid default gen_random_uuid() primary key,
  tenant_id       uuid not null,
  company_id      uuid not null,
  branch_id       uuid,
  employee_id     uuid not null,
  document_number text not null,
  bonus_type      text not null default 'performance',
  amount          numeric(18,2) not null,
  currency_code   text not null default 'SAR',
  status          text not null default 'draft',
  effective_date  date not null,
  payroll_period  text,
  reason          text,
  notes           text,
  approved_by     uuid,
  approval_date   date,
  metadata        jsonb,
  created_by      uuid not null,
  updated_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid
);

create index if not exists idx_hr_employee_bonuses_tenant on hr_employee_bonuses (tenant_id, company_id);
create index if not exists idx_hr_employee_bonuses_employee on hr_employee_bonuses (employee_id);

alter table hr_employee_bonuses enable row level security;

create policy "tenant_isolation_hr_employee_bonuses"
  on hr_employee_bonuses
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Employee Incentives ─────────────────────────────────────────────────────

create table if not exists hr_employee_incentives (
  id              uuid default gen_random_uuid() primary key,
  tenant_id       uuid not null,
  company_id      uuid not null,
  branch_id       uuid,
  employee_id     uuid not null,
  document_number text not null,
  incentive_type  text not null default 'kpi',
  amount          numeric(18,2),
  percentage      numeric(8,4),
  currency_code   text not null default 'SAR',
  status          text not null default 'draft',
  effective_date  date not null,
  review_period   text,
  score           numeric(8,2),
  notes           text,
  approved_by     uuid,
  approval_date   date,
  metadata        jsonb,
  created_by      uuid not null,
  updated_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid
);

create index if not exists idx_hr_employee_incentives_tenant on hr_employee_incentives (tenant_id, company_id);
create index if not exists idx_hr_employee_incentives_employee on hr_employee_incentives (employee_id);

alter table hr_employee_incentives enable row level security;

create policy "tenant_isolation_hr_employee_incentives"
  on hr_employee_incentives
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- ─── Employee Penalties ──────────────────────────────────────────────────────

create table if not exists hr_employee_penalties (
  id              uuid default gen_random_uuid() primary key,
  tenant_id       uuid not null,
  company_id      uuid not null,
  branch_id       uuid,
  employee_id     uuid not null,
  document_number text not null,
  penalty_type    text not null default 'warning',
  severity        text not null default 'minor',
  amount          numeric(18,2),
  currency_code   text not null default 'SAR',
  status          text not null default 'draft',
  incident_date   date not null,
  effective_date  date,
  payroll_period  text,
  description     text not null,
  notes           text,
  issued_by       uuid,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  appealed        boolean not null default false,
  appeal_outcome  text,
  metadata        jsonb,
  created_by      uuid not null,
  updated_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid
);

create index if not exists idx_hr_employee_penalties_tenant on hr_employee_penalties (tenant_id, company_id);
create index if not exists idx_hr_employee_penalties_employee on hr_employee_penalties (employee_id);
create index if not exists idx_hr_employee_penalties_status on hr_employee_penalties (status);

alter table hr_employee_penalties enable row level security;

create policy "tenant_isolation_hr_employee_penalties"
  on hr_employee_penalties
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
