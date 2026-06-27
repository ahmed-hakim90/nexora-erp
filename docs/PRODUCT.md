# Nexora Platform Product Blueprint

## Product Definition

Nexora Platform is a modular enterprise business platform for companies that need one operational backbone across people, finance, operations, commerce, assets, and AI-assisted automation.

Nexora is not only an ERP. ERP is one workspace inside a broader platform that can power:

- ERP operations
- HR self-service
- Manufacturing
- Inventory and warehouses
- Accounting and finance
- Sales and invoicing
- Procurement
- CRM
- POS
- Service center operations
- Marketplace workflows
- Rental management
- AI automation

The platform must be built as a long-lived business system, not as a simple CRUD admin dashboard. Every product decision must protect correctness, auditability, extensibility, performance, and tenant isolation.

Nexora must treat finance, inventory, payroll, approvals, and audit records as enterprise records. User convenience must not weaken document integrity, segregation of duties, or tenant isolation.

## Product Vision

Nexora should become the system of record and system of action for medium-sized businesses that need enterprise-grade controls without the cost and operational weight of traditional ERP suites.

The long-term vision is:

- One platform for multiple business domains.
- One identity, permission, audit, workflow, and notification foundation.
- Modular rollout by company, branch, role, and license.
- Strong Arabic and English support from the first release.
- Data structures that survive 10 years of product growth.
- AI automation that assists users without bypassing approvals, permissions, or audit rules.

## Target Industries

Nexora should be designed for industries where ERP, HR, inventory, service, sales, and finance often intersect:

- Trading and distribution
- Manufacturing and assembly
- Retail and POS
- Rental businesses
- Service centers and maintenance companies
- Multi-branch companies
- Procurement-heavy organizations
- Companies with large employee self-service populations
- Marketplaces that need operational ERP integration

Industry-specific behavior must be implemented as modules or configuration, not by weakening the core architecture.

## Scale Targets

The first platform blueprint must support:

- 600 total users.
- Most users as HR self-service users only.
- 100-150 operational ERP users.
- 6,000+ customers.
- 25,000+ products.
- 30,000+ invoices per year.
- 10,000+ warehouse transfers per year.
- Heavy reports.
- Heavy printing.
- Audit logs for sensitive and financial operations.
- Multi-company and multi-branch operations.
- Arabic and English.
- RTL and LTR layouts.
- Dark and light mode.
- Growth beyond the initial scale without rewriting module boundaries.
- Closed-period financial and operational reporting.
- Controlled exports and official printing.
- Long-term audit retention for sensitive operations.

These numbers are not extreme for PostgreSQL, but they require disciplined schema design, indexing, query boundaries, background work, and report strategies from the beginning.

The platform must be designed so growth increases data volume and module count without forcing ERP users, portal users, reports, and print jobs into the same runtime bottleneck.

## Product Experiences

### ERP Workspace

The ERP Workspace is for operational and administrative users:

- Administrators
- Managers
- Accountants
- Production users
- Warehouse users
- Sales users
- Procurement users
- Service center users
- POS supervisors

This workspace may expose cross-module navigation, dashboards, reports, approvals, administrative tools, and operational documents based on permissions.

ERP Workspace users must only see modules that their role, tenant, branch, and license allow.

ERP Workspace must support segregation of duties. Creating, approving, posting, cancelling, printing, exporting, and configuring records must be separable capabilities.

### HR Self-Service Portal

The HR Self-Service Portal is a separate experience for employees who do not need ERP operations.

Allowed areas:

- My Profile
- My Attendance
- My Leave Requests
- My Loan Requests
- My Penalties
- My Payslips
- My Documents
- My Approvals, only if the employee is a manager or approver

HR self-service users must not load ERP navigation, ERP reports, production, inventory, sales, accounting, procurement, CRM, POS, marketplace, rental, or service center modules.

This separation is a product requirement, security requirement, performance requirement, and UX requirement.

If an employee also has ERP duties, the platform must still keep Portal and ERP experiences scoped separately. Portal access does not become ERP access, and ERP access does not widen self-service ownership rules.

## Core Platform Modules

Core modules are not business features. They are platform capabilities used by every business module:

- Identity and user profiles
- Tenant and company management
- Branch and location management
- Role-based access control
- Permission registry
- Feature and module registry
- Workflow engine
- Approval engine
- Notification engine
- Audit logging
- Document numbering
- File attachments
- Localization
- UI preferences
- Report infrastructure
- Print infrastructure
- Integration infrastructure
- AI automation governance

Core modules must remain business-domain neutral.

## Business Modules

Business modules represent operational domains:

- HR
- Payroll
- Attendance
- Accounting
- Sales
- Procurement
- Inventory
- Manufacturing
- CRM
- POS
- Service Center
- Marketplace
- Rental Management
- AI Automation

Each business module must own its domain vocabulary, use cases, repositories, schemas, permissions, statuses, and UI routes.

## Platform Principles

Nexora must follow these principles:

- Modular monolith first.
- Strict TypeScript everywhere.
- Feature-based architecture.
- Clean architecture boundaries.
- Repository pattern for persistence.
- Service layer for application workflows.
- Explicit domain rules.
- No business logic inside React components.
- No Supabase queries inside UI components.
- No random shared folders.
- No huge global services folder.
- No huge global types folder.
- No hardcoded permissions.
- No hardcoded tenant IDs.
- No hardcoded statuses.
- RLS as a database safety boundary.
- Application permissions as the user experience and workflow boundary.
- Auditability for sensitive business changes.
- Explicit module entitlements before permissions.
- Segregation of duties for high-risk workflows.
- Official document snapshots for printing.
- Asynchronous execution for heavy reports, exports, and print batches.
- Default-deny data access.

## Product Non-Goals For Initial Foundation

The initial foundation must not implement:

- ERP modules.
- UI screens.
- Business feature workflows.
- Demo CRUD pages.
- Temporary permission shortcuts.
- Tenant-specific custom code.
- Hardcoded Arabic or English strings in components.

The first mission is to establish the system blueprint so future implementation is consistent.

## Success Criteria

Nexora is architecturally successful when:

- A new module can be added without touching unrelated modules.
- HR self-service users do not pay the performance or complexity cost of ERP.
- Business rules are testable without rendering UI.
- Data access is tenant-safe by default.
- Permissions are centrally registered and consistently enforced.
- Reports and printing do not block operational work.
- Audit logs can explain who changed what, when, where, and why.
- Arabic, English, RTL, LTR, dark mode, and light mode are platform capabilities, not afterthoughts.
- Module boundaries remain clear after many modules are added.
- A portal-only employee cannot accidentally load ERP code or data.
- A report or print spike cannot degrade core operational transactions.
- Financial, inventory, payroll, approval, and audit histories remain explainable years later.
