# Lookup Guidelines

## Related Documents

- **[Nexora Platform UX Constitution](NEXORA_PLATFORM_UX_CONSTITUTION.md)** — supreme UX standard (parent)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
- [Search Engine](../01-platform/SEARCH.md)
- [UX Guidelines](UX_GUIDELINES.md)
- [Form Guidelines](FORM_GUIDELINES.md)

## Lookup-First Rule

Raw UUID-first UX is not acceptable for production workflows. Users select entities by business name, code, barcode, or search — not by pasting internal IDs.

## Entity Lookup

From the Enterprise Design System and Operator Experience Foundation:

- Use `EntityLookup` and platform lookup provider contracts.
- Rendered options must show business names; internal IDs are for persistence only.
- Support recent items, favorites, async loading, keyboard navigation, and barcode/QR search where applicable.
- Reject manual UUID-like lookup terms before search.

## Platform Contracts

- `OxLookupProviderContract` — operator experience lookup standardization.
- Platform Search providers for cross-app entity discovery and hydration.

## Implementation

- Lookups call server-side search/hydration through application services — not direct Supabase from UI.
- Catalog lookup services (e.g. Inventory, Purchasing) follow Loader → Service → Repository → DB pattern per [Loader Architecture Exceptions](../07-development/LOADER_ARCHITECTURE_EXCEPTIONS.md).

## Related ADRs

- [ADR-008 UX Foundation Before App UI](../05-decisions/ADR-008-UX-Foundation-Before-App-UI.md)
