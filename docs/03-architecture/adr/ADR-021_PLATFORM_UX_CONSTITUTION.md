# ADR-021: Platform UX Constitution as Constitutional UX Authority

## Status

**Accepted** — 2026-07-07

## Context

Nexora adopted the [Nexora Enterprise Blueprint v1.0](../../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) as constitutional architecture. Section 14 defines UX standards at the blueprint level. ADR-008 established that UX foundation must precede app UI.

The platform now has an official **[Nexora Platform UX Constitution](../../06-guidelines/NEXORA_PLATFORM_UX_CONSTITUTION.md)** — a mandatory, cross-app UX architecture document covering shells, navigation, list-first workspaces, inline editing, platform components, accessibility, RTL, and operator experience patterns.

Without governance, the constitution remains advisory. Teams can still ship module-local tables, native date inputs, competing form systems, and screens that bypass review gates.

## Problem Statement

- UX rules exist in multiple guidelines but lack a single **enforceable authority** and **acceptance gate**.
- Business apps are at different maturity levels; incremental migration needs a **tracker**, not ad-hoc refactors.
- AI-assisted development (Cursor) needs **automatic reminders** to validate UI against constitutional standards.
- There is no official **component freeze** preventing duplicated UI primitives across modules.
- Review workflow is described in the Blueprint but not operationalized as a checklist engineers can execute.

## Decision

**The Nexora Platform UX Constitution is the supreme UX authority for all Business Apps, Platform Engine surfaces, portals, and future modules.**

Governance artifacts make the constitution enforceable:

| Artifact | Role |
| --- | --- |
| This ADR | Constitutional decision record; supersedes informal UX guidance where conflict exists |
| [Platform UX Review Gate](../../06-guidelines/PLATFORM_UX_REVIEW_GATE.md) | Mandatory pre-merge checklist for every new/changed screen |
| [UX Migration Tracker](../../06-guidelines/UX_MIGRATION_TRACKER.md) | Module-by-module compliance tracking |
| [Design Review Process](../../06-guidelines/DESIGN_REVIEW_PROCESS.md) | Human review workflow and quality scoring |
| [Platform Component Policy](../../06-guidelines/PLATFORM_COMPONENT_POLICY.md) | Frozen reusable component catalog |
| `.cursor/rules/platform-ux-review-gate.mdc` | AI enforcement reminder |

When the Constitution, Review Gate, and Component Policy conflict with module-local patterns, **platform governance wins**.

## Scope

### In scope

- All ERP workspace pages under `src/app/(erp)/`
- HR Portal and future self-service experiences
- Platform engine operator surfaces (workflow, approval, reporting, print, jobs)
- New screens, new components, and UX refactors explicitly scheduled in the Migration Tracker
- Documentation, Cursor rules, and review gates

### Applies to

- HR, Payroll, Finance, Inventory, Sales, CRM, Purchasing, Manufacturing, Maintenance, Fleet, Projects, Assets, Documents, POS, Commerce, Analytics, and all future modules

## Non-Goals

- **No redesign** of existing pages in this governance sprint
- **No breaking changes** to runtime, APIs, or data ownership
- **No business logic** changes
- **No modification** of engine or bounded-context ownership
- **No replacement** of the Blueprint — this ADR implements Blueprint Section 14 and Review Gates
- **No new UI components** — governance documents existing platform components only

## Consequences

### Positive

- Every future screen has a defined acceptance path before merge
- Reduced UX drift and duplicated UI across modules
- Clear migration priorities per business app
- AI-generated UI is guided toward constitutional compliance
- Aligns with Blueprint review gates (Architecture, UX, Security)

### Negative / Trade-offs

- Additional review overhead for new UI work
- Legacy screens remain non-compliant until scheduled migration
- Exceptions require documented approval (cannot silently bypass)

### Compliance hierarchy

```text
Nexora Enterprise Blueprint v1.0
        ↓
ADR-021 (this record)
        ↓
Nexora Platform UX Constitution
        ↓
Platform UX Review Gate + Component Policy
        ↓
Module implementation
```

