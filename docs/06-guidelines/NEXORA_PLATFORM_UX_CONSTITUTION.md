# Nexora Platform UX Constitution

> **Status:** Constitutional — mandatory for the entire Nexora Platform.  
> **Authority:** This document is the supreme UX standard for every Business App, Platform Engine surface, and future module.  
> **Scope:** HR, Payroll, Finance, Inventory, Sales, CRM, Purchasing, Manufacturing, Maintenance, Fleet, Projects, Help Desk, POS, Commerce, Quality, Documents, Assets, Analytics, and all future modules.

## Related Documents

| Topic | Document |
| --- | --- |
| Visual design tokens and component styling | [UI Guidelines](UI_GUIDELINES.md) |
| Experience shells and navigation intent | [UX Guidelines](UX_GUIDELINES.md) |
| **UX governance (enforceable)** | [ADR-021](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md) |
| **Pre-merge review gate** | [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md) |
| **Migration tracking** | [UX Migration Tracker](UX_MIGRATION_TRACKER.md) |
| **Review workflow & scoring** | [Design Review Process](DESIGN_REVIEW_PROCESS.md) |
| **Component freeze** | [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md) |
| Inline editing | [Inline Editing Standard](INLINE_EDITING_STANDARD.md) |
| Edit Mode v2 | [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md) |
| Forms and modals | [Form Guidelines](FORM_GUIDELINES.md) |
| **Easy operator forms** | [Easy Operator Forms Standard](EASY_OPERATOR_FORMS_STANDARD.md) |
| Entity lookup | [Lookup Guidelines](LOOKUP_GUIDELINES.md) |
| Reports | [Report Guidelines](REPORT_GUIDELINES.md) |
| Printing | [Print Guidelines](PRINT_GUIDELINES.md) |
| Operator tasks and wizards | [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md) |
| ERP navigation model | [ERP Navigation](../02-business-apps/ERP_NAVIGATION.md) |
| Architecture freeze | [Enterprise Blueprint v1.0](../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) |

---

## 1. Constitutional Mandate

Nexora is UX-first. Architecture quality must be matched by interaction quality.

This constitution defines **reusable UX architecture** — not individual page designs. No module may invent competing shells, table frameworks, form systems, feedback systems, edit modes, or navigation models.

### 1.1 What This Constitution Governs

Every screen in Nexora must comply with standards for:

- Navigation, workspace layouts, list pages, detail/profile pages
- Inline editing, entity pages, record creation, wizards, modals, side drawers, tabs
- Dashboards, KPI cards, search, filters, saved views, bulk operations
- Calendars, timelines, activity feeds, notifications
- Attachments, comments, approval screens, reports, printing
- Mobile, accessibility, keyboard shortcuts
- Loading, error, empty, and skeleton states
- Animations, colors, typography, spacing, responsive rules
- Interaction rules: click, hover, save, undo, history, audit, versioning

### 1.2 What This Constitution Does Not Do

- **Do not redesign a single page** to satisfy this document.
- **Do not create module-local UX primitives** when platform components exist.
- **Do not ship demo-only UI** that bypasses permissions, audit, or validation.

Migration happens incrementally. New screens and refactors must comply immediately.

---

## 2. Constitutional Principles

### 2.1 Platform Before Module

Apps consume the official UX foundation. Apps do not build competing:

- Shells, navigation, command palette, global search
- Table/list frameworks, dashboard frameworks
- Form systems, inline edit primitives, feedback/toast systems
- Report layouts, print layouts, approval layouts

### 2.2 Lookup-First

Users never work with raw UUIDs. Every relation uses `EntityLookup` or platform lookup contracts. Internal IDs are persistence-only.

### 2.3 Everything Looks Editable

Profile and detail workspaces show editable affordance on all fields. Direct edit applies only to entity-owned fields. Cross-engine fields open the correct workflow — never silent cross-domain mutation.

### 2.4 List-First Workspaces

Operational lists are the primary workspace surface. Create and edit open as overlays above the list unless a wizard or document lifecycle explicitly requires otherwise.

### 2.5 Task-Oriented, Not CRUD-Oriented

Screens organize around operator intent: receive goods, approve leave, post journal, dispatch order — not around database tables.

