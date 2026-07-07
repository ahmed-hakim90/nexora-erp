# Enterprise Architecture Freeze v1.0

**Status:** Frozen  
**Version:** 1.0  
**Effective:** 2026-07-01  
**Authority:** Constitutional baseline for all Nexora Platform business applications  
**Supersedes:** Informal sprint-by-sprint architecture notes as the primary reference  
**Companion freezes:** [ADR-011 Platform Freeze v1.0](../05-decisions/ADR-011-Platform-Freeze-V1.md), [HR & Payroll Architecture Freeze v1.0](HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)  
**Constitutional document:** [Nexora Enterprise Blueprint v1.0](../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) — the approved single source of truth that consolidates this freeze and all domain freezes.

No module may violate this document. Future modules must comply. Extensions require ADR approval.

---

## SECTION 1 — Platform Vision

Nexora is an **Enterprise Business Platform**, not an ERP product.

ERP is one business application hosted on the platform. HR Portal, Manufacturing, Inventory, Finance, Commerce, Service, Fleet, and future apps are peers — not subsystems of ERP.

### Architecture Philosophy

| Principle | Meaning |
|-----------|---------|
| **Platform First** | Shared runtime, security, data, UX, and engines belong to the platform layer. |
| **Engine First** | Cross-cutting capabilities are platform engines with public contracts — never reimplemented in apps. |
| **App First** | Every business capability is packaged as an installable app with manifests, permissions, routes, and integration contracts. |
| **Contract First** | Foundations ship as typed contracts, events, audit actions, permissions, and migrations before runtime. |
| **Runtime First** | When runtime is authorized, it must consume frozen contracts — not invent parallel models. |
| **Event Driven** | State changes publish domain events; durable external delivery uses the integration outbox. |
| **Effective Dated** | Operational truth for people, org, compensation, and assignments is time-bounded. |
| **Audit First** | Sensitive mutations require audit trails; immutable ledgers and history tables are protected. |
| **Multi Tenant** | `tenant_id` scopes all tenant-owned data; cross-tenant access is forbidden. |
| **Multi Company** | `company_id` scopes business operations within a tenant. |
| **Multi Country** | Localization packs plug into engines; core engines remain country-neutral. |

### Product Doctrine

Users navigate by **intent** (search, commands, dashboards, workflows), not by database structure. Business apps own domain vocabulary and canonical tables. The platform owns process infrastructure.

---

## SECTION 2 — Platform Layers

```text
┌─────────────────────────────────────────────────────────────┐
│ Experience Layer                                            │
│ ERP Workspace · HR Portal · Admin · Marketplace · POS · API │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ Business Applications (App First)                           │
│ Finance · Inventory · Manufacturing · HR · Purchasing · …   │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ Business Foundations & Engines                              │
│ HR Core · Assignment · Payroll · Policy · Compensation · …  │
│ Inventory Foundation · Manufacturing Foundation · …         │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ Platform Services                                           │
│ Party · Document · Numbering · Files · Localization · Cost  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ Platform Runtime Engines                                    │
│ Workflow · Approval · Event Bus · Audit · Search · Jobs · … │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ Platform Kernel                                             │
│ Identity · Tenancy · RBAC · RLS · Context · Security        │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ External APIs & Integrations                                │
│ Webhooks · Connectors · Bank files · WPS · Finance posting  │
└─────────────────────────────────────────────────────────────┘
```

### Layer Ownership

| Layer | Owner | May Import |
|-------|-------|------------|
| Platform Kernel | Platform team | Core utilities only |
| Platform Runtime Engines | Platform team | Other platform `public-api` |
| Platform Services | Platform team | Platform engines |
| Business Foundations | Feature module | Platform `public-api`, own foundations |
| Business Applications | Feature module | Platform + declared feature `public-api` |
| Experience Layer | App routes + shared UI | Feature `public-api`, platform client APIs |

**Hard rule:** `src/platform/**` must **never** import `src/features/**`.

