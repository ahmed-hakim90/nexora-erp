# Import and Export Engine

## Related Documents

- [Background Jobs](BACKGROUND_JOBS.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Import And Export Engine

Purpose: provide governed data movement.

Responsibilities:

- Import definitions, file validation, previews, row issues, idempotency, background processing, export definitions, export permissions, result files, and failure recovery.
