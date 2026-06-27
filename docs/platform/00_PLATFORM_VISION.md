# Platform Vision

## Doctrine

Nexora is an Enterprise Business Platform. It must be designed as a durable foundation for apps, engines, integrations, automation, AI actions, reports, documents, dashboards, and governed tenant operations.

The platform is not a set of isolated ERP pages. It is the runtime, security, data, UX, and engine layer that makes future business apps consistent, installable, auditable, scalable, and easy to use.

## Core Principles

- App First: every business capability is packaged as an app with metadata, permissions, routes, navigation, lifecycle, dependencies, reports, prints, dashboards, settings, and integration contracts.
- Engine First: shared capabilities belong in platform engines, not duplicated inside apps.
- UX First: users navigate by intent, search, quick actions, dashboards, and contextual workflows, not by database structure.
- Security First: identity, authorization, tenant isolation, RLS, audit, and request context are mandatory platform layers.
- Performance First: large lists, reports, exports, printing, search, integrations, imports, dashboards, and AI workloads must be bounded and async-capable.
- Multi-Tenant By Design: tenant, company, branch, user, employee, and experience scope must be explicit in context and data.
- AI Ready: AI may suggest, draft, explain, and automate only through governed services, permissions, approval gates, and audit trails.
- Easy To Use: raw UUID-first workflows are not acceptable. Lookup, search, command, and contextual selection patterns are required.
- Mobile Ready: navigation, forms, dashboards, and approvals must support compact and touch-friendly experiences.
- Enterprise Grade: auditability, reproducibility, retention, localization, accessibility, and operational visibility are platform responsibilities.

## Product Direction

Nexora evolves from ERP into a platform that can host:

- ERP Workspace apps.
- HR Self-Service Portal apps.
- Admin and marketplace experiences.
- Connector and API surfaces.
- Automation and AI-assisted flows.
- Demo and sandbox tenants.

No business app may become the source of truth for shared runtime, UX, security, reporting, printing, dashboarding, costing, workflow, approval, notification, integration, or audit behavior.

## Design Freeze

The Platform Design Freeze means architecture is stabilized before broad implementation continues.

During this freeze:

- Platform foundations are allowed.
- Documentation and architecture decisions are allowed.
- Business app implementation is paused unless explicitly approved as a platform extraction or boundary protection task.
- New platform architecture must be documented in `docs/platform` before code changes.
