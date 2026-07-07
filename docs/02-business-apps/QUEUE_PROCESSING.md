# Workforce Queue Processing

## Queues

| Queue Key | Purpose |
| --- | --- |
| `hr-attendance-device` | Sync, import, device commands |
| `hr-workforce-monitoring` | Health polls, capacity checks |
| `hr-workforce-replay` | Attendance replay sessions |
| `hr-workforce-recalculation` | Attendance recalculation |
| `hr-workforce-recovery` | Auto recovery retries |
| `hr-workforce-alerts` | Alert notification dispatch |

## Retry Policy

Auto recovery uses delays: 30s → 1min → 5min → 15min (`HR_AUTO_RECOVERY_RETRY_DELAYS_SECONDS`).

## Metrics

`HrWorkforceEnterpriseService.loadQueueMetrics()` aggregates `background_jobs` per queue and persists snapshots.

## Correlation

Every command, replay, and recalc session carries a `correlation_id` for observability tracing.
