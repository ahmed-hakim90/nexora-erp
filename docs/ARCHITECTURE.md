# Nexora Platform Architecture

## Architecture Style

Nexora uses a Modular Monolith architecture in a single repository and a single Next.js App Router project.

The frontend and backend live in the same project, but they must be strictly separated by folder boundaries, import rules, and runtime expectations.

This architecture is chosen because Nexora needs:

- Strong domain boundaries without microservice operational overhead.
- Fast development across tightly related business modules.
- Shared transaction boundaries where needed.
- One deployment unit during the early and middle platform stages.
- A clear path to extract specific services later if business scale requires it.

The monolith must be modular by design, not by naming convention only.

## Architecture Decision Records

Major platform choices must be captured as Architecture Decision Records before implementation changes are made.

An ADR is required for:

- Changing the module layout.
- Adding a new platform capability.
- Introducing a new cross-module dependency.
- Introducing background jobs, queues, or external workers.
- Adding a new integration style.
- Changing RLS, RBAC, tenancy, or audit strategy.
- Extracting any service from the monolith.

ADR decisions must state the business problem, chosen approach, rejected alternatives, consequences, and migration impact.

## Architectural Layers

Every feature module should follow clean architecture principles:

- `domain`: business concepts, rules, invariants, statuses, value objects, and domain errors.
- `application`: use cases, orchestration, service layer, validation coordination, authorization checks, and transaction boundaries.
- `infrastructure`: repositories, Supabase/PostgreSQL access, external services, storage, integrations, and adapters.
- `presentation`: React components, forms, route-specific UI, table views, and client-side view models.

Dependencies must flow inward:

- Presentation may call route adapters, typed actions, API clients, and view/query hooks. It must not call application services directly from client components.
- Application may depend on domain contracts and repository interfaces.
- Infrastructure may implement application/domain contracts.
- Domain must not depend on application, infrastructure, React, Next.js, Supabase, or the file system.

Server Components may call server-side loaders or application entry points through module-owned server APIs. Client Components may only call browser-safe adapters.

## Repository Layout

The official high-level repository structure should be:

```text
src/
  app/
    (erp)/
      erp/
    (portal)/
      portal/
    api/
  core/
    boundaries/
    context/
    env/
    errors/
    logger/
    module/
    result/
  features/
    <feature-name>/
      domain/
      application/
      infrastructure/
      presentation/
      permissions/
      routes/
      public-api.ts
      module.manifest.ts
      tests/
  platform/
    auth/
    tenancy/
    branches/
    permissions/
    workflow/
    approvals/
    notifications/
    audit/
    numbering/
    files/
    localization/
    reporting/
    printing/
    observability/
  shared/
    ui/
    config/
    utils/
    testing/
  infrastructure/
    supabase/
    server/
```

This structure describes boundaries only. It does not authorize random shared folders or global dumping grounds.

Each feature must expose only intentional contracts through `public-api.ts` or route adapters. Importing private layer paths from another module is forbidden even if TypeScript path aliases make it technically possible.

`module.manifest.ts` must declare module identity, access experience, permissions, dependencies, navigation contributions, report contributions, print contributions, and feature flags. The manifest is metadata only; it must not execute business logic or database queries.

## App Router Structure

The Next.js App Router must represent access experiences, not business modules directly:

```text
src/app/
  (erp)/
    layout.tsx
    erp/
      page.tsx
      [...module-routes]/
  (portal)/
    layout.tsx
    portal/
      page.tsx
      [...portal-routes]/
  api/
    <server-endpoints>/
```

The `(erp)` route group owns the ERP Workspace shell. The initial shell route is `/erp`.

The `(portal)` route group owns the HR Self-Service Portal shell. The initial shell route is `/portal`.

Route groups must have separate layouts, navigation loaders, permission checks, query hydration rules, and module loading behavior.

The ERP and Portal route groups must not share layout-level providers that load ERP state for portal-only users. Shared providers are allowed only for neutral concerns such as theme, locale, and authenticated session display.

## Frontend Runtime Boundary

React components are presentation code only.

React components may:

- Render data.
- Capture user input.
- Call typed actions or hooks.
- Display validation errors.
- Coordinate local UI state.