---

## SECTION 3 — Canonical Entity Ownership

### Ownership Matrix (Summary)

| Entity | Owner | Read Models | Runtime Consumers | Write Path | Projection Rules |
|--------|-------|-------------|---------------------|------------|------------------|
| **Company** | Tenancy / Platform | All apps | All scoped operations | Platform admin | Immutable identity |
| **Branch** | Tenancy / Platform | All apps | Branch-scoped ops | Platform admin | Company child |
| **Organization** | HR Core (`hr_org_units`) | HR, Payroll, Reports | Assignment resolver | HR Core master data | Effective-dated tree |
| **Department** | HR Core | Assignment, Payroll, Reports | Resolver → profile cache | Assignment Engine | Cached on employment profile |
| **Position** | HR Core | Assignment, Workforce | Resolver → profile cache | Assignment Engine | Approved seat definition |
| **Job** | Job Architecture (`hr_jobs`) | HR, Position | Compatibility reads | HR Core | Canonical taxonomy |
| **Employee** | HR Core (`hr_employees`) | All HR, Payroll, Portal | Identity anchor only | HR Core | No operational refs |
| **Employment** | HR Core (`hr_employment_profiles`) | All HR engines | Anchor + cache | Profile anchor writes; org via Assignment | Cached projections from assignments |
| **Assignment** | Assignment Engine (`hr_assignments`) | Profile cache, Payroll snapshot | All org consumers | HR Action → Assignment | Immutable history; supersede only |
| **Leave** | Leave/Absence BC | Payroll inputs, Attendance | Typed payroll refs | Leave BC | First-class bounded context |
| **Attendance** | Attendance Engine | Payroll inputs | Punch facts, exceptions | Attendance Engine | Facts only; no leave mutation |
| **Compensation** | Compensation Engine | Payroll snapshot | Package/structure refs | Compensation Engine | Effective-dated versions |
| **Payroll** | Payroll Run/Result | Finance readiness, Cost | Calculation engine | Payroll Run lifecycle | Run is execution unit |
| **Payslip** | Payslip | Portal (via publication) | Presentation only | Derived from result | Never recalculates |
| **Workforce** | Workforce Engine | Attendance, Manufacturing | Shift/calendar refs | Workforce Engine | Schedule definitions |
| **Documents** | Document Engine + app types | Workflow, Approval | Universal lifecycle | Document Engine | Platform-owned lifecycle |
| **Assets** | Future Fleet/Asset module | Service, Maintenance | TBD | Asset module | Not yet implemented |

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

## SECTION 4 — Bounded Contexts

| Context | Purpose | Owner | Dependencies | Consumers | Forbidden Dependencies |
|---------|---------|-------|--------------|-----------|------------------------|
| **Platform Kernel** | Identity, tenancy, RBAC, RLS | Platform | Core | All | Business features |
| **Workflow** | Process state machines | Platform | Events, Security | All apps | Business domain tables |
| **Approval** | Approval decisions | Platform | Workflow, Security | All apps | Business calculation |
| **Document Engine** | Universal document lifecycle | Platform | Workflow, Audit | Purchasing, Inventory, HR Actions | App-specific posting |
| **Party** | Business partner registry | Platform | Tenancy | CRM, Finance, HR | App-owned duplicates |
| **Finance** | GL, posting readiness | Finance app | Platform, Party | Inventory, Manufacturing, Payroll | Inventory stock mutation |
| **Inventory** | Stock, warehouses, movements | Inventory app | Platform, Finance (ref) | Manufacturing, Purchasing | Direct finance ledger writes |
| **Manufacturing** | BOM, routing, DPR | Manufacturing app | Inventory, Finance (ref) | Cost engine | HR payroll tables |
| **HR Core** | Employee, profile anchor, contracts | HR app | Platform, Party | All HR engines | Direct org writes on profile |
| **Assignment Engine** | Org relationships | HR app | HR Core, HR Actions | Payroll, Attendance, Reports | Direct profile mutation |
| **Policy Engine** | Policy definitions/versions | HR app | HR Core | Compensation, Attendance, Actions | Duplicated policy storage in employees |
| **Compensation** | Salary packages, structures | HR app | Policy, HR Core | Payroll snapshot | Live payroll numbers |
| **Attendance** | Punch facts, devices | HR app | Workforce, Policy | Payroll inputs | Leave request mutation |
| **Leave/Absence** | Leave requests, balances readiness | HR app | Policy, Workflow binding | Payroll typed inputs | Attendance punch mutation |
| **Payroll** | Runs, results, payslips | HR app | Assignment, Compensation, Attendance, Leave | Finance readiness, Portal | Payslip recalculation |
| **HR Actions** | Business intent documents | HR app | Workflow/Approval binding | Apply Engine | Direct operational mutation |
| **Apply Engine** | Effect application readiness | HR app | HR Actions, Assignment | Timeline, Audit | Direct mutation (until runtime approved) |
| **Templates** | Reference bundles | HR app | All HR foundations | Assignment, Actions | Copied operational data |
| **Administration** | Platform RBAC hub | Platform app | Platform permissions | All apps | Business domain logic |

