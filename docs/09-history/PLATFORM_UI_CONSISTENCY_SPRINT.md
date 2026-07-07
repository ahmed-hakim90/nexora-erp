# Platform UI Consistency & UX Standardization Sprint

Date: 2026-07-05

Scope: UI layer only — no business logic, architecture, or domain boundary changes.

Related rule: `.cursor/rules/no-native-date-inputs.mdc`

---

## 1. Platform UI Consistency Report

### Executive summary

Nexora already has a mature shared UI layer under `src/shared/ui/` with enterprise date pickers, forms, dialogs, tables, lookups, page framework, feedback states, and design tokens wired through `EnterpriseUiProvider`. Most implemented modules (HR, Inventory, Manufacturing, Purchasing, Finance, Master Data, Admin) already consume these primitives.

The highest-impact inconsistency was **native HTML date inputs** in HR assignment and employee wizard flows — the only remaining violations repo-wide. This sprint eliminated all five instances and consolidated one duplicate date-range filter pattern in Inventory Ledger.

### Module audit coverage

| Module area | Status in repo | Shared UI adoption |
|---|---|---|
| Platform / Admin | Implemented | High — `PageContainer`, `EnterpriseDataTable`, platform panels |
| HR / Payroll readiness | Implemented | Medium-high — modals + tables; raw text inputs remain in wizard |
| Finance / Accounting | Implemented | High — foundation workspaces, entity drawer |
| Inventory / Warehouse | Implemented | High — foundation modals, transaction modals, scanner workspace |
| Manufacturing | Implemented | High — record modals, reports; typecheck debt in workspace loader |
| Purchasing | Implemented | High — document forms, EntityLookup |
| Master Data | Implemented | High — foundation pattern |
| CRM, Sales, POS, Retail, Restaurant | Not implemented as app routes | N/A |
| Fleet, Projects, Maintenance, Service Center | Not implemented | N/A |
| Commerce / Customer Portal / Supplier Portal | Portal stub only | Low |
| AI Workspace | Not implemented | N/A |
| Reports / Settings / Notifications | Partial | Medium — page framework used |

### Duplicate pattern audit (counts)

| Category | Shared component | Adoption (files referencing) | Duplicate / debt |
|---|---|---|---|
| Date picker (single) | `DatePicker`, `DatePickerField`, `DateFilterInput` | 22 module files | **0 native `type="date"` remaining** (was 5) |
| Date range | `DateRangePickerField`, `DateRangeFilterInput` | 3 filter pages | Ledger consolidated; manufacturing reports already uses shared range |
| Entity lookup | `EntityLookup` | ~35 UI files | No parallel lookup UI libraries found |
| Forms | `FieldGroup`, `FormGrid`, `RecordFormSection` | ~15 form-heavy files | ~40+ files still use raw `rounded-md border px-3 py-2` inputs |
| Dialogs / modals | `RecordFormDialog`, `FloatingRecordPanel` | 14 modal launchers | No duplicate dialog primitives |
| Tables | `EnterpriseDataTable` | 30+ list pages | No custom table libraries |
| Tabs | `Tabs` (`layout/layout-primitives.tsx`) | 6 files | HR wizard uses custom step pills instead of `WizardForm` |
| Wizards | `WizardForm` (`form/enterprise-form.tsx`) | **0 usages** | HR employee wizard is bespoke |
| Buttons | `Button` (`primitives/controls.tsx`) | ~18 files | ~17 files use inline `rounded-md border bg-[hsl(var(--primary))]` buttons |
| Empty / loading | `EmptyState`, `LoadingState`, `SkeletonBlock` | 6 files | Many pages use inline empty copy instead |
| Search | `CommandPalette`, global search panel | Platform shell | Module filters mostly raw `<input>` |
| Stepper / timeline | `AuditActivityTimeline`, `DocumentLifecycleBar` | Detail panels | Not used in HR wizard |
| Attachments | `FormAttachmentPlaceholder` | Form framework only | No live attachment UI in modules yet |
| Design tokens | `tokens/design-tokens.ts`, CSS variables | Provider-wide | Some components bypass tokenized `Button` |
| Notifications | `feedback/feedback.tsx`, notifications page | Platform | Module-level toast usage minimal |

---

## 2. Shared Components Inventory

All paths relative to `src/shared/ui/`.

### Dates (`dates/`)

| Export | Path | Purpose |
|---|---|---|
| `DatePicker` | `dates/date-picker.tsx` | Single/range/datetime popover; ISO hidden inputs; RTL via `dir` |
| `DatePickerField` | `dates/date-picker.tsx` | Labeled field wrapper with validation styling |
| `DateRangePickerField` | `dates/date-picker.tsx` | Range mode field wrapper |
| `DateFilterInput` | `dates/date-picker.tsx` | Filter bar single date |
| `DateRangeFilterInput` | `dates/date-picker.tsx` | Filter bar from/to pair |
| `formatDisplayDate`, `toIsoDate`, `parseIsoDate` | `dates/date-utils.ts` | Locale + company format helpers |

