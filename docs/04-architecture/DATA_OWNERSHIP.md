# Data Ownership

## Related Documents

- [Database Strategy](DATABASE_STRATEGY.md)
- [Data Layer](../01-platform/DATA_LAYER.md)
- [RLS Strategy](RLS_STRATEGY.md)
- [ADR-016 Inventory Ownership](../05-decisions/ADR-016-Inventory-Ownership.md)

## Ownership Levels

From the Platform Blueprint:

- **Global reference** — rare public data not tenant-private.
- **Tenant-owned** — private business records include `tenant_id`.
- **Company-owned** — legal and financial records include `company_id`.
- **Branch-scoped** — operational records include `branch_id` or explicit source/destination branch scope.
- **Employee-owned** — portal and self-service records include employee scope.

## Rules

- Every tenant-owned business table must include `tenant_id`.
- No tenant, company, or branch ID may be hardcoded in application code, UI, SQL policies, seeds, or tests.
- App-owned schema is scoped by tenant, company, branch, and employee where required.
- Cross-feature dependencies must be declared in the consuming module manifest.

See [Database Strategy](DATABASE_STRATEGY.md) for table categories, migration rules, and retention.
