# UX Migration Tracker

> **Purpose:** Track constitutional UX compliance per module — not a redesign backlog.  
> **Authority:** [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md) · [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md)

**Last updated:** 2026-07-07 (HCM production completion — ESS/MSS portal)  
**Review cadence:** Update at end of each app sprint or UX hardening sprint.

---

## Wave 1 Migration Log (2026-07-07)

| Page / Surface | UX Improvements | Platform Components Reused | Duplicates Removed | Review Gate Score | Status |
| --- | --- | --- | --- | ---: | --- |
| HR Employee Profile | Edit Mode v2 shell, sticky header/summary, adaptive tabs with favorites, activity rail, related records, inline editable sections, PlatformTimeline, AttachmentPanel | `ProfileLayout`, `ProfileHeader`, `ProfileSummaryStrip`, `AdaptiveWorkspaceNav`, `EditableProfileWorkspace`, `EditablePage`, `PlatformTimeline`, `AttachmentPanel` | Custom `NavTabBar` only tabs, `InfoRow` employment tab, raw timeline list | **88** | Migrated |
| HR Employees List | Density selector, sticky header/first column, skeleton loading, saved views, search slot, row action consistency, double-click open | `EnterpriseDataTable`, `Input`, `Button` | Inline Actions column merged into `rowActions` | **82** | Migrated |
| Platform `EnterpriseDataTable` | Density, sticky regions, column visibility, skeleton, empty state, `onClick` row actions | — (platform enhancement) | Placeholder toolbar controls | N/A | Enhanced |
| Platform `EntityLookup` | Clear button, recent/favorites preserved | — | — | N/A | Enhanced |
| Platform Navigation | `AdaptiveWorkspaceNav` with overflow, favorites, recent | — | Per-page tab overflow | N/A | New component |

---

## Wave 2 Migration Log (2026-07-07) — Attendance & Workforce

| Page / Surface | UX Improvements | Platform Components Reused | Duplicates Removed | Review Gate Score | Status |
| --- | --- | --- | --- | ---: | --- |
| Attendance & Leave | Workforce shell, clickable KPI strip, adaptive nav, filter bar, EditableSectionCard forms, EnterpriseDataTable, PlatformTimeline, calendar view switcher (month/week/day/agenda) | `HrWorkforceWorkspaceShell`, `HrWorkforceFilterBar`, `HrWorkforceEnterpriseTable`, `EditableSectionCard`, `PlatformTimeline`, `KpiCard`, `AdaptiveWorkspaceNav` | Custom tab links, raw `PageHeader`, inline `EnterpriseDataTable` imports | **91** | Migrated |
| Attendance Processing | Queue severity grouping, inline approve/dismiss, KPI filters, timeline tab | Same workforce shell family | Custom tabs, duplicate table toolbar | **92** | Migrated |
| Attendance Export | Export/closings/history/timeline tabs, AttachmentPanel on history | `AttachmentPanel`, workforce shell family | `PageHeader`, `ProgressKpiCards` | **90** | Migrated |
| Attendance Devices | Device grid in shell, analytics/sync-history tabs, filter bar, KPI strip | Workforce shell, device cards/drawer preserved | `PageHeader`, `PageFilters`, `ProgressKpiCards` | **90** | Migrated |
| Overtime | Candidate/requests/policies/team/timeline tabs, inline approval forms | Workforce shell, `PlatformTimeline` | Monolithic page layout | **91** | Migrated |
| Time Policies (Late/Early) | Policy workspace shell, violations link-through, timeline | Workforce shell, `EditableSectionCard` | Basic `PageHeader` table page | **90** | Migrated |
| Shared `HrWorkforce*` shell | ProfileLayout + KPI strip + adaptive nav + filter bar pattern for workforce routes | `ProfileLayout`, `KpiCard`, `AdaptiveWorkspaceNav` | Per-page header/KPI duplicates | N/A | New pattern |

**Wave 2 notes:** `/erp/hr/late-early` route does not exist; late/early policies migrated at `/erp/hr/time-policies`. No business rules, DB, or permissions changed.

---

## Wave 3 Migration Log (2026-07-07) — ESS/MSS Portal

| Page / Surface | UX Improvements | Platform Components Reused | Duplicates Removed | Review Gate Score | Status |
| --- | --- | --- | --- | ---: | --- |
| Portal Leave (ESS) | Submit form, balances, request history | `DatePicker`, `EditableSectionCard`, `EnterpriseDataTable`, `nativeSelectClassName` | Raw supabase page query | **85** | Migrated |
| Portal Attendance (ESS) | Structured day table | `EditableSectionCard`, `EnterpriseDataTable` | Raw `<ul>` list | **82** | Migrated |
| Portal Manager Approvals (MSS) | Approve + reject with reason | `EditableSectionCard`, `Input`, `Button` | ERP-context leave actions | **84** | Migrated |
| Recruitment hiring form | Platform date input | `DatePicker` | Native `<input type="date">` | **80** | Migrated |

---

## How to Read

