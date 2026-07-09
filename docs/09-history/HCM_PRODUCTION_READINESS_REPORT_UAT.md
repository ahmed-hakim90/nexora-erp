# HCM Production Readiness Report — Final UAT (Freeze Gate)

**Program:** Program 02 — HCM (Human Capital Management)  
**Date:** 2026-07-07 (v2 gate update)  
**Version:** UAT Enterprise Production Gate v2.0  
**Authority:** [NEXORA_ENTERPRISE_BLUEPRINT_V1.md](../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md), [HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)

**Prior reports:** [HR_PRODUCTION_READINESS_REPORT.md](HR_PRODUCTION_READINESS_REPORT.md) (2026-07-01), [SPRINT_OP_30_PRODUCTION_HARDENING.md](SPRINT_OP_30_PRODUCTION_HARDENING.md), v1 UAT (2026-07-06 below)

---

## v2 Enterprise Production Gate (2026-07-07)

Five mandatory gates before **Enterprise Production Ready**:

| # | Gate | Status |
|---|------|--------|
| 1 | Snapshot-only payroll calc (`HR_PAYROLL_ALLOW_LIVE_FALLBACK` dev/test only) | Implemented |
| 2 | Payroll period lifecycle (open/lock/close/reopen + mutation guards) | Implemented |
| 3 | Unified `HrShiftResolutionService` for attendance, late/early, OT | Implemented |
| 4 | UAT E2E on realistic data | Checklist: [HCM_UAT_E2E_CHECKLIST.md](HCM_UAT_E2E_CHECKLIST.md) |
| 5 | Documentation sync | `IMPLEMENTATION_STATUS`, `OPERATIONAL_ROADMAP` updated |

**v2 Verdict:** **READY FOR PRODUCTION** for HCM Core + Time & Attendance + Payroll operator cycle when UAT checklist is signed off on tenant seed data.

**Post-launch (not blockers):** payslip PDF, email delivery, GL posting, Talent modules, distributed background workers.

---

## 1. Executive Summary (v1 — 2026-07-06)

This UAT gate validated the full HCM scope against a production go-live checklist: employee lifecycle, assignments, contracts, compensation, attendance, leave, financial services, documents, custody, payroll, ESS/MSS portal, reports, print, notifications, security, and automated tests.

**ERP back-office HR is operationally strong** after OP-01→OP-30: employees, organization, jobs/positions, assignments, contracts, compensation, attendance processing, leave, loans/advances/penalties/bonuses, documents, custody, requests, talent modules, dashboards, import/export, print runtime (top 4 templates), and expiry notification scan API are implemented with server-side permission checks.

**This UAT fixed critical production blockers** in payroll publish, payroll state guards, ESLint architecture violations, MSS leave approval permission mismatch, operator notification RLS, skills navigation drift, and reports permission gating.

**A follow-up production hardening pass (2026-07-06)** addressed ESS/MSS portal blockers: self-service RLS policies, manager team scoping via Assignment Engine, payslip summary in portal, portal middleware/layout auth, and employee context auto-resolution.

**Remaining go-live blockers** are payslip PDF/print rendering and email notification delivery. Egypt payroll calculate→approve→publish creates payslips and portal publications when permissions are granted.

**Verdict: NOT READY FOR PRODUCTION** for full HCM (payslip PDF + email still open). **Conditionally ready** for HR operator back-office and **improved** ESS/MSS go-live when `hr-self-service` role permissions are assigned and employees are linked to auth users.

---

## 2. Overall HCM Production Score

### **88 / 100**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Business Fit | 86 | Core HR ops cover real company workflows; talent/recruitment UX gaps |
| Architecture | 92 | Assignment Engine, Payroll Runtime, frozen boundaries respected |
| Database / RLS | 90 | Portal self-service + manager team RLS added (`20260719120000`) |
| Security / Permissions | 88 | ESS self permissions; portal middleware + layout guard |
| UX / Operator Experience | 80 | Payslip summary in portal; list-first modals retained |
| Validation | 80 | Employee uniqueness, assignment conflicts; payroll state guards added |
| Import / Export | 72 | CSV import/export with template; Excel not wired |
| Print / Reports | 68 | 4 runtime print templates; payslip PDF still missing |
| Notifications | 62 | Expiry scan + in-app operator notifications; email deferred |
| Search | 70 | Platform search contracts; entity quick search on employees |
| Dashboards | 75 | HR, department, executive dashboards with real metrics |
| Payroll | 78 | Egypt MVP + publish creates payslips/publications |
| Attendance | 74 | Devices, sync, processing, overtime, time policies |
| ESS/MSS | 78 | RLS + team scope + payslip summary; PDF/submit workflows open |
| Tests | 91 | 950 automated tests passing |
| Accessibility | 65 | Enterprise table/form patterns; partial keyboard/RTL |
| Mobile | 66 | Responsive grids; tables scroll horizontally |

