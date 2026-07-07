# Runtime

## Related Documents

- [Modular Monolith Architecture](../04-architecture/MODULAR_MONOLITH.md) — full architecture: layers, repo layout, boundaries
- [Platform Kernel](PLATFORM_KERNEL.md) — tenancy, branches, platform modules
- [Backend Frontend Separation](../04-architecture/BACKEND_FRONTEND_SEPARATION.md)
- [Identity](IDENTITY.md)
- [Event Bus](EVENT_BUS.md)

## Overview

Nexora runs as a **modular monolith** in one Next.js App Router project. Frontend and backend share a repository but are separated by folder boundaries, import rules, and runtime expectations.

## Platform Entry Points

| Entry | Purpose |
| --- | --- |
| `src/platform/public-api.ts` | Browser-safe universal contracts |
| `src/platform/server.ts` | Server-only runtime services (`server-only`) |
| `src/platform/client.ts` | Client-only UI services (e.g. feedback) |

Client-only vendor adapters stay behind platform client entry points. Sonner may only be imported by `src/platform/feedback/public-api.tsx`.

## Request Context

Backend code must receive an explicit **request context** containing authenticated user, tenant, company, branch, employee, locale, timezone, experience, and correlation ID where available. Context is resolved server-side — never reconstructed from UI state.

See [ADR-006](../05-decisions/ADR-006-Explicit-Request-Context.md).

## Correlation Propagation

Every request receives a correlation ID from `x-correlation-id` when valid, otherwise the platform creates one.

Propagation uses the same value in:

- Response headers (`x-correlation-id`)
- Background job metadata
- Outbox event metadata
- Audit log context
- Outbound external call headers

Contracts: `src/core/context/correlation-propagation.ts`.

## Transaction Boundaries

Application services define transaction boundaries for:

- Posting financial documents
- Creating inventory movements
- Submitting and deciding approvals
- Assigning document numbers
- Cross-module atomic operations

Rules:

- Number assignment, persistence, ledger entries, workflow transitions, and audit for one business action commit atomically when required.
- Cross-module async side effects use domain events or outbox ([Event Bus](EVENT_BUS.md)).
- Notifications, exports, and print rendering stay outside the critical transaction unless explicitly required.

Full detail: [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md) (Transaction And Consistency Strategy).

## Experience Route Groups

| Route group | Shell | Users |
| --- | --- | --- |
| `(erp)` | ERP Workspace `/erp` | Operational and administrative users |
| `(portal)` | HR Portal `/portal` | Employee self-service |

Route groups have separate layouts, navigation loaders, permission checks, and module loading. Shared providers limited to theme, locale, and session display.

## Engine Runtime

Workflow, approval, notification, and document lifecycle behavior is owned by platform engines — not React components or app-local services.

- [Workflow Engine](WORKFLOW.md)
- [Approval Engine](APPROVAL.md)
- [Notification Engine](NOTIFICATION.md)
- [Document Engine](DOCUMENT_ENGINE.md)

See [Modular Monolith](../04-architecture/MODULAR_MONOLITH.md) for frontend/backend boundary rules, module import rules, and extraction strategy.