### 2.6 Permission-Aware By Default

Lack of permission shows visible read-only state with lock icon and tooltip. Sensitive data is hidden only when security policy requires it. Server and RLS enforce all mutations.

### 2.7 Feedback Through Platform Runtime

All user-facing success, error, warning, and info feedback goes through `platform.feedback`. Apps must not import Sonner or ad-hoc toast libraries directly.

### 2.8 Audit Everything That Matters

Financial, assignment, contract, inventory, approval, and master-data changes record who, when, old value, new value, and reason when policy requires it.

### 2.9 Premium, Fast, Enterprise-Ready

The product must feel close to Dynamics 365, SAP Fiori, Linear, Stripe Dashboard, Notion, and Vercel Dashboard — clean, fast, spacious, and production-grade.

---

## 3. Experience Shells

Approved platform experiences own layout, navigation, search, notifications, context switching, theme, localization, and feedback placement:

| Shell | Purpose |
| --- | --- |
| ERP Workspace | Primary business operations |
| Self-Service Portal | Employee and external self-service |
| Admin & Marketplace | Platform administration |
| Connector / API surfaces | Integration operators |
| Sandbox | Safe experimentation |
| Automation | Workflow and job operators |
| AI-assisted flows | Governed AI interactions |

Business apps render **inside** a shell. They do not replace shell chrome.

### 3.1 Shell Components

Canonical implementation: `src/shared/ui/app-shell/`, `src/app/(erp)/`.

| Region | Responsibility |
| --- | --- |
| Topbar (64px) | Cross-platform context, utilities, global search entry |
| Sidebar (280px / 72px collapsed) | Active app navigation |
| App Launcher | Installed apps, favorites, pins |
| Command Palette (`Ctrl/Cmd + K`) | High-frequency actions |
| Company / Branch switcher | Tenant and operational context |
| Notifications | Platform notification center |
| User menu | Profile, settings, sign out |
| Main workspace | App content with 24px padding on `#F8FAFC` background |

---

## 4. Navigation

Nexora uses **intent-based navigation**. Hardcoded global sidebars outside the platform shell are not acceptable.

### 4.1 Navigation Layers

```text
App Launcher → pick business domain
Contextual Sidebar → navigate within active app
Topbar → cross-app utilities and context
Command Palette → jump to record, action, report, setting
Universal Search → records, commands, reports, documents, dashboards
Breadcrumbs → orient within deep hierarchies
Quick Actions → contextual primary work on current screen
```

### 4.2 Navigation Rules

- Sidebar items come from app manifests — not hardcoded per page.
- Deep links must preserve list state (filters, search, cursor, saved view).
- Modal routes (`?create=`, `?edit=`) redirect from `/new` and `/[id]/edit` per ERP modal pattern.
- Mobile: sidebar becomes `Sheet`; primary actions remain reachable with one hand.
- RTL/LTR: navigation order, icons, and chevrons mirror correctly.

### 4.3 Keyboard Navigation

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + /` | Focus list search (when on list page) |
| `Esc` | Close overlay, cancel edit, dismiss palette |
| `↑` `↓` | Move selection in lists and palettes |
| `Enter` | Activate selected item |
| `Tab` / `Shift + Tab` | Move focus in forms and inline editors |

---

## 5. Workspace Layouts

Every workspace uses shared layout primitives from `src/shared/ui/page/` and `src/shared/ui/workspace/`.

### 5.1 Layout Primitives

| Component | Use |
| --- | --- |
| `PageContainer` | Max-width page wrapper with consistent spacing |
| `PageHeader` | Title, description, help hint, primary actions |
| `PageActions` | Action button group in header |
| `PageFilters` | Filter bar container |
| `PageContent` | Primary content region |
| `PageSidebar` | Secondary contextual panel |
| `PageFooter` | Pagination, summary, legal notes |

### 5.2 Workspace Types

| Type | Template | Primary Use |
| --- | --- | --- |
| List Workspace | `ListPageTemplate` | Master data, operational queues |
| Detail Workspace | `DetailWorkspaceTemplate` | Read-heavy record inspection |
| Profile Workspace | `EditableProfileWorkspace` | Entity profiles with Edit Mode v2 |
| Document Workspace | `DocumentLayout` | Transaction documents with lifecycle |
| Dashboard Workspace | `DashboardTemplate` | KPIs, charts, actionable summaries |
| Report Workspace | `report-framework` | Filtered report execution and export |
| Operator Workspace | `operator-experience` components | Task-first floor/warehouse work |

### 5.3 Layout Rules

- 90% of interface remains neutral; module accent is decoration only.
- Section cards use 16px radius; dialogs use 20px radius.
- Never build cramped pages — enterprise UI needs breathing space (8px spacing system).
- Sticky headers for tables, document lifecycle bars, and edit-mode action bars.
- Two-column layouts collapse to single column below `lg` (1024px).

---

## 6. List Page Architecture

Every list page in every module shares one architecture.

### 6.1 Required Regions

```text
PageHeader
  Title + record count + help
  Primary action (Create)
  Secondary actions (Import, Export, Settings)
