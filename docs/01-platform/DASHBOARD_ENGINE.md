# Dashboard Engine

## Related Documents

- [Reporting Engine](REPORTING.md)

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

> Source: Platform Engines catalog. See also [Platform Overview](PLATFORM_OVERVIEW.md).


## Universal Dashboard Builder And Analytics Surface

Purpose: provide governed role-aware dashboards and KPI workspaces.

Responsibilities:

- Widget registry, dashboard definitions, builder schema, saved layouts, role/user/team dashboards, drilldowns, refresh policies, tenant-safe caching, app-provided widgets, branding, and mobile layouts.
