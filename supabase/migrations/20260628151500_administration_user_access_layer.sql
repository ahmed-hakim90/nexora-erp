-- Operational administration layer for users, invitations, roles, app access, and data scopes.
-- Platform administration only. No new business application scope is introduced here.

do $$
begin
  create type public.admin_user_status as enum ('invited', 'active', 'suspended', 'disabled', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_role_type as enum ('system', 'tenant', 'company', 'branch', 'app');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.admin_data_scope_kind as enum ('own', 'branch', 'company', 'tenant', 'all');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists department text,
  add column if not exists default_company_id uuid references public.companies(id) on delete set null,
  add column if not exists default_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists notes text,
  add column if not exists last_login_at timestamptz,
  add column if not exists admin_status public.admin_user_status not null default 'active';

alter table public.branches
  add column if not exists company_id uuid references public.companies(id) on delete restrict;

create index if not exists branches_company_active_idx
  on public.branches (tenant_id, company_id, is_active)
  where deleted_at is null;

alter table public.roles
  add column if not exists admin_role_type public.admin_role_type not null default 'tenant',
  add column if not exists data_scope_kind public.admin_data_scope_kind not null default 'tenant',
  add column if not exists status text not null default 'active' check (status in ('active', 'disabled', 'archived'));

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null,
  role_id uuid references public.roles(id) on delete set null,
  company_ids uuid[] not null default '{}'::uuid[],
  branch_ids uuid[] not null default '{}'::uuid[],
  allowed_app_keys text[] not null default '{}'::text[],
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  status public.admin_invitation_status not null default 'pending',
  provider_invitation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (email = lower(email)),
  check (expires_at > created_at),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists user_invitations_pending_email_uq
  on public.user_invitations (tenant_id, email)
  where deleted_at is null and status = 'pending';
create index if not exists user_invitations_tenant_status_idx
  on public.user_invitations (tenant_id, status, expires_at)
  where deleted_at is null;

create table if not exists public.user_company_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  all_companies boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (all_companies = true or company_id is not null),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists user_company_access_scope_uq
  on public.user_company_access (
    tenant_id,
    user_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where deleted_at is null;

create table if not exists public.user_branch_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  all_branches boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (all_branches = true or branch_id is not null),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists user_branch_access_scope_uq
  on public.user_branch_access (
    tenant_id,
    user_id,
    company_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where deleted_at is null;

create table if not exists public.user_app_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  app_key text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (app_key = lower(app_key)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index if not exists user_app_access_key_uq
  on public.user_app_access (tenant_id, user_id, app_key)
  where deleted_at is null;

create table if not exists public.user_data_scopes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_kind public.admin_data_scope_kind not null default 'branch',
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

create unique index if not exists user_data_scopes_user_uq
  on public.user_data_scopes (tenant_id, user_id)
  where deleted_at is null;

create or replace function public.has_company_access(check_tenant_id uuid, check_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = check_tenant_id
      and tm.user_id = public.current_user_id()
      and tm.status = 'active'
      and tm.is_active = true
      and tm.deleted_at is null
  )
  and (
    not exists (
      select 1
      from public.user_company_access uca
      where uca.tenant_id = check_tenant_id
        and uca.user_id = public.current_user_id()
        and uca.is_active = true
        and uca.deleted_at is null
    )
    or exists (
      select 1
      from public.user_company_access uca
      where uca.tenant_id = check_tenant_id
        and uca.user_id = public.current_user_id()
        and uca.is_active = true
        and uca.deleted_at is null
        and (uca.all_companies = true or uca.company_id = check_company_id)
    )
  )
$$;

create or replace function public.current_company_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(c.id order by c.name), '{}'::uuid[])
  from public.companies c
  where c.tenant_id = any(public.current_tenant_ids())
    and c.is_active = true
    and c.deleted_at is null
    and public.has_company_access(c.tenant_id, c.id)
$$;

create or replace function public.has_branch_access(check_tenant_id uuid, check_company_id uuid, check_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.has_company_access(check_tenant_id, check_company_id)
  and (
    not exists (
      select 1
      from public.user_branch_access uba
      where uba.tenant_id = check_tenant_id
        and uba.user_id = public.current_user_id()
        and uba.is_active = true
        and uba.deleted_at is null
    )
    or exists (
      select 1
      from public.user_branch_access uba
      where uba.tenant_id = check_tenant_id
        and uba.user_id = public.current_user_id()
        and uba.company_id = check_company_id
        and uba.is_active = true
        and uba.deleted_at is null
        and (uba.all_branches = true or uba.branch_id = check_branch_id)
    )
  )
$$;

create or replace function public.current_branch_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(b.id order by b.name), '{}'::uuid[])
  from public.branches b
  where b.tenant_id = any(public.current_tenant_ids())
    and b.is_active = true
    and b.deleted_at is null
    and public.has_branch_access(b.tenant_id, b.company_id, b.id)
$$;

create or replace function public.has_app_access(check_tenant_id uuid, check_app_key text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = check_tenant_id
      and tm.user_id = public.current_user_id()
      and tm.status = 'active'
      and tm.is_active = true
      and tm.deleted_at is null
  )
  and (
    not exists (
      select 1
      from public.user_app_access uaa
      where uaa.tenant_id = check_tenant_id
        and uaa.user_id = public.current_user_id()
        and uaa.is_active = true
        and uaa.deleted_at is null
    )
    or exists (
      select 1
      from public.user_app_access uaa
      where uaa.tenant_id = check_tenant_id
        and uaa.user_id = public.current_user_id()
        and uaa.app_key = lower(check_app_key)
        and uaa.is_enabled = true
        and uaa.is_active = true
        and uaa.deleted_at is null
    )
  )
$$;

create or replace function public.current_user_data_scope(check_tenant_id uuid)
returns public.admin_data_scope_kind
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((
    select uds.scope_kind
    from public.user_data_scopes uds
    where uds.tenant_id = check_tenant_id
      and uds.user_id = public.current_user_id()
      and uds.is_active = true
      and uds.deleted_at is null
    limit 1
  ), 'branch'::public.admin_data_scope_kind)
$$;

revoke all on function public.has_company_access(uuid, uuid) from public;
revoke all on function public.current_company_ids() from public;
revoke all on function public.has_branch_access(uuid, uuid, uuid) from public;
revoke all on function public.current_branch_ids() from public;
revoke all on function public.has_app_access(uuid, text) from public;
revoke all on function public.current_user_data_scope(uuid) from public;

grant execute on function public.has_company_access(uuid, uuid) to authenticated;
grant execute on function public.current_company_ids() to authenticated;
grant execute on function public.has_branch_access(uuid, uuid, uuid) to authenticated;
grant execute on function public.current_branch_ids() to authenticated;
grant execute on function public.has_app_access(uuid, text) to authenticated;
grant execute on function public.current_user_data_scope(uuid) to authenticated;

drop trigger if exists user_invitations_touch_updated_at on public.user_invitations;
create trigger user_invitations_touch_updated_at before update on public.user_invitations for each row execute function public.touch_platform_row();
drop trigger if exists user_invitations_prevent_id_change on public.user_invitations;
create trigger user_invitations_prevent_id_change before update on public.user_invitations for each row execute function public.prevent_id_change();
drop trigger if exists user_invitations_prevent_tenant_id_change on public.user_invitations;
create trigger user_invitations_prevent_tenant_id_change before update on public.user_invitations for each row execute function public.prevent_tenant_id_change();

drop trigger if exists user_company_access_touch_updated_at on public.user_company_access;
create trigger user_company_access_touch_updated_at before update on public.user_company_access for each row execute function public.touch_platform_row();
drop trigger if exists user_company_access_prevent_id_change on public.user_company_access;
create trigger user_company_access_prevent_id_change before update on public.user_company_access for each row execute function public.prevent_id_change();
drop trigger if exists user_company_access_prevent_tenant_id_change on public.user_company_access;
create trigger user_company_access_prevent_tenant_id_change before update on public.user_company_access for each row execute function public.prevent_tenant_id_change();

drop trigger if exists user_branch_access_touch_updated_at on public.user_branch_access;
create trigger user_branch_access_touch_updated_at before update on public.user_branch_access for each row execute function public.touch_platform_row();
drop trigger if exists user_branch_access_prevent_id_change on public.user_branch_access;
create trigger user_branch_access_prevent_id_change before update on public.user_branch_access for each row execute function public.prevent_id_change();
drop trigger if exists user_branch_access_prevent_tenant_id_change on public.user_branch_access;
create trigger user_branch_access_prevent_tenant_id_change before update on public.user_branch_access for each row execute function public.prevent_tenant_id_change();

drop trigger if exists user_app_access_touch_updated_at on public.user_app_access;
create trigger user_app_access_touch_updated_at before update on public.user_app_access for each row execute function public.touch_platform_row();
drop trigger if exists user_app_access_prevent_id_change on public.user_app_access;
create trigger user_app_access_prevent_id_change before update on public.user_app_access for each row execute function public.prevent_id_change();
drop trigger if exists user_app_access_prevent_tenant_id_change on public.user_app_access;
create trigger user_app_access_prevent_tenant_id_change before update on public.user_app_access for each row execute function public.prevent_tenant_id_change();

drop trigger if exists user_data_scopes_touch_updated_at on public.user_data_scopes;
create trigger user_data_scopes_touch_updated_at before update on public.user_data_scopes for each row execute function public.touch_platform_row();
drop trigger if exists user_data_scopes_prevent_id_change on public.user_data_scopes;
create trigger user_data_scopes_prevent_id_change before update on public.user_data_scopes for each row execute function public.prevent_id_change();
drop trigger if exists user_data_scopes_prevent_tenant_id_change on public.user_data_scopes;
create trigger user_data_scopes_prevent_tenant_id_change before update on public.user_data_scopes for each row execute function public.prevent_tenant_id_change();

alter table public.user_invitations enable row level security;
alter table public.user_company_access enable row level security;
alter table public.user_branch_access enable row level security;
alter table public.user_app_access enable row level security;
alter table public.user_data_scopes enable row level security;

alter table public.user_invitations force row level security;
alter table public.user_company_access force row level security;
alter table public.user_branch_access force row level security;
alter table public.user_app_access force row level security;
alter table public.user_data_scopes force row level security;

drop policy if exists user_invitations_select_manage_users on public.user_invitations;
create policy user_invitations_select_manage_users on public.user_invitations for select to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.user.manage', tenant_id));
drop policy if exists user_invitations_manage_users on public.user_invitations;
create policy user_invitations_manage_users on public.user_invitations for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.user.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.user.manage', tenant_id));

drop policy if exists user_company_access_select_manage on public.user_company_access;
create policy user_company_access_select_manage on public.user_company_access for select to authenticated
  using (is_active = true and deleted_at is null and (user_id = public.current_user_id() or public.has_permission('platform.membership.manage', tenant_id)));
drop policy if exists user_company_access_manage on public.user_company_access;
create policy user_company_access_manage on public.user_company_access for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id));

drop policy if exists user_branch_access_select_manage on public.user_branch_access;
create policy user_branch_access_select_manage on public.user_branch_access for select to authenticated
  using (is_active = true and deleted_at is null and (user_id = public.current_user_id() or public.has_permission('platform.membership.manage', tenant_id)));
drop policy if exists user_branch_access_manage on public.user_branch_access;
create policy user_branch_access_manage on public.user_branch_access for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id));