PageFilters / FacetedFilterBar
  Search
  Quick filters
  Advanced filters
  Saved views selector
  Column / density controls
EnterpriseDataTable
  Sticky header
  Row selection
  Sortable columns
  Row actions
  Inline status chips
Bulk action bar (when selection > 0)
Pagination / cursor controls
Empty / Loading / Error states
RecordFormDialog overlay (?create= / ?edit=)
```

### 6.2 List Capabilities

| Capability | Rule |
| --- | --- |
| Search | Debounced server search; preserves query in URL |
| Views | Named saved views per user/role; system default view |
| Filters | Faceted filters with clear active filter chips |
| Grouping | Optional row grouping with expand/collapse |
| Columns | Show/hide, reorder, pin; never expose raw IDs |
| Density | Comfortable (default) and compact modes |
| Selection | Checkbox column; shift-click range where supported |
| Pagination | Cursor or offset; preserve position on return |
| Row actions | Icon + label; overflow menu for secondary |
| Inline actions | Safe quick actions (status toggle, favorite) |
| Bulk actions | Permission-checked; confirmation for destructive |
| Export | Background-capable via Export Engine |
| Import | Guided import with validation preview |
| Sorting | Server-side for large datasets |

### 6.3 List Interaction Rules

| Interaction | Behavior |
| --- | --- |
| Single click | Select row / focus row |
| Double click | Open detail or profile (module convention) |
| Hover | Reveal row actions; show preview tooltip where configured |
| Right click | Context menu with safe row actions |
| `Enter` on focused row | Open detail/profile |
| `Space` on checkbox | Toggle selection |

### 6.4 List URL State

List state lives in URL query params:

- `q` — search
- `filters` — serialized filter state
- `view` — saved view id
- `sort`, `order` — column sort
- `cursor` / `page` — pagination
- `create`, `edit` — modal state

Closing a modal removes only modal params; filters and search persist.

---

## 7. Detail and Profile Page Architecture

### 7.1 Page Type Decision

| Scenario | Pattern |
| --- | --- |
| Master entity (Employee, Customer, Item, Asset…) | Profile Workspace + Edit Mode v2 |
| Transaction document (Invoice, Transfer, MO…) | Document Workspace + lifecycle bar |
| Lightweight inspection | Detail Workspace (read-first) |
| Simple lookup record with few fields | List modal create/edit only |

### 7.2 Universal Profile Layout

Every entity profile — Employee, Customer, Supplier, Item, Warehouse, Asset, Machine, Vehicle, Project, Company, Branch, Contract, Document — follows **one reusable architecture**:

```text
Profile Header
  Avatar / icon / document number
  Primary label + secondary label
  Status badge
  Key metrics strip (optional)
  Actions: Edit | More | Print | Share
Edit Mode Bar (Edit Mode v2)
  View: [Edit]
  Edit: [Cancel] [Save Changes] + Unsaved indicator
NavTabBar
  Overview | Details | Relations | Timeline | Documents | Audit
  (+ module-specific tabs after platform tabs)
Section Grid
  EditableSectionCard × N
    Header: Title | Last updated | History | Audit | Collapse
    Body: EditableFieldGrid
FloatingRecordPanel (optional)
  Quick facts, related counts, pinned actions
