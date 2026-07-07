# Sprint OP-07 — Enterprise Attendance Sync Runtime v2

**Status:** Completed (enhancement)  
**Date:** 2026-07-07  
**Scope:** Attendance Device Sync Center strategy upgrade without architectural regression.

## Objective

Upgrade the Attendance Device Sync Center to enterprise-grade synchronization strategies while preserving the existing runtime pipeline:

```text
Device → Sync Session → Validation → Preview → Import → Attendance Runtime → Attendance Processing → Payroll Snapshots
```

No direct writes to attendance summaries. Imported punches land in `hr_attendance_punch_logs`, then `HrAttendanceService.aggregateAttendanceDay()` runs when `recalculateAttendance` is enabled.

## Supported Sync Strategies

| Strategy | Description |
| --- | --- |
| `incremental` | Default. Downloads punches since `last_successful_sync_at` / checkpoint |
| `specific_date` | Single day via platform `DatePicker` |
| `date_range` | From/to with max 93-day guard |
| `month` | Month + year (payroll closing) |
| `employees` | Filter by selected employees (`EntityLookup`) |
| `departments` | Filter by selected departments |
| `devices` | Multi-device scope (session metadata) |
| `missing_days_recovery` | Detects gaps in recent sync history |
| `force_resync` | Re-download even if imported (`hr.attendance.force-sync`) |

Only one strategy is active per session (`sync_strategy` column + metadata).

## Sync Options

Stored in session metadata (`syncOptions`):

- Include check-in / check-out / break / manual / invalid / device events
- Skip duplicates
- Recalculate attendance (post-import aggregation)
- Dry run (preview only)
- Auto build preview

## Validation Flow

`HrAttendanceDeviceValidationService` evaluates before preview:

- Duplicate punches
- Unknown / inactive employees
- Future / invalid timestamps
- Payroll locked (`hr_attendance_closings`)
- Attendance locked (`hr_attendance_locks`)
- Company / branch mismatch
- Weekend / holiday info
- DST ambiguity warning
- Overlapping punches
- Maximum hours warning

Severities: `info`, `warning`, `error`, `blocking`.

## Locked Period Handling

When locked dates exist in the selected window:

1. Smart recommendation surfaces blocking/warning in wizard
2. Operator must acknowledge locked period
3. Import options: Cancel · Request Reopen (permission) · Import Without Processing (`hr.attendance.reopen`)

## Import Flow

Import modes (`hrAttendanceDeviceImportDecisionSchema`):

- `all`
- `valid_only`
- `selected_employees`
- `selected_days`
- `selected_records`
- `cancel`

Post-import:

1. Insert punch logs (`source = biometric_device`)
2. Optionally aggregate attendance days
3. Write checkpoint on device (`sync_checkpoint`, `last_successful_sync_at`)
4. Persist import report on session

## Checkpoint Strategy

Device columns:

- `last_successful_sync_at` — watermark for incremental sync
- `sync_checkpoint` — `{ checkpointAt, sessionId, strategy, importedCount }`

Session columns:

- `sync_strategy`
- `preview_expires_at` (default 72h draft TTL)

## Recovery Flow

`missing_days_recovery`:

1. Scans last 14 days of completed sync sessions
2. Builds missing date list
3. Downloads only missing window (no duplicate strategy overlap)

## Background Jobs

Sessions continue to queue `hr.attendance-device.sync` background jobs. Progress API (`/api/hr/attendance-devices/sync/[sessionId]/progress`) advances phases; job row persists for resume/audit.

## Permissions

| Permission | Purpose |
| --- | --- |
| `hr.attendance.sync` | Start enterprise sync |
| `hr.attendance.preview` | View sync context / preview |
| `hr.attendance.import` | Approve import |
| `hr.attendance.force-sync` | Force re-sync strategy |
| `hr.attendance.reopen` | Import without processing on locked periods |
| `hr.attendance.devices.sync` | Legacy device sync permission (retained) |

## Key Files

| Area | Path |
| --- | --- |
| Strategy engine | `src/features/hr/application/utils/hr-attendance-device-sync-strategy.ts` |
| Sync runner | `src/features/hr/application/services/hr-attendance-device-sync.runner.ts` |
| Device service | `src/features/hr/application/services/hr-attendance-device.service.ts` |
| Enterprise wizard | `src/app/(erp)/erp/hr/_components/hr-attendance-devices/hr-attendance-device-sync-wizard.tsx` |
| Migration | `supabase/migrations/20260707170000_hr_attendance_sync_runtime_v2.sql` |

## Verification

```bash
npm run typecheck
npm run test -- tests/platform/hr-attendance-device-center.test.ts
```

Manual:

1. Open `/erp/hr/attendance-devices?sync=<deviceId>`
2. Choose incremental / date range / month strategy
3. Confirm recommendations + preview tabs
4. Import valid only → verify punch logs + attendance days

## Follow-up

- Dedicated background worker loop (decouple from browser polling)
- Multi-device parallel download orchestration
- Preview export to Excel
- Auto-sync scheduler wiring (`hr.workforce.auto-sync`)
