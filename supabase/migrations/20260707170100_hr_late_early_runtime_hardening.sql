-- OP-11 hardening: payroll snapshot deduction_minutes for late/early approved deductions.

alter table public.hr_attendance_payroll_snapshots
  add column if not exists deduction_minutes integer not null default 0 check (deduction_minutes >= 0);