Cross-Engine Workflow Dialog (in-page, never navigate away)
```

### 7.3 Standard Profile Tabs

| Tab | Content |
| --- | --- |
| Overview | Summary cards, KPIs, key fields, recent activity |
| Details | Sectioned editable fields by domain |
| Relations | Linked entities (orders, assignments, locations) |
| Timeline | Status changes, system events, approvals |
| Documents | Attached files, generated PDFs |
| Comments | Threaded discussion with @mentions |
| Audit | Full audit log with field-level history |

Modules may add tabs (e.g. Payroll, Attendance, Stock) but must not remove platform tabs when data exists.

### 7.4 Detail Page Rules

- No monolithic full-page edit forms for master/profile data.
- `/[id]/edit` redirects to profile with Edit Mode or list `?edit=`.
- Saving never navigates away from the profile.
- Cross-engine fields use **Change** → in-page workflow dialog.
- Permission-denied fields remain visible with lock icon.

---

## 8. Inline Editing

Canonical reference: [Inline Editing Standard](INLINE_EDITING_STANDARD.md).

### 8.1 Core Rule

**Everything looks editable. Not everything is directly editable.**

### 8.2 Field Ownership

| Ownership | UI | Save |
| --- | --- | --- |
| `entity` | Inline edit | Direct save / batch save |
| `versioned` | Inline edit | Versioned save semantics |
| `cross-engine` | **Change** opens workflow | Saved through workflow only |
| `readonly` | Muted display | Never saved |

### 8.3 Platform Components

| Component | Purpose |
| --- | --- |
| `EditableField` | Single-field inline editor |
| `EditableFieldGrid` | Responsive field layout |
| `EditableSectionCard` | Section shell with header actions |
| `EditablePage` | Page-level View/Edit bar |
| `EditableProfileWorkspace` | Full profile layout |
| `useEditablePage` | Draft state, changed fields, batch save |
| `CrossEngineLookupWorkflow` | Generic cross-engine dialog |

### 8.4 Edit Mode v2

Canonical reference: [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md).

- **View Mode:** one **Edit** action.
- **Edit Mode:** inline editors + **Cancel** / **Save Changes** + unsaved indicator.
- `Ctrl/Cmd + S` saves; `Esc` cancels when no workflow dialog is open.
- Unsaved navigation guard: Save / Discard / Continue Editing.

### 8.5 Autosave Policy

| Allowed (autosave) | Never autosave |
| --- | --- |
| Notes | Financial values |
| Descriptions | Assignment changes |
| Comments | Contract terms |
| | Payroll amounts |
| | Inventory quantities |
| | Approval decisions |

---

## 9. Record Creation

### 9.1 Creation Surfaces

| Complexity | Surface |
| --- | --- |
| Simple master record (≤ 15 fields) | `RecordFormDialog` modal over list |
| Sectioned master record | Modal with `RecordFormSection` cards |
| Multi-step operational task | `OxWizardDefinition` wizard |
| Complex document | Document Workspace with draft lifecycle |
| Quick capture (floor/warehouse) | Operator task card + scanner frame |

### 9.2 Creation Rules

- Primary create action lives in list `PageHeader`.
- `/new` routes redirect to `?create=1` on list route.
- Create modal validates client + server + business rules before persist.
- On success: toast via `platform.feedback`, close modal, refresh list row or navigate to profile.
- Smart defaults come from context engine — operator confirms when uncertain.
- Required fields marked consistently; inline validation on blur and submit.
- Every field has a persistent visible label; placeholders are supplemental only. See [Easy Operator Forms Standard](EASY_OPERATOR_FORMS_STANDARD.md).
- List workspaces order: KPIs → primary create section → filter → table.
- Enum and status values displayed to users must be localized — never raw English foundation labels in Arabic UI.

### 9.3 Wizards

Long processes use platform wizard runtime:

- Step indicator (`WizardStepIndicator`)
- Per-step validation before advance
- Save draft and resume later
- Review step before final submit
- Operator-safe errors per [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)

---

## 10. Modals, Drawers, and Overlays

### 10.1 Surface Selection

| Surface | Use |
| --- | --- |
| `RecordFormDialog` | Create/edit master records over list |
| `Dialog` | Confirmations, small focused tasks, warnings |
| `FloatingRecordPanel` / Drawer | Side detail, quick review, contextual actions |
| `Sheet` | Mobile navigation, mobile filters |
| In-page workflow dialog | Cross-engine field changes on profiles |

### 10.2 Overlay Rules

- Focus trap in all modals; `Esc` closes non-destructive overlays.
- Destructive actions require explicit confirmation dialog.
- Modal form inputs must have visible contrast in dark mode: surface, border, text, focus ring.
- Buttons must not rely on border-only styling — visible background in light and dark themes.
- Z-index follows token layers: overlay (50), modal (60), toast (70).

### 10.3 Tabs

Use `NavTabBar` / `NavTabLink` for page-level tabs. Tab state may live in URL hash or query (`tab=`) for deep linking.

- Tab panels load independently where sections are heavy.
- Unsaved changes in Edit Mode block silent tab switch.
- Mobile: tabs scroll horizontally; avoid more than 7 primary tabs.

---

## 11. Forms

Canonical references: [Form Guidelines](FORM_GUIDELINES.md), [Lookup Guidelines](LOOKUP_GUIDELINES.md).

### 11.1 Form Stack

- React Hook Form + Zod schemas in `application/schemas`
- Server-side validation repeats critical rules in application services
- `RecordFormSection` for grouped fields
- `usePlatformFormValidation` for readable field errors

### 11.2 Required Field Components

| Field Type | Component |
| --- | --- |
| Entity reference | `EntityLookup` |
| Date | `DatePicker` / `DatePickerField` — **never** `<input type="date">` |
| Date-time | `DatePicker` (`mode="datetime"`) |
| Currency | Currency-aware `Input` with locale formatting |
| Number | `Input` with min/max/step and locale grouping |
| Phone | Phone-formatted `Input` |
| Email | `Input` (`type="email"`) |
| Address | Structured address component |
| Attachment | Platform file attachment workflow |
| Select / multi-select | `Select` / platform multi-select |
| Boolean | `Checkbox` / `Switch` |
| Rich text | Platform rich text editor |

### 11.3 Form UX Rules

- Section cards with title and optional description.
- Inline validation on blur; blocking validation on submit.
- Prevent double submit; disable submit while saving.
- Preserve user input on server error.
- Help text for non-obvious business fields.
- Destructive and financial actions require confirmation.

---

## 12. Search, Filters, and Saved Views

### 12.1 Search Layers

| Layer | Scope |
| --- | --- |
| Universal Search (topbar) | Apps, commands, records, reports, settings, documents |
| List Search | Current entity list; server-side debounced |
| Lookup Search | Entity picker async search with recent/favorites |
| Report Search | Parameter and column search |

Search UI should feel like Raycast / Linear — fast, keyboard-first, grouped results.

### 12.2 Filters

- `FacetedFilterBar` for standard list filtering.
- Active filters render as removable chips.
- Advanced filters collapse behind **Filters** button on mobile.
- Filter state serializes to URL for shareable views.
- Clear all resets to default view.

### 12.3 Saved Views

- System default view per list (role-aware).
- User can save personal views (columns, filters, sort, density).
- View selector in list toolbar; name + description.
- Views never leak cross-tenant data.

---

## 13. Bulk Operations

- Bulk action bar appears when selection count > 0.
- Actions are permission-checked server-side.
- Destructive bulk actions show count + confirmation with consequence summary.
- Long-running bulk jobs enqueue via Background Jobs; show progress notification.
- Partial failure reports which records failed and why.
- Export bulk selections through Export Engine — not client-side CSV of unbounded data.

---

## 14. Dashboards and KPI Cards

### 14.1 Dashboard Architecture

Use `DashboardTemplate` and `dashboard-widgets`.

```text
Dashboard Header
  Title + date range selector
  Refresh + export actions