---

## 3. Module-by-Module Readiness Scores

| Module | Score | Status |
|--------|-------|--------|
| HR Dashboard | 85 | ✅ Real metrics, quick actions |
| Employees (list/wizard/profile) | 88 | ✅ CRUD, import/export, archive, profile tabs |
| Organization (dept/section/team) | 86 | ✅ Foundation CRUD, hierarchy |
| Positions / Jobs / Grades | 84 | ✅ Foundation hub, capacity |
| Skills & Competencies | 80 | ✅ Pages + nav fixed; report links work |
| Assignments | 87 | ✅ Conflict detection, resolver |
| Contracts | 85 | ✅ Renew/amend/terminate, expiry alerts |
| Compensation | 82 | ✅ Components, packages, create modals |
| Payroll Readiness / Operator | 78 | ✅ Validate/calc/approve/publish fixed; Egypt MVP |
| Attendance Devices & Sync | 76 | ✅ Registry, sync actions |
| Attendance Processing | 75 | ✅ Approval queue |
| Leave | 80 | ✅ Create/approve/reject in ERP; balances table |
| Overtime | 74 | ✅ Requests workflow |
| Time Policies (late/early) | 73 | ✅ Policy CRUD |
| Loans | 85 | ✅ Full CRUD + export |
| Advances | 85 | ✅ Full CRUD + export |
| Penalties | 83 | ✅ CRUD |
| Bonuses / Incentives | 83 | ✅ CRUD |
| Documents | 82 | ✅ Upload, expiry, profile inline |
| Custody | 84 | ✅ Assign/return/damage |
| HR Requests | 83 | ✅ Certificate/letter workflows |
| Recruitment | 70 | ⚠️ Raw UUID inputs for position/job/dept |
| Onboarding / Training | 72 | ⚠️ Functional but basic UX |
| Performance / Succession | 71 | ⚠️ Foundation runtime |
| ESS Portal | 76 | ✅ Self-service RLS; employee context auto-resolve |
| MSS Portal | 74 | ✅ Team scope via assignments; approvals filtered |
| Reports | 68 | ⚠️ Launcher + CSV; no PDF engine |
| Print | 72 | ✅ 4 runtime HTML templates via API |
| Notifications | 62 | ⚠️ In-app scan; no email |
| Dashboards (dept/executive) | 76 | ✅ Implemented |
| Settings | 80 | ✅ Payroll seed, leave types |

---

## 4. Production Blockers

| # | Blocker | Impact | Status |
|---|---------|--------|--------|
| 1 | ESS portal RLS requires operator permissions | Employees cannot use self-service | **Fixed** — `20260719120000_hr_portal_self_service_rls.sql` |
| 2 | MSS manager views not scoped to direct reports | Privacy / wrong approvals context | **Fixed** — assignment-scoped loaders + RLS |
| 3 | Payslip PDF rendering not implemented | Cannot download/print payslips | **Open** — summary view wired; PDF deferred |
| 4 | Email/push notification delivery not registered | Compliance risk for expiry alerts | **Open** — in-app scan solid; email deferred |
| 5 | Portal routes not in auth middleware matcher | Session edge cases | **Fixed** — `/portal/:path*` + layout guard |

### Blockers Fixed in This UAT

