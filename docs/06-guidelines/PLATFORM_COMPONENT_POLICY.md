# Platform Component Policy

> **Status:** Component Freeze — effective 2026-07-07  
> **Authority:** [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md) · [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)

Business Apps **must reuse** these platform components. No duplicated implementations. No module-specific replacements unless approved through [Design Review Process](DESIGN_REVIEW_PROCESS.md) exception path.

**Implementation root:** `src/shared/ui/` · **Shell:** `src/shared/ui/app-shell/`

---

## Policy Rules

1. **Reuse first** — Import from `@/shared/ui` or documented platform barrels.
2. **No forks** — Do not copy component source into `src/features/*` and modify.
3. **Extend, don't replace** — Module wrappers may compose platform components; they may not reimplement behavior.
4. **Freeze** — New platform primitives require platform team approval and Constitution amendment if architectural.
5. **Exceptions** — Logged in [UX Migration Tracker](UX_MIGRATION_TRACKER.md) with remediation sprint.

---

## Frozen Component Catalog

### Data Display

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| `EnterpriseDataTable` | Operational lists, cursor/page pagination, row actions | `@/shared/ui` | Feature `*Table.tsx`, raw `<table>` |
| `KpiCard` | Dashboard metrics | `@/shared/ui` | Custom metric cards per app |
| `Timeline` | Chronological events | `@/shared/ui` | Module event lists |
| `ActivityFeed` | Operator activity stream | `@/shared/ui` | Custom feed widgets |
| `AuditTimeline` | Audit history display | `@/shared/ui` | Per-module audit HTML |

### Forms & Input

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| `EntityLookup` | Relation selection (lookup-first) | `@/shared/ui` | UUID text fields, raw selects of IDs |
| `EditableField` | Single-field inline edit | `@/shared/ui` | Custom inline inputs |
| `EditableSectionCard` | Grouped inline edit section | `@/shared/ui` | Profile cards with ad-hoc edit |
| `EditableFieldGrid` | Responsive editable grid | `@/shared/ui` | Manual grid of inputs |
| `RecordFormDialog` | Modal create/edit above list | `@/shared/ui` | Full-page forms for simple CRUD |
| `RecordFormSection` | Modal form sections | `@/shared/ui` | Unstyled modal bodies |
| `DatePicker` | Single date (forms) | `@/shared/ui` | **Native `type="date"`** |
| `DatePickerField` | Labeled date field | `@/shared/ui` | Native date inputs |
| `DateRangePickerField` | Date range | `@/shared/ui` | Two native date inputs |
| `DateFilterInput` / `DateRangeFilterInput` | List/report filters | `@/shared/ui` | Filter bar date hacks |
| `MoneyInput` | Currency amounts | `@/shared/ui` | Raw number input for money |
| `PhoneInput` | Phone numbers | `@/shared/ui` | Unvalidated tel fields |
| `AddressInput` | Structured addresses | `@/shared/ui` | Free-text address only |
| `Input` / `Select` / `Checkbox` / `Switch` | Primitives | `@/shared/ui` | Duplicate primitive libraries |

### Layout & Chrome

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| `PageContainer` | Workspace width/padding | `@/shared/ui` | Custom max-width wrappers |
| `PageHeader` | Title, description, help | `@/shared/ui` | Duplicate H1 blocks |
| `PageContent` | Main content region | `@/shared/ui` | |
| `NavTabBar` / `NavTabLink` | Profile/tab navigation | `@/shared/ui` | Custom tab implementations |
| `ProfileLayout` | Profile page scaffold | `@/shared/ui` | One-off profile shells |
| `ProfileHeader` | Entity header band | `@/shared/ui` | Duplicate avatar/title rows |
| `ProfileSidebar` | Profile side panel | `@/shared/ui` | |
| `DashboardTemplate` | Dashboard grid scaffold | `@/shared/ui` | Per-app dashboard layouts |

### Search & Filter

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| `FilterBar` | List filters | `@/shared/ui` | Ad-hoc filter rows |
| `SearchBar` | List/search entry | `@/shared/ui` | Unstyled search inputs |

### Workflow & Collaboration

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| `ApprovalCard` | Approval summary/action | `@/shared/ui` | Custom approve/reject cards |
| `AttachmentPanel` | File attachments | `@/shared/ui` | Per-form upload only |
| `CommentPanel` | Threaded comments | `@/shared/ui` | Module comment lists |
| `DocumentViewer` | Document preview | `@/shared/ui` | iframe hacks per module |

### Feedback & State

| Component | Purpose | Import | Do not duplicate |
| --- | --- | --- | --- |
| Platform feedback runtime | Toasts/alerts | `platform.feedback` | Direct Sonner/import in apps |
| `FieldErrorText` / `RequiredFieldMarker` | Form validation UI | `@/shared/ui` | Inline error spans |
| `Tooltip` | Permission/lock hints | `@/shared/ui` | `title` attribute only |
| `HelpHint` | Page/tab help | `@/shared/ui` | Random `?` icons |

### Hooks & Patterns

| API | Purpose | Location |
| --- | --- | --- |
| `useEditableField` | Inline edit state machine | `@/shared/ui/patterns` |
| `useEditableFieldKeyboard` | Keyboard save/cancel | `@/shared/ui/patterns` |
| `useEnterpriseUi` | Locale, date format, theme | `@/shared/ui/providers` |
| `nativeSelectClassName` | Styled native enum select | `@/shared/ui` |

---

## Shell Components (Not in `@/shared/ui` but frozen)

| Component | Location | Rule |
| --- | --- | --- |
| ERP App Shell | `src/app/(erp)/`, `src/shared/ui/app-shell/` | Apps render inside; no replacement |
| `HrShell` / app shells | `src/app/(erp)/erp/*/_components` | Thin wrappers only; same tokens |
| Command Palette | Platform shell | No per-app command systems |
| Global Search panel | ERP shell | No duplicate search modals |

---

## Module Wrapper Pattern (Allowed)

```tsx
// ✅ Allowed — composes platform components
export function HrLeaveBalanceTable(props) {
  return (
    <EnterpriseDataTable
      columns={leaveColumns}
      records={props.balances}
      emptyMessage="No leave balances."
    />
  );
}

// ❌ Forbidden — reimplements table
export function HrLeaveTable() {
  return <table>...</table>; // custom sort, pagination, actions
}
```

---

## Approval for New or Replacement Components

1. Prove platform catalog cannot compose the need.
2. Open Design Review with **Platform Compliance** stage emphasis.
3. If approved, add component to **this document** and `src/shared/ui` — not to feature folder.
4. Update [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md) if new checklist item needed.

---

## Enforcement

| Layer | Mechanism |
| --- | --- |
| Human | [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md) + [Design Review Process](DESIGN_REVIEW_PROCESS.md) |
| AI | `.cursor/rules/platform-ux-review-gate.mdc` |
| Lint (existing) | `.cursor/rules/no-native-date-inputs.mdc` |
| Tracker | [UX Migration Tracker](UX_MIGRATION_TRACKER.md) exception log |

---

## Related Documents

- [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)
- [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md)
- [UI Guidelines](UI_GUIDELINES.md)
- [Form Guidelines](FORM_GUIDELINES.md)
- [Lookup Guidelines](LOOKUP_GUIDELINES.md)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md)
- [ADR-021](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md)
