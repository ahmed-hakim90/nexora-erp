# Sprint 8: Integration Platform And Domain Events

Sprint 8 adds the internal integration platform only. It prepares the event, webhook, API version, import, export, background handler, and audit contracts future modules will use to communicate without direct module-to-module calls.

It does not implement inventory transactions, production, sales, purchasing, accounting, POS workflows, marketplace workflows, or external business APIs.

## Scope

- Domain and integration event contracts with event ID, event name, event version, aggregate ID/type, tenant ID, optional branch ID, actor, occurred time, correlation ID, causation ID, and event metadata.
- In-process event bus foundation with publish, subscribe, sync handlers, async handlers, retries, and dead-letter hooks.
- Module event registry and integration registry foundations.
- Generic outgoing webhook definitions, HMAC signatures, retry settings, and delivery log records.
- API version registry prepared for `v1`, `v2`, and future versions.
- Generic import foundation for Excel, CSV, JSON, validation, and preview.
- Generic export registry foundation.
- Background event handler registry prepared for queue adapters.
- Event handler run placeholders with idempotency keys, retry metadata, cancellation placeholder, progress, and logs.
- Event audit tables so every published event can be traced by event ID, correlation ID, request ID, and causation ID.

## Invariants

- Business modules must publish and subscribe through platform event contracts instead of calling other modules directly.
- Event names use module-qualified dot notation and immutable version numbers.
- Published events must be immutable and tenant-scoped.
- Event payloads must be schema/version-safe and serializable.
- Webhook delivery records are generic delivery logs only; no business channel workflow is implemented.
- Webhook secrets are represented by secret references only; raw secrets must not be stored in platform tables.
- Import and export engines validate requests and produce generic previews/registrations only.
- Import rollback is a placeholder only.
- Background handlers are registered as metadata and adapter contracts, not executed business jobs.
- The platform must not import feature modules, external business APIs, or use service-role access for user-triggered integration work.

## Verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:sprint8
```
