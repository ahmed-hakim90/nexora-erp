# Nexora ERP — Enterprise Implementation Roadmap (Operational Sprints)

**Version:** 1.0 (Post Architecture Freeze)  
**Effective:** 2026-07-06  
**Program:** Program 02 — HCM (Human Capital Management)  
**Authority:** Operational execution layer under [NEXORA_ENTERPRISE_BLUEPRINT_V1.md](NEXORA_ENTERPRISE_BLUEPRINT_V1.md)

## Related Documents

- [Implementation Status](IMPLEMENTATION_STATUS.md)
- [HR Production Readiness Report](../09-history/HR_PRODUCTION_READINESS_REPORT.md)
- [HR & Payroll Architecture Freeze v1.0](../01-platform/HR_PAYROLL_ARCHITECTURE_FREEZE_V1.md)
- [Roadmap](ROADMAP.md)

---

## Current Status

| Area | Status |
| --- | --- |
| Platform Core | Architecture Frozen |
| HR / Payroll Foundation | Completed |
| HR UI Foundation | Completed |
| Payroll Foundation | Completed |
| Payroll Architecture | Frozen |
| Enterprise Blueprint | Approved |

---

## Goal

Reach the first **Production Ready** release that can run a real company, then proceed to Financials, SCM, and the rest of the platform.

**v1.0 scope decisions:**

- Payroll localization target: **Egypt** (OP-25)
- Talent modules OP-19→OP-23: **included** in Phase 1

---

## Phase 1 — HR & Payroll Operations

30 operational sprints (OP-01 → OP-30). Status legend: **Done** · **Partial** · **Foundation** · **Not Started**

### Wave A — Core HR Master Data

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-01** | Employee lifecycle: wizard, code, attendance code, status, timeline, archive/restore, directory, profile, bulk ops, reports | Partial | Import/export, bulk archive, photo, directory report |
| **OP-02** | Organization: companies/branches read, departments, sections, teams, locations, merge, hierarchy, reports | Partial | Merge ops, platform company/branch read, org reports |
| **OP-03** | Jobs & positions: families, functions, levels, jobs, grades, positions, capacity, vacancy, reports | Partial | Occupancy/vacancy UI, career paths |
| **OP-04** | Compensation: components, structures, packages, payroll groups, benefits, effective dating | Partial | Profile assignment UX, versioning |
| **OP-05** | Contracts: types, probation, renew/amend/suspend/resume/terminate, timeline, attachments | Partial | Print contract, attachment workflow |
| **OP-06** | Assignments: primary/temp/acting/delegation/shift/manager/payroll group/cost center, conflict detection, resolver | Partial | Resolver runtime + profile cache rebuild |

### Wave B — Time & Attendance

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-07** | Attendance runtime: devices, biometric, enterprise sync strategies, logs, mapping, manual/auto sync | **Completed (v2)** | Enterprise sync wizard, strategy engine, checkpoint, locked-period guard, punch→day aggregation |
| **OP-08** | Attendance processing: approval, adjustment, missing punch, summary, payroll-ready | **Completed** | Payroll lock/export runtime, snapshots, export history |
| **OP-09** | Leave: requests, approval, calendar, balance, policies, carry forward | **Completed** | Carry forward runtime, encashment, payroll input reader |
| **OP-10** | Overtime: requests, approval, policies, rates, shift rules | **Completed** | Overtime runtime, candidates from attendance, payroll input reader |
| **OP-11** | Late/early rules: grace, policies, limits, deduction rules | **Completed (hardened)** | Assignment resolver, shift schedule, validation engine, export lifecycle, deduction snapshots |

### Wave C — Employee Financial Services

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-12** | Loans | Done | Payroll deduction posting |
| **OP-13** | Advances | Done | Payroll recovery integration |
| **OP-14** | Penalties | Done | Appeal workflow |
| **OP-15** | Rewards & bonuses | Done | Payroll input wiring |
| **OP-16** | Documents: upload, expiry, renewal, OCR-ready | Partial | Inline profile tabs, OCR hook |
| **OP-17** | Custody: assign, transfer, return, damage, barcode | Done | Barcode scanning |
| **OP-18** | HR requests: certificates, letters, transfer, resignation | Done | Print letter output |

