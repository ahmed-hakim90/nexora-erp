# HR & Payroll Architecture Freeze v1.0

**Status:** Frozen  
**Version:** 1.0  
**Scope:** HR Core (Sprints 1–18) + Multi-Track Completion (Tracks A–D)  
**Effective:** 2026-07-01  

This document freezes the canonical HR & Payroll architecture for Nexora ERP. It is documentation-only. No runtime, UI, country packs, or statutory calculations are authorized by this freeze.

---

## 1. Purpose

- Lock ownership boundaries before Localization Packs, Finance posting runtime, Bank file generation, and Payroll UI.
- Resolve dual-status and dual-permission naming conflicts with explicit canonical rules.
- Define allowed and forbidden dependencies between bounded contexts.

---

## 2. Canonical Entities

| Entity | Canonical Owner | Role |
|--------|-----------------|------|
| `hr_employees` | HR Core | Identity anchor only (party link, employee number, status) |
| `hr_employment_profiles` | HR Core | Operational anchor/cache; not org-assignment source of truth |
| `hr_assignments` | Assignment Engine | Canonical org relationships (position, department, manager, cost center, payroll group) |
| `hr_contracts` | HR Core | Legal evidence only; no salary rules or operational policy storage |
| `hr_positions` | HR Core | Approved seat definition |
| `hr_jobs` | Job Architecture | Canonical job taxonomy |
| `hr_job_titles` | Legacy compatibility | Read-only compatibility; no new dependencies |
| `hr_payroll_periods` | Payroll Period | Period open/close lifecycle |
| `hr_payroll_batches` | Payroll Batch | Batch grouping (legacy grouping; run is execution unit) |
| `hr_payroll_runs` | Payroll Run | **Canonical payroll execution unit** |
| `hr_payroll_employee_snapshots` | Payroll Run | Immutable employee context at run time |
| `hr_payroll_results` | Payroll Result | **Owns calculated numbers** |
| `hr_payroll_result_components` | Payroll Result | Component-level breakdown and trace refs |
| `hr_payslips` | Payslip | Presentation artifact referencing approved result |
| `hr_payslip_lines` | Payslip | Presentation lines derived from result components |
| `hr_payslip_publications` | Payslip Publication | **Controls employee visibility** |
| `hr_leave_*` / `hr_absence_*` | Leave/Absence | First-class bounded context |
| `hr_payroll_relationships` | Payroll Relationship | Payment method, bank account, currency policy refs |
| `hr_payroll_localization_packs` | Localization Framework | Country pack registry (contracts only in v1.0) |
| `hr_payroll_posting_readiness` | Finance Readiness | Posting line readiness (no journal posting in v1.0) |

---

## 3. Ownership Matrix

| Concern | Owner | Consumers (read-only) |
|---------|-------|----------------------|
| Employee identity | HR Core | All HR apps, Payroll, Portal |
| Org assignments | Assignment Engine | Employment Profile (cache), Payroll snapshot, ESS/MSS |
| Compensation definitions | Compensation Engine | Payroll calculation (via snapshot) |
| Attendance facts | Attendance Engine | Payroll inputs (typed refs + snapshots) |
| Leave/Absence | Leave/Absence BC | Payroll inputs (typed refs) |
| Payroll calculation rules | Calculation Engine (country-neutral) | Localization Packs (plug-in) |
| Payroll numbers | Payroll Result | Payslip, Finance readiness, Cost facts |
| Payslip presentation | Payslip | Portal (after publication) |
| Employee visibility | Payslip Publication | ESS portal |
| Statutory rules | Localization Pack | Calculation Engine (never modifies core) |
| Finance posting | Finance Platform (future) | Reads posting readiness lines |
| Bank/WPS files | Integration layer (future) | Reads bank readiness contracts |

**Hard rules:**

1. Assignment Engine owns org relationships; Employment Profile stores cached projections only.
2. Payroll Result owns numbers; Payslip never recalculates.
3. Publication owns employee visibility; no draft/unapproved/unpublished exposure.
4. Leave/Absence is first-class; payroll consumes typed source references, not generic metadata blobs.

---

## 4. Allowed Dependencies

```
HR Core ──► Assignment Engine ──► Employment Profile (cache rebuild)
HR Core ──► Compensation / Attendance / Leave-Absence ──► Payroll Inputs
Payroll Run ──► Employee Snapshots ──► Calculation Engine ──► Payroll Result
Payroll Result ──► Payslip ──► Payslip Publication ──► Portal Security
Localization Pack ──► Calculation Engine (statutory rule injection only)
Payroll Result ──► Posting Readiness ──► Finance Foundation (future)
Payroll Result ──► Labor Cost Facts ──► Cost Engine (future)
Payroll Relationship ──► Bank Readiness Contracts (future file gen)
Platform: Audit, Events, RLS, Permissions, Import/Export, Notification (readiness)
```

**Read paths (canonical):**

