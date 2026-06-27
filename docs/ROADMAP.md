# Nexora Platform Roadmap

## Roadmap Purpose

This roadmap defines the recommended order for building Nexora from zero into a modular enterprise business platform.

The roadmap intentionally starts with platform foundations before business modules. ERP, HR, inventory, accounting, manufacturing, POS, marketplace, rental, service center, and AI automation must be built on stable architecture rather than rushed CRUD screens.

## Phase 0: Architecture Foundation

Goal: establish the non-negotiable architecture rules.

Deliverables:

- Next.js App Router project foundation.
- Strict TypeScript configuration.
- Tailwind CSS and shadcn/ui setup.
- Feature-based folder structure.
- ERP Workspace route group.
- HR Self-Service Portal route group.
- Platform folder boundaries.
- Shared UI and utility boundaries.
- Import rules.
- Linting and formatting.
- Testing baseline.
- Architecture Decision Record process.
- Boundary enforcement strategy.
- Server-only and client-safe import conventions.

Exit criteria:

- Frontend/backend separation is enforceable.
- No Supabase queries are possible from UI patterns.
- ERP and Portal layouts are structurally separate.
- The repository has no random shared, services, or types dumping grounds.
- Module manifests and public API conventions are defined.
- Import boundary violations can be detected manually and later automated.

## Phase 1: Platform Security Foundation

Goal: establish identity, tenancy, permissions, and database safety.

Deliverables:

- Supabase project configuration.
- Authentication integration.
- Tenant, company, and branch data model.
- User profile model.
- Employee identity link.
- Role and permission registry.
- User assignment model.
- RLS helper functions.
- Baseline RLS policies.
- Permission-checking application services.
- Audit logging foundation.
- Module entitlement model.
- Segregation-of-duties policy foundation.
- Default-deny RLS template.
- Permission and assignment effective dating.

Exit criteria:

- Tenant isolation works.
- Branch scope works.
- Permission checks work server-side.
- HR self-service users cannot access ERP data.
- Audit logs capture security-sensitive changes.
- Insert and update RLS policies use `WITH CHECK`.
- Service-role usage is isolated behind reviewed platform adapters.
- Permission, entitlement, and data scope concepts are separate.

## Phase 2: Platform Experience Shells

Goal: create the two access experiences without business modules.

Deliverables:

- ERP Workspace shell.
- HR Self-Service Portal shell.
- Permission-filtered navigation infrastructure.
- Module registry infrastructure.
- Localization foundation.
- RTL/LTR layout support.
- Dark/light theme support.
- User preference handling.
- Basic notification shell.

Exit criteria:

- ERP users load ERP shell only when authorized.
- Portal-only users load portal shell only.
- Portal does not load ERP navigation, reports, or module registry.
- Arabic and English layout assumptions are validated.

## Phase 3: Core Platform Engines

Goal: build reusable engines before business documents depend on them.

Deliverables:

- Workflow engine.
- Approval engine.
- Notification engine.
- Document numbering service.
- File attachment service.
- Report infrastructure.
- Print infrastructure.
- Background job strategy or adapter.
- Observability baseline.
- Transaction and idempotency conventions.
- Outbox/event strategy decision for asynchronous side effects.
- Background job failure and retry model.

Exit criteria:

- Modules can define workflows and approvals.
- Document numbers are transaction-safe.
- Attachments are tenant-safe and permission-checked.
- Reports and printing have server-side patterns.
- Sensitive actions produce audit logs.
- Official print snapshots are supported.
- Heavy reports and print batches have asynchronous execution paths.
- Workflow and approval engines handle concurrency and duplicate submissions.

## Phase 4: HR Self-Service Foundation

Goal: support the largest user population with narrow, high-performance workflows.

Initial portal capabilities:

- My Profile.
- My Attendance.
- My Leave Requests.
- My Loan Requests.
- My Penalties.
- My Payslips.
- My Documents.
- My Approvals if manager.

Foundation requirements:

- Employee-owned RLS policies.
- Manager approval scoping.
- Portal-specific permissions.
- Portal-specific navigation.
- Lightweight data loading.
- Sensitive HR audit rules.
- Portal-only bundle and data dependency review.
- Employee ownership and manager approval RLS tests.

Exit criteria:

- Employee users can self-serve without ERP access.
- Managers can see assigned approvals only.
- Payroll and HR sensitive data are protected.
- Portal performance is independent of ERP module complexity.
- Users with both ERP and Portal access receive experience-specific scopes.

## Phase 5: Finance And Commercial Backbone

Goal: establish the financial and commercial records that many modules depend on.

Sprint 5 starts this phase with the Master Data Foundation only. See `docs/SPRINT5_MASTER_DATA.md`.

Recommended module order:

1. Accounting foundation.
2. Customer and supplier master data.
3. Product master data.
4. Sales foundation.
5. Procurement foundation.
6. Inventory foundation.

Deliverables:

- Chart of accounts strategy.
- Customer and supplier models.
- Product and unit models.
- Tax and pricing foundation where applicable.
- Sales document workflow.
- Procurement document workflow.
- Inventory movement ledger.
- Warehouse and location model.
- Report and print definitions.
- Ledger immutability rules.
- Scoped uniqueness for business numbers and master data.
- Closed-period reporting strategy.

Exit criteria:

- Financial and inventory movements are auditable.
- Document numbers and statuses use platform services.
- Reports do not rely on browser aggregation.
- Printing uses server-supported templates and snapshots.
- Financial and inventory corrections use reversal or adjustment records instead of hidden edits.
- Official document numbering is transaction-safe.

## Phase 6: Operational ERP Modules

Goal: expand into deeper operational domains.

Sprint 12 starts this phase with the Manufacturing Foundation only. It creates minimal Employee Core, factory structure, employee-backed manufacturing profiles, line assignment foundations, product-line production standards, BOM headers/lines, routing headers/steps, manufacturing settings, permissions, RLS, and generic durable manufacturing events. Production Sessions remain the future source of truth for execution; Daily Production Reports, worker performance, attendance, supervisor performance, plan progress, and work order progress will be derived later from Production Sessions.

Sprint 12 intentionally does not implement Production Sessions, Daily Production Reports, Work Orders, Production Planning, inventory posting, material consumption, finished goods output, HR payroll, or HR attendance.

Candidate modules:

- Manufacturing.
- Advanced warehouse operations.
- Service Center.
- CRM.
- POS.
- Rental Management.

Requirements for each module:

- Module permissions.
- Workflow definitions.
- Approval policies.
- RLS policies.
- Audit events.
- Report strategy.
- Print strategy.
- Performance review.
- Integration contracts with finance, inventory, and customers.
- Module manifest.
- Declared dependency types.
- Transaction boundaries.
- Idempotency and concurrency rules.
- Search, pagination, and index plan.

Exit criteria:

- Each module can be enabled independently.
- Cross-module interactions use contracts or platform services.
- No module reaches into another module's private infrastructure.
- Reports and print jobs use platform infrastructure instead of module-specific shortcuts.

## Phase 7: Marketplace And External Integrations

Goal: support external channels without weakening the ERP core.

Deliverables:

- Integration identity and credentials model.
- Webhook infrastructure.
- API route standards.
- External order ingestion.
- Marketplace product publishing strategy.
- Integration audit logs.
- Rate limiting and retry handling.
- Failure dashboards.
- Webhook signature verification.
- Replay protection.
- Idempotency keys.
- Tenant mapping controls.

Exit criteria:

- External integrations cannot bypass permissions, validation, or audit.
- Marketplace traffic is isolated from core operational workflows.
- Failed integrations are recoverable and visible.
- Integration writes go through application services.

## Phase 8: AI Automation

Goal: introduce AI assistance under enterprise governance.

Deliverables:

- AI action registry.
- AI permission model.
- AI audit trail.
- Human approval gates.
- Suggestion vs execution distinction.
- Safe service-layer execution.
- Prompt and output retention policy.
- Sensitive data controls.
- AI action idempotency and approval model.
- AI context scoping by tenant, company, branch, user, and permission.

Candidate capabilities:

- Draft document creation.
- Report explanation.
- Anomaly detection.
- Approval recommendations.
- Customer service summaries.
- Inventory replenishment suggestions.

Exit criteria:

- AI cannot bypass permissions.
- AI cannot write directly to the database.
- Sensitive AI actions are auditable.
- Human approval is required where risk demands it.
- AI actions go through application services and create audit records.

## Phase 9: Scale And Hardening

Goal: prepare the platform for heavier usage, larger tenants, and long-term operations.

Deliverables:

- Query performance review.
- Index review.
- RLS performance review.
- Report optimization.
- Print job optimization.
- Backup and restore testing.
- Security review.
- Permission review.
- Accessibility review.
- Localization review.
- Observability dashboards.
- Load testing for portal and ERP route groups.
- Report and print queue testing.
- Backup restore drill.
- Tenant data export/recovery assessment.

Exit criteria:

- Heavy reports are controlled.
- Heavy printing is controlled.
- Portal remains fast for employee traffic.
- ERP remains responsive for operational users.
- Audit logs are complete for sensitive workflows.
- RLS policy performance is measured with realistic assignments.
- Search and list queries have reviewed execution plans.

## Continuous Practices

Every phase must maintain:

- Strict TypeScript.
- Clean architecture boundaries.
- Repository pattern.
- Service layer.
- Domain rules.
- RLS policies.
- Permission registries.
- No business logic in React components.
- No Supabase queries in UI components.
- No hardcoded permissions, tenant IDs, branch IDs, or statuses.
- Arabic and English readiness.
- RTL and LTR readiness.
- Dark and light mode readiness.
- Module manifests.
- Explicit request context.
- Transaction boundaries for sensitive actions.
- Idempotency for retryable actions.
- Default-deny RLS.
- Report and print workload separation.

## Module Readiness Checklist

A module is ready to build only when:

- Business purpose is defined.
- Access experience is defined: ERP, Portal, or both.
- Tenant, company, branch, and employee scope are defined.
- Permissions are registered.
- Statuses are registered.
- Workflow is defined.
- Approval policy is defined if needed.
- Audit rules are defined.
- Document numbering is defined if needed.
- File attachment rules are defined if needed.
- Reports and print requirements are defined.
- RLS strategy is defined.
- Performance risks are identified.
- Tests are planned.
- Module manifest is planned.
- Dependency type is declared.
- Transaction and idempotency needs are defined.
- RLS test cases are defined.
- Search and index plan is defined.

## Stop Condition For Initial Mission

The initial mission ends after blueprint documentation is created.

Do not create ERP modules yet.

Do not create UI screens yet.

Do not implement business features yet.
