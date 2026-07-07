# ADR-001: Documentation Source Of Truth

## Status

Accepted (updated 2026-06-30 for documentation reorganization)

## Context

Nexora requires a single authoritative documentation set so implementation, sprints, and reviews do not diverge across scattered root-level files and platform folders.

Originally, `docs/platform/` was declared the source of truth (ADR-0001, 2026-06-27).

## Decision

The reorganized `docs/` tree is the official source of truth for Nexora architecture and platform documentation:

- **`docs/01-platform/`** — platform architecture, engines, security, data foundations
- **`docs/05-decisions/`** — Architecture Decision Records
- **`docs/00-overview/`** — vision, roadmap, implementation status
- **`docs/04-architecture/`**, **`docs/06-guidelines/`**, **`docs/07-development/`** — supporting architecture and engineering standards

Legacy paths (`docs/platform/*`, former root-level architecture files) remain as redirect stubs only.

Implementation work must follow the canonical documents. If an archived or legacy stub conflicts with the reorganized docs, the numbered folder documents win.

## Consequences

- Pull requests affecting architecture must cite the relevant canonical document.
- Sprint logs belong in `docs/09-history/` — not mixed into architecture docs.
- Major platform changes require a new or updated ADR before implementation ([ADR-010](ADR-010-Documentation-Before-Architecture-Change.md)).

## Related Documents

- [Documentation Index](../README.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)
- [Architecture Decisions README](README.md)

## Archived Source

Original: `docs/platform/03_ARCHITECTURE_DECISIONS.md` (ADR-0001). Redirect stub at `docs/platform/03_ARCHITECTURE_DECISIONS.md`.
