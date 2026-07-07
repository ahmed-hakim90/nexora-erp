# ADR-0007: Security Requires Multiple Layers

## Status

Accepted

## Context

This decision was recorded during the Nexora platform architecture phase. See the original decision log in `docs/platform/03_ARCHITECTURE_DECISIONS.md` (archived).

## Decision

Status: Accepted.

Decision: Authentication, entitlements, permissions, data scopes, RLS, service-layer authorization, workflow/approval guards, and audit are separate required layers.

Consequence: UI-only authorization is invalid. Service-role access must be isolated behind reviewed platform adapters.

## Consequences

See the Decision section above.

## Related Documents

- [Architecture Decisions README](README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)
