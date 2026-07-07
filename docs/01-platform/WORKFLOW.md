# Workflow Engine

## Related Documents

- [Approval Engine](APPROVAL.md)
- [Document Engine](DOCUMENT_ENGINE.md)
- [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Workflow Engine

Purpose: own reusable status transition behavior.

Responsibilities:

- Workflow definitions, states, transitions, guards, hooks, history, terminal states, version checks, idempotent commands, and user-safe guard failures.
