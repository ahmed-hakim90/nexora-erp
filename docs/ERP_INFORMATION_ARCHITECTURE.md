# ERP Navigation & Workspace Information Architecture

Canonical, workspace-based Information Architecture for the Nexora ERP experience.

- **Single source of truth:** `src/shared/workspace/erp-navigation.ts`
  (`ERP_INFORMATION_ARCHITECTURE` + `buildErpSidebarGroups`).
- **Rendered by:** the left-sidebar workspace **accordion** in
  `src/shared/ui/app-shell/app-shell.tsx` (one workspace expanded at a time).
- **Base path:** every ERP route lives under the `/erp` route group. The spec's
  `/finance` is realized as `/erp/finance`, etc.

## Principles

- Each business app is an independent **workspace** with a standard internal
  shape: Dashboard → Master Data → Operations → Transactions → Reports →
  Analytics → Settings (only the sections a workspace needs).
- **Every page has a single responsibility.** No giant do-everything pages.
- `ready` pages link to a real, existing route.
- `planned` pages are **surfaced but never link to a placeholder** — they render
  disabled with a `Soon` badge. Planned workspaces show a `Planned` badge.
- No developer-index pages (events / endpoints / routes / messages) are surfaced.

## Status legend

- **ready** — route exists today and is wired into the workspace.
- **planned** — part of the canonical tree, intentionally not built yet
  (awaiting the business-pages phase).

---

## Enterprise Home — `/erp`

Launcher only. Welcome, ERP progress, app launcher, favorites, recent apps,
recent documents, recent activities, notifications, quick actions, platform
status. **No business CRUD here.**

---

## Finance — `/erp/finance`

| Section | Page | Route | Status | Responsibility |
| --- | --- | --- | --- | --- |
| Overview | Dashboard | `/erp/finance` | ready | Workspace KPIs / readiness |
| Master Data | Chart of Accounts | `/erp/finance/chart-of-accounts` | ready | Account tree, CRUD, hierarchy, status, search, filters |
| Master Data | Account Types | `/erp/finance/account-types` | ready | Account type definitions |
| Master Data | Journals | `/erp/finance/journals` | ready | Journal definitions only |
| Master Data | Currencies | `/erp/finance/currencies` | ready | Currency definitions |
| Master Data | Taxes | `/erp/finance/taxes` | ready | Tax definitions |
| Master Data | Payment Terms | `/erp/finance/payment-terms` | ready | Payment term definitions |
| Master Data | Cost Centers | `/erp/finance/cost-centers` | ready | Cost center master |
| Master Data | Financial Dimensions | `/erp/finance/dimensions` | ready | Dimension management |
| Calendar | Fiscal Years | `/erp/finance/fiscal-years` | ready | Calendar management only |
| Calendar | Fiscal Periods | `/erp/finance/fiscal-periods` | ready | Period management only |
| Transactions | Journal Entries | `/erp/finance/journal-entries` | planned | Journal entry documents |
| Transactions | Opening Balances | `/erp/finance/opening-balances` | planned | Opening balance documents |
| Reports | Financial Reports | `/erp/reports` | ready | Read-only report access |

---

## Inventory — `/erp/inventory`

| Section | Page | Route | Status | Responsibility |
| --- | --- | --- | --- | --- |
| Overview | Dashboard | `/erp/inventory` | ready | Workspace KPIs |
| Master Data | Products | `/erp/master-data/products` | ready | Product master data (Overview/Variants/Stock/Lots/Serials/Attachments/Timeline/Audit) |
| Master Data | Categories | `/erp/master-data/product-categories` | ready | Product categories |
| Master Data | Brands | `/erp/master-data/brands` | ready | Brand master |
| Master Data | Units of Measure | `/erp/master-data/units` | ready | UoM definitions |
| Master Data | Warehouses | `/erp/master-data/warehouses` | ready | Warehouse master |
| Master Data | Locations | `/erp/master-data/warehouse-locations` | ready | Hierarchy, reservation readiness, capacity |
| Master Data | Variants | `/erp/inventory/variants` | planned | Product variants |
| Master Data | Lots | `/erp/inventory/lots` | planned | Lot tracking |
| Master Data | Serial Numbers | `/erp/inventory/serials` | planned | Serial tracking |
| Operations | Stock Balances | `/erp/inventory/stock-balances` | ready | On hand / reserved / available facts |
| Operations | Stock Movements | `/erp/inventory/transactions` | ready | Movement documents |
| Transactions | Transfers | `/erp/inventory/transfers` | planned | Transfer documents only |
| Transactions | Adjustments | `/erp/inventory/adjustments` | planned | Adjustment documents only |
| Transactions | Opening Balances | `/erp/inventory/opening-balances` | planned | Opening documents only |
| Transactions | Reorder Rules | `/erp/inventory/reorder-rules` | planned | Reorder rule management |
| Reports | Inventory Reports | `/erp/reports` | ready | Read-only reporting |