React components must not:

- Query Supabase directly.
- Contain business rules.
- Construct financial calculations.
- Decide document numbering.
- Hardcode permissions.
- Hardcode tenant or branch filters.
- Mutate database records.
- Encode workflow or approval transitions.

## Backend Runtime Boundary

Backend code includes:

- Server Actions.
- API Route handlers.
- Application services.
- Use cases.
- Repository implementations.
- Supabase clients.
- PostgreSQL access.
- Storage adapters.
- Background job adapters when introduced.

Backend code must enforce:

- Authentication.
- Tenant context.
- Branch context where applicable.
- Permission checks.
- Input validation.
- Domain invariants.
- Audit logging.
- RLS-compatible data access.

Backend code must receive an explicit request context object containing authenticated user, tenant, company, branch, employee, locale, timezone, and correlation ID where available. This context must be resolved server-side and passed intentionally; it must not be reconstructed from UI state in deep services.

## Platform Runtime Entry Points

Platform runtime imports must use explicit boundaries:

- `src/platform/public-api.ts` exports universal, browser-safe contracts only.
- `src/platform/server.ts` exports server-only runtime services and imports `server-only`.
- `src/platform/client.ts` exports client-only UI services such as feedback notifications.

Client-only vendor adapters must stay behind platform client entry points. Sonner may only be imported by `src/platform/feedback/public-api.tsx`; all other code must use the platform feedback contract.

## Correlation Propagation Strategy

Every request receives a correlation ID from `x-correlation-id` when valid, otherwise the platform creates one. The correlation ID is diagnostic context, not authorization context.

Propagation uses the same value in these places:

- Response headers: set `x-correlation-id`.
- Background jobs: include `{ correlationId }` in job metadata.
- Outbox events: include `{ correlationId }` in event metadata.
- Audit logs: include `{ correlationId }` in the audit context.
- External calls: forward `x-correlation-id` as an outbound header.

The shared contracts live in `src/core/context/correlation-propagation.ts` and are re-exported through the universal platform API. They only shape headers and metadata; concrete job, outbox, audit, and HTTP adapters remain responsible for applying them.

## Transaction And Consistency Strategy

Enterprise workflows require clear transaction boundaries.

Application services must define transaction boundaries for:

- Posting financial documents.
- Creating inventory movements.
- Submitting and deciding approvals.
- Assigning document numbers.
- Publishing payslips.
- Creating audit-sensitive records.
- Cross-module operations that must succeed or fail together.

Rules:

- Document number assignment, document persistence, ledger entries, workflow transitions, and audit events must be committed atomically when they represent one business action.
- Cross-module side effects that do not need to be synchronous must use domain events or an outbox pattern when introduced.
- Notification delivery, export generation, and print rendering must not be part of the critical transaction unless the business action requires it.
- Application services must be idempotent where retries are possible.
- Concurrency-sensitive operations must use database constraints, transactions, or locking strategies, not UI disabling alone.

## Module Boundary Rules

Feature modules must not import another feature module's infrastructure or presentation code.

Allowed cross-feature interaction patterns:

- Use platform services for shared capabilities.
- Depend on explicit application contracts exposed by another module.
- Publish domain events for asynchronous or decoupled reactions.
- Use database foreign keys for stable cross-domain references when ownership is clear.

Every cross-feature dependency must be declared in the consuming module manifest. Undeclared dependencies are architecture violations.

Disallowed patterns:

- Importing repositories from another feature.
- Sharing mutable global state between features.
- Placing cross-module business logic in `shared`.
- Calling another module's UI components as business dependencies.
- Reusing types by moving every interface to a global `types` folder.
- Importing from another module's `domain`, `application`, `infrastructure`, `presentation`, `routes`, or `tests` folders unless that module exposes the contract explicitly.
- Creating circular dependencies between business modules.
- Allowing a platform module to depend on a business module.

## Platform Modules

Platform modules provide cross-cutting capabilities:

- Authentication and session context
- Tenant/company isolation
- Branch scoping
- Permission registry and RBAC
- Workflow definitions
- Approval routing
- Notification delivery
- Audit event capture
- Document numbering
- File attachment handling
- Localization and formatting
- Reporting infrastructure
- Printing infrastructure
- Observability