| Need | Read Path |
|------|-----------|----------|
| Current department/position/manager | Assignment resolver → cached employment profile |
| Payroll employee context at run | `hr_payroll_employee_snapshots` for approved run |
| Calculated amounts | `hr_payroll_results` + `hr_payroll_result_components` |
| Payslip for employee | `hr_payslip_publications` where `publishing_status = published` |
| Leave impact on payroll | Typed `hr_payroll_typed_source_kind` refs from Leave/Absence |
| Statutory rule for country | Active localization pack → statutory rule registry |
| Posting lines | `hr_payroll_posting_readiness` (+ v2 finance extension tables) |

---

## 5. Forbidden Dependencies

| Forbidden | Reason |
|-----------|--------|
| Payslip → live employment profile | Must use snapshot/result chain |
| Calculation Engine → country tables directly | Statutory rules belong to Localization Packs |
| Localization Pack → modify Calculation Engine core | Plug-in only |
| Employment Profile → write org fields directly | Assignment Engine owns writes |
| New features → `hr_job_titles` | Legacy compatibility only |
| Portal → draft/unapproved payroll | Publication gate required |
| Payroll UI → bypass permission + RLS | Security engine is authoritative |
| Finance posting from payslip lines | Post from result/posting readiness |
| Leave/Absence → attendance punch mutation | Attendance owns punch facts |
| Bank file generation in foundation sprints | Contracts only until integration sprint |

---

## 6. Payroll Lifecycle Model

```
Period: open → input_collection → snapshot_ready → processing → review → approved → locked → posted → paid → closed
Run:    draft → validating → ready → calculating → calculated → review → approved → locked → closed
Result: pending → calculated → approved → locked
Payslip (processing): draft → calculated → under_review → approved → locked → posted → paid
Publication: draft → generated → pending_publish → published | unpublished → archived
```

**Execution unit:** `hr_payroll_runs` is canonical. Batches group work but do not replace run lifecycle.

**Closing:** Period closing is owned by payroll-period entity. Run locking precedes publication and finance readiness.

---

## 7. Assignment Ownership Rules

- All org fields on employment profile (`department_id`, `position_id`, `reporting_manager_employee_id`, `grade_id`, `cost_center_ref`, `payroll_group_ref`, policy refs) are **cached projections**.
- Writes flow: HR Action / Assignment Engine → `hr_assignments` → cache rebuild → employment profile.
- Payroll snapshots capture assignment-resolved state at run time; they do not query live assignments after approval.

---

## 8. Employment Profile Anchor Rules

| Classification | Fields | Behavior |
|----------------|--------|----------|
| `canonical-anchor` | `employee_id`, `employment_status`, `contract_id` | Owned by employment profile |
| `cached-projection` | org/policy refs | Rebuilt from assignments |
| `deprecated-source-field` | inline policy refs on profile | Migrate to assignment-based refs |
| `legacy-compatibility-field` | job title string refs | Map to `hr_jobs`; freeze new usage |

Employment Profile is **anchor/cache only**, not the org relationship source of truth.

---

## 9. Result vs Payslip Rules

| Aspect | Payroll Result | Payslip |
|--------|----------------|---------|
| Owns numbers | Yes | No (metadata mirrors only) |
| Owns component breakdown | Yes (`result_components`) | Presentation lines derived |
| Employee visibility | No | No (publication controls) |
| Recalculation | Via calculation engine | Never |
| Duplicate amounts in lines | N/A | Forbidden (`duplicateCalculationValuesInPayslipAllowed: false`) |

Chain: `payroll_run → employee_snapshot → payroll_result → result_components → payslip → payslip_lines → payslip_publication`

---

## 10. Leave/Absence Boundary

- Leave/Absence is a **first-class bounded context** (`leave-absence-foundation`).
- Attendance owns observed punch facts; absence events classify observations.
- Leave requests own approval workflow readiness; payroll consumes **typed** leave/absence payroll impact refs.
- Generic metadata-only source references in payroll inputs are **forbidden**.
- Leave calculation runtime and payroll statutory leave rules are **out of scope** for v1.0 freeze.

---

## 11. Payroll Relationship Boundary

- `hr_payroll_relationships` owns payment method, bank account refs, and currency policy associations per employee.
- Relationships are effective-dated and assignment-aware.
- Bank file generation and WPS export consume relationship + bank readiness **contracts** only in v1.0.

---

## 12. Legacy `hr_job_titles` Strategy

| Rule | Detail |
|------|--------|
| Canonical table | `hr_jobs` |
| Legacy table | `hr_job_titles` |
| New dependencies | **Forbidden** |
| Compatibility reads | Allowed during migration |
| Migration steps | Map legacy → job → backfill position → freeze deps → audit → archive/drop |

---

## 13. Payslip Status Strategy (Dual/Triple Status Resolution)

Three status enums exist for different lifecycle layers. **Do not merge them.**

| Enum | Layer | Purpose | Canonical For |
|------|-------|---------|---------------|
| `hr_payslip_status` | Foundation payslip (`hr_payslips`) | Processing lifecycle: draft → calculated → approved → locked → posted → paid | Admin/processing UI |
| `hr_payroll_runtime_payslip_status` | Runtime payslip entity | Run-scoped processing + publication readiness values | Runtime engine |
| `hr_payslip_publishing_status` | Publication (`hr_payslip_publications`) | Visibility lifecycle: draft → generated → pending_publish → published → unpublished → archived | **Employee visibility gate** |

