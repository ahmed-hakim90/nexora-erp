# Platform Kernel

## Related Documents

- [Platform Overview](PLATFORM_OVERVIEW.md)
- [Runtime](RUNTIME.md)
- [Security](SECURITY.md)
- [Data Layer](DATA_LAYER.md)

Platform Core is the neutral runtime every app, engine, connector, automation, and AI action depends on. It must not contain business domain logic.

From the [Platform Blueprint](PLATFORM_OVERVIEW.md):

**Responsibilities:**

- Identity, session, tenant, company, branch, employee, and experience context.
- RBAC, entitlements, data scopes, segregation of duties.
- App registry, app installation state, feature flags, settings, localization, theme, observability, logging, error normalization, feedback, and audit foundation.
- Server-only data access boundaries and service-role governance.
- Runtime contracts for apps, engines, connectors, SDK clients, AI actions, and background workers.

**Non-responsibilities:**

- Inventory rules, purchasing lifecycle, manufacturing execution, HR payroll, accounting posting, sales tax logic, or other business-specific behavior.

## Platform Modules

Platform modules provide cross-cutting capabilities:

- Authentication and session context
- Tenant/company isolation
- Branch scoping
- Permission registry and RBAC
- Workflow definitions
- Approval routing
- Notification delivery
- Audit event capture
- Document numbering
- File attachment handling
- Localization and formatting
- Reporting infrastructure
- Printing infrastructure
- Observability

Platform modules must be generic enough to serve all business modules without absorbing their domain rules.

Platform modules may depend on other platform modules only through explicit contracts. Business modules may depend on platform modules, but platform modules must not import business module code.

## Multi-Tenant Strategy

Nexora must support multiple companies and tenants from the foundation.

Required concepts:

- `tenant_id`: the isolation boundary for data ownership.
- `company_id`: legal or operating company under a tenant.
- `branch_id`: operational location or branch under a company.
- `user_id`: authenticated identity.
- `employee_id`: HR/personnel identity when applicable.

Every tenant-owned business table must include `tenant_id`.

Company-owned tables must include `company_id`.

Branch-scoped tables must include `branch_id` when operations differ by location.

No tenant, company, or branch ID may be hardcoded in application code, UI code, SQL policies, seeds, or tests.

## Multi-Branch Strategy

Branches are operational scopes used by inventory, sales, procurement, POS, service center, HR attendance, and reporting.

Branch strategy must support:

- Users assigned to one or more branches.
- Documents created in a branch context.
- Inventory balances by warehouse/location, not only branch.
- Financial documents tied to company and optionally branch.
- Reports filterable by branch with permission enforcement.
- Cross-branch transfers with explicit source and destination.

Branch access is not a replacement for tenant isolation. It is a second-level authorization scope.

Branch context must be explicit for operational actions. If a user has access to multiple branches, the active branch must be selected or derived by a server-side rule before mutation. Ambiguous branch context must fail closed.
