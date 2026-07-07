# Event Catalog

## Related Documents

- [Event Bus](../01-platform/EVENT_BUS.md)
- [ADR-017 Event Bus and Outbox Separation](../05-decisions/ADR-017-Event-Bus-Outbox-Separation.md)
- [Inventory Reservation Engine](../02-business-apps/INVENTORY_RESERVATION_ENGINE.md)
- [Sprint 08 Integration Platform](../09-history/SPRINT_08_INTEGRATION_PLATFORM.md)

## Platform Event Layers

1. **In-process Event Bus** — workflow, approval, notification, and engine coordination.
2. **Durable Outbox** — external webhooks and integration delivery after commit.

## Documented Event Definitions

### Inventory Reservation Engine

Nine prepared reservation event definitions are documented in [Inventory Reservation Engine](../02-business-apps/INVENTORY_RESERVATION_ENGINE.md).

### Sprint 07 Inventory Foundation

Placeholder event definitions: `inventory_event_definitions` (see [Sprint 07](../09-history/SPRINT_07_INVENTORY_FOUNDATION.md)).

### Sprint 08 Integration Platform

Domain events, webhook delivery, and idempotency keys — see [Sprint 08](../09-history/SPRINT_08_INTEGRATION_PLATFORM.md).

### Financial Platform

`FinancialEvent` records posting-intent events only — see [Financial Foundation](../01-platform/FINANCIAL_FOUNDATION.md).

> A unified machine-readable event registry is future work. This catalog indexes documented events from accepted foundations and sprint archives.