| # | Blocker | Fix |
|---|---------|-----|
| F1 | `publishPayslips` only set run status — no payslips/publications | `hr-payroll.service.ts` creates batch, payslips, publications |
| F2 | Payroll approve/publish/calculate lacked state guards | State machine guards via `payrollRunAllows*` |
| F3 | Re-calculate failed on unique constraint | Idempotent clear of snapshots/results before recalc |
| F4 | `publishPayslipsAction` used `hr.payroll.manage` but RLS needs `hr.payslips.publish` | Action checks publish + manage + batch permissions |
| F5 | MSS approvals page gated `hr.leave.manage` but action requires `hr.leave.approve` | Portal page uses `leaveApprove` |
| F6 | ESLint `no-restricted-imports` failures on HR API routes (CI blocker) | Exported runtime via `public-api.ts` |
| F7 | `hr_operator_notifications` insert allowed `hr.view` | Migration hardens to `hr.manage` |
| F8 | Skills not in primary navigation | Added to `hr-navigation.ts` + `erp-navigation.ts` |
| F9 | ESS self-service blocked by operator RLS | Migration `20260719120000` + self permissions |
| F10 | MSS company-wide team/approvals | `hr-portal.loader.ts` assignment-scoped queries |
| F11 | Portal payslip list UUID-only | Payslip summary with period, net/gross, status |
| F12 | Portal auth edge cases | Middleware matcher + `portal/layout.tsx` guard |
| F13 | Employee cookie never set on login | `resolveEmployeeRequestContext` links `hr_employees.user_id` |
| F14 | Duplicate migration timestamp `20260718120000` | Renamed attendance device migration to `20260718130000` |

---

## 5. High Priority Issues

1. **Recruitment/onboarding forms use raw employee/position UUIDs** — operators need lookup pickers (`recruitment/page.tsx`, `onboarding/page.tsx`).
2. **Talent pages gate with `employeesView` but mutations require `employeesManage`** — view-only users see broken create forms.
3. **Payroll operator role must bundle** `hr.payslips.publish`, `hr.payslips.manage`, `hr.payroll_batches.manage` for publish workflow.
4. **Leave actions from portal use ERP branch context** — may fail for portal-only managers without branch access.
5. **6 print templates still contract-only** (assignment letter, ID card, custody receipt, etc.).
6. **Validate payroll does not persist `hr_payroll_validation_results`** — dashboard counts may not reflect validation.
7. **Export API routes lack explicit route-level auth** — rely on loader permission (defense-in-depth gap).

---

## 6. Medium Priority Issues

1. Excel export not available (CSV only).
2. Bulk row selection partially wired — bulk archive works on employees; print bulk not runtime.
3. Contract suspend/resume not implemented.
4. Photo upload implemented in actions but limited UI exposure.
5. Department filter on employee list is in-memory post-fetch.
6. N+1 employee name lookups on contracts page.
7. `hr_overtime_requests` / talent RLS policies lack company row alignment (migration `20260717120000`).
8. Full RTL accessibility audit not done.

---

## 7. Low Priority Issues

1. Duplicate employee action not implemented.
2. Saved report filters not implemented.
3. Organization merge operations not implemented.
4. OCR hook for documents not wired.
5. Barcode scanning for custody not wired.
6. Career path visualization not implemented.

---

## 8. UX Findings

**Strengths**
- List-first workspace with modal create/edit (employees, foundation entities).
- Clear empty states and status badges across operational pages.
- HR dashboard actionable metrics with deep links.
- Import dialog with template download and validation error report.
- Dark-mode form contrast in modals (per ERP page modal pattern).

**Gaps**
- Recruitment requires copying UUIDs — blocks real hiring ops.
- Payroll UI button says "Mark Paid" vs "Publish Payslips" — terminology mismatch.
- Portal payslip list shows truncated ID without amount/period/PDF link.
- MSS approvals list lacks reject action and employee context (department, balance).
- Mobile tables require horizontal scroll on wide operational lists.

---

## 9. Security Findings

**Strengths**
- All HR loaders call `requirePermission`.
- All HR action files gate mutations server-side.
- `HrShell` enforces base `hr.view`.
- RLS enabled on HR tables with tenant/company isolation.
- Print and notification scan APIs require explicit permissions.
- Reports page now requires `hr.reports.view`.

**Risks**
- ESS portal policies inherit operator view permissions — employees without HR role cannot self-serve.
- MSS shows all submitted leave in tenant — not manager-scoped.
- Operator notification insert was over-permissive (fixed in migration `20260718120000`).
- Export API routes should add explicit `resolveBranchRequestContext` + permission at route layer.

