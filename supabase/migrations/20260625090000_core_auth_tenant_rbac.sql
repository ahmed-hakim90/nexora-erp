-- Nexora Sprint 2: core auth, tenancy, membership, RBAC, audit, flags, settings.
-- Platform foundation only. No business module tables belong in this migration.

create extension if not exists pgcrypto;

create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.role_scope as enum ('template', 'tenant');
create type public.role_assignment_status as enum ('active', 'suspended');
create type public.audit_severity as enum ('info', 'warning', 'critical');
create type public.setting_value_type as enum ('string', 'number', 'boolean', 'json');

create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = auth, public
as $$
  select auth.uid()
$$;

create or replace function public.touch_platform_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(public.current_user_id(), new.updated_by);
  new.version = old.version + 1;
  return new;
end;
$$;

create or replace function public.prevent_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'primary key id cannot be changed';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_tenant_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id cannot be changed';
  end if;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  default_locale text not null default 'en' check (default_locale in ('ar', 'en')),
  default_timezone text not null default 'UTC',
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

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    created_by,
    updated_by
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.id,
    new.id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  legal_name text,
  tax_number text,
  default_locale text not null default 'en' check (default_locale in ('ar', 'en')),
  default_timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index tenants_slug_active_uq
  on public.tenants (slug)
  where deleted_at is null;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  legal_name text,
  tax_number text,
  default_locale text not null default 'en' check (default_locale in ('ar', 'en')),
  default_timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (length(trim(name)) > 0),
  check (deleted_at is null or deleted_by is not null)
);

create unique index companies_tenant_code_active_uq
  on public.companies (tenant_id, code)
  where deleted_at is null;
