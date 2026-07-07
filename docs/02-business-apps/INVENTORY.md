# Inventory

## Related Documents

- [Product Master](../03-commerce/PRODUCT_MASTER.md)
- [Inventory Reservation Engine](INVENTORY_RESERVATION_ENGINE.md)
- [Document Engine](../01-platform/DOCUMENT_ENGINE.md)
- [Cost Engine](../01-platform/COST_ENGINE.md)
- [ADR-016 Inventory Ownership](../05-decisions/ADR-016-Inventory-Ownership.md)
- [Manufacturing](MANUFACTURING.md)
- [Finance](FINANCE.md)

## Workspace Route

Base path: `/erp/inventory`

## Navigation and Status

See [ERP Navigation](ERP_NAVIGATION.md) for the canonical route table, page responsibilities, and ready/planned status.

## Foundation Decisions

- Canonical tables: `inventory_*` foundation set (see [ADR-016](../05-decisions/ADR-016-Inventory-Ownership.md)).
- Legacy `products`, `warehouses`, `warehouse_locations`, and `units` are compatibility only.
- Operator Experience and warehouse execution patterns: [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md).