---

## SECTION 5 — Dependency Rules

### Allowed Dependencies

| From | To | Relationship |
|------|-----|--------------|
| Business App | Platform `public-api` | Required |
| Business App | Another app's `public-api` | Declared in manifest only |
| Assignment Engine | Payroll Snapshot | Write readiness refs |
| Payroll | Assignment | Read-only at snapshot time |
| Payroll | Leave/Absence | Typed source refs |
| HR Action | Workflow/Approval Platform | Binding refs only |
| Inventory | Finance | Posting readiness contracts |
| Manufacturing | Inventory + Finance | Reference + posting readiness |
| Feature module | Platform server APIs | Via actions/loaders only |

### Forbidden Dependencies

| Pattern | Required Alternative |
|---------|---------------------|
| `Employee → Department` (direct) | `Employee → Assignment → Department` |
| `Payroll → live Employment Profile` | `Payroll → Employee Snapshot` |
| `Payslip → recalculate` | `Payslip → Payroll Result` |
| `Platform → features/**` | Never |
| `Employment Profile → write org fields` | Assignment Engine write path |
| `Leave → mutate attendance punches` | Attendance owns facts |
| `Localization Pack → modify calculation core` | Plug-in statutory rules only |
| `Portal → draft payroll` | Publication gate |
| `New code → hr_job_titles` | `hr_jobs` canonical |

### Dependency Direction Rule

**Writers point inward to canonical owners. Readers point outward through contracts.**

---

## SECTION 6 — Runtime vs Foundation

| Module / Artifact | Classification | Notes |
|-------------------|----------------|-------|
| Platform engine `public-api.ts` | **Foundation** | Contracts, validation, registries |
| Platform engine `server.ts` | **Runtime** (partial) | Permission enforcement; workers future |
| HR `*-foundation.ts` | **Foundation** | 23 foundation contracts |
| `hr_assignments` | **Foundation** (persistence) | Runtime resolver not implemented |
| `hr_payroll_results` | **Foundation + immutable** | Numbers owned here when calculated |
| `hr_payroll_employee_snapshots` | **Snapshot** | Immutable at run approval |
| `hr_employment_profiles` org fields | **Projection / cache** | Rebuilt from assignments |
| Employment profile anchor fields | **Canonical** | employee_id, status, contract_id |
| Event definitions | **Foundation** | Handlers optional per sprint |
| Background job readiness | **Foundation** | Workers not runtime |
| Search providers | **Read Model registration** | Indexing runtime future |
| Payslip lines | **Presentation projection** | Derived from result components |
| Finance posting | **Readiness only** | Journal posting future |
| Audit / timeline tables | **Immutable** | Append-only triggers |

---

## SECTION 7 — Lifecycle Ownership