create index companies_tenant_active_idx
  on public.companies (tenant_id, is_active)
  where deleted_at is null;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (code = upper(code)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index branches_tenant_code_active_uq
  on public.branches (tenant_id, code)
  where deleted_at is null;
create index branches_tenant_active_idx
  on public.branches (tenant_id, is_active)
  where deleted_at is null;

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
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

create unique index tenant_memberships_user_tenant_active_uq
  on public.tenant_memberships (tenant_id, user_id)
  where deleted_at is null;
create index tenant_memberships_user_active_idx
  on public.tenant_memberships (user_id, tenant_id, status, is_active)
  where deleted_at is null;
create index tenant_memberships_tenant_active_idx
  on public.tenant_memberships (tenant_id, status, is_active)
  where deleted_at is null;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null,
  label text not null,
  description text,
  risk_level text not null default 'standard' check (risk_level in ('low', 'standard', 'high', 'critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (permission_key = lower(permission_key)),
  check (permission_key ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index permissions_key_active_uq
  on public.permissions (permission_key)
  where deleted_at is null;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  role_key text not null,
  name text not null,
  description text,
  role_scope public.role_scope not null default 'tenant',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (role_key = lower(role_key)),
  check (role_key ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  check (
    (role_scope = 'template' and tenant_id is null and is_system = true)
    or (role_scope = 'tenant' and tenant_id is not null and is_system = false)
  ),
  check (deleted_at is null or deleted_by is not null)
);

create unique index roles_template_key_active_uq
  on public.roles (role_key)
  where role_scope = 'template' and deleted_at is null;
create unique index roles_tenant_key_active_uq
  on public.roles (tenant_id, role_key)
  where role_scope = 'tenant' and deleted_at is null;
create index roles_tenant_active_idx
  on public.roles (tenant_id, is_active)
  where deleted_at is null;

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
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

create unique index role_permissions_role_permission_active_uq
  on public.role_permissions (role_id, permission_id)
  where deleted_at is null;
create index role_permissions_tenant_role_idx
  on public.role_permissions (tenant_id, role_id)
  where deleted_at is null;
create index role_permissions_permission_idx
  on public.role_permissions (permission_id)
  where deleted_at is null;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status public.role_assignment_status not null default 'active',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  assignment_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (effective_until is null or effective_until > effective_from),
  check (deleted_at is null or deleted_by is not null)
);

create unique index user_roles_user_role_active_uq
  on public.user_roles (tenant_id, user_id, role_id)
  where deleted_at is null;
create index user_roles_user_tenant_active_idx
  on public.user_roles (user_id, tenant_id, status, is_active)
  where deleted_at is null;
create index user_roles_role_idx
  on public.user_roles (role_id)
  where deleted_at is null;

create or replace function public.enforce_role_permission_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_role public.roles%rowtype;
begin
  select * into target_role
  from public.roles
  where id = new.role_id;

  if target_role.id is null then
    raise exception 'role_permissions.role_id must reference an existing role';
  end if;

  if target_role.role_scope = 'template' and new.tenant_id is not null then
    raise exception 'template role permissions must not be tenant-scoped';
  end if;

  if target_role.role_scope = 'tenant' and new.tenant_id is distinct from target_role.tenant_id then
    raise exception 'tenant role permissions must match the role tenant';
  end if;

  return new;
end;
$$;

create trigger role_permissions_enforce_scope
  before insert or update on public.role_permissions
  for each row execute function public.enforce_role_permission_scope();

create or replace function public.enforce_user_role_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_role public.roles%rowtype;
begin
  select * into target_role
  from public.roles
  where id = new.role_id;

  if target_role.id is null then
    raise exception 'user_roles.role_id must reference an existing role';
  end if;

  if target_role.role_scope <> 'tenant' then
    raise exception 'only tenant-scoped roles can be assigned to users';
  end if;

  if new.tenant_id is distinct from target_role.tenant_id then
    raise exception 'user role tenant must match role tenant';
  end if;

  return new;
end;
$$;

create trigger user_roles_enforce_scope
  before insert or update on public.user_roles
  for each row execute function public.enforce_user_role_scope();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id),
  actor_type text not null default 'user' check (actor_type in ('user', 'service', 'integration', 'ai-agent')),
  module_key text not null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  severity public.audit_severity not null default 'info',
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (action = lower(action)),
  check (deleted_at is null)
);

create index audit_logs_tenant_created_idx
  on public.audit_logs (tenant_id, created_at desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_entity_idx
  on public.audit_logs (module_key, entity_type, entity_id);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  flag_key text not null,
  enabled boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (flag_key = lower(flag_key)),
  check (flag_key ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index feature_flags_tenant_key_active_uq
  on public.feature_flags (tenant_id, flag_key)
  where deleted_at is null;
create unique index feature_flags_global_key_active_uq
  on public.feature_flags (flag_key)
  where tenant_id is null and deleted_at is null;

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  setting_key text not null,
  value_type public.setting_value_type not null,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (setting_key = lower(setting_key)),
  check (setting_key ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index app_settings_tenant_key_active_uq
  on public.app_settings (tenant_id, setting_key)
  where deleted_at is null;
create unique index app_settings_global_key_active_uq
  on public.app_settings (setting_key)
  where tenant_id is null and deleted_at is null;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_platform_row();
create trigger profiles_prevent_id_change
  before update on public.profiles
  for each row execute function public.prevent_id_change();
create trigger tenants_touch_updated_at
  before update on public.tenants
  for each row execute function public.touch_platform_row();
create trigger tenants_prevent_id_change
  before update on public.tenants
  for each row execute function public.prevent_id_change();
create trigger companies_touch_updated_at
  before update on public.companies
  for each row execute function public.touch_platform_row();
create trigger companies_prevent_id_change
  before update on public.companies
  for each row execute function public.prevent_id_change();
create trigger companies_prevent_tenant_id_change
  before update on public.companies
  for each row execute function public.prevent_tenant_id_change();
create trigger branches_touch_updated_at
  before update on public.branches
  for each row execute function public.touch_platform_row();
create trigger branches_prevent_id_change
  before update on public.branches
  for each row execute function public.prevent_id_change();
create trigger branches_prevent_tenant_id_change
  before update on public.branches
  for each row execute function public.prevent_tenant_id_change();
create trigger tenant_memberships_touch_updated_at
  before update on public.tenant_memberships
  for each row execute function public.touch_platform_row();
create trigger tenant_memberships_prevent_id_change
  before update on public.tenant_memberships
  for each row execute function public.prevent_id_change();
create trigger tenant_memberships_prevent_tenant_id_change
  before update on public.tenant_memberships
  for each row execute function public.prevent_tenant_id_change();
create trigger permissions_touch_updated_at
  before update on public.permissions
  for each row execute function public.touch_platform_row();
create trigger permissions_prevent_id_change
  before update on public.permissions
  for each row execute function public.prevent_id_change();
create trigger roles_touch_updated_at
  before update on public.roles
  for each row execute function public.touch_platform_row();
create trigger roles_prevent_id_change
  before update on public.roles
  for each row execute function public.prevent_id_change();
create trigger roles_prevent_tenant_id_change
  before update on public.roles
  for each row execute function public.prevent_tenant_id_change();
create trigger role_permissions_touch_updated_at
  before update on public.role_permissions
  for each row execute function public.touch_platform_row();
create trigger role_permissions_prevent_id_change
  before update on public.role_permissions
  for each row execute function public.prevent_id_change();
create trigger role_permissions_prevent_tenant_id_change
  before update on public.role_permissions
  for each row execute function public.prevent_tenant_id_change();
create trigger user_roles_touch_updated_at
  before update on public.user_roles
  for each row execute function public.touch_platform_row();
create trigger user_roles_prevent_id_change
  before update on public.user_roles
  for each row execute function public.prevent_id_change();
create trigger user_roles_prevent_tenant_id_change
  before update on public.user_roles
  for each row execute function public.prevent_tenant_id_change();
create trigger feature_flags_touch_updated_at
  before update on public.feature_flags
  for each row execute function public.touch_platform_row();
create trigger feature_flags_prevent_id_change
  before update on public.feature_flags
  for each row execute function public.prevent_id_change();
create trigger feature_flags_prevent_tenant_id_change
  before update on public.feature_flags
  for each row execute function public.prevent_tenant_id_change();
create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_platform_row();
create trigger app_settings_prevent_id_change
  before update on public.app_settings
  for each row execute function public.prevent_id_change();
create trigger app_settings_prevent_tenant_id_change
  before update on public.app_settings
  for each row execute function public.prevent_tenant_id_change();

create or replace function public.current_tenant_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(tm.tenant_id), '{}'::uuid[])
  from public.tenant_memberships tm
  join public.tenants t on t.id = tm.tenant_id
  where tm.user_id = public.current_user_id()
    and tm.status = 'active'
    and tm.is_active = true
    and tm.deleted_at is null
    and t.is_active = true
    and t.deleted_at is null
$$;

create or replace function public.is_tenant_member(check_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.tenant_id = check_tenant_id
      and tm.user_id = public.current_user_id()
      and tm.status = 'active'
      and tm.is_active = true
      and tm.deleted_at is null
      and t.is_active = true
      and t.deleted_at is null
  )
$$;

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

revoke all on function public.current_user_id() from public;
revoke all on function public.current_tenant_ids() from public;
revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_permission(text, uuid) from public;

grant execute on function public.current_user_id() to authenticated;
grant execute on function public.current_tenant_ids() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.app_settings enable row level security;

alter table public.profiles force row level security;
alter table public.tenants force row level security;
alter table public.companies force row level security;
alter table public.branches force row level security;
alter table public.tenant_memberships force row level security;
alter table public.permissions force row level security;
alter table public.roles force row level security;
alter table public.role_permissions force row level security;
alter table public.user_roles force row level security;
alter table public.audit_logs force row level security;
alter table public.feature_flags force row level security;
alter table public.app_settings force row level security;

create policy profiles_select_own_or_permitted_tenant_users
  on public.profiles
  for select
  to authenticated
  using (
    profiles.is_active = true
    and profiles.deleted_at is null
    and (
      id = public.current_user_id()
      or exists (
        select 1
        from public.tenant_memberships target_membership
        where target_membership.user_id = profiles.id
          and target_membership.status = 'active'
          and target_membership.is_active = true
          and target_membership.deleted_at is null
          and public.has_permission('platform.user.read', target_membership.tenant_id)
      )
    )
  );

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = public.current_user_id());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = public.current_user_id() and deleted_at is null)
  with check (id = public.current_user_id() and deleted_at is null);

create policy tenants_select_member
  on public.tenants
  for select
  to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(id));

