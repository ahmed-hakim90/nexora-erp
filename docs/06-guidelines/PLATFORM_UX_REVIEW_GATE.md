# Platform UX Review Gate

> **Authority:** Mandatory gate for every new or materially changed screen.  
> **Parent:** [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md) · [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)

No screen merges without passing this gate (or a documented exception per ADR-021).

**Quality scoring:** [Design Review Process](DESIGN_REVIEW_PROCESS.md)  
**Reusable components:** [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md)

---

## How to Use

1. Complete the checklist below for the screen(s) in the PR.
2. Mark each item **Pass**, **Fail**, or **N/A** with evidence (screenshot, file path, test note).
3. Submit through [Design Review Process](DESIGN_REVIEW_PROCESS.md).
4. Minimum **85/100** UX score required for merge; **95+** for enterprise-ready.

---

## Mandatory Checklist

### Navigation

| | |
| --- | --- |
| **Purpose** | Users reach the screen through the official app navigation model without orphan routes. |
| **Pass criteria** | Route registered in app manifest / `hr-navigation` (or equivalent); sidebar entry uses correct permission; breadcrumbs or back-link when deep-linked; Command Palette discoverability where applicable. |
| **Common mistakes** | Hardcoded sidebar outside shell; page exists but not in navigation; wrong `activeKey`; broken deep links after modal close. |
| **Examples** | ✅ `/erp/hr/leave` in `hr-navigation.ts` with `leaveView` permission. ❌ Standalone page with no nav entry. |

---

### Workspace Layout

| | |
| --- | --- |
| **Purpose** | Content renders inside the approved experience shell with correct spacing and regions. |
| **Pass criteria** | Uses `PageContainer`, `PageHeader`, `PageContent` (or shell equivalent); 24px workspace padding; no duplicate topbar/sidebar; respects ERP shell from `src/app/(erp)/`. |
| **Common mistakes** | Full-page layout bypassing shell; double headers; custom background breaking tokens. |
| **Examples** | ✅ `HrShell` + `PageContainer`. ❌ Raw `<div className="p-4">` without shell wrapper. |

---

### Page Type

| | |
| --- | --- |
| **Purpose** | Screen follows the correct archetype (list, profile, dashboard, report, wizard, approval). |
| **Pass criteria** | Page type matches Constitution §5–§8; list-first for operational CRUD; dashboard uses KPI + actionable tables; reports use report layout contract. |
| **Common mistakes** | CRUD table presented as dashboard; profile as separate full-page form route. |
| **Examples** | ✅ Employee list with modal create/edit. ❌ `/new` full-page form for simple master data. |

---

### Profile Layout

| | |
| --- | --- |
| **Purpose** | Entity profiles use tabbed layout with inline-editable sections. |
| **Pass criteria** | `NavTabBar` / tab sections; `ProfileHeader` or equivalent; no read-only-only profile without justification; cross-engine fields marked. |
| **Common mistakes** | Static `InfoRow` only with no edit path; all fields on one long scroll without tabs. |
| **Examples** | ✅ `HrEmployeeProfileWorkspace` with tabs. ❌ Single column read-only dump. |

---

### List Layout

| | |
| --- | --- |
| **Purpose** | Operational lists are the primary workspace surface. |
| **Pass criteria** | `EnterpriseDataTable` or approved list primitive; primary action visible; row actions; pagination/cursor; preserves filters in URL where applicable. |
| **Common mistakes** | Card-only list without table for operational data; no empty state; no row actions. |
| **Examples** | ✅ Leave requests table with status badges. ❌ Unstyled HTML `<table>`. |

---

### Entity Lookup

| | |
| --- | --- |
| **Purpose** | Users never select or type raw UUIDs for relations. |
| **Pass criteria** | All FK fields use `EntityLookup` with registered `providerKey`; labels shown in tables; server receives UUID only via lookup value. |
| **Common mistakes** | `<select>` of UUIDs; text input for employee ID; displaying raw id in UI. |
| **Examples** | ✅ `EntityLookup providerKey="hr.employees.lookup"`. ❌ `<input name="employeeId" />` expecting UUID paste. |

---

### Platform Date Picker

