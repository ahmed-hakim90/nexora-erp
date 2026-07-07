# ADR-016: Inventory Data Ownership

## Status

Accepted

## Context

Inventory master data existed in legacy master-data tables while the Inventory app introduced canonical `inventory_*` foundation tables. Without a single ownership model, stock posting, reservations, and UI flows would diverge.

## Decision

- Canonical Inventory app/runtime tables are the `inventory_*` foundation tables for products, variants, categories, UOMs, warehouses, locations, lots, serials, movements, balances, reorder rules, and reservations.
- Stock posting tables remain the append-only runtime layer, but product, warehouse, location, and UOM references must align with `inventory_products`, `inventory_warehouses`, `inventory_locations`, and `inventory_uoms`.
- Legacy master-data tables such as `products`, `warehouses`, `warehouse_locations`, and `units` are compatibility surfaces only and must not be the source of truth for new Inventory app flows.
- The Inventory Reservation Engine owns availability semantics. See [Inventory Reservation Engine](../02-business-apps/INVENTORY_RESERVATION_ENGINE.md).

## Consequences

- New inventory UI, loaders, and services must use canonical `inventory_*` contracts.
- Cross-app product references should migrate toward inventory catalog lookup services.
- Reservation and stock balance changes must respect single-owner availability rules.

## Related Documents

- [ADR-012 App Foundation Decisions](ADR-012-App-Foundation-Decisions.md)
- [Inventory](../02-business-apps/INVENTORY.md)
- [Product Master](../03-commerce/PRODUCT_MASTER.md)
- [Inventory Reservation Engine](../02-business-apps/INVENTORY_RESERVATION_ENGINE.md)

## Archived Source

Extracted from [ADR-012](ADR-012-App-Foundation-Decisions.md) and `docs/platform/11_INVENTORY_RESERVATION_ENGINE.md`.
