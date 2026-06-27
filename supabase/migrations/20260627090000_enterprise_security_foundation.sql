-- Nexora Sprint 3: Enterprise Security Foundation.
-- Platform security infrastructure only. No business module tables belong here.

create type public.permission_action as enum (
  'view',
  'create',
  'update',
  'edit',
  'delete',
  'approve',
  'archive',
  'restore',
  'print',
  'export',
  'import',
  'execute',
  'manage'
);

create type public.entitlement_status as enum (
  'active',
  'trial',
  'suspended',
  'expired',
  'disabled'
);

create type public.data_scope_kind as enum (
  'tenant',
  'company',
  'branch',
  'department',
  'team',
  'employee',
  'self'
);

create table public.permission_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  label text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (category_key ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index permission_categories_key_active_uq
  on public.permission_categories (category_key)
  where deleted_at is null;

create table public.permission_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.permission_categories(id) on delete restrict,
  group_key text not null,
  label text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (group_key = lower(group_key)),
  check (group_key ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index permission_groups_key_active_uq
  on public.permission_groups (group_key)
  where deleted_at is null;
create index permission_groups_category_idx
  on public.permission_groups (category_id, sort_order)
  where deleted_at is null;

alter table public.permissions
  add column if not exists owner_key text,
  add column if not exists resource_key text,
  add column if not exists action public.permission_action,
  add column if not exists category_id uuid references public.permission_categories(id) on delete restrict,
  add column if not exists group_id uuid references public.permission_groups(id) on delete restrict,
  add column if not exists audit_required boolean not null default false,
  add column if not exists sensitive_data boolean not null default false,
  add column if not exists requires_approval boolean not null default false,
  add column if not exists requires_mfa boolean not null default false,
  add column if not exists temporary_elevation_allowed boolean not null default false,
  add column if not exists data_scope_required boolean not null default false,
  add column if not exists feature_flag_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists permissions_metadata_idx
  on public.permissions (owner_key, resource_key, action)
  where deleted_at is null;

create table public.tenant_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  entitlement_key text not null,
  app_key text not null,
  capability_key text,
  status public.entitlement_status not null default 'active',
  company_id uuid,
  branch_id uuid references public.branches(id) on delete restrict,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (entitlement_key = lower(entitlement_key)),
  check (app_key = lower(app_key)),
  check (capability_key is null or capability_key = lower(capability_key)),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (deleted_at is null or deleted_by is not null)
);

create unique index tenant_entitlements_scope_active_uq
  on public.tenant_entitlements (
    tenant_id,
    entitlement_key,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where deleted_at is null;
create index tenant_entitlements_app_status_idx
  on public.tenant_entitlements (tenant_id, app_key, status)
  where deleted_at is null;

create table public.role_data_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_kind public.data_scope_kind not null,
  company_ids uuid[] not null default '{}'::uuid[],
  branch_ids uuid[] not null default '{}'::uuid[],
  department_ids uuid[] not null default '{}'::uuid[],
  team_ids uuid[] not null default '{}'::uuid[],
  employee_ids uuid[] not null default '{}'::uuid[],
  unrestricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null or deleted_by is not null)
);

create unique index role_data_scopes_role_kind_active_uq
  on public.role_data_scopes (tenant_id, role_id, scope_kind)
  where deleted_at is null;

create table public.temporary_permission_elevations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  reason text not null,
  ticket_reference text,
  requested_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (expires_at > starts_at),
  check (deleted_at is null or deleted_by is not null)
);

create index temporary_permission_elevations_user_active_idx
  on public.temporary_permission_elevations (tenant_id, user_id, expires_at)
  where deleted_at is null and revoked_at is null;

create trigger permission_categories_touch_updated_at
  before update on public.permission_categories
  for each row execute function public.touch_platform_row();
create trigger permission_categories_prevent_id_change
  before update on public.permission_categories
  for each row execute function public.prevent_id_change();
create trigger permission_groups_touch_updated_at
  before update on public.permission_groups
  for each row execute function public.touch_platform_row();
