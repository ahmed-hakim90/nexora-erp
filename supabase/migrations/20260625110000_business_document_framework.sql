-- Nexora Sprint 6: generic Business Document Framework only.
-- No inventory transactions, production, sales invoices/orders, purchase orders, or accounting documents.

create type public.business_document_timeline_event_type as enum (
  'created',
  'updated',
  'status_changed',
  'workflow_transitioned',
  'approval_requested',
  'approved',
  'rejected',
  'commented',
  'attachment_added',
  'printed',
  'exported',
  'cancelled',
  'closed'
);

create domain public.business_document_generic_key as text
  check (
    value = lower(value)
    and value ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$'
  );

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_type_key public.business_document_generic_key not null,
  name text not null,
  description text,
  source_module public.business_document_generic_key not null default 'documents',
  numbering_sequence_key public.business_document_generic_key not null,
  requires_branch_numbering boolean not null default false,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete restrict,
  approval_policy_id uuid references public.approval_policies(id) on delete restrict,
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

create table public.document_statuses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_type_key public.business_document_generic_key not null,
  status_key public.business_document_generic_key not null,
  label text not null,
  category text not null default 'draft' check (category in ('draft', 'open', 'posted', 'cancelled', 'closed')),
  is_initial boolean not null default false,
  is_terminal boolean not null default false,
  sort_order integer not null default 100 check (sort_order >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(label)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.business_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_number text not null,
  document_type_key public.business_document_generic_key not null,
  title text not null,
  status public.business_document_generic_key not null default 'draft',
  workflow_status public.business_document_generic_key,
  approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected', 'returned', 'cancelled')),
  owner_user_id uuid references auth.users(id),
  source_module public.business_document_generic_key not null default 'documents',
  source_entity_type public.business_document_generic_key,
  source_entity_id uuid,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete restrict,
  approval_instance_id uuid references public.approval_instances(id) on delete set null,
  fiscal_year text,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  posted_at timestamptz,
  cancelled_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(document_number)) > 0),
  check (length(trim(title)) > 0),
  check (jsonb_typeof(metadata) = 'object'),
  check (posted_at is null or cancelled_at is null),
  check (closed_at is null or cancelled_at is null),
  check (deleted_at is null or deleted_by is not null)
);

create table public.document_references (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  reference_type public.business_document_generic_key not null,
  reference_id uuid not null,
  reference_role public.business_document_generic_key not null,
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

create table public.document_timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  event_type public.business_document_timeline_event_type not null,
  actor_user_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  correlation_id text,
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

create table public.document_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  parent_comment_id uuid references public.document_comments(id) on delete restrict,
  body text not null,
  is_internal boolean not null default true,
  is_public_placeholder boolean not null default false,
  mentions_placeholder jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (length(trim(body)) > 0),
  check (jsonb_typeof(mentions_placeholder) = 'array'),
  check (jsonb_typeof(metadata) = 'object'),
  check (parent_comment_id is null or parent_comment_id <> id),
  check (deleted_at is null or deleted_by is not null)
);

create table public.document_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  file_attachment_id uuid not null references public.file_attachments(id) on delete restrict,
  attachment_role public.business_document_generic_key not null default 'supporting',
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