create policy tenants_update_manage_permission
  on public.tenants
  for update
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.tenant.manage', id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.tenant.manage', id));

create policy companies_select_member
  on public.companies
  for select
  to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy companies_insert_manage_permission
  on public.companies
  for insert
  to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.company.manage', tenant_id)
  );

create policy companies_update_manage_permission
  on public.companies
  for update
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.company.manage', tenant_id))
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.company.manage', tenant_id)
  );

create policy branches_select_member
  on public.branches
  for select
  to authenticated
  using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy branches_insert_manage_permission
  on public.branches
  for insert
  to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and deleted_by is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.branch.manage', tenant_id)
  );

create policy branches_update_manage_permission
  on public.branches
  for update
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.branch.manage', tenant_id))
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.branch.manage', tenant_id)
  );

create policy tenant_memberships_select_self_or_permitted
  on public.tenant_memberships
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and status = 'active'
    and (
      user_id = public.current_user_id()
      or public.has_permission('platform.membership.read', tenant_id)
      or public.has_permission('platform.membership.manage', tenant_id)
    )
  );

create policy tenant_memberships_insert_manage_permission
  on public.tenant_memberships
  for insert
  to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.membership.manage', tenant_id)
  );

create policy tenant_memberships_update_manage_permission
  on public.tenant_memberships
  for update
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id))
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.membership.manage', tenant_id)
  );

