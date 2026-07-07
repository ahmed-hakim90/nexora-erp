# ADR-0005: Engine First Architecture

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: Shared capabilities belong in reusable platform engines, not business apps.

Consequence: workflow, approvals, document lifecycle, notifications, search, reporting, printing, import/export, jobs, integration, audit, dashboarding, costing, files, testing, automation, and AI governance must expose platform contracts before apps rely on them.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
