# Sprint OP-10 — Overtime Runtime Completed

**Date:** 2026-07-07  
**Status:** Completed  
**Scope:** Overtime policy engine, validation, candidates from attendance, approval workflow, payroll input reader  
**Out of scope:** Payroll calculation engine, payroll localization changes

---

## Goal

Overtime Management is production-ready and the official source of overtime inputs for payroll snapshots. Attendance aggregation produces overtime facts; payroll export reads Overtime Runtime only via `HrOvertimePayrollInputService`.

---

## Delivered Runtime

### Policy Engine (`HrOvertimePolicyEngine`)
- Active policy resolution by overtime type and effective dates
- Rules: min/max minutes, daily/weekly/monthly limits, pre-approval, auto-approval, multipliers
- Policies stored in `hr_overtime_policies`

### Validation Engine (`HrOvertimeValidationEngine`)
- Duplicate/overlap, leave conflict, inactive employee, payroll locked attendance, probation, limits

### Attendance Integration (`HrAttendanceService.aggregateAttendanceDay`)
- Calculates `overtime_minutes` from worked vs standard 480min (8h)
- Upserts `hr_overtime_candidates` when overtime > 0
- Creates `overtime_requires_approval` exception when policy requires pre-approval

### Request Lifecycle (`HrOvertimeRuntimeService`)
- Create, submit, approve, reject, cancel, withdraw, return
- Candidate resolution: approve, reject, ignore, convert
- History in `hr_overtime_approval_events`

### Payroll Input Reader
- `HrOvertimePayrollInputService.getEmployeePayrollInputs()` — canonical API
- `countOpenOvertimeOverlappingPeriod()` — export validation
- Attendance export updated to consume this (no direct overtime calculation from attendance days)

### Dashboards
- Pending approvals, pending candidates, approved today, active policies

### UI
- `/erp/hr/overtime` — Overtime Management workspace
- `/erp/hr/overtime/reports` — Register, summary by type, approval history
- Employee profile attendance-leave tab — overtime subsection

### Permissions
- `hr.overtime.view`
- `hr.overtime.manage`
- `hr.overtime.request`
- `hr.overtime.approve`
- `hr.overtime.export`

---

## Key Files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260707150000_hr_overtime_runtime_production.sql` |
| Foundation | `src/features/hr/overtime-foundation.ts` |
| Policy engine | `src/features/hr/application/services/hr-overtime-policy.engine.ts` |
| Validation engine | `src/features/hr/application/services/hr-overtime-validation.engine.ts` |
| Runtime service | `src/features/hr/application/services/hr-overtime-runtime.service.ts` |
| Actions | `src/features/hr/routes/actions/hr-overtime-runtime.actions.ts` |
| Loader | `src/features/hr/routes/loaders/hr-overtime-runtime.loader.ts` |
| UI | `src/app/(erp)/erp/hr/overtime/page.tsx` |
| Reports | `src/app/(erp)/erp/hr/overtime/reports/page.tsx` |
| Tests | `tests/platform/hr-overtime-runtime.test.ts` |

---

## Architecture Notes

- Mirrors OP-09 leave runtime patterns (policy engine, validation, payroll input service, approval events)
- Does not implement Payroll Calculation Engine
- Does not modify Payroll Localization
- Workforce runtime overtime methods deprecated; actions re-export from overtime runtime

---

## Verification

```bash
npm run typecheck
npm test -- tests/platform/hr-overtime-runtime.test.ts
```
