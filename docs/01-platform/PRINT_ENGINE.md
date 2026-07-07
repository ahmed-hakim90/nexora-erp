# Print Engine

## Related Documents

- [Document Engine](DOCUMENT_ENGINE.md)
- [Reporting Engine](REPORTING.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Printing Engine And Print Template Designer

Purpose: provide official document rendering and template governance.

Responsibilities:

- Template registry, template versions, designer schema, print snapshots, PDF generation contract, batch jobs, reprint audit, RTL/LTR, localization, branding slots, and template publishing lifecycle.