| Column | Meaning |
| --- | --- |
| **Completion %** | Weighted average across surface types below (0–100) |
| **Priority** | P0 = operator-critical, P1 = high traffic, P2 = admin/report, P3 = planned app |
| **Review Status** | `Not Started` · `In Review` · `Partial` · `Compliant` · `Exception` |
| **Target Sprint** | Planned sprint for next UX migration slice |

**Surface types scored per module:** Lists · Profiles · Forms · Dashboards · Reports · Calendars · Approval Screens

---

## Platform-Wide Summary

| Metric | Value |
| --- | --- |
| Modules tracked | 14 |
| Average completion | ~46% |
| Review Gate adoption | Active (2026-07-07) |
| New screens requiring gate | **100%** |
| Legacy redesign authorized this sprint | **0** |

---

## Module Tracker

### HR

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 85 | Partial | Wave 2: workforce tables via `HrWorkforceEnterpriseTable` |
| Profiles | 72 | Partial | Wave 1: employee profile Edit Mode v2, ProfileLayout, adaptive nav |
| Forms | 68 | Partial | Wave 2: EditableSectionCard on attendance/leave forms |
| Dashboards | 78 | Partial | Wave 2: clickable KPI strips on all workforce workspaces |
| Reports | 45 | Partial | Export history + attachment panel |
| Calendars | 82 | Partial | Wave 2: leave calendar month/week/day/agenda views |
| Approval Screens | 78 | Partial | Wave 2: inline queue actions; Wave 3: portal MSS leave approve/reject |
| **Module total** | **74%** | **Partial** | Wave 2 workforce + Wave 3 portal leave surfaces |

| Field | Value |
| --- | --- |
| Priority | P0 |
| Owner | HR / Platform UX |
| Target Sprint | OP-UX-02 (Wave 2 done; Wave 3 next) |
| Migration Notes | Wave 2: attendance-leave, processing, export, devices, overtime, time-policies. Wave 3: portal ESS/MSS leave. Next: payroll surfaces |

---

### Payroll

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 35 | Not Started | Foundation routes; limited operational UI |
| Profiles | 20 | Not Started | Payslip profile surfaces minimal |
| Forms | 30 | Not Started | Localization admin separate freeze |
| Dashboards | 25 | Not Started | Readiness dashboards partial |
| Reports | 30 | Not Started | Contract foundation |
| Calendars | N/A | — | |
| Approval Screens | 25 | Not Started | Batch approval contracts |
| **Module total** | **28%** | **Not Started** | No localization changes in governance sprint |

| Field | Value |
| --- | --- |
| Priority | P1 |
| Owner | HR Payroll |
| Target Sprint | OP-15+ |
| Migration Notes | Consume snapshots only; UX after calculation runtime |

---

### Inventory

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 45 | Partial | Warehouse/movement lists |
| Profiles | 30 | Not Started | Product via master-data |
| Forms | 40 | Partial | Mixed modal patterns |
| Dashboards | 35 | Not Started | |
| Reports | 25 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 20 | Not Started | |
| **Module total** | **35%** | **Partial** | Reservation engine UX pending |

| Field | Value |
| --- | --- |
| Priority | P1 |
| Owner | Inventory |
| Target Sprint | Phase 5 |
| Migration Notes | Stock movement list-first + lookup migration |

---

### Sales

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 15 | Not Started | Planned app |
| Profiles | 10 | Not Started | |
| Forms | 10 | Not Started | |
| Dashboards | 15 | Not Started | |
| Reports | 10 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 10 | Not Started | |
| **Module total** | **12%** | **Not Started** | Gate applies on first screen |

| Field | Value |
| --- | --- |
| Priority | P2 |
| Owner | Sales |
| Target Sprint | Phase 5–6 |
| Migration Notes | Build compliant from day one |

---

### CRM

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 10 | Not Started | Planned |
| Profiles | 10 | Not Started | |
| Forms | 10 | Not Started | |
| Dashboards | 10 | Not Started | |
| Reports | 10 | Not Started | |
| Calendars | 15 | Not Started | Activity calendar planned |
| Approval Screens | 5 | Not Started | |
| **Module total** | **10%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P2 |
| Owner | CRM |
| Target Sprint | Phase 6 |
| Migration Notes | — |

---

### Manufacturing

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 40 | Partial | BOM, routing lists |
| Profiles | 25 | Not Started | |
| Forms | 35 | Partial | |
| Dashboards | 30 | Not Started | DPR surfaces |
| Reports | 25 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 20 | Not Started | |
| **Module total** | **30%** | **Partial** | |

| Field | Value |
| --- | --- |
| Priority | P1 |
| Owner | Manufacturing |
| Target Sprint | Phase 5 |
| Migration Notes | Production runbook operator flows |

---

### Maintenance

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 5 | Not Started | Planned |
| Profiles | 5 | Not Started | |
| Forms | 5 | Not Started | |
| Dashboards | 5 | Not Started | |
| Reports | 5 | Not Started | |
| Calendars | 10 | Not Started | Work order schedule |
| Approval Screens | 5 | Not Started | |
| **Module total** | **6%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P3 |
| Owner | Maintenance |
| Target Sprint | TBD |
| Migration Notes | — |

