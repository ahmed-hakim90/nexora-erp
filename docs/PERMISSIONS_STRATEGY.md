# Permissions Strategy

## Purpose

Nexora uses role-based access control with explicit permission keys and scoped assignments.

Permissions must be product-defined, centrally registered, tenant-aware, and enforced consistently across backend services, route loaders, UI navigation, reports, printing, and workflow actions.

## Principles

Permission design must follow these rules:

- No hardcoded permissions outside registries.
- No hardcoded tenant, company, or branch exceptions.
- No UI-only permission enforcement.
- No permission checks only in RLS.
- No role names used as business logic shortcuts.
- Permissions describe actions.
- Roles group permissions.
- Assignments scope roles to tenant, company, branch, and module context.
- Module entitlements decide whether a tenant can use a module.
- Permissions decide whether a user can act inside an entitled module.
- Data scopes decide which tenant, company, branch, employee, or document rows the user can access.

Entitlements, permissions, and data scopes are separate concepts and must not be collapsed into one role flag.

## Permission Key Format

Permission keys use dot notation:

```text
<module>.<resource>.<action>
```

Examples:

```text
sales.invoice.read
sales.invoice.create
sales.invoice.approve
sales.invoice.print
inventory.transfer.create
inventory.transfer.approve
hr.leave-request.submit
hr.leave-request.approve
accounting.journal.post
platform.user.manage
```

Permission keys must be stable. Renaming a permission is a migration and product decision.

## Permission Registry

Each feature module owns its permission registry.

A platform-level permission registry aggregates module registries for:

- Role configuration.
- Navigation visibility.
- Server-side authorization.
- Report access.
- Print access.
- Audit labels.
- Admin screens when implemented later.

The registry should include:

- Key.
- Human-readable label.
- Description.
- Module.
- Resource.
- Action.
- Risk level.
- Whether the permission is ERP-only, portal-allowed, or platform-admin-only.
- Whether the permission can view sensitive data.
- Whether the permission can mutate posted or official records.
- Whether use of the permission should be audited.
- Whether the permission is eligible for temporary elevation.

## Roles

Roles are bundles of permissions.

Examples:

- Tenant Administrator
- Company Administrator
- Branch Manager
- Accountant
- Warehouse User
- Sales User
- Procurement User
- Production User
- HR Officer
- Payroll Officer
- Employee Self-Service
- Manager Approver

Roles must be configurable by tenant where product requirements allow it.

Role names must not be used in code as authorization decisions. Code checks permissions, not role labels.

System roles may be shipped as templates, but tenant-specific roles must be stored as data. Template updates must not silently grant new high-risk permissions to existing tenants without an explicit migration decision.

## Scoped Assignments

User access is determined by assignment records.

Assignments may include:

- Tenant scope.
- Company scope.
- Branch scope.
- Role.
- Module access.
- Effective dates.
- Active/inactive status.
- Experience access: ERP Workspace, HR Portal, or both.
- Delegation source when access is delegated.
- Assignment reason or ticket reference for high-risk access.

A user may have multiple assignments.

Examples:

- Accountant for Company A.
- Warehouse user for Branch 1 and Branch 2.
- HR self-service employee for one tenant.
- Manager approver for direct reports.

Assignments must be effective-dated so temporary access, delegation, and employee transfers do not require destructive history edits.

## Module Entitlements

Module entitlement controls whether a tenant, company, or branch is allowed to use a module at all.

Rules:

- A permission cannot grant access to a disabled or unlicensed module.
- Navigation must require both entitlement and permission.
- Server actions must require both entitlement and permission.
- Reports and printing must require both entitlement and permission.
- Entitlement checks must be server-side.

## ERP Workspace Permissions

ERP Workspace access requires:

- A valid authenticated session.
- Access to the ERP experience.
- At least one ERP module permission.
- Tenant assignment.
- Company or branch assignment where applicable.

ERP navigation must be generated from permissions and module registry data. It must not be hardcoded per user.

ERP users should only load the modules they can access.

## HR Self-Service Permissions

HR self-service users receive a narrow permission set.

Typical permissions:

```text
portal.profile.read-own
portal.attendance.read-own
portal.leave-request.read-own
portal.leave-request.submit-own
portal.loan-request.read-own
portal.loan-request.submit-own
portal.payslip.read-own
portal.document.read-own
portal.approval.read-assigned
portal.approval.decide-assigned
```

HR self-service users must not receive ERP module permissions unless explicitly assigned a separate ERP role.

The portal layout must not load ERP navigation or ERP reports for self-service-only users.

Users with both portal and ERP assignments must receive experience-specific navigation. Portal routes must use portal permissions and employee scopes even if the same person has ERP permissions elsewhere.

## Permission Enforcement Points

Permissions must be enforced in:

- Server Actions.
- API Route handlers.
- Application services.
- Server-side page loaders.
- Report generation.
- Print generation.
- Navigation generation.
- Workflow transitions.
- Approval decisions.
- Sensitive file access.

UI checks are for usability only. Backend checks are mandatory.

Authorization must be centralized through platform authorization services. Ad hoc permission checks inside random services, UI components, or SQL snippets are not allowed.

## Segregation Of Duties

Enterprise ERP workflows require segregation of duties.

Rules:

- A user should not approve their own request unless the policy explicitly allows it.
- A user should not create and post high-risk financial documents without an approved role policy.
- Payroll preparation, approval, and publishing should be separable permissions.
- Inventory transfer creation, approval, dispatch, and receipt should be separable permissions.
- Permission assignment changes should require administrative permissions and audit logs.
- High-risk permission combinations must be visible during role configuration.

Segregation rules belong in approval and authorization services, not UI-only warnings.

## Workflow And Approval Permissions

Workflow transitions require permissions.

Examples:

- Submit.
- Review.
- Approve.
- Reject.
- Post.
- Cancel.
- Reopen.

Approval decisions require:

- User is an assigned approver or delegated approver.
- User has the required approval permission.
- Document is in an approvable state.
- Company and branch scope match the user's assignment.
- Segregation-of-duties policy allows the actor to decide.
- Delegation, escalation, and effective dates are valid at decision time.

Permission checks must not be bypassed by directly updating statuses.

## Report Permissions

Reports are business capabilities and require permissions.

Report permissions should distinguish:

- View report.
- Export report.
- Print report.
- View sensitive columns.
- View cross-branch data.
- View cross-company data.

Sensitive reports such as payroll, accounting, and profitability must have explicit permissions.

Export permissions must be separate from view permissions for sensitive reports. A user who can view a report in the application does not automatically have permission to export all rows.

## Printing Permissions

Printing business documents is an action.

Print permissions should distinguish:

- Print draft.
- Print official document.
- Reprint posted document.
- Print sensitive document.
- Print with prices or costs.
- Print without prices or costs.

Reprinting legally significant documents may require audit events.

Official reprints must record actor, timestamp, document version, template version, and reason when required by policy.

## Administrative Permissions

Administrative permissions must be narrowly defined.

Examples:

- Manage users.
- Assign roles.
- Manage company settings.
- Manage branch settings.
- Configure numbering.
- Configure workflows.
- Configure approval policies.
- View audit logs.

No user should receive broad administrative power by accident through a generic admin flag.

Break-glass administrative access, if introduced, must be temporary, reason-coded, heavily audited, and excluded from normal role templates.

## Permission Auditing

Audit logs are required for:

- Role creation.
- Role changes.
- Permission assignment changes.
- User assignment changes.
- Administrative access changes.
- Elevated permission use where product policy requires it.

Audit records must include the actor, target user, changed permissions or roles, scope, timestamp, and reason when required.

Permission audit logs must preserve before and after permission sets for high-risk changes.

## Testing Permissions

Each module must test:

- Authorized user can perform allowed action.
- Unauthorized user cannot perform action.
- User cannot act outside assigned tenant.
- User cannot act outside assigned company or branch.
- Portal-only user cannot access ERP functions.
- ERP user cannot access HR private data without permission.
- Approval user cannot approve unassigned documents.
- Disabled module entitlement blocks access even when user has permissions.
- Temporary assignment expires correctly.
- User with both ERP and Portal access receives correct experience-scoped permissions.
- Segregation-of-duties rules block prohibited approval paths.

Testing should target application services and route adapters, not only UI components.
