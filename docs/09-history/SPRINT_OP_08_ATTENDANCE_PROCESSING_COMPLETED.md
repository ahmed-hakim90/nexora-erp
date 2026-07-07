# Sprint OP-08 — Attendance Processing Completed

**Date:** 2026-07-07  
**Status:** Completed  
**Scope:** Attendance lock, payroll readiness, export runtime, snapshots, reopen workflow  
**Out of scope:** OP-10 (Overtime), payroll calculation, localization packs

---

## Goal

Close Operational Sprint **OP-08** so **Attendance** becomes the canonical payroll input source. Payroll consumes immutable attendance snapshots only — never live attendance days.

---

## Delivered Runtime

### 1. Attendance Lock Runtime

- States supported on `hr_attendance_days`: `open` (pending/observed/needs_review/approved), `processing`, `ready_for_payroll`, `locked`, `exported_to_payroll`, `reopened`
- `hr_attendance_locks` with `payroll_locked` level
- Locked/exported days cannot be edited, approved, or adjusted unless reopened with `hr.attendance.reopen`

### 2. Payroll Ready Engine

- `HrAttendancePayrollExportService.refreshClosingReadiness()` computes readiness per closing
- Blockers: pending review, open exceptions, missing punches, open leave/overtime
- Metrics stored on `hr_attendance_closings`: `payroll_ready_percent`, `ready_employee_count`, `blocked_employee_count`

### 3. Payroll Export Runtime

- `executeExport()` creates `hr_attendance_payroll_export_batches` + per-employee `hr_attendance_payroll_snapshots`
- Snapshot fields: worked days/hours, late/early minutes, overtime hours, leave/absence/holiday/weekend days, paid/unpaid days, night hours, shift count
- **No payroll calculation** — attendance inputs only

### 4. Export History

- Batch history: created by/at, employee count, period, status (completed, downloaded, cancelled, re_exported)
- Actions: mark downloaded, cancel, re-export

### 5. Attendance Snapshot Immutability

- DB trigger `prevent_hr_attendance_payroll_snapshot_mutation` blocks payload changes after insert
- `metadata.immutable = true`, `payroll_reads_snapshot_only = true`

### 6. Reopen Workflow

- `reopenClosing()` requires reason (min 10 chars) + `hr.attendance.reopen`
- Audit + payroll warning notification
- Days return to `reopened` status; locks cleared

### 7. Attendance Closing

- Scopes: weekly, monthly, department, branch, company
- Table: `hr_attendance_closings`
- Create → refresh readiness → lock → export lifecycle

### 8. Dashboard Widgets

- **Attendance Processing** page: Payroll Ready %, Locked/Exported/Open Days, Employees Ready/Blocked
- **Attendance Export** page: same metrics + closing table

### 9. Export Screen

- Route: `/erp/hr/attendance-export`
- Filters: period, department, employee (EntityLookup, DatePicker)
- Closing management, export execution, history

### 10. Pre-export Validation

Codes: `missing_punches`, `unapproved_exceptions`, `open_overtime`, `open_leave`, `duplicate_punches`, `future_punches`, `inactive_employee`, `payroll_locked`, `branch_mismatch`, `pending_review`

### 11. Notifications

Events via `hr_operator_notifications`: locked, reopened, exported, payroll ready, export failed

### 12. Background Jobs

Job keys queued to `background_jobs`: `hr.attendance.closing`, `hr.attendance.payroll-export`, `hr.attendance.payroll-snapshot`, `hr.attendance.export-cleanup`

### 13. Audit

Actions in `HR_ATTENDANCE_PAYROLL_AUDIT_ACTIONS`: lock, export, reopen, snapshot, validation

### 14. Reports

Export preview aggregates per-employee payroll input summary (ready/blocked lists in preview API)

### 15. Permissions

- `hr.attendance.lock` (existing)
- `hr.attendance.export` (new)
- `hr.attendance.reopen` (new)
- `hr.attendance.snapshot.view` (new)

---

## Architecture Alignment

- **HR_PAYROLL_ARCHITECTURE_FREEZE_V1:** Attendance Engine owns facts; payroll reads typed snapshot refs only
- **Service → Loader → Action** pattern throughout
- Assignment resolver used for department scoping via `hr_assignments` (`assignment_type = department`)

---

## Key Files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/20260707130000_hr_attendance_payroll_export_runtime.sql` |
| Service | `src/features/hr/application/services/hr-attendance-payroll-export.service.ts` |
| Schemas | `src/features/hr/application/schemas/hr-attendance-payroll-export.schema.ts` |
| Actions | `src/features/hr/routes/actions/hr-attendance-payroll-export.actions.ts` |
| Loader | `src/features/hr/routes/loaders/hr-attendance-export.loader.ts` |
| UI | `src/app/(erp)/erp/hr/attendance-export/page.tsx` |
| Tests | `tests/platform/hr-attendance-payroll-export.test.ts` |

---

## Verification

```bash
npm run typecheck
npm run lint
npm run test
```

### Manual UAT

1. `/erp/hr/attendance-processing` — confirm extended dashboard widgets
2. `/erp/hr/attendance-export` — create monthly closing, refresh readiness, lock
3. Resolve all blockers, run Validate & Export
4. Confirm export history row + snapshots in DB
5. Reopen with reason — confirm payroll warning notification
6. Attempt edit on locked day — expect validation error

---

## OP-08 Exit Criteria

| Criterion | Status |
|-----------|--------|
| Approval queue | ✅ |
| Dashboard | ✅ |
| Payroll lock runtime | ✅ |
| Payroll export runtime | ✅ |
| Immutable snapshots | ✅ |
| Export history | ✅ |
| Reopen workflow | ✅ |

**OP-08: Completed**

---

## Next (Not Started)

- **OP-10:** Overtime workflow (explicitly out of scope for this sprint)
- **OP-07:** Device sync hardening
- **OP-09:** Carry forward runtime calculation
