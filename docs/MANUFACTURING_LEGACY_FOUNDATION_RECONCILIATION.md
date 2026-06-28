# Manufacturing Legacy / Foundation Reconciliation

This sprint does not delete legacy manufacturing tables or JSON foundation fields. It documents the current split so later cleanup can be planned safely.

## Canonical Foundation / Operational Tables

- `manufacturing_products`: canonical manufacturable product records linked optionally to `inventory_products`.
- `manufacturing_work_centers`: canonical work center records for routing and capacity facts.
- `manufacturing_lines`: canonical production lines used by DPR, targets, plan lines, and reports.
- `manufacturing_workstations`: canonical workstation records under work centers/lines.
- `manufacturing_operations`: canonical operation definitions for routing/work orders.
- `manufacturing_boms`: canonical BOM header table.
- `manufacturing_bom_lines`: canonical operational BOM component lines.
- `manufacturing_routings`: canonical routing header table.
- `manufacturing_routing_steps`: canonical operational routing step table.
- `manufacturing_plans` and `manufacturing_plan_lines`: canonical production planning records.
- `manufacturing_orders` and `manufacturing_work_orders`: canonical execution document records.
- `manufacturing_daily_reports`: canonical DPR production facts for achievement, scrap, rework, downtime, and worker output.
- `manufacturing_product_targets`, `manufacturing_line_targets`, `manufacturing_worker_targets`: canonical target facts.

## Legacy / Foundation Fields Still Present

- `manufacturing_boms.components`: legacy/foundation JSON component placeholder. It is not used as the canonical operational line source after this sprint.
- `manufacturing_routings.operations`: legacy/foundation JSON operation placeholder. It is not used as the canonical operational step source after this sprint.
- Legacy HR-like tables from the early manufacturing foundation, including `employees`, remain referenced for worker profile setup.
- Legacy manufacturing naming variants, such as older `work_centers`, remain out of the active production UI unless explicitly referenced by old foundation tests or migrations.

## UI Usage

- `/erp/manufacturing/boms`: uses `manufacturing_boms` for headers and `manufacturing_bom_lines` for component lines.
- `/erp/manufacturing/routing-plans`: uses `manufacturing_routings` for headers and `manufacturing_routing_steps` for steps.
- `/erp/manufacturing/production-plans`: uses `manufacturing_plans` and `manufacturing_plan_lines`.
- `/erp/manufacturing/manufacturing-orders`: uses `manufacturing_orders` with permission-aware lifecycle actions.
- `/erp/manufacturing/work-orders`: uses `manufacturing_work_orders` with permission-aware lifecycle actions.
- `/erp/manufacturing/daily-reports`: uses `manufacturing_daily_reports` with relation labels and worker output facts.
- `/erp/manufacturing/reports`: reads DPR, targets, plan lines, and order facts. It does not use fake report data.

## Migration Work For Later

- Backfill `manufacturing_bom_lines` from `manufacturing_boms.components` only after the JSON shape is audited per tenant.
- Backfill `manufacturing_routing_steps` from `manufacturing_routings.operations` only after operation/work-center references are normalized.
- Decide whether `employees` should remain the long-term worker identity source or move behind a future HR module.
- Remove legacy JSON reads only after production routes and tests confirm no active UI depends on them.

## Deprecation Candidates

- `manufacturing_boms.components` can be deprecated after line backfill and validation.
- `manufacturing_routings.operations` can be deprecated after step backfill and validation.
- Legacy work center tables can be deprecated only after confirming no route, report, seed, or migration verifier still depends on them.

No destructive cleanup is part of this sprint.