create table public.document_print_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  snapshot_key public.business_document_generic_key not null,
  print_format public.export_format not null default 'pdf' check (print_format in ('pdf', 'print')),
  snapshot_metadata jsonb not null default '{}'::jsonb,
  file_attachment_id uuid references public.file_attachments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(snapshot_metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create table public.document_export_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  document_id uuid not null references public.business_documents(id) on delete cascade,
  export_format public.export_format not null check (export_format in ('excel', 'pdf', 'csv', 'print')),
  status public.platform_job_status not null default 'queued',
  requested_by uuid not null references auth.users(id),
  filters jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  file_attachment_id uuid references public.file_attachments(id) on delete set null,
  idempotency_key text not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(filters) = 'object'),
  check (jsonb_typeof(metadata) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index document_types_scope_key_active_uq
  on public.document_types (
    tenant_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_type_key
  )
  where deleted_at is null;
create index document_types_tenant_active_idx on public.document_types (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;

create unique index document_statuses_scope_key_active_uq
  on public.document_statuses (
    tenant_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_type_key,
    status_key
  )
  where deleted_at is null;
create index document_statuses_tenant_type_idx on public.document_statuses (tenant_id, document_type_key, sort_order) where deleted_at is null;

create unique index business_documents_number_active_uq
  on public.business_documents (
    tenant_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_type_key,
    coalesce(fiscal_year, ''),
    document_number
  )
  where deleted_at is null;
create index business_documents_tenant_active_idx on public.business_documents (tenant_id, is_active, created_at desc, id desc) where deleted_at is null;
create index business_documents_tenant_status_idx on public.business_documents (tenant_id, document_type_key, status, created_at desc) where deleted_at is null;
create index business_documents_source_idx on public.business_documents (tenant_id, source_module, source_entity_type, source_entity_id) where source_entity_id is not null and deleted_at is null;

create unique index document_references_document_reference_role_uq
  on public.document_references (tenant_id, document_id, reference_type, reference_id, reference_role)
  where deleted_at is null;
create index document_references_reference_idx on public.document_references (tenant_id, reference_type, reference_id) where deleted_at is null;

create index document_timeline_events_document_idx on public.document_timeline_events (tenant_id, document_id, occurred_at desc, id desc);
create index document_timeline_events_correlation_idx on public.document_timeline_events (tenant_id, correlation_id) where correlation_id is not null;

create index document_comments_document_idx on public.document_comments (tenant_id, document_id, created_at, id) where deleted_at is null;
create index document_comments_parent_idx on public.document_comments (tenant_id, parent_comment_id, created_at) where parent_comment_id is not null and deleted_at is null;

create unique index document_attachments_document_file_active_uq on public.document_attachments (tenant_id, document_id, file_attachment_id) where deleted_at is null;
create index document_attachments_document_idx on public.document_attachments (tenant_id, document_id, created_at desc) where deleted_at is null;

create unique index document_print_snapshots_key_active_uq on public.document_print_snapshots (tenant_id, document_id, snapshot_key) where deleted_at is null;
create index document_print_snapshots_document_idx on public.document_print_snapshots (tenant_id, document_id, created_at desc) where deleted_at is null;

create unique index document_export_jobs_idempotency_uq on public.document_export_jobs (tenant_id, idempotency_key) where deleted_at is null;
create index document_export_jobs_document_idx on public.document_export_jobs (tenant_id, document_id, created_at desc) where deleted_at is null;
create index document_export_jobs_status_idx on public.document_export_jobs (tenant_id, status, created_at desc) where deleted_at is null;

create or replace function public.enforce_business_document_reference_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_tenant_id uuid;
  parent_branch_id uuid;
  parent_document_id uuid;
begin
  if new.branch_id is not null then
    select tenant_id into parent_tenant_id from public.branches where id = new.branch_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'document branch tenant must match row tenant';
    end if;
  end if;

  if tg_table_name = 'document_types' then
    if new.workflow_definition_id is not null then
      select tenant_id into parent_tenant_id from public.workflow_definitions where id = new.workflow_definition_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document type tenant must match workflow definition tenant';
      end if;
    end if;

    if new.approval_policy_id is not null then
      select tenant_id into parent_tenant_id from public.approval_policies where id = new.approval_policy_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document type tenant must match approval policy tenant';
      end if;
    end if;
  elsif tg_table_name = 'document_statuses' then
    select tenant_id, branch_id into parent_tenant_id, parent_branch_id
    from public.document_types
    where tenant_id = new.tenant_id
      and document_type_key = new.document_type_key
      and (branch_id is not distinct from new.branch_id or branch_id is null)
      and is_active = true
      and deleted_at is null
    order by branch_id nulls last
    limit 1;

    if parent_tenant_id is null then
      raise exception 'document status must belong to an active document type registry entry';
    end if;
  elsif tg_table_name = 'business_documents' then
    select tenant_id, branch_id into parent_tenant_id, parent_branch_id
    from public.document_types
    where tenant_id = new.tenant_id
      and document_type_key = new.document_type_key
      and (branch_id is not distinct from new.branch_id or branch_id is null)
      and is_active = true
      and deleted_at is null
    order by branch_id nulls last
    limit 1;

    if parent_tenant_id is null then
      raise exception 'business document type must be registered for the row scope';
    end if;

    select tenant_id, branch_id into parent_tenant_id, parent_branch_id
    from public.document_statuses
    where tenant_id = new.tenant_id
      and document_type_key = new.document_type_key
      and status_key = new.status
      and (branch_id is not distinct from new.branch_id or branch_id is null)
      and is_active = true
      and deleted_at is null
    order by branch_id nulls last
    limit 1;

    if parent_tenant_id is null then
      raise exception 'business document status must be registered for the document type';
    end if;

    if new.workflow_definition_id is not null then
      select tenant_id into parent_tenant_id from public.workflow_definitions where id = new.workflow_definition_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'business document tenant must match workflow definition tenant';
      end if;
    end if;

    if new.approval_instance_id is not null then
      select tenant_id into parent_tenant_id from public.approval_instances where id = new.approval_instance_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'business document tenant must match approval instance tenant';
      end if;
    end if;
  elsif tg_table_name in (
    'document_references',
    'document_timeline_events',
    'document_comments',
    'document_attachments',
    'document_print_snapshots',
    'document_export_jobs'
  ) then
    select tenant_id, branch_id into parent_tenant_id, parent_branch_id
    from public.business_documents
    where id = new.document_id;

    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'document child tenant must match document tenant';
    end if;

    if new.branch_id is distinct from parent_branch_id then
      raise exception 'document child branch must match document branch';
    end if;

    if tg_table_name = 'document_references' and new.reference_type in ('business_document', 'document') then
      select tenant_id, branch_id into parent_tenant_id, parent_branch_id
      from public.business_documents
      where id = new.reference_id
        and is_active = true
        and deleted_at is null;

      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document reference target tenant must match row tenant';
      end if;

      if parent_branch_id is distinct from new.branch_id then
        raise exception 'document reference target branch must match row branch';
      end if;
    elsif tg_table_name = 'document_comments' and new.parent_comment_id is not null then
      select tenant_id, branch_id, document_id into parent_tenant_id, parent_branch_id, parent_document_id
      from public.document_comments
      where id = new.parent_comment_id
        and is_active = true
        and deleted_at is null;

      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'parent comment tenant must match child comment tenant';
      end if;

      if parent_branch_id is distinct from new.branch_id then
        raise exception 'parent comment branch must match child comment branch';
      end if;

      if parent_document_id is distinct from new.document_id then
        raise exception 'parent comment document must match child comment document';
      end if;
    elsif tg_table_name = 'document_attachments' then
      select tenant_id into parent_tenant_id from public.file_attachments where id = new.file_attachment_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document attachment tenant must match file attachment tenant';
      end if;
    elsif tg_table_name = 'document_print_snapshots' and new.file_attachment_id is not null then
      select tenant_id into parent_tenant_id from public.file_attachments where id = new.file_attachment_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'print snapshot tenant must match file attachment tenant';
      end if;
    elsif tg_table_name = 'document_export_jobs' and new.file_attachment_id is not null then
      select tenant_id into parent_tenant_id from public.file_attachments where id = new.file_attachment_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document export tenant must match file attachment tenant';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_document_timeline_event_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'document timeline events are append-only';
end;
$$;

create or replace function public.generate_business_document_number(
  input_tenant_id uuid,
  input_branch_id uuid,
  input_document_type_key text,
  input_fiscal_year text
)
returns table (
  document_number text,
  sequence_id uuid,
  sequence_value bigint
)
language plpgsql
set search_path = public
as $$
declare
  resolved_type public.document_types%rowtype;
  resolved_sequence public.numbering_sequences%rowtype;
  sequence_branch_id uuid;
begin
  if not public.is_tenant_member(input_tenant_id) then
    raise exception 'tenant membership is required to generate document numbers';
  end if;

  select *
  into resolved_type
  from public.document_types
  where tenant_id = input_tenant_id
    and document_type_key = lower(input_document_type_key)
    and (branch_id is not distinct from input_branch_id or branch_id is null)
    and is_active = true
    and deleted_at is null
  order by branch_id nulls last
  limit 1;

  if resolved_type.id is null then
    raise exception 'document type registry entry was not found';
  end if;

  if resolved_type.requires_branch_numbering and input_branch_id is null then
    raise exception 'branch scoped numbering requires a branch id';
  end if;

  sequence_branch_id := case
    when resolved_type.requires_branch_numbering then input_branch_id
    else resolved_type.branch_id
  end;

  select *
  into resolved_sequence
  from public.numbering_sequences
  where tenant_id = input_tenant_id
    and coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid) =
      coalesce(sequence_branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(fiscal_year, '') = coalesce(input_fiscal_year, '')
    and module_key = resolved_type.source_module
    and document_type = resolved_type.document_type_key
    and sequence_key = resolved_type.numbering_sequence_key
    and is_active = true
    and deleted_at is null
  for update;

  if resolved_sequence.id is null then
    raise exception 'numbering sequence was not found for document type';
  end if;

  document_number := resolved_sequence.prefix || lpad(resolved_sequence.next_value::text, resolved_sequence.padding, '0');
  sequence_id := resolved_sequence.id;
  sequence_value := resolved_sequence.next_value;

  update public.numbering_sequences
  set next_value = next_value + 1,
      updated_by = public.current_user_id()
  where id = resolved_sequence.id;

  return next;
end;
$$;

create trigger document_types_touch_updated_at before update on public.document_types for each row execute function public.touch_platform_row();
create trigger document_types_prevent_id_change before update on public.document_types for each row execute function public.prevent_id_change();
create trigger document_types_prevent_tenant_id_change before update on public.document_types for each row execute function public.prevent_tenant_id_change();
create trigger document_types_enforce_scope before insert or update on public.document_types for each row execute function public.enforce_business_document_reference_scope();

create trigger document_statuses_touch_updated_at before update on public.document_statuses for each row execute function public.touch_platform_row();
create trigger document_statuses_prevent_id_change before update on public.document_statuses for each row execute function public.prevent_id_change();
create trigger document_statuses_prevent_tenant_id_change before update on public.document_statuses for each row execute function public.prevent_tenant_id_change();
create trigger document_statuses_enforce_scope before insert or update on public.document_statuses for each row execute function public.enforce_business_document_reference_scope();

create trigger business_documents_touch_updated_at before update on public.business_documents for each row execute function public.touch_platform_row();
create trigger business_documents_prevent_id_change before update on public.business_documents for each row execute function public.prevent_id_change();
create trigger business_documents_prevent_tenant_id_change before update on public.business_documents for each row execute function public.prevent_tenant_id_change();
create trigger business_documents_enforce_scope before insert or update on public.business_documents for each row execute function public.enforce_business_document_reference_scope();

create trigger document_references_touch_updated_at before update on public.document_references for each row execute function public.touch_platform_row();
create trigger document_references_prevent_id_change before update on public.document_references for each row execute function public.prevent_id_change();
create trigger document_references_prevent_tenant_id_change before update on public.document_references for each row execute function public.prevent_tenant_id_change();
create trigger document_references_enforce_scope before insert or update on public.document_references for each row execute function public.enforce_business_document_reference_scope();

create trigger document_timeline_events_prevent_update before update on public.document_timeline_events for each row execute function public.prevent_document_timeline_event_update();
create trigger document_timeline_events_touch_updated_at before update on public.document_timeline_events for each row execute function public.touch_platform_row();
create trigger document_timeline_events_prevent_id_change before update on public.document_timeline_events for each row execute function public.prevent_id_change();
create trigger document_timeline_events_prevent_tenant_id_change before update on public.document_timeline_events for each row execute function public.prevent_tenant_id_change();
create trigger document_timeline_events_enforce_scope before insert or update on public.document_timeline_events for each row execute function public.enforce_business_document_reference_scope();

create trigger document_comments_touch_updated_at before update on public.document_comments for each row execute function public.touch_platform_row();
create trigger document_comments_prevent_id_change before update on public.document_comments for each row execute function public.prevent_id_change();
create trigger document_comments_prevent_tenant_id_change before update on public.document_comments for each row execute function public.prevent_tenant_id_change();
create trigger document_comments_enforce_scope before insert or update on public.document_comments for each row execute function public.enforce_business_document_reference_scope();

create trigger document_attachments_touch_updated_at before update on public.document_attachments for each row execute function public.touch_platform_row();
create trigger document_attachments_prevent_id_change before update on public.document_attachments for each row execute function public.prevent_id_change();
create trigger document_attachments_prevent_tenant_id_change before update on public.document_attachments for each row execute function public.prevent_tenant_id_change();
create trigger document_attachments_enforce_scope before insert or update on public.document_attachments for each row execute function public.enforce_business_document_reference_scope();

create trigger document_print_snapshots_touch_updated_at before update on public.document_print_snapshots for each row execute function public.touch_platform_row();
create trigger document_print_snapshots_prevent_id_change before update on public.document_print_snapshots for each row execute function public.prevent_id_change();
create trigger document_print_snapshots_prevent_tenant_id_change before update on public.document_print_snapshots for each row execute function public.prevent_tenant_id_change();
create trigger document_print_snapshots_enforce_scope before insert or update on public.document_print_snapshots for each row execute function public.enforce_business_document_reference_scope();

create trigger document_export_jobs_touch_updated_at before update on public.document_export_jobs for each row execute function public.touch_platform_row();
create trigger document_export_jobs_prevent_id_change before update on public.document_export_jobs for each row execute function public.prevent_id_change();
create trigger document_export_jobs_prevent_tenant_id_change before update on public.document_export_jobs for each row execute function public.prevent_tenant_id_change();
create trigger document_export_jobs_enforce_scope before insert or update on public.document_export_jobs for each row execute function public.enforce_business_document_reference_scope();

alter table public.document_types enable row level security;
alter table public.document_statuses enable row level security;
alter table public.business_documents enable row level security;
alter table public.document_references enable row level security;
alter table public.document_timeline_events enable row level security;
alter table public.document_comments enable row level security;
alter table public.document_attachments enable row level security;
alter table public.document_print_snapshots enable row level security;
alter table public.document_export_jobs enable row level security;

alter table public.document_types force row level security;
alter table public.document_statuses force row level security;
alter table public.business_documents force row level security;
alter table public.document_references force row level security;
alter table public.document_timeline_events force row level security;
alter table public.document_comments force row level security;
alter table public.document_attachments force row level security;
alter table public.document_print_snapshots force row level security;
alter table public.document_export_jobs force row level security;

create policy document_types_select_member_permission on public.document_types for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_types_insert_member_permission on public.document_types for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.create', tenant_id));
create policy document_types_update_member_permission on public.document_types for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id));

