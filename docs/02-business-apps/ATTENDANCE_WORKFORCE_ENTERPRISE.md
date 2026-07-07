# Attendance & Workforce Enterprise Architecture

**Sprint:** Attendance & Workforce Enterprise Hardening  
**Status:** Runtime foundations implemented  
**Authority:** [HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)

## Overview

Enterprise hardening extends the existing Attendance Device Center and Workforce runtime without replacing the Service/Loader/Action architecture. Business logic lives in `src/features/hr/application/services/` and device protocols in `src/features/hr/application/device-drivers/`.

## Driver Framework

Pluggable drivers registered in `device-drivers/registry.ts`:

| Driver Key | Protocol | Device Types |
| --- | --- | --- |
| `zkteco` | TCP | zkteco |
| `suprema` | TCP | suprema |
| `hikvision` | REST | hikvision, cloud_attendance |
| `anviz` | TCP | anviz |
| `generic_tcp` | TCP | override |
| `generic_rest` | REST | api_import |
| `sdk` | SDK | fingertec |
| `file_import` | File | excel_import |

Each driver implements: `connect`, `disconnect`, `ping`, `heartbeat`, `downloadUsers`, `uploadUsers`, `downloadPunches`, biometrics upload, `clearLogs`, `restart`, `backup`, `restore`, `syncTime`, `getDeviceInfo`, `getStorageStatus`.

Sync runner (`hr-attendance-device-sync.runner.ts`) resolves drivers per device — mock punch generation removed from primary path.

## Command Center

`HrAttendanceDeviceCommandService` executes remote commands with:

- Audit events (`hr.workforce.device.command.*`)
- Operator notifications
- Execution history in `hr_attendance_device_commands`
- Confirmation gate for sensitive commands

## Health & Monitoring

`HrWorkforceEnterpriseService.monitorDeviceHealth()` writes snapshots to `hr_attendance_device_health_snapshots` and updates device health score (`healthy`, `warning`, `critical`, `offline`, `maintenance`).

## Time Drift Engine

Compares device time vs server time. Blocking threshold: 300 seconds. Corrections audited via `hr.workforce.device.time.drift.corrected`.

## Replay & Recalculation

- **Replay:** `hr_attendance_replay_sessions` — read logs → rebuild → recalc → preview → approve → publish (rollback payload stored)
- **Recalc:** `hr_attendance_recalc_sessions` — reason-tracked recalculation with preview/approval

## Queue Architecture

Queues: `hr-attendance-device`, `hr-workforce-monitoring`, `hr-workforce-replay`, `hr-workforce-recalculation`, `hr-workforce-recovery`, `hr-workforce-alerts`.

Metrics persisted in `hr_workforce_queue_metrics`.

## Background Workers

Defined in `hr-workforce-enterprise.workers.ts`: device monitor, heartbeat, auto sync, queue processor, retry, notification dispatch, capacity monitor, auto recovery, cleanup, replay, recalculation.

## Security

New permissions seeded in migration `20260719140000_hr_attendance_workforce_enterprise_hardening.sql`. Sensitive commands require `confirmed: true` and dedicated permissions for restart/shutdown/factory reset.

## Multi-Company Isolation

All tables include `tenant_id` + `company_id` with RLS policies enforcing `has_company_access` and permission checks.

## Related Docs

- [Device Driver Guide](./DEVICE_DRIVER_GUIDE.md)
- [Queue Processing](./QUEUE_PROCESSING.md)
- [Production Runbook](./PRODUCTION_RUNBOOK.md)
