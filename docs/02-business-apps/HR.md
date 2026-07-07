# HR

## Related Documents

- [Operational Roadmap](../00-overview/OPERATIONAL_ROADMAP.md)
- [ERP Navigation](ERP_NAVIGATION.md)
- [HR & Payroll Architecture Freeze](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)
- [HR Production Readiness Report](../09-history/HR_PRODUCTION_READINESS_REPORT.md)

## Workspace Route

Base path: `/erp/hr`

## Status

**In progress — operational sprints OP-01→OP-30 active.** Foundation migrations, permissions, RLS, and 20+ navigation routes are shipped. Wave B time runtimes (OP-08→OP-11) are production-ready. ESS/MSS portal leave workflow shipped 2026-07-07. See [SPRINT_HCM_PRODUCTION_COMPLETION](../09-history/SPRINT_HCM_PRODUCTION_COMPLETION.md).

## Navigation

Canonical nav items are defined in `src/features/hr/navigation/hr-navigation.ts` (`HR_NAV_ITEMS`).

| Route | Label | Status |
| --- | --- | --- |
| `/erp/hr` | HR Dashboard | ready |
| `/erp/hr/employees` | Employees | ready |
| `/erp/hr/organization` | Organization | ready |
| `/erp/hr/positions-jobs` | Positions & Jobs | ready |
| `/erp/hr/assignments` | Assignments | ready |
| `/erp/hr/contracts` | Contracts | ready |
| `/erp/hr/attendance-leave` | Attendance & Leave | ready |
| `/erp/hr/compensation` | Compensation | ready |
| `/erp/hr/payroll-readiness` | Payroll Readiness | ready |
| `/erp/hr/requests` | Requests | ready |
| `/erp/hr/documents` | Documents | ready |
| `/erp/hr/custody` | Custody / Assets | ready |
| `/erp/hr/advances` | Advances | ready |
| `/erp/hr/loans` | Loans | ready |
| `/erp/hr/bonuses` | Bonuses | ready |
| `/erp/hr/incentives` | Incentives | ready |
| `/erp/hr/penalties` | Penalties | ready |
| `/erp/hr/bank-accounts` | Bank Accounts | ready |
| `/erp/hr/attendance-devices` | Attendance Devices | ready |
| `/erp/hr/attendance-processing` | Attendance Processing | ready |
| `/erp/hr/overtime` | Overtime | ready |
| `/erp/hr/time-policies` | Time Policies | ready |
| `/erp/hr/recruitment` | Recruitment | ready |
| `/erp/hr/onboarding` | Onboarding | ready |
| `/erp/hr/training` | Training | ready |
| `/erp/hr/performance` | Performance | ready |
| `/erp/hr/succession` | Succession | ready |
| `/erp/hr/dashboards/department` | Department Dashboard | ready |
| `/erp/hr/dashboards/executive` | Executive Dashboard | ready |
| `/erp/hr/reports` | Reports | ready |
| `/erp/hr/settings` | Settings | ready |

## Self-Service Portal

Base path: `/portal` — separate from ERP shell.

| Route | Label | Status |
| --- | --- | --- |
| `/portal` | ESS Home | ready |
| `/portal/profile` | My Profile | ready |
| `/portal/leave` | My Leave | ready — submit request, balances, history |
| `/portal/attendance` | My Attendance | ready — EnterpriseDataTable day summary |
| `/portal/documents` | My Documents | ready |
| `/portal/payslips` | My Payslips | ready |
| `/portal/requests` | My Requests | ready |
| `/portal/manager` | Manager Home | ready |
| `/portal/manager/approvals` | Approvals | ready — leave approve/reject for direct reports |
| `/portal/manager/team` | My Team | ready |

Portal runtime actions (`src/features/hr/routes/actions/hr-portal.actions.ts`):

- `createPortalLeaveRequestAction` — ESS submit (uses `HrLeaveService`, `hr.leave.manage_self`)
- `approvePortalLeaveRequestAction` / `rejectPortalLeaveRequestAction` — MSS scoped via assignment resolver

Portal RLS: `supabase/migrations/20260722120000_hr_portal_leave_runtime.sql`

Operational runtime APIs:

- `POST /api/hr/employees/import` — CSV bulk import with per-row validation report
- `GET /api/hr/employees/import-template` — import template download
- `GET /api/hr/print/[templateKey]` — HTML print runtime (profile, contract, salary letter, certificate)
- `POST /api/hr/notifications/expiry-scan` — contract/document/probation expiry notification scan
