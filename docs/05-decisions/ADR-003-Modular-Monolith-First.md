# ADR-0003: Modular Monolith First

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: Nexora remains a modular monolith in one Next.js App Router project until there is a real operational reason to extract services.

Consequence: strict folder boundaries, public contracts, server-only markers, and import guardrails are required. Extraction candidates must preserve current module contracts.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
