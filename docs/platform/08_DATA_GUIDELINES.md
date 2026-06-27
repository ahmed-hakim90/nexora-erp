# Data Guidelines

Nexora data is owned by apps and protected by platform rules.

## Data Ownership Levels

- Global reference: rare public data that is not tenant-private.
- Tenant-owned: private business records include `tenant_id`.
- Company-owned: legal and financial records include `company_id`.
- Branch-scoped: operational records include `branch_id` or explicit source/destination branch scope.
- Department-scoped: organizational records include `department_id` where department ownership affects access or reporting.
- Team-scoped: work queue and collaboration records include `team_id` where team ownership affects access.
- Employee-owned: self-service records include employee scope.
- Self-owned: personal records include principal ownership, usually `principal_id`, for "my" data.

## Data Rules

- Migrations are the only schema change path.
- App tables must include RLS, constraints, foreign keys, indexes, audit fields, and lifecycle fields where appropriate.
- Tenant-owned rows must never rely on nullable `tenant_id` as an access shortcut.
- Company and branch scope must be explicit where operations require it.
- Department, team, employee, and self scopes must be explicit when access or ownership is narrower than branch or company.
- High-volume tables need pagination, indexes, retention, archival, and query-plan review.
- Ledgers are append-focused; corrections use reversal or adjustment entries.
- Document numbers come from the platform numbering/document engine.
- Closed-period reports and costs must remain reproducible.

## Repository Rules

Repositories belong in infrastructure and must not be imported by UI code.

Repository methods must:

- Express business data needs, not generic unrestricted CRUD.
- Receive or derive scope from explicit platform context.
- Avoid unscoped queries.
- Preserve tenant/company/branch filtering.
- Return application DTOs or mapped domain/application objects, not raw database rows to UI.

## Query Rules

- Lists must be paginated.
- Page sizes must be bounded by platform query limits.
- Sorting and filtering must be server-side for persisted records.
- Search input must be normalized before query construction.
- Index expectations must be declared for tenant, company, branch, search, sort, and foreign-key filters.
- Search must be indexed or routed through the search engine for high-volume entities.
- Report and dashboard queries must declare expected cost and caching strategy.
- Exports must be jobs for large or sensitive data.
- Query caches must include tenant, company, branch, locale, experience, permission, and filter dimensions where they affect results.

## RLS Rules

- RLS defaults to deny.
- Insert and update policies require `WITH CHECK`.
- RLS helper functions must be performance-reviewed.
- RLS policies must be tested for tenant, company, branch, department, team, employee, self, and experience isolation where relevant.
- Service-role bypasses must be isolated and audited.
- Soft-deleted and archived records must be excluded by default unless a specific recovery or archive access contract allows them.

## Lifecycle Fields

Reusable platform lifecycle contracts use:

- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `deleted_at`
- `deleted_by`
- `archived_at`
- `archived_by`
- `version`

These fields are defined as platform contracts in Sprint 4. Existing legacy tables are not retrofitted automatically.

## Migration Standards

Future app migrations must follow these conventions:

- `tenant_id` is required for tenant-owned records.
- `company_id` is required for financial, legal, or company-owned records.
- `branch_id` is required for branch operations.
- `department_id`, `team_id`, `employee_id`, or `principal_id` are required when ownership is narrower than branch/company.
- Indexes are required for tenant, company, branch, department, team, employee, principal, and common list filters used by RLS or server-side queries.
- RLS is required by default for scoped records.
- Insert and update policies must use `WITH CHECK`.
- Tenant, company, and branch columns must be immutable where changing them would move ownership after creation.
- Migrations that add non-null scope columns need backfill plans.
- RLS tests are required for scoped tables.

## Data Quality Gate

Before app schema work is accepted, the app must define:

- Ownership scope for every table.
- RLS strategy.
- Index and pagination strategy.
- Retention and archival needs.
- Audit fields and lifecycle fields.
- Migration rollback or remediation plan.
- Reporting and export impact.
- Search and dashboard impact.
- Performance risks.
