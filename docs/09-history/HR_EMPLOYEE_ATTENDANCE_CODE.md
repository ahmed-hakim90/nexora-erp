# HR Employee Attendance Code Integration

## Summary

Added optional `attendance_code` to the HR Employee identity master so operators can store the code already registered on fingerprint/face attendance devices. This is a small identity-field enhancement only — no Attendance Engine runtime, device sync, or payroll changes.

`attendance_code` will serve as the matching key when the future Attendance Engine syncs device punches to employees.

## Database changes

Migration: `supabase/migrations/20260714120000_hr_employee_attendance_code.sql`

- Column: `hr_employees.attendance_code` (`text`, nullable)
- Check: trimmed length 1–50 when present
- Unique index: `(tenant_id, company_id, lower(trim(attendance_code)))` for active rows
- Search indexes: btree scope index + trigram GIN index for `ILIKE` lookup

## UI changes

- **Employee Wizard** (`hr-employee-wizard.tsx`): field on Employment Details step with bilingual label and help text
- **Employee Edit modal** (`hr-employee-edit-modal.tsx`): add/update/clear attendance code before save
- **Employee List** (`hr-employees-pages.tsx`): optional Attendance Code column; search placeholder updated

## Validation rules

- Trim leading/trailing spaces (Zod schema + server action)
- Max 50 characters
- Unique per company (case-insensitive) via `validateEmployeeUniqueness`
- Friendly server error: `This attendance code is already assigned to another employee.`
- DB unique index as final guard

## Search & lookup updates

- Employee list search (`hr-employees.loader.ts`)
- Employee lookup provider (`hr-entity-lookup.repository.ts`) — search + subtitle
- HR search contract (`HR_SEARCH_ENTITY_PROVIDERS`) — `attendanceCode` field documented
- Global ERP search remains contract-driven; employee lookup/search paths now include attendance code

## Import/export updates

- `HR_EMPLOYEE_IMPORT_CONTRACT` — column + mapping + unique validation rule
- `HR_EMPLOYEE_IMPORT_COLUMNS` / `HR_EMPLOYEE_EXPORT_COLUMNS`
- CSV export route via `exportHrEmployeesCsv` — Attendance Code column (blank when absent)

## Public contracts

- `HrEmployeeDefinition.attendanceCode?: string | null`
- Import/export/search production-readiness definitions updated
- `HR_PRODUCTION_VALIDATION_RULES.employee.duplicate_attendance_code`

## Tests added

- `tests/platform/hr-employee-attendance-code.test.ts`
- Updated export column count in `tests/platform/hr-production-readiness-gate.test.ts` (11 → 12)

Covers: migration SQL, schema parse/trim, import/export mappings, search provider, validation message, UI field presence.

## Verification results

| Command | Result |
|---------|--------|
| `npm run validate:migrations` | Pass (69 migration files) |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | 915 pass / 2 fail (pre-existing manufacturing-sprint3 failures, unrelated) |
| `node --import tsx --test tests/platform/hr-employee-attendance-code.test.ts` | 10/10 pass |

Pre-existing failures at delivery time (since resolved in UI Pass 5 — see `PLATFORM_UI_CONSISTENCY_SPRINT.md`):

- ~~`manufacturing-sprint3-foundation.test.ts` — RLS migration fragment assertion~~ (test aligned with dynamic RLS loop)

## Remaining risks

- Bulk import runtime executor is contract-ready but async import job wiring may still be foundation-only
- `attendanceCode` is in HR list/lookup loaders and `HR_SEARCH_PROVIDER_CONTRACT.quickSearchFields`; global search **panel** live record indexes remain a platform wiring gap
- Duplicate employee action does not copy `attendance_code` (intentional — codes must stay unique)
- Case-insensitive uniqueness relies on app validation + DB unique index; stored value preserves operator-entered casing
