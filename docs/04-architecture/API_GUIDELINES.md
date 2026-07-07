# API Guidelines

## Related Documents

- [Backend Frontend Separation](BACKEND_FRONTEND_SEPARATION.md)
- [Security](../01-platform/SECURITY.md)
- [Integration Engine](../01-platform/INTEGRATION.md)

## Server Actions

- Thin adapters delegating to application services.
- Must receive explicit request context from platform resolvers.
- Must enforce permissions, validation, idempotency, and audit.

## API Routes

Use for webhooks, integrations, exports, and non-React clients.

Requirements:

- Authentication and tenant mapping.
- Webhook signature verification and replay protection where applicable.
- Idempotency keys for integration writes.
- Rate limiting and retry handling for external callers.
- All writes through application services — never bypass permissions or audit.

## Public Module Contracts

- Cross-module access via `public-api.ts` only.
- Platform access via `src/platform/public-api.ts` (browser-safe) and `src/platform/server.ts` (server-only).

See [Sprint 08](../09-history/SPRINT_08_INTEGRATION_PLATFORM.md) for integration platform invariants.
