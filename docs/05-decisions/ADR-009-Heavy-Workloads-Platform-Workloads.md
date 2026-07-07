# ADR-0009: Heavy Workloads Are Platform Workloads

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: reports, exports, prints, imports, integrations, notifications, background jobs, dashboards, cost recalculations, and AI execution are bounded, observable, async-capable platform workloads.

Consequence: apps must not implement unbounded browser exports, screenshot printing, or blocking long-running work in interactive requests.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
