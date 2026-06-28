# Inventory Reservation Engine Architecture

## Reservation Architecture Summary

The Inventory Reservation Engine is the single owner of inventory quantity availability and reservation lifecycle state. Sales, Manufacturing, Purchasing, Service, Rental, Fleet, Projects, and future apps may request inventory outcomes, but they must not update stock balances directly.

This foundation is infrastructure only. It defines contracts, database tables, permissions, event names, and platform integration points. Runtime reservation execution is intentionally not implemented yet.

The engine boundary owns:

- Reserve Quantity
- Release Quantity
- Consume Reservation
- Expire Reservation
- Reject Reservation
- Recalculate Availability
- Reservation Validation
- Concurrency Validation
- Reservation Audit
- Reservation Events

The runtime strategy is Postgres transactional locking. Future execution RPCs must acquire a deterministic advisory transaction lock for the tenant, product, warehouse, location, lot, serial, and unit key, then lock the matching `stock_balances` row with `for update` before changing quantity buckets. Idempotency keys are mandatory for reservation headers, lines, and quantity events. Frontend validation is advisory only and must never be trusted.

## Quantity Model

Supported stored quantity buckets are:

- On Hand
- Reserved
- Pending Approval
- In Transit
- Incoming
- Outgoing
- Damaged
- Quarantine

Available is never manually stored by application code. It is derived by database generated columns and views:

```text
available = on_hand - reserved - pending_approval - outgoing - damaged - quarantine
```

Incoming and in-transit quantities are tracked but do not become available until a future inventory engine receive operation moves them into on hand. Negative availability is blocked unless an explicit inventory policy allows it.

## Reservation Lifecycle

The provider-neutral lifecycle is:

```text
Draft
Pending Approval
Approved
Reserved
Picked
Issued
In Transit
Received
Completed
```

Supported non-happy-path statuses:

- Rejected
- Cancelled
- Released
- Expired
- Consumed

Reservation kinds are provider-neutral:

- Soft Hold
- Hard Reservation
- Transfer Reservation
- Manufacturing Reservation
- Sales Reservation
- Service Reservation
- Rental Reservation
- Project Reservation
- Custom

No business-specific rules are embedded in these contracts.

## Transfer Scenario

Warehouse transfers use the shared lifecycle:

```text
Draft -> Pending Approval -> Approved -> Reserved -> Issued -> In Transit -> Received -> Completed
```

Rules:

- Draft creates no reservation.
- Pending Approval may create a configurable Soft Hold.
- Approved creates a Hard Reservation.
- Issued moves quantity from Reserved to In Transit.
- Received moves quantity into the destination warehouse.
- Rejected and Cancelled release reservation quantities.

This does not implement accounting, valuation, costing, or warehouse execution.

## Database Foundation

The foundation migration adds:

- `inventory_reservations`
- `inventory_reservation_lines`
- `inventory_quantity_snapshots`
- `inventory_quantity_events`
- `inventory_availability_views`

It also extends `stock_balances` with pending approval, in transit, incoming, outgoing, damaged, and quarantine buckets, and redefines available as a generated quantity. Reservation tables support tenant, company, branch, warehouse, location, lot, serial, product, variant, document reference, status, type, timestamps, audit users, metadata, and idempotency.

Manual stock-balance mutation is guarded. `quantity_on_hand` remains owned by the stock posting service. Reservation quantity buckets are reserved for a future Inventory Reservation Engine runtime guard.

## Platform Integrations

The public inventory contracts prepare integration points for:

- Platform Events
- Background Jobs
- Audit
- Notifications
- Search
- Reporting
- Dashboard
- Import/Export
- Workflow
- Approvals

No runtime handlers are registered by this foundation.

## Events

Prepared event definitions:

- `InventoryReservationRequested`
- `InventoryReservationCreated`
- `InventoryReservationApproved`
- `InventoryReservationReleased`
- `InventoryReservationConsumed`
- `InventoryReservationExpired`
- `InventoryReservationCancelled`
- `InventoryAvailabilityChanged`
- `InventoryTransferIssued`
- `InventoryTransferReceived`

These are contracts only. Durable outbox writes remain a future runtime responsibility.

## Permissions

Reservation operations require explicit permissions:

- `inventory.reservations.view`
- `inventory.reservations.create`
- `inventory.reservations.approve`
- `inventory.reservations.release`
- `inventory.reservations.consume`
- `inventory.reservations.cancel`
- `inventory.reservations.audit`

RLS policies require tenant membership and the relevant permission. Scope is tenant, company, branch, and warehouse aware.

## Remaining Future Runtime Work

Before enabling reservation execution, implement and review:

- Transactional reserve, release, consume, reject, expire, issue, and receive RPCs.
- Advisory lock key generation and `for update` stock-balance locking.
- Idempotent command handling and duplicate reservation prevention.
- Negative availability policy enforcement.
- Runtime audit writes and durable outbox event publishing after commit.
- Background expiration jobs and approval/workflow handlers.
- Business module adapters that call inventory contracts without mutating balances.
- Concurrency tests that simulate simultaneous reservations for the same stock key.
