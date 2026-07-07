-- Backfill app entitlements required by the fail-closed ERP shell runtime.
-- Existing explicit app access rows, including disabled rows, are preserved.

insert into public.user_app_access (
  tenant_id,
  user_id,
  app_key,
  created_by,
  updated_by
)
select
  ur.tenant_id,
  ur.user_id,
  app_key,
  ur.user_id,
  ur.user_id
from public.user_roles ur
join public.roles r on r.id = ur.role_id
cross join unnest(array[
  'administration',
  'finance',
  'inventory',
  'manufacturing',
  'hr'
]::text[]) as apps(app_key)
where r.role_key = 'tenant-admin'
  and r.role_scope = 'tenant'
  and r.tenant_id = ur.tenant_id
  and r.is_active = true
  and r.deleted_at is null
  and ur.status = 'active'
  and ur.is_active = true
  and ur.deleted_at is null
  and ur.effective_from <= now()
  and (ur.effective_until is null or ur.effective_until > now())
  and not exists (
    select 1
    from public.user_app_access uaa
    where uaa.tenant_id = ur.tenant_id
      and uaa.user_id = ur.user_id
      and uaa.app_key = apps.app_key
      and uaa.deleted_at is null
  )
on conflict do nothing;
