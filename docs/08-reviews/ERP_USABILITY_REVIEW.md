# ERP Usability Review

## Related Documents

- [UI Guidelines](../06-guidelines/UI_GUIDELINES.md)
- [UX Guidelines](../06-guidelines/UX_GUIDELINES.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
- [ERP Navigation](../02-business-apps/ERP_NAVIGATION.md)
- [Review Actions](REVIEW_ACTIONS.md)

## Review Scope

Usability standards established for Nexora ERP workspaces based on Enterprise Design System, Platform UX Guidelines, and Operator Experience Foundation.

## Accepted UX Direction

### Navigation

- Intent-based navigation: App Launcher, contextual sidebar, command palette, universal search.
- Workspace accordion sidebar — one business app expanded at a time.
- Enterprise Home (`/erp`) is launcher only — no business CRUD on home.

### Data Entry

- Lookup-first entity selection — no raw UUID workflows ([ADR-008](../05-decisions/ADR-008-UX-Foundation-Before-App-UI.md)).
- List-first pages with create/edit as modal overlays above the list.
- Shared patterns: `PageContainer`, `PageHeader`, `EnterpriseDataTable`, `RecordFormDialog`.

### Operator Experience

- Task-first workflows for warehouse and production roles.
- Scanner contracts, wizard flows, smart defaults, operator-safe errors.
- Mobile standards: large touch targets, single-column forms, visible scanner input.

### Visual System

- Module accent colors per workspace (Finance, Inventory, Manufacturing, HR, etc.).
- Dark/light theme tokens with accessible contrast.
- RTL/LTR and Arabic/English readiness.

### Page Contracts

Every list page: Header, Breadcrumb, KPIs, Toolbar, Search, Filters, Bulk Actions, Table, Pagination, Drawer, Empty/Loading/Error states.

Every detail page: Overview, Timeline, Comments, Attachments, Audit, Relations.

## Gaps and Future Work

- Operator Experience adoption required per business page — foundation exists but not universally wired.
- Lookup providers need entity-specific remote search and hydration implementations.
- Scanner hardware integration remains future work.
- Print Engine execution not yet connected to operational label contracts.

## Visual Acceptance Gate

See [UI Guidelines](../06-guidelines/UI_GUIDELINES.md) section 30 (Visual Acceptance Gate) for release criteria.