**Rules:**

1. **Employee visibility** is determined exclusively by `hr_payslip_publishing_status = published` plus permission checks.
2. Foundation payslip status reflects payroll processing; it does not grant employee access.
3. Runtime payslip status extends processing with publication-prep values (`pending_publish`, `unpublished`, `archived`) but remains subordinate to publication status for visibility.
4. UI and APIs must not expose a single merged status; expose layer-appropriate status with explicit `visibilitySource: "publication"`.

---

## 14. Payroll Permission Naming Strategy

Historical duplication exists between underscore and dot notation for runtime vs foundation permissions.

| Canonical (prefer) | Legacy/duplicate | Resolution |
|--------------------|------------------|------------|
| `hr.payroll_exceptions.view` | — | Foundation exception admin view |
| `hr.payroll.exceptions.view` | Runtime alias | **Same capability**; runtime tests register both; new code uses underscore form for foundation, dot form only where runtime sprint established it |
| `hr.payroll_exceptions.manage` | — | Foundation exception manage |
| `hr.payroll_locks.manage` | `hr.payroll.locks.manage` | Runtime lock ops use dot form; foundation uses underscore |
| `hr.payroll_posting.manage` | — | Posting readiness manage |
| `hr.payroll.localization.*` | — | New localization permissions (dot notation) |
| `hr.payroll.finance.readiness.*` | — | Finance readiness (dot notation) |
| `hr.payroll.portal.security.*` | — | Portal security (dot notation) |
| `hr.payslips.view_self` | — | Employee ESS payslip read |
| `hr.payslips.download.authorize` | — | Download authorization (new) |
| `hr.payslips.access.revoke` | — | Access revocation (new) |

**Naming rules for new permissions:**

1. Use dot-separated resource paths: `hr.<domain>.<resource>.<action>`.
2. Do not introduce a third variant of existing keys.
3. Runtime sprint permissions already in registry remain for backward compatibility; document alias pairs in permission metadata.
4. RLS policies reference the permission key registered in the migration for that table.

---

## 15. Localization Framework Boundary (Track B)

- Localization Packs plug into Calculation Engine; they do not modify calculation core.
- Country profiles, legislative data groups, statutory rules, and component mappings are registry contracts.
- `countryNeutral: true` on calculation rule sets; `localizationPackImplemented: false` until a country pack sprint.
- No Saudi/Egypt/GOSI/tax/EOS/WPS implementations in v1.0.

---

## 16. Finance / Bank Readiness Boundary (Track C)

- Extends `hr_payroll_posting_readiness` (Sprint 14); does not duplicate posting table.
- Posting Readiness v2 adds finance dimensions, cost center allocation, labor cost facts, and cross-app cost refs.
- Bank transfer and WPS are **contracts only**; no file generation.
- Journal posting remains `financePostingRuntimeImplemented: false`.

---

## 17. Portal & Security Readiness Boundary (Track D)

- Builds on Sprint 18 payslip publishing foundation.
- Extends secure access token, download authorization, and revocation contracts.
- Defines ESS/MSS readiness surfaces without UI.
- Sensitive field classification registry for portal field masking.
- Notification readiness references platform notification contracts; no email/SMS/WhatsApp runtime.

---

## 18. Boundary Contract Flags (Runtime)

```typescript
implementsPayrollLocalizationFramework: true          // Track B — packs registry only
implementsPayrollFinanceBankReadinessFoundation: true // Track C — readiness only
implementsPayrollPortalSecurityReadinessFoundation: true // Track D — contracts only
implementsPayroll: false                              // End-to-end payroll runtime
implementsSelfServicePortal: false                    // ESS UI
implementsManagerPortal: false                       // MSS UI
countryLocalizationImplemented: false                 // No country packs
statutoryCalculationImplemented: false               // No statutory math
financePostingRuntimeImplemented: false              // No journal posting
bankPaymentRuntimeImplemented: false                 // No bank files
employeePortalUiImplemented: false                   // No portal UI
```

---

## 19. What v1.0 Explicitly Defers

- Saudi Payroll Pack, Egypt Payroll Pack
- GOSI, Egypt insurance, tax formulas, EOS calculations
- WPS/bank file generation
- Finance journal posting runtime
- Payroll operator UI, ESS UI, MSS UI
- Email/SMS/WhatsApp payslip delivery
- PDF payslip rendering runtime

---

## 20. Acceptance Criteria for Architecture Freeze

- [x] Canonical entities documented
- [x] Ownership matrix locked
- [x] Dependency rules explicit
- [x] Payslip triple-status strategy resolved
- [x] Permission naming strategy documented
- [x] Track B/C/D foundation boundaries defined
- [x] No breaking changes to Sprints 1–18 contracts

**Next authorized work after freeze:** Localization Pack implementation (country-specific), Payroll operator UI (readiness-gated), Finance posting integration sprint.