create policy document_statuses_select_member_permission on public.document_statuses for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_statuses_insert_member_permission on public.document_statuses for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.create', tenant_id));
create policy document_statuses_update_member_permission on public.document_statuses for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id));

create policy business_documents_select_member_permission on public.business_documents for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy business_documents_insert_member_permission on public.business_documents for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.create', tenant_id));
create policy business_documents_update_member_permission on public.business_documents for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('documents.update', tenant_id) or public.has_permission('documents.change_status', tenant_id) or public.has_permission('documents.cancel', tenant_id) or public.has_permission('documents.close', tenant_id))) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and (public.has_permission('documents.update', tenant_id) or public.has_permission('documents.change_status', tenant_id) or public.has_permission('documents.cancel', tenant_id) or public.has_permission('documents.close', tenant_id)));

create policy document_references_select_member_permission on public.document_references for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_references_insert_member_permission on public.document_references for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id));
create policy document_references_update_member_permission on public.document_references for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.update', tenant_id));

create policy document_timeline_events_select_member_permission on public.document_timeline_events for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_timeline_events_insert_member_permission on public.document_timeline_events for insert to authenticated with check (
  is_active = true
  and deleted_at is null
  and public.is_tenant_member(tenant_id)
  and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null)
  and (
    (event_type = 'created' and public.has_permission('documents.create', tenant_id))
    or (event_type = 'updated' and public.has_permission('documents.update', tenant_id))
    or (event_type in ('status_changed', 'workflow_transitioned', 'approval_requested', 'approved', 'rejected') and public.has_permission('documents.change_status', tenant_id))
    or (event_type = 'commented' and public.has_permission('documents.comment', tenant_id))
    or (event_type = 'attachment_added' and public.has_permission('documents.attach', tenant_id))
    or (event_type = 'printed' and public.has_permission('documents.print', tenant_id))
    or (event_type = 'exported' and public.has_permission('documents.export', tenant_id))
    or (event_type = 'cancelled' and public.has_permission('documents.cancel', tenant_id))
    or (event_type = 'closed' and public.has_permission('documents.close', tenant_id))
  )
);

