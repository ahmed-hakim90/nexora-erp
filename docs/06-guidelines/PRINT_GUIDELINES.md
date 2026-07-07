# Print Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [Print Engine](../01-platform/PRINT_ENGINE.md)
- [Document Engine](../01-platform/DOCUMENT_ENGINE.md)
- [Reporting, Printing, Costing](../01-platform/REPORTING_PRINTING_COSTING.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)

## Principles

Official documents render from stable snapshots and versioned templates — not from live DOM screenshots.

- Use the Printing Engine and Print Template Designer contracts.
- Print snapshots capture document state at print time for reproducibility and reprint audit.
- Batch printing and PDF generation are background-capable workloads.
- Reprints are permission-checked and audited.
- Templates support RTL/LTR, localization, and company branding slots.

## Operational Labels

Operator Experience defines label readiness contracts (product, shelf, location, serial, lot, work order, production, transfer). Execution connects to the Print Engine when runtime rendering is available.

## Module Rules

- Modules contribute print templates through manifests.
- Apps must not implement local print layouts when platform templates apply.

## Related ADRs

- [ADR-015 Universal Document Engine](../05-decisions/ADR-015-Document-Engine.md)
- [ADR-009 Heavy Workloads Are Platform Workloads](../05-decisions/ADR-009-Heavy-Workloads-Platform-Workloads.md)
