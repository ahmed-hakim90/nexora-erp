-- Per-user ERP workspace preferences.
-- Preferences are scoped to a tenant so one identity can keep separate workspaces per tenant.

create table if not exists public.user_workspace_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  constraint user_workspace_preferences_user_uq unique (tenant_id, user_id),
  check (jsonb_typeof(preferences) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index if not exists user_workspace_preferences_user_idx
  on public.user_workspace_preferences (user_id, tenant_id)
  where is_active = true and deleted_at is null;

drop trigger if exists user_workspace_preferences_touch_updated_at on public.user_workspace_preferences;
create trigger user_workspace_preferences_touch_updated_at
  before update on public.user_workspace_preferences
  for each row execute function public.touch_platform_row();

drop trigger if exists user_workspace_preferences_prevent_id_change on public.user_workspace_preferences;
create trigger user_workspace_preferences_prevent_id_change
  before update on public.user_workspace_preferences
  for each row execute function public.prevent_id_change();

drop trigger if exists user_workspace_preferences_prevent_tenant_id_change on public.user_workspace_preferences;
create trigger user_workspace_preferences_prevent_tenant_id_change
  before update on public.user_workspace_preferences
  for each row execute function public.prevent_tenant_id_change();

alter table public.user_workspace_preferences enable row level security;
alter table public.user_workspace_preferences force row level security;

drop policy if exists user_workspace_preferences_own_select on public.user_workspace_preferences;
create policy user_workspace_preferences_own_select on public.user_workspace_preferences
  for select to authenticated
  using (
    user_id = public.current_user_id()
    and is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
  );

drop policy if exists user_workspace_preferences_own_write on public.user_workspace_preferences;
create policy user_workspace_preferences_own_write on public.user_workspace_preferences
  for all to authenticated
  using (
    user_id = public.current_user_id()
    and is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
  )
  with check (
    user_id = public.current_user_id()
    and is_active = true
    and deleted_at is null
    and public.is_tenant_member(tenant_id)
  );
