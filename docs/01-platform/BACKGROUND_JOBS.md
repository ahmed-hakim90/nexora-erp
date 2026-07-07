# Background Jobs and Outbox

## Related Documents

- [Event Bus](EVENT_BUS.md)
- [Reporting Engine](REPORTING.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Background Jobs, Outbox, And Async Processing

Purpose: separate heavy and retryable workloads from interactive requests.

Responsibilities:

- Job definitions, queue contracts, retries, idempotency keys, progress, cancellation, dead letters, durable outbox, and execution paths for reports, prints, exports, imports, notifications, connectors, and AI.