| | |
| --- | --- |
| **Purpose** | Consistent locale-aware dates; no browser-native date UX. |
| **Pass criteria** | `DatePicker`, `DatePickerField`, `DateRangePickerField`, or filter date components from `@/shared/ui`; values submitted as ISO `YYYY-MM-DD`. |
| **Common mistakes** | `<input type="date" />`; `type={field.type === "date" ? "date" : "text"}`. |
| **Examples** | ✅ `DatePicker name="startsOn"`. ❌ Native date input (see `.cursor/rules/no-native-date-inputs.mdc`). |

---

### RecordFormDialog

| | |
| --- | --- |
| **Purpose** | Create/edit opens as modal overlay above list per ERP page modal pattern. |
| **Pass criteria** | Uses `RecordFormDialog` / `RecordFormSection` or module-local equivalent that matches platform modal contract; `?create=1` / `?edit=id` query pattern; closing modal preserves list state. |
| **Common mistakes** | Full-page `/new` and `/edit` routes; form loses filters on cancel. |
| **Examples** | ✅ List route + modal query params. ❌ Dedicated form page for simple master record. |

---

### EditableField

| | |
| --- | --- |
| **Purpose** | Profile fields show editable affordance with ownership rules. |
| **Pass criteria** | Entity-owned fields use `EditableField` with `ownership="entity"`; cross-engine uses `ownership="cross-engine"` + workflow opener; lock icon when read-only. |
| **Common mistakes** | Plain text with no edit affordance; direct mutation of cross-engine field inline. |
| **Examples** | ✅ `EditableField` on employee phone. ❌ Cross-engine salary edited inline without workflow. |

---

### Inline Editing Rules

| | |
| --- | --- |
| **Purpose** | Inline editing follows platform save, validation, and audit contracts. |
| **Pass criteria** | Complies with [Inline Editing Standard](INLINE_EDITING_STANDARD.md) and [Edit Mode v2](EDIT_MODE_V2_STANDARD.md); batch save where applicable; unsaved indicator; server validation on save. |
| **Common mistakes** | Client-only validation; silent save failure; mixed inline + page redirect edit. |
| **Examples** | ✅ `EditableSectionCard` with `onSave` server action. ❌ `contentEditable` div. |

---

### Permissions

| | |
| --- | --- |
| **Purpose** | UI reflects authorization; mutations enforced server-side. |
| **Pass criteria** | Loader/action calls `requirePermission`; hidden vs disabled vs lock follows Constitution §2.6; RLS backs data access. |
| **Common mistakes** | Frontend-only hide with open API; no permission on server action. |
| **Examples** | ✅ `requirePermission({ permission: HR_PERMISSIONS.leaveApprove })`. ❌ Button hidden but action callable. |

---

### Audit

| | |
| --- | --- |
| **Purpose** | Business-critical mutations are auditable. |
| **Pass criteria** | `recordAuditEvent` (or engine equivalent) on create/update/approve/delete where policy requires; audit visible on entity timeline when applicable. |
| **Common mistakes** | Status change with no audit; financial edit without actor/timestamp. |
| **Examples** | ✅ Leave approval writes audit + approval event. ❌ Direct DB update with no trail. |

---

### Notifications

| | |
| --- | --- |
| **Purpose** | Operators receive actionable signals for workflow events. |
| **Pass criteria** | Submitted/approved/rejected events use platform notification service or `hr_operator_notifications` pattern; idempotency keys where applicable. |
| **Common mistakes** | No notification on approval; duplicate notifications on retry. |
| **Examples** | ✅ Leave runtime `notify()` on approval. ❌ Only client toast, no operator notification. |

---

### Responsive

| | |
| --- | --- |
| **Purpose** | Usable on tablet and mobile widths for operational workflows. |
| **Pass criteria** | Grid collapses (`md:`, `lg:` breakpoints); tables scroll or stack; primary CTA reachable on mobile; no horizontal overflow on 375px. |
| **Common mistakes** | Fixed 4-column grid on mobile; clipped modals. |
| **Examples** | ✅ `grid gap-4 md:grid-cols-2 xl:grid-cols-4`. ❌ 1200px min-width table. |

---

### RTL

| | |
| --- | --- |
| **Purpose** | Arabic and RTL locales mirror correctly. |
| **Pass criteria** | Uses logical properties / `EnterpriseUiProvider` locale; icons and chevrons flip; form labels align; dates respect locale format. |
| **Common mistakes** | Hardcoded `ml-`/`mr-` only; LTR-only date display. |
| **Examples** | ✅ `formatDisplayDate` with locale. ❌ `text-left` everywhere without RTL variant. |