| Lifecycle | Owner | States Owned By | Terminal States |
|-----------|-------|-----------------|-----------------|
| **Employee** | HR Core | active, inactive, terminated | archived |
| **Employment** | HR Core | active profile ranges | superseded profiles |
| **Assignment** | Assignment Engine | planned, active, expired, cancelled, superseded | superseded (immutable history) |
| **Leave** | Leave/Absence BC | draft → approved → consumed | cancelled, archived |
| **Payroll Period** | Payroll Period | open → closed | locked, posted |
| **Payroll Run** | Payroll Run | draft → calculating → approved → locked | closed |
| **Payroll Result** | Payroll Result | pending → calculated → approved → locked | locked |
| **Payslip** | Payslip | presentation states | posted, paid |
| **Payslip Publication** | Publication | draft → published | archived |
| **Workforce Schedule** | Workforce Engine | effective-dated schedules | superseded |

**Execution unit:** `hr_payroll_runs` is canonical. `hr_payroll_batches` groups work but does not own execution lifecycle.

---

## SECTION 8 — Effective Dating

### Enterprise Classification

Every entity must be classified at design time:

| Class | Examples | Rules |
|-------|----------|-------|
| **Effective Dated** | assignments, employment profiles, compensation versions, policies | `effective_from` / `effective_to`; non-overlapping where required |
| **Versioned** | template versions, policy versions, salary package versions | Historical version pinned on assignment |
| **Immutable** | assignment history, payroll snapshots, results (post-lock), audit | Append-only; supersede creates new row |
| **Transactional** | attendance punches, inventory movements | Point-in-time facts |
| **Snapshot** | payroll employee snapshots | Frozen at run approval |
| **Projection** | employment profile org fields | Rebuilt from canonical source |

### Resolution Grains

| Consumer | Grain | Rule |
|----------|-------|------|
| Payroll period processing | **Date** | Resolve assignment active on period end date |
| Attendance day | **Date** | Resolve assignment for calendar day |
| Workflow / Approval | **Timestamp** | Binding valid at decision time |
| Reports (historical) | **Date range** | Point-in-time or range resolver |

---

## SECTION 9 — Event Architecture

### Publishers

| Publisher | Event Domain | Ownership |
|-----------|--------------|-----------|
| Platform engines | Workflow, Approval, Document | Platform |
| HR foundations | HR Action, Apply, Assignment, Template | HR app |
| Business apps | Domain events per app manifest | Owning app |

### Consumers

Consumers register via platform event definitions. Runtime handlers require explicit sprint approval.

### Rules

| Rule | Detail |
|------|--------|
| **Naming** | PascalCase domain names: `AssignmentCreated`, `PayrollRunApproved` |
| **Versioning** | `version: 1` on `definePlatformEventDefinition`; breaking changes increment version |
| **Ownership** | Publishing app owns event schema |
| **In-process bus** | `Platform Event Bus` — not guaranteed delivery |
| **Durable delivery** | Integration outbox only — ADR-017 |
| **Audit linkage** | Sensitive events require audit action registration |

---

## SECTION 10 — Security Model

### Layers (ADR-007)

1. Authentication  
2. App authorization (`requirePermission`)  
3. Domain rules (manifest + contracts)  
4. Row Level Security (Postgres)  
5. Audit  

### Scope Model

| Scope | Applies To | Enforcement |
|-------|------------|-------------|
| **Tenant** | All tenant tables | `tenant_id` + `is_tenant_member` |
| **Company** | Business operations | `has_company_access` |
| **Branch** | Branch-scoped data | `has_branch_access` |
| **Manager** | Team visibility | Assignment resolver + manager scope (readiness) |
| **Employee (self)** | ESS portal | Self-record scope (readiness) |
| **HR Admin** | Employee master | `hr.*.manage` permissions |
| **Payroll Admin** | Runs, results, publication | `hr.payroll.*` permissions |
| **Platform Admin** | Tenancy, RBAC | `platform.*` permissions |
| **Approval SoD** | Segregation of duties | Approval engine + permission pairs |

