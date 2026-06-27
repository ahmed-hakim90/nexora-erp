# RLS Strategy

## Purpose

Row Level Security is a mandatory database safety boundary for Nexora.

RLS protects tenant data even if an application query is incomplete or incorrect. It is not a replacement for application authorization, workflow rules, validation, or business services.

## RLS Principles

Nexora RLS policies must follow these principles:

- Tenant isolation is enforced at the database level.
- User access is derived from authenticated identity and assignment tables.
- Company and branch access are enforced where relevant.
- HR self-service users can only access their own self-service data unless they are assigned as managers or approvers.
- ERP users only access modules, companies, and branches assigned to them.
- Service-role operations must be limited and auditable.
- Policies must be readable and testable.
- RLS must default to deny.
- New tenant-owned tables are not production-ready until RLS is enabled, forced where appropriate, and tested.

## Default-Deny Rule

Every tenant-owned table must start from no access.

Rules:

- Enable RLS when the table is created.
- Use `FORCE ROW LEVEL SECURITY` for application-owned tenant tables unless a documented database-owner maintenance path requires otherwise.
- Add separate policies for select, insert, update, and delete.
- Avoid broad catch-all policies.
- Treat missing policies as a security defect.
- Treat permissive temporary policies as release blockers.

## Security Layers

Nexora uses multiple security layers:

1. Authentication confirms who the user is.
2. Application authorization confirms what the user is allowed to do.
3. Domain rules confirm whether the business action is valid.
4. RLS confirms which rows the database may expose or mutate.
5. Audit logs record sensitive actions.

No layer should be treated as optional.

## Tenant Isolation

Every tenant-owned table must include `tenant_id` and have policies that restrict access to tenants assigned to the authenticated user.

The policy concept is:

- A user belongs to one or more tenants.
- A user may have company and branch assignments inside a tenant.
- Queries only return rows within the user's accessible tenant scope.

No policy may use hardcoded tenant IDs.

Tenant membership must be resolved from database assignment tables or reviewed helper functions. It must not be inferred from email domain, UI-selected tenant name, environment variables, or client-provided claims that are not verified server-side.

## Company And Branch Scope

Company and branch policies must be layered on top of tenant policies.

Rules:

- Company-scoped tables require user access to that company.
- Branch-scoped tables require user access to that branch.
- Cross-branch documents require access rules for source and destination branches.
- Global tenant administrators may receive broader access through assignment records, not hardcoded exceptions.

Branch scope must not be inferred from UI state alone.

For insert policies, the new row's tenant, company, and branch values must be checked with `WITH CHECK`, not only `USING`. A user must not be able to insert a row into an unassigned tenant or branch and then rely on RLS hiding it.

## ERP Workspace Access

ERP Workspace users may access operational data only when:

- They are authenticated.
- They belong to the tenant.
- They are assigned to the company or branch needed by the row.
- Their application role grants the required module permission.
- The application service confirms the use case is valid.

RLS filters row visibility. Application services enforce action-level permissions.

## HR Self-Service Access

HR self-service policies must be intentionally narrow.

Employees may access:

- Their own profile summary.
- Their own attendance records.
- Their own leave requests.
- Their own loan requests.
- Their own penalties if product policy allows visibility.
- Their own payslips.
- Their own documents.
- Approval items assigned to them as manager or approver.

They must not access:

- ERP navigation data.
- ERP reports.
- Production data.
- Inventory data.
- Sales data.
- Accounting data.
- Procurement data.
- Other employee private records unless approval responsibility allows a limited view.

Self-service RLS policies must use the user's linked `employee_id`.

If a user has both ERP and portal access, portal policies must still remain narrow. ERP permissions must not automatically widen self-service ownership policies unless the user enters an ERP route and passes ERP authorization.

## Permission-Aware RLS

RLS usually enforces row scope, not every UI action permission.

However, certain sensitive tables may require permission-aware policies:

- Audit logs.
- Payroll.
- Payslips.
- HR disciplinary data.
- Financial posting tables.
- Permission assignment tables.

When permission-aware RLS is used, permissions must come from normalized permission assignment tables or database functions that read those tables. Permission keys must not be duplicated as random strings in policy definitions.

Permission-aware RLS must be used sparingly because it can become expensive and hard to reason about. Prefer application authorization for action checks and RLS for row scope unless the table contains highly sensitive data or can be queried directly by authenticated clients.

## Read And Write Policies

Read and write policies must be separate.

Read access does not imply insert, update, or delete access.

Write policies must check:

- Tenant scope.
- Company scope.
- Branch scope.
- Actor assignment.
- Row ownership when applicable.
- Whether the row can be mutated directly.
- `WITH CHECK` conditions for inserted or updated values.
- Immutable fields such as `tenant_id`, `company_id`, `branch_id`, document number, and posted ledger facts where applicable.

Application services still enforce detailed business rules and workflow transitions.

Delete policies should be denied by default for business records. Use cancellation, reversal, archival, or soft delete only where the module defines the lifecycle explicitly.

## Service Role Usage

Supabase service role access bypasses RLS and must be treated as privileged infrastructure.

Allowed service-role usage:

- Trusted backend-only jobs.
- Migrations.
- Controlled administrative maintenance.
- Background workers that explicitly reapply tenant and permission context.

Disallowed service-role usage:

- Client-side code.
- React components.
- Browser-exposed API calls.
- Shortcuts around broken RLS policies.

Service-role operations that affect business data must produce audit logs where appropriate.

Service-role code must be isolated behind reviewed platform adapters. Any service-role operation triggered by a user request must re-apply user context and permission checks before touching data.

## Policy Testing

Every high-risk module must include RLS tests for:

- User can access assigned tenant rows.
- User cannot access another tenant's rows.
- User can access assigned branch rows.
- User cannot access unassigned branch rows.
- HR self-service user can access own records.
- HR self-service user cannot access ERP data.
- Manager can access assigned approval records.
- Unauthorized writes are rejected.
- Insert into unauthorized tenant, company, or branch is rejected.
- Update cannot move a row into another tenant, company, or branch.
- Delete is denied unless explicitly allowed.
- Service-role adapter tests prove authorization is reapplied.

RLS test data must not depend on production tenant IDs.

## Policy Naming

Policy names should be clear and consistent.

Recommended format:

```text
<table>_<operation>_<scope>
```

Examples:

```text
sales_invoices_select_tenant_company_branch
hr_payslips_select_self_or_payroll_manager
inventory_transfers_update_assigned_branch
```

## Database Functions For RLS

Reusable database functions may be used to keep policies readable.

Function examples:

- `auth_user_has_tenant(tenant_id)`
- `auth_user_has_company(company_id)`
- `auth_user_has_branch(branch_id)`
- `auth_user_has_permission(permission_key)`
- `auth_user_employee_id()`

Rules:

- Functions must be security-reviewed.
- Functions must not hide broad access assumptions.
- Functions must avoid hardcoded tenant, branch, role, or status values.
- Function performance must be considered because RLS evaluates frequently.
- Security-definer functions must set a safe search path.
- Functions must avoid volatile behavior unless required.
- Functions used in high-volume policies must have supporting indexes on assignment tables.

Sprint 2 helper functions:

- `current_user_id()`
- `current_tenant_ids()`
- `is_tenant_member(tenant_id)`
- `has_permission(permission_key, tenant_id)`

These helpers are used only for core membership and RBAC isolation. Future business modules must add their own RLS policies using these helpers rather than bypassing them.

## RLS Performance Strategy

RLS policies execute frequently and can become hidden performance bottlenecks.

Rules:

- Assignment tables used by policies must be indexed by user, tenant, company, branch, and active status.
- Helper functions must avoid scanning large permission tables repeatedly.
- High-volume list queries must be tested with realistic assignment counts.
- Policies should avoid complex joins when a precomputed assignment table can safely represent access.
- Query plans must be reviewed for high-volume tables before release.

## Common RLS Mistakes To Avoid

Avoid:

- Relying only on frontend filtering.
- Writing permissive `true` policies for convenience.
- Combining all operations into one unclear policy.
- Using service role from client-facing code.
- Forgetting policies on new tables.
- Using tenant IDs in environment variables as access rules.
- Letting HR self-service policies reuse broad ERP policies.
- Assuming RLS replaces application permissions.
- Using client-supplied tenant IDs without verifying assignment.
- Forgetting `WITH CHECK` on insert and update policies.
- Letting update policies allow tenant, company, or branch reassignment.

## Release Gate

A module is not production-ready until:

- Every tenant-owned table has RLS enabled.
- Select, insert, update, and delete policies are intentionally defined.
- HR self-service access is tested if the module exposes employee data.
- ERP access is tested for assigned and unassigned branches.
- Service-role use is documented.
- Policy performance is reviewed for high-volume tables.
- RLS regression tests are part of the module release gate.
- Policy helper functions have reviewed search paths and supporting indexes.
