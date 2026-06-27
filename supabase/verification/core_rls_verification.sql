-- Nexora Sprint 2 RLS verification notes.
-- Run after applying migrations in a local Supabase project.
-- This file is intentionally a verification guide, not an application migration.

-- Required manual setup:
-- 1. Create two auth users: user_a and user_b.
-- 2. Create two tenants: tenant_a and tenant_b.
-- 3. Add user_a as an active member of tenant_a only.
-- 4. Add user_b as an active member of tenant_b only.
-- 5. Create tenant-scoped roles from the seeded role templates.
-- 6. Assign permissions through role_permissions and user_roles.

-- Expected checks:
-- select public.current_user_id();
--   Returns the authenticated user's auth.uid().

-- select public.current_tenant_ids();
--   For user_a, returns tenant_a only.
--   For user_b, returns tenant_b only.

-- select public.is_tenant_member('<tenant_a_id>'::uuid);
--   Returns true for user_a, false for user_b.

-- select public.has_permission('platform.erp.access', '<tenant_a_id>'::uuid);
--   Returns true only when user_a has an active tenant role with that permission.

-- select * from public.tenants;
--   User sees only active member tenants.

-- select * from public.tenant_memberships;
--   User sees own memberships and only broader membership rows when permission allows.

-- insert into public.branches (tenant_id, code, name)
-- values ('<tenant_b_id>'::uuid, 'XBR', 'Forbidden Branch');
--   As user_a, this must fail because WITH CHECK requires tenant membership and permission.

-- update public.branches
-- set tenant_id = '<tenant_b_id>'::uuid
-- where tenant_id = '<tenant_a_id>'::uuid;
--   As user_a, this must fail because update WITH CHECK prevents tenant movement.

-- insert into public.audit_logs (
--   tenant_id,
--   actor_user_id,
--   module_key,
--   entity_type,
--   action
-- )
-- values (
--   '<tenant_b_id>'::uuid,
--   auth.uid(),
--   'platform',
--   'verification',
--   'platform.verification'
-- );
--   As user_a, this must fail because audit insert requires active membership in tenant_id.

-- select * from public.audit_logs;
--   User sees tenant audit logs only with platform.audit.read permission.
