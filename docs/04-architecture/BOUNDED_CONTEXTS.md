# Bounded Contexts

## Related Documents

- [Domain Model](DOMAIN_MODEL.md)
- [Data Ownership](DATA_OWNERSHIP.md)
- [Platform Overview](../01-platform/PLATFORM_OVERVIEW.md)

## Platform Context

Platform modules provide cross-cutting capabilities: identity, tenancy, permissions, workflow, approvals, notifications, audit, numbering, files, localization, reporting, printing, observability.

Platform modules must not import business module code.

## Business Contexts

Each business app is a bounded context owning its vocabulary, tables, permissions, statuses, workflows, services, routes, UI, reports, and prints:

| Context | Primary Tables Prefix | Notes |
| --- | --- | --- |
| Finance | `finance_*` | Level 1 foundation; posting future |
| Inventory | `inventory_*` | Canonical over legacy master data |
| Manufacturing | `manufacturing_*` | Normalized BOM/routing lines |
| HR | `hr_*` (planned) | Portal separation required |
| Sales / Purchasing / CRM | planned | Depend on Party and Product Master |
| Service / Fleet / Rental | planned | Operational modules Phase 6 |

## Shared Foundations

- **Party** — shared business partner registry ([Party Foundation](../01-platform/PARTY_FOUNDATION.md)).
- **Financial Platform** — fiscal periods, tax, numbering utilities ([Financial Foundation](../01-platform/FINANCIAL_FOUNDATION.md)).
- **Master Data (Sprint 05)** — legacy reference tables being superseded by app-owned models where applicable.