### Primitives (`primitives/`)

| Export | Path |
|---|---|
| `Button`, `Input`, `Checkbox`, `Select`, `Switch`, `Label`, `DropdownMenu` | `primitives/controls.tsx` |
| `EntityLookup` | `primitives/entity-lookup.tsx` |
| `CommandPalette` | `primitives/command.tsx` |
| `Popover` | `primitives/popover.tsx` |

### Forms (`form/`)

| Export | Path |
|---|---|
| `FieldGroup`, `FormGrid`, `FormSection`, `FormShell`, `WizardForm` | `form/enterprise-form.tsx` |
| `useEnterpriseForm`, validation helpers | `form/platform-form.tsx`, `form/use-enterprise-form.ts` |

### Patterns (`patterns/`)

| Export | Path |
|---|---|
| `RecordFormDialog` | `patterns/record-form-dialog.tsx` |
| `RecordFormSection`, `FloatingRecordPanel`, `AuditActivityTimeline` | `patterns/floating-record-panel.tsx` |
| `ListPageTemplate`, `StatusChip`, `DocumentLifecycleBar` | `patterns/enterprise-patterns.tsx` |

### Data & page (`data-table/`, `page/`)

| Export | Path |
|---|---|
| `EnterpriseDataTable` | `data-table/enterprise-data-table.tsx` |
| `PageContainer`, `PageHeader`, `PageContent`, `PageFilters`, `PageActions` | `page/page-framework.tsx` |

### Layout & feedback

| Export | Path |
|---|---|
| `Tabs`, `Dialog`, `Drawer`, `Grid`, `Stack` | `layout/layout-primitives.tsx` |
| `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmationDialog` | `feedback/feedback.tsx` |
| `VisuallyHidden`, `FocusScope` | `a11y/accessibility.tsx` |

### Provider & tokens

| Export | Path |
|---|---|
| `EnterpriseUiProvider` (locale, direction, dateFormat, theme) | `providers/enterprise-ui-provider.tsx` |
| Design token scales | `tokens/design-tokens.ts` |

### Operator experience

| Export | Path |
|---|---|
| `WarehouseScannerWorkspace`, scan panels | `operator-experience/` |

Public barrel: `src/shared/ui/index.ts`

---

## 3. Components Replaced (this sprint)

| File | Before | After |
|---|---|---|
| `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx` | 2× `<input type="date">` | `DatePickerField` for `effectiveFrom` / `effectiveTo` |
| `src/app/(erp)/erp/hr/_components/hr-employee-wizard.tsx` | 3× `<input type="date">` | `DatePicker` + `FieldGroup` (controlled, ISO values preserved) |
| `src/app/(erp)/erp/inventory/ledger/page.tsx` | 2× separate `DateFilterInput` labels | Single `DateRangeFilterInput` (`fromDate` / `toDate` params unchanged) |

**Total native date inputs removed:** 5  
**Post-sprint native date input count:** 0 (verified by repo grep)

---

## 4. Duplicate Components Removed

No standalone duplicate component files were deleted in this pass — violations were inline native inputs, not separate date picker implementations. The only third-party calendar usage is centralized in `src/shared/ui/dates/date-picker.tsx` (`react-day-picker`).

---

## 5. UX Improvements Summary

- HR assignment and employee onboarding now use the same calendar UX as foundation modals, finance, inventory, and manufacturing — consistent placeholders, clear button, and company date format display.
- Inventory Ledger filter bar uses a paired date-range control aligned with Manufacturing Reports.
- Wizard date fields show formatted display values while submitting ISO `YYYY-MM-DD` via hidden inputs (server compatibility unchanged).

---

## 6. Accessibility Summary

Shared `DatePicker` provides:

- Popover trigger with calendar icon and keyboard-focusable button (not opaque native picker)
- `aria-invalid`, `aria-describedby` passthrough on `DatePickerField`
- Required field marker on labels
- Hidden native inputs for form submission without exposing OS-native date UI

Remaining gaps:

- HR wizard step pills are plain `<button>` elements without `aria-current="step"` — future pass should adopt `WizardForm` or add ARIA step semantics.
- Many raw text inputs lack explicit `aria-describedby` error wiring (platform form validation helpers exist but are not universally applied).

---

## 7. RTL Summary

Date picker reads `direction` from `EnterpriseUiProvider` and passes `dir={direction}` to `DayPicker`. Arabic locale uses `dateFnsLocaleFor("ar")` for month/weekday labels.

Forms updated in this sprint inherit RTL behavior automatically. Raw `rounded-md border` inputs in HR wizard remain direction-agnostic but do not mirror platform field spacing in RTL as well as `FieldGroup` wrappers.

---

## 8. Mobile Summary

