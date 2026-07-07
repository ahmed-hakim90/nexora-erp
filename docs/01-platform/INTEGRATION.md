# Integration and Connector Engine

## Related Documents

- [Event Bus](EVENT_BUS.md)
- [Security](SECURITY.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Integration And Connector Engine

Purpose: connect external systems without weakening platform controls.

Responsibilities:

- Connector registry, API versions, inbound APIs, outbound webhooks, credentials, signature verification, replay protection, rate limiting, tenant mapping, retries, dead letters, and health dashboards.