create trigger permission_groups_prevent_id_change
  before update on public.permission_groups
  for each row execute function public.prevent_id_change();
create trigger tenant_entitlements_touch_updated_at
  before update on public.tenant_entitlements
  for each row execute function public.touch_platform_row();
create trigger tenant_entitlements_prevent_id_change
  before update on public.tenant_entitlements
  for each row execute function public.prevent_id_change();
create trigger tenant_entitlements_prevent_tenant_id_change
  before update on public.tenant_entitlements
  for each row execute function public.prevent_tenant_id_change();
create trigger role_data_scopes_touch_updated_at
  before update on public.role_data_scopes
  for each row execute function public.touch_platform_row();
create trigger role_data_scopes_prevent_id_change
  before update on public.role_data_scopes
  for each row execute function public.prevent_id_change();
create trigger role_data_scopes_prevent_tenant_id_change
  before update on public.role_data_scopes
  for each row execute function public.prevent_tenant_id_change();
create trigger temporary_permission_elevations_touch_updated_at
  before update on public.temporary_permission_elevations
  for each row execute function public.touch_platform_row();
create trigger temporary_permission_elevations_prevent_id_change
  before update on public.temporary_permission_elevations
  for each row execute function public.prevent_id_change();
create trigger temporary_permission_elevations_prevent_tenant_id_change
  before update on public.temporary_permission_elevations
  for each row execute function public.prevent_tenant_id_change();

create or replace function public.has_entitlement(
  check_tenant_id uuid,
  check_entitlement_key text,
  check_company_id uuid default null,
  check_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_entitlements te
    join public.tenants t on t.id = te.tenant_id
    where te.tenant_id = check_tenant_id
      and te.entitlement_key = check_entitlement_key
      and te.status in ('active', 'trial')
      and te.is_active = true
      and te.deleted_at is null
      and (te.starts_at is null or te.starts_at <= now())
      and (te.ends_at is null or te.ends_at > now())
      and (check_company_id is null or te.company_id is null or te.company_id = check_company_id)
      and (check_branch_id is null or te.branch_id is null or te.branch_id = check_branch_id)
      and t.is_active = true
      and t.deleted_at is null
      and public.is_tenant_member(check_tenant_id)
  )
$$;

revoke all on function public.has_entitlement(uuid, text, uuid, uuid) from public;
grant execute on function public.has_entitlement(uuid, text, uuid, uuid) to authenticated;

alter table public.permission_categories enable row level security;
alter table public.permission_groups enable row level security;
alter table public.tenant_entitlements enable row level security;
alter table public.role_data_scopes enable row level security;
alter table public.temporary_permission_elevations enable row level security;

alter table public.permission_categories force row level security;
alter table public.permission_groups force row level security;
alter table public.tenant_entitlements force row level security;
alter table public.role_data_scopes force row level security;
alter table public.temporary_permission_elevations force row level security;

create policy permission_categories_select_authenticated
  on public.permission_categories
  for select
  to authenticated
  using (is_active = true and deleted_at is null);

create policy permission_groups_select_authenticated
  on public.permission_groups
  for select
  to authenticated
  using (is_active = true and deleted_at is null);

create policy tenant_entitlements_select_member
  on public.tenant_entitlements
  for select
  to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy tenant_entitlements_manage_permission
  on public.tenant_entitlements
  for all
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.tenant.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.tenant.manage', tenant_id));

create policy role_data_scopes_select_member
  on public.role_data_scopes
  for select
  to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy role_data_scopes_manage_permission
  on public.role_data_scopes
  for all
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.role.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.role.manage', tenant_id));

create policy temporary_permission_elevations_select_self_or_manage
  on public.temporary_permission_elevations
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      user_id = public.current_user_id()
      or public.has_permission('platform.role.manage', tenant_id)
    )
  );

create policy temporary_permission_elevations_manage_permission
  on public.temporary_permission_elevations
  for all
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.role.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.role.manage', tenant_id));
