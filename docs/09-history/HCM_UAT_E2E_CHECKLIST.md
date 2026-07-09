# HCM UAT End-to-End Checklist

**Program:** Program 02 — HCM  
**Version:** E2E Gate v2.0  
**Date:** 2026-07-07  
**Authority:** Enterprise Production Ready gate (5 conditions)

---

## Verdict Criteria

**READY FOR PRODUCTION** when every step below passes on realistic seed data with **no manual SQL, permission bypass, or live-attendance fallback**.

---

## Preconditions

- [ ] Tenant has HR Settings payroll seed (calendar, group, open period)
- [ ] At least 3 employees with active employment profiles and salary packages
- [ ] At least 2 shift definitions with different hours (e.g. 09:00–17:00 and 10:00–18:00)
- [ ] Shift schedules assigned to employees
- [ ] Attendance device registered (or manual punches enabled for UAT)
- [ ] `HR_PAYROLL_ALLOW_LIVE_FALLBACK` is **not** set in the target environment

---

## Operator Cycle

| Step | Action | Expected | Pass |
| --- | --- | --- | --- |
| 1 | Create / verify **Employee** master data | Active profiles, assignments, compensation | [ ] |
| 2 | Register attendance device | Device online, mapping configured | [ ] |
| 3 | Sync device punches | Punches imported, no errors | [ ] |
| 4 | Verify attendance days | Days aggregated, `shift_version_id` populated | [ ] |
| 5 | Submit & approve leave | Balances updated, payroll inputs available | [ ] |
| 6 | Late / early evaluation | Deductions use resolved shift window | [ ] |
| 7 | Overtime candidates | OT minutes use shift duration (not fixed 8h) | [ ] |
| 8 | **Attendance Export** | Batch `completed`, snapshots created | [ ] |
| 9 | Validate payroll period | No blocking validation issues | [ ] |
| 10 | Create payroll run | Run in `draft` / `ready` | [ ] |
| 11 | Validate payroll run | Employment profile checks pass | [ ] |
| 12 | **Payroll Calculate** | Fails without export; succeeds with snapshots only | [ ] |
| 13 | Approve payroll run | Status `approved` | [ ] |
| 14 | Export WPS file | Pipe-delimited file downloads | [ ] |
| 15 | Publish payslips | Payslips + portal publications created | [ ] |
| 16 | Employee portal payslip | Summary visible for linked user | [ ] |
| 17 | Lock payroll period | Status `locked`; attendance mutations blocked | [ ] |
| 18 | Close payroll period | Status `closed`; closing history recorded | [ ] |
| 19 | Reopen (optional drill) | Reopen with reason restores `open` + audit | [ ] |

---

## Automated Smoke Tests

```bash
npm run test -- tests/platform/hr-payroll-snapshot-runtime.test.ts
npm run test -- tests/platform/hcm-production-gate.test.ts
npm run test -- tests/platform/hr-payroll-calculation-runtime.test.ts
```

---

## Production Gate Checklist (5 Conditions)

| # | Condition | Verified |
| --- | --- | --- |
| 1 | Snapshot-only payroll calc (no live fallback in production) | [ ] |
| 2 | Payroll period lifecycle (open → lock → close → reopen) | [ ] |
| 3 | Unified shift resolution (attendance + late/early + OT) | [ ] |
| 4 | Full UAT cycle without manual workarounds | [ ] |
| 5 | Docs updated (`IMPLEMENTATION_STATUS`, `OPERATIONAL_ROADMAP`) | [ ] |

---

## Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| HR Operator | | | |
| Payroll Admin | | | |
| Technical Lead | | | |

**Final Verdict:** [ ] READY FOR PRODUCTION · [ ] NOT READY
