# Search Engine

## Related Documents

- [Operator Experience](OPERATOR_EXPERIENCE.md)
- [UX Guidelines](../06-guidelines/UX_GUIDELINES.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Universal Search Engine

Purpose: make search a central UX and navigation surface.

Responsibilities:

- Search provider registration, searchable entity metadata, permission filtering, scoped queries, ranking, recent records, and high-volume indexing strategy.