### Sensitive Fields

PII, compensation, payroll results, and bank details require explicit `sensitiveData` metadata in contracts. Export, print, and report operations require permission + audit metadata.

### RLS Baseline

- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on tenant tables  
- Soft delete: `deleted_at is null` in policies  
- Permission-aware policies: `has_permission('module.resource.action', tenant_id)`  
- App access: `has_app_access(tenant_id, 'app_key')`  

---

## SECTION 11 — Integration Model

| Integration | Status v1.0 | Contract Surface |
|-------------|-------------|------------------|
| **Finance** | Posting readiness | `createFinancePostingReadinessContract` |
| **Inventory** | Operational + posting readiness | Inventory `public-api` |
| **Manufacturing** | DPR + cost readiness | Manufacturing foundations |
| **Projects** | Not implemented | Extension slot in cost facts |
| **CRM** | Planned | Party foundation |
| **Service** | Planned | — |
| **Marketplace** | Planned | Platform marketplace engine |
| **POS** | Planned | Commerce layer |
| **Identity** | Platform auth | Supabase auth + RBAC |
| **Notification** | Readiness | `notification-delivery` job contract |
| **Workflow** | Platform engine | HR binding refs |
| **Audit** | Platform engine | `defineAuditAction` per domain |
| **Search** | Provider registration | `defineSearchProvider` |
| **Print** | Template readiness | `definePrintTemplate` |
| **Reporting** | Dataset readiness | `defineReport` / `defineReportDataset` |
| **AI** | Governance foundation | Automation engine contracts |
| **Automation** | Readiness | Job + approval gates |

**Rule:** Integrations consume **contracts and read models** — never bypass canonical owners.

---

## SECTION 12 — Naming Standards

| Artifact | Convention | Example |
|----------|------------|---------|
| **Tables** | `snake_case`, prefixed by app | `hr_assignments`, `inventory_movements` |
| **Enums** | `snake_case` type name | `hr_assignment_status` |
| **Permissions** | `app.domain.resource.action` | `hr.assignments.view` |
| **Events** | PascalCase | `AssignmentCreated` |
| **Contracts** | `SCREAMING_SNAKE` export | `HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT` |
| **Contract keys** | `dot.separated.lowercase` | `hr.assignments.foundation.boundary` |
| **Runtime helpers** | `camelCase` verb-first | `resolveHrAssignment` (future) |
| **Services** | `feature-domain.service.ts` | `inventory-transaction.service.ts` |
| **API routes** | `/api/<domain>/<action>` | `/api/workspace/preferences` |
| **DB functions** | `snake_case` | `has_permission`, `touch_platform_row` |
| **Indexes** | `<table>_<columns>_idx` | `hr_assignments_employee_type_idx` |
| **RLS policies** | `<table>_<operation>` | `hr_assignments_select` |

---

## SECTION 13 — Legacy Strategy

| Legacy | Canonical Replacement | Strategy |
|--------|----------------------|----------|
| `financial_*` utilities | `finance_*` app tables | Compatibility reads; no new deps |
| `products`, `warehouses` (master) | `inventory_*` | Inventory owns canonical tables |
| `hr_job_titles` | `hr_jobs` | Read-only compatibility; freeze new deps |
| Employment profile org writes | Assignment Engine | Cache rebuild migration |
| `hr_payroll_batches` as execution unit | `hr_payroll_runs` | Batch groups; run executes |
| Inline policy refs on profile | Assignment-based policy refs | Deprecated-source-field classification |
| Generic payroll input metadata | Typed `HrPayrollTypedSourceKind` refs | Forbidden for new code |

**Rule:** Never remove legacy without migration plan, data audit, and ADR.

---

## SECTION 14 — Extension Rules

New modules (Recruitment, Performance, Learning, Talent, Saudi Payroll, Egypt Payroll, Fleet, Quality, Maintenance) must:

1. Register as an app with `defineAppManifest` + `defineModuleManifest`  
2. Own `app_prefix_*` tables with full RLS  
3. Consume platform engines via `public-api` only  
4. Declare dependencies explicitly in manifest  
5. Ship foundation contracts before runtime  
6. Extend — never modify existing foundations unless ADR-approved  

### Localization Extension Pattern

Country packs plug into Calculation Engine statutory rule registry. They **must not** modify calculation core or HR core tables.

### Portal Extension Pattern

ESS/MSS consumes published payslips and approved leave — never draft payroll or live profile org fields.

---

## SECTION 15 — Architecture Decision Records

### ADR Index (Official)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Documentation Source Of Truth | Accepted |
| ADR-002 | Enterprise Business Platform | Accepted |
| ADR-003 | Modular Monolith First | Accepted |
| ADR-004 | App First Architecture | Accepted |
| ADR-005 | Engine First Architecture | Accepted |
| ADR-006 | Explicit Request Context | Accepted |
| ADR-007 | Security Multiple Layers | Accepted |
| ADR-008 | UX Foundation Before App UI | Accepted |
| ADR-009 | Heavy Workloads Platform Workloads | Accepted |
| ADR-010 | Documentation Before Architecture Change | Accepted |
| ADR-011 | Platform Freeze v1.0 | Accepted (with warnings) |
| ADR-012 | App Foundation Decisions | Accepted |
| ADR-013 | Workflow Approval Separation | Accepted |
| ADR-014 | Immutable Ledger | Accepted |
| ADR-015 | Document Engine | Accepted |
| ADR-016 | Inventory Ownership | Accepted |
| ADR-017 | Event Bus Outbox Separation | Accepted |
| **ADR-018** | **Enterprise Architecture Freeze v1.0** | **Accepted** |

### Domain ADRs (codified in foundations)

| Decision | Source Contract |
|----------|----------------|
| Assignment owns organizational relationships | `HR_ASSIGNMENT_ENGINE_BOUNDARY_CONTRACT` |
| Employment Profile is anchor + cache, not org SoT | `HR_ARCHITECTURE_REFACTOR_GATE_CONTRACT` |
| Payroll Results own calculations | `HR_PAYROLL_RESULT_PAYSLIP_RELATIONSHIP_CONTRACT` |
| Payslips own presentation only | Same |
| Publication owns employee visibility | `HR_PAYROLL_LIFECYCLE_OWNERSHIP_RULES` |
| Leave is a bounded context | `leave-absence-foundation` |
| Job (`hr_jobs`) is canonical | `HR_JOB_TITLE_LEGACY_STRATEGY_CONTRACT` |
| Platform services are provider agnostic | ADR-011 Public API Rules |
| Workflow owns process; Approval owns decisions | ADR-013 |
| Templates are reference bundles | `HR_TEMPLATE_LIFECYCLE_BOUNDARY_CONTRACT` |
| HR Actions are documents; Apply Engine executes | `HR_ACTION_ENGINE_BOUNDARY_CONTRACT` |

---

## SECTION 16 — Platform Readiness

| Capability | Foundation | Runtime | UI | Blocker |
|------------|------------|---------|-----|---------|
| Recruitment | — | — | — | Not started |
| Performance | — | — | — | Not started |
| Learning | — | — | — | Not started |
| Talent | — | — | — | Not started |
| Payroll Localization | Contracts | — | — | Country packs |
| Payroll UI | — | — | — | After runtime |
| ESS | Security readiness | — | — | Publication runtime |
| MSS | Security readiness | — | — | Manager scope runtime |
| Finance posting | Readiness | — | Partial | Posting runtime |
| Manufacturing | Foundation + DPR | Partial | Partial | — |
| Marketplace | Platform contracts | — | — | — |
| POS | — | — | — | Commerce phase |
| Service | — | — | — | Phase 6 |
| Fleet | Doc only | — | — | Phase 6 |
| Quality | — | — | — | Not started |
| Projects | Cost consumer slot | — | — | Not started |
| CRM | Party foundation | — | — | Phase 5 |
| HR Assignment Runtime | Foundation ✅ | — | — | Resolver approval |
| HR Apply Runtime | Foundation ✅ | — | — | Explicit approval |
| Workflow/Approval Runtime | Platform contracts | Partial server | — | Engine workers |

