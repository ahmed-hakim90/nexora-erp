# Feature Structure

## Purpose

This document defines how every Nexora feature module must be organized.

The goal is to make modules independently understandable, testable, and replaceable without creating global folders that become hidden dependencies.

## Standard Feature Layout

Every business feature should use this structure:

```text
src/features/<feature-name>/
  domain/
    entities/
    value-objects/
    rules/
    statuses/
    errors/
    events/
  application/
    services/
    use-cases/
    dto/
    validators/
    ports/
  infrastructure/
    repositories/
    mappers/
    supabase/
    storage/
  presentation/
    components/
    forms/
    hooks/
    tables/
    view-models/
  permissions/
    permission-registry.ts
    role-presets.ts
  routes/
    actions/
    api/
    loaders/
  public-api.ts
  module.manifest.ts
  tests/
    domain/
    application/
    infrastructure/
```

A module does not need every folder on day one. Empty folders should not be committed just to satisfy the shape.

Folders are not public APIs. Only `public-api.ts`, route adapters, and documented platform contracts may be imported by other modules.

Sprint 1 provides `src/features/_template` only. It is a scaffold for future modules, not a business module and not a runtime feature.

## Module Manifest

Every implemented module must have a `module.manifest.ts`.

The manifest must declare:

- Module key.
- Product area.
- Allowed experiences: ERP Workspace, HR Portal, or both.
- Owned permissions.
- Owned statuses.
- Navigation contributions.
- Report contributions.
- Print contributions.
- Required platform capabilities.
- Allowed module dependencies.
- Feature flags or license gates.
- Sensitive data classification.

The manifest must not query the database, call services, inspect the current user, or contain business rules.

## Domain Layer

The domain layer owns business meaning.

It may contain:

- Entity definitions.
- Value objects.
- Domain services for pure business rules.
- Status definitions.
- Transition rules.
- Domain errors.
- Domain events.

It must not import:

- React.
- Next.js.
- Supabase.
- Database clients.
- Server Actions.
- API route handlers.
- UI libraries.
- Environment variables.

Domain logic must be deterministic and easy to test.

Domain entities must not know tenant access rules unless tenant ownership is itself part of the business invariant. Authorization belongs in application services and RLS, not in pure domain objects.

## Application Layer

The application layer coordinates use cases.

It may contain:

- Service layer.
- Use cases.
- DTOs.
- Zod schemas for command/query validation.
- Repository interfaces.
- Authorization checks.
- Transaction orchestration.
- Audit event requests.
- Workflow and approval coordination.

Application services answer business actions such as:

- Create invoice.
- Submit leave request.
- Approve purchase order.
- Transfer stock.
- Generate payslip.
- Close service ticket.

They must not render UI or depend on React.

Application services must receive dependencies through explicit ports. They must not instantiate Supabase clients, repositories, or storage clients directly.

Application services must return application DTOs or result objects. They must not return raw database rows or React-specific view models.

## Infrastructure Layer

The infrastructure layer talks to external systems and persistence.

It may contain:

- Supabase repository implementations.
- PostgreSQL query builders.
- Storage adapters.
- Integration clients.
- Mapper functions between database rows and domain/application objects.

Infrastructure is the only feature layer that may contain Supabase query code.

Infrastructure must not be imported directly by React components.

Infrastructure implementations must be replaceable behind application ports. Repository method names should describe business intent, such as `findOpenTransfersForReceiving`, not generic table operations such as `getAll`.

## Presentation Layer

The presentation layer contains UI code for the feature.

It may contain:

- React components.
- Forms using React Hook Form.
- Client hooks.
- Table components.
- View models.
- UI-specific formatting.

Presentation must call typed route loaders, server actions, API clients, or query hooks. It must not call repositories or Supabase directly.

Presentation may format already-authorized data for display, but it must not decide whether a business action is legal. Disabled buttons and hidden menu items are UX aids only.

Feature presentation must use the Sprint 4 shared UI framework from `src/shared/ui`.

Required ERP page composition:

- `PageContainer`
- `PageHeader`
- `PageActions`
- `PageFilters`
- `PageContent`
- `PageSidebar`
- `PageFooter`

Feature modules must not create competing app shells, table frameworks, form frameworks, document layouts, report layouts, dashboard widget frameworks, or feedback systems.

## Routes Folder

The `routes` folder contains integration points between Next.js routes and feature application services:

- `actions`: Server Actions for mutations.
- `api`: API Route handlers when an HTTP boundary is required.
- `loaders`: Server-side data loaders for pages and layouts.

Route files are thin adapters. They validate input, establish user context, call application services, and return typed results.