### Wave D — Talent Management

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-19** | Recruitment: vacancies, posts, applicants, interview, offer, hire | Foundation | Full hiring pipeline UI |
| **OP-20** | Onboarding/offboarding: checklists, tasks, exit clearance | Not Started | Checklist runtime |
| **OP-21** | Training: courses, plans, sessions, certificates | Not Started | Training admin + history |
| **OP-22** | Performance: goals, KPIs, reviews, 360, calibration | Not Started | Review cycle runtime |
| **OP-23** | Succession: talent pool, successors, readiness, risk matrix | Not Started | Succession planning UI |

### Wave E — Payroll & Self-Service

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-24** | Payroll operator: calendar, period, run, validation, lock, approve, close, publish | Partial | Full calculation runtime |
| **OP-25** | Egypt localization: tax, social insurance, EOS, statutory reporting | Not Started | Egypt country pack active |
| **OP-26** | ESS: profile, leave, attendance, documents, payroll, loans, requests | **Partial** | Leave submit + balances; portal RLS; withdraw/cancel UI deferred |
| **OP-27** | MSS: team, approvals, attendance, leave, performance dashboards | **Partial** | Team + leave approve/reject; OT/attendance approvals deferred |

### Wave F — Analytics & Production Gate

| Sprint | Scope | Status | Exit Criteria |
| --- | --- | --- | --- |
| **OP-28** | Dashboards: executive, HR, department, workforce, payroll KPIs | Partial | All dashboard tiers |
| **OP-29** | Reports & printing: PDF, Excel, templates, schedules, email | Foundation | Engine wiring complete |
| **OP-30** | Production hardening: performance, audit, security, a11y, jobs, final review | Partial | Pass 16 review gates |

---

## Phase 2 — Financials

General Ledger · Chart of Accounts · Cost Centers · Fiscal Years · Journals · Budgeting · AR · AP · Cash Management · Banking · Fixed Assets · Tax Engine · Financial Reporting · Financial Closing

## Phase 3 — SCM

Procurement · Suppliers · RFQ · Purchase Orders · Receiving · Inventory · Warehouses · Transfers · Lots & Serials · Manufacturing · MRP · Quality · Maintenance · Fleet

## Phase 4 — CX

CRM · Leads · Opportunities · Quotations · Sales Orders · Customer Service · Call Center · Help Desk · Loyalty · Marketing Automation

## Phase 5 — Commerce

POS · Restaurant · QR Menu · B2B Portal · Marketplace · Online Store · Payment Gateway · Delivery · Customer Portal

## Phase 6 — Intelligence

Dashboard Builder · BI · AI Copilot · Workflow Automation · Predictive Analytics · AI Insights · AI Forecasting · Document Intelligence · OCR · AI Agents

---

## Final Production Gate

Before declaring **Nexora ERP v1.0 Production Ready**, all reviews must pass:

- Architecture Review
- Security Review
- Performance Review
- UX Review
- Accessibility Review
- Multi-company Review
- RLS Review
- Background Jobs Review
- Notification Review
- Audit Review
- Reporting Review
- Localization Review
- Integration Review
- Mobile Review
- CI/CD Review
- Test Coverage Review

---

## Critical Path

```
OP-01→OP-06 (core HR) → OP-07→OP-11 (time) → OP-24→OP-25 (payroll Egypt) → OP-26→OP-27 (ESS/MSS) → OP-28→OP-30 (gate)
```

Parallel platform work: Print Engine · Notification Service · Import/Export Engine · Background Jobs

---

## Sprint History

Completed sprint logs live in [docs/09-history/](../09-history/README.md) as `SPRINT_OP_XX_*.md` files.
