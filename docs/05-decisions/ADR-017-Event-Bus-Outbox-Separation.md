# ADR-017: Event Bus and Outbox Separation

## Status

Accepted

## Context

In-process coordination and durable external delivery have different reliability guarantees. Treating in-process events as guaranteed delivery causes lost integrations and unsafe retry behavior.

## Decision

Nexora uses two event layers:

1. **Platform Event Bus** — in-process domain and platform event contract for workflow, approval, notification, reporting, background-job, and document engine coordination inside the runtime. Not guaranteed external delivery.
2. **Outbox and Integration layer** — durable delivery boundary for external webhooks, cross-system integration, retryable dispatch after commit, dead-letter and replay workflows.

Platform engines may publish in-process events through the Event Bus. Only integration adapters or explicit durable-publish services write durable outbox records.

## Consequences

- Business applications must not couple directly to engine internals; they publish platform events or call public contracts.
- Integration work must use outbox patterns for retryable external side effects.
- Tests may use the Event Bus without requiring durable infrastructure.

## Related Documents

- [Event Bus](../01-platform/EVENT_BUS.md)
- [Background Jobs](../01-platform/BACKGROUND_JOBS.md)
- [Integration Engine](../01-platform/INTEGRATION.md)
- [Sprint 08 Integration Platform](../09-history/SPRINT_08_INTEGRATION_PLATFORM.md)

## Archived Source

`docs/platform/10_EVENT_OUTBOX_LAYERING.md` (now [Event Bus](../01-platform/EVENT_BUS.md)).