Platform modules must be generic enough to serve all business modules without absorbing their domain rules.

Platform modules may depend on other platform modules only through explicit contracts. Business modules may depend on platform modules, but platform modules must not import business module code.

## Multi-Tenant Strategy

Nexora must support multiple companies and tenants from the foundation.

Required concepts:

- `tenant_id`: the isolation boundary for data ownership.
- `company_id`: legal or operating company under a tenant.
- `branch_id`: operational location or branch under a company.
- `user_id`: authenticated identity.
- `employee_id`: HR/personnel identity when applicable.

Every tenant-owned business table must include `tenant_id`.

Company-owned tables must include `company_id`.

Branch-scoped tables must include `branch_id` when operations differ by location.

No tenant, company, or branch ID may be hardcoded in application code, UI code, SQL policies, seeds, or tests.

## Multi-Branch Strategy

Branches are operational scopes used by inventory, sales, procurement, POS, service center, HR attendance, and reporting.

Branch strategy must support:

- Users assigned to one or more branches.
- Documents created in a branch context.
- Inventory balances by warehouse/location, not only branch.
- Financial documents tied to company and optionally branch.
- Reports filterable by branch with permission enforcement.
- Cross-branch transfers with explicit source and destination.

Branch access is not a replacement for tenant isolation. It is a second-level authorization scope.

Branch context must be explicit for operational actions. If a user has access to multiple branches, the active branch must be selected or derived by a server-side rule before mutation. Ambiguous branch context must fail closed.

## Workflow Engine Strategy

Workflows should model business process states and transitions.

The workflow engine must support:

- Module-owned workflow definitions.
- Typed statuses from registries, not hardcoded strings.
- Transition guards.
- Permission-aware transitions.
- Approval requirements.
- Audit events for transitions.
- Optional notifications.
- Idempotent transition commands.
- Optimistic concurrency or version checks.
- Transition history.
- Guard failures with user-safe reasons.
- Terminal states that cannot be reopened unless the module explicitly allows it.

Workflow definitions must not live inside React components.

## Approval Engine Strategy

Approvals are a specialized workflow concern for documents and requests.

The approval engine must support:

- Approval policies by tenant, company, branch, module, document type, amount, role, and user.
- Single-step and multi-step approval.
- Delegation and manager-based routing.
- Approval, rejection, return-for-correction, and cancellation.
- Audit trails for every approval decision.
- HR manager approvals in the HR Self-Service Portal.
- Approver unavailability and delegation windows.
- Escalation policies.
- Prevention of self-approval where policy requires segregation of duties.
- Parallel and sequential approval steps.
- Reassignment with audit history.
- Idempotent approval decisions to handle retries and double clicks.

Approval rules must be data-driven and permission-aware.

Approval decisions must never be implemented as direct status updates. They must go through approval application services so policy, workflow, audit, notifications, and concurrency checks remain consistent.

## Notification Strategy

Notifications must be event-driven and permission-aware.

Supported channels may include:

- In-app notifications.
- Email.
- SMS or WhatsApp if integrated later.
- Push notifications if mobile apps are introduced later.

Notification generation must happen from application services, workflow events, approval events, or background jobs. UI components only display notification state.

Notification delivery must be retryable and idempotent. Failure to send a notification must not silently roll back a completed financial, inventory, payroll, or approval transaction unless the module explicitly defines notification delivery as a required part of the transaction.

## AI Automation Strategy

AI automation is a platform capability, not an authorization bypass.

AI actions must:

- Run under a real user or service identity.
- Respect tenant, company, branch, and permission context.
- Produce audit logs.
- Require approval for sensitive actions.
- Avoid direct writes unless routed through application services.
- Be explainable enough for business users to trust.

AI-generated suggestions and AI-executed actions must be clearly distinguished.

## Extraction Strategy

Nexora should stay a modular monolith until there is a real operational reason to extract a service.

Possible future extraction candidates:

- Reporting workloads.
- Print rendering.
- Notification delivery.
- AI automation execution.
- Integrations.
- Marketplace traffic.

Extraction must preserve the same module contracts and must not be used to fix poor internal boundaries.
