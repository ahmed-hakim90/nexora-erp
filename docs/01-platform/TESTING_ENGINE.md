# Testing Engine and Quality Gates

## Related Documents

- [Testing](../07-development/TESTING.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Testing Engine And Quality Gates

Purpose: provide standard test contracts for platform engines and apps.

Responsibilities:

- RLS, permission, workflow, approval, performance, and E2E test scenarios.
- Test data factories for tenants, companies, branches, users, roles, permissions, entitlements, documents, and sandbox data.
- CI release gates for platform correctness.
