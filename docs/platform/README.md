# Nexora Platform Documentation

`docs/platform` is the official source of truth for Nexora Platform architecture.

## What Nexora Platform Is

Nexora is an Enterprise Business Platform, not a collection of ERP screens. It is built around installable apps, reusable platform engines, tenant-safe data, governed extensibility, and simple user experiences across ERP, self-service portal, admin, connector, automation, AI, marketplace, and sandbox surfaces.

The platform exists to make future business apps consistent. Apps must consume platform contracts for runtime context, identity, security, navigation, workflow, approvals, documents, notifications, reporting, printing, dashboards, costing, integrations, audit, jobs, UX, and data ownership. Apps must not reimplement those foundations locally.

## Reading Order

Read these documents in order:

1. `00_PLATFORM_VISION.md`
2. `01_PLATFORM_BLUEPRINT.md`
3. `02_IMPLEMENTATION_ROADMAP.md`
4. `03_ARCHITECTURE_DECISIONS.md`
5. `04_PLATFORM_ENGINES.md`
6. `05_APP_FRAMEWORK.md`
7. `06_UX_GUIDELINES.md`
8. `07_SECURITY_GUIDELINES.md`
9. `08_DATA_GUIDELINES.md`
10. `09_REPORTING_PRINTING_COSTING.md`
11. `10_EVENT_OUTBOX_LAYERING.md`
12. `11_PLATFORM_FREEZE_V1.md`
13. `CHANGELOG.md`

The older root-level architecture documents remain supporting references. If there is a conflict, `docs/platform` wins.

## Single Source Of Truth Policy

`docs/platform` is the single source of truth for platform architecture, platform implementation order, platform engine boundaries, app framework rules, and platform readiness gates.

Architecture decisions must be reflected here before code changes are made. Implementation plans, sprint scopes, and pull requests must cite the relevant platform document when they affect architecture or platform contracts.

## Implementation Rule

Code must follow `docs/platform`.

No implementation may:

- Build business apps before required platform phases are ready.
- Bypass platform runtime context, security, or data boundaries.
- Reimplement a platform engine inside an app.
- Add hardcoded navigation, permissions, statuses, tenant IDs, company IDs, branch IDs, or workflow behavior.
- Import private platform or app internals when a public contract is required.

## Change Policy

Architecture changes require documentation updates first.

Any change that affects platform phases, public contracts, engine ownership, security, tenancy, data access, app lifecycle, UX foundations, reporting, printing, costing, marketplace, SDK, or AI governance must update `docs/platform` before implementation.

Major changes require an Architecture Decision entry in `03_ARCHITECTURE_DECISIONS.md`.
