# Review Actions

## Related Documents

- [ERP Architecture Review](ERP_ARCHITECTURE_REVIEW.md)
- [ERP Usability Review](ERP_USABILITY_REVIEW.md)
- [Implementation Status](../00-overview/IMPLEMENTATION_STATUS.md)

## Platform Freeze v1.0 Actions

| Action | Owner | Status | Notes |
| --- | --- | --- | --- |
| Document Event Bus vs Outbox boundary | Platform | Done | [ADR-017](../05-decisions/ADR-017-Event-Bus-Outbox-Separation.md), [Event Bus](../01-platform/EVENT_BUS.md) |
| Document Platform Freeze rules | Platform | Done | [ADR-011](../05-decisions/ADR-011-Platform-Freeze-V1.md) |
| Lock Finance/Inventory/Manufacturing table ownership | Apps | Done | [ADR-012](../05-decisions/ADR-012-App-Foundation-Decisions.md) |
| Commit or split accepted sprint changes before tag | Engineering | Pending | See freeze warnings |
| Live Supabase migration validation in CI | Platform | Planned | Currently static validation only |
| Runtime workers for heavy job types | Platform | Planned | Job-readiness contracts exist |
| Operator Experience adoption on inventory/manufacturing pages | Apps | In Progress | Foundation shipped Sprint OX-01 |
| Manufacturing JSON column backfill to normalized lines | Manufacturing | Planned | See [Legacy Reconciliation](../02-business-apps/MANUFACTURING_LEGACY_RECONCILIATION.md) |
| Inventory lots/serials loader migration to catalog lookup service | Inventory | In Progress | See [Loader Exceptions](../07-development/LOADER_ARCHITECTURE_EXCEPTIONS.md) |

## Usability Actions

| Action | Status | Reference |
| --- | --- | --- |
| Enforce list-first modal pattern across ERP pages | In Progress | [Form Guidelines](../06-guidelines/FORM_GUIDELINES.md) |
| Replace raw ID displays with EntityLookup | In Progress | [Lookup Guidelines](../06-guidelines/LOOKUP_GUIDELINES.md) |
| Wire ERP navigation to canonical IA constant | Done | [ERP Navigation](../02-business-apps/ERP_NAVIGATION.md) |
| Portal performance isolation review | Planned | [Performance Strategy](../04-architecture/PERFORMANCE_STRATEGY.md) |

## Documentation Actions (This Refactoring)

| Action | Status |
| --- | --- |
| Reorganize docs into numbered folders | Done |
| Extract ADRs into individual records | Done |
| Archive sprint logs to `09-history/` | Done |
| Add cross-references between documents | Done |
| Create redirect stubs at legacy paths | Done |