Route adapters must be the only layer that knows the HTTP, Server Action, cookie, request header, or Next.js route shape. Application services must not import `next/*`.

## Permissions Folder

Each feature owns its permission registry.

Feature permissions must be declared as stable keys:

```text
sales.invoice.read
sales.invoice.create
sales.invoice.approve
sales.invoice.print
```

Permission keys must never be hardcoded randomly across UI and backend code. They must be imported from a registry owned by the module.

Permission registries must also classify each permission by risk level and allowed experience. A permission that exposes ERP data must not be available to portal-only roles.

## Status Definitions

Statuses must be declared in module-owned registries.

Allowed examples:

- `draft`
- `submitted`
- `approved`
- `rejected`
- `posted`
- `cancelled`
- `closed`

The exact statuses are module-specific. They must be defined once and used through constants, enums, or typed registries.

No hardcoded status literals are allowed in business logic, UI conditionals, or SQL construction.

Status registries must define terminal states, editable states, printable states, approvable states, and allowed transitions. Status labels for Arabic and English must be localization data, not the persisted status value.

## Import Rules

Allowed imports:

- A feature may import from `src/platform/*`.
- A feature may import from `src/shared/ui` for generic UI primitives.
- A feature may import from `src/shared/utils` only for pure, domain-neutral helpers.
- Presentation may import from its own feature application types and route adapters.
- Infrastructure may import from its own application ports and domain models.
- A module may import another module only through that module's `public-api.ts`.
- Server-only code may import server-only platform contracts.

Disallowed imports:

- `features/a/infrastructure` importing from `features/b/infrastructure`.
- `features/a/presentation` importing `features/b/presentation` for business reuse.
- Any feature importing another feature's private folders without an explicit public contract.
- Domain importing application, infrastructure, presentation, React, Next.js, or Supabase.
- Shared folders importing feature code.
- Client Components importing server-only module files.
- Barrel files that re-export private layer internals.
- Import cycles between features.
- Test helpers becoming production dependencies.

## Server And Client Entry Points

Each module must keep browser-safe and server-only entry points separate.

Recommended pattern:

```text
src/features/<feature-name>/public-api.ts
src/features/<feature-name>/routes/actions/
src/features/<feature-name>/routes/loaders/
src/features/<feature-name>/presentation/
```

Client Components may import presentation code and browser-safe DTOs. Server Actions, loaders, repositories, and infrastructure adapters must be server-only.

## Public Module Contracts

When one module needs another module, use an explicit contract:

```text
src/features/<feature-name>/application/ports/
src/features/<feature-name>/application/public-api.ts
```

The public API should expose only stable application operations or read models.

Do not expose database repositories as public contracts.

Public APIs must be intentionally small. If another module needs many internals, the dependency boundary is probably wrong and should be reviewed before implementation continues.

## Naming Conventions

Feature names:

- Use kebab-case folder names.
- Use business language, not technical language.
- Examples: `sales`, `inventory`, `hr`, `purchase`, `manufacturing`.

Files:

- React components: `PascalCase.tsx`.
- Hooks: `useSomething.ts`.
- Services: `something.service.ts`.
- Repositories: `something.repository.ts`.
- Mappers: `something.mapper.ts`.
- Validators: `something.schema.ts`.
- Domain rules: `something.rule.ts`.
- Tests: `something.test.ts`.

Database tables:

- Use snake_case.
- Prefer module prefixes for business tables where clarity requires it.
- Examples: `sales_invoices`, `inventory_transfers`, `hr_leave_requests`.

Permission keys:

- Use dot notation.
- Format: `<module>.<resource>.<action>`.

## Testing Structure

Every feature should prioritize tests in this order:

- Domain rule tests.
- Application service/use-case tests.
- Repository integration tests for risky queries.
- Presentation tests for complex UI behavior.
- Boundary tests that verify forbidden imports when tooling is introduced.

React components should not be the only place business behavior is tested.

## Adding A New Module Safely

To add a new module:

1. Define the business capability and module owner.
2. Define permissions and statuses before UI work.
3. Define tenant, company, and branch ownership for every table.
4. Create domain models and invariants.
5. Create application use cases.
6. Create repository interfaces.
7. Implement infrastructure repositories.
8. Add Server Actions or API routes as thin adapters.
9. Add presentation components with no business logic.
10. Add RLS policies and database indexes.
11. Add audit events for sensitive changes.
12. Add reports and print flows only through reporting/printing infrastructure.
13. Declare module dependencies in `module.manifest.ts`.
14. Add boundary checks for server/client imports when tooling is available.

If a module cannot be added without editing many unrelated modules, the architecture boundary is wrong and must be fixed before continuing.
