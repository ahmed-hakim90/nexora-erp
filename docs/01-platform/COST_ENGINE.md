# Cost Engine

## Related Documents

- [Inventory](../02-business-apps/INVENTORY.md)
- [Finance](../02-business-apps/FINANCE.md)
- [Manufacturing](../02-business-apps/MANUFACTURING.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Cost Engine

Purpose: centralize costing and valuation facts.

Responsibilities:

- Cost policies, valuation methods, cost layers, cost event processing, landed cost allocation, manufacturing cost rollup, variance tracking, closed-period reproducibility, and accounting/reporting integration contracts.
