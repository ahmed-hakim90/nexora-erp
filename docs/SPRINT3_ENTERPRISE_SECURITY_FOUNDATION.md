# Sprint 3 Enterprise Security Foundation

## Security Architecture

Nexora security is a platform foundation shared by Platform Engines, Business Apps, Connectors, Automations, and AI Actions.

Authorization is centralized around stable public contracts:

- Roles group permissions and are stored as data.
- Permissions describe actions on protected resources.
- Permission categories and groups organize permission metadata.
- Entitlements describe tenant ownership of apps and capabilities.
- Data scopes describe which records an identity can access.
- Security metadata describes risk, audit, sensitive data, approval, MFA, feature flag, and elevation requirements.
- The permission resolver evaluates access consistently across runtime surfaces.

Business modules must not implement their own role model, entitlement model, data scope model, or resolver.

## Runtime Flow

1. Resolve authenticated identity and request context.
2. Resolve requested experience.
3. Resolve tenant and optional company, branch, employee, or future scope context.
4. Resolve tenant entitlement for the target app or capability.
5. Resolve active role assignments.
6. Resolve permission metadata.
7. Resolve data scope coverage.
8. Resolve feature flag gates when metadata requires them.
9. Evaluate temporary elevation contracts when present.
10. Return an allow or deny decision with stage-specific reasons.

## Public Contracts

Public contracts live in `src/platform/security/public-api.ts` and are re-exported from `src/platform/permissions/public-api.ts`.

Core contracts:

- `Role`
- `Permission`
- `PermissionGroup`
- `PermissionCategory`
- `Entitlement`
- `DataScope`
- `SecurityMetadata`
- `PermissionResolutionRequest`
- `PermissionResolutionResult`
- `PermissionResolverSource`
- `TemporaryElevationRequest`

Definition helpers:

- `definePermission`
- `definePermissionCategory`
- `definePermissionGroup`
- `defineSystemRole`
- `defineCustomRole`
- `defineEntitlement`
- `defineDataScope`
- `defineSecurityMetadata`

## Permission Resolution Flow

The resolver is default-deny.

Denial stages:

- `identity`: identity is incomplete.
- `permission`: permission is not registered.
- `experience`: permission is not available in the requested experience.
- `entitlement`: tenant does not own the app or capability.
- `role`: no active role grants the permission.
- `feature-flag`: required future flag is disabled.
- `data-scope`: granted scope does not cover the requested resource.
- `temporary-elevation`: requested elevation is not eligible.

Permissions and data scopes are intentionally independent. A role can grant a permission while scope still denies access to a specific company, branch, department, team, employee, or self-only resource.

## Platform Database Contracts

The Sprint 3 migration adds platform tables and metadata only:

- `permission_categories`
- `permission_groups`
- extended metadata on `permissions`
- `tenant_entitlements`
- `role_data_scopes`
- `temporary_permission_elevations`
- `has_entitlement(...)`

No business application tables or module-specific migrations are included.

## Risks

- Existing module services still call the legacy `requirePermission` RPC path. They remain compatible, but adoption of entitlement and data-scope checks needs a staged rollout through platform adapters.
- Existing database roles are tenant-scoped; system role templates require explicit tenant role creation before assignment.
- Temporary elevation is only a contract in this sprint. Approval, workflow, UI, and MFA enforcement are future dependencies.
- Full test suite currently has an unrelated runtime-context expectation mismatch around actor type fallback.

## Future Dependencies

- Platform admin UI for role, permission, entitlement, and scope management.
- Feature flag source adapter for resolver integration.
- Audit recorder integration for high-risk and audit-required permissions.
- MFA enforcement for permissions marked `requiresMfa`.
- Approval workflow for temporary elevation.
- RLS helper functions for company, branch, department, team, employee, and self scopes.
