# Report Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [Reporting Engine](../01-platform/REPORTING.md)
- [Reporting, Printing, Costing](../01-platform/REPORTING_PRINTING_COSTING.md)
- [Performance Strategy](../04-architecture/PERFORMANCE_STRATEGY.md)
- [Permission Model](../04-architecture/PERMISSION_MODEL.md)

## Principles

Reports are controlled platform workloads, not browser data.cmd aggregations.

- Large reports run asynchronously through the Reporting Engine.
- Report permissions distinguish view, export, print, sensitive columns, cross-branch, and cross-company access.
- Apps expose datasets and definitions through the universal report builder contract.
- Reports must be reproducible: capture filter metadata, dataset version, and execution timestamp where official output is required.

## Module Rules

From Module Guidelines:

- Modules contribute report definitions through manifests.
- Read-only report access may route through shared `/erp/reports` workspace surfaces.
- Exports are background-capable workloads with permission checks and audit.

## Performance

See [Performance Strategy](../04-architecture/PERFORMANCE_STRATEGY.md) for pagination, indexing, materialized views, and release gates.

## Related ADRs

- [ADR-009 Heavy Workloads Are Platform Workloads](../05-decisions/ADR-009-Heavy-Workloads-Platform-Workloads.md)
