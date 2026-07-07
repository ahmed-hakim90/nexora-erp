# Design Principles

## Related Documents

- [Vision](../00-overview/VISION.md)
- [Architecture Decisions](../05-decisions/README.md)
- [UX Guidelines](../06-guidelines/UX_GUIDELINES.md)

## Platform Principles

From the approved product and platform vision:

- **Modular monolith first** — one deployable unit with strict module boundaries.
- **App First** — installable apps with manifests, lifecycle, and registry-driven navigation.
- **Engine First** — shared capabilities in platform engines, not duplicated in apps.
- **UX First** — intent-based navigation, lookup-first data entry, no raw UUID workflows.
- **Security First** — authentication, entitlements, permissions, data scopes, RLS, audit as separate layers.
- **Performance First** — bounded queries, async reports/prints/exports/imports.
- **Multi-tenant by design** — explicit tenant, company, branch, employee, experience context.
- **AI ready** — governed services with approval gates and audit; no authorization bypass.
- **Enterprise grade** — auditability, reproducibility, localization, accessibility, operational visibility.

## Implementation Principles

- Strict TypeScript everywhere.
- Clean architecture boundaries and repository pattern.
- No business logic in React components.
- No Supabase queries in UI components.
- No hardcoded permissions, tenant IDs, branch IDs, or statuses.
- Default-deny data access.
- Official document snapshots for printing.
- Asynchronous execution for heavy workloads.

## Documentation Principle

Architecture changes require documentation updates before implementation ([ADR-010](../05-decisions/ADR-010-Documentation-Before-Architecture-Change.md)).
