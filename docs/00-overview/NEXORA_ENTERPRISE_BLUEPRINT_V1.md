# Nexora Enterprise Blueprint v1.0

**Status:** Approved — Constitutional Architecture Document  
**Version:** 1.0  
**Effective:** 2026-07-01  
**Authority:** Single source of truth for the entire Nexora Platform  
**Supersedes:** Scattered sprint notes, informal architecture fragments, and duplicate decision logs as the primary constitutional reference  
**Companion documents:** Detailed engine specs, sprint histories, and ADRs remain authoritative for depth; this document governs all of them.

---

> **Implementation Pause Notice**  
> All new feature development, runtime implementation, and UI expansion are paused until this blueprint is acknowledged. Subsequent work requires ADR approval, foundation contracts before runtime, and passage of applicable review gates.

---

## Table of Contents

1. [Executive Vision](#section-1--executive-vision)
2. [Architecture Principles](#section-2--architecture-principles)
3. [Platform Layer Model](#section-3--platform-layer-model)
4. [Platform Engines](#section-4--platform-engines)
5. [Business Applications](#section-5--business-applications)
6. [Bounded Context Map](#section-6--bounded-context-map)
7. [Canonical Ownership Matrix](#section-7--canonical-ownership-matrix)
8. [Source of Truth Matrix](#section-8--source-of-truth-matrix)
9. [Enterprise Dependency Matrix](#section-9--enterprise-dependency-matrix)
10. [Lifecycle Models](#section-10--lifecycle-models)
11. [Enterprise Document Architecture](#section-11--enterprise-document-architecture)
12. [Event Architecture](#section-12--event-architecture)
13. [Security Model](#section-13--security-model)
14. [UX Standards](#section-14--ux-standards)
15. [Integration Standards](#section-15--integration-standards)
16. [AI & Automation Standards](#section-16--ai--automation-standards)
17. [Naming Standards](#section-17--naming-standards)
18. [Legacy & Migration Strategy](#section-18--legacy--migration-strategy)
19. [Review Gates](#section-19--review-gates)
20. [Technical Debt Register](#section-20--technical-debt-register)
21. [Enterprise Readiness Matrix](#section-21--enterprise-readiness-matrix)
22. [Product Roadmap — Enterprise Programs](#section-22--product-roadmap--enterprise-programs)
23. [Architecture Decision Records (ADR Index)](#section-23--architecture-decision-records-adr-index)
24. [Final Validation](#final-validation)

---

## SECTION 1 — Executive Vision

### What Nexora Is

Nexora is an **Enterprise Business Platform** — a durable, cloud-native foundation for business applications, shared engines, integrations, automation, AI-assisted actions, reports, documents, dashboards, and governed tenant operations.

Nexora is **not** an ERP product. **ERP is one collection of Business Applications** running on the Platform, alongside HR Portal, Manufacturing, Inventory, Finance, Commerce, Service, Fleet, Marketplace, POS, and future apps. All are peers — not subsystems of ERP.

### Constitutional Characteristics

| Characteristic | Definition |
|----------------|------------|
| **Platform-first** | Shared runtime, security, data, UX, and engines belong to the platform layer. Business apps consume; they do not reimplement. |
| **Engine-first** | Cross-cutting capabilities (workflow, approval, documents, search, audit, jobs) are platform engines with public contracts. |
| **App-first** | Every business capability is packaged as an installable app with manifests, permissions, routes, lifecycle, and integration contracts. |
| **Contract-first** | Foundations ship as typed contracts, events, audit actions, permissions, and migrations before runtime. |
| **Event-driven** | State changes publish domain events; durable external delivery uses the integration outbox. |
| **Document-driven** | Business operations flow through governed business documents with universal lifecycle, numbering, and audit. |
| **Effective-dated** | Operational truth for people, org, compensation, assignments, and policies is time-bounded. |
| **API-first** | All integration, automation, and AI interaction occurs through public APIs and contracts — never direct database coupling. |
| **UX-first** | Users navigate by intent (search, commands, dashboards, workflows), not by database structure. |
| **AI-ready** | AI may suggest, draft, explain, and automate only through governed services, permissions, approval gates, and audit trails. |
| **Cloud-native** | Modular monolith in one deployable unit; async-capable workloads; tenant-safe by default; PostgreSQL + Supabase + RLS. |

### Product Doctrine

- Users navigate by **intent**, not schema.
- Business apps own domain vocabulary and canonical tables.
- The platform owns process infrastructure.
- No business app may become the source of truth for shared runtime, UX, security, reporting, printing, dashboarding, costing, workflow, approval, notification, integration, or audit behavior.
- Finance, inventory, payroll, approvals, and audit records are **enterprise records** — user convenience must not weaken document integrity, segregation of duties, or tenant isolation.

### Target Scale (Design Baseline)

- 600 total users (majority HR self-service only).
- 100–150 operational ERP users.
- 6,000+ customers; 25,000+ products; 30,000+ invoices/year.
- Multi-company, multi-branch, multi-country, multi-currency.
- Arabic and English; RTL and LTR; dark and light mode.

### Experiences

| Experience | Audience | Scope |
|------------|----------|-------|
| **ERP Workspace** | Administrators, managers, accountants, production, warehouse, sales, procurement | Cross-module navigation based on permissions |
| **HR Self-Service Portal** | Employees without ERP duties | Profile, attendance, leave, payslips, documents — **no ERP modules** |
| **Admin & Marketplace** | Platform and tenant administrators | RBAC, app registry, connectors |
| **POS / Storefront / API** | Commerce and external consumers | Contract-bound surfaces |

---

## SECTION 2 — Architecture Principles

Each principle below defines **why it exists**, **benefits**, **anti-patterns**, and **examples**.

### 2.1 Single Source of Truth

**Why:** Duplicate ownership causes reconciliation failures, audit gaps, and payroll/inventory/finance corruption.

**Benefits:** One canonical write path per concept; readers consume projections or contracts.

**Anti-patterns:** Employment profile storing org relationships; payslip recalculating payroll; manufacturing updating stock tables directly.

**Examples:** Assignment Engine owns department; Inventory Engine owns quantity; Payroll Result owns calculated numbers.

### 2.2 Separation of Concerns

**Why:** Mixed responsibilities create untestable, unscalable modules.

**Benefits:** Clean architecture layers (domain → application → infrastructure → presentation); platform never imports business features.

**Anti-patterns:** Business logic in React components; Supabase queries in UI; platform importing `src/features/**`.

**Examples:** `src/platform/**` is domain-neutral; `src/features/hr/**` owns HR vocabulary.

### 2.3 Bounded Contexts

**Why:** Each business domain has its own language, lifecycle, and ownership.

**Benefits:** Modules evolve independently; cross-context integration is explicit.

**Anti-patterns:** Shared mutable tables accessed by multiple writers; generic "utils" tables.

**Examples:** Leave/Absence is a first-class bounded context; Attendance owns punch facts only.

### 2.4 Event Driven Architecture

**Why:** Decouples producers from consumers; enables audit, integration, and async processing.

**Benefits:** In-process coordination via Event Bus; durable external delivery via Outbox (ADR-017).

**Anti-patterns:** Synchronous cross-module database triggers for business logic; using Event Bus for guaranteed external delivery.

**Examples:** `AssignmentCreated`, `PayrollRunApproved`, `InventoryMovementPosted`.

### 2.5 Immutable History

**Why:** Enterprise records must be explainable years later.

**Benefits:** Append-only ledgers, assignment history, payroll snapshots, audit trails.

**Anti-patterns:** Silent overwrites of posted records; deleting payroll results; mutating locked assignments.

**Examples:** ADR-014 Immutable Ledger; assignment supersede creates new row; payroll results locked post-approval.

### 2.6 Effective Dating

**Why:** Org, compensation, and policy truth changes over time.

**Benefits:** Point-in-time resolution for payroll, attendance, reports, and workflow.

**Anti-patterns:** Single-row employee records without date ranges; overlapping assignment periods.

**Examples:** `effective_from` / `effective_to` on assignments, compensation versions, policy versions.

### 2.7 Runtime vs Foundation

**Why:** Contracts must stabilize before execution code proliferates parallel models.

**Benefits:** Foundation = contracts, validation, registries, schema; Runtime = workers, resolvers, calculators, UI.

**Anti-patterns:** Shipping runtime before boundary contracts; inventing parallel tables at runtime.

**Examples:** 23 HR foundation contracts exist; Assignment resolver runtime explicitly gated.

### 2.8 Read Models, Projections, Snapshots

**Why:** Consumers need optimized views without violating ownership.

**Benefits:** Employment profile org fields as cache; payroll employee snapshots at run approval; search indexes.

**Anti-patterns:** Treating projections as writable sources of truth; payslip as calculation store.

**Examples:** Profile cache rebuilt from Assignment Engine; payslip lines derived from result components.

### 2.9 Public Contracts

**Why:** Cross-module coupling must be typed, versioned, and manifest-declared.

**Benefits:** `public-api.ts` per feature; platform `public-api` for engines; manifest dependencies.

**Anti-patterns:** Importing repositories across features; direct table access across bounded contexts.

**Examples:** Manufacturing consumes Inventory `public-api`; Payroll consumes Assignment read contracts at snapshot time.

### 2.10 Provider Agnostic Services

**Why:** Platform must survive vendor changes (auth, storage, messaging).

**Benefits:** Adapters behind platform contracts; engines remain country-neutral.

**Anti-patterns:** Supabase-specific logic in business domain; country rules in calculation core.

**Examples:** Localization packs plug into Calculation Engine; notification delivery via job contracts.

### 2.11 Multi-Tenant / Multi-Company / Multi-Branch / Multi-Country / Multi-Currency

**Why:** Nexora serves complex organizational structures across jurisdictions.

**Benefits:** Explicit scope in request context, RLS, and data model.

**Anti-patterns:** Hardcoded tenant IDs; implicit single-company assumptions; mixing legal entities.

**Examples:** `tenant_id`, `company_id`, `branch_id` on operational tables; localization packs per country.

### 2.12 Audit First

**Why:** Sensitive and financial operations require explainability.

**Benefits:** `defineAuditAction` per domain; correlation IDs; immutable audit tables.

**Anti-patterns:** Undeclared admin mutations; export/print without audit metadata.

**Examples:** Payroll approval, inventory posting, permission changes — all audited.

### 2.13 Security First

**Why:** Defense in depth — no single layer is sufficient.

**Benefits:** Auth → entitlement → permission → data scope → RLS → domain rules → audit (ADR-007).

**Anti-patterns:** UI-only permission hiding; RLS-only enforcement; role name checks in code.

**Examples:** `has_permission('hr.payroll.manage', tenant_id)` in RLS and server services.

### 2.14 UX First

**Why:** Adoption depends on operator speed and clarity.

**Benefits:** Intent navigation, EntityLookup, wizard-first creation, mobile-first operations.

**Anti-patterns:** Raw UUID entry; hardcoded sidebars; per-app competing shells.

**Examples:** Command palette, list-first modal pattern, progressive disclosure.

---

## SECTION 3 — Platform Layer Model

```text
┌─────────────────────────────────────────────────────────────┐
│ EXPERIENCE LAYER                                            │
│ ERP Workspace · HR Portal · Admin · Marketplace · POS · API │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ BUSINESS APPLICATIONS (App First)                           │
│ Finance · Inventory · Manufacturing · HR · Purchasing · …   │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ BUSINESS FOUNDATIONS & DOMAIN ENGINES                       │
│ HR Core · Assignment · Payroll · Policy · Compensation · …  │
│ Inventory Foundation · Manufacturing Foundation · …         │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ PLATFORM SERVICES                                           │
│ Party · Document · Numbering · Files · Localization · Cost  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ PLATFORM RUNTIME ENGINES                                    │
│ Workflow · Approval · Event Bus · Audit · Search · Jobs · … │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ PLATFORM KERNEL                                             │
│ Identity · Tenancy · RBAC · RLS · Context · Security        │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ INFRASTRUCTURE                                              │
│ PostgreSQL · Supabase · Storage · Background Workers · CDN  │
└─────────────────────────────────────────────────────────────┘
```

### Layer Definitions

| Layer | Responsibilities | Ownership | Allowed Dependencies | Forbidden Dependencies |
|-------|------------------|-----------|----------------------|------------------------|
| **Experience** | Shells, navigation, command palette, theming, localization UX | Platform + shared UI | Feature `public-api`, platform client APIs | Business repositories, direct DB |
| **Business Applications** | Domain vocabulary, app tables, permissions, routes, reports | Feature teams | Platform `public-api`, declared feature APIs | Platform internals, other apps' private code |
| **Business Foundations** | Domain engines within apps (Assignment, Payroll, Inventory ledger) | Feature teams | Platform `public-api`, own foundations | Cross-feature private infrastructure |
| **Platform Services** | Party, document lifecycle, numbering, files, cost facts | Platform team | Platform engines | Business domain logic |
| **Platform Runtime Engines** | Workflow, approval, events, audit, search, jobs, automation | Platform team | Other platform `public-api` | `src/features/**` |
| **Platform Kernel** | Identity, tenancy, RBAC, RLS helpers, request context | Platform team | Core utilities only | Any business feature code |
| **Infrastructure** | Database, auth provider, storage, queues | DevOps / Platform | — | Business rules |

**Hard rule:** `src/platform/**` must **never** import `src/features/**`.

**Dependency direction:** Writers point inward to canonical owners. Readers point outward through contracts.

---

## SECTION 4 — Platform Engines

Each engine exposes a stable `public-api.ts`, registers permissions and audit actions, and remains tenant/company/branch aware.

### 4.1 Identity & Security (Kernel)

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Authentication, session, user profiles, RBAC registry, request context, RLS helpers |
| **Public Contracts** | `requirePermission`, context resolution, scope helpers |
| **Runtime** | Server-side enforcement on every mutation |
| **Consumers** | All layers |
| **Events** | Security-sensitive audit events |
| **Extension** | New permissions via module registries only |

### 4.2 Organization & Tenancy (Kernel)

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Tenant, company, branch, experience context |
| **Public Contracts** | Scope resolution, company/branch switching |
| **Consumers** | All scoped operations |
| **Forbidden** | Business org structure (owned by HR) |

### 4.3 Party Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Business partner registry — customers, suppliers, contacts |
| **Public Contracts** | Party CRUD contracts, role assignments |
| **Consumers** | Finance, CRM, HR, Purchasing, Sales |
| **Events** | PartyCreated, PartyUpdated |
| **Extension** | App-specific party roles via manifest |

### 4.4 Workflow Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Process state machines, transition execution |
| **Public Contracts** | Workflow definitions, transition commands |
| **Runtime** | Partial — server validation exists |
| **Consumers** | All document-based apps |
| **Events** | WorkflowTransitionCompleted |
| **Extension** | Apps bind documents via workflow refs (ADR-013) |

### 4.5 Approval Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Approval policies, approvers, decisions, delegation, SoD |
| **Public Contracts** | Approval requests, grants, rejections |
| **Runtime** | Partial — server validation exists |
| **Consumers** | HR Actions, Purchasing, Inventory, Manufacturing |
| **Events** | ApprovalGranted, ApprovalRejected |
| **Extension** | Separate from Workflow (ADR-013) |

### 4.6 Notification Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Notification delivery contracts, templates, channels |
| **Public Contracts** | `notification-delivery` job contract |
| **Runtime** | Readiness only — no email/SMS/WhatsApp runtime in v1.0 |
| **Consumers** | All apps |
| **Extension** | Channel adapters behind contracts |

### 4.7 Search Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Universal search, provider registration, ranking |
| **Public Contracts** | `defineSearchProvider` |
| **Runtime** | Provider registration only; indexing future |
| **Consumers** | ERP shell, command palette |
| **Extension** | Per-app search providers |

### 4.8 Audit & Observability Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Audit actions, immutable audit log, correlation IDs, logging |
| **Public Contracts** | `defineAuditAction`, audit write contracts |
| **Consumers** | All sensitive mutations |
| **Events** | AuditRecorded |
| **Extension** | Domain-specific audit actions per app |

### 4.9 Event Bus & Outbox

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | In-process event bus; durable outbox for external delivery |
| **Public Contracts** | `definePlatformEventDefinition`, outbox contracts |
| **Rules** | Event Bus ≠ Outbox (ADR-017); bus not guaranteed delivery |
| **Consumers** | All engines and apps |
| **Extension** | Version increment on breaking schema changes |

### 4.10 Document Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Universal document lifecycle, numbering, attachments, relationships |
| **Public Contracts** | Document envelope, status transitions, numbering |
| **Consumers** | Purchasing, Inventory, HR Actions, Manufacturing, Finance |
| **Events** | DocumentPosted, DocumentCancelled |
| **Extension** | App-specific document types register with engine (ADR-015) |

### 4.11 Dashboard Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Dashboard definitions, KPI widgets, layout contracts |
| **Public Contracts** | `defineDashboard`, widget registry |
| **Consumers** | All apps |
| **Extension** | App-owned widget providers |

### 4.12 Reporting Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Report definitions, datasets, async execution |
| **Public Contracts** | `defineReport`, `defineReportDataset` |
| **Consumers** | All apps |
| **Extension** | Heavy reports run as background jobs (ADR-009) |

### 4.13 Print Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Print templates, official snapshots, batch printing |
| **Public Contracts** | `definePrintTemplate` |
| **Consumers** | Finance, HR (payslips), Inventory, Sales |
| **Extension** | Official document snapshots immutable at print time |

### 4.14 Background Jobs Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Async job contracts, retry, idempotency, failure handling |
| **Public Contracts** | Job type registry, worker contracts |
| **Runtime** | Readiness only — workers not runtime in v1.0 |
| **Consumers** | Reports, print, import/export, integration, AI |
| **Extension** | New job types via platform registration |

### 4.15 Import/Export Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Governed bulk data import/export with audit |
| **Public Contracts** | Import/export job contracts, mapping registry |
| **Consumers** | All apps with master data |
| **Extension** | App-specific mappers |

### 4.16 Cost Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Cost calculation, allocation, variance, WIP valuation facts |
| **Public Contracts** | Cost fact contracts, labor cost consumption |
| **Consumers** | Manufacturing, Inventory, Payroll, Finance |
| **Extension** | Manufacturing emits facts; Cost Engine calculates |

### 4.17 Automation & AI Integration Layer

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Automation triggers, AI action registry, suggest/draft/execute modes |
| **Public Contracts** | AI governance contracts, approval gates |
| **Rules** | AI never bypasses workflow, approval, or permissions |
| **Consumers** | All apps |
| **Extension** | New AI actions register with audit + permission metadata |

### 4.18 File Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Tenant-safe attachments, storage adapters |
| **Public Contracts** | File upload/download with permission checks |
| **Consumers** | Document Engine, HR documents, all apps |

### 4.19 Integration & Connector Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Webhooks, connectors, idempotency, delivery logs |
| **Public Contracts** | Connector registry, webhook contracts |
| **Consumers** | Commerce, Marketplace, external ERP, bank files |
| **Extension** | Per-integration connector manifests |

### 4.20 Testing Engine

| Aspect | Detail |
|--------|--------|
| **Responsibilities** | Quality gates, RLS test patterns, contract validation |
| **Public Contracts** | Test registry conventions |
| **Consumers** | CI pipeline, review gates |

---

## SECTION 5 — Business Applications

### 5.1 Application Catalog

| App | Purpose | Owned Entities | Key Dependencies | Consumers | Runtime Boundaries | Future Modules |
|-----|---------|----------------|------------------|-----------|-------------------|----------------|
| **HR** | People operations, org, contracts | `hr_employees`, `hr_employment_profiles`, `hr_contracts`, `hr_org_units`, `hr_positions`, `hr_jobs` | Platform, Party | Payroll, Portal, Manufacturing | Profile anchor only; org via Assignment | Recruitment, Performance, Learning |
| **Payroll** (HR domain) | Payroll execution, results, payslips | `hr_payroll_*`, snapshots, results, payslips | Assignment, Compensation, Attendance, Leave | Finance, Portal, Cost | Calculation engine country-neutral | Localization packs, WPS |
| **Finance** | GL, journals, fiscal control | `finance_*` | Platform, Party | All posting consumers | Posting readiness only in v1.0 | Full posting runtime |
| **Inventory** | Stock, warehouses, movements, ledger | `inventory_*` | Platform, Product Master | Manufacturing, Purchasing, Sales, Commerce | Canonical stock owner | Reservation runtime completion |
| **Warehouse** (Inventory domain) | Execution, locations, lots, serials | Warehouse execution entities | Inventory foundation | Manufacturing, Purchasing | Movement documents only | Wave picking, barcode |
| **Manufacturing** | Production planning, MO, DPR | `manufacturing_*` | Inventory, HR (refs), Cost | Cost, Finance readiness | Never mutates inventory | Quality integration, MES |
| **Purchasing** | Procurement documents | Planned `purchasing_*` | Party, Inventory, Document Engine | Finance | — | RFQ, vendor portal |
| **Sales** | Sales orders, invoicing | Planned `sales_*` | Party, Product Master, Inventory | Finance, CRM | — | Quotes, delivery |
| **CRM** | Pipeline, opportunities | Planned `crm_*` | Party | Sales, Service | — | Campaigns |
| **Service** | Service orders, SLAs | Planned `service_*` | Party, Inventory (parts) | CRM, Fleet | — | Field service |
| **Fleet** | Assets, vehicles, maintenance | Planned `fleet_*` | Party, Service | Finance | — | Telematics |
| **Rental** | Rental units, contracts | Planned `rental_*` | Party, Inventory | Finance, Sales | — | Availability calendar |
| **Commerce** | Storefronts, channels, pricing | Commerce layer | Product Master, Inventory (read) | Marketplace, POS | Read-only product/stock | Checkout, payments |
| **Marketplace** | Multi-vendor operations | Platform marketplace | Commerce, Party | External sellers | — | Subscriptions |
| **POS** | Point of sale | Planned `pos_*` | Commerce, Inventory | Finance | — | Offline mode |
| **Projects** | Project costing, WBS | Planned `projects_*` | Cost Engine, HR, Finance | Manufacturing | Cost consumer slot | Time tracking |
| **Quality** | Inspections, release/reject | Planned `quality_*` | Manufacturing, Inventory | Manufacturing | Independent of Mfg decisions | NCR, CAPA |
| **Maintenance** | Asset maintenance | Planned `maintenance_*` | Fleet, Manufacturing machines | Service | — | Preventive schedules |

### 5.2 App Contract (Mandatory)

Every business app must provide:

- **Manifest** — key, version, permissions, dependencies, navigation, commands, reports, prints, dashboards.
- **Public API** — stable application contracts only.
- **Route adapters** — loaders/actions through platform contracts.
- **Data ownership** — `app_prefix_*` tables with full RLS.
- **Lifecycle hooks** — install, enable, disable, upgrade, health-check.

---

## SECTION 6 — Bounded Context Map

| Context | Owner | Public APIs | Events Published | Events Consumed | Read Models | Write Models | Projections | Forbidden Access |
|---------|-------|-------------|------------------|-----------------|-------------|--------------|-------------|------------------|
| **Platform Kernel** | Platform | Context, RBAC, tenancy | Security audit | — | User, tenant, branch | Tenancy admin | — | Business tables |
| **Workflow** | Platform | Transition commands | WorkflowTransitionCompleted | Document events | Workflow state | Transition log | — | Business calculation |
| **Approval** | Platform | Approval decisions | ApprovalGranted/Rejected | Workflow events | Approval queue | Approval records | — | Payroll math |
| **Document Engine** | Platform | Document lifecycle | DocumentPosted | — | Document status | Document headers | Number sequences | App posting logic |
| **Party** | Platform | Party CRUD | PartyCreated/Updated | — | Party search | Party records | — | Duplicate registries |
| **Finance** | Finance app | Chart, journals, periods | FinancialEvent (posting intent) | Inventory/Mfg readiness | GL balances | Journal entries (future) | Posting readiness | Inventory stock mutation |
| **Inventory** | Inventory app | Movements, reservations | InventoryMovementPosted | Reservation events | Stock balances | Movement lines | Availability projections | Direct GL writes |
| **Manufacturing** | Manufacturing app | MO, DPR, routing | ProductionReportApproved | Inventory confirmations | Production KPIs | MO, DPR facts | — | Inventory quantity writes |
| **HR Core** | HR app | Employee, profile, contracts | Employee lifecycle | — | Employee directory | Employee, profile anchor | — | Direct org writes on profile |
| **Assignment Engine** | HR app | Assignment CRUD, resolver | AssignmentCreated/Superseded | HR Action approved | Org resolver | `hr_assignments` | Profile cache | Profile org writes |
| **Policy Engine** | HR app | Policy definitions | PolicyVersionActivated | — | Active policies | Policy versions | — | Inline policy on employee |
| **Compensation** | HR app | Salary packages | CompensationVersionCreated | Policy events | Package refs | Compensation versions | — | Live payroll numbers |
| **Attendance** | HR app | Punch facts | AttendanceRecorded | Workforce schedule | Daily attendance | Punch records | — | Leave mutation |
| **Leave/Absence** | HR app | Leave requests | LeaveApproved/Consumed | — | Leave balances (readiness) | Leave requests | — | Attendance punch mutation |
| **Payroll** | HR app | Runs, results | PayrollRunApproved | Leave, Attendance typed refs | Run status | Results, snapshots | Payslip lines | Payslip recalculation |
| **HR Actions** | HR app | Action documents | HRActionDocumentApproved | Workflow/Approval | Action queue | Action documents | — | Direct operational mutation |
| **Apply Engine** | HR app | Effect application | HRActionApplyCompleted | HR Action approved | Apply readiness | Apply records | Timeline | Direct mutation (until runtime) |
| **Product Master** | Commerce/Inventory | Product, variant CRUD | ProductUpdated | — | Catalog search | Product records | — | Commerce-owned duplicates |
| **Commerce** | Commerce layer | Channels, pricing | OrderCreated (future) | Product, Inventory read | Catalog views | Channel config | — | Inventory balance tables |
| **Quality** | Quality app (future) | Inspection decisions | QualityReleased/Rejected | ProductionReportSubmitted | Inspection status | Inspection records | — | Manufacturing owns production facts |

---

## SECTION 7 — Canonical Ownership Matrix

| Entity | Canonical Owner | Read Models | Runtime Consumers | Write Path | Projection Rules |
|--------|-----------------|-------------|---------------------|------------|------------------|
| **Company** | Platform Tenancy | All apps | All scoped ops | Platform admin | Immutable identity |
| **Branch** | Platform Tenancy | All apps | Branch-scoped ops | Platform admin | Company child |
| **Organization** | HR Core (`hr_org_units`) | HR, Payroll, Reports | Assignment resolver | HR Core master data | Effective-dated tree |
| **Business Unit** | HR Core (org hierarchy) | Assignment, Reports | Resolver | HR Core | Org tree node |
| **Department** | HR Core (org unit type) | Assignment, Payroll | Resolver → profile cache | Assignment Engine | Cached on employment profile |
| **Section** | HR Core (org unit type) | Assignment, Reports | Resolver | Assignment Engine | Org hierarchy leaf/mid |
| **Team** | HR Core / Assignment | Manager scope | MSS, Reports | Assignment Engine | Effective-dated |
| **Position** | HR Core (`hr_positions`) | Assignment, Workforce | Resolver → profile cache | HR Core (seat definition) | Approved seat |
| **Job** | Job Architecture (`hr_jobs`) | HR, Position | Compatibility reads | HR Core | Canonical taxonomy |
| **Employee** | HR Core (`hr_employees`) | All HR, Payroll, Portal | Identity anchor | HR Core | Party link, status only |
| **Employment** | HR Core (`hr_employment_profiles`) | All HR engines | Anchor + cache | Profile anchor; org via Assignment | Cached projections |
| **Assignment** | Assignment Engine (`hr_assignments`) | Profile, Payroll snapshot | All org consumers | HR Action → Assignment | Immutable history; supersede |
| **Leave** | Leave/Absence BC | Payroll inputs | Typed payroll refs | Leave BC | First-class BC |
| **Attendance** | Attendance Engine | Payroll inputs | Punch facts | Attendance Engine | Facts only |
| **Compensation** | Compensation Engine | Payroll snapshot | Package refs | Compensation Engine | Effective-dated versions |
| **Payroll** | Payroll Run (`hr_payroll_runs`) | Finance readiness | Calculation engine | Payroll Run lifecycle | Run is execution unit |
| **Payroll Result** | Payroll Result (`hr_payroll_results`) | Payslip, Finance, Cost | Calculation output | Payroll Result lifecycle | Owns numbers |
| **Payslip** | Payslip (`hr_payslips`) | Portal (via publication) | Presentation | Derived from result | Never recalculates |
| **Workforce** | Workforce Engine | Attendance, Manufacturing | Shift/calendar refs | Workforce Engine | Schedule definitions |
| **Product** | Product Master / Inventory | Commerce, Mfg, Sales | Catalog, BOM refs | Product foundation | Canonical identity |
| **Variant** | Product Master | Commerce, Inventory | SKU operations | Product foundation | Product child |
| **Warehouse** | Inventory (`inventory_warehouses`) | All stock consumers | Movements | Inventory app | Branch-scoped |
| **Location** | Inventory (`inventory_locations`) | Warehouse execution | Pick/put | Inventory app | Warehouse child |
| **Lot** | Inventory | Traceability | Manufacturing, Sales | Inventory app | Lot tracking |
| **Serial** | Inventory | Traceability | Warranty, Service | Inventory app | Serial tracking |
| **Reservation** | Inventory Reservation Engine | Sales, Manufacturing | Allocation | Reservation RPCs | Soft/hard reservation |
| **Inventory Ledger** | Inventory | Finance, Reports | Valuation reads | Movement posting | Immutable entries |
| **Manufacturing Order** | Manufacturing | Shop floor, Cost | Production execution | Manufacturing app | Document envelope |
| **Production Report** | Manufacturing + Document Engine | Cost, Quality, Inventory | DPR facts | Manufacturing app | Triggers inventory docs |
| **Quality Inspection** | Quality Engine (future) | Manufacturing release | Release/reject | Quality app | Independent decision |
| **Purchase Order** | Purchasing (future) | Receipt, Finance | Procurement | Purchasing app | Document lifecycle |
| **Sales Order** | Sales (future) | Delivery, Finance | Order fulfillment | Sales app | Document lifecycle |
| **Customer** | Party (customer role) | Sales, CRM, Commerce | Order refs | Party foundation | Role on party |
| **Supplier** | Party (supplier role) | Purchasing, Manufacturing | PO refs | Party foundation | Role on party |
| **Asset** | Fleet/Asset module (future) | Service, Maintenance | Depreciation | Asset module | Not yet implemented |
| **Document** | Document Engine + app type | Workflow, Approval | Universal lifecycle | Document Engine | Platform-owned lifecycle |

### HR Canonical Chain (Frozen)

```text
Employee (identity)
  → Employment Profile (anchor + cache)
  → Assignment Engine (org SoT)
  → Assignment Resolver (read path)
  → Employment Profile cache rebuild
  → Payroll Employee Snapshot (at run approval)
  → Payroll Result (numbers)
  → Payslip (presentation)
  → Payslip Publication (visibility)
```

---

## SECTION 8 — Source of Truth Matrix

| Business Concept | Source of Truth | NOT Source of Truth |
|------------------|-----------------|---------------------|
| Employee identity | HR Core (`hr_employees`) | Employment profile, payslip |
| Employee department | Assignment Engine | Employment profile (cache only) |
| Employee position | Assignment Engine | Employment profile (cache only) |
| Reporting manager | Assignment Engine | Employment profile (cache only) |
| Cost center (HR) | Assignment Engine | Employment profile |
| Payroll group | Assignment Engine | Employment profile |
| Compensation amount | Compensation Engine → Snapshot | Payslip, live profile |
| Payroll calculated numbers | Payroll Result | Payslip, employment profile |
| Employee-visible payslip | Payslip Publication | Payslip processing status |
| Leave balance/impact | Leave/Absence BC | Attendance punches |
| Attendance facts | Attendance Engine | Leave requests |
| Inventory quantity | Inventory Engine | Manufacturing, Commerce |
| Stock valuation | Inventory Ledger | Manufacturing DPR |
| Product identity | Product Master / Inventory foundation | Commerce catalog duplicate |
| Product pricing | Pricing Engine / Commerce | Product Master |
| BOM definition | Manufacturing | Inventory |
| Production facts | Manufacturing (DPR) | Inventory movements |
| Material movement | Inventory documents | Manufacturing direct writes |
| GL balances | Finance (future posting) | Inventory, Payroll |
| Posting readiness | Respective app (Payroll, Inventory, Mfg) | Payslip lines |
| Business partner | Party Engine | App-local customer/supplier tables |
| Document number | Document Engine | App-local sequences |
| Workflow state | Workflow Engine | UI state |
| Approval decision | Approval Engine | Email/chat |
| Audit trail | Audit Engine | Application logs only |
| Search index | Search Engine (projection) | Source tables |
| Cost allocation | Cost Engine | Manufacturing inline math |
| Org policy assignment | Assignment Engine + Policy Engine | Inline profile policy refs |
| Job taxonomy | `hr_jobs` | `hr_job_titles` (legacy) |

---

## SECTION 9 — Enterprise Dependency Matrix

### Allowed Dependencies (Write or Contract)

| From | To | Relationship |
|------|-----|--------------|
| Employee | Assignment | HR Core creates employee; Assignment assigns org |
| Assignment | Employment Profile | Cache rebuild (write projection) |
| HR Action | Assignment Engine | Approved actions create/supersede assignments |
| Payroll Run | Employee Snapshot | Snapshot at approval |
| Payroll Calculation | Payroll Result | Writes calculated numbers |
| Payroll Result | Payslip | Derives presentation |
| Manufacturing | Inventory API | Material request, issue, receipt documents |
| Manufacturing | HR Assignment (read) | Crew worker refs |
| Inventory movement | Finance | Posting readiness lines |
| Commerce | Product Master | Read catalog |
| All apps | Platform engines | Via `public-api` |
| All apps | Audit / Events | Registration + emission |

### Read-Only Dependencies

| From | To | Rule |
|------|-----|------|
| Assignment | Payroll | Read at snapshot time only |
| Payroll | Leave/Absence | Typed source refs |
| Payroll | Attendance | Typed source refs |
| Manufacturing | Inventory | Read projected availability |
| Commerce | Inventory | Read availability (never balance tables) |
| Sales | Party | Read customer/supplier |
| Finance | Posting readiness | Read lines; never mutate source |
| Portal | Payslip Publication | Read published only |
| Reports | All contexts | Read models and resolver outputs |

### Forbidden Dependencies

| Pattern | Required Alternative |
|---------|---------------------|
| `Employee → Department` (direct) | `Employee → Assignment → Department` |
| `Payroll → live Employment Profile` | `Payroll → Employee Snapshot` |
| `Payslip → recalculate` | `Payslip → Payroll Result` |
| `Platform → features/**` | Never |
| `Employment Profile → write org fields` | Assignment Engine write path |
| `Leave → mutate attendance punches` | Attendance owns facts |
| `Manufacturing → Inventory tables` | Inventory API / documents |
| `Commerce → Inventory balance tables` | Inventory read contracts |
| `Finance → Inventory stock mutation` | Inventory owns stock |
| `Localization Pack → modify calculation core` | Plug-in statutory rules only |
| `Portal → draft payroll` | Publication gate |
| `New code → hr_job_titles` | `hr_jobs` canonical |
| `AI → bypass workflow/approval` | Governed AI action contracts |
| `Cross-feature → private repository import` | `public-api` only |

---

## SECTION 10 — Lifecycle Models

### 10.1 Employee

| States | active → inactive → terminated → archived |
| Transitions | hire, activate, suspend, terminate, archive |
| Owner | HR Core |
| Events | EmployeeCreated, EmployeeTerminated |
| Approvals | Termination may require approval |
| Audit | All status changes |

### 10.2 Employment

| States | active profile ranges → superseded |
| Transitions | create profile, supersede, close |
| Owner | HR Core |
| Events | EmploymentProfileCreated, EmploymentProfileSuperseded |
| Approvals | Contract-linked changes |
| Audit | Profile anchor mutations |

### 10.3 Assignment

| States | planned → active → expired / cancelled / superseded |
| Transitions | create, activate, supersede, cancel, expire |
| Owner | Assignment Engine |
| Events | AssignmentCreated, AssignmentSuperseded |
| Approvals | HR Action approval gate |
| Audit | Immutable history after approval |

### 10.4 Contract

| States | draft → active → expired → terminated |
| Owner | HR Core |
| Events | ContractActivated, ContractExpired |
| Note | Legal evidence only; no salary rules |

### 10.5 Leave

| States | draft → submitted → approved → consumed → cancelled → archived |
| Owner | Leave/Absence BC |
| Events | LeaveApproved, LeaveConsumed |
| Approvals | Workflow + Approval binding |

### 10.6 Attendance

| States | punch recorded → exception flagged → resolved |
| Owner | Attendance Engine |
| Events | AttendanceRecorded, AttendanceExceptionResolved |
| Note | Facts only; no leave mutation |

### 10.7 Payroll

**Period:** open → input_collection → snapshot_ready → processing → review → approved → locked → posted → paid → closed

**Run:** draft → validating → ready → calculating → calculated → review → approved → locked → closed

**Result:** pending → calculated → approved → locked

**Owner:** Payroll Run/Result

**Events:** PayrollRunApproved, PayrollResultLocked

**Approvals:** Run approval before snapshot immutability

### 10.8 Payslip

**Processing:** draft → calculated → under_review → approved → locked → posted → paid

**Publication:** draft → generated → pending_publish → published → unpublished → archived

**Owner:** Payslip (processing); Payslip Publication (visibility)

**Rule:** Employee visibility exclusively via `published` publication status.

### 10.9 Purchase (Future)

| States | draft → submitted → approved → partially_received → received → closed → cancelled |
| Owner | Purchasing app |
| Events | PurchaseOrderApproved, GoodsReceived |
| Inventory impact | Goods receipt document |
| Finance impact | Posting readiness on receipt |

### 10.10 Sales (Future)

| States | draft → confirmed → partially_delivered → delivered → invoiced → closed → cancelled |
| Owner | Sales app |
| Inventory impact | Goods issue / delivery document |
| Finance impact | Invoice posting readiness |

### 10.11 Inventory

| Document States | draft → submitted → approved → posted → reversed → closed |
| Owner | Inventory app |
| Events | InventoryMovementPosted, ReservationConfirmed |
| Ledger | Immutable entries on post |
| Finance impact | Posting readiness lines |

### 10.12 Manufacturing

**Manufacturing Order:** draft → released → in_progress → completed → closed → cancelled

**Production Report:** draft → submitted → approved → posted → closed

**Owner:** Manufacturing app

**Events:** ProductionReportApproved, ManufacturingOrderCompleted

**Inventory impact:** Material issue, FG receipt via Inventory documents only

### 10.13 Quality (Future)

| States | draft → submitted → inspected → released / rejected → closed |
| Owner | Quality Engine |
| Events | QualityReleased, QualityRejected |

### 10.14 Service (Future)

| States | draft → scheduled → in_progress → completed → closed → cancelled |
| Owner | Service app |

### 10.15 Assets (Future)

| States | active → in_maintenance → disposed → archived |
| Owner | Fleet/Asset module |

---

## SECTION 11 — Enterprise Document Architecture

| Document | Owner | Lifecycle Summary | Approval | Inventory Impact | Finance Impact | Key Events |
|----------|-------|-------------------|----------|------------------|----------------|------------|
| Purchase Request | Purchasing | draft → approved → closed | Yes | None | Budget check (future) | PRApproved |
| Purchase Order | Purchasing | draft → approved → open → closed | Yes | Expected receipt | Commitment (future) | POApproved |
| Goods Receipt | Inventory | draft → posted | Yes | Stock increase | Posting readiness | GRNPosted |
| Goods Issue | Inventory | draft → posted | Yes | Stock decrease | COGS readiness | GINPosted |
| Transfer | Inventory | draft → approved → posted | Yes | Location change | None (internal) | TransferPosted |
| Adjustment | Inventory | draft → approved → posted | Yes | Quantity correction | Valuation adjustment | AdjPosted |
| Manufacturing Order | Manufacturing | draft → released → completed | Yes | Material intent | WIP readiness (future) | MOReleased |
| Material Request | Inventory | draft → approved → issued | Yes | Reservation/issue | None | MatReqIssued |
| Production Report | Manufacturing | draft → approved → posted | Yes | Consumption + output | Cost facts | DPRPosted |
| Quality Inspection | Quality | draft → inspected → released/rejected | Yes | Release hold | None | QIReleased |
| Leave Request | HR/Leave | draft → approved → consumed | Yes | None | Payroll typed ref | LeaveApproved |
| Loan Request | HR Actions | draft → approved → active | Yes | None | Deduction ref | LoanApproved |
| Journal Entry | Finance | draft → posted → reversed | Yes | None | GL post (future) | JEPosted |
| Sales Order | Sales | draft → confirmed → delivered | Yes | Reservation/issue | Revenue readiness | SOConfirmed |
| Invoice | Sales/Finance | draft → posted → paid | Yes | Delivery link | AR/Revenue | InvoicePosted |
| Service Order | Service | draft → scheduled → completed | Yes | Parts issue | Revenue readiness | SOCompleted |
| Return | Sales/Inventory | draft → approved → posted | Yes | Stock return | Credit note readiness | ReturnPosted |

All documents use **Document Engine** envelope for numbering, attachments, status, and audit unless explicitly exempted by ADR.

---

## SECTION 12 — Event Architecture

### 12.1 Event Layers

1. **In-process Event Bus** — workflow, approval, notification, engine coordination. Not guaranteed delivery.
2. **Durable Outbox** — external webhooks, integration delivery after commit. Guaranteed at-least-once with idempotency.

### 12.2 Naming Rules

- PascalCase domain names: `AssignmentCreated`, `PayrollRunApproved`
- Registered via `definePlatformEventDefinition`
- Version `1` default; breaking changes increment version
- Publishing app owns event schema

### 12.3 Official Event Catalog (Index)

| Domain | Event Names | Publisher | Consumers | Payload Owner |
|--------|-------------|-----------|-----------|---------------|
| Assignment | AssignmentCreated, AssignmentSuperseded | HR | Profile cache, Audit | HR |
| HR Action | HRActionDocumentApproved | HR | Apply Engine | HR |
| Apply | HRActionApplyCompleted | HR | Timeline, Audit | HR |
| Workflow | WorkflowTransitionCompleted | Platform | Apps, Notification | Platform |
| Approval | ApprovalGranted, ApprovalRejected | Platform | Apps, Notification | Platform |
| Payroll | PayrollRunApproved, PayrollResultLocked | HR | Finance, Cost, Portal | HR |
| Template | TemplateAssigned | HR | Assignment | HR |
| Inventory | InventoryMovementPosted, ReservationConfirmed | Inventory | Finance, Manufacturing | Inventory |
| Manufacturing | ProductionReportApproved, MOCompleted | Manufacturing | Inventory, Cost, Quality | Manufacturing |
| Financial | FinancialEvent (posting intent) | Finance | Audit | Finance |
| Party | PartyCreated, PartyUpdated | Platform | CRM, Sales | Platform |
| Document | DocumentPosted, DocumentCancelled | Document Engine | Workflow, Audit | Platform |

### 12.4 Cross-Cutting Rules

| Rule | Detail |
|------|--------|
| **Correlation IDs** | `x-correlation-id` on all mutations and event chains |
| **Idempotency** | External consumers must use idempotency keys; handlers must be idempotent |
| **Versioning** | Breaking payload changes require new event version + migration plan |
| **Audit linkage** | Sensitive events require registered audit actions |
| **Payload ownership** | Publisher owns schema; consumers treat as read-only contract |

---

## SECTION 13 — Security Model

### 13.1 Defense Layers (ADR-007)

1. Authentication  
2. App authorization (`requirePermission`)  
3. Domain rules (manifest + contracts)  
4. Row Level Security (PostgreSQL)  
5. Audit  

### 13.2 Permission Model

- Format: `<module>.<resource>.<action>` (e.g., `hr.payroll.manage`)
- Registered in module registries — never hardcoded
- Entitlements, permissions, and data scopes are **separate concepts**
- Code checks permissions, not role names

### 13.3 Scope Model

| Scope | Applies To | Enforcement |
|-------|------------|-------------|
| **Tenant** | All tenant tables | `tenant_id` + `is_tenant_member` |
| **Company** | Business operations | `has_company_access` |
| **Branch** | Branch-scoped data | `has_branch_access` |
| **Manager** | Team visibility | Assignment resolver + manager scope |
| **Employee (self)** | ESS portal | Self-record scope |
| **Department** | Dept-scoped reports | Org resolver + permission |
| **Platform Admin** | Tenancy, RBAC | `platform.*` permissions |

### 13.4 RLS Strategy

- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on tenant tables
- Soft delete: `deleted_at is null` in policies
- Permission-aware: `has_permission('module.resource.action', tenant_id)`
- App access: `has_app_access(tenant_id, 'app_key')`
- Default-deny; `WITH CHECK` on INSERT/UPDATE

### 13.5 Sensitive Fields

PII, compensation, payroll results, bank details require `sensitiveData` metadata in contracts. Export, print, and report operations require permission + audit.

### 13.6 Temporary Delegation

Approval engine supports delegation with audit. Temporary permission elevation must be registered, time-bounded, and audited.

### 13.7 Approval Security

Segregation of duties via approval engine + permission pairs. Creator ≠ approver for high-risk documents (financial, payroll, inventory posting).

### 13.8 Portal Isolation

HR self-service users must not load ERP navigation, data, or code paths. Portal and ERP experiences remain scoped separately even for dual-role users.

---

## SECTION 14 — UX Standards

### 14.1 Core Philosophy

- **Employee-centric** — ESS/MSS optimized for largest user population
- **Training-first** — clear labels, helpful empty states, guided wizards
- **Intent-based navigation** — not schema-driven menus

### 14.2 Required Patterns

| Pattern | Requirement |
|---------|-------------|
| **EntityLookup** | Searchable lookups; no raw UUID exposure |
| **Progressive Disclosure** | Sectioned forms; advanced fields collapsed |
| **Wizard-first creation** | Complex entities created via guided wizards |
| **List-first modals** | Create/edit as modal overlay on list workspace |
| **Quick Actions** | Contextual actions on dashboards and records |
| **Role-based dashboards** | Permission-filtered KPIs |
| **Keyboard navigation** | Command palette, focus management |
| **Bulk operations** | Safe bulk actions with confirmation |
| **Mobile-first operations** | Touch targets, compact nav for warehouse/shop floor |
| **Barcode/QR support** | Warehouse and POS operations |
| **Friendly validation** | Clear, actionable error messages |
| **Smart defaults** | Company/branch/date defaults from context |

### 14.3 Forbidden UX

- Raw UUID-first workflows
- Hardcoded global sidebars (registry-driven navigation required)
- Per-app competing shells, form systems, or feedback systems
- Direct Sonner import (use `platform.feedback`)
- Border-only buttons without visible background/hover/focus states

### 14.4 Accessibility & Localization

- Keyboard navigation, screen reader labels, focus management
- Color contrast, touch target size, reduced motion
- RTL/LTR, Arabic/English, dark/light mode as platform capabilities

---

## SECTION 15 — Integration Standards

### 15.1 Core Rule

**Modules communicate through contracts, events, or approved engines. Direct database coupling is forbidden.**

### 15.2 Integration Matrix

| Source Domain | Target Domain | Integration Type | Status v1.0 |
|---------------|---------------|------------------|-------------|
| Payroll Result | Finance | Posting readiness lines | Contract |
| Payroll Result | Cost Engine | Labor cost facts | Contract |
| Inventory movement | Finance | Posting readiness | Contract |
| Manufacturing DPR | Inventory | Stock documents | Partial |
| Manufacturing DPR | Cost Engine | Production cost facts | Contract |
| HR Action | Platform Workflow | Binding ref | Foundation |
| HR Action | Platform Approval | Binding ref | Foundation |
| Commerce | Product Master | Read catalog | Contract |
| Commerce | Inventory | Read availability | Contract |
| Marketplace | Commerce + Party | Order sync | Planned |
| CRM | Party | Read/write party roles | Planned |
| Service | Inventory + Party | Parts + customer | Planned |
| Fleet | Finance | Asset depreciation | Planned |
| AI/Automation | All apps | Public API commands | Governance contracts |
| External APIs | Platform | Webhooks + connectors | Sprint 08 contracts |

### 15.3 External Integration Rules

- Validate webhook signatures where possible
- Store integration event logs
- Idempotent operations with retry
- Never expose secrets in client code
- Failed sync visibility in admin UI

---

## SECTION 16 — AI & Automation Standards

### 16.1 AI Must

- Use **Public APIs** only
- Respect **Workflow** state machines
- Respect **Approval** gates
- Produce **Audit** records for executed actions
- Emit **Commands** (not silent mutations)
- Consume **Events** for context

### 16.2 AI Must Never

- Bypass business rules or permissions
- Directly mutate database tables
- Recalculate payroll or inventory outside engines
- Publish payslips or post documents without approval
- Access draft/unpublished sensitive records for employee-facing output

### 16.3 Automation Modes

| Mode | Behavior |
|------|----------|
| **Suggest** | Read-only recommendations |
| **Draft** | Creates draft documents requiring human submit |
| **Execute** | Runs approved commands through governed action registry |

All modes require permission metadata, data scope enforcement, and audit linkage.

---

## SECTION 17 — Naming Standards

| Artifact | Convention | Example |
|----------|------------|---------|
| **Tables** | `snake_case`, app-prefixed | `hr_assignments`, `inventory_movements` |
| **Columns** | `snake_case` | `effective_from`, `tenant_id` |
| **Enums** | `snake_case` type name | `hr_assignment_status` |
| **Events** | PascalCase | `AssignmentCreated` |
| **Permissions** | `app.domain.resource.action` | `hr.assignments.view` |
| **Contracts** | `SCREAMING_SNAKE` export | `HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT` |
| **Contract keys** | `dot.separated.lowercase` | `hr.assignments.foundation.boundary` |
| **Runtime helpers** | `camelCase` verb-first | `resolveHrAssignment` |
| **Services** | `feature-domain.service.ts` | `inventory-transaction.service.ts` |
| **API routes** | `/api/<domain>/<action>` | `/api/workspace/preferences` |
| **DB functions** | `snake_case` | `has_permission` |
| **Indexes** | `<table>_<columns>_idx` | `hr_assignments_employee_type_idx` |
| **RLS policies** | `<table>_<operation>` | `hr_assignments_select` |
| **Feature folders** | `src/features/<feature-name>/` | `src/features/hr/` |
| **Components** | PascalCase | `HrEmployeeWizard` |
| **Routes** | kebab-case | `/erp/hr/employees` |
| **Tests** | `*.test.ts` co-located or `__tests__/` | `assignment-foundation.test.ts` |
| **Correlation header** | `x-correlation-id` | — |

---

## SECTION 18 — Legacy & Migration Strategy

| Legacy | Canonical Replacement | Strategy |
|--------|----------------------|----------|
| `financial_*` utilities | `finance_*` app tables | Compatibility reads; no new deps |
| `products`, `warehouses` (master) | `inventory_*` | Inventory owns canonical tables |
| `hr_job_titles` | `hr_jobs` | Read-only compatibility; freeze new deps |
| Employment profile org writes | Assignment Engine | Cache rebuild migration |
| `hr_payroll_batches` as execution unit | `hr_payroll_runs` | Batch groups; run executes |
| Inline policy refs on profile | Assignment-based policy refs | Deprecated-source-field classification |
| Generic payroll input metadata | Typed `HrPayrollTypedSourceKind` refs | Forbidden for new code |
| Manufacturing JSON columns | Normalized line tables | Backfill migration planned |
| Loader direct repository access | Service → Repository pattern | Wave migration per module |
| Legacy doc paths (`docs/platform/`) | Numbered `docs/` folders | Redirect stubs retained |

### Deprecation Process

1. Document in ADR  
2. Mark legacy as read-only compatibility  
3. Freeze new dependencies  
4. Migration plan with data audit  
5. Backfill canonical source  
6. Archive/drop only after verification  

**Rule:** Never remove legacy entities without an approved migration strategy.

---

## SECTION 19 — Review Gates

No major implementation proceeds without passing the appropriate gate.

| Gate | Trigger | Criteria | Authority |
|------|---------|----------|-----------|
| **Architecture Review** | New bounded context, engine, or ownership change | Bounded context map updated; no forbidden deps; ADR if needed | Architecture board |
| **UX Review** | New app UI or major workflow | UX standards compliance; mobile/RTL/accessibility | UX reviewer |
| **Security Review** | Permissions, RLS, sensitive data, portal scope | Multi-layer security; RLS policies; SoD | Security reviewer |
| **Performance Review** | Heavy lists, reports, exports | Query bounds; async paths; index plan | Performance reviewer |
| **Data Ownership Review** | New tables or cross-app reads | Ownership matrix updated; write path identified | Architecture board |
| **Production Readiness Review** | Feature release | Tests, migrations validated, audit complete, docs updated | Engineering lead |

### Implementation Gate (Post-Freeze)

Subsequent work requires:

- ADR for architecture changes  
- Contract foundation before runtime  
- `npm run validate:migrations` + typecheck + lint + test  
- Applicable review gates passed  

---

## SECTION 20 — Technical Debt Register

### Critical

| Item | Risk | Impact | Mitigation | Target Release |
|------|------|--------|------------|----------------|
| Dual org SoT risk (profile fields vs assignments) | Data inconsistency | Wrong payroll/org reports | Assignment resolver + cache rebuild; deprecate profile org writes | Program 02 HCM |
| Platform engines contract-only | No runtime execution | Features blocked on workers | Approved runtime sprints per engine | Program 01 |
| No live Supabase in CI | Migration failures in prod | Schema drift | Staging migration gate | Program 01 |

### High

| Item | Risk | Impact | Mitigation | Target Release |
|------|------|--------|------------|----------------|
| `hr_job_titles` legacy deps | Wrong job taxonomy | Reporting inconsistency | Migrate to `hr_jobs`; freeze new refs | Program 02 HCM |
| Payroll batch vs run confusion | Wrong lifecycle | Operational errors | Enforce run as execution unit | Program 02 HCM |
| Employment profile deprecated policy refs | Stale policy | Wrong entitlements | Assignment-based policy refs | Program 02 HCM |
| Manufacturing JSON columns | Query/migration pain | Performance, integrity | Normalized line backfill | Program 03 |
| Static migration validation only | Undetected SQL errors | Prod failures | Integration tests on staging | Program 01 |

### Medium

| Item | Risk | Impact | Mitigation | Target Release |
|------|------|--------|------------|----------------|
| Feature cross-imports via public-api | Hidden coupling | Boundary erosion | Manifest dependency audit | Ongoing |
| Large uncommitted sprint history | Traceability loss | Release risk | Split approved commits | Immediate |
| ESS/MSS contracts without UI | Delayed portal | User gap | Portal sprint after publication runtime | Program 02 |
| Loader → Service migration incomplete | Architecture drift | Testability | Wave 1.1+ migration | Program 01 |
| Permission alias pairs (HR underscore/dot) | Confusion | Misconfiguration | Canonical naming in new permissions | Ongoing |

### Low

| Item | Risk | Impact | Mitigation | Target Release |
|------|------|--------|------------|----------------|
| Redirect stub docs at legacy paths | Bookmark confusion | Minor | Gradual migration | Ongoing |
| Purchasing dashboard-only app | Incomplete procurement | Feature gap | Program 03 scope | Program 03 |

---

## SECTION 21 — Enterprise Readiness Matrix

| Area | Foundation Readiness | Runtime Readiness | UI Readiness | Production Readiness |
|------|---------------------|-------------------|--------------|---------------------|
| **Platform Core** | ✅ Complete | ⚠️ Partial (workers deferred) | ✅ Shell shipped | ⚠️ CI gate pending |
| **HR Core** | ✅ 23 contracts | ❌ Resolver deferred | ⚠️ Partial pages | ❌ Not production |
| **Payroll** | ✅ Contracts | ❌ Calculation deferred | ❌ No operator UI | ❌ Not production |
| **Finance** | ✅ Level 1 foundation | ❌ Posting deferred | ⚠️ Foundation pages | ❌ Not production |
| **Inventory** | ✅ Foundation + ops | ⚠️ Reservations partial | ⚠️ Partial pages | ❌ Not production |
| **Warehouse** | ✅ Lots/serials/ledger | ⚠️ Execution partial | ⚠️ Partial | ❌ Not production |
| **Manufacturing** | ✅ Blueprint v2 + DPR | ⚠️ Partial facts | ⚠️ Partial pages | ❌ Not production |
| **Purchasing** | ❌ Dashboard only | ❌ Not started | ❌ Dashboard only | ❌ Not production |
| **Sales** | ❌ Planned | ❌ Not started | ❌ Not started | ❌ Not production |
| **CRM** | ⚠️ Party foundation | ❌ Not started | ❌ Not started | ❌ Not production |
| **Service** | ❌ Doc only | ❌ Not started | ❌ Not started | ❌ Not production |
| **Fleet** | ❌ Doc only | ❌ Not started | ❌ Not started | ❌ Not production |
| **Rental** | ❌ Doc only | ❌ Not started | ❌ Not started | ❌ Not production |
| **Commerce** | ⚠️ Product Master | ❌ Not started | ❌ Not started | ❌ Not production |
| **Marketplace** | ⚠️ Platform contracts | ❌ Not started | ❌ Not started | ❌ Not production |
| **POS** | ❌ Not started | ❌ Not started | ❌ Not started | ❌ Not production |
| **Projects** | ⚠️ Cost consumer slot | ❌ Not started | ❌ Not started | ❌ Not production |
| **Quality** | ⚠️ Mfg blueprint refs | ❌ Not started | ❌ Not started | ❌ Not production |
| **Maintenance** | ❌ Not started | ❌ Not started | ❌ Not started | ❌ Not production |
| **AI** | ✅ Governance contracts | ❌ Not started | ❌ Not started | ❌ Not production |
| **Automation** | ✅ Job contracts | ❌ Workers deferred | ❌ Not started | ❌ Not production |
| **ESS/MSS Portal** | ✅ Security readiness | ❌ Publication runtime | ❌ No UI | ❌ Not production |

**Legend:** ✅ Ready/Complete · ⚠️ Partial · ❌ Not ready

---

## SECTION 22 — Product Roadmap — Enterprise Programs

### Program 01 — Platform Core

| Aspect | Detail |
|--------|--------|
| **Scope** | Engine runtime workers, CI migration gate, loader migration wave, observability |
| **Dependencies** | ADR-011 Platform Freeze acknowledged |
| **Review Gates** | Architecture, Security, Performance, Production Readiness |
| **Success Criteria** | Background jobs execute; migrations validated on staging; platform engines have partial runtime |

### Program 02 — HCM (Human Capital Management)

| Aspect | Detail |
|--------|--------|
| **Scope** | Assignment resolver, Apply runtime, Payroll calculation, first localization pack, ESS/MSS portal |
| **Dependencies** | Program 01; HR foundation contracts |
| **Review Gates** | Architecture, Data Ownership, Security, UX |
| **Success Criteria** | End-to-end payroll for one country; published payslips in portal; assignment cache enforced |

### Program 03 — Supply Chain

| Aspect | Detail |
|--------|--------|
| **Scope** | Inventory reservation runtime, warehouse execution, Purchasing/Sales documents, Manufacturing execution |
| **Dependencies** | Program 01; Inventory/Manufacturing foundations |
| **Review Gates** | Architecture, Data Ownership, Performance |
| **Success Criteria** | Full procure-to-pay and plan-to-produce with inventory documents only |

### Program 04 — Financials

| Aspect | Detail |
|--------|--------|
| **Scope** | Finance posting runtime, GL integration, fiscal period closing |
| **Dependencies** | Program 03 posting readiness lines |
| **Review Gates** | Architecture, Security, Production Readiness |
| **Success Criteria** | Automated journal posting from inventory, payroll, and sales readiness |

### Program 05 — Customer Experience

| Aspect | Detail |
|--------|--------|
| **Scope** | CRM, Service Center, Fleet, Rental |
| **Dependencies** | Party foundation; Program 03 Sales |
| **Review Gates** | Architecture, UX, Security |
| **Success Criteria** | Customer lifecycle from lead to service on unified Party |

### Program 06 — Commerce

| Aspect | Detail |
|--------|--------|
| **Scope** | Commerce layer, Marketplace, POS, Sales Channels, Storefronts |
| **Dependencies** | Product Master; Inventory read contracts |
| **Review Gates** | Architecture, Performance, Security |
| **Success Criteria** | Multi-channel sales with inventory sync via contracts |

### Program 07 — Intelligence

| Aspect | Detail |
|--------|--------|
| **Scope** | AI automation runtime, advanced reporting, dashboards, anomaly detection |
| **Dependencies** | Programs 01–06 operational data |
| **Review Gates** | Security, Architecture, Production Readiness |
| **Success Criteria** | Governed AI actions with full audit; no rule bypass |

---

## SECTION 23 — Architecture Decision Records (ADR Index)

### Platform ADRs

#### ADR-001: Documentation Source Of Truth

| Field | Content |
|-------|---------|
| **Context** | Architecture knowledge scattered across files |
| **Decision** | `docs/` numbered folders are canonical; ADRs are immutable |
| **Rationale** | Prevents silent architecture drift |
| **Consequences** | Changes require doc update before code |

#### ADR-002: Enterprise Business Platform

| Field | Content |
|-------|---------|
| **Context** | Risk of building monolithic ERP |
| **Decision** | Nexora is a platform; ERP is one app collection |
| **Rationale** | Enables HR Portal, Commerce, Marketplace as peers |
| **Consequences** | Platform engines mandatory; no app owns shared runtime |

#### ADR-003: Modular Monolith First

| Field | Content |
|-------|---------|
| **Context** | Microservices vs monolith tradeoff |
| **Decision** | Single deployable unit with strict module boundaries |
| **Rationale** | Operational simplicity with enterprise boundaries |
| **Consequences** | `public-api.ts` and manifest enforcement required |

#### ADR-004: App First Architecture

| Field | Content |
|-------|---------|
| **Context** | Feature sprawl without packaging |
| **Decision** | Installable apps with manifests, lifecycle, registry |
| **Rationale** | Modular rollout by tenant, license, role |
| **Consequences** | App Registry drives navigation and entitlements |

#### ADR-005: Engine First Architecture

| Field | Content |
|-------|---------|
| **Context** | Duplicated workflow, approval, print across apps |
| **Decision** | Shared capabilities in platform engines |
| **Rationale** | Consistency, audit, single upgrade path |
| **Consequences** | Apps consume engines; no reimplementation |

#### ADR-006: Explicit Request Context

| Field | Content |
|-------|---------|
| **Context** | Implicit tenant/user scope causes leaks |
| **Decision** | Explicit context: user, tenant, company, branch, employee, experience |
| **Rationale** | Security and UX depend on scope |
| **Consequences** | All services receive resolved context |

#### ADR-007: Security Multiple Layers

| Field | Content |
|-------|---------|
| **Context** | Single-layer security insufficient |
| **Decision** | Auth → entitlement → permission → scope → RLS → audit |
| **Rationale** | Defense in depth |
| **Consequences** | No UI-only or RLS-only reliance |

#### ADR-008: UX Foundation Before App UI

| Field | Content |
|-------|---------|
| **Context** | Inconsistent UX across apps |
| **Decision** | Shared UX foundation before app screens |
| **Rationale** | Adoption and training efficiency |
| **Consequences** | Apps consume platform UX patterns |

#### ADR-009: Heavy Workloads Platform Workloads

| Field | Content |
|-------|---------|
| **Context** | Reports/prints block transactions |
| **Decision** | Async background jobs for heavy work |
| **Rationale** | Operational throughput |
| **Consequences** | Job contracts before runtime |

#### ADR-010: Documentation Before Architecture Change

| Field | Content |
|-------|---------|
| **Context** | Code-first architecture drift |
| **Decision** | Document + ADR before implementation |
| **Rationale** | Constitutional governance |
| **Consequences** | This blueprint sprint |

#### ADR-011: Platform Freeze v1.0

| Field | Content |
|-------|---------|
| **Context** | Platform scope creep during app work |
| **Decision** | Platform architecture frozen; contract-first |
| **Rationale** | Stable foundation |
| **Consequences** | Runtime workers largely deferred (warnings) |

#### ADR-012: App Foundation Decisions

| Field | Content |
|-------|---------|
| **Context** | Finance/Inventory/Manufacturing table ownership unclear |
| **Decision** | App-owned canonical tables with documented prefixes |
| **Rationale** | Clear data ownership |
| **Consequences** | Legacy master data superseded |

#### ADR-013: Workflow Approval Separation

| Field | Content |
|-------|---------|
| **Context** | Conflated process and decision |
| **Decision** | Workflow owns process; Approval owns decisions |
| **Rationale** | SoD and reuse |
| **Consequences** | Separate engines and events |

#### ADR-014: Immutable Ledger

| Field | Content |
|-------|---------|
| **Context** | Mutable financial/audit history |
| **Decision** | Append-only ledgers and protected history |
| **Rationale** | Enterprise audit requirements |
| **Consequences** | Supersede/reversal patterns instead of overwrite |

#### ADR-015: Document Engine

| Field | Content |
|-------|---------|
| **Context** | Per-app document lifecycle duplication |
| **Decision** | Universal document lifecycle engine |
| **Rationale** | Consistent numbering, audit, workflow binding |
| **Consequences** | Apps register document types |

#### ADR-016: Inventory Ownership

| Field | Content |
|-------|---------|
| **Context** | Legacy products/warehouses vs inventory_* |
| **Decision** | Inventory app owns canonical stock tables |
| **Rationale** | Single stock SoT |
| **Consequences** | Manufacturing/Commerce consume via API |

#### ADR-017: Event Bus Outbox Separation

| Field | Content |
|-------|---------|
| **Context** | Event delivery guarantees unclear |
| **Decision** | In-process bus ≠ durable outbox |
| **Rationale** | Correct integration semantics |
| **Consequences** | External delivery only via outbox |

#### ADR-018: Enterprise Architecture Freeze v1.0

| Field | Content |
|-------|---------|
| **Context** | Scattered enterprise decisions |
| **Decision** | Unified enterprise freeze document |
| **Rationale** | Single enterprise reference |
| **Consequences** | This blueprint supersedes as constitutional doc |

### Domain ADRs (Codified in Foundation Contracts)

| Decision | Source Contract | Context | Rationale | Consequences |
|----------|-----------------|---------|-----------|--------------|
| Assignment owns org relationships | `HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT` | Dual org storage risk | Single write path | Profile is cache |
| Employment Profile is anchor only | `HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT` | Profile overloaded | Separation of concerns | Resolver required |
| Payroll Results own calculations | `HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT` | Payslip recalculation risk | Financial integrity | Payslip is presentation |
| Payslips own presentation only | Same | Same | Same | Publication gates visibility |
| Publication owns employee visibility | `HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES` | Draft exposure risk | ESS security | Portal read published only |
| Leave is first-class BC | `leave-absence-foundation` | Leave mixed with attendance | Clear boundaries | Typed payroll refs |
| Job (`hr_jobs`) is canonical | `HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT` | Legacy job titles | Taxonomy consistency | Freeze `hr_job_titles` |
| Manufacturing never updates inventory directly | Manufacturing Blueprint v2 | Stock integrity | Inventory SoT | Document-based movement |
| Commerce consumes Product Master | Product Master doc | Catalog duplication | Single product SoT | Read-only inventory |
| AI never bypasses Workflow | Automation engine contracts | Ungoverned AI risk | Enterprise controls | Governed action registry |
| Templates are reference bundles | `HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT` | Template data confusion | Reference vs operational | Copy on assignment |
| HR Actions are documents; Apply executes | `HR_ACTION_ENGINE_BOUNDARY_CONTRACT` | Direct mutation risk | Audit and approval | Two-phase apply |

---

## FINAL VALIDATION

### Consistency Review

| Check | Status | Notes |
|-------|--------|-------|
| No duplicate ownership | ✅ PASS | Each entity has one canonical owner in Section 7–8 |
| No circular dependencies | ✅ PASS | Dependency direction: writers inward, readers outward via contracts |
| No invalid module coupling | ✅ PASS | Forbidden matrix explicit; platform ↔ features boundary enforced |
| No conflicting SoT definitions | ✅ PASS | Section 8 reconciles all major concepts |
| No broken runtime boundaries | ✅ PASS | Runtime vs Foundation classified; deferred runtime documented |
| No architecture regressions | ✅ PASS | Consistent with ADR-011, ADR-018, HR/Payroll Freeze, Mfg Blueprint v2 |

### Non-Blocking Warnings

| # | Severity | Issue | Mitigation |
|---|----------|-------|------------|
| 1 | Warning | Platform runtime workers largely contract-first | Approved runtime sprints per Program 01 |
| 2 | Warning | Employment profile physically contains org fields (classified cache) | Assignment resolver + cache rebuild (Program 02) |
| 3 | Warning | Repository CI validates migrations statically only | Staging Postgres gate (Program 01) |
| 4 | Warning | ESS/MSS, Payroll UI, Localization runtime explicitly deferred | Program 02 scope |
| 5 | Warning | `hr_job_titles` legacy compatibility remains | Migration to `hr_jobs` (Program 02) |
| 6 | Warning | Permission naming alias pairs (underscore/dot) in HR payroll | Canonical dot notation for new permissions |

These warnings define the boundary between **frozen architecture** and **authorized implementation work**. They do **not** invalidate ownership rules or constitutional compliance.

### Constitutional Compliance Checklist

| Rule | Status |
|------|--------|
| Single canonical owner per entity | ✅ |
| Platform does not import features | ✅ |
| Assignment owns org relationships | ✅ |
| Employment profile is anchor/cache | ✅ |
| Payroll result owns numbers | ✅ |
| Payslip is presentation only | ✅ |
| Leave is first-class BC | ✅ |
| Workflow ≠ Approval | ✅ |
| Event bus ≠ Outbox | ✅ |
| Inventory owns stock | ✅ |
| Manufacturing never mutates inventory directly | ✅ |
| Product Master is canonical for products | ✅ |
| Commerce reads inventory via contracts | ✅ |
| Templates are reference bundles | ✅ |
| AI never bypasses business rules | ✅ |
| Effective dating rules documented | ✅ |
| Legacy strategy documented | ✅ |
| Extension rules documented | ✅ |
| Review gates defined | ✅ |
| No feature without foundation contract | ✅ |

---

# Nexora Enterprise Blueprint v1.0 — APPROVED

**This document is the permanent constitutional architecture reference for the Nexora Platform.**

Every future Business App, Engine, Runtime, UI, SDK, Integration, and AI Agent must follow this document.

Changes to constitutional rules require ADR approval and update to this blueprint.

---

## Related Documents

- [Vision](VISION.md) — Product vision and scale targets
- [Enterprise Architecture Freeze v1.0](../01-platform/ENTERPRISE_ARCHITECTURE_FREEZE_V1.md) — Detailed freeze companion
- [HR & Payroll Architecture Freeze v1.0](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md) — HR domain depth
- [Manufacturing Blueprint v2](../02-business-apps/MANUFACTURING_BLUEPRINT_V2.md) — Manufacturing domain depth
- [Architecture Decision Records](../05-decisions/README.md) — Individual ADR files
- [Implementation Status](IMPLEMENTATION_STATUS.md) — Current delivery state
- [Documentation Index](../README.md)
