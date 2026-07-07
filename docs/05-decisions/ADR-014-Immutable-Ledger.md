# ADR-014: Immutable Ledger and Audit Records

## Status

Accepted

## Context

Financial, inventory, payroll, approval, and audit histories must remain explainable years later. Silent edits to posted or ledger records destroy auditability and regulatory trust.

## Decision

Nexora treats ledger tables, append-only audit/event/timeline tables, and official posted document facts as immutable in normal operation.

Rules:

- Financial and inventory corrections use reversal or adjustment records instead of hidden edits.
- Audit logs are append-only and tamper-resistant in normal flows.
- Append-only audit/event/ledger/timeline tables remain protected by database triggers where implemented.
- Official print snapshots and report reproducibility metadata must reference stable document or ledger states.

## Consequences

- Application services must model corrections as new records, not updates to posted facts.
- RLS and repository queries must respect soft-delete and archive filters without rewriting history.
- Closed-period reporting depends on immutable facts and reproducibility metadata.

## Related Documents

- [Database Strategy](../04-architecture/DATABASE_STRATEGY.md)
- [Data Guidelines](../01-platform/DATA_GUIDELINES.md)
- [Audit and Observability](../01-platform/AUDIT_AND_OBSERVABILITY.md)
- [Finance](../02-business-apps/FINANCE.md)
- [Inventory](../02-business-apps/INVENTORY.md)

## Archived Source

Extracted from `docs/DATABASE_STRATEGY.md` (Core Data Principles, Audit Strategy, Transaction Boundaries) and `docs/platform/11_PLATFORM_FREEZE_V1.md` (Data And RLS Rules).
