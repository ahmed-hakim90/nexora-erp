# Sprint 5: Master Data Foundation

Sprint 5 introduces the first business foundation modules for Nexora ERP.

Implemented modules:

- `products`
- `product-categories`
- `units`
- `brands`
- `warehouses`
- `warehouse-locations`
- `customers`
- `suppliers`
- `price-lists`
- `tax-profiles`

## Scope Boundaries

This sprint intentionally does not implement inventory transactions, production, BOMs, stock quantities, stock movements, sales orders, invoices, purchase orders, supplier/customer ledgers, accounting, or journal entries.

Master Data is limited to reusable reference records that future inventory, production, sales, purchasing, and accounting modules can depend on.

## Architecture

Each feature follows the approved feature structure with:

- `module.manifest.ts`
- `public-api.ts`
- permissions
- application schemas and types
- domain rules
- repository ports
- Supabase repository implementations
- application services
- server actions and loaders
- minimal presentation view-model configuration

React pages use the Sprint 4 shared UI framework under `src/shared/ui`. Pages call route loaders and server actions only. Supabase access is contained in feature infrastructure repositories and is created through the platform database server contract.

## Database And RLS

The migration `supabase/migrations/20260625101000_master_data_foundation.sql` creates only Sprint 5 Master Data tables. Tenant-owned tables include lifecycle, audit, soft-delete, activity, and version columns.

RLS is enabled and forced for every Sprint 5 table. Policies enforce active tenant membership, active tenant status, and module permission checks with `WITH CHECK` on inserts and updates.

## Verification

Sprint 5 adds:

```bash
npm run verify:sprint5
```

This verifies migration shape, RLS/forced RLS, required indexes, forbidden out-of-scope business tables, feature file structure, no Supabase usage in UI/app files, and no private cross-feature imports.