---

## Manufacturing — `/erp/manufacturing`

| Section | Page | Route | Status | Responsibility |
| --- | --- | --- | --- | --- |
| Overview | Dashboard | `/erp/manufacturing` | ready | Production KPIs, shift, achievements, scrap, downtime |
| Execution | Daily Production Report | `/erp/manufacturing/daily-reports` | ready | Production execution facts only (no payroll/incentives/costing) |
| Execution | Production Plans | `/erp/manufacturing/production-plans` | planned | Planning only |
| Execution | Manufacturing Orders | `/erp/manufacturing/manufacturing-orders` | planned | MO documents |
| Execution | Work Orders | `/erp/manufacturing/work-orders` | planned | WO execution |
| Engineering | BOM | `/erp/manufacturing/boms` | ready | Bills of material |
| Engineering | Routing | `/erp/manufacturing/routing-plans` | ready | Routing definitions |
| Engineering | Production Lines | `/erp/manufacturing/production-lines` | ready | Production line master |
| Engineering | Work Centers | `/erp/manufacturing/work-centers` | ready | Work center master |
| Engineering | Workstations | `/erp/manufacturing/workstations` | planned | Workstation master |
| Workforce | Workers | `/erp/manufacturing/manufacturing-profiles` | ready | Manufacturing worker profiles |
| Workforce | Line Assignments | `/erp/manufacturing/line-assignments` | ready | Worker-to-line assignments |
| Workforce | Production Standards | `/erp/manufacturing/production-standards` | ready | Product-line-shift standards |
| Analytics | Targets | `/erp/manufacturing/targets` | planned | Tabbed target & achievement management (single source) |
| Analytics | KPIs | `/erp/manufacturing/kpis` | planned | Production / worker / line / product KPIs (charts only) |
| Reports | Reports | `/erp/reports` | ready | Read-only production reports |

---

## Planned workspaces (navigation prepared only)

Each workspace is surfaced in the sidebar with a `Planned` badge; all pages are
disabled until the business-pages phase.

### Purchasing — `/erp/purchasing`
Dashboard (`/erp/purchasing`, ready) · Suppliers · RFQs · Purchase Orders ·
Receipts · Vendor Bills · Reports.

### Sales — `/erp/sales`
Dashboard · Customers · Quotations · Orders · Deliveries · Returns · Reports.

### HR — `/erp/hr`
Dashboard · Employees · Attendance · Leave · Contracts · Payroll · Reports.

### Fleet — `/erp/fleet`
Dashboard · Vehicles · Drivers · Trips · Fuel · Maintenance · Reports.

### Service — `/erp/service`
Dashboard · Service Centers · Tickets · Warranty · Repairs · Spare Parts · Reports.

---

## Administration — `/erp/administration` (planned)

Companies · Branches · Users · Roles · Permissions · Feature Flags · Audit ·
Settings · Localization.

---

## Page contracts (for the business-pages phase)

**Every List page** must contain: Header, Breadcrumb, KPIs, Toolbar, Search,
Filters, Bulk Actions, Table, Pagination, Drawer, Empty State, Loading State,
Error State.

**Every Detail page** must contain: Overview, Timeline, Comments, Attachments,
Audit, Relations. No exceptions.

---

## Sidebar rules

- Sidebar order: **Business Applications** (Finance, Inventory, Manufacturing,
  Purchasing, Sales, HR, Fleet, Service) then **Administration**.
- Each workspace expands as an **accordion**; **only one workspace is expanded at
  a time**. The active workspace auto-expands based on the current route.
