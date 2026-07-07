# Reporting Engine

## Related Documents

- [Reporting, Printing, Costing](REPORTING_PRINTING_COSTING.md)
- [Performance Strategy](../04-architecture/PERFORMANCE_STRATEGY.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Reporting Engine And Universal Report Builder

Purpose: make reports controlled platform workloads.

Responsibilities:

- Report registry, datasets, builder schema, filters, permissions, interactive execution, async generation, exports, result storage, cache and retention, branding, localization, and reproducibility metadata.