---

### Fleet

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 10 | Not Started | Doc foundation |
| Profiles | 10 | Not Started | Vehicle profile planned |
| Forms | 10 | Not Started | |
| Dashboards | 10 | Not Started | |
| Reports | 10 | Not Started | |
| Calendars | 10 | Not Started | |
| Approval Screens | 5 | Not Started | |
| **Module total** | **9%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P3 |
| Owner | Fleet |
| Target Sprint | Phase 6 |
| Migration Notes | — |

---

### Projects

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 5 | Not Started | |
| Profiles | 5 | Not Started | |
| Forms | 5 | Not Started | |
| Dashboards | 5 | Not Started | |
| Reports | 5 | Not Started | |
| Calendars | 10 | Not Started | Gantt/calendar planned |
| Approval Screens | 5 | Not Started | |
| **Module total** | **6%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P3 |
| Owner | Projects |
| Target Sprint | TBD |
| Migration Notes | — |

---

### Assets

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 10 | Not Started | |
| Profiles | 10 | Not Started | |
| Forms | 10 | Not Started | |
| Dashboards | 10 | Not Started | |
| Reports | 10 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 5 | Not Started | |
| **Module total** | **9%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P3 |
| Owner | Assets |
| Target Sprint | TBD |
| Migration Notes | — |

---

### Documents

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 30 | Partial | Document engine contracts |
| Profiles | 25 | Not Started | |
| Forms | 30 | Partial | Upload flows |
| Dashboards | 20 | Not Started | |
| Reports | 25 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 25 | Partial | Document lifecycle |
| **Module total** | **26%** | **Partial** | |

| Field | Value |
| --- | --- |
| Priority | P1 |
| Owner | Platform / Apps |
| Target Sprint | Sprint 6+ |
| Migration Notes | Universal document framework |

---

### POS

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 5 | Not Started | |
| Profiles | 5 | Not Started | |
| Forms | 5 | Not Started | |
| Dashboards | 5 | Not Started | |
| Reports | 5 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | N/A | — | |
| **Module total** | **5%** | **Not Started** | Mobile-first gate required |

| Field | Value |
| --- | --- |
| Priority | P2 |
| Owner | Commerce |
| Target Sprint | Phase 6 |
| Migration Notes | Touch targets + offline states |

---

### Commerce

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 20 | Not Started | Product master |
| Profiles | 25 | Partial | Product PDP patterns |
| Forms | 20 | Not Started | |
| Dashboards | 15 | Not Started | |
| Reports | 15 | Not Started | |
| Calendars | N/A | — | |
| Approval Screens | 10 | Not Started | |
| **Module total** | **18%** | **Not Started** | |

| Field | Value |
| --- | --- |
| Priority | P2 |
| Owner | Commerce |
| Target Sprint | Phase 7 |
| Migration Notes | Storefront separate shell |

---

### Analytics

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 15 | Not Started | |
| Profiles | N/A | — | |
| Forms | 10 | Not Started | |
| Dashboards | 25 | Partial | Dashboard engine contracts |
| Reports | 30 | Partial | Reporting engine foundation |
| Calendars | N/A | — | |
| Approval Screens | N/A | — | |
| **Module total** | **20%** | **Partial** | |

| Field | Value |
| --- | --- |
| Priority | P2 |
| Owner | Platform |
| Target Sprint | Platform Phase |
| Migration Notes | `DashboardTemplate` adoption |

---

### Finance

| Surface | Completion % | Review Status | Notes |
| --- | ---: | --- | --- |
| Lists | 50 | Partial | COA, journals |
| Profiles | 35 | Partial | Entity drawer pattern |
| Forms | 45 | Partial | Finance entity drawer |
| Dashboards | 30 | Not Started | |
| Reports | 35 | Partial | |
| Calendars | N/A | — | Fiscal periods separate |
| Approval Screens | 30 | Partial | Journal approval |
| **Module total** | **38%** | **Partial** | |

| Field | Value |
| --- | --- |
| Priority | P0 |
| Owner | Finance |
| Target Sprint | Finance UX-01 |
| Migration Notes | Entity drawer → Edit Mode v2 |

---

## Exception Log

| Module | Item | Reason | Owner | Remediation Sprint | Status |
| --- | --- | --- | --- | --- | --- |
| — | — | No active exceptions | — | — | — |

---

## Update Protocol

1. Author updates row when shipping UX-affecting PR.
2. UX reviewer validates against [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md).
3. Completion % adjusted only with evidence (checklist pass count / surface type).
4. Monthly rollup copied to [Implementation Status](../00-overview/IMPLEMENTATION_STATUS.md).

---

## Related Documents

- [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)
- [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md)
- [Design Review Process](DESIGN_REVIEW_PROCESS.md)
- [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md)
- [ADR-021](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md)
