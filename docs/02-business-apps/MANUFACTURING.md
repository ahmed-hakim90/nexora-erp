# Manufacturing

## Constitutional Reference

All Manufacturing architecture must comply with [Nexora Enterprise Blueprint v1.0](../00-overview/NEXORA_ENTERPRISE_BLUEPRINT_V1.md) and [Manufacturing Blueprint v2](MANUFACTURING_BLUEPRINT_V2.md).

## Related Documents

- [Inventory](INVENTORY.md)
- [Manufacturing Blueprint v2](MANUFACTURING_BLUEPRINT_V2.md)
- [Manufacturing Ops Rebuild (from production-line behavior)](MFG_OPS_FROM_PRODUCTION_LINE.md)
- [Operator Experience](../01-platform/OPERATOR_EXPERIENCE.md)
- [Cost Engine](../01-platform/COST_ENGINE.md)
- [Manufacturing Legacy Reconciliation](MANUFACTURING_LEGACY_RECONCILIATION.md)
- [ADR-012 App Foundation Decisions](../05-decisions/ADR-012-App-Foundation-Decisions.md)

## Workspace Route

Base path: `/erp/manufacturing`

## Navigation and Status

See [ERP Navigation](ERP_NAVIGATION.md) for the canonical route table, page responsibilities, and ready/planned status.

## Foundation Decisions

- Official future implementation reference: [Manufacturing Blueprint v2](MANUFACTURING_BLUEPRINT_V2.md).
- Canonical tables: `manufacturing_*` plus normalized line/step tables.
- JSON columns `manufacturing_boms.components` and `manufacturing_routings.operations` are legacy reconciliation only.
- Production Sessions remain the future source of truth for execution; DPR and progress views derive from sessions later.
- Payroll, costing runtime, inventory posting, and full execution engines are outside current stabilization scope.
- Active rebuild track: [MFG Ops from production-line behavior](MFG_OPS_FROM_PRODUCTION_LINE.md) (MFG-01 catalog link + roles shipped first).
