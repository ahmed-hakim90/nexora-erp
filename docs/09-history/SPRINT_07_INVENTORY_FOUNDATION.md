# Sprint 07 Inventory Foundation

## Related Documents

- [Implementation Status](../00-overview/IMPLEMENTATION_STATUS.md)
- [Sprint History README](README.md)

> **Note:** Canonical content lives here. Previous location: `docs/SPRINT7_INVENTORY_FOUNDATION.md`.

Sprint 7 adds only the event and integration foundation for future inventory work.

It does not implement inventory posting, stock balances, stock movements, transfer workflows, lots, serials, reservations, production, sales orders, sales invoices, purchase orders, or accounting.

## Scope

- Event contract definitions: `inventory_event_definitions`.
- Integration endpoint placeholders: `inventory_integration_endpoints`.
- Event routing placeholders: `inventory_event_routes`.
- Integration message placeholders: `inventory_integration_messages`.
- Read-only ERP pages for event/integration foundation records.
- Inventory event/integration permissions and tenant-safe RLS policies with write `WITH CHECK`.

## Invariants

- No quantity, cost, valuation, posting, transfer, production, sales, purchase, or accounting fields.
- Event and integration records are placeholders/contracts only.
- No service-role access in the inventory feature.
- Repositories contain database access only.
- Services hold permission checks and foundation-scope rules.
- UI pages call route loaders and do not query Supabase directly.

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:sprint7
```
