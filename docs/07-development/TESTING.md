# Testing

## Related Documents

- [Testing Engine](../01-platform/TESTING_ENGINE.md)
- [Coding Standards](CODING_STANDARDS.md)
- [RLS Strategy](../04-architecture/RLS_STRATEGY.md)
- [Permission Model](../04-architecture/PERMISSION_MODEL.md)

## Required Test Categories

Risk-based testing is mandatory before production readiness:

- **RLS** — tenant, company, branch, and employee isolation; default-deny; `WITH CHECK` on insert/update.
- **Permissions** — entitlement, permission, and data scope resolution; segregation of duties.
- **Workflow** — transitions, guards, terminal states, concurrency.
- **Approval** — policy routing, delegation, idempotent decisions.
- **Domain rules** — testable without rendering UI.
- **Performance** — bounded queries, pagination, report/print job paths where applicable.
- **E2E** — critical flows per experience (ERP vs Portal separation).

## Platform Test Harness

The Testing Engine provides:

- Test tenant/user/role factories.
- RLS, permission, workflow, and approval scenario builders.
- CI release gates for platform correctness.

Business apps cannot be production-ready without passing relevant platform test harness gates.

## Sprint Verification Commands

Historical sprint verification scripts (archived):

| Sprint | Command |
| --- | --- |
| Sprint 05 Master Data | `npm run verify:sprint5` |
| Sprint 06 Business Documents | `npm run verify:sprint6` |
| Sprint 07 Inventory Foundation | `npm run verify:sprint7` |
| Sprint 08 Integration Platform | `npm run verify:sprint8` |

## Module Test Structure

Each feature module includes tests under `tests/` or feature-local `tests/` following [Module Structure](MODULE_STRUCTURE.md).

## Release Gate

Platform Freeze v1.0 validation includes:

- Static Supabase migration validation (`npm run validate:migrations`)
- TypeScript typecheck
- ESLint
- Platform test suite

See [Platform Freeze ADR](../05-decisions/ADR-011-Platform-Freeze-V1.md).