---

## SECTION 17 — Technical Debt

### Critical

| Item | Mitigation |
|------|------------|
| Dual org SoT risk (profile fields vs assignments) | Assignment resolver + cache rebuild; deprecate direct profile org writes |
| Platform engines contract-only | Approved runtime sprints per engine |
| No live Supabase in CI | Add staging migration gate when infra available |

### High

| Item | Mitigation |
|------|------------|
| `hr_job_titles` legacy deps | Migration to `hr_jobs`; freeze new references |
| Payroll batch vs run confusion | Document + enforce run as execution unit |
| Employment profile deprecated policy refs | Migrate to assignment-based policy assignments |
| Static migration validation only | Supplement with integration tests on staging |

### Medium

| Item | Mitigation |
|------|------------|
| Feature cross-imports via public-api | Manifest dependency audit |
| Large uncommitted sprint history | Split approved commits per freeze |
| ESS/MSS security contracts without UI | Portal sprint after publication runtime |

### Low

| Item | Mitigation |
|------|------------|
| Redirect stub docs at legacy paths | Gradual bookmark migration |
| Permission alias pairs (HR) | Canonical naming in new permissions only |

---

## SECTION 18 — Roadmap

### Frozen Architecture (v1.0)

- Platform Freeze v1.0 (ADR-011)  
- Enterprise Architecture Freeze v1.0 (this document)  
- HR & Payroll Architecture Freeze v1.0  
- Assignment ownership gate  
- 23 HR foundation contracts  

### Next Business Apps (Recommended Order)

1. **Assignment Resolver Runtime** — cache rebuild, read path enforcement (HR)  
2. **HR Action Apply Runtime** — after explicit approval  
3. **Payroll Calculation Runtime** — country-neutral engine + first localization pack  
4. **Finance Posting Runtime** — from posting readiness lines  
5. **Inventory operations completion** — reservations, full movement runtime  
6. **Manufacturing execution** — shop floor integration  
7. **Purchasing / Sales documents** — business document framework expansion  
8. **ESS/MSS Portal** — after publication + manager scope runtime  
9. **Recruitment / Performance** — extend HR via new apps  

### Implementation Gate

No new feature implementation until this freeze is acknowledged. Subsequent work requires:

- ADR for architecture changes  
- Contract foundation before runtime  
- Tests + `npm run validate:migrations` + typecheck + lint + test  

---

# APPENDIX A — Matrices

## A1. Ownership Matrix

See Section 3 and [HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md](HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md) §3.

## A2. Dependency Matrix

| Consumer | Producer | Direction | Allowed |
|----------|----------|-----------|---------|
| Payroll | Assignment | Read at snapshot | ✅ |
| Assignment | Employment Profile | Cache write (rebuild) | ✅ |
| Employment Profile | Assignment | Direct org read | ✅ (cache) |
| Employment Profile | — | Direct org write | ❌ |
| Payslip | Payroll Result | Read | ✅ |
| Payroll Result | Payslip | Read | ❌ |
| Leave | Attendance | Punch mutation | ❌ |
| Attendance | Leave | Typed ref | ✅ |
| Platform | Features | Any import | ❌ |
| Features | Platform public-api | Contract import | ✅ |
| Finance | Inventory | Stock mutation | ❌ |
| Inventory | Finance | Posting readiness | ✅ |

## A3. Runtime Matrix