create policy document_comments_select_member_permission on public.document_comments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_comments_insert_member_permission on public.document_comments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.comment', tenant_id));
create policy document_comments_update_member_permission on public.document_comments for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.comment', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.comment', tenant_id));
create policy document_comments_soft_delete_member_permission on public.document_comments for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.comment', tenant_id)) with check (is_active = false and deleted_at is not null and deleted_by = public.current_user_id() and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.comment', tenant_id));

create policy document_attachments_select_member_permission on public.document_attachments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_attachments_insert_member_permission on public.document_attachments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.attach', tenant_id));
create policy document_attachments_update_member_permission on public.document_attachments for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.attach', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.attach', tenant_id));

create policy document_print_snapshots_select_member_permission on public.document_print_snapshots for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_print_snapshots_insert_member_permission on public.document_print_snapshots for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.print', tenant_id));
create policy document_print_snapshots_update_member_permission on public.document_print_snapshots for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.print', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.print', tenant_id));

create policy document_export_jobs_select_member_permission on public.document_export_jobs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.view', tenant_id));
create policy document_export_jobs_insert_member_permission on public.document_export_jobs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.export', tenant_id));
create policy document_export_jobs_update_member_permission on public.document_export_jobs for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.export', tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and exists (select 1 from public.tenants t where t.id = tenant_id and t.is_active = true and t.deleted_at is null) and public.has_permission('documents.export', tenant_id));

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('documents.view', 'View Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.create', 'Create Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.update', 'Update Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.change_status', 'Change Document Status', 'Sprint 6 generic document permission.', 'high'),
  ('documents.comment', 'Comment On Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.attach', 'Attach Files To Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.print', 'Print Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.export', 'Export Documents', 'Sprint 6 generic document permission.', 'standard'),
  ('documents.cancel', 'Cancel Documents', 'Sprint 6 generic document permission.', 'high'),
  ('documents.close', 'Close Documents', 'Sprint 6 generic document permission.', 'high')
on conflict do nothing;