---

### Accessibility

| | |
| --- | --- |
| **Purpose** | Keyboard and screen-reader operable enterprise UI. |
| **Pass criteria** | Focus rings on interactive elements; `aria-label` on icon buttons; form errors linked via `aria-describedby`; contrast meets dark/light tokens. |
| **Common mistakes** | Icon-only buttons without label; trap focus broken in modal. |
| **Examples** | ✅ `EditableField` keyboard save/cancel. ❌ `<div onClick>` without role/button. |

---

### Loading State

| | |
| --- | --- |
| **Purpose** | Users see progress during server fetches and mutations. |
| **Pass criteria** | Route-level `loading.tsx` or suspense boundary where appropriate; button disabled + spinner on submit; no frozen UI. |
| **Common mistakes** | Double submit; no feedback during 3s+ action. |
| **Examples** | ✅ `EditableField` saving spinner. ❌ Blank page until full load completes. |

---

### Skeleton

| | |
| --- | --- |
| **Purpose** | Perceived performance during initial data load. |
| **Pass criteria** | Table/dashboard skeleton or shimmer for slow loaders; skeleton matches final layout shape. |
| **Common mistakes** | Generic spinner only for table pages; layout shift on load. |
| **Examples** | ✅ Table skeleton rows. ❌ "Loading..." text only on data-heavy page. |

---

### Error State

| | |
| --- | --- |
| **Purpose** | Failures are actionable, not silent. |
| **Pass criteria** | `error.tsx` boundary for route; inline field errors; destructive border for form errors; retry or support path. |
| **Common mistakes** | `catch {}` swallow; generic "Error" with no recovery. |
| **Examples** | ✅ `erp/error.tsx` pattern. ❌ Empty table on loader failure. |

---

### Empty State

| | |
| --- | --- |
| **Purpose** | Zero-data screens guide next action. |
| **Pass criteria** | `EnterpriseDataTable` `emptyMessage` or dedicated empty component with primary CTA; explains why empty and what to do. |
| **Common mistakes** | Blank table body; "No data" without action. |
| **Examples** | ✅ "No leave balances — seed policies in Settings" + link. ❌ Empty white space. |

---

### Search

| | |
| --- | --- |
| **Purpose** | Users find records quickly on list workspaces. |
| **Pass criteria** | List pages expose search input or global search integration; debounced where client-side; server search for large sets. |
| **Common mistakes** | No search on 500+ row logical lists; search clears unrelated URL state. |
| **Examples** | ✅ `FilterBar` / `SearchBar` with query param. ❌ Scroll-only discovery. |

---

### Filters

| | |
| --- | --- |
| **Purpose** | Operators narrow lists by status, date, branch, etc. |
| **Pass criteria** | Filters visible or in filter drawer; values in URL for shareable state; clear filters action. |
| **Common mistakes** | Hidden filters with no indicator; filter loss on pagination. |
| **Examples** | ✅ Status + date range in URL. ❌ Session-only filters. |

---

### Saved Views

| | |
| --- | --- |
| **Purpose** | Power users persist filter/sort/column preferences. |
| **Pass criteria** | N/A for MVP lists; Pass when platform saved-views contract is used if table supports it; document N/A with justification for simple masters. |
| **Common mistakes** | Reimplementing saved views per module. |
| **Examples** | ✅ Platform `SavedView` integration when available. N/A: small reference list &lt; 20 rows. |

---

### Bulk Actions

| | |
| --- | --- |
| **Purpose** | Safe multi-record operations where business allows. |
| **Pass criteria** | Checkbox selection + bulk bar only when backend supports safe bulk; confirm dialog for destructive/financial bulk. |
| **Common mistakes** | Bulk delete without confirm; bulk without permission check. |
| **Examples** | ✅ Bulk approve with confirmation modal. N/A: read-only report. |

---

### Keyboard Navigation

| | |
| --- | --- |
| **Purpose** | Power users operate without mouse. |
| **Pass criteria** | Tab order logical; `EditableField` Enter/Escape; Command Palette `Ctrl/Cmd+K`; data table row focus where supported. |
| **Common mistakes** | Modal without focus trap; non-focusable row actions. |
| **Examples** | ✅ Edit Mode v2 keyboard contract. ❌ Click-only approve buttons in table. |