| Component | Foundation | Runtime | Notes |
|-----------|------------|---------|-------|
| Workflow engine | ✅ | Partial | Server validation exists |
| Approval engine | ✅ | Partial | Server validation exists |
| Assignment resolver | ✅ | ❌ | Sprint 11.1 gate passed |
| Apply engine | ✅ | ❌ | Awaiting approval |
| Payroll calculation | ✅ | ❌ | Country-neutral contracts |
| Background jobs | ✅ | ❌ | Readiness only |
| Search indexing | ✅ | ❌ | Provider registered |
| ESS/MSS | Readiness | ❌ | No UI |

## A4. Effective Dating Matrix

| Entity | Effective Dated | Versioned | Immutable | Snapshot |
|--------|-----------------|-----------|-----------|----------|
| hr_assignments | ✅ | — | History ✅ | — |
| hr_employment_profiles | ✅ | — | History ✅ | — |
| hr_compensation_* versions | ✅ | ✅ | — | — |
| hr_policy_versions | ✅ | ✅ | — | — |
| hr_payroll_employee_snapshots | — | — | ✅ | ✅ |
| hr_payroll_results | — | — | Post-lock ✅ | — |
| hr_template_versions | ✅ | ✅ | — | — |
| Attendance punches | — | — | ✅ | — |

## A5. Event Matrix

| Domain | Example Events | Publisher | Runtime Handler |
|--------|----------------|-----------|-----------------|
| Assignment | AssignmentCreated, AssignmentSuperseded | HR | ❌ |
| HR Action | HRActionDocumentApproved | HR | ❌ |
| Apply | HRActionApplyCompleted | HR | ❌ |
| Workflow | WorkflowTransitionCompleted | Platform | Partial |
| Approval | ApprovalGranted | Platform | Partial |
| Payroll | PayrollRunApproved | HR | ❌ |
| Template | TemplateAssigned | HR | ❌ |

## A6. Security Matrix

| Domain | View Permission | Manage Permission | RLS Scope |
|--------|-----------------|-------------------|-----------|
| HR Core | `hr.view` | `hr.manage` | tenant+company+branch |
| Assignments | `hr.assignments.view` | `hr.assignments.manage` | tenant+company+branch |
| Payroll | `hr.payroll.view` | `hr.payroll.manage` | tenant+company+branch |
| Templates | `hr.templates.view` | `hr.templates.manage` | tenant+company+branch |
| Inventory | `inventory.*.view` | `inventory.*.manage` | tenant+company+branch |
| Platform admin | `platform.*` | `platform.*` | tenant |

## A7. Integration Matrix

| Source | Target | Integration Type | Status |
|--------|--------|------------------|--------|
| Payroll Result | Finance | Posting readiness lines | Contract |
| Payroll Result | Cost Engine | Labor cost facts | Contract |
| Inventory movement | Finance | Posting readiness | Contract |
| Manufacturing DPR | Inventory | Stock consumption | Partial |
| HR Action | Platform Workflow | Binding ref | Foundation |
| HR Action | Platform Approval | Binding ref | Foundation |
| All apps | Audit | Audit actions | Foundation |
| All apps | Search | Search providers | Foundation |

## A8. ADR Index

See Section 15.

## A9. Technical Debt Register

See Section 17.

## A10. Platform Readiness Matrix

See Section 16.

---

## Freeze Warnings (Non-Blocking)

1. Platform runtime workers are largely **contract-first**; execution requires approved sprints.  
2. Repository CI validates migrations **statically**; live Postgres gate is not in CI.  
3. Employment profile still **physically contains** org fields — classified as cache until rebuild runtime ships.  
4. ESS/MSS, Payroll UI, and Localization **runtime** are explicitly deferred.  

These warnings do not invalidate ownership rules. They define the boundary between **frozen architecture** and **authorized implementation work**.

---

## Constitutional Compliance Checklist

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
| Templates are reference bundles | ✅ |
| No feature without foundation contract | ✅ |
| Effective dating rules documented | ✅ |
| Legacy strategy documented | ✅ |
| Extension rules documented | ✅ |

---

**Enterprise Architecture Freeze v1.0 Approved**
