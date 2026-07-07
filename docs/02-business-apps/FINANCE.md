# Finance

## Related Documents

- [Financial Platform Foundation](../01-platform/FINANCIAL_FOUNDATION.md)
- [Document Engine](../01-platform/DOCUMENT_ENGINE.md)
- [Cost Engine](../01-platform/COST_ENGINE.md)
- [ADR-012 App Foundation Decisions](../05-decisions/ADR-012-App-Foundation-Decisions.md)
- [ERP Navigation](ERP_NAVIGATION.md)

## Workspace Route

Base path: `/erp/finance`

## Navigation and Status

See [ERP Navigation](ERP_NAVIGATION.md) for the canonical route table, page responsibilities, and ready/planned status.

## Foundation Decisions

- Canonical app tables: `finance_*` (see [ADR-012](../05-decisions/ADR-012-App-Foundation-Decisions.md)).
- `financial_*` platform tables are lower-level utilities; Finance app UI must not duplicate them as CRUD surfaces.
- Current scope: Level 1 Foundation Ready — definitions, validation, permissions, RLS, search/report contracts. No journal posting, invoice workflow, bank reconciliation, payment execution, or tax runtime calculation in this stage.

