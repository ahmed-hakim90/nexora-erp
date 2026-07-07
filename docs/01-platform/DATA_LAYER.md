# Data Layer

## Related Documents

- [Data Guidelines](DATA_GUIDELINES.md) — platform data ownership rules (canonical for conflicts)
- [Database Strategy](../04-architecture/DATABASE_STRATEGY.md) — schema, indexing, migration, audit, numbering, retention
- [RLS Strategy](../04-architecture/RLS_STRATEGY.md) — row-level security policies and testing
- [Data Ownership](../04-architecture/DATA_OWNERSHIP.md) — bounded context ownership model
- [Party Foundation](PARTY_FOUNDATION.md)
- [Financial Foundation](FINANCIAL_FOUNDATION.md)
- [Migrations](../07-development/MIGRATIONS.md)

## Overview

The Nexora data layer is **PostgreSQL on Supabase** with:

- Tenant-safe **RLS** as the database safety boundary
- **Migration-only** schema changes
- **App-owned** business tables scoped by tenant, company, branch, and employee where required
- **Platform-owned** shared foundations (party, financial utilities, engines)

## Authority

| Topic | Canonical document |
| --- | --- |
| Platform data rules | [Data Guidelines](DATA_GUIDELINES.md) |
| Database design depth | [Database Strategy](../04-architecture/DATABASE_STRATEGY.md) |
| RLS policies | [RLS Strategy](../04-architecture/RLS_STRATEGY.md) |

On conflict, follow [ADR-001](../05-decisions/ADR-001-Documentation-Source-Of-Truth.md).

## Data Ownership Levels

- **Global reference** — rare public data not tenant-private
- **Tenant-owned** — `tenant_id` required
- **Company-owned** — `company_id` required for legal/financial records
- **Branch-scoped** — `branch_id` or explicit source/destination branch
- **Employee-owned** — portal and self-service scope
- **Self-owned** — principal-scoped personal records

Full rules: [Data Guidelines](DATA_GUIDELINES.md) and [Data Ownership](../04-architecture/DATA_OWNERSHIP.md).

## Key Invariants

- Ledgers and audit records are append-focused; corrections use reversal or adjustment entries ([ADR-014](../05-decisions/ADR-014-Immutable-Ledger.md)).
- Document numbers come from the platform numbering/document engine ([Document Engine](DOCUMENT_ENGINE.md)).
- Repositories live in infrastructure; UI never receives raw database rows ([Backend Frontend Separation](../04-architecture/BACKEND_FRONTEND_SEPARATION.md)).
