# Sprint OP-11 — Late/Early Runtime Completed (Hardened)

**Date:** 2026-07-07  
**Status:** Completed — production hardened  
**Scope:** Late/early policy engine, violation evaluation from attendance, approval workflow, payroll input reader, export lifecycle  
**Out of scope:** Payroll calculation engine, attendance runtime redesign, deduction math in payroll

---

## Goal

Late/Early Management reaches production maturity equal to OP-09 Leave and OP-10 Overtime. Attendance records punch facts and triggers evaluation only; payroll export reads late/early minutes exclusively via `HrLateEarlyPayrollInputService`.

---

## Hardening Delivered (2026-07-07)

### P0 — Production gates

| Item | Implementation |
| --- | --- |
| Assignment resolver integration | `HrLateEarlyPolicyEngine.resolveActivePolicy({ employeeId, workDate })` uses `HrAssignmentResolverService` + `hr_late_early_policy_assignments` with precedence: employee → contract → shift → department → branch → company |
| Shift integration | `resolveExpectedShiftWindow()` reads `hr_shift_schedules` / `hr_shift_schedule_lines` / `hr_shift_versions` via assignment resolver; falls back to policy defaults |
| Validation engine | New `HrLateEarlyValidationEngine` — inactive employee, payroll lock, exported attendance day checks |
| Violation export lifecycle | `markViolationsExportedForPeriod()` on attendance payroll export — status `exported_to_payroll`, approval events, `HR_LATE_EARLY_RUNTIME_AUDIT_ACTIONS.violationExported` |
| Snapshot deduction fields | Migration `20260707170100` adds `deduction_minutes` to `hr_attendance_payroll_snapshots`; populated from `approvedDeductionMinutes` |

### P1 — Operational parity

| Item | Implementation |
| --- | --- |
| Daily/weekly/monthly limits | Ledger-aware aggregation in policy engine; limit breach forces `submitted` status |
| `deductionMethod` rules | `minutes`, `half_day`, `full_day`, `none` via `computeDeductionMinutes()` |
| Policy assignment CRUD | `createPolicyAssignment()` + schema/action/UI on late-early page |
| Cancel/override actions | `cancelViolation()`, `overrideViolation()` with ledger deltas + audit |
| Recalculation on correction | `evaluateAttendanceDay()` updates existing violations; soft-cancels when punches clear |
| Employee profile timeline | `hr_late_early_approval_events` wired in `hr-employee-profile.loader.ts` |
| Approve/reject notifications | Parity with overtime — `violationApproved` / `violationRejected` event keys |
| Public API registry | `late-early-foundation.ts` wired into `HR_FOUNDATION_CONTRACTS`, audit actions, events, export contract |
| Dead workspace removed | `hr-late-early-workspace.tsx` deleted (unused duplicate of time-policies shell) |

### P2 — MSS / reports / UX

| Item | Implementation |
| --- | --- |
| MSS manager queue | Loader filters violations/dashboard by manager direct reports when user has `hr.late.approve` without `hr.late.manage` |
| Reports period filters | `/erp/hr/late-early/reports` accepts `periodStart` / `periodEnd` query params |
| Employee rollup | Reports page aggregates late/early/deduction by employee |
| PlatformTimeline | Late/early workspace renders approval timeline events |
| Behavioral tests | Deduction math, assignment/export/validation engine presence, public-api wiring |

---

## Key Files

| Area | Path |
|------|------|
| Migration (base) | `supabase/migrations/20260707160000_hr_late_early_runtime_production.sql` |
| Migration (hardening) | `supabase/migrations/20260707170100_hr_late_early_runtime_hardening.sql` |
| Foundation | `src/features/hr/late-early-foundation.ts` |
| Policy engine | `src/features/hr/application/services/hr-late-early-policy.engine.ts` |
| Validation engine | `src/features/hr/application/services/hr-late-early-validation.engine.ts` |
| Violation engine | `src/features/hr/application/services/hr-late-early-violation.engine.ts` |
| Runtime service | `src/features/hr/application/services/hr-late-early-runtime.service.ts` |
| Payroll export integration | `src/features/hr/application/services/hr-attendance-payroll-export.service.ts` |
| Actions | `src/features/hr/routes/actions/hr-late-early-runtime.actions.ts` |
| Loader | `src/features/hr/routes/loaders/hr-late-early-runtime.loader.ts` |
| UI | `src/app/(erp)/erp/hr/late-early/page.tsx` |
| Reports | `src/app/(erp)/erp/hr/late-early/reports/page.tsx` |
| Tests | `tests/platform/hr-late-early-runtime.test.ts` |

---

## Architecture Notes

- Mirrors OP-09 leave and OP-10 overtime runtime patterns
- `policyResultsCalculatedInAttendance: false` — evaluation lives in Late/Early runtime
- `HrLateEarlyPayrollInputService` is sole payroll reader for late/early
- Does not implement Payroll Calculation Engine

---

## Remaining Gaps

- Department-level rollup requires org-unit assignment data enrichment (currently employee rollup only)
- Full MSS approval actions from portal (deferred to OP-27; ERP manager queue shipped)
- Override violation UI form (service/action exists; inline modal deferred)
- Integration tests against live Supabase (structural + behavioral unit tests only)

---

## Verification

```bash
npm run lint
npm run typecheck
node --import tsx --test tests/platform/hr-late-early-runtime.test.ts
```

Apply migrations `20260707160000` and `20260707170100` on target Supabase project before production use.
