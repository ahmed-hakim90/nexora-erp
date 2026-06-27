# Performance Strategy

## Purpose

Nexora must support operational ERP workloads, employee self-service traffic, heavy reports, and heavy printing without turning the application into a slow monolith.

Performance must be designed into data access, routing, module loading, reporting, printing, and background processing from the beginning.

## Scale Assumptions

Initial platform scale targets:

- 600 total users.
- Most users are HR self-service users.
- 100-150 operational ERP users.
- 6,000+ customers.
- 25,000+ products.
- 30,000+ invoices per year.
- 10,000+ warehouse transfers per year.
- Heavy reports.
- Heavy printing.
- Multi-company and multi-branch access.

These volumes are manageable with PostgreSQL and Next.js when the platform avoids unbounded queries, client-side data dumps, and inefficient reporting paths.

## Performance Principles

Rules:

- Load only the experience the user needs.
- Keep HR Portal lightweight.
- Do not load ERP navigation for portal-only users.
- Paginate all large lists.
- Search server-side for large datasets.
- Filter by tenant, company, branch, date, and status before returning data.
- Use indexes that match access patterns.
- Avoid N+1 queries.
- Do not render heavy reports inside normal page requests.
- Do not block operational workflows with print rendering.
- Cache carefully and never across tenant boundaries.
- Define performance budgets before implementation.
- Treat reports, exports, printing, imports, notifications, and AI jobs as separate workloads from interactive ERP screens.

## Performance Budgets

Initial budgets must be set before production release and adjusted with real measurements.

Recommended starting targets:

- Portal dashboard data must load with a small bounded query set.
- ERP list pages must use server-side pagination from the first implementation.
- Interactive list queries must avoid unbounded date ranges on high-volume tables.
- Heavy reports must move to asynchronous generation before they threaten normal request timeouts.
- Batch print jobs must use background processing when they include many documents or expensive templates.

Any feature that cannot state its expected data volume, query shape, and indexing strategy is not ready for implementation.

## Experience-Level Performance

### ERP Workspace

ERP Workspace may load:

- Module registry for authorized ERP modules.
- Permission-filtered navigation.
- ERP dashboards.
- Approval queues.
- Operational summaries.

ERP Workspace must avoid:

- Loading all module code at once.
- Loading all reports at startup.
- Loading all products, customers, or employees into memory.
- Running heavy dashboard aggregates synchronously on every request.
- Sharing global providers that initialize every module.
- Fetching report counts for modules the user cannot access.

### HR Self-Service Portal

HR Self-Service Portal must be optimized for many lightweight users.

Portal must load only:

- Portal navigation.
- User profile summary.
- Employee-owned requests and documents.
- Assigned approvals when relevant.

Portal must not load:

- ERP navigation.
- ERP report registry.
- Product catalogs.
- Warehouse data.
- Accounting data.
- Procurement data.
- Manufacturing data.

This is a major performance requirement, not only a security requirement.

Portal bundle and data dependencies must be reviewed separately from ERP. Portal performance should not degrade as ERP modules are added.

## Database Performance

Database performance rules:

- Every high-volume table must have indexes for common filters.
- Queries must include tenant scope.
- Operational list pages must use pagination.
- Date range filters are required for high-volume transactions.
- Avoid `select *` in repository methods.
- Avoid large joins in interactive screens unless necessary.
- Use read models for complex screens.
- Use materialized views or summaries for expensive reports.

High-volume tables include:

- Invoices.
- Invoice lines.
- Stock movements.
- Warehouse transfers.
- Product catalog.
- Attendance events.
- Audit logs.
- Notifications.
- Approval decisions.

High-volume table designs must include lifecycle expectations: active rows, historical rows, retention period, archival approach, and expected query filters.

## Query Design

Interactive queries should be:

- Scoped.
- Indexed.
- Paginated.
- Permission-aware.
- Projection-based.

Repositories must return only the fields required by the use case or read model.

Search must be server-side for:

- Products.
- Customers.
- Suppliers.
- Employees.
- Documents.
- Warehouses.
- Serial numbers.

Search must use appropriate database features such as indexed prefix search, full-text search, trigram indexes, or dedicated search infrastructure if needed later. `ILIKE '%term%'` on high-volume tables is not acceptable without a reviewed index strategy.

## Pagination Strategy

Pagination is required for operational lists.

Rules:

- Prefer cursor/keyset pagination for high-volume or frequently changing datasets.
- Offset pagination is acceptable for small, stable lists or administrative tables.
- Default page sizes must be bounded.
- Export all is not a table feature; it is a report/export job.
- Sorting options must match available indexes for high-volume lists.

## Caching Strategy