## Migration Strategy

Migration is **incremental and tracker-driven**. This ADR does not authorize blanket redesigns.

1. **Freeze** — No new module-local UI primitives (Component Policy).
2. **Gate** — All new/changed screens pass Review Gate before merge.
3. **Track** — Each module records completion % in UX Migration Tracker.
4. **Prioritize** — High-traffic operational surfaces (lists, profiles, approvals) before reports and admin.
5. **Refactor in place** — When a module is scheduled, replace violations without changing business behavior.
6. **Score** — Design Review Process assigns UX quality score; below 70 = rejected.

See [UX Migration Tracker](../../06-guidelines/UX_MIGRATION_TRACKER.md) for per-module status.

## Compliance Requirements

Every new or materially changed screen must:

1. Pass all mandatory items in [Platform UX Review Gate](../../06-guidelines/PLATFORM_UX_REVIEW_GATE.md)
2. Reuse components listed in [Platform Component Policy](../../06-guidelines/PLATFORM_COMPONENT_POLICY.md)
3. Follow [Inline Editing Standard](../../06-guidelines/INLINE_EDITING_STANDARD.md) and [Edit Mode v2](../../06-guidelines/EDIT_MODE_V2_STANDARD.md) on profile/detail surfaces
4. Use `DatePicker` / platform date components — **no native date inputs** (see `.cursor/rules/no-native-date-inputs.mdc`)
5. Use `EntityLookup` for relations — **no raw UUIDs** in UI
6. Respect permissions, audit, and cross-engine workflow boundaries per Blueprint
7. Achieve minimum **85/100** UX quality score for production merge; **95+** for enterprise-ready classification

## Exceptions Process

Exceptions are **temporary and documented**. Silent bypass is not allowed.

1. **Request** — Author opens a short exception note in the PR or Migration Tracker row citing the Review Gate item(s).
2. **Justify** — Business blocker, platform gap, or time-boxed pilot with remediation sprint.
3. **Approve** — UX reviewer + architecture reviewer (same as Design Review Process).
4. **Record** — Exception logged in Migration Tracker with owner and target sprint.
5. **Expire** — Exceptions must have a remediation sprint; unowned exceptions are rejected at next review.

Platform component replacements require explicit approval in the Component Policy exception log.

## Future Evolution

- Constitution amendments follow ADR-010 (documentation before change): update Constitution → update Review Gate → update Component Policy → update Migration Tracker → update Cursor rule.
- UX quality rubric may add weighted criteria per app class (e.g. POS mobile-first).
- Automated lint/rules may later enforce Review Gate items (native date ban is already a Cursor rule).
- Migration Tracker completion % may feed Implementation Status and release readiness gates.

## Related Documents

| Document | Relationship |
| --- | --- |
| [Nexora Enterprise Blueprint v1.0](../../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) | Constitutional parent; Section 14 UX Standards |
| [Nexora Platform UX Constitution](../../06-guidelines/NEXORA_PLATFORM_UX_CONSTITUTION.md) | **Supreme UX authority** |
| [Platform UX Review Gate](../../06-guidelines/PLATFORM_UX_REVIEW_GATE.md) | Enforcement checklist |
| [UX Migration Tracker](../../06-guidelines/UX_MIGRATION_TRACKER.md) | Migration state |
| [Design Review Process](../../06-guidelines/DESIGN_REVIEW_PROCESS.md) | Review workflow + scoring |
| [Platform Component Policy](../../06-guidelines/PLATFORM_COMPONENT_POLICY.md) | Component freeze |
| [ADR-008 UX Foundation Before App UI](../../05-decisions/ADR-008-UX-Foundation-Before-App-UI.md) | Historical precedent |
| [ADR-010 Documentation Before Architecture Change](../../05-decisions/ADR-010-Documentation-Before-Architecture-Change.md) | Amendment process |
| [Implementation Status](../../00-overview/IMPLEMENTATION_STATUS.md) | Governance status dashboard |