`DatePicker` popover uses `align="start"` and single-month calendar — usable on mobile. `DateRangeFilterInput` stacks vertically on small screens (`sm:grid-cols-2`).

HR wizard step pill row wraps (`flex-wrap`) — functional but dense on narrow viewports; consolidating to `WizardForm` would improve scanability.

---

## 9. Remaining Technical Debt (prioritized)

### P0 — Date / forms

1. **Raw text inputs in HR employee wizard** (~15 inputs) — migrate to `FieldGroup` + platform `Input` for dark-mode contrast per ERP modal rule.
2. **Unused import** — `DatePicker` imported but unused in `hr/advances/page.tsx` (lint warning).

### P1 — Buttons & actions

3. **~17 files** use inline primary button classes instead of shared `Button` variant="primary" — HR operational pages, purchasing, inventory transactions highest count.

### P2 — Wizards & tabs

4. **HR employee wizard** should evaluate `WizardForm` + shared stepper semantics vs bespoke step pills.
5. **Detail panels** (lots, serials, products, finance) use layout `Tabs` — consistent; no action needed unless consolidating with `FloatingRecordPanel` tabs.

### P3 — Feedback & filters

6. **Empty/loading states** — adopt `EmptyState` / `SkeletonBlock` on list pages with inline "No records" copy.
7. **Filter bars** — many pages use raw search `<input>`; consider shared filter primitives from `FacetedFilterBar` / `PageFilters` composition.

### P4 — Unimplemented modules

8. When CRM, Sales, POS, etc. are built, scaffold from `foundation-workspaces.tsx` + shared UI barrel from day one.

### Pre-existing blockers (not introduced by this sprint)

- Typecheck failures in `manufacturing/page.tsx` and `manufacturing-workspace.loader.ts` (missing modules).
- Test failures: `manufacturing-sprint3-foundation.test.ts` (2 tests).

---

## 10. Verification Results

| Command | Result | Notes |
|---|---|---|
| `npm run validate:migrations` | **PASS** | 68 migration files validated |
| `npm run typecheck` | **FAIL (pre-existing)** | 5 errors in manufacturing workspace — unrelated to UI changes |
| `npm run lint` | **PASS (1 warning)** | Pre-existing unused `DatePicker` import in `hr/advances/page.tsx` |
| `npm test` | **905 pass / 2 fail (pre-existing)** | Failures: manufacturing workspace shell + sprint 3 migration tests |

### Files changed

- `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx`
- `src/app/(erp)/erp/hr/_components/hr-employee-wizard.tsx`
- `src/app/(erp)/erp/inventory/ledger/page.tsx`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this document)

### Manual verification checklist

- [ ] HR → Assignments → create assignment: date fields open enterprise calendar, submit ISO dates
- [ ] HR → Employees → Add Employee wizard: birth date, effective from, contract starts on use calendar; create still succeeds
- [ ] Inventory → Ledger → date range filter submits `fromDate` / `toDate` query params
- [ ] Toggle dark mode and Arabic locale on above screens

---

## Pass 2 — HR wizard inputs, Button sweep, EmptyState (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P0: HR employee wizard inputs

**File:** `src/app/(erp)/erp/hr/_components/hr-employee-wizard.tsx`

| Before | After | Count |
|---|---|---|
| Raw `<input className="rounded-md border px-3 py-2">` | `FieldGroup` + shared `Input` | 12 text/email/number fields |
| Raw `<select>` (employment type) | `FieldGroup` + native `<select>` with platform surface styling | 1 |
| Inline primary/back `<button>` classes | Shared `Button` (`variant="primary"` / `variant="secondary"`) | 3 |
| `DatePicker` + `FieldGroup` (unchanged) | Preserved — no regression | 3 |

Step navigation pills intentionally left as bespoke toggles (future `WizardForm` pass).

### P1: Inline primary buttons → shared `Button`

**~32 inline primary action buttons** replaced across **15 files**. Server-rendered `<Link>` primary CTAs (4) now use the same accent token classes as `Button variant="primary"`.

| File | Buttons replaced |
|---|---|
| `hr/_components/hr-assignment-form.tsx` | 1 submit |
| `hr/_components/hr-employee-edit-modal.tsx` | 1 save |
| `hr/_components/hr-foundation-modal.tsx` | 1 save (+ archive → `secondary`) |
| `hr/_components/hr-operational-pages.tsx` | 3 form submits |
| `hr/advances/page.tsx` | 3 (submit + approve + disburse) |
| `hr/bonuses/page.tsx` | 2 (submit + approve) |
| `hr/loans/page.tsx` | 3 (submit + approve + disburse) |
| `hr/incentives/page.tsx` | 1 submit |
| `hr/_components/hr-employees-pages.tsx` | 1 restore (+ Add Employee link styled) |
| `hr/_components/hr-foundation-pages.tsx` | 1 create link styled |
| `hr/assignments/page.tsx` | 1 create link styled |
| `inventory/_components/transaction-pages.tsx` | 2 (save draft + post) |
| `inventory/products/page.tsx` | 1 filter submit (+ New Product link styled) |
| `inventory/products/product-record-panel.tsx` | 1 modal trigger |
| `purchasing/_components/purchasing-pages.tsx` | 2 (save draft + post receipt) |

