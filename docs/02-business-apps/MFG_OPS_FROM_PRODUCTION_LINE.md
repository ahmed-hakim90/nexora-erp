# Manufacturing Ops Rebuild — From production-line (Behavior Only)

## Status

Active implementation reference for MFG-00 → MFG-06.

**Source of truth:** Nexora (`manufacturing_*`, `inventory_*`, platform engines).  
**Reference only:** `/Users/hakimo/Developer/production-line` operational behavior and UX — **no code transfer**.

## Goal

Rebuild factory day-to-day production correctly inside Nexora so operators can:

1. Define products and classify manufacturing roles.
2. Maintain BOMs and production lines.
3. Plan and release manufacturing work.
4. Issue materials and receive finished goods through Inventory documents.
5. Enter daily production facts quickly (supervisor path).

## Ownership Rules (Non-Negotiable)

| Concern | Owner | Never |
| --- | --- | --- |
| Product identity / SKU / UOM | Inventory / Product Master | Duplicate master in Manufacturing |
| Manufacturing enablement + role | Inventory (`is_manufacturable`, `product_type_key`) | Free-form conflict with BOM rules |
| Manufacturing execution mirror | `manufacturing_products` linked via `inventory_product_id` | Active MFG product without inventory link |
| Warehouse / stock quantity | Inventory | Manufacturing mutates balances |
| BOM / routing / line / plan / MO / DPR | Manufacturing | Payroll or cost math inside DPR |

## Production Warehouse Roles (Inventory `warehouse_type`)

| Role | Canonical `warehouse_type` | Use |
| --- | --- | --- |
| Raw materials | `raw_materials` | Issue components to production |
| Production floor | `production_buffer` | Floor / WIP buffer near lines |
| Finished goods | `finished_goods` | FG receipt from production |
| Scrap | `scrap` | Scrap disposition |
| QC hold | `qc` | Optional hold before FG release |

Location helpers: `production_input`, `production_output` on `inventory_locations`.

## Manufacturing Item Roles (Inventory `product_type_key`)

When `is_manufacturable = true`, `product_type_key` must be one of:

| Key | Meaning |
| --- | --- |
| `raw_material` | Consumed by BOM / issue |
| `semi_finished` | Intermediate output / input |
| `finished_good` | Primary production output |
| `packaging` | Packaging component or packaging line output |

## Operator Scenarios (Acceptance)

### S1 — Product ready for production

1. Create inventory product (stockable).
2. Mark Manufacturable and set Manufacturing Role.
3. Create/link manufacturing product with `inventory_product_id`.
4. Confirm lookup shows inventory SKU on manufacturing screens.

### S2 — Warehouses ready for production

1. Create warehouses: raw, floor (`production_buffer`), finished, scrap.
2. Confirm stock balances can hold opening quantities per warehouse.
3. No manufacturing screen posts stock.

### S3 — Later sprints (tracked, not MFG-01)

- BOM explosion → material request → material issue.
- Plan → MO → DPR quick entry → FG receipt.
- Line status / KPIs from production facts.

## Sprint Checklist

| Sprint | Scope | Exit |
| --- | --- | --- |
| **MFG-00** | This doc + readiness map | Doc linked from Manufacturing.md |
| **MFG-01** | Product link, roles, warehouse role labels, validation | S1 + S2 pass |
| **MFG-02** | BOM / routing / standards / explosion service | Approved BOM + explosion qty |
| **MFG-03** | Plans + manufacturing orders | Plan releases MO without stock post |
| **MFG-04** | Material request / issue via Inventory | Balances change only via Inventory |
| **MFG-05** | DPR + supervisor quick entry + FG receipt | End-to-end day run |
| **MFG-06** | Dashboard / reports / gate tests | UAT day without Excel |

## Explicit Non-Goals

- Copying Firebase / Zustand / Cloud Functions code.
- Quality / CAPA / Repair / Cost Engine runtime in early sprints.
- Payroll coupling to production output before MFG-05 is stable.

## Related Docs

- [Manufacturing](MANUFACTURING.md)
- [Manufacturing Blueprint v2](MANUFACTURING_BLUEPRINT_V2.md)
- [Inventory](INVENTORY.md)
- [ADR-016 Inventory Ownership](../05-decisions/ADR-016-Inventory-Ownership.md)
- [ERP Navigation](ERP_NAVIGATION.md)
