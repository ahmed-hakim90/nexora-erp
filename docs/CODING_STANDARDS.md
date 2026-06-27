# Coding Standards

## Purpose

These standards define how Nexora code must be written once implementation begins.

They exist to protect maintainability, correctness, and team velocity as the platform grows across many business modules.

## TypeScript Standards

Nexora uses strict TypeScript.

Rules:

- `strict` mode must remain enabled.
- Avoid `any`; use `unknown` and narrow deliberately when necessary.
- Prefer explicit domain types for business concepts.
- Avoid primitive obsession for important values such as money, quantity, document number, tenant ID, and status.
- Do not use string literals for permissions or statuses outside registries.
- Public functions must have clear input and output types.
- Avoid broad generic utility types that hide meaning.
- Use branded or value-object types for identifiers and sensitive business values when they prevent accidental mixing.
- Use discriminated unions for typed result handling where appropriate.

## Validation Standards

Use Zod for runtime validation.

Validation should happen at boundaries:

- Server Actions.
- API Routes.
- External integration inputs.
- File imports.
- Report filters.
- Form submissions.

Client-side validation improves UX, but server-side validation is mandatory.

Zod schemas should not become a replacement for domain rules. Validation confirms shape; domain rules confirm business correctness.

## React Standards

React components must remain presentation-focused.

Rules:

- No business logic in React components.
- No Supabase queries in React components.
- No direct workflow transitions from UI state.
- No financial, payroll, tax, or inventory calculations as source of truth in UI.
- Use React Hook Form for complex forms.
- Use shadcn/ui as the default component foundation.
- Use Tailwind CSS for styling.
- Keep components small and module-owned.

React components may contain display logic such as formatting, visibility of local UI controls, and component composition.

## Enterprise UI Framework

Sprint 4 establishes the reusable UI framework under `src/shared/ui`.

Future modules must use:

- `app-shell` for workspace shells, navigation, breadcrumbs, search placeholder, command placeholder, notifications, user menu, and switchers.
- `page` for ERP page composition.
- `data-table` for enterprise list/table views.
- `form` for page, drawer, dialog, wizard, section, grid, and field group forms.
- `document` for future generic document layouts.
- `report` for report presentation.
- `dashboard` for reusable widgets only.
- `feedback` for loading, skeleton, empty, error, permission denied, offline, maintenance, success, confirmation, delete, and unsaved-change states.
- `layout` for container, stack, grid, split view, panels, tabs, accordion, drawer, dialog, popover, tooltip, scroll area, sticky toolbar, and sticky actions.
- `tokens` and global CSS variables for typography, spacing, radius, shadows, borders, motion, z-index, breakpoints, and container widths.

Modules must not create alternative UI frameworks or business-specific copies of shared primitives.

## Server Standards

Server code must enforce business operations.

Rules:

- Server Actions and API Routes are thin adapters.
- Application services own use-case orchestration.
- Repositories own persistence.
- Domain rules own invariants.
- Audit events are created during sensitive operations.
- Permissions are checked before mutations and sensitive reads.
- Tenant, company, branch, and employee context are resolved server-side.
- Request context is passed explicitly to application services.
- Retryable mutations define idempotency behavior.
- Sensitive mutations use concurrency checks where stale updates are possible.

## Repository Pattern Standards

Repositories provide persistence operations through explicit interfaces.

Rules:

- Repositories must not be imported into UI.
- Repositories must not contain UI-specific formatting.
- Repositories must not make permission decisions by themselves unless implementing a security adapter requested by application services.
- Repository methods should match business data needs, not generic table access.
- Repository implementations must live in infrastructure.

Avoid generic repositories that expose unrestricted CRUD for every table.

Repositories must make tenant, company, and branch scope explicit in method inputs or derive them from a typed request context supplied by application services. Hidden unscoped queries are prohibited.

## Service Layer Standards

Application services coordinate use cases.

Services should:

- Validate command intent.
- Check permissions.
- Load required state.
- Apply domain rules.
- Call repositories.
- Coordinate transactions.
- Emit audit, workflow, approval, or notification events.
- Return typed results.
- Define transaction boundaries.
- Enforce idempotency for commands that may be retried.
- Preserve correlation IDs for audit and logs.

Services should not:

- Render UI.
- Return raw database rows.
- Depend on React.
- Bypass domain rules.

## Domain Rule Standards

Domain rules must be explicit and testable.

Examples:

- A posted invoice cannot be edited.
- A warehouse transfer cannot be received before approval.
- A user cannot approve their own request if policy forbids it.
- A payslip cannot be published before payroll calculation is finalized.
- A cancelled document cannot be posted.