**Remaining inline `bg-[hsl(var(--primary))]` (2 files, navigation pills — not action buttons):**

- `hr/_components/hr-employee-wizard.tsx` — step indicator pills
- `hr/_components/hr-employee-profile.tsx` — profile tab pills

### P2: Empty states

| File | Before | After |
|---|---|---|
| `manufacturing/page.tsx` | Dashed border paragraph per empty section | `EmptyState` with section message |
| `hr/_components/hr-dashboard.tsx` | Plain “No active alerts.” text | `EmptyState` |
| `global-search-panel.tsx` | Custom dashed “No results found” panel | `EmptyState` |

### Files changed (Pass 2)

19 source files + this document section (see list in P1/P2 above).

### Verification (Pass 2)

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | **FAIL (pre-existing)** | 5 errors — manufacturing workspace loader (2), manufacturing page (2), manufacturing test types (1). No new errors from Pass 2. |
| `npm run lint` | **PASS** | Clean |
| `npm test` | **905 pass / 2 fail (pre-existing)** | Failures: `manufacturing-sprint3-foundation.test.ts` |

### Remaining debt (post Pass 2)

1. **HR employee edit modal** — ~14 raw inputs inside existing `FieldGroup` wrappers.
2. **HR operational / financial pages** — filter bars and inline form inputs still raw.
3. **HR foundation modal `FieldControl`** — dynamic fields use bespoke control classes.
4. **Navigation pills** — wizard steps and employee profile tabs.
5. **Secondary / filter buttons** — inline border classes on non-primary actions.
6. **`WizardForm`** — zero usages; HR onboarding remains bespoke.
7. **Link-as-button** — 4 primary CTAs use duplicated accent classes.
8. **Manufacturing typecheck/test debt** — unchanged blocker.

### Manual verification checklist (Pass 2)

- [ ] HR → Employees → Add Employee wizard: text fields visible in dark mode; dates unchanged; create succeeds
- [ ] HR financial pages: submit + approve/disburse buttons render consistently
- [ ] Inventory products + transactions + purchasing primary actions
- [ ] Manufacturing overview empty sections; HR dashboard alerts; global search no-results

---

## Pass 3 — HR edit modal, foundation FieldControl, financial filters (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P0: HR employee edit modal

**File:** `src/app/(erp)/erp/hr/_components/hr-employee-edit-modal.tsx`

| Before | After | Count |
|---|---|---|
| Raw `<input className="w-full rounded-md border px-3 py-2">` | Shared `Input` inside existing `FieldGroup` | 12 text/email fields |
| Raw `<select>` (gender, marital status) | Native `<select>` with platform surface styling | 2 |
| `DatePicker` (birth date) | Preserved — no regression | 1 |

### P0: HR foundation modal FieldControl

**File:** `src/app/(erp)/erp/hr/_components/hr-foundation-modal.tsx`

| Before | After | Count |
|---|---|---|
| Bespoke `controlClassName` on text/number inputs | Shared `Input` | 1 control path |
| Bespoke classes on `<select>` | Platform native select styling | 1 control path |
| Bespoke textarea classes | Token-aligned textarea classes | 1 control path |
| Inline trigger `<button>` | Shared `Button variant="secondary"` | 1 |

Lookup, checkbox, and date field types unchanged.

### P1: HR financial + operational inline inputs

| File | Inputs replaced | Selects replaced | Secondary buttons |
|---|---|---|---|
| `hr/_components/hr-operational-pages.tsx` | 4 | 3 | 11 row-action buttons → `Button secondary sm` |
| `hr/advances/page.tsx` | 4 | 2 | Filter + Reject → `Button secondary` |
| `hr/bonuses/page.tsx` | 2 | 1 | — |
| `hr/loans/page.tsx` | 3 | 2 | Filter + Reject → `Button secondary` |
| `hr/incentives/page.tsx` | 2 | 1 | — |

**Total raw inputs replaced:** 23  
**Total native selects restyled:** 9  
**Total secondary/outline buttons replaced:** 14

### P2: HR profile tab pills (deferred)

**File:** `src/app/(erp)/erp/hr/_components/hr-employee-profile.tsx`

Shared `Tabs` component renders tab content client-side with `onValueChange` — employee profile uses URL-driven server tabs (`?tab=`) with 14 sections and Link-based navigation pills. Migrating would require a client wrapper and duplicate content mounting or a larger refactor. **Deferred** — document as remaining debt.

### Files changed (Pass 3)

