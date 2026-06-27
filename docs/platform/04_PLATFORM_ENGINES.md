# Platform Engines

Platform engines are reusable, domain-neutral capabilities consumed by apps through public contracts. Engines must not import business app code.

## Engine Rules

- Engines expose stable public contracts.
- Engines may depend on Platform Core and other platform engines only through explicit contracts.
- Engines must be tenant, company, branch, employee, experience, permission, and audit aware where relevant.
- Engines must support correlation IDs and platform logging.
- Engines must separate browser-safe contracts from server-only services.
- Engines must not contain app-specific business rules.

## Required Engines

## Audit And Observability Engine

Purpose: trace sensitive actions and measure platform health.

Responsibilities:

- Audit user, service, integration, automation, and AI actors.
- Record security, app lifecycle, workflow, approval, print, export, connector, and AI events.
- Provide correlated logs and telemetry contracts.
- Support retention, reporting, and operational visibility.

## Testing Engine And Quality Gates

Purpose: provide standard test contracts for platform engines and apps.

Responsibilities:

- RLS, permission, workflow, approval, performance, and E2E test scenarios.
- Test data factories for tenants, companies, branches, users, roles, permissions, entitlements, documents, and sandbox data.
- CI release gates for platform correctness.

## Workflow Engine

Purpose: own reusable status transition behavior.

Responsibilities:

- Workflow definitions, states, transitions, guards, hooks, history, terminal states, version checks, idempotent commands, and user-safe guard failures.

## Approval Engine

Purpose: own reusable approval policy and decision behavior.

Responsibilities:

- Policies, steps, routing, delegation, escalation, reassignment, self-approval prevention, approval queues, decision audit, and idempotent decisions.

## Universal Document Lifecycle Engine

Purpose: provide document shells, lifecycle commands, numbering, timeline, comments, files, references, print/export hooks, and snapshots.

Responsibilities:

- Draft, submit, approve, reject, return, post, cancel, close, reverse, archive, and reprint lifecycle concepts where applicable.
- Transaction-safe numbering.
- Tenant-safe file metadata and document references.
- Company branding handoff for official outputs.

## Universal Search Engine

Purpose: make search a central UX and navigation surface.

Responsibilities:

- Search provider registration, searchable entity metadata, permission filtering, scoped queries, ranking, recent records, and high-volume indexing strategy.

## Notification Engine

Purpose: provide reusable communication for workflows, approvals, automations, connectors, and user activity.

Responsibilities:

- Notification templates, in-app notifications, recipient resolution, role/user/approver targeting, read state, delivery outbox, retries, and future external channels.

## Reporting Engine And Universal Report Builder

Purpose: make reports controlled platform workloads.

Responsibilities:

- Report registry, datasets, builder schema, filters, permissions, interactive execution, async generation, exports, result storage, cache and retention, branding, localization, and reproducibility metadata.

## Printing Engine And Print Template Designer

Purpose: provide official document rendering and template governance.

Responsibilities:

- Template registry, template versions, designer schema, print snapshots, PDF generation contract, batch jobs, reprint audit, RTL/LTR, localization, branding slots, and template publishing lifecycle.

## Background Jobs, Outbox, And Async Processing

Purpose: separate heavy and retryable workloads from interactive requests.

Responsibilities:

- Job definitions, queue contracts, retries, idempotency keys, progress, cancellation, dead letters, durable outbox, and execution paths for reports, prints, exports, imports, notifications, connectors, and AI.

## Import And Export Engine

Purpose: provide governed data movement.

Responsibilities:

- Import definitions, file validation, previews, row issues, idempotency, background processing, export definitions, export permissions, result files, and failure recovery.

## Integration And Connector Engine

Purpose: connect external systems without weakening platform controls.

Responsibilities:

- Connector registry, API versions, inbound APIs, outbound webhooks, credentials, signature verification, replay protection, rate limiting, tenant mapping, retries, dead letters, and health dashboards.

## Cost Engine

Purpose: centralize costing and valuation facts.

Responsibilities:

- Cost policies, valuation methods, cost layers, cost event processing, landed cost allocation, manufacturing cost rollup, variance tracking, closed-period reproducibility, and accounting/reporting integration contracts.

## Universal Dashboard Builder And Analytics Surface

Purpose: provide governed role-aware dashboards and KPI workspaces.

Responsibilities:

- Widget registry, dashboard definitions, builder schema, saved layouts, role/user/team dashboards, drilldowns, refresh policies, tenant-safe caching, app-provided widgets, branding, and mobile layouts.

## Automation And AI Governance Engine

Purpose: allow automation and AI assistance without bypassing enterprise controls.

Responsibilities:

- Automation triggers, scheduled automations, event-driven automations, AI action registry, suggest/draft/execute modes, approval gates, permission and data-scope enforcement, prompt/context policy, audit, and idempotency.

## File Engine

Purpose: provide tenant-safe file metadata and future storage governance.

Responsibilities:

- Storage metadata, permissions, retention, versioning, virus-scan readiness, attachment links, and lifecycle policies.

## Settings, Localization, Theme, Branding, And Feature Flags

Purpose: provide cross-app configuration, user preferences, formatting, and official company identity.

Responsibilities:

- Tenant, company, branch, app, and user settings.
- Feature flags.
- Locale, direction, date/number/currency/quantity/timezone formatting.
- Company branding for shells, dashboards, reports, print templates, documents, and notifications.
