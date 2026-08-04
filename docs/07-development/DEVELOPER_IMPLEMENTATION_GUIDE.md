# Developer Implementation Guide

## Purpose

This guide explains how to write Nexora code so another developer can understand the business workflow, architecture, data flow, permissions, performance choices, UI states, and verification path without rediscovering the whole project.

Start with `docs/README.md`, then follow the relevant architecture, platform, business app, and UX documents for the area you are changing.

## Before Writing Code

For every meaningful change, identify:

- The business workflow and user outcome.
- The owning feature module or platform engine.
- The source of truth for the data.
- The permissions, tenant/company/branch scope, and ownership checks.
- The validation rules and rejected states.
- The expected data volume, query shape, indexes, pagination, and cache invalidation.
- The UI states: loading, empty, error, pending, dirty, success, permission denied, and responsive layout.
- The tests and manual verification required before delivery.

If the change affects architecture, tenancy, RLS, permissions, audit, integrations, reporting, printing, background jobs, or core UI patterns, create or update an ADR before implementation.

## Where Code Belongs

Use the standard module shape from `docs/07-development/MODULE_STRUCTURE.md`.

- `domain`: business rules, invariants, value objects, statuses, transitions, calculations, domain errors, and domain events.
- `application`: use cases, workflow orchestration, validation coordination, permission checks, transactions, audit requests, and repository ports.
- `infrastructure`: repositories, Supabase/PostgreSQL access, storage, integrations, adapters, and mappers.
- `presentation`: React components, forms, tables, hooks, view models, and UI formatting.
- `routes`: thin server actions, API route handlers, and loaders that adapt Next.js to application services.

React components must not query Supabase directly, calculate authoritative business totals, assign final document numbers, or decide whether a business action is legal.

## Security Rules

Every backend entry point must:

- Resolve authenticated request context server-side.
- Enforce authorization server-side.
- Validate body, params, query, headers, cookies, and uploads with strict schemas.
- Verify tenant/company/branch/resource ownership for every referenced record.
- Use parameterized queries or safe repository methods.
- Return only the fields the UI or client needs.
- Use generic user-facing errors and safe logs.
- Write audit events for sensitive or business-critical mutations.

Never trust client-provided IDs, tenant IDs, branch IDs, totals, prices, statuses, permission claims, hidden fields, or file names.

Never use service-role credentials outside trusted backend code. Never expose secrets, stack traces, private metadata, or privileged data to the browser.

## Data, Performance, and Caching

Operational data must be bounded from the first implementation.

- Large lists require server-side pagination.
- High-volume search must be server-side and indexed.
- Repositories should avoid `select *` and return projections or read models.
- High-volume filters should include tenant scope and usually date/status/company/branch filters.
- Avoid N+1 queries and client-side aggregation over large datasets.
- Use keyset/cursor pagination for high-volume or frequently changing lists.
- Treat reports, exports, imports, print batches, sync, notifications, and AI jobs as separate workloads when they can be slow or repeated.

Cache only when the key, freshness, permission scope, and invalidation are explicit.

Cache keys must include tenant, company, branch, user, locale, feature flag, permission, role, or version dimensions when those values affect the result. Never share permission-sensitive cached data across users, tenants, companies, or branches.

## UI/UX Implementation

Nexora UI is operational software. It should be dense, clear, fast, and consistent.

- Use shared UI primitives from `src/shared/ui`.
- Follow the platform UX constitution and review gate in `docs/06-guidelines/`.
- Do not create competing shells, table systems, form systems, feedback systems, or report layouts.
- Use searchable lookups for large reference data.
- Keep form save/cancel behavior predictable.
- Preserve dirty state and warn before losing unsaved changes.
- Keep row actions stable and permission-aware.
- Ensure Arabic and English text fit without overlap or clipping.
- Verify loading, empty, error, pending, success, permission-denied, and responsive states.

Frontend permission checks improve usability only. Backend permission checks are mandatory.

## Developer-Readable Code Standard

Use names that describe business intent.

Prefer:

```ts
approvePurchaseOrder(...)
reserveStockForSalesOrder(...)
loadEmployeePayslipSummary(...)
```

Avoid vague names such as:

```ts
handleSubmit(...)
processData(...)
updateRecord(...)
```

Generic UI event names are acceptable inside tiny presentation components, but application/domain/infrastructure names must describe the business action.

Keep handoff simple:

- One responsibility per function.
- Explicit schemas for input.
- Explicit DTOs or result objects for output.
- Clear domain errors.
- Clear permission names.
- Clear data ownership checks.
- Tests near the behavior they protect.

## Delivery Checklist

Before finishing a change, verify:

- Typecheck passes.
- Lint passes when relevant.
- Unit, integration, or feature tests cover the risk.
- Backend authorization and ownership checks are present.
- Invalid input and unauthorized access fail securely.
- Queries are bounded and permission-scoped.
- Cache invalidation is correct or caching is intentionally avoided.
- UI states and responsive behavior are reviewed.
- No secrets, stack traces, internal metadata, or fake implementations were introduced.

## Handoff Format

When summarizing work, include:

- What changed.
- Main files or modules affected.
- Business workflow supported.
- Security and permission handling.
- Data fetching, performance, and cache behavior.
- UI states covered.
- Tests or checks run.
- Remaining risks.
