# Module Guidelines

## Purpose

Nexora is a modular enterprise platform. Modules must be designed as durable business capabilities, not as isolated CRUD pages.

This document defines how core platform modules and business modules should be introduced, owned, integrated, and reviewed.

## Module Types

Nexora has two module categories:

- Platform modules.
- Business modules.

Platform modules provide shared capabilities used by the system.

Business modules implement operational domains for customers.

## Platform Modules

Platform modules include:

- Identity
- Tenancy
- Companies
- Branches
- Permissions
- Workflow
- Approvals
- Notifications
- Audit
- Document numbering
- File attachments
- Localization
- Reporting
- Printing
- Document engine
- Search engine
- Export engine
- Background jobs
- Observability
- Integration foundation
- AI automation governance

Platform modules must remain domain-neutral. For example, the approval engine may know how to approve a document, but the sales module owns what a sales invoice means.

## Business Modules

Business modules include:

- HR
- Payroll
- Attendance
- Accounting
- Sales
- Procurement
- Inventory
- Manufacturing
- CRM
- POS
- Service Center
- Marketplace
- Rental Management
- AI Automation

Business modules own their own domain terms, rules, use cases, permissions, statuses, and data access.

AI Automation may exist as a business-facing module, but AI execution governance remains a platform capability. Business modules may request AI assistance through platform contracts only.

## Module Ownership

Each module must have a clear owner and boundary.

A module owns:

- Its domain vocabulary.
- Its tables and migrations.
- Its permissions.
- Its statuses.
- Its workflows.
- Its application services.
- Its repositories.
- Its presentation components.
- Its reports and print templates.
- Its tests.
- Its module manifest.
- Its public contracts.
- Its migration and RLS policies.

No module may silently depend on another module's private implementation.

## Module Contracts

When modules interact, the dependency must be explicit.

Allowed interaction patterns:

- Application-level public APIs.
- Platform services.
- Domain events.
- Stable database references when ownership is clear.
- Read models designed for cross-module reporting.
- Declared module dependencies through `module.manifest.ts`.
- Outbox/domain events for asynchronous reactions when introduced.

Disallowed interaction patterns:

- Importing another module's repositories.
- Importing another module's private components.
- Sharing business rules through `shared`.
- Reaching into another module's database tables from random services.
- Duplicating status or permission meanings.
- Circular dependencies.
- Platform modules importing business modules.
- Report queries that become hidden cross-module business logic without ownership.

## Module Dependency Types

Dependencies must be classified:

- `platform`: dependency on a platform capability.
- `reference`: stable reference to another module's master data.
- `workflow`: dependency through workflow or approval contracts.
- `reporting`: read-only dependency for report models.
- `event`: asynchronous dependency through domain events.

Direct synchronous dependencies between business modules must be minimized and justified.

## Core Platform Capabilities

### Workflow Engine

The workflow engine provides status transition infrastructure.

It must support:

- Module-defined workflows.
- Transition guards.
- Permission checks.
- Audit logging.
- Approval hooks.
- Notification hooks.
- Optimistic concurrency or version checks.
- Transition history.
- Terminal status handling.
- Idempotent command handling.

The module still owns its business meaning and valid statuses.

Sprint 3 implements the workflow engine as a generic platform package under `src/platform/workflow`. It provides workflow definitions, transition validation, guard contracts, hook contracts, and transition history storage. It does not define business workflows.

### Approval Engine

The approval engine provides approval routing and decision tracking.

It must support:

- Policy-based approvers.
- Manager-based approvers.
- Role-based approvers.
- Amount or risk-based thresholds.
- Delegation.
- Multi-step approvals.
- Audit events.
- Delegation with start and end dates.
- Escalation.
- Sequential and parallel steps.
- Reassignment.
- Self-approval prevention when policy requires it.
- Idempotent decisions.

Approvals must be enforced by application services, not by UI buttons.

Sprint 3 implements the approval engine as a generic platform package under `src/platform/approvals`. It supports policy shape, sequential and parallel approval metadata, delegation metadata, escalation metadata, reassignment metadata, cancellation, history, snapshots, and self-approval prevention. It is not connected to HR, purchase, or any business process yet.

### Notification Engine

Notifications are triggered from application events.

The engine must support:

- In-app notifications.
- User and role targeting.
- Tenant and branch scoping.
- Localization.
- Read/unread state.
- Future channels such as email, SMS, WhatsApp, or push.

Sprint 3 adds notification templates and outbox foundations only. No delivery providers are implemented.

### Document Numbering

The numbering module must provide transaction-safe document numbers.

It must support:

- Tenant sequences.
- Company sequences.
- Branch sequences.
- Fiscal year sequences.
- Module and document type prefixes.
- Preview or draft behavior where permitted.
- Void/cancel tracking for official numbers.
- Gap policy by document type.
- Concurrency protection.

Sprint 3 adds generic numbering sequence definitions and persistence. Actual reservation must remain transaction-safe when future business modules request official numbers.

### File Attachments

The file module must provide secure file metadata and storage rules.

It must support:

- Tenant-safe storage paths.
- Permission-checked downloads.
- Module and entity ownership.
- Sensitive document classification.
- Retention rules.

