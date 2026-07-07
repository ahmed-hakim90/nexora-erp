# Attendance & Workforce Production Runbook

## Health Checks

1. Verify device health scores in ERP → HR → Attendance Devices
2. Review open alerts: `hr_workforce_alerts` where `status = 'open'`
3. Check queue metrics: failed/dead-letter counts per queue

## Device Offline

1. Run `monitorHrDeviceHealthAction(deviceId)`
2. If repeated failure, check `hr_workforce_recovery_incidents`
3. Execute `ping` command via command center
4. Escalate after 4 auto-recovery attempts

## Time Drift

1. Evaluate drift via `evaluateTimeDrift`
2. If blocking (≥300s), run `correctHrDeviceTimeDriftAction` before sync/import

## Replay Incident

1. Create replay session with scope + period
2. Advance through preview stages
3. Approve → publish
4. Rollback uses stored `rollback_payload`

## Verification Commands

```bash
npm run typecheck
npm run lint
npm run test
```

## Disaster Recovery

1. `exportHrDeviceBackupAction(deviceId)` — config + device info
2. Restore via `restore` command with backup payload
3. Verify with `test_connection` command