- `src/app/(erp)/erp/hr/_components/hr-employee-edit-modal.tsx`
- `src/app/(erp)/erp/hr/_components/hr-foundation-modal.tsx`
- `src/app/(erp)/erp/hr/_components/hr-operational-pages.tsx`
- `src/app/(erp)/erp/hr/advances/page.tsx`
- `src/app/(erp)/erp/hr/bonuses/page.tsx`
- `src/app/(erp)/erp/hr/loans/page.tsx`
- `src/app/(erp)/erp/hr/incentives/page.tsx`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this section)
- `docs/09-history/PLATFORM_CHANGELOG.md`

### Verification (Pass 3)

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | Clean |
| `npm run typecheck` | **FAIL (pre-existing)** | 5 errors — manufacturing workspace loader (2), manufacturing page (2), manufacturing test types (1). No new errors from Pass 3. |
| `npm test` | **905 pass / 2 fail (pre-existing)** | Failures: `manufacturing-sprint3-foundation.test.ts` |

### Remaining debt (post Pass 3)

1. **HR list filter bars** — `hr-employees-pages.tsx`, `hr-foundation-pages.tsx` still use raw search/status inputs and inline filter/pagination links.
2. **HR assignment form** — 2 selects + textarea with raw classes.
3. **Employee profile** — tab pills and secondary action links use inline border classes; `Tabs` migration deferred (URL-sync pattern).
4. **Wizard step pills** — `hr-employee-wizard.tsx` (deferred `WizardForm` pass).
5. **Export CSV links** — advances/loans use inline anchor styling instead of shared button/link pattern.
6. **`WizardForm`** — zero usages; HR onboarding remains bespoke.
7. **Manufacturing typecheck/test debt** — unchanged blocker.

### Manual verification checklist (Pass 3)

- [ ] HR → Employees → Edit employee modal: all fields visible in dark mode; save succeeds
- [ ] HR foundation modals (departments, positions, etc.): create/edit fields render consistently
- [ ] HR Documents / Requests / Custody inline forms submit correctly
- [ ] HR Advances / Bonuses / Loans / Incentives: filter bars and create forms work; Reject buttons styled

---

## Pass 4 — HR list filters, assignment form (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P0: HR list filter bars

| File | Before | After | Count |
|---|---|---|---|
| `hr/_components/hr-employees-pages.tsx` | Raw search input + 3 raw selects + inline filter button | Shared `Input`, platform native selects, `Button secondary` | 1 search, 3 selects, 1 button |
| `hr/_components/hr-foundation-pages.tsx` | Raw search/status in plain div | `PageFilters` + shared `Input`, platform select, `Button secondary` | 1 search, 1 select, 1 button |

Both list pages: **Load more** pagination links restyled to match `Button variant="secondary"` token classes.

### P0: HR assignment form

**File:** `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx`

| Before | After | Count |
|---|---|---|
| Raw `<select>` (assignment type, scope) | `FieldGroup` + platform native select styling | 2 |
| Raw `<textarea>` | `FieldGroup` + token-aligned textarea classes | 1 |

Quick-action preset buttons and `DatePickerField` / `EntityLookup` unchanged.

### P1: Profile tab pills + wizard step pills (deferred)

| File | Reason |
|---|---|
| `hr/_components/hr-employee-profile.tsx` | URL-driven server tabs (`?tab=`) with 14 Link-based pills — shared `Tabs` requires client-side content mounting; migration needs wrapper refactor (unchanged from Pass 3). |
| `hr/_components/hr-employee-wizard.tsx` | Bespoke step pills tied to local `step` state — `WizardForm` adoption deferred; pills lack `aria-current="step"`. |

### Files changed (Pass 4)

