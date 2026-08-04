# Manufacturing Ops Rebuild — From production-line (Behavior Only)

## Status

Active implementation reference for MFG-00 → MFG-06.

**Source of truth:** Nexora (`manufacturing_*`, `inventory_*`, platform engines).  
**Reference only:** `/Users/hakimo/Developer/production-line` operational behavior and UX — **no code transfer**.

## Ownership Rules

| Concern | Owner |
| --- | --- |
| Product identity / SKU / UOM | Inventory |
| Manufacturing enablement + role | Inventory (`is_manufacturable`, `product_type_key`) |
| Manufacturing execution mirror | `manufacturing_products.inventory_product_id` |
| Warehouse / stock quantity | Inventory documents only |
| BOM / routing / standards / plan / MO / DPR | Manufacturing |

## Warehouse Roles (`warehouse_type`)

| Role | Type |
| --- | --- |
| Raw | `raw_materials` |
| Floor | `production_buffer` |
| Finished | `finished_goods` |
| Scrap | `scrap` |
| QC | `qc` |

## Manufacturing Item Roles (`product_type_key` when manufacturable)

`raw_material` · `semi_finished` · `finished_good` · `packaging`

## BOM Explosion (MFG-02)

- Approved BOM = header `active` / `released`.
- `requiredQty = finishedQty × line.quantity × (1 + scrapPercent / 100)`.
- `explodeBomLines` + `ManufacturingEngineeringService.explodeBom`.
- Preview on BOM detail for 1 unit. **No inventory posting.**

## Routing Readiness (MFG-02)

Active header + usable steps with operation + work center → `assessRoutingReadiness`.

## Production Standard Resolution (MFG-02)

1. product + line + shift  
2. product + line (no shift)  
3. null if unmatched  

## Sprint Checklist

| Sprint | Scope | Exit |
| --- | --- | --- |
| MFG-00 | This doc | Linked from Manufacturing.md |
| MFG-01 | Product link, roles, warehouse labels | Inventory ↔ manufacturing link |
| MFG-02 | BOM explosion, routing readiness, standard resolver | Approved BOM + explosion qty |
| MFG-03 | Plans + MO | Plan → MO without stock post |
| MFG-04 | Material request / issue | Inventory owns balances |
| MFG-05 | DPR + quick entry + FG receipt | Day run |
| MFG-06 | Dashboard / UAT gate | Stable ops |

## Related

- [Manufacturing](MANUFACTURING.md)
- [Manufacturing Blueprint v2](MANUFACTURING_BLUEPRINT_V2.md)
- [Inventory](INVENTORY.md)
- [ADR-016](../05-decisions/ADR-016-Inventory-Ownership.md)
