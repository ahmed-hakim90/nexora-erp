# Platform Freeze v1.0

Date: 2026-06-27

Status: Freeze-ready with warnings.

## Purpose

Platform Freeze v1.0 marks the point where Nexora Platform foundations are stable enough for business app development to begin. After this freeze, platform engines should only receive bug fixes, security hardening, documentation updates, or explicitly approved extensions.

## Accepted Platform Foundations

- Runtime, context, correlation, errors, logging, and result contracts.
- Identity, authenticated context, tenancy, app experience, and access surfaces.
- Security, RBAC, entitlements, data scopes, feature flags, and permission resolver contracts.
- Data ownership, RLS standards, migration standards, and repository context contracts.
- Party foundation.
- Audit and observability.
- UX foundation.
- App registry, navigation, and command contracts.
- Universal document engine.
- Event bus and event contracts.
- Workflow engine.
- Approval engine.
- Notification engine.
- Search engine.
- Background jobs engine.
- Reporting engine.
- Print template designer.
- Dashboard and analytics foundation.
- Import / export engine.
- Automation and AI governance foundation.
- Cost engine.
- Platform Review Fix Gate changes.

## Architecture Rules

- Platform engines are contract-first. Public contracts live under `src/platform/*/public-api.ts`.
- Provider-specific behavior belongs behind adapters. Public contracts must remain provider-neutral.
- Engines may depend on other engines only through public platform contracts and type-only imports where possible.
- Engines must not import business app code or feature modules.
- Business apps must consume platform contracts instead of reimplementing workflow, approvals, search, reporting, printing, dashboards, import/export, automation, AI governance, or costing locally.
- Heavy or retryable work must expose Background Jobs readiness metadata before runtime execution is introduced.

## Public API Rules

- Browser-safe contracts are exported from `src/platform/public-api.ts`.
- Public APIs should expose definitions, validation helpers, registry helpers, result contracts, security metadata, job readiness, and audit/telemetry metadata.
- Public APIs must not expose server-only persistence clients, secret-bearing adapters, or direct provider implementations.
- New public API exports after freeze require explicit platform extension approval.

## Server API Rules

- Server-only helpers are exported from `src/platform/server.ts`.
- Server modules must import `server-only` directly or be reachable only through server-only barrels.
- Server APIs may enforce permissions, validate commands, or coordinate repositories, but must not bypass the Security Engine or tenant/company/branch scope.
- Business apps should call server APIs through feature-level services/actions, not import private platform internals.

## Security Rules

- Every engine that can expose or mutate data must carry required permissions.
- Tenant, company, branch, data-scope, entitlement, feature-flag, sensitive-data, audit-required, approval-required, export-restriction, and PII metadata must stay explicit in contracts.
- Temporary elevation is a governed contract, not an implicit bypass.
- No print, report, export, automation, AI, cost, search, workflow, approval, or background job action may bypass the Security Engine.

## Data And RLS Rules

- Platform tables must be tenant-aware where relevant.
- RLS policies must avoid broad tenant-member access for sensitive platform engine tables.
- Permission-aware RLS policies introduced by the Review Fix Gate are the baseline for platform engine tables.
- Append-only audit/event/ledger/timeline tables must remain protected by database triggers.
- Soft delete and archive assumptions must remain part of query standards and RLS filters.

Real Supabase/Postgres validation is not currently run by the repository quality gate. The available gate is `npm run validate:migrations`, which performs repeatable static PL/pgSQL structure validation, plus platform tests that inspect critical RLS and permission policy text.

## Event And Outbox Rule

- The Platform Event Bus is the in-process domain and platform event contract.
- The Outbox and Integration layer is the durable external delivery boundary.
- Platform engines may publish or consume in-process events through the Event Bus.
- Only integration adapters or explicit durable-publish services should write durable outbox records.
- Engines must not treat in-process Event Bus publication as guaranteed external delivery.

## Background Job Readiness

The following heavy or retryable workloads expose job-readiness contracts:

- Reports: `report-generation`.
- Prints and future PDF rendering: `print-generation`.
- Dashboards and snapshots: dashboard snapshot contracts.
- Imports and exports: `import-export`.
- Automation runs: `automation`.
- AI action runs: `ai-task`.
- Cost allocation, snapshot, and recalculation: `cost-recalculation`.
- Search indexing: `search-indexing`.
- Notifications: `notification-delivery`.

Runtime workers remain future work unless explicitly implemented in a later approved phase.

## Engine Ownership

- Each platform engine owns its contracts, validation helpers, registry helpers, and metadata helpers.
- Business apps own business definitions and business adapters only.
- Cross-engine integration should use contract objects, event contracts, or job-readiness contracts rather than runtime coupling.
- Marketplace, SDK, and business app implementation are outside this freeze.

## Future Extension Rules

After Platform Freeze v1.0, extensions require one of:

- A bug fix for accepted platform behavior.
- A security or data-boundary hardening change.
- A documentation correction.
- An explicitly approved platform extension with tests and documentation.

New engines, business app functionality, Marketplace runtime, SDK runtime, AI provider execution, connector execution, and UI builders are not part of the freeze baseline.

## Freeze Warnings

- Migrations are statically validated only; no live Supabase/Postgres migration execution was available in the repository gate.
- Several late-stage engines are contract foundations, not runtime implementations.
- The working tree contains many accepted sprint changes that should be committed together or split into approved platform commits before tagging.

## Recommended Tag

`platform-v1.0.0-freeze`
