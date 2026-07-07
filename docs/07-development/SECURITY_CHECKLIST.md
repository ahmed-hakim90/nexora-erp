# Security Checklist

## Related Documents

- [Security](../01-platform/SECURITY.md)
- [Permission Model](../04-architecture/PERMISSION_MODEL.md)
- [RLS Strategy](../04-architecture/RLS_STRATEGY.md)
- [Backend Frontend Separation](../04-architecture/BACKEND_FRONTEND_SEPARATION.md)

## Pre-Merge Checklist

### Authentication and Context

- [ ] Server entry points resolve explicit request context (user, tenant, company, branch, employee, experience, locale, timezone, correlation ID).
- [ ] Context is not reconstructed from UI state, cookies alone, or route params in deep services.

### Authorization

- [ ] Permission checks run server-side before mutations.
- [ ] Entitlements checked before app-specific permissions where applicable.
- [ ] Data scopes enforced for row-level access decisions.
- [ ] No UI-only authorization for sensitive actions.
- [ ] Segregation of duties respected (no self-approval where policy forbids).

### Database

- [ ] RLS enabled and forced on tenant-owned tables.
- [ ] Insert/update policies include `WITH CHECK`.
- [ ] Service-role usage isolated behind reviewed platform adapters only.
- [ ] No hardcoded tenant, company, or branch IDs.

### Audit

- [ ] Sensitive actions produce audit events.
- [ ] Correlation ID propagated to audit metadata.

### Boundaries

- [ ] No Supabase queries in React components or `src/app/(erp)/**` loaders (except documented exceptions).
- [ ] No cross-feature imports of private infrastructure/presentation paths.
- [ ] Cross-module dependencies declared in `module.manifest.ts`.

### Integrations

- [ ] Webhook signature verification and replay protection where applicable.
- [ ] Idempotency keys for retryable integration writes.

### Experience Separation

- [ ] Portal-only users cannot load ERP navigation, reports, or module registry.
- [ ] ERP and Portal route groups use separate layouts and loader behavior.

## Release Gate

See [Platform Freeze v1.0](../05-decisions/ADR-011-Platform-Freeze-V1.md) for engine-level security metadata requirements.

## Related ADRs

- [ADR-007 Security Requires Multiple Layers](../05-decisions/ADR-007-Security-Multiple-Layers.md)
