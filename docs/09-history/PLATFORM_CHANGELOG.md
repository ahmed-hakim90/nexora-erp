# Platform Documentation Changelog

## Related Documents

- [ADR-011 Platform Freeze](../05-decisions/ADR-011-Platform-Freeze-V1.md)
- [Platform UI Consistency Sprint](./PLATFORM_UI_CONSISTENCY_SPRINT.md)
- [HR Employee Attendance Code](./HR_EMPLOYEE_ATTENDANCE_CODE.md)
- [HR Production Readiness Report](./HR_PRODUCTION_READINESS_REPORT.md)

## HR Enterprise Completion (Phases 1–5)

Date: 2026-07-05.

Full HR enterprise completion sprint: missing pages, financial workflows, Leave/Attendance/Payroll engine runtime, employee profile inline tabs, file upload, and operational seed setup.

Added:

- **Phase 1:** Penalties + Bank Accounts pages, advances/loans CSV export APIs, financial transition actions (incentive approve/reject, bonus reject, loan settle, bank account update), deep links on documents/requests/custody/attendance-leave, dashboard quick action fixes.
- **Phase 2:** Leave engine (`hr-leave.service.ts` + schema + actions), compensation CRUD, assignment edit/end, standalone contract create modal.
- **Phase 3:** Employee profile inline tabs (documents, custody, requests, skills, compensation), skills CRUD, real document upload via `hr-file-attachment.service.ts` + `hr-documents` storage bucket migration.
- **Phase 4:** Attendance engine (`hr-attendance.service.ts`) with punch log, day aggregation, and exception workflow UI.
- **Phase 5:** Payroll engine (`hr-payroll.service.ts`) with create → validate → calculate → approve → mark paid workflow on payroll-readiness workspace.
- **Settings:** HR Settings page with seed actions for default leave types and payroll setup (calendar, group, current-month period).
- **Tests:** `tests/platform/hr-enterprise-engines.test.ts` (7 tests).

Validation:

- Migrations, typecheck, lint pass.
- Full test suite pass.

## HR Employee Attendance Code

Date: 2026-07-05.

Optional `attendance_code` on employee master for future biometric device matching. No Attendance Engine runtime.

Added:

- Migration `20260714120000_hr_employee_attendance_code.sql` (nullable, company-scoped case-insensitive unique, indexed).
- Wizard + edit UI, list column, search/lookup/export, import contracts, server-side duplicate validation.
- `tests/platform/hr-employee-attendance-code.test.ts` (10 tests).

Validation:

- Migrations, typecheck, lint pass.
- 915 tests pass; 2 pre-existing manufacturing failures unrelated.

## Platform UI Consistency Sprint (Pass 1 + 2 + 3 + 4 + 5 + 6 + 7)

Date: 2026-07-05.

UI layer standardization only — no business logic or architecture changes.

Pass 1:

- Eliminated all native `type="date"` inputs (HR assignment + employee wizard).
- Consolidated Inventory Ledger filters to `DateRangeFilterInput`.
- Full audit and shared components inventory in `PLATFORM_UI_CONSISTENCY_SPRINT.md`.

Pass 2:

- HR employee wizard: 12 fields → `FieldGroup` + `Input`; footer nav → shared `Button`.
- ~32 inline primary buttons → shared `Button` across 15 HR/inventory/purchasing files.
- `EmptyState` on manufacturing hub, HR dashboard alerts, global search no-results.

Pass 3:

- HR employee edit modal: 14 fields → shared `Input` / platform select styling.
- HR foundation modal `FieldControl`: bespoke input classes → shared `Input`.
- HR financial + operational forms: 23 inputs, 9 selects, 14 secondary buttons standardized.

Pass 4:

- HR employees + foundation list filter bars: shared `Input`, platform selects, `Button secondary`, pagination link styling.
- HR assignment form: 2 selects + textarea → `FieldGroup` with platform control styling.
- Profile tab pills + wizard step pills deferred (URL-sync / `WizardForm` refactor required).

Pass 5:

- Export CSV links (employees, advances, loans) → secondary link-button token classes.
- HR employees row actions (View/Edit/Archive/Duplicate) → shared `Button` / link styling.
- Assignment quick-action presets → shared `Button secondary sm`.
- Manufacturing sprint 3 RLS test aligned with dynamic migration loop (no SQL change).
- HR search contract: `attendanceCode` added to employee `quickSearchFields`.

Pass 6:

- Shared `secondaryButtonLinkClassName` / `secondaryButtonLinkSmClassName` exported from `src/shared/ui/tokens/button-classes.ts`.
- HR employees, advances, loans, foundation pagination, and admin header links migrated to shared export (6 duplicate strings removed).
- HR employee profile: 12 secondary action links standardized; tab pills unchanged.
- `WizardForm` step pill migration evaluated and deferred — component needs interactive navigation + ARIA first.

Pass 7:

- Shared `nativeSelectClassName` / `nativeTextareaClassName` exported from `src/shared/ui/tokens/form-control-classes.ts`.
- HR employees, foundation, assignment, wizard, edit modal, operational, and financial pages migrated to shared native control tokens (13 duplicate strings removed).
- Shared `primaryButtonLinkClassName` exported from `button-classes.ts`; admin submit buttons + textarea fields migrated (2 duplicate strings removed).
- Profile tab pills and wizard step pills deferred (unchanged from Pass 6).

Validation:

- Migrations validate; lint, typecheck, and full test suite pass (see Pass 7 verification in sprint doc).

## 1.0.0

Date: 2026-06-27.

Platform Freeze v1.0 Review Gate completed.

Added:

- `10_EVENT_OUTBOX_LAYERING.md` to document the Event Bus versus durable Outbox boundary.
- `11_PLATFORM_FREEZE_V1.md` to document accepted engines, freeze rules, public/server API rules, security rules, RLS guidance, background-job readiness, and future extension rules.

Validation:

- Static Supabase migration validation.
- TypeScript typecheck.
- ESLint.
- Platform test suite.

Earlier baseline:

Initial official platform documentation baseline.

Included:

- Platform Design Freeze completed.
- Platform Blueprint approved.
- Implementation Roadmap approved.
- `docs/platform` established as the single source of truth for Nexora Platform architecture.
- Sprint 1 Platform Core Runtime started.
- Platform Feedback Engine baseline started through Sprint 1.
- Documentation baseline created before Sprint 2.

Scope:

- Documentation only.
- No Identity implementation.
- No Security implementation.
- No App Registry implementation.
- No business logic implementation.
