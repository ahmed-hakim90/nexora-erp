# Current App Foundation Decisions

This document locks the model decisions for the current Finance, Inventory, and Manufacturing apps before any new app work.

## Finance

- Canonical app definition tables are the `finance_*` tables created by `20260627123000_finance_foundation.sql`.
- The `financial_*` platform tables remain lower-level platform/foundation utilities and must not be used by the Finance app UI as duplicate CRUD surfaces.
- Finance stays Level 1 Foundation Ready only: definitions, validation, permissions, RLS, search/report contracts, and readiness metadata. No journal entry posting, invoice workflow, bank reconciliation, payment execution, or tax runtime calculation belongs in this stage.

## Inventory

- Canonical Inventory app/runtime tables are the `inventory_*` foundation tables for products, variants, categories, UOMs, warehouses, locations, lots, serials, movements, balances, reorder rules, and reservations.
- Stock posting tables remain the append-only runtime layer, but their product, warehouse, location, and UOM references must align with `inventory_products`, `inventory_warehouses`, `inventory_locations`, and `inventory_uoms`.
- Legacy master-data tables such as `products`, `warehouses`, `warehouse_locations`, and `units` are compatibility surfaces only and must not be the source of truth for new Inventory app flows.
- Permission keys use dash-separated route/business vocabulary where the database policy already uses it, including `inventory.cycle-count.*`.

## Manufacturing

- Canonical manufacturing master and operational tables are the `manufacturing_*` tables, plus `manufacturing_bom_lines`, `manufacturing_routing_steps`, and `manufacturing_plan_lines`.
- `manufacturing_boms.components` and `manufacturing_routings.operations` are legacy JSON reconciliation columns only. New UI and runtime behavior must use normalized line/step tables.
- Manufacturing targets, DPR, reports, and execution documents are operational facts/readiness surfaces. Payroll, costing, inventory posting, quality runtime, and full execution engines stay outside the current stabilization scope.

## Reuse Rule

Future apps must reuse the canonical lookup, validation, permission, audit, and page-local modal conventions stabilized here instead of introducing new table aliases or global workspace-panel patterns.