---

### Performance

| | |
| --- | --- |
| **Purpose** | Lists and profiles stay responsive at enterprise data volumes. |
| **Pass criteria** | Server components default; pagination/cursor; no N+1 in loader; avoid huge client bundles for tables. |
| **Common mistakes** | Load 10k rows client-side; client component entire page unnecessarily. |
| **Examples** | ✅ Cursor pagination mode in `EnterpriseDataTable`. ❌ `.limit(10000)` without pagination UI. |

---

### Reusable Components

| | |
| --- | --- |
| **Purpose** | Platform component catalog is the only source of UI primitives. |
| **Pass criteria** | Imports from `@/shared/ui` and [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md); no duplicate table/form implementations. |
| **Common mistakes** | New `DataTable.tsx` in feature folder; forked modal. |
| **Examples** | ✅ `EnterpriseDataTable`. ❌ Feature-local HTML table with custom sort. |

---

### No Duplicated UI

| | |
| --- | --- |
| **Purpose** | One implementation per UX pattern across apps. |
| **Pass criteria** | No second date picker, lookup, or approval card in `src/features/*/_components` unless approved exception. |
| **Common mistakes** | `hr-*-form-dialog.tsx` copying entire modal shell differently per page. |
| **Examples** | ✅ Shared `RecordFormDialog`. ❌ Third custom dialog primitive. |

---

### No Native Date Inputs

| | |
| --- | --- |
| **Purpose** | Ban browser-native date UX (locale, RTL, styling). |
| **Pass criteria** | Zero `type="date"` in ERP UI; grep clean in changed files. |
| **Common mistakes** | Quick form with native date "temporarily". |
| **Examples** | See `.cursor/rules/no-native-date-inputs.mdc`. |

---

### No Native Select Inputs

| | |
| --- | --- |
| **Purpose** | Styled, accessible, dark-mode-safe selects. |
| **Pass criteria** | Use `Select` or `nativeSelectClassName` from shared UI for simple enums; `EntityLookup` for relations. |
| **Common mistakes** | Unstyled `<select>` without token classes in modals. |
| **Examples** | ✅ `nativeSelectClassName` on status filter. ❌ Raw select invisible in dark mode. |

---

### No Raw UUIDs

| | |
| --- | --- |
| **Purpose** | UUIDs are persistence identifiers, not user-facing values. |
| **Pass criteria** | Tables show labels; forms use lookups; debug UUID only in admin/diagnostic views. |
| **Common mistakes** | Column displays `employee_id`; approval shows request id only. |
| **Examples** | ✅ "Ahmed Hassan (EMP-001)". ❌ `550e8400-e29b-41d4-a716-446655440000`. |

---

### Cross-Engine Workflow Respected

| | |
| --- | --- |
| **Purpose** | Bounded contexts do not mutate each other's owned data from UI. |
| **Pass criteria** | Leave, payroll, attendance, inventory, finance fields open owning workflow; read-only or link when not owner. |
| **Common mistakes** | Edit salary on employee profile inline; attendance day edited from leave screen. |
| **Examples** | ✅ `ownership="cross-engine"` opens compensation workflow. ❌ Direct payroll field PATCH from HR profile. |

---

### Shared Design Tokens Used

| | |
| --- | --- |
| **Purpose** | Visual consistency across apps and themes. |
| **Pass criteria** | `hsl(var(--surface))`, `--foreground`, `--border`, `--accent`, `--muted`, `--danger`, `--success`; no hardcoded hex except illustrations. |
| **Common mistakes** | `#fff` background in dark mode; `border-only` buttons invisible in dark theme. |
| **Examples** | ✅ Modal inputs with explicit surface/border tokens. ❌ `bg-white text-black` only. |

---

## Gate Sign-Off

| Role | Check | Sign-off |
| --- | --- | --- |
| Author | Self-review checklist complete | |
| UX Review | Constitution + this gate | |
| Platform Compliance | Component Policy | |
| Architecture | No ownership violations | |

---

## Related Documents

- [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)
- [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md)
- [Design Review Process](DESIGN_REVIEW_PROCESS.md)
- [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md)
- [UX Migration Tracker](UX_MIGRATION_TRACKER.md)
- [ERP Page Modal Pattern](../../.cursor/rules/erp-page-modal-patterns.mdc)