Caching may be used for:

- Permission registries.
- Module registries.
- Static configuration.
- Localization bundles.
- Feature flags.
- Report results.
- Print templates.
- Non-sensitive lookup lists.

Caching rules:

- Never leak data across tenants.
- Cache keys must include tenant, company, branch, locale, and permission-sensitive dimensions where applicable.
- Sensitive HR and payroll data should be cached only with explicit approval.
- Cache invalidation must be designed before caching mutable business data.
- Cache keys for permission-sensitive data must include a permission or role version where feasible.
- Caches must be invalidated after role, assignment, entitlement, workflow, numbering, and configuration changes.

## Reporting Strategy

Reports are a separate workload from operational screens.

Report types:

- Lightweight operational reports.
- Management dashboards.
- Financial reports.
- Inventory valuation and movement reports.
- Payroll and HR reports.
- Audit reports.
- Cross-company or cross-branch reports.

Rules:

- Heavy reports must run through report services.
- Large reports must be generated asynchronously.
- Reports must support export jobs.
- Long-running reports must show status.
- Report results must be permission-scoped.
- Reports must use optimized SQL, read models, summary tables, or materialized views.
- React must not aggregate large raw datasets.
- Reports must have maximum date ranges or asynchronous execution rules.
- Report filters must be validated server-side.
- Report result access must be checked again when the user downloads or prints the result.
- Report jobs must record requesting user, tenant, filters, status, duration, and failure reason.

Reports that support accounting, inventory valuation, payroll, or audit must declare reproducibility rules for closed periods.

## Printing Strategy

Printing must be designed as server-supported rendering.

Rules:

- Heavy print jobs must not block normal page interaction.
- Official documents must use stable print snapshots.
- Print templates must be versioned.
- Reprints may require audit logs.
- Batch printing should run as background work when introduced.
- Print output must support Arabic, English, RTL, LTR, and business formatting.
- Print rendering must use stable snapshots for official documents.
- Batch print jobs must produce status and error records.
- Print templates must be cached by version and invalidated intentionally.
- Large PDFs must be streamed or stored for download rather than held in browser memory.

Examples of heavy print scenarios:

- Invoice batches.
- Payslip batches.
- Warehouse transfer documents.
- Delivery note batches.
- Service reports.
- Rental contracts.

## Background Work Strategy

Nexora may introduce background jobs for:

- Heavy report generation.
- Batch printing.
- Notification delivery.
- File processing.
- Imports.
- Exports.
- AI automation.
- Data synchronization.

Background jobs must carry:

- Tenant context.
- Actor or service identity.
- Permission context when required.
- Audit correlation ID.
- Retry policy.
- Failure handling.
- Idempotency key.
- Job priority.
- Timeout policy.
- Dead-letter or manual recovery path.

Background jobs that mutate business state must call application services. They must not write directly to tables to bypass permissions, domain rules, workflow, or audit.

## Frontend Performance

Frontend performance rules:

- Use route groups to split ERP and Portal experiences.
- Lazy-load heavy module UI.
- Avoid massive client bundles.
- Use server components where useful.
- Use client components only where interactivity is needed.
- Use virtualization for large visible tables if needed.
- Use pagination before virtualization.
- Avoid global providers that load all modules.
- Keep shadcn/ui customization consistent and lightweight.
- Keep client components narrow and avoid turning entire route trees into client-rendered applications.
- Avoid importing ERP-only component libraries into portal routes.

## Forms And Tables

Large forms:

- Split into logical sections.
- Load lookup data on demand.
- Search products/customers/employees server-side.
- Avoid loading all options in select components.

Tables:

- Paginate server-side.
- Sort server-side for large datasets.
- Filter server-side.
- Export through backend report/export services.

## Observability

Performance must be measurable.

Track:

- Slow database queries.
- Report generation duration.
- Print generation duration.
- API and Server Action latency.
- Page load time by experience.
- Bundle size by route group.
- Background job failures.
- RLS policy performance on high-volume tables.
- Queue depth and job duration.
- Cache hit rate for safe caches.
- Export size and duration.
- Print output size and duration.

Performance regressions must be treated as product quality issues.

## Performance Release Gate

Before releasing a module:

- Large lists are paginated.
- Search is server-side for high-volume entities.
- Required indexes exist.
- Reports do not block operational pages.
- Printing strategy is defined.
- Portal users do not load ERP assets.
- Permission and tenant-aware caches are safe.
- RLS policy performance is reviewed for high-volume tables.
- Search queries have reviewed indexes.
- Cursor pagination is used where offset pagination will not scale.
- Background jobs have idempotency and failure handling.
- Performance budgets are documented for the module.
