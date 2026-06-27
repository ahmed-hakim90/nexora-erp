# Backend And Frontend Separation

## Purpose

Nexora uses one Next.js project for frontend and backend code, but the two must remain strictly separated.

The goal is to keep React components focused on experience and keep business logic, database access, permissions, workflows, and audit behavior on the server side.

## Separation Principle

Same repository does not mean same layer.

Frontend code renders and collects intent.

Backend code validates, authorizes, executes, persists, audits, and returns results.

The separation must be enforceable by project structure and import rules, not maintained by developer memory.

## Frontend Responsibilities

Frontend code may:

- Render pages, layouts, dialogs, and forms.
- Use shadcn/ui and Tailwind CSS.
- Use React Hook Form for form state.
- Use Zod schemas for client-side validation hints when shared safely.
- Use TanStack Query if needed for client-side cache coordination.
- Call typed Server Actions.
- Call typed API clients.
- Display permission-filtered navigation supplied by server loaders.
- Display localized text.
- Support RTL, LTR, dark mode, and light mode.

Frontend code must not:

- Query Supabase directly.
- Import repository implementations.
- Import server-only clients.
- Contain business rules.
- Decide approval paths.
- Generate document numbers.
- Hardcode permissions.
- Hardcode tenant IDs.
- Hardcode branch IDs.
- Hardcode statuses.
- Perform financial, payroll, inventory, or tax calculations as source of truth.
- Import files marked server-only.
- Read service-role environment variables.
- Build SQL filters or RLS assumptions.

## Backend Responsibilities

Backend code must:

- Authenticate the user.
- Resolve tenant, company, branch, and employee context.
- Validate inputs.
- Check permissions.
- Execute domain rules.
- Coordinate use cases.
- Use repositories for data access.
- Respect RLS.
- Write audit logs.
- Trigger workflows and approvals.
- Trigger notifications.
- Generate document numbers.
- Prepare report data.
- Prepare print snapshots.
- Enforce idempotency for retryable mutations.
- Enforce optimistic concurrency or version checks for sensitive documents.

## Request Context

Every backend entry point must resolve a request context before calling application services.

The context should include:

- Authenticated user ID.
- Tenant ID.
- Company ID when selected or required.
- Branch ID when selected or required.
- Employee ID when linked.
- Experience: ERP Workspace or HR Portal.
- Locale and text direction.
- Timezone.
- Correlation ID.
- Actor type: user, service, integration, or AI agent.

Application services must accept context explicitly. They must not read cookies, headers, route params, or browser state directly.

Sprint 2 server-only context helpers live under platform server entry points:

- `src/platform/auth/server.ts`
- `src/platform/tenancy/server.ts`
- `src/platform/permissions/server.ts`
- `src/platform/audit/server.ts`

These files may use request-scoped Supabase clients. Browser-safe `public-api.ts` files must not export request-scoped clients, service-role clients, audit writers, or permission guards.

## Allowed Communication Patterns

Frontend may communicate with backend through:

- Server Actions for most mutations.
- API Routes for integrations, webhooks, file endpoints, or external HTTP needs.
- Server-side loaders for page data.
- Typed query functions for TanStack Query when client-side fetching is justified.

Every communication path must have:

- Input validation.
- Authentication handling.
- Permission checks.
- Typed success and error results.
- No leaked database implementation details.
- Correlation ID propagation.
- Consistent error normalization.

## Server Actions

Server Actions should be thin adapters.

They should:

- Parse input.
- Resolve request context.
- Call an application service.
- Return a typed result.
- Avoid embedding business logic directly.

They should not:

- Contain large workflows.
- Query Supabase directly unless they are a tiny platform adapter approved by architecture.
- Duplicate domain rules.
- Return raw database rows to UI.
- Call another module's private infrastructure.
- Use service-role access for user-initiated actions unless an approved platform adapter re-applies authorization.

## API Routes

API Routes should be used when an HTTP boundary is needed:

- Webhooks.
- External integrations.
- File download or upload flows.
- Public callbacks.
- Mobile clients if introduced.
- Long-running report status endpoints.

API Routes follow the same rules as Server Actions: validate, authorize, call services, return typed results.

Public or webhook API Routes must additionally verify signatures, rate limits, idempotency keys, tenant mapping, and replay protection where applicable.

## Data Loading

Page loaders should return view-ready data, not raw database tables.

Rules:

- ERP layouts load ERP navigation only for ERP-authorized users.
- Portal layouts load only HR self-service navigation.
- Portal users must not load ERP reports or module metadata.
- Server loaders may call application services or read models.
- Heavy report data must use report services, pagination, background generation, or export jobs.
- Layout loaders must not fetch high-volume business data.
- Navigation loaders must return metadata only, not business records.

