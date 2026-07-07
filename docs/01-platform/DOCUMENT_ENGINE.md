# Document Engine

## Related Documents

- [Workflow Engine](WORKFLOW.md)
- [Print Engine](PRINT_ENGINE.md)
- [Financial Foundation](FINANCIAL_FOUNDATION.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Universal Document Lifecycle Engine

Purpose: provide document shells, lifecycle commands, numbering, timeline, comments, files, references, print/export hooks, and snapshots.

Responsibilities:

- Draft, submit, approve, reject, return, post, cancel, close, reverse, archive, and reprint lifecycle concepts where applicable.
- Transaction-safe numbering.
- Tenant-safe file metadata and document references.
- Company branding handoff for official outputs.
