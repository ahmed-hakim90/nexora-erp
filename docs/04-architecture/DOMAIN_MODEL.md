# Domain Model

## Related Documents

- [Bounded Contexts](BOUNDED_CONTEXTS.md)
- [Data Ownership](DATA_OWNERSHIP.md)
- [Modular Monolith](MODULAR_MONOLITH.md)
- [Module Structure](../07-development/MODULE_STRUCTURE.md)

## Layers

Every feature module follows clean architecture:

- **domain** — business concepts, rules, invariants, statuses, value objects, domain errors.
- **application** — use cases, orchestration, services, validation coordination, authorization, transaction boundaries.
- **infrastructure** — repositories, Supabase/PostgreSQL, external services, adapters.
- **presentation** — React components, forms, route UI, client view models.

Dependencies flow inward. Domain must not depend on application, infrastructure, React, Next.js, or Supabase.

## Cross-Module Interaction

Allowed patterns:

- Platform services for shared capabilities.
- Explicit application contracts via `public-api.ts`.
- Domain events for asynchronous reactions.
- Database foreign keys when ownership is clear.

See [Modular Monolith](MODULAR_MONOLITH.md) for full boundary rules.
