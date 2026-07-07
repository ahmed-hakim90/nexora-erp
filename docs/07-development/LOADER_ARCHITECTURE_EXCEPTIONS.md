# Loader Architecture Exceptions

## Related Documents

- [Backend Frontend Separation](../04-architecture/BACKEND_FRONTEND_SEPARATION.md)
- [Module Structure](MODULE_STRUCTURE.md)

> **Note:** Canonical content lives here. Previous location: `docs/LOADER_ARCHITECTURE_EXCEPTIONS.md`.

Wave 1.1 establishes the required data-access flow:

`Loader → Application Service → Repository → Database`

## Migrated in Wave 1.1

| Surface | Loader entrypoint | Service | Repository |
|---------|-------------------|---------|------------|
| Inventory transaction lookups | `loadTransactionLookups()` | `InventoryCatalogLookupService` | `SupabaseInventoryCatalogLookupRepository` |
| Warehouse execution catalog | `loadWarehouseExecutionCatalog()` | `InventoryCatalogLookupService` | `SupabaseInventoryCatalogLookupRepository` |
| Purchasing lookups | `loadPurchasingLookups()` | `PurchasingCatalogLookupService` | `SupabasePurchasingCatalogLookupRepository` |

App-layer pages delegate to feature service factories and no longer call Supabase directly for these catalogs.

## Documented exceptions

The following loaders still query Supabase inside the loader module. Each case is scoped to feature routes, enforces `requirePermission`, and relies on RLS as a secondary control. Full service extraction is deferred to avoid unrelated refactors in this security gate.

| Loader | Justification |
|--------|---------------|
| `inventory-lots.loader.ts` | Lot workspace combines paginated record queries with inline lookup hydration. Extraction requires a dedicated lot workspace service without changing lot UX contracts. |
| `inventory-serials.loader.ts` | Serial workspace mirrors lot loader pattern with multi-tab record hydration. |
| `manufacturing/operational.loader.ts` | Manufacturing operational pages share one loader helper for BOM/routing/plan lookups tied to page-local query composition. |
| Feature overview loaders (`inventory-overview`, `manufacturing-overview`, `manufacturing-lookups`) | Read-only manifest/overview surfaces with permission-gated, bounded queries. |

## Rule for new loaders

New ERP loaders must not import `createRequestSupabaseClient` in `src/app/(erp)/**`. Feature loaders must route database access through an application service and repository unless an exception is documented here.