create policy permissions_select_authenticated
  on public.permissions
  for select
  to authenticated
  using (is_active = true and deleted_at is null);

create policy roles_select_member_or_template
  on public.roles
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      (role_scope = 'template' and is_system = true)
      or (tenant_id is not null and public.is_tenant_member(tenant_id))
    )
  );

create policy roles_insert_manage_permission
  on public.roles
  for insert
  to authenticated
  with check (
    role_scope = 'tenant'
    and tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy roles_update_manage_permission
  on public.roles
  for update
  to authenticated
  using (
    role_scope = 'tenant'
    and tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  )
  with check (
    role_scope = 'tenant'
    and tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy role_permissions_select_member_or_template
  on public.role_permissions
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      tenant_id is null
      or public.is_tenant_member(tenant_id)
    )
  );

create policy role_permissions_insert_manage_permission
  on public.role_permissions
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy role_permissions_update_manage_permission
  on public.role_permissions
  for update
  to authenticated
  using (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  )
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy user_roles_select_self_or_permitted
  on public.user_roles
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and status = 'active'
    and (
      user_id = public.current_user_id()
      or public.has_permission('platform.role.manage', tenant_id)
    )
  );

create policy user_roles_insert_manage_permission
  on public.user_roles
  for insert
  to authenticated
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy user_roles_update_manage_permission
  on public.user_roles
  for update
  to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.role.manage', tenant_id))
  with check (
    is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
    and public.has_permission('platform.role.manage', tenant_id)
  );

create policy audit_logs_select_permitted
  on public.audit_logs
  for select
  to authenticated
  using (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.audit.read', tenant_id)
  );

create policy audit_logs_insert_member_actor
  on public.audit_logs
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and actor_type = 'user'
    and public.is_tenant_member(tenant_id)
    and actor_user_id = public.current_user_id()
  );