drop policy if exists user_app_access_select_manage on public.user_app_access;
create policy user_app_access_select_manage on public.user_app_access for select to authenticated
  using (is_active = true and deleted_at is null and (user_id = public.current_user_id() or public.has_permission('platform.membership.manage', tenant_id)));
drop policy if exists user_app_access_manage on public.user_app_access;
create policy user_app_access_manage on public.user_app_access for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id));

drop policy if exists user_data_scopes_select_manage on public.user_data_scopes;
create policy user_data_scopes_select_manage on public.user_data_scopes for select to authenticated
  using (is_active = true and deleted_at is null and (user_id = public.current_user_id() or public.has_permission('platform.membership.manage', tenant_id)));
drop policy if exists user_data_scopes_manage on public.user_data_scopes;
create policy user_data_scopes_manage on public.user_data_scopes for all to authenticated
  using (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id))
  with check (is_active = true and deleted_at is null and public.has_permission('platform.membership.manage', tenant_id));

drop policy if exists companies_select_member on public.companies;
create policy companies_select_assigned_access on public.companies for select to authenticated
  using (is_active = true and deleted_at is null and public.has_company_access(tenant_id, id));

drop policy if exists branches_select_member on public.branches;
create policy branches_select_assigned_access on public.branches for select to authenticated
  using (is_active = true and deleted_at is null and public.has_branch_access(tenant_id, company_id, id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('platform.admin.access', 'Access Administration', 'Allows access to the ERP Administration application.', 'critical')
on conflict do nothing;

insert into public.roles (role_key, name, description, role_scope, is_system, admin_role_type, data_scope_kind, status)
values
  ('super-admin', 'Super Admin', 'System administration template with full tenant permissions and protected removal semantics.', 'template', true, 'system', 'all', 'active'),
  ('company-admin', 'Company Admin', 'Company-scoped administration role template.', 'template', true, 'company', 'company', 'active'),
  ('finance-manager', 'Finance Manager', 'Finance manager role template.', 'template', true, 'app', 'company', 'active'),
  ('inventory-manager', 'Inventory Manager', 'Inventory manager role template.', 'template', true, 'app', 'company', 'active'),
  ('manufacturing-manager', 'Manufacturing Manager', 'Manufacturing manager role template.', 'template', true, 'app', 'company', 'active'),
  ('production-supervisor', 'Production Supervisor', 'Branch-scoped production supervisor role template.', 'template', true, 'branch', 'branch', 'active'),
  ('production-worker', 'Production Worker', 'Own-record and branch production worker role template.', 'template', true, 'branch', 'own', 'active'),
  ('read-only-viewer', 'Read Only Viewer', 'Read-only viewer role template for assigned apps and data scopes.', 'template', true, 'tenant', 'branch', 'active')
on conflict do nothing;

insert into public.role_permissions (tenant_id, role_id, permission_id)
select
  case when r.role_scope = 'tenant' then r.tenant_id else null end,
  r.id,
  p.id
from public.roles r
join public.permissions p on p.permission_key = 'platform.admin.access'
where r.role_key in ('tenant-admin', 'super-admin')
  and r.is_active = true
  and r.deleted_at is null
  and p.is_active = true
  and p.deleted_at is null
on conflict do nothing;