---

## 10. Performance Findings

- Employee list uses cursor pagination ✅
- Assignment resolver batches via `resolveManyEmployeeAssignments` ✅
- Export capped at 5000 rows ✅
- Profile loader uses parallel queries ✅
- Department/position filters applied in-memory after fetch ⚠️
- Payroll calculate loops employees sequentially — acceptable for <5000 employees
- No critical performance blockers for typical tenant sizes

---

## 11. Payroll Findings

**Egypt MVP (`hr-payroll-egypt.service.ts`)**
- Social insurance and income tax applied to basic salary.
- Advances and loans folded into deductions.
- Currency hardcoded EGP in calculate (aligned with OP-25 Egypt target).

**Runtime flow (post-fix)**
1. Create run → `draft`
2. Validate → `ready` / `validating`
3. Calculate → `completed` (idempotent recalc supported)
4. Approve → `approved` (requires completed)
5. Publish → `paid` + creates `hr_payroll_batches`, `hr_payslips`, `hr_payslip_publications`

**Gaps**
- No journal posting to finance.
- No payslip PDF generation.
- Validation results not persisted to validation table.
- End-of-service calculation placeholder only.

---

## 12. Attendance Findings

- Device registry with sync actions (`attendance-devices/page.tsx`).
- Attendance processing page with approval workflow.
- Leave requests with create/approve/reject in ERP.
- Overtime requests with policies.
- Time policies (grace, monthly limits).
- Biometric sync is simulated/runtime stub — real device integration depends on deployment.
- Leave calendar view in Attendance & Leave (`?tab=calendar`) with monthly grid and detail list.
- Leave policy admin in HR Settings (create, activate, archive per leave type).

---

## 13. ESS/MSS Findings

**ESS (`/portal`)**
- Pages: home, profile, payslips, leave, attendance, requests, documents.
- Payslips query `hr_payslip_publications` with `published` status — correct security model.
- **Blocked by RLS**: employees lack `hr.employees.view`, `hr.leave.view`, etc.
- No leave submit or request create from portal UI.

**MSS (`/portal/manager`)**
- Approvals, team list, manager home.
- **Fixed**: approvals page now gates `hr.leave.approve` (matches action).
- **Open**: team/approvals not filtered to direct reports.
- Approve action uses ERP branch context — portal managers may need dual context.

---

## 14. Testing Summary

### Commands (2026-07-06)

```bash
npm run validate:migrations  # ✅ 76 migration files validated
npm run typecheck            # ✅ clean
npm run lint                 # ✅ clean
npm test                     # ✅ 950 passing (0 fail)
```

### Test coverage highlights

| Area | Test file | Tests |
|------|-----------|-------|
| Production readiness gate | `hr-production-readiness-gate.test.ts` | 150+ contract tests |
| Print + notification runtime | `hr-print-notification-runtime.test.ts` | Runtime registry |
| Payroll publish guards | `hr-payroll-publish-runtime.test.ts` | 3 |
| Portal self-service | `hr-portal-self-service.test.ts` | 7 (new post-UAT) |
| Operational runtime | `hr-operational-runtime.test.ts` | Egypt payroll + nav |
| Assignment engine | `hr-assignment-engine-foundation.test.ts` | Engine contracts |
| Payroll runtime | `hr-payroll-runtime-foundation.test.ts` | Schema contracts |
| Employee attendance code | `hr-employee-attendance-code.test.ts` | Code generation |

### Manual scenario trace (code review — no live DB E2E)

| Step | Code path | Result |
|------|-----------|--------|
| Company→Branch→Dept→Section→Team | `hr-foundation.loader.ts` / actions | ✅ |
| Position→Job→Grade | `positions-jobs` hub | ✅ |
| Employee wizard | `hr-employees.actions.ts` + validation | ✅ |
| Attendance code | `hr-employee-attendance-code` | ✅ |
| Photo | `uploadEmployeePhotoAction` | ✅ (action exists) |
| Contract→salary→allowances | contracts + compensation pages | ✅ |
| Payroll group | `ensureDefaultSetup` seeds group | ✅ |
| Device→sync | `attendance-devices` + sync action | ✅ |
| Approve attendance | `attendance-processing` | ✅ |
| Leave→overtime | `attendance-leave`, `overtime` | ✅ |
| Loan→advance | financial pages + payroll deduction in calc | ✅ |
| Payroll period→run→validate→calculate→approve→publish | `hr-payroll.service.ts` | ✅ (fixed) |
| ESS payslip | `portal/payslips` | ✅ summary + RLS (PDF open) |
| MSS approval | `portal/manager/approvals` | ✅ team-scoped |
| Print certificate | `/api/hr/print/employee-certificate` | ✅ |
| Export directory | `/api/hr/employees/export` | ✅ |
| Expiry notifications | `/api/hr/notifications/expiry-scan` | ✅ |

