# ADR-0004: App First Architecture

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: Business capabilities become installable apps with manifests, lifecycle, capabilities, dependencies, permissions, routes, navigation, commands, reports, prints, dashboards, settings, and integration contracts.

Consequence: app behavior must be registry-driven. Hardcoded navigation and implicit module enablement are architecture violations.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