- `src/app/(erp)/erp/hr/_components/hr-employees-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-foundation-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this section)
- `docs/09-history/PLATFORM_CHANGELOG.md`

### Verification (Pass 4)

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | Clean |
| `npm run typecheck` | **PASS** | No new errors from Pass 4 |
| `npm test` | **916 pass / 1 fail (pre-existing)** | Failure: `manufacturing-sprint3-foundation.test.ts` RLS assertion (out of scope) |

### Remaining debt (post Pass 4)

1. **Employee profile tab pills** — URL-sync pattern blocks trivial `Tabs` migration; secondary action links still inline border classes.
2. **Wizard step pills** — `WizardForm` + ARIA step semantics deferred.
3. **Export CSV links** — advances/loans/employees use inline anchor styling instead of shared link-button pattern.
4. **HR table row actions** — View/Edit/Archive/Duplicate links on employees list still inline border classes.
5. **Assignment quick-action preset buttons** — inline border pill buttons (low priority).
6. **`WizardForm`** — zero usages; HR onboarding remains bespoke.
7. **Manufacturing typecheck/test debt** — unchanged blocker.

### Manual verification checklist (Pass 4)

- [ ] HR → Employees: search/status/department/position filters submit; Load more preserves query params
- [ ] HR foundation lists (departments, positions, etc.): search/status filter + Load more
- [ ] HR → Assignments → create: type/scope/reason fields visible in dark mode; save succeeds

---

## Pass 5 — Export links, row actions, assignment presets (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P1: Export CSV links

| File | Before | After |
|---|---|---|
| `hr/_components/hr-employees-pages.tsx` | Inline anchor border/background classes (header + table export) | `secondaryLinkClassName` matching `Button variant="secondary"` |
| `hr/advances/page.tsx` | Inline anchor styling | `secondaryLinkClassName` |
| `hr/loans/page.tsx` | Inline anchor styling | `secondaryLinkClassName` |

### P1: HR employees table row actions

**File:** `hr/_components/hr-employees-pages.tsx`

| Before | After | Count |
|---|---|---|
| View/Edit `Link` with inline border classes | `secondaryLinkSmClassName` (secondary button tokens) | 2 |
| Archive/Duplicate raw `<button>` border classes | Shared `Button variant="secondary" size="sm"` | 2 |

Restore action unchanged (`Button variant="primary"`).

### P2: Assignment quick-action preset buttons

**File:** `hr/_components/hr-assignment-form.tsx`

| Before | After | Count |
|---|---|---|
| Inline border pill `<button>` elements | Shared `Button variant="secondary" size="sm"` | 6 presets |

### P2: Profile tab pills + wizard step pills (deferred)

| File | Reason |
|---|---|
| `hr/_components/hr-employee-profile.tsx` | URL-driven server tabs (`?tab=`) — shared `Tabs` requires client wrapper refactor (unchanged from Pass 4). |
| `hr/_components/hr-employee-wizard.tsx` | Bespoke step pills — `WizardForm` adoption + `aria-current="step"` deferred. |

### Track B: Manufacturing RLS test fix

**File:** `tests/platform/manufacturing-sprint3-foundation.test.ts`

Sprint 3 migration enables RLS via a `DO` block loop (`execute format('alter table public.%I enable row level security', table_name)`), not per-table literal statements. Test updated to assert each table appears in the foreach array plus the dynamic enable/force format strings — no migration change required.

### Track C: Global search `attendanceCode`

**File:** `src/features/hr/public-api.ts`

Added `attendanceCode` to `HR_SEARCH_PROVIDER_CONTRACT` employee `quickSearchFields` (list/lookup loaders already search the column).

### Files changed (Pass 5)

- `src/app/(erp)/erp/hr/_components/hr-employees-pages.tsx`
- `src/app/(erp)/erp/hr/advances/page.tsx`
- `src/app/(erp)/erp/hr/loans/page.tsx`
- `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx`
- `src/features/hr/public-api.ts`
- `tests/platform/manufacturing-sprint3-foundation.test.ts`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this section)
- `docs/09-history/PLATFORM_CHANGELOG.md`

### Verification (Pass 5)

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | Clean |
| `npm run typecheck` | **PASS** | No new errors |
| `npm test` | **917 pass / 0 fail** | Manufacturing sprint 3 RLS test fixed |

### Remaining debt (post Pass 5)

1. **Employee profile tab pills** — URL-sync pattern blocks trivial `Tabs` migration; secondary action links still inline border classes.
2. **Wizard step pills** — `WizardForm` + ARIA step semantics deferred.
3. **Shared link-button export** — `secondaryLinkClassName` duplicated across HR pages; consider shared UI export (admin module has local copy).
4. **`WizardForm`** — zero usages; HR onboarding remains bespoke.
5. **HR employee profile secondary actions** — inline border classes on non-tab links.

### Manual verification checklist (Pass 5)

- [ ] HR → Employees: Export CSV (header + table) downloads; View/Edit/Archive/Duplicate styled consistently in dark mode
- [ ] HR → Advances / Loans: Export CSV link styled as secondary button
- [ ] HR → Assignments → create: quick-action preset buttons visible and selectable

---

## Pass 6 — Shared secondary link styling (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P0: Shared secondary link styling

**New export:** `src/shared/ui/tokens/button-classes.ts`

| Export | Purpose |
|---|---|
| `secondaryButtonLinkClassName` | `Link` / `<a>` styling aligned with `Button variant="secondary"` (md / h-10) |
| `secondaryButtonLinkSmClassName` | Sm variant aligned with `Button variant="secondary" size="sm"` |

Re-exported via `@/shared/ui` (`tokens/index.ts` barrel).

| File | Before | After |
|---|---|---|
| `hr/_components/hr-employees-pages.tsx` | Local `secondaryLinkClassName` + `secondaryLinkSmClassName` | Shared imports |
| `hr/advances/page.tsx` | Local `secondaryLinkClassName` | Shared import |
| `hr/loans/page.tsx` | Local `secondaryLinkClassName` | Shared import |
| `hr/_components/hr-foundation-pages.tsx` | Inline Load more classes | `secondaryButtonLinkClassName` |
| `admin/_components.tsx` | Local `secondaryLinkClassName` (simpler variant) | Removed — admin pages use shared export |
| `admin/users/page.tsx` | Import from admin `_components` | `@/shared/ui` |
| `admin/invitations/page.tsx` | Import from admin `_components` | `@/shared/ui` |
| `admin/access/page.tsx` | Import from admin `_components` | `@/shared/ui` |
| `admin/roles/page.tsx` | Import from admin `_components` | `@/shared/ui` |

**Duplicated class strings removed:** 5 local definitions + 1 inline Load more string = **6 consolidations**.

### P1: Profile secondary action links

**File:** `hr/_components/hr-employee-profile.tsx`

| Before | After | Count |
|---|---|---|
| Inline `rounded-md border px-3 py-2 text-sm` on header action links | `secondaryButtonLinkClassName` | 3 |
| Inline `mt-4 inline-flex rounded-md border…` on tab-section CTAs | `cn("mt-4", secondaryButtonLinkClassName)` | 9 |

Profile tab pills intentionally unchanged (URL-sync pattern — deferred).

### P2: Wizard step pills (evaluate only — skipped)

**File:** `hr/_components/hr-employee-wizard.tsx` + `WizardForm` in `form/enterprise-form.tsx`

`WizardForm` accepts `steps: { key, title, content }[]` and `activeStepKey`, but:

- Step pills are **display-only** (`<li>` elements) — no click handler, no `aria-current="step"`, no active styling.
- HR wizard uses **local `step` state** with clickable pills, per-step conditional content, and a single form wrapping all steps.
- Adopting `WizardForm` as-is would require either (a) extending it with interactive step navigation + active styling + ARIA, or (b) a client wrapper duplicating wizard state — both exceed a minimal Pass 6 scope.

**Recommendation for future pass:** Extend `WizardForm` with optional `onStepChange`, `activeStepKey` styling, and `aria-current="step"`, then migrate HR wizard step pills without changing form submission flow.

### Files changed (Pass 6)

- `src/shared/ui/tokens/button-classes.ts` (new)
- `src/shared/ui/tokens/index.ts`
- `src/app/(erp)/erp/hr/_components/hr-employees-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-foundation-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-employee-profile.tsx`
- `src/app/(erp)/erp/hr/advances/page.tsx`
- `src/app/(erp)/erp/hr/loans/page.tsx`
- `src/app/(erp)/erp/admin/_components.tsx`
- `src/app/(erp)/erp/admin/users/page.tsx`
- `src/app/(erp)/erp/admin/invitations/page.tsx`
- `src/app/(erp)/erp/admin/access/page.tsx`
- `src/app/(erp)/erp/admin/roles/page.tsx`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this section)
- `docs/09-history/PLATFORM_CHANGELOG.md`

### Verification (Pass 6)

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | Clean |
| `npm run typecheck` | **PASS** | No new errors |
| `npm test` | **917 pass / 0 fail** | No regressions |

### Remaining debt (post Pass 6)

1. **Employee profile tab pills** — URL-sync pattern blocks trivial `Tabs` migration (unchanged).
2. **Wizard step pills** — extend `WizardForm` with interactive navigation + ARIA before HR wizard migration.
3. **Admin `primaryButtonClassName`** — still local in `admin/_components.tsx`; consider shared primary link/button export in a future pass.
4. **`WizardForm`** — zero production usages; needs stepper enhancement before HR adoption.
5. **HR native select class strings** — `nativeSelectClassName` still duplicated across HR pages (separate debt item).

### Manual verification checklist (Pass 6)

- [ ] HR → Employees: Export CSV, View/Edit row links, Load more — consistent secondary styling in dark mode
- [ ] HR → Advances / Loans: Export CSV link styled via shared class
- [ ] HR → Employee profile: header actions + tab-section CTAs match secondary button tokens; tab pills unchanged
- [ ] Admin → Users / Roles / Invitations / Access: header action links styled consistently

---

## Pass 7 — Shared native select + primary link styling (2026-07-05)

### Scope

UI layer only — no business logic, form actions, validation rules, or domain boundaries changed.

### P0: Shared native select styling

**New export:** `src/shared/ui/tokens/form-control-classes.ts`

| Export | Purpose |
|---|---|
| `nativeSelectClassName` | Platform surface styling for native `<select>` elements |
| `nativeTextareaClassName` | Platform surface styling for native `<textarea>` elements |

Re-exported via `@/shared/ui` (`tokens/index.ts` barrel).

| File | Before | After |
|---|---|---|
| `hr/_components/hr-employees-pages.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/_components/hr-foundation-pages.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/_components/hr-foundation-modal.tsx` | Local `nativeSelectClassName` + `nativeTextareaClassName` | Shared imports |
| `hr/_components/hr-assignment-form.tsx` | Local `nativeSelectClassName` + `nativeTextareaClassName` | Shared imports |
| `hr/_components/hr-employee-edit-modal.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/_components/hr-employee-wizard.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/_components/hr-operational-pages.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/advances/page.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/bonuses/page.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/loans/page.tsx` | Local `nativeSelectClassName` | Shared import |
| `hr/incentives/page.tsx` | Local `nativeSelectClassName` | Shared import |

**Duplicated class strings removed:** 11 `nativeSelectClassName` + 2 `nativeTextareaClassName` = **13 consolidations**.

### P1: Admin primary button link class

**New export:** `primaryButtonLinkClassName` in `src/shared/ui/tokens/button-classes.ts` (aligned with `Button variant="primary"` sizing).

| File | Before | After |
|---|---|---|
| `admin/_components.tsx` | Local `primaryButtonClassName` + `textareaClassName` | Removed — admin pages use shared exports |
| `admin/users/page.tsx` | Import from admin `_components` | `@/shared/ui` (`primaryButtonLinkClassName`, `nativeTextareaClassName`) |
| `admin/roles/page.tsx` | Import from admin `_components` | `@/shared/ui` |
| `admin/invitations/page.tsx` | Import from admin `_components` | `@/shared/ui` |
| `admin/access/page.tsx` | Import from admin `_components` | `@/shared/ui` |

**Duplicated class strings removed:** 1 `primaryButtonClassName` + 1 `textareaClassName` = **2 consolidations**.

### Deferred (document only)

| Item | Reason |
|---|---|
| Employee profile tab pills | URL-sync pattern blocks trivial `Tabs` migration (unchanged from Pass 6). |
| Wizard step pills | `WizardForm` needs interactive navigation + `aria-current="step"` before HR wizard migration. |

### Files changed (Pass 7)

- `src/shared/ui/tokens/form-control-classes.ts` (new)
- `src/shared/ui/tokens/button-classes.ts`
- `src/shared/ui/tokens/index.ts`
- `src/app/(erp)/erp/hr/_components/hr-employees-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-foundation-pages.tsx`
- `src/app/(erp)/erp/hr/_components/hr-foundation-modal.tsx`
- `src/app/(erp)/erp/hr/_components/hr-assignment-form.tsx`
- `src/app/(erp)/erp/hr/_components/hr-employee-edit-modal.tsx`
- `src/app/(erp)/erp/hr/_components/hr-employee-wizard.tsx`
- `src/app/(erp)/erp/hr/_components/hr-operational-pages.tsx`
- `src/app/(erp)/erp/hr/advances/page.tsx`
- `src/app/(erp)/erp/hr/bonuses/page.tsx`
- `src/app/(erp)/erp/hr/loans/page.tsx`
- `src/app/(erp)/erp/hr/incentives/page.tsx`
- `src/app/(erp)/erp/admin/_components.tsx`
- `src/app/(erp)/erp/admin/users/page.tsx`
- `src/app/(erp)/erp/admin/roles/page.tsx`
- `src/app/(erp)/erp/admin/invitations/page.tsx`
- `src/app/(erp)/erp/admin/access/page.tsx`
- `docs/09-history/PLATFORM_UI_CONSISTENCY_SPRINT.md` (this section)
- `docs/09-history/PLATFORM_CHANGELOG.md`

### Verification (Pass 7)

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | **PASS** | Clean |
| `npm run typecheck` | **PASS** | No new errors |
| `npm test` | **917 pass / 0 fail** | No regressions |

### Remaining debt (post Pass 7)

1. **Employee profile tab pills** — URL-sync pattern blocks trivial `Tabs` migration (unchanged).
2. **Wizard step pills** — extend `WizardForm` with interactive navigation + ARIA before HR wizard migration.
3. **`WizardForm`** — zero production usages; needs stepper enhancement before HR adoption.
4. **Admin `inputClassName`** — still local in `admin/_components.tsx`; consider shared native input export in a future pass.

### Manual verification checklist (Pass 7)

- [ ] HR list filters + financial forms: native selects visible in dark mode
- [ ] HR assignment form: select + textarea fields styled consistently
- [ ] HR foundation modals: dynamic select/textarea fields render correctly
- [ ] Admin → Users / Roles: primary submit buttons + textarea fields styled via shared tokens

---

## Next sprint recommendation

1. HR employee edit modal + foundation modal `FieldControl` → shared `Input`.
2. Filter/submit bars on HR financial pages → `Input` + `Button secondary`.
3. HR list filter bars (employees, foundation) → shared `Input` + `Button secondary`.
4. Wire `WizardForm` into HR employee onboarding (step pills + ARIA).
5. Shared link-button styling export to replace duplicated accent/border classes on Links.
6. Resolve manufacturing typecheck/test debt before next manufacturing UI work.
