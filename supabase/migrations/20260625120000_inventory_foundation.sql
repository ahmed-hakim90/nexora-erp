-- Nexora Sprint 7: Inventory Events and Integration Foundation only.
-- No inventory posting, stock state, transfers, production, sales, purchase, or accounting.
-- These tables define event contracts and integration placeholders only; they are not source-of-truth ledgers.

create type public.inventory_event_direction as enum ('inbound', 'outbound', 'internal');
create type public.inventory_integration_transport as enum ('webhook_placeholder', 'api_placeholder', 'file_placeholder', 'manual_placeholder');
create type public.inventory_integration_message_status as enum ('draft', 'queued', 'acknowledged', 'failed', 'cancelled');

create table public.inventory_event_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  event_key public.business_document_generic_key not null,
  name text not null,
  direction public.inventory_event_direction not null,
  source_scope public.business_document_generic_key not null default 'warehouse_items',
  payload_schema_placeholder jsonb not null default '{}'::jsonb,
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
  check (jsonb_typeof(payload_schema_placeholder) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_integration_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  endpoint_key public.business_document_generic_key not null,
  name text not null,
  direction public.inventory_event_direction not null,
  transport public.inventory_integration_transport not null,
  connection_settings_placeholder jsonb not null default '{}'::jsonb,
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
  check (jsonb_typeof(connection_settings_placeholder) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_event_routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  route_key public.business_document_generic_key not null,
  event_definition_id uuid not null references public.inventory_event_definitions(id) on delete restrict,
  endpoint_id uuid not null references public.inventory_integration_endpoints(id) on delete restrict,
  delivery_mode_placeholder public.business_document_generic_key not null default 'manual_review',
  filter_placeholder jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(filter_placeholder) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.inventory_integration_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  message_key text not null,
  event_definition_id uuid references public.inventory_event_definitions(id) on delete restrict,
  endpoint_id uuid references public.inventory_integration_endpoints(id) on delete restrict,
  direction public.inventory_event_direction not null,
  status public.inventory_integration_message_status not null default 'draft',
  source_entity_type public.business_document_generic_key,
  source_entity_id uuid,
  idempotency_key text,
  external_reference text,
  payload_metadata_placeholder jsonb not null default '{}'::jsonb,
  error_metadata_placeholder jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(message_key)) > 0),
  check (jsonb_typeof(payload_metadata_placeholder) = 'object'),
  check (jsonb_typeof(error_metadata_placeholder) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index inventory_event_definitions_key_active_uq on public.inventory_event_definitions (tenant_id, event_key) where deleted_at is null;
create index inventory_event_definitions_direction_status_idx on public.inventory_event_definitions (tenant_id, direction, is_active, created_at desc, id desc) where deleted_at is null;

create unique index inventory_integration_endpoints_key_active_uq on public.inventory_integration_endpoints (tenant_id, endpoint_key) where deleted_at is null;
create index inventory_integration_endpoints_direction_transport_idx on public.inventory_integration_endpoints (tenant_id, direction, transport, is_active, created_at desc, id desc) where deleted_at is null;

create unique index inventory_event_routes_key_active_uq on public.inventory_event_routes (tenant_id, route_key) where deleted_at is null;
create index inventory_event_routes_event_endpoint_idx on public.inventory_event_routes (tenant_id, event_definition_id, endpoint_id, is_active) where deleted_at is null;

create unique index inventory_integration_messages_idempotency_uq on public.inventory_integration_messages (tenant_id, idempotency_key) where idempotency_key is not null and deleted_at is null;
create index inventory_integration_messages_status_idx on public.inventory_integration_messages (tenant_id, status, created_at desc, id desc) where deleted_at is null;
create index inventory_integration_messages_event_endpoint_idx on public.inventory_integration_messages (tenant_id, event_definition_id, endpoint_id, created_at desc, id desc) where deleted_at is null;
create index inventory_integration_messages_source_idx on public.inventory_integration_messages (tenant_id, source_entity_type, source_entity_id) where source_entity_id is not null and deleted_at is null;

create or replace function public.enforce_inventory_events_integration_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  referenced_tenant_id uuid;
  referenced_branch_id uuid;
  event_direction public.inventory_event_direction;
  endpoint_direction public.inventory_event_direction;
begin
  if new.branch_id is not null then
    select tenant_id into referenced_tenant_id from public.branches where id = new.branch_id;
    if referenced_tenant_id is distinct from new.tenant_id then
      raise exception 'branch must belong to the same tenant';
    end if;
  end if;

  if tg_table_name = 'inventory_event_routes' then
    select tenant_id, branch_id, direction into referenced_tenant_id, referenced_branch_id, event_direction
    from public.inventory_event_definitions
    where id = new.event_definition_id and is_active = true and deleted_at is null;

    if referenced_tenant_id is distinct from new.tenant_id then raise exception 'event definition must belong to the same tenant'; end if;
    if new.branch_id is distinct from referenced_branch_id then raise exception 'route branch must match event definition branch'; end if;

    select tenant_id, branch_id, direction into referenced_tenant_id, referenced_branch_id, endpoint_direction
    from public.inventory_integration_endpoints
    where id = new.endpoint_id and is_active = true and deleted_at is null;

    if referenced_tenant_id is distinct from new.tenant_id then raise exception 'endpoint must belong to the same tenant'; end if;
    if new.branch_id is distinct from referenced_branch_id then raise exception 'route branch must match endpoint branch'; end if;
    if endpoint_direction is distinct from event_direction then raise exception 'route endpoint direction must match event direction'; end if;
  elsif tg_table_name = 'inventory_integration_messages' then
    if new.event_definition_id is not null then
      select tenant_id, branch_id, direction into referenced_tenant_id, referenced_branch_id, event_direction
      from public.inventory_event_definitions
      where id = new.event_definition_id and is_active = true and deleted_at is null;

      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'message event definition must belong to the same tenant'; end if;
      if new.branch_id is distinct from referenced_branch_id then raise exception 'message branch must match event definition branch'; end if;
      if new.direction is distinct from event_direction then raise exception 'message direction must match event definition direction'; end if;
    end if;

    if new.endpoint_id is not null then
      select tenant_id, branch_id, direction into referenced_tenant_id, referenced_branch_id, endpoint_direction
      from public.inventory_integration_endpoints
      where id = new.endpoint_id and is_active = true and deleted_at is null;

      if referenced_tenant_id is distinct from new.tenant_id then raise exception 'message endpoint must belong to the same tenant'; end if;
      if new.branch_id is distinct from referenced_branch_id then raise exception 'message branch must match endpoint branch'; end if;
      if new.direction is distinct from endpoint_direction then raise exception 'message direction must match endpoint direction'; end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger inventory_event_definitions_enforce_scope before insert or update on public.inventory_event_definitions for each row execute function public.enforce_inventory_events_integration_scope();
create trigger inventory_integration_endpoints_enforce_scope before insert or update on public.inventory_integration_endpoints for each row execute function public.enforce_inventory_events_integration_scope();
create trigger inventory_event_routes_enforce_scope before insert or update on public.inventory_event_routes for each row execute function public.enforce_inventory_events_integration_scope();
create trigger inventory_integration_messages_enforce_scope before insert or update on public.inventory_integration_messages for each row execute function public.enforce_inventory_events_integration_scope();

create trigger inventory_event_definitions_touch_updated_at before update on public.inventory_event_definitions for each row execute function public.touch_platform_row();
create trigger inventory_event_definitions_prevent_id_change before update on public.inventory_event_definitions for each row execute function public.prevent_id_change();
create trigger inventory_event_definitions_prevent_tenant_id_change before update on public.inventory_event_definitions for each row execute function public.prevent_tenant_id_change();

create trigger inventory_integration_endpoints_touch_updated_at before update on public.inventory_integration_endpoints for each row execute function public.touch_platform_row();
create trigger inventory_integration_endpoints_prevent_id_change before update on public.inventory_integration_endpoints for each row execute function public.prevent_id_change();
create trigger inventory_integration_endpoints_prevent_tenant_id_change before update on public.inventory_integration_endpoints for each row execute function public.prevent_tenant_id_change();

create trigger inventory_event_routes_touch_updated_at before update on public.inventory_event_routes for each row execute function public.touch_platform_row();
create trigger inventory_event_routes_prevent_id_change before update on public.inventory_event_routes for each row execute function public.prevent_id_change();
create trigger inventory_event_routes_prevent_tenant_id_change before update on public.inventory_event_routes for each row execute function public.prevent_tenant_id_change();

create trigger inventory_integration_messages_touch_updated_at before update on public.inventory_integration_messages for each row execute function public.touch_platform_row();
create trigger inventory_integration_messages_prevent_id_change before update on public.inventory_integration_messages for each row execute function public.prevent_id_change();
create trigger inventory_integration_messages_prevent_tenant_id_change before update on public.inventory_integration_messages for each row execute function public.prevent_tenant_id_change();

alter table public.inventory_event_definitions enable row level security;
alter table public.inventory_integration_endpoints enable row level security;
alter table public.inventory_event_routes enable row level security;
alter table public.inventory_integration_messages enable row level security;

alter table public.inventory_event_definitions force row level security;
alter table public.inventory_integration_endpoints force row level security;
alter table public.inventory_event_routes force row level security;
alter table public.inventory_integration_messages force row level security;

create policy inventory_event_definitions_select_member_permission on public.inventory_event_definitions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.events.view', tenant_id));
create policy inventory_event_definitions_insert_member_permission on public.inventory_event_definitions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.events.manage', tenant_id));
create policy inventory_event_definitions_update_member_permission on public.inventory_event_definitions for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.events.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.events.manage', tenant_id));

create policy inventory_integration_endpoints_select_member_permission on public.inventory_integration_endpoints for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.view', tenant_id));
create policy inventory_integration_endpoints_insert_member_permission on public.inventory_integration_endpoints for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));
create policy inventory_integration_endpoints_update_member_permission on public.inventory_integration_endpoints for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));

create policy inventory_event_routes_select_member_permission on public.inventory_event_routes for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.view', tenant_id));
create policy inventory_event_routes_insert_member_permission on public.inventory_event_routes for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));
create policy inventory_event_routes_update_member_permission on public.inventory_event_routes for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));

create policy inventory_integration_messages_select_member_permission on public.inventory_integration_messages for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.view', tenant_id));
create policy inventory_integration_messages_insert_member_permission on public.inventory_integration_messages for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));
create policy inventory_integration_messages_update_member_permission on public.inventory_integration_messages for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('inventory.integration.manage', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('inventory.events.view', 'View Inventory Event Definitions', 'View Sprint 7 event foundation definitions.', 'standard'),
  ('inventory.events.manage', 'Manage Inventory Event Definitions', 'Manage Sprint 7 event foundation definitions.', 'elevated'),
  ('inventory.integration.view', 'View Inventory Integration Foundation', 'View Sprint 7 integration endpoints, routes, and message placeholders.', 'standard'),
  ('inventory.integration.manage', 'Manage Inventory Integration Foundation', 'Manage Sprint 7 integration placeholders without posting stock.', 'elevated')
on conflict (permission_key) do update
set label = excluded.label,
    description = excluded.description,
    risk_level = excluded.risk_level;