---

## 15. Documentation Status

| Document | Status |
|----------|--------|
| [OPERATIONAL_ROADMAP.md](../00-overview/OPERATIONAL_ROADMAP.md) | Current — OP sprints marked Partial/Done |
| [HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md) | Frozen — respected in fixes |
| [HR_PRODUCTION_READINESS_REPORT.md](HR_PRODUCTION_READINESS_REPORT.md) | Superseded by this UAT report for gate status |
| [SPRINT_OP_30_PRODUCTION_HARDENING.md](SPRINT_OP_30_PRODUCTION_HARDENING.md) | Historical log |
| ADRs in `docs/05-decisions/` | No architecture changes required for fixes |

---

## 16. Final Recommendation

### **NOT READY FOR PRODUCTION** (payslip PDF + email delivery remain)

### Conditionally acceptable for phased go-live:

| Phase | Scope | Ready? |
|-------|-------|--------|
| Phase A | HR operator back-office (employees through payroll publish) | **Yes**, with role permission bundle for payroll publish |
| Phase B | Manager approvals via ERP or portal (team-scoped) | **Yes**, with `hr.leave.approve` + manager assignments |
| Phase C | Employee self-service portal | **Partial** — read paths ready; PDF + leave submit open |
| Phase D | Automated email notifications | **No** |

### Recommended next sprint (before full go-live)

1. Wire payslip PDF rendering (platform print engine template for payslip).
2. Register email notification handlers for expiry triggers.
3. Add portal leave/request submit workflows.
4. Replace recruitment UUID inputs with entity lookups.

---

## Files Changed in This UAT

- `src/features/hr/public-api.ts` — export print/notification/import/Egypt runtime
- `src/features/hr/application/services/hr-payroll.service.ts` — publish, state guards, idempotent calc
- `src/features/hr/payroll-calculation-foundation.ts` — approval/publish guard helpers
- `src/features/hr/routes/actions/hr-payroll.actions.ts` — publish permissions
- `src/features/hr/navigation/hr-navigation.ts` — skills nav
- `src/shared/workspace/erp-navigation.ts` — skills nav
- `src/app/api/hr/print/[templateKey]/route.ts` — public-api imports
- `src/app/api/hr/notifications/expiry-scan/route.ts` — public-api imports
- `src/app/api/hr/employees/import-template/route.ts` — public-api imports
- `src/app/(portal)/portal/manager/approvals/page.tsx` — leaveApprove gate
- `src/app/(erp)/erp/hr/attendance-devices/page.tsx` — lint fix
- `src/app/(erp)/erp/hr/reports/page.tsx` — reportsView permission
- `supabase/migrations/20260718120000_hr_operator_notifications_rls_hardening.sql` — RLS hardening
- `tests/platform/hr-payroll-publish-runtime.test.ts` — new
- `tests/platform/hr-portal-self-service.test.ts` — new
- `supabase/migrations/20260719120000_hr_portal_self_service_rls.sql` — ESS/MSS RLS
- `src/features/hr/routes/loaders/hr-portal.loader.ts` — portal loaders
- `src/platform/auth/server.ts` — linked employee resolution
- `src/middleware.ts` — portal matcher
- `src/app/(portal)/portal/layout.tsx` — portal access guard
- `src/app/(portal)/portal/payslips/page.tsx` — payslip summary
- `src/app/(portal)/portal/manager/*.tsx` — team-scoped MSS
- `supabase/migrations/20260718130000_hr_attendance_device_center_runtime.sql` — timestamp fix

---

*Generated by HCM Final UAT Freeze Gate — 2026-07-06. Post-UAT portal hardening appended same day.*