Sprint 3 adds generic attachment metadata and versioning foundations. Storage providers and scanning are still future platform work.

### Audit

The audit module records sensitive business actions.

It must support:

- Actor identity.
- Tenant, company, and branch context.
- Module and entity reference.
- Action type.
- Before and after values when appropriate.
- Request metadata.
- AI action attribution.
- Tamper-resistant append behavior.
- Audit correlation IDs.
- Before/after snapshots for high-risk changes.

### Reporting

The reporting module must provide controlled access to heavy data.

It must support:

- Report registry.
- Permission checks.
- Filter validation.
- Async report jobs.
- Export jobs.
- Result retention.
- Tenant-safe caching.
- Reproducibility rules for official reports.

### Document Engine

The document engine provides the common abstraction for future business documents.

It supports:

- Document number.
- Document type.
- Status.
- Workflow link.
- Approval link.
- Attachments.
- Comments.
- Audit timeline references.
- Print and export capabilities.
- Metadata.

Sprint 3 creates only generic document records and comments. It does not create invoices, work orders, HR requests, inventory documents, or accounting documents.

### Printing

The printing module must provide controlled document rendering.

It must support:

- Template registry.
- Template versioning.
- Print snapshots.
- Batch print jobs.
- Reprint audit.
- Arabic and English rendering.
- RTL and LTR layouts.

### Search

The search engine provides module registration and searchable entity metadata.

Sprint 3 supports quick-search contracts, ranking strategy metadata, and future full-text integration points. No business entity is registered yet.

### Export

The export engine provides background export abstractions for Excel, PDF, CSV, and print.

Sprint 3 defines export request contracts and export job persistence only. No concrete exporter is implemented.

### Background Jobs

The background job foundation provides retry, idempotency, schedule, progress, cancellation, and logging metadata.

Sprint 3 creates the generic job table and validation contracts only. No concrete jobs are implemented.

## ERP Workspace Module Rules

ERP Workspace modules may expose:

- Operational navigation.
- Dashboards.
- Document lists.
- Approval queues.
- Reports.
- Printing.
- Administrative configuration where allowed.

ERP modules must be permission-filtered and branch-aware.

ERP modules must not be loaded for HR self-service-only users.

## HR Self-Service Module Rules

The HR Self-Service Portal exposes only employee-owned and assigned approval capabilities.

Portal modules must:

- Be lightweight.
- Avoid loading ERP shell code.
- Avoid ERP report metadata.
- Enforce employee ownership.
- Support manager approvals only where assigned.
- Respect HR data sensitivity.

Portal screens are not simplified ERP screens. They are a separate access experience.

## Reporting Module Rules

Every business module that requires reports must define:

- Report purpose.
- Required permissions.
- Filters.
- Tenant/company/branch scope.
- Data source.
- Expected volume.
- Export support.
- Print support.
- Sensitivity classification.
- Whether the report is interactive or asynchronous.
- Maximum allowed date range for interactive use.
- Indexing or summary table requirements.
- Closed-period reproducibility requirements.

Reports must not load unbounded datasets into the browser.

## Printing Module Rules

Every printable document must define:

- Template owner.
- Required print permission.
- Data snapshot rules.
- Language support.
- RTL/LTR behavior.
- Reprint policy.
- Audit requirement.
- Versioning strategy.
- Snapshot fields.
- Batch printing behavior.
- Failure and reprint behavior.

Printing is a backend-supported capability, not a browser-only screenshot.

## AI Automation Module Rules

AI automation must operate through platform-approved services.

AI automation must:

- Respect permissions.
- Respect tenant and branch scope.
- Produce audit logs.
- Require approval for sensitive actions.
- Explain suggested actions where practical.
- Avoid direct database writes.
- Carry actor, tenant, company, branch, and permission context.
- Distinguish suggestion, draft, and execution modes.
- Support human approval gates for sensitive actions.

AI-generated work must not bypass workflow, approval, or posting rules.

## How To Add A New Module Safely

Before implementation:

1. Define the module's business purpose.
2. Identify whether it belongs in ERP Workspace, HR Portal, or both.
3. Define tenant, company, branch, and employee scope.
4. Define permissions.
5. Define statuses and workflows.
6. Define approval requirements.
7. Define audit requirements.
8. Define document numbering needs.
9. Define attachment needs.
10. Define reporting and printing needs.
11. Define integration points with other modules.
12. Define expected data volume and indexes.
13. Define module dependencies and dependency type.
14. Define transaction boundaries and idempotency requirements.
15. Define RLS policy tests.
16. Define report and print execution mode.

During implementation:

1. Build domain rules first.
2. Build application services.
3. Build repository interfaces.
4. Implement infrastructure repositories.
5. Add route adapters.
6. Add UI presentation.
7. Add RLS policies.
8. Add tests.
9. Add reports and printing through platform services.
10. Add observability for slow queries, background jobs, and sensitive operations.

Release gate:

- Permissions registered.
- Statuses registered.
- RLS enabled and tested.
- Tenant and branch scope enforced.
- HR portal separation preserved.
- Audit rules implemented.
- Report and print performance reviewed.
- Module manifest complete.
- Cross-module dependencies declared.
- Transaction boundaries documented.
- Background jobs have retry and idempotency strategy where used.
