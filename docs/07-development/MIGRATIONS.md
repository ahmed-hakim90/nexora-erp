# Migrations

## Related Documents

- [Database Strategy](../04-architecture/DATABASE_STRATEGY.md)
- [Data Guidelines](../01-platform/DATA_GUIDELINES.md)
- [RLS Strategy](../04-architecture/RLS_STRATEGY.md)

## Policy

Schema changes are migrations-only under `supabase/migrations/`.

Rules:

- RLS policies ship with table creation — not as follow-up patches.
- Enable and force RLS on tenant-owned tables.
- Include lifecycle, audit, soft-delete, activity, and version columns per platform standards.
- Scoped uniqueness for business keys (tenant/company/branch scope as applicable).
- Append-only tables protected by triggers where required.

## Migration Standards

From Data Guidelines:

- Naming: timestamp prefix `YYYYMMDDHHMMSS_description.sql`
- Every migration must be reversible in intent (forward-only execution in production; document rollback strategy).
- Platform tables must be tenant-aware where relevant.
- Permission-aware RLS is the baseline for platform engine tables.

## Validation

```bash
npm run validate:migrations
```

Performs repeatable static PL/pgSQL structure validation. Live Supabase/Postgres execution is not currently part of the repository quality gate ([Platform Freeze warnings](../05-decisions/ADR-011-Platform-Freeze-V1.md)).

## Sprint Reference Migrations

| Area | Migration (example) |
| --- | --- |
| Master Data (Sprint 05) | `20260625101000_master_data_foundation.sql` |
| Finance Foundation | `20260627123000_finance_foundation.sql` |
| Platform Security (Sprint 03) | See Sprint 03 archive |
| HR / Inventory extensions | See `supabase/migrations/` directory |

## Related ADRs

- [ADR-014 Immutable Ledger](../05-decisions/ADR-014-Immutable-Ledger.md)