## Supabase Usage

Supabase clients are server-only unless explicitly used for safe client capabilities such as auth session helpers approved by architecture.

Supabase query code belongs in:

- `src/features/<feature>/infrastructure`
- `src/platform/<capability>/infrastructure`

Supabase query code does not belong in:

- React components.
- Form components.
- Client hooks.
- Page components.
- Random shared utilities.

Supabase service-role clients must be isolated in platform infrastructure and must never be exported through feature modules. User-scoped Supabase clients must remain subject to RLS.

## DTOs And View Models

Do not expose database rows directly to UI.

Use:

- Command DTOs for mutations.
- Query DTOs for backend responses.
- View models for presentation-specific shapes.
- Domain models for business rules.

Mapping between database rows and domain/application objects belongs in infrastructure mappers.

DTOs returned to UI must be intentionally shaped, localized where appropriate, and stripped of internal fields such as raw permission assignments, service metadata, RLS helper fields, and audit internals.

## Error Handling

Backend errors should be normalized before reaching UI.

Error categories:

- Validation error.
- Authentication error.
- Authorization error.
- Not found.
- Conflict.
- Business rule violation.
- Rate limit or operational error.
- Unexpected error.

UI should display user-safe messages and must not expose SQL errors, RLS policy internals, stack traces, or service-role details.

Backend errors must preserve internal diagnostic details through logs or correlation IDs without sending those details to the browser.

## Experience Separation

ERP Workspace and HR Self-Service Portal must be separated at the route group, layout, navigation, data loading, and permission level.

ERP Workspace:

- Loads ERP shell.
- Loads ERP module registry.
- Loads ERP navigation filtered by permission.
- Supports cross-module workflows and reports when authorized.

HR Self-Service Portal:

- Loads portal shell.
- Loads only self-service navigation.
- Loads employee-owned data and assigned approvals.
- Does not load ERP module registry or ERP report metadata.

Any module that contributes to both experiences must provide separate portal and ERP route adapters and view models. Reusing ERP screens inside the portal is forbidden unless the data contract proves it only loads portal-allowed fields.

## Client State Strategy

Client state should be used for UI concerns:

- Open dialogs.
- Current tabs.
- Form draft state.
- Table sorting and filters.
- Optimistic UI where safe.

Client state must not become the authoritative store for:

- Permissions.
- Tenant context.
- Workflow status.
- Inventory balances.
- Financial values.
- Approval state.

## TanStack Query Strategy

TanStack Query may be used when:

- Client-side refetching improves UX.
- Data is read-heavy and permission-filtered by server endpoints.
- Pagination, search, or background refresh is needed.

It must not be used to bypass server loaders, permissions, RLS, or service-layer rules.

Query keys must include tenant, company, branch, locale, and filter dimensions when those dimensions affect the result. Cached data must be cleared or partitioned when the active tenant, company, branch, or experience changes.

## Import Guardrails

Recommended import conventions:

- Client components may import `presentation`, `shared/ui`, and typed client adapters.
- Server components may import loaders and server-safe application entry points.
- Application code may import domain and platform contracts.
- Infrastructure imports database clients and implements repositories.

Forbidden:

- Client code importing `infrastructure`.
- Client code importing server-only Supabase clients.
- Presentation importing repository implementations.
- Domain importing anything outside domain-safe utilities.
- Browser code importing `src/platform/*/infrastructure`.
- Browser code importing `src/features/*/application` unless the exported item is explicitly browser-safe DTO/schema data.
- Any code path that exposes service-role credentials to the client bundle.

## Boundary Enforcement

When implementation begins, use tooling to enforce boundaries:

- TypeScript path aliases that distinguish public and private imports.
- ESLint restricted-import rules for layers.
- `server-only` markers for server modules.
- Code review checks for route group separation.
- Tests or static checks for forbidden imports.

Boundary failures are architecture defects, not style comments.

## Review Checklist

Before merging any feature:

- No Supabase queries in UI components.
- No business logic in React components.
- No hardcoded permissions, tenant IDs, branch IDs, or statuses.
- Route adapters are thin.
- Application services enforce permissions.
- Domain rules are testable.
- RLS policies exist for new tenant-owned tables.
- ERP and Portal data loading remain separated.
- Request context is resolved server-side and passed explicitly.
- Query caches are scoped by tenant, company, branch, and experience.
- API Routes have replay protection where needed.
