# Sprint OP-09 — Leave Runtime Completed

**Date:** 2026-07-07  
**Status:** Completed  
**Scope:** Leave policy engine, balance engine, carry forward, encashment, calendar, conflict detection, payroll input reader  
**Out of scope:** Payroll calculation, attendance runtime changes

---

## Goal

Leave Management is production-ready and the official source of leave inputs for payroll snapshots. Attendance export reads Leave Runtime only via `HrLeavePayrollInputService`.

---

## Delivered Runtime

### Policy Engine (`HrLeavePolicyEngine`)
- Active policy resolution per leave type
- Rules: entitlement, eligibility, probation, min/max days, carry forward max, payroll impact, auto-approval
- Policy rules stored in `hr_leave_policies.policy_rules`

### Balance Engine (`HrLeaveBalanceEngine`)
- Available, pending, consumed, scheduled, carried forward, expired, negative, projected
- Ledger in `hr_leave_balance_ledger`
- Recalculate on approval/cancel

### Conflict Engine (`HrLeaveConflictEngine`)
- Duplicate/overlap, holidays, weekends, attendance locked period, insufficient balance, probation

### Carry Forward (`HrLeaveRuntimeService`)
- Preview + execute runs in `hr_leave_carry_forward_runs`
- Scopes: company, policy, anniversary, manual
- Audit + notifications

### Encashment
- `hr_leave_encashment_requests` with partial/full, approval, payroll export flag

### Approval Workflow
- Submit, withdraw, return, approve, reject, cancel
- History in `hr_leave_approval_events`

### Team Calendar & Holidays
- Team leave table in Leave Management workspace
- Holiday list from `hr_holidays` (create via action)

### Payroll Input Reader
- `HrLeavePayrollInputService.getEmployeePayrollInputs()` — canonical API
- Attendance export updated to consume this (no direct leave calculation in attendance)

### Dashboards
- Pending approvals, currently away, balance risk, carry forward due, encashment pending

### UI
- `/erp/hr/leave` — Leave Management workspace
- `/erp/hr/leave/reports` — Balance, ledger, carry forward, encashment reports
- `/erp/hr/attendance-leave` — existing requests/calendar (unchanged attendance tab)

### Permissions
- `hr.leave.carry_forward`
- `hr.leave.encashment`
- `hr.leave.reports.view`
- `hr.leave.calendar.manage`

---

## Key Files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260707140000_hr_leave_runtime_production.sql` |
| Policy engine | `src/features/hr/application/services/hr-leave-policy.engine.ts` |
| Balance engine | `src/features/hr/application/services/hr-leave-balance.engine.ts` |
| Conflict engine | `src/features/hr/application/services/hr-leave-conflict.engine.ts` |
| Runtime service | `src/features/hr/application/services/hr-leave-runtime.service.ts` |
| Leave service | `src/features/hr/application/services/hr-leave.service.ts` |
| Actions | `src/features/hr/routes/actions/hr-leave-runtime.actions.ts` |
| Loader | `src/features/hr/routes/loaders/hr-leave-runtime.loader.ts` |
| UI | `src/app/(erp)/erp/hr/leave/page.tsx` |
| Tests | `tests/platform/hr-leave-runtime.test.ts` |

---

## Architecture Boundaries

- Leave/Absence BC owns leave facts (HR_PAYROLL_ARCHITECTURE_FREEZE_V1)
- Attendance export reads `HrLeavePayrollInputService` only — no leave calculation in attendance
- Payroll consumes snapshots; no payroll calculation in this sprint
- Policies enforced on every leave request — no bypass

---

## Verification

```bash
npm run typecheck
npm run lint
npm run test
```

### Manual UAT

1. Seed leave types + create/activate policies in Settings
2. Submit leave — verify conflict blocking when overlapping
3. Approve leave — verify balance ledger + pending/consumed
4. `/erp/hr/leave` — preview + execute carry forward
5. Create + approve encashment
6. Run attendance export — verify leave days from leave runtime reader

---

## OP-09 Exit Criteria

| Criterion | Status |
|-----------|--------|
| Policy admin + runtime | ✅ |
| Balance engine | ✅ |
| Carry forward operational | ✅ |
| Encashment operational | ✅ |
| Calendar operational | ✅ |
| Reports operational | ✅ |
| Payroll input reader | ✅ |
| No architecture violations | ✅ |

**OP-09: Completed**
