# Security Guidelines

This document defines platform security architecture. It does not implement Identity or Security.

## Security First Rule

Security is a platform foundation. Apps must not implement their own authentication, authorization, entitlement, data scope, RLS bypass, service-role access, or audit behavior.

## Required Layers

Security must be enforced through multiple layers:

- Authentication verifies identity.
- Request context resolves actor, user, tenant, company, branch, employee, experience, locale, timezone, source, and correlation ID.
- Entitlements decide whether a tenant can use an app.
- Permissions decide allowed actions.
- Data scopes decide which rows the actor can access.
- RLS enforces data isolation at the database layer.
- Application services enforce permission, workflow, approval, validation, idempotency, and business invariants.
- Audit records sensitive actions and administrative changes.

## Mandatory Controls

- Default-deny RLS.
- No UI-only authorization.
- No hardcoded tenant, company, branch, permission, or status values.
- No service-role access in browser paths.
- Service-role use isolated behind reviewed platform adapters.
- Permission and entitlement checks centralized through platform contracts.
- Experience separation for ERP, portal, marketplace/admin, connector/API, automation, AI, sandbox, and system contexts.
- Correlation IDs preserved across logs, results, errors, audit, jobs, integrations, and AI actions.

## Permission Model

Permissions must be stable keys with metadata:

- App or platform owner.
- Resource and action.
- Allowed experience.
- Risk level.
- Sensitive data classification.
- Audit requirement.
- Temporary elevation eligibility.
- Data-scope requirement.

Role names must not be used as authorization logic in code.

## Entitlements And Data Scopes

Entitlements, permissions, and data scopes are separate:

- Entitlements answer whether an app or capability is licensed/enabled for a tenant or scope.
- Permissions answer whether an actor can perform an action.
- Data scopes answer which records the actor can access.

Mixing these concepts is an architecture defect.

## Experience Separation

ERP Workspace and Self-Service Portal must remain separated at route group, layout, navigation, data loading, permission, and cache levels.

Portal-only users must not load ERP app registry metadata, ERP navigation, ERP reports, ERP dashboards, or ERP module state.

## Service Role Governance

Service-role access is allowed only behind reviewed server-only platform adapters.

Any service-role operation triggered by a user request must re-apply:

- User identity.
- Tenant/company/branch scope.
- Entitlement.
- Permission.
- Data scope.
- Audit.
- Correlation ID.

## Security Quality Gate

Before a platform engine or app is production-ready, it must have:

- Permission definitions.
- RLS policies.
- RLS regression tests.
- Permission tests.
- Audit coverage.
- Service-role review where relevant.
- Data-scope review.
- Experience separation review.
- Sensitive data classification.
