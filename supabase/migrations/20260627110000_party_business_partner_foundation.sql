-- Nexora Party & Business Partner Foundation.
-- Shared platform registry only. No AR/AP, CRM opportunities, invoices, sales,
-- purchasing, customer balances, supplier balances, credit limits, or finance logic.

create type public.party_kind as enum ('organization', 'individual', 'government', 'internal');
create type public.party_status as enum ('active', 'inactive', 'blocked', 'archived', 'pending-approval');
create type public.party_role_type as enum (
  'customer',
  'supplier',
  'employee',
  'driver',
  'company',
  'branch',
  'manufacturer',
  'distributor',
  'carrier',
  'service-center',
  'vendor',
  'government-entity',
  'individual'
);
create type public.party_address_type as enum (
  'billing',
  'shipping',
  'warehouse',
  'office',
  'factory',
  'branch',
  'home'
);
create type public.party_contact_method as enum (
  'email',
  'mobile',
  'phone',
  'whatsapp',
  'website',
  'none'
);
create type public.party_timeline_event_type as enum (
  'created',
  'updated',
  'role_assigned',
  'role_removed',
  'contact_added',
  'address_added',
  'attachment_added',
  'note_added',
  'status_changed'
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_number text,
  display_name text not null,
  legal_name text,
  party_kind public.party_kind not null default 'organization',
  status public.party_status not null default 'active',
  preferred_language text,
  timezone text,
  website text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (party_number is null or party_number = upper(party_number)),
  check (length(trim(display_name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index parties_number_active_uq
  on public.parties (tenant_id, party_number)
  where party_number is not null and deleted_at is null;
create index parties_search_idx
  on public.parties (tenant_id, lower(display_name), lower(coalesce(legal_name, '')), status)
  where deleted_at is null;

create table public.party_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category_key text not null,
  label text not null,
  role_type public.party_role_type,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (category_key = lower(category_key)),
  check (length(trim(label)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index party_categories_scope_key_active_uq
  on public.party_categories (tenant_id, category_key)
  where deleted_at is null;

create table public.party_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  role_type public.party_role_type not null,
  category_id uuid references public.party_categories(id) on delete restrict,
  starts_on date,
  ends_on date,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index party_roles_party_role_active_uq
  on public.party_roles (tenant_id, party_id, role_type)
  where deleted_at is null;
create index party_roles_role_idx
  on public.party_roles (tenant_id, role_type, is_active)
  where deleted_at is null;

create table public.party_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  name text not null,
  job_title text,
  email text,
  mobile text,
  phone text,
  notes text,
  preferred_contact_method public.party_contact_method not null default 'none',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(name)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index party_contacts_party_idx
  on public.party_contacts (tenant_id, party_id, is_default, created_at)
  where deleted_at is null;

create table public.party_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  address_type public.party_address_type not null,
  country text not null,
  city text,
  region text,
  postal_code text,
  line1 text,
  line2 text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(country)) > 0),
  check (latitude is null or (latitude >= -90 and latitude <= 90)),
  check (longitude is null or (longitude >= -180 and longitude <= 180)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index party_addresses_party_idx
  on public.party_addresses (tenant_id, party_id, address_type, is_default)
  where deleted_at is null;

create table public.party_communication_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  phones jsonb not null default '[]'::jsonb,
  emails jsonb not null default '[]'::jsonb,
  website text,
  social_links jsonb not null default '{}'::jsonb,
  whatsapp text,
  preferred_language text,
  timezone text,
  preferred_contact_method public.party_contact_method not null default 'none',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(phones) = 'array'),
  check (jsonb_typeof(emails) = 'array'),
  check (jsonb_typeof(social_links) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index party_communication_profiles_party_active_uq
  on public.party_communication_profiles (tenant_id, party_id)
  where deleted_at is null;

create table public.party_legal_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  legal_name text,
  tax_number text,
  vat_number text,
  commercial_registration text,
  national_id text,
  passport_number text,
  registration_country text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index party_legal_identities_party_active_uq
  on public.party_legal_identities (tenant_id, party_id)
  where deleted_at is null;

create table public.party_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  file_attachment_id uuid not null references public.file_attachments(id) on delete restrict,
  attachment_role text not null default 'document',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (attachment_role = lower(attachment_role)),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index party_attachments_party_file_active_uq
  on public.party_attachments (tenant_id, party_id, file_attachment_id)
  where deleted_at is null;

create table public.party_timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  party_id uuid not null references public.parties(id) on delete cascade,
  event_type public.party_timeline_event_type not null,
  body text,
  mentioned_user_ids uuid[] not null default '{}'::uuid[],
  is_internal boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null)
);

create index party_timeline_events_party_idx
  on public.party_timeline_events (tenant_id, party_id, occurred_at desc, id desc);

create or replace function public.enforce_party_foundation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_tenant_id uuid;
begin
  if tg_table_name in (
    'party_roles',
    'party_contacts',
    'party_addresses',
    'party_communication_profiles',
    'party_legal_identities',
    'party_attachments',
    'party_timeline_events'
  ) then
    select tenant_id into parent_tenant_id from public.parties where id = new.party_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'party child tenant must match party tenant';
    end if;
  end if;

  if tg_table_name = 'party_roles' and new.category_id is not null then
    select tenant_id into parent_tenant_id from public.party_categories where id = new.category_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'party role category tenant must match party tenant';
    end if;
  elsif tg_table_name = 'party_attachments' then
    select tenant_id into parent_tenant_id from public.file_attachments where id = new.file_attachment_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'party attachment tenant must match file attachment tenant';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_party_timeline_event_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'party timeline events are append-only';
end;
$$;

create trigger parties_touch_updated_at before update on public.parties for each row execute function public.touch_platform_row();
create trigger parties_prevent_id_change before update on public.parties for each row execute function public.prevent_id_change();
create trigger parties_prevent_tenant_id_change before update on public.parties for each row execute function public.prevent_tenant_id_change();
create trigger party_categories_touch_updated_at before update on public.party_categories for each row execute function public.touch_platform_row();
create trigger party_categories_prevent_id_change before update on public.party_categories for each row execute function public.prevent_id_change();
create trigger party_categories_prevent_tenant_id_change before update on public.party_categories for each row execute function public.prevent_tenant_id_change();
create trigger party_roles_enforce_scope before insert or update on public.party_roles for each row execute function public.enforce_party_foundation_scope();
create trigger party_roles_touch_updated_at before update on public.party_roles for each row execute function public.touch_platform_row();
create trigger party_roles_prevent_id_change before update on public.party_roles for each row execute function public.prevent_id_change();
create trigger party_roles_prevent_tenant_id_change before update on public.party_roles for each row execute function public.prevent_tenant_id_change();
create trigger party_contacts_enforce_scope before insert or update on public.party_contacts for each row execute function public.enforce_party_foundation_scope();
create trigger party_contacts_touch_updated_at before update on public.party_contacts for each row execute function public.touch_platform_row();
create trigger party_contacts_prevent_id_change before update on public.party_contacts for each row execute function public.prevent_id_change();
create trigger party_contacts_prevent_tenant_id_change before update on public.party_contacts for each row execute function public.prevent_tenant_id_change();
create trigger party_addresses_enforce_scope before insert or update on public.party_addresses for each row execute function public.enforce_party_foundation_scope();
create trigger party_addresses_touch_updated_at before update on public.party_addresses for each row execute function public.touch_platform_row();
create trigger party_addresses_prevent_id_change before update on public.party_addresses for each row execute function public.prevent_id_change();
create trigger party_addresses_prevent_tenant_id_change before update on public.party_addresses for each row execute function public.prevent_tenant_id_change();
create trigger party_communication_profiles_enforce_scope before insert or update on public.party_communication_profiles for each row execute function public.enforce_party_foundation_scope();
create trigger party_communication_profiles_touch_updated_at before update on public.party_communication_profiles for each row execute function public.touch_platform_row();
create trigger party_communication_profiles_prevent_id_change before update on public.party_communication_profiles for each row execute function public.prevent_id_change();
create trigger party_communication_profiles_prevent_tenant_id_change before update on public.party_communication_profiles for each row execute function public.prevent_tenant_id_change();
create trigger party_legal_identities_enforce_scope before insert or update on public.party_legal_identities for each row execute function public.enforce_party_foundation_scope();
create trigger party_legal_identities_touch_updated_at before update on public.party_legal_identities for each row execute function public.touch_platform_row();
create trigger party_legal_identities_prevent_id_change before update on public.party_legal_identities for each row execute function public.prevent_id_change();
create trigger party_legal_identities_prevent_tenant_id_change before update on public.party_legal_identities for each row execute function public.prevent_tenant_id_change();
create trigger party_attachments_enforce_scope before insert or update on public.party_attachments for each row execute function public.enforce_party_foundation_scope();
create trigger party_attachments_touch_updated_at before update on public.party_attachments for each row execute function public.touch_platform_row();
create trigger party_attachments_prevent_id_change before update on public.party_attachments for each row execute function public.prevent_id_change();
create trigger party_attachments_prevent_tenant_id_change before update on public.party_attachments for each row execute function public.prevent_tenant_id_change();
create trigger party_timeline_events_enforce_scope before insert or update on public.party_timeline_events for each row execute function public.enforce_party_foundation_scope();
create trigger party_timeline_events_prevent_update before update on public.party_timeline_events for each row execute function public.prevent_party_timeline_event_update();
create trigger party_timeline_events_touch_updated_at before update on public.party_timeline_events for each row execute function public.touch_platform_row();
create trigger party_timeline_events_prevent_id_change before update on public.party_timeline_events for each row execute function public.prevent_id_change();
create trigger party_timeline_events_prevent_tenant_id_change before update on public.party_timeline_events for each row execute function public.prevent_tenant_id_change();

alter table public.parties enable row level security;
alter table public.party_categories enable row level security;
alter table public.party_roles enable row level security;
alter table public.party_contacts enable row level security;
alter table public.party_addresses enable row level security;
alter table public.party_communication_profiles enable row level security;
alter table public.party_legal_identities enable row level security;
alter table public.party_attachments enable row level security;
alter table public.party_timeline_events enable row level security;

alter table public.parties force row level security;
alter table public.party_categories force row level security;
alter table public.party_roles force row level security;
alter table public.party_contacts force row level security;
alter table public.party_addresses force row level security;
alter table public.party_communication_profiles force row level security;
alter table public.party_legal_identities force row level security;
alter table public.party_attachments force row level security;
alter table public.party_timeline_events force row level security;

create policy parties_select_member_permission on public.parties for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy parties_insert_member_permission on public.parties for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.create', tenant_id));
create policy parties_update_member_permission on public.parties for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.parties.edit', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.parties.edit', tenant_id));
create policy party_categories_select_member_permission on public.party_categories for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_categories_manage_permission on public.party_categories for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.categories.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.categories.manage', tenant_id));
create policy party_roles_select_member_permission on public.party_roles for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_roles_manage_permission on public.party_roles for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.roles.assign', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.roles.assign', tenant_id));
create policy party_contacts_select_member_permission on public.party_contacts for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_contacts_manage_permission on public.party_contacts for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.contacts.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.contacts.manage', tenant_id));
create policy party_addresses_select_member_permission on public.party_addresses for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_addresses_manage_permission on public.party_addresses for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.addresses.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.addresses.manage', tenant_id));
create policy party_communication_profiles_select_member_permission on public.party_communication_profiles for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_communication_profiles_manage_permission on public.party_communication_profiles for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.contacts.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.contacts.manage', tenant_id));
create policy party_legal_identities_select_member_permission on public.party_legal_identities for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_legal_identities_manage_permission on public.party_legal_identities for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.parties.edit', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.parties.edit', tenant_id));
create policy party_attachments_select_member_permission on public.party_attachments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_attachments_manage_permission on public.party_attachments for all to authenticated using (is_active = true and deleted_at is null and public.has_permission('party.attachments.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('party.attachments.manage', tenant_id));
create policy party_timeline_events_select_member_permission on public.party_timeline_events for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('party.parties.view', tenant_id));
create policy party_timeline_events_insert_member_permission on public.party_timeline_events for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('party.parties.edit', tenant_id) or public.has_permission('party.contacts.manage', tenant_id) or public.has_permission('party.addresses.manage', tenant_id) or public.has_permission('party.attachments.manage', tenant_id) or public.has_permission('party.roles.assign', tenant_id)));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('party.parties.view', 'View parties', 'Allows reading shared parties and related party profile data.', 'standard'),
  ('party.parties.create', 'Create parties', 'Allows creating shared parties.', 'standard'),
  ('party.parties.edit', 'Edit parties', 'Allows editing shared party profile and legal identity data.', 'high'),
  ('party.parties.delete', 'Delete parties', 'Allows archiving or soft deleting shared parties.', 'critical'),
  ('party.contacts.manage', 'Manage party contacts', 'Allows managing shared party contacts and communication profiles.', 'standard'),
  ('party.addresses.manage', 'Manage party addresses', 'Allows managing shared party addresses.', 'standard'),
  ('party.attachments.manage', 'Manage party attachments', 'Allows linking platform file attachments to parties.', 'high'),
  ('party.roles.assign', 'Assign party roles', 'Allows assigning business roles to shared parties.', 'high'),
  ('party.categories.manage', 'Manage party categories', 'Allows managing shared party categories.', 'standard')
on conflict do nothing;
