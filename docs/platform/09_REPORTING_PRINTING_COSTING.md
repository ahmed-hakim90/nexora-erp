# Reporting, Printing, And Costing

Reporting, printing, and costing are platform workloads. Apps contribute definitions and data contracts; they must not build local shortcuts that bypass platform controls.

## Reporting Strategy

Reports are not table exports. Reports are governed workloads executed through the Reporting Engine and Universal Report Builder.

Report categories:

- Operational lists and dashboards.
- Management reports.
- Financial and accounting reports.
- Inventory valuation and movement reports.
- HR and payroll reports.
- Audit and security reports.
- Cross-app analytics.

Rules:

- Reports are registered by apps but executed through the Reporting Engine.
- Filters are validated server-side.
- Sensitive columns require explicit permissions.
- Large reports run asynchronously and produce controlled downloadable results.
- Exports are jobs, not frontend table features.
- Report caches include tenant, company, branch, permission, locale, and filter dimensions.
- Financial and official reports require reproducibility metadata.

## Universal Report Builder

The Universal Report Builder owns:

- Dimensions.
- Measures.
- Filters.
- Sorting.
- Grouping.
- Layouts.
- Saved views.
- Permissions.
- Sensitivity.
- Execution mode.
- Export behavior.
- Branding and formatting.

Apps provide report datasets and report definitions. Apps must not create independent report-builder frameworks.

## Printing Strategy

Printing is official document rendering, not browser screenshots.

Rules:

- Print templates are registered, versioned, permission-checked, and locale-aware.
- Official documents use stable print snapshots.
- Reprints of sensitive or legal documents are audited.
- Batch printing uses background jobs.
- Print outputs support Arabic, English, RTL, LTR, business formatting, and PDF generation.
- Posted or official documents must not change because master data changed later.

## Print Template Designer

The Print Template Designer owns:

- Layout metadata.
- Sections and fields.
- Bindings.
- Localization.
- RTL/LTR behavior.
- Branding slots.
- Page setup.
- Headers and footers.
- Watermarks.
- Template version notes.
- Template approval and publishing lifecycle.

Apps provide printable data contracts and template registrations. Apps must not build local print layout systems for official documents.

## Cost Engine Strategy

The Cost Engine is a platform-adjacent financial engine consumed by inventory, manufacturing, purchasing, sales, and accounting apps when they exist.

Responsibilities:

- Cost policies.
- Valuation methods.
- Cost layers.
- Cost event processing.
- Landed cost allocation.
- Manufacturing cost rollup.
- Variance tracking.
- Closed-period reproducibility.
- Cost reporting contracts.
- Accounting integration contracts.

Rules:

- Apps submit cost events or documents; the Cost Engine calculates according to policy.
- Cost calculations are auditable, deterministic, and tenant/company scoped.
- UI may preview costs, but official cost facts are created server-side.
- Apps that affect stock, manufacturing, purchasing valuation, sales COGS, or accounting cannot launch without a cost policy integration path.

## Background Workloads

Reporting, printing, costing, exports, imports, notifications, integrations, and AI execution must use background jobs where workload size, retries, or user experience require it.

Jobs must carry:

- Tenant/company/branch context.
- Actor context.
- Permission context.
- Correlation ID.
- Idempotency key.
- Progress and status.
- Failure reason.
- Audit metadata.
