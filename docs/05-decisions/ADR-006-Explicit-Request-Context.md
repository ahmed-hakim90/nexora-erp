# ADR-0006: Explicit Request Context

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: Backend code must receive explicit request context containing actor, user, tenant, company, branch, employee, experience, locale, direction, timezone, source, and correlation ID where available.

Consequence: application services must not reconstruct context from UI state, cookies, headers, or route params.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