create policy feature_flags_select_member_or_global
  on public.feature_flags
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      tenant_id is null
      or public.is_tenant_member(tenant_id)
    )
  );

create policy feature_flags_insert_manage_permission
  on public.feature_flags
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.feature-flag.manage', tenant_id)
  );

create policy feature_flags_update_manage_permission
  on public.feature_flags
  for update
  to authenticated
  using (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.feature-flag.manage', tenant_id)
  )
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.feature-flag.manage', tenant_id)
  );

create policy app_settings_select_member_or_global
  on public.app_settings
  for select
  to authenticated
  using (
    is_active = true
    and deleted_at is null
    and (
      tenant_id is null
      or public.is_tenant_member(tenant_id)
    )
  );

create policy app_settings_insert_manage_permission
  on public.app_settings
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.settings.manage', tenant_id)
  );

create policy app_settings_update_manage_permission
  on public.app_settings
  for update
  to authenticated
  using (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.settings.manage', tenant_id)
  )
  with check (
    tenant_id is not null
    and is_active = true
    and deleted_at is null
    and public.has_permission('platform.settings.manage', tenant_id)
  );

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('platform.erp.access', 'Access ERP Workspace', 'Allows entry to the ERP Workspace shell.', 'standard'),
  ('platform.portal.access', 'Access HR Self-Service Portal', 'Allows entry to the HR self-service shell.', 'standard'),
  ('platform.user.read', 'Read tenant users', 'Allows reading users within an assigned tenant.', 'high'),
  ('platform.user.manage', 'Manage tenant users', 'Allows managing user profile foundation data within a tenant.', 'critical'),
  ('platform.tenant.manage', 'Manage tenant', 'Allows updating tenant foundation settings.', 'critical'),
  ('platform.company.manage', 'Manage companies', 'Allows creating and updating tenant company records.', 'critical'),
  ('platform.branch.manage', 'Manage branches', 'Allows creating and updating tenant branches.', 'high'),
  ('platform.membership.read', 'Read memberships', 'Allows reading tenant memberships.', 'high'),
  ('platform.membership.manage', 'Manage memberships', 'Allows creating and updating tenant memberships.', 'critical'),
  ('platform.role.manage', 'Manage roles', 'Allows creating roles, assigning permissions, and assigning roles.', 'critical'),
  ('platform.permission.read', 'Read permissions', 'Allows reading the platform permission registry.', 'standard'),
  ('platform.audit.read', 'Read audit logs', 'Allows reading tenant audit logs.', 'critical'),
  ('platform.feature-flag.manage', 'Manage feature flags', 'Allows managing tenant feature flags.', 'high'),
  ('platform.settings.manage', 'Manage app settings', 'Allows managing tenant application settings.', 'high')
on conflict do nothing;

insert into public.roles (role_key, name, description, role_scope, is_system)
values
  ('tenant-admin', 'Tenant Administrator', 'Template for tenant administrators with core platform administration permissions.', 'template', true),
  ('hr-self-service', 'HR Self-Service User', 'Template for employees who only access the HR self-service experience.', 'template', true),
  ('erp-user', 'ERP User', 'Template for operational ERP users with base ERP access only.', 'template', true)
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'platform.erp.access',
  'platform.portal.access',
  'platform.user.read',
  'platform.user.manage',
  'platform.tenant.manage',
  'platform.company.manage',
  'platform.branch.manage',
  'platform.membership.read',
  'platform.membership.manage',
  'platform.role.manage',
  'platform.permission.read',
  'platform.audit.read',
  'platform.feature-flag.manage',
  'platform.settings.manage'
)
where r.role_key = 'tenant-admin'
  and r.role_scope = 'template'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in ('platform.portal.access')
where r.role_key = 'hr-self-service'
  and r.role_scope = 'template'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in ('platform.erp.access')
where r.role_key = 'erp-user'
  and r.role_scope = 'template'
on conflict do nothing;
