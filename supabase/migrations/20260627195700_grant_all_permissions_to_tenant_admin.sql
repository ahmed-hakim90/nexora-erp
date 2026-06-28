-- Temporary until the administration settings UI can manage tenant roles.
-- Keep tenant administrators unblocked across newly added ERP foundations.

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case
    when r.role_scope = 'tenant' then r.tenant_id
    else null
  end as tenant_id,
  r.id as role_id,
  p.id as permission_id
from public.roles r
cross join public.permissions p
where r.role_key = 'tenant-admin'
  and r.role_scope in ('template', 'tenant')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;

create or replace function public.has_permission(permission_key text, check_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
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
  or exists (
    select 1
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
      and p.permission_key = $1
      and p.is_active = true
      and p.deleted_at is null
  )
$$;
