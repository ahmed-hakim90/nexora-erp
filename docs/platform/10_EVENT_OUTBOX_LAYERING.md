# Event Bus And Outbox Layering

## Rule

Nexora uses two event layers with different responsibilities.

## Platform Event Bus

The Platform Event Bus is the in-process domain and platform event contract.

Use it for:

- Workflow, approval, notification, reporting, background-job, and document engine coordination inside the platform runtime.
- Synchronous or process-local subscribers.
- Domain event contracts that should remain provider-neutral.
- Tests and adapters that should not require durable delivery infrastructure.

The Event Bus must not be treated as a guaranteed external delivery mechanism.

## Outbox And Integration Events

The Outbox and Integration layer is the durable delivery boundary.

Use it for:

- External webhooks.
- Cross-system integration delivery.
- Retryable event dispatch after commit.
- Dead-letter and replay workflows.
- Provider adapters that need durable event records.

The outbox receives events after the authoritative transaction has committed or when an application service explicitly enqueues a durable integration event.

## Boundary

Platform engines may publish in-process events through the Event Bus.

Only integration adapters or explicit durable-publish services should write to outbox tables.

Business applications must not couple directly to workflow, approval, notification, or reporting internals. They should publish platform events or call public platform contracts.