KPI Row
  KPI cards (4–6 per row desktop, 2 tablet, 1 mobile)
Chart / Table Region
  Actionable charts linking to filtered lists
Task Queue Region
  Pending approvals, exceptions, overdue items
Recent Activity
  Cross-module activity feed strip
```

### 14.2 KPI Card Structure

- Icon + label + value + change indicator
- Short helper text or sparkline
- Click navigates to filtered list or report
- Loading skeleton matches card layout
- Empty state explains how data will appear

### 14.3 Dashboard Rules

- Show actionable metrics — not vanity-only charts.
- Date range filter applies to all dashboard widgets consistently.
- Permission-filtered data — no chart leaks unauthorized totals.
- Heavy aggregates run as platform workloads, not browser-side rollups.

---

## 15. Calendars, Timelines, and Activity Feeds

### 15.1 Calendars

- Use platform date components; respect company timezone and locale.
- Month / week / day views with consistent event chip styling.
- Click event → profile or document; drag-drop only when workflow supports reschedule.
- Loading shows calendar skeleton grid.

### 15.2 Timelines

- `AuditActivityTimeline` for record-level events.
- Newest-first default; filter by event category.
- Each event: actor, timestamp, action, payload summary, link to detail.
- Approval, status, and comment events use consistent icons.

### 15.3 Activity Feed

- Home workspace and profile side panels show recent activity.
- Feed items link to source record.
- Real-time updates via notification/subscription where available.

---

## 16. Notifications

- Platform notification center in topbar.
- In-app toasts through `platform.feedback` only.
- Notification types: info, success, warning, error, approval request, job completion.
- Approvals link directly to approval screen with context.
- Background job completion notifies with open-action link.
- Email/SMS templates use company branding resolution — apps do not duplicate branding logic.

---

## 17. Attachments and Comments

### 17.1 Attachments

- Platform file engine owns upload, virus scan hook, storage, and permissions.
- Attachment list: name, size, type icon, uploaded by, date, actions (preview, download, delete).
- Preview opens in drawer or new tab — not inline iframe of unknown content.
- Delete requires permission + confirmation.

### 17.2 Comments

- Threaded comments on profiles and documents.
- @mention support where platform identity is available.
- Comments autosave as draft; explicit post/submit for published comment.
- Edit/delete own comments within policy window; audit trail preserved.

---

## 18. Approval Screens

- Approvals render through Approval Engine contracts — not ad-hoc status buttons.
- Approval screen shows: document summary, requester, timeline, policy reason, attachments, comments.
- Actions: Approve, Reject, Delegate, Request Info — permission-gated.
- Reject requires reason.
- Status badge on source document updates only after server confirmation.
- Bulk approval queue uses list architecture with safe bulk confirm.

---

## 19. Reports and Printing

### 19.1 Reports

Canonical reference: [Report Guidelines](REPORT_GUIDELINES.md).

- Reports are platform workloads — not browser aggregations of unbounded data.
- Report workspace: parameters, run, preview, export, print, schedule.
- Large reports run asynchronously with progress notification.
- Permissions: view, export, print, sensitive columns, cross-branch.
- Official output captures filter metadata, dataset version, execution timestamp.

### 19.2 Printing

Canonical reference: [Print Guidelines](PRINT_GUIDELINES.md).

- Official documents render from stable snapshots and versioned templates.
- Print action on documents and reports uses Print Engine contracts.
- Reprints are permission-checked and audited.
- Templates support RTL/LTR, localization, and company branding slots.
- Operational labels use Operator Experience print readiness contracts.

---

## 20. Interaction Constitution

### 20.1 Pointer Interactions

| Interaction | Standard Behavior |
| --- | --- |
| Single click | Primary activation: select, open, toggle, focus |
| Double click | Open record detail/profile from list |
| Hover | Affordance hint, row actions, help tooltip |
| Right click | Context menu with safe actions only |
| Long press (mobile) | Same as right click context menu |

### 20.2 Keyboard Shortcuts

| Shortcut | Context | Action |
| --- | --- | --- |
| `Ctrl/Cmd + K` | Global | Command palette |
| `Ctrl/Cmd + S` | Edit Mode | Save Changes |
| `Ctrl/Cmd + Z` | Edit Mode | Undo last field change (draft only) |
| `Ctrl/Cmd + Shift + Z` | Edit Mode | Redo field change (draft only) |
| `Esc` | Overlay / Edit | Close / Cancel |
| `Enter` | Field / List | Save field / Open row |
| `Tab` | Form | Next field |
| `?` | Global (when enabled) | Shortcut help overlay |

Module-specific shortcuts must register in command palette and not conflict with platform shortcuts.

### 20.3 Save Model

| Mode | When |
| --- | --- |
| Manual save (field) | Legacy per-field inline save |
| Manual save (batch) | Edit Mode v2 **Save Changes** |
| Autosave | Notes, descriptions, comments only |
| Workflow save | Cross-engine dialogs and document transitions |
| Draft save | Wizards and long forms — explicit **Save Draft** action |

Saving never reloads the full page. Only the affected section refreshes.

### 20.4 Undo, Redo, History, Audit, Versioning

| Capability | Scope |
| --- | --- |
| Undo/Redo | Edit Mode draft only — not persisted history |
| View History | Per-section field change log |
| Compare Versions | Effective-dated and versioned entities |
| Restore | When business policy allows; requires permission |
| Audit Log | Immutable platform audit for compliance |
| Versioning | Backend versioning for contracts, salary, BOM, price lists |

---

## 21. Design Tokens

Canonical sources:

- CSS runtime: `src/app/globals.css` (`:root`, `@theme`, dark overrides)
- TypeScript mirror: `src/shared/ui/tokens/design-tokens.ts`
- Visual reference: [UI Guidelines](UI_GUIDELINES.md)

Apps must not hardcode one-off colors, spacing, or shadows.

### 21.1 Spacing (8px system)

| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 21.2 Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | 8px | Chips, small buttons |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 16px | Cards |
| `--radius-xl` | 20px | Dialogs |
| `--radius-2xl` | 24px | Main containers |

### 21.3 Elevation (Shadows)

Subtle only — no heavy black shadows.

| Token | Use |
| --- | --- |
| `--shadow-sm` | Cards at rest |
| `--shadow-md` | Dropdowns, popovers |
| `--shadow-lg` | Modals, drawers |

### 21.4 Typography

Font: Inter (preferred), system-ui fallback.

| Scale | Size | Use |
| --- | --- | --- |
| xs | 12px | Captions, badges |
| sm | 14px | Body compact, table cells |
| md | 16px | Body default |
| lg | 18px | Card titles |
| xl | 20px | Section titles |
| 2xl | 24px | Subpage titles |
| 3xl | 30px | Page titles |
| 4xl | 36px | Hero titles |

Line heights: tight (1.2), normal (1.5), relaxed (1.7).

### 21.5 Colors

- **Neutral palette** carries 90% of UI.
- **Brand primary** for platform actions.
- **Semantic colors**: success, warning, danger, info — never as decoration only.
- **Module accents** for app identity only — one accent per screen region.
- **Dark mode** overrides via `[data-theme="dark"]` — every component must be verified.

### 21.6 Icons

Lucide only. One icon per app, action, and status category. No mixed icon packs.

### 21.7 Density

| Mode | Row Height | Field Spacing |
| --- | --- | --- |
| Comfortable | 48px+ | Default (16px gaps) |
| Compact | 36–40px | Reduced (12px gaps) |

Density preference persists per user per list.

### 21.8 Motion

| Duration | Use |
| --- | --- |
| 150ms | Hover, focus |
| 200ms | Dropdown, tab switch |
| 250ms | Drawer, palette |

Respect `prefers-reduced-motion`. No decorative animation on data tables.

---

## 22. Feedback States

Every screen must implement all applicable states through shared platform components.

### 22.1 Loading

- Skeleton loaders matching final layout — not spinner-only pages.
- Button loading state disables interaction.
- Section-level loading for profile cards.
- Background job loading shows progress in notification.

### 22.2 Empty

- Icon + title + description + primary action + optional secondary.
- Never a blank white area.
- Explain what will appear and how to start.

### 22.3 Error

- What happened + what user can do + retry action.
- Operator-safe messages — no stack traces.
- `OperatorErrorMessage` for floor/warehouse flows.
- Permission denied: explain missing permission, link to admin if appropriate.

### 22.4 Success

- Toast via `platform.feedback` for discrete actions.
- Inline success flash on field save before returning to display mode.
- Document lifecycle transitions show status badge update + toast.

---

## 23. Mobile

- Desktop-first design, fully responsive.
- Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
- Sidebar → `Sheet`; tables → card list fallback.
- Filters collapse; bulk actions move to overflow.
- Touch targets ≥ 44×44px.
- Sticky bottom CTA for primary mobile actions.
- One-column forms on handheld devices.
- Scanner input frame for operator workflows.

---

## 24. Accessibility

Required on every screen:

- Keyboard navigation and visible focus rings
- ARIA labels on icon-only buttons
- Dialog focus trap and `Esc` to close
- Screen reader announcements for save/error/status changes
- Color contrast WCAG AA minimum
- `prefers-reduced-motion` support
- RTL/LTR layout mirroring
- Arabic and English content support
- No information conveyed by color alone

Implementation reference: `src/shared/ui/a11y/`.

---

## 25. Document Workspace Pattern

Transaction documents (transfer, adjustment, MO, WO, journal, invoice, PO, SO) share:

```text
Document Header (number, status, dates, parties)
DocumentLifecycleBar (draft → submitted → approved → posted → closed)
Metadata sections (EditableSectionCard or form sections)
Lines table (EnterpriseDataTable with inline line edit)
Totals / summary strip
Timeline + Attachments + Comments + Related docs + Audit
Primary workflow actions in sticky footer
```

Documents use workflow engine transitions — not free-form status dropdowns.

---

## 26. Platform Component Map

| UX Concern | Package Path |
| --- | --- |
| Shell | `src/shared/ui/app-shell/` |
| Page layout | `src/shared/ui/page/` |
| Patterns | `src/shared/ui/patterns/` |
| Data table | `src/shared/ui/data-table/` |
| Forms | `src/shared/ui/form/` |
| Dates | `src/shared/ui/dates/` |
| Lookup | `src/shared/ui/primitives/entity-lookup.tsx` |
| Documents | `src/shared/ui/document/` |
| Dashboard | `src/shared/ui/dashboard/` |
| Reports | `src/shared/ui/report/` |
| Operator UX | `src/shared/ui/operator-experience/` |
| Feedback | `src/shared/ui/feedback/` + `platform.feedback` |
| Tokens | `src/shared/ui/tokens/` |
| Accessibility | `src/shared/ui/a11y/` |

---

## 27. Compliance and Quality Gate

A screen is **not accepted** unless:

- [ ] Uses shared platform components and templates
- [ ] Follows list, profile, or document architecture from this constitution
- [ ] Has loading, empty, and error states
- [ ] Works in dark mode and RTL
- [ ] Is keyboard accessible
- [ ] Does not expose raw IDs
- [ ] Enforces permissions server-side
- [ ] Uses `platform.feedback` for toasts
- [ ] Uses `EntityLookup` for relations
- [ ] Uses `DatePicker` for dates
- [ ] Records audit for business-critical mutations
- [ ] Would look acceptable in an enterprise customer demo

Ask: **Would this screen feel at home next to Linear, Stripe, or Dynamics 365?** If no, it is not ready.

---

## 28. Migration Policy

1. **New screens** — full compliance required before merge.
2. **Profile/detail refactors** — adopt Edit Mode v2 and `EditableProfileWorkspace`.
3. **List pages** — adopt modal create/edit and `EnterpriseDataTable`.
4. **Legacy full-page edit routes** — redirect to profile or list modal.
5. **Module-specific UX** — replace with platform components during touch refactors.

Priority order:

1. High-traffic operational lists and profiles
2. Approval and document workflows
3. Dashboards and reports
4. Remaining admin and settings surfaces

---

## 29. Constitutional Amendment

Changes to this constitution require:

1. Documentation PR with business justification
2. Architecture review
3. Update to affected child guidelines and Cursor rules
4. ADR when the change alters a frozen platform decision

Child guidelines provide implementation depth. This constitution provides architectural law. When conflict exists, **this document wins** unless superseded by an explicit ADR.

---

## 30. Final Rule

Nexora's architecture is enterprise-grade. UX must match.

Every future screen — in every module, in every shell, in every country — follows this constitution.

No exceptions without constitutional amendment.
