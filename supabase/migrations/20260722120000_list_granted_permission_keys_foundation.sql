-- Batch permission resolution for ERP shell runtime.
-- Mirrors has_permission tenant-admin shortcut and role_permissions grants in one query.

create or replace function public.list_granted_permission_keys(check_tenant_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public, auth
as $$
  select distinct p.permission_key
  from public.user_roles ur
  join public.tenant_memberships tm
    on tm.tenant_id = ur.tenant_id
    and tm.user_id = ur.user_id
  join public.tenants t on t.id = ur.tenant_id
  join public.roles r on r.id = ur.role_id
  join public.role_permissions rp on rp.role_id = r.id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = public.current_user_id()
    and ur.tenant_id = check_tenant_id
    and tm.status = 'active'
    and tm.is_active = true
    and tm.deleted_at is null
    and t.is_active = true
    and t.deleted_at is null
    and ur.status = 'active'
    and ur.is_active = true
    and ur.deleted_at is null
    and ur.effective_from <= now()
    and (ur.effective_until is null or ur.effective_until > now())
    and r.tenant_id = check_tenant_id
    and r.role_scope = 'tenant'
    and r.is_active = true
    and r.deleted_at is null
    and rp.tenant_id = check_tenant_id
    and rp.is_active = true
    and rp.deleted_at is null
    and p.is_active = true
    and p.deleted_at is null

  union

  select p.permission_key
  from public.permissions p
  where p.is_active = true
    and p.deleted_at is null
    and exists (
      select 1
      from public.user_roles ur
      join public.tenant_memberships tm
        on tm.tenant_id = ur.tenant_id
        and tm.user_id = ur.user_id
      join public.tenants t on t.id = ur.tenant_id
      join public.roles r on r.id = ur.role_id
      where ur.user_id = public.current_user_id()
        and ur.tenant_id = check_tenant_id
        and tm.status = 'active'
        and tm.is_active = true
        and tm.deleted_at is null
        and t.is_active = true
        and t.deleted_at is null
        and ur.status = 'active'
        and ur.is_active = true
        and ur.deleted_at is null
        and ur.effective_from <= now()
        and (ur.effective_until is null or ur.effective_until > now())
        and r.tenant_id = check_tenant_id
        and r.role_scope = 'tenant'
        and r.role_key = 'tenant-admin'
        and r.is_active = true
        and r.deleted_at is null
    )
$$;

revoke all on function public.list_granted_permission_keys(uuid) from public;
grant execute on function public.list_granted_permission_keys(uuid) to authenticated;
