# Design Review Process

> **Purpose:** Operational workflow from design intent to merge approval.  
> **Authority:** [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md) · [Nexora Enterprise Blueprint §14](../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md)

Every new screen, major UX change, or new shared component passes this process.

---

## Review Pipeline

```text
Design Review
      ↓
UX Review
      ↓
Accessibility Review
      ↓
Platform Compliance
      ↓
Architecture Review
      ↓
Approval
      ↓
Merge
```

Parallel reviews are allowed only when dependencies are clear (e.g. Architecture may start with UX Review for greenfield apps).

---

## Stage 1 — Design Review

**Goal:** Confirm the screen solves the right operator task before implementation detail.

| Acceptance criteria | Required |
| --- | --- |
| Task-oriented (not CRUD-oriented) | ✅ |
| Correct page archetype (list, profile, dashboard, report, wizard, approval) | ✅ |
| Primary action identified | ✅ |
| Mobile / operator context considered | ✅ |
| No duplicate platform shell design | ✅ |

**Inputs:** Wireframe, flow description, or annotated screenshot.  
**Outputs:** Approved page type + navigation placement.

**Reject if:** Screen duplicates an existing platform surface or invents a new shell pattern.

---

## Stage 2 — UX Review

**Goal:** Constitutional compliance with [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md).

| Acceptance criteria | Required |
| --- | --- |
| [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md) checklist complete | ✅ |
| List-first / modal pattern where applicable | ✅ |
| Lookup-first (no raw UUIDs) | ✅ |
| Platform date components only | ✅ |
| Inline editing rules on profiles | ✅ |
| Shared tokens and dark mode | ✅ |

**Inputs:** PR link, checklist, screenshots (light + dark).  
**Outputs:** Gate sign-off or exception request per ADR-021.

**Reject if:** Any mandatory gate item fails without approved exception.

---

## Stage 3 — Accessibility Review

**Goal:** Keyboard, screen reader, contrast, and RTL readiness.

| Acceptance criteria | Required |
| --- | --- |
| Focus order and visible focus rings | ✅ |
| Interactive elements have accessible names | ✅ |
| Form errors associated with fields | ✅ |
| Color contrast uses design tokens | ✅ |
| RTL layout verified or N/A documented | ✅ |

**Inputs:** Keyboard walkthrough notes, axe or manual audit for changed surfaces.  
**Outputs:** A11y pass or remediation list.

**Reject if:** Blocking issues on primary workflow (submit, approve, save).

---

## Stage 4 — Platform Compliance

**Goal:** Reuse frozen platform components — no unauthorized duplicates.

| Acceptance criteria | Required |
| --- | --- |
| [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md) followed | ✅ |
| Imports from `@/shared/ui` | ✅ |
| No new module-local table/form/date primitives | ✅ |
| Feedback via `platform.feedback` | ✅ |

**Inputs:** File list, import audit.  
**Outputs:** Component compliance sign-off.

**Reject if:** New duplicate component without policy exception.

---

## Stage 5 — Architecture Review

**Goal:** No bounded-context or runtime ownership violations introduced by UI.

| Acceptance criteria | Required |
| --- | --- |
| Loader → Service → Action pattern preserved | ✅ |
| Permissions enforced server-side | ✅ |
| Cross-engine fields use workflow opener | ✅ |
| Audit on business-critical mutations | ✅ |
| No business logic moved into UI components | ✅ |

**Inputs:** Loader/action paths, permission keys.  
**Outputs:** Architecture pass.

**Reject if:** UI bypasses policy engine, RLS, or cross-engine boundaries.

---

## Stage 6 — Approval

**Goal:** Aggregate reviews and UX quality score.

| Role | Responsibility |
| --- | --- |
| Author | Checklist + score self-assessment |
| UX reviewer | Confirms score ≥ 85 for merge |
| Platform lead | Confirms component policy |
| Architecture reviewer | Confirms ownership boundaries |

**Merge blocked when:**

- UX quality score **below 70** (Rejected)
- Any stage failed without exception
- Exception expired in [UX Migration Tracker](UX_MIGRATION_TRACKER.md)

---

## Stage 7 — Merge

**Post-merge:**

1. Update [UX Migration Tracker](UX_MIGRATION_TRACKER.md) if module % changes.
2. Update [Implementation Status](../00-overview/IMPLEMENTATION_STATUS.md) if governance coverage changes.
3. Log notable patterns in Constitution companion docs if reusable.

---

## Official UX Quality Score (100 points)

Use this rubric at **Approval** stage. Document score in PR description.

| Category | Points | What reviewers score |
| --- | ---: | --- |
| **Navigation** | 10 | Discoverability, permissions, breadcrumbs, deep links |
| **Consistency** | 15 | Matches Constitution page archetypes and shell |
| **Reuse** | 15 | Platform components; no duplicates |
| **Accessibility** | 10 | Keyboard, ARIA, contrast, RTL |
| **Responsiveness** | 10 | Mobile/tablet usability |
| **Interaction** | 10 | Loading, empty, error, feedback, keyboard |
| **Performance** | 10 | Pagination, server components, bundle discipline |
| **Visual Hierarchy** | 10 | Typography, spacing, primary action clarity |
| **Platform Compliance** | 10 | Review Gate pass rate, Component Policy |
| **Documentation** | 10 | Migration tracker, help hints, operator docs if needed |
| **Total** | **100** | |

### Classification

| Score | Classification | Merge policy |
| --- | --- | --- |
| **95–100** | **Enterprise Ready** | Merge; exemplar candidate |
| **85–94** | **Production Ready** | Merge allowed |
| **70–84** | **Needs Improvement** | Merge only with remediation sprint logged |
| **Below 70** | **Rejected** | Do not merge |

### Scoring notes

- Deduct heavily for native date inputs, raw UUIDs, or cross-engine inline mutation (−5 to −15 each).
- N/A gate items must be justified; unjustified N/A counts as fail.
- Legacy pages are not rescored until touched; **new/changed** surfaces must score ≥ 85.

---

## PR Template (Minimal)

```markdown
## UX Design Review
- Page type:
- Module:
- Migration Tracker row updated: yes/no

## Platform UX Review Gate
- Checklist: [link or attached]
- Exceptions: none / ADR-021 exception #

## UX Quality Score
- Self-score: /100
- Reviewer score: /100
- Classification:

## Reviewers
- [ ] UX
- [ ] A11y
- [ ] Platform Compliance
- [ ] Architecture
```

---

## Related Documents

- [Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)
- [Platform UX Review Gate](PLATFORM_UX_REVIEW_GATE.md)
- [Platform Component Policy](PLATFORM_COMPONENT_POLICY.md)
- [UX Migration Tracker](UX_MIGRATION_TRACKER.md)
- [ADR-021 Platform UX Constitution](../03-architecture/adr/ADR-021_PLATFORM_UX_CONSTITUTION.md)
- [Inline Editing Standard](INLINE_EDITING_STANDARD.md)
- [Edit Mode v2 Standard](EDIT_MODE_V2_STANDARD.md)