Business rules should not be scattered across UI conditionals, SQL snippets, and ad hoc service checks.

Domain rules that influence money, stock, payroll, approvals, document posting, or legal outputs require tests before release.

## Naming Standards

Folders:

- Feature folders use kebab-case.
- Layer folders use lowercase.
- Platform capability folders use business-neutral names.

Files:

- Components: `PascalCase.tsx`.
- Hooks: `useSomething.ts`.
- Services: `something.service.ts`.
- Repositories: `something.repository.ts`.
- Mappers: `something.mapper.ts`.
- Schemas: `something.schema.ts`.
- Domain rules: `something.rule.ts`.
- Tests: `something.test.ts`.

Code:

- Variables and functions use camelCase.
- Types, classes, and React components use PascalCase.
- Constants use UPPER_SNAKE_CASE only when they are true constants.
- Permission keys use dot notation.
- Database objects use snake_case.

## Shared Code Standards

Shared code is allowed only when it is genuinely shared and domain-neutral.

Allowed shared areas:

- `shared/ui`: generic UI primitives and wrappers.
- `shared/config`: generic configuration helpers.
- `shared/utils`: pure, stable utilities.
- `shared/testing`: test helpers.

Not allowed:

- Moving business types into a global `types` folder.
- Moving all services into a global `services` folder.
- Moving module-specific components into shared.
- Creating utility functions that hide business rules.
- Creating shared DTOs that expose database internals.
- Creating shared permission or status constants that belong to a module.

## Boundary Enforcement Standards

Once implementation begins, boundary rules must be enforced with tooling.

Required guardrails:

- Restricted imports between feature layers.
- Restricted imports from other modules' private folders.
- Server-only markers for infrastructure and service-role modules.
- Client bundle checks for server-only imports.
- No circular dependencies between modules.
- No imports from platform modules into `shared`.

Architecture boundary violations should fail CI when tooling is available.

## Localization Standards

Nexora must support Arabic and English from the start.

Rules:

- No hardcoded user-facing strings in reusable components.
- Date, time, number, currency, and quantity formatting must be locale-aware.
- RTL and LTR must be supported at layout level.
- Icons and directional UI must work in both directions.
- Database-stored business names may require localized columns or translation tables depending on domain requirements.
- Persisted status and permission keys must remain locale-neutral.
- Print templates must support locale-specific formatting and text direction.

## Theme Standards

Dark and light mode are platform requirements.

Rules:

- Use design tokens and Tailwind theme variables.
- Do not hardcode colors that break themes.
- shadcn/ui components should follow theme tokens.
- Status colors must be consistent and accessible.
- Print styles must be designed separately from screen themes.

## Error Handling Standards

Errors must be typed and user-safe.

Rules:

- Do not expose SQL errors to users.
- Do not expose stack traces to users.
- Convert infrastructure errors into application-level errors.
- Domain errors should be meaningful and testable.
- Validation errors should map cleanly to form fields where possible.

## Testing Standards

Testing must match risk.

Required test categories:

- Domain rule tests for business invariants.
- Application service tests for use cases and permissions.
- Repository integration tests for complex queries.
- RLS tests for tenant and branch isolation.
- UI tests for complex forms and workflows.
- Report tests for financial or operational correctness.
- Permission and entitlement tests.
- Import-boundary tests when tooling is introduced.
- Migration and RLS regression tests for schema changes.

Do not rely only on end-to-end tests for business correctness.

## Review Standards

Every code review should check:

- Does this preserve module boundaries?
- Is business logic outside React components?
- Are permissions checked server-side?
- Are tenant and branch scopes enforced?
- Are statuses and permissions registered?
- Are database queries isolated in infrastructure?
- Are domain rules tested?
- Does this affect HR portal separation?
- Does this affect report or print performance?
- Is sensitive behavior audited?
- Are transaction boundaries clear?
- Are idempotency and concurrency handled where needed?
- Are module dependencies declared?
- Are reports and exports bounded or asynchronous?
- Are official print outputs snapshot-based?

## Prohibited Shortcuts

Do not introduce:

- Hardcoded permission strings.
- Hardcoded tenant IDs.
- Hardcoded branch IDs.
- Hardcoded statuses.
- Global `types` dump folders.
- Global `services` dump folders.
- Supabase calls in UI components.
- Business logic in React components.
- Unscoped database queries.
- Temporary admin bypasses.
- Service-role usage in client-facing code.
- Unbounded exports from table screens.
- Direct status updates that bypass workflow services.
- Direct approval updates that bypass approval services.
- Query caches that ignore tenant, company, branch, or experience scope.
