-- Nexora Sprint 3: generic platform engines only.
-- No business module tables, business workflows, invoices, products, inventory, HR, sales, or accounting.

create type public.platform_job_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.platform_priority as enum ('low', 'normal', 'high', 'critical');
create type public.approval_mode as enum ('sequential', 'parallel');
create type public.approval_decision as enum ('approve', 'reject', 'return-for-correction', 'cancel');
create type public.notification_channel as enum ('in-app', 'email', 'push', 'whatsapp', 'webhook');
create type public.attachment_kind as enum ('image', 'pdf', 'excel', 'document', 'other');
create type public.export_format as enum ('excel', 'pdf', 'csv', 'print');
create type public.numbering_reset_rule as enum ('never', 'fiscal-year', 'calendar-year', 'monthly');

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  workflow_key text not null,
  module_key text not null,
  entity_type text not null,
  states jsonb not null,
  transitions jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (workflow_key = lower(workflow_key)),
  check (module_key = lower(module_key)),
  check (jsonb_typeof(states) = 'array'),
  check (jsonb_typeof(transitions) = 'array'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index workflow_definitions_scope_key_active_uq
  on public.workflow_definitions (tenant_id, module_key, entity_type, workflow_key)
  where deleted_at is null;
create index workflow_definitions_tenant_module_idx
  on public.workflow_definitions (tenant_id, module_key, entity_type)
  where deleted_at is null;

create table public.workflow_transition_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete restrict,
  module_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  transition_key text not null,
  from_status text not null,
  to_status text not null,
  guard_results jsonb not null default '{}'::jsonb,
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
  check (transition_key = lower(transition_key)),
  check (deleted_at is null)
);

create index workflow_transition_history_entity_idx
  on public.workflow_transition_history (tenant_id, module_key, entity_type, entity_id, created_at desc);

create table public.approval_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  policy_key text not null,
  module_key text not null,
  entity_type text not null,
  steps jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (policy_key = lower(policy_key)),
  check (module_key = lower(module_key)),
  check (jsonb_typeof(steps) = 'array'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index approval_policies_scope_key_active_uq
  on public.approval_policies (tenant_id, module_key, entity_type, policy_key)
  where deleted_at is null;

create table public.approval_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  approval_policy_id uuid references public.approval_policies(id) on delete restrict,
  module_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  requested_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'returned', 'cancelled')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (jsonb_typeof(snapshot) = 'object'),
  check (deleted_at is null or deleted_by is not null)
);

create index approval_instances_entity_idx
  on public.approval_instances (tenant_id, module_key, entity_type, entity_id)
  where deleted_at is null;
create index approval_instances_status_idx
  on public.approval_instances (tenant_id, status, created_at desc)
  where deleted_at is null;

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  approval_instance_id uuid not null references public.approval_instances(id) on delete cascade,
  step_key text not null,
  step_order integer not null check (step_order > 0),
  mode public.approval_mode not null,
  assigned_user_id uuid references auth.users(id),
  delegated_from_user_id uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'returned', 'cancelled', 'reassigned')),
  due_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (step_key = lower(step_key)),
  check (deleted_at is null or deleted_by is not null)
);

create index approval_steps_instance_idx
  on public.approval_steps (tenant_id, approval_instance_id, step_order)
  where deleted_at is null;
create index approval_steps_assignee_idx
  on public.approval_steps (tenant_id, assigned_user_id, status)
  where deleted_at is null;

create table public.approval_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  approval_instance_id uuid not null references public.approval_instances(id) on delete cascade,
  approval_step_id uuid references public.approval_steps(id) on delete set null,
  decision public.approval_decision not null,
  actor_user_id uuid not null references auth.users(id),
  delegated_from_user_id uuid references auth.users(id),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (deleted_at is null)
);

create index approval_history_instance_idx
  on public.approval_history (tenant_id, approval_instance_id, created_at desc);

create table public.platform_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  document_type text not null,
  document_number text,
  status text not null,
  workflow_definition_id uuid references public.workflow_definitions(id) on delete restrict,
  approval_instance_id uuid references public.approval_instances(id) on delete set null,
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
  check (document_type = lower(document_type)),
  check (status = lower(status)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index platform_documents_number_active_uq
  on public.platform_documents (tenant_id, module_key, document_type, document_number)
  where document_number is not null and deleted_at is null;
create unique index platform_documents_entity_active_uq
  on public.platform_documents (tenant_id, module_key, entity_type, entity_id)
  where deleted_at is null;

create table public.platform_document_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  document_id uuid not null references public.platform_documents(id) on delete cascade,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
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

create index platform_document_comments_document_idx
  on public.platform_document_comments (tenant_id, document_id, created_at)
  where deleted_at is null;

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  template_key text not null,
  channel public.notification_channel not null,
  subject_template text,
  body_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (template_key = lower(template_key)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index notification_templates_scope_active_uq
  on public.notification_templates (tenant_id, template_key, channel)
  where deleted_at is null;

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  template_id uuid references public.notification_templates(id) on delete restrict,
  channel public.notification_channel not null,
  priority public.platform_priority not null default 'normal',
  recipient_user_id uuid references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  status public.platform_job_status not null default 'queued',
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  run_at timestamptz not null default now(),
  last_error text,
  idempotency_key text not null,
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

create unique index notification_outbox_idempotency_uq
  on public.notification_outbox (tenant_id, idempotency_key)
  where deleted_at is null;
create index notification_outbox_status_idx
  on public.notification_outbox (tenant_id, status, priority, run_at)
  where deleted_at is null;

create table public.file_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  attachment_kind public.attachment_kind not null,
  storage_path text not null,
  storage_version integer not null default 1 check (storage_version > 0),
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
  check (deleted_at is null or deleted_by is not null)
);

create unique index file_attachments_storage_path_active_uq
  on public.file_attachments (tenant_id, storage_path)
  where deleted_at is null;
create index file_attachments_owner_idx
  on public.file_attachments (tenant_id, module_key, entity_type, entity_id, created_at desc)
  where deleted_at is null;

create table public.searchable_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  entity_type text not null,
  display_name text not null,
  quick_search_fields jsonb not null,
  ranking_strategy text not null default 'exact-first' check (ranking_strategy in ('exact-first', 'weighted', 'recent-first')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (jsonb_typeof(quick_search_fields) = 'array'),
  check (deleted_at is null or deleted_by is not null)
);

create unique index searchable_entities_scope_active_uq
  on public.searchable_entities (tenant_id, module_key, entity_type)
  where deleted_at is null;

create table public.numbering_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  fiscal_year text,
  module_key text not null,
  document_type text not null,
  sequence_key text not null,
  prefix text not null,
  padding integer not null default 6 check (padding between 1 and 12),
  reset_rule public.numbering_reset_rule not null default 'fiscal-year',
  next_value bigint not null default 1 check (next_value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (module_key = lower(module_key)),
  check (document_type = lower(document_type)),
  check (sequence_key = lower(sequence_key)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index numbering_sequences_scope_active_uq
  on public.numbering_sequences (
    tenant_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(fiscal_year, ''),
    module_key,
    document_type,
    sequence_key
  )
  where deleted_at is null;

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  module_key text not null,
  export_key text not null,
  export_format public.export_format not null,
  requested_by uuid not null references auth.users(id),
  filters jsonb not null default '{}'::jsonb,
  status public.platform_job_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
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
  check (module_key = lower(module_key)),
  check (export_key = lower(export_key)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index export_jobs_idempotency_uq
  on public.export_jobs (tenant_id, idempotency_key)
  where deleted_at is null;
create index export_jobs_status_idx
  on public.export_jobs (tenant_id, status, created_at desc)
  where deleted_at is null;

create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  job_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.platform_job_status not null default 'queued',
  priority public.platform_priority not null default 'normal',
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  progress integer not null default 0 check (progress between 0 and 100),
  idempotency_key text not null,
  run_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  check (job_key = lower(job_key)),
  check (deleted_at is null or deleted_by is not null)
);

create unique index background_jobs_idempotency_uq
  on public.background_jobs (
    coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    idempotency_key
  )
  where deleted_at is null;
create index background_jobs_status_idx
  on public.background_jobs (status, priority, run_at)
  where deleted_at is null;

create or replace function public.enforce_platform_engine_reference_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_tenant_id uuid;
begin
  if tg_table_name = 'workflow_transition_history' and new.workflow_definition_id is not null then
    select tenant_id into parent_tenant_id from public.workflow_definitions where id = new.workflow_definition_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'workflow transition history tenant must match workflow definition tenant';
    end if;
  elsif tg_table_name = 'approval_instances' and new.approval_policy_id is not null then
    select tenant_id into parent_tenant_id from public.approval_policies where id = new.approval_policy_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'approval instance tenant must match approval policy tenant';
    end if;
  elsif tg_table_name = 'approval_steps' then
    select tenant_id into parent_tenant_id from public.approval_instances where id = new.approval_instance_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'approval step tenant must match approval instance tenant';
    end if;
  elsif tg_table_name = 'approval_history' then
    select tenant_id into parent_tenant_id from public.approval_instances where id = new.approval_instance_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'approval history tenant must match approval instance tenant';
    end if;
  elsif tg_table_name = 'platform_documents' then
    if new.workflow_definition_id is not null then
      select tenant_id into parent_tenant_id from public.workflow_definitions where id = new.workflow_definition_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document tenant must match workflow definition tenant';
      end if;
    end if;

    if new.approval_instance_id is not null then
      select tenant_id into parent_tenant_id from public.approval_instances where id = new.approval_instance_id;
      if parent_tenant_id is distinct from new.tenant_id then
        raise exception 'document tenant must match approval instance tenant';
      end if;
    end if;
  elsif tg_table_name = 'platform_document_comments' then
    select tenant_id into parent_tenant_id from public.platform_documents where id = new.document_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'document comment tenant must match document tenant';
    end if;
  elsif tg_table_name = 'notification_outbox' and new.template_id is not null then
    select tenant_id into parent_tenant_id from public.notification_templates where id = new.template_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'notification tenant must match template tenant';
    end if;
  elsif tg_table_name = 'export_jobs' and new.file_attachment_id is not null then
    select tenant_id into parent_tenant_id from public.file_attachments where id = new.file_attachment_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'export job tenant must match file attachment tenant';
    end if;
  elsif tg_table_name = 'numbering_sequences' and new.branch_id is not null then
    select tenant_id into parent_tenant_id from public.branches where id = new.branch_id;
    if parent_tenant_id is distinct from new.tenant_id then
      raise exception 'numbering sequence tenant must match branch tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger workflow_transition_history_enforce_scope before insert or update on public.workflow_transition_history for each row execute function public.enforce_platform_engine_reference_scope();
create trigger approval_instances_enforce_scope before insert or update on public.approval_instances for each row execute function public.enforce_platform_engine_reference_scope();
create trigger approval_steps_enforce_scope before insert or update on public.approval_steps for each row execute function public.enforce_platform_engine_reference_scope();
create trigger approval_history_enforce_scope before insert or update on public.approval_history for each row execute function public.enforce_platform_engine_reference_scope();
create trigger platform_documents_enforce_scope before insert or update on public.platform_documents for each row execute function public.enforce_platform_engine_reference_scope();
create trigger platform_document_comments_enforce_scope before insert or update on public.platform_document_comments for each row execute function public.enforce_platform_engine_reference_scope();
create trigger notification_outbox_enforce_scope before insert or update on public.notification_outbox for each row execute function public.enforce_platform_engine_reference_scope();
create trigger numbering_sequences_enforce_scope before insert or update on public.numbering_sequences for each row execute function public.enforce_platform_engine_reference_scope();
create trigger export_jobs_enforce_scope before insert or update on public.export_jobs for each row execute function public.enforce_platform_engine_reference_scope();

create trigger workflow_definitions_touch_updated_at before update on public.workflow_definitions for each row execute function public.touch_platform_row();
create trigger workflow_definitions_prevent_id_change before update on public.workflow_definitions for each row execute function public.prevent_id_change();
create trigger workflow_definitions_prevent_tenant_id_change before update on public.workflow_definitions for each row execute function public.prevent_tenant_id_change();
create trigger workflow_transition_history_touch_updated_at before update on public.workflow_transition_history for each row execute function public.touch_platform_row();
create trigger workflow_transition_history_prevent_id_change before update on public.workflow_transition_history for each row execute function public.prevent_id_change();
create trigger workflow_transition_history_prevent_tenant_id_change before update on public.workflow_transition_history for each row execute function public.prevent_tenant_id_change();
create trigger approval_policies_touch_updated_at before update on public.approval_policies for each row execute function public.touch_platform_row();
create trigger approval_policies_prevent_id_change before update on public.approval_policies for each row execute function public.prevent_id_change();
create trigger approval_policies_prevent_tenant_id_change before update on public.approval_policies for each row execute function public.prevent_tenant_id_change();
create trigger approval_instances_touch_updated_at before update on public.approval_instances for each row execute function public.touch_platform_row();
create trigger approval_instances_prevent_id_change before update on public.approval_instances for each row execute function public.prevent_id_change();
create trigger approval_instances_prevent_tenant_id_change before update on public.approval_instances for each row execute function public.prevent_tenant_id_change();
create trigger approval_steps_touch_updated_at before update on public.approval_steps for each row execute function public.touch_platform_row();
create trigger approval_steps_prevent_id_change before update on public.approval_steps for each row execute function public.prevent_id_change();
create trigger approval_steps_prevent_tenant_id_change before update on public.approval_steps for each row execute function public.prevent_tenant_id_change();
create trigger approval_history_touch_updated_at before update on public.approval_history for each row execute function public.touch_platform_row();
create trigger approval_history_prevent_id_change before update on public.approval_history for each row execute function public.prevent_id_change();
create trigger approval_history_prevent_tenant_id_change before update on public.approval_history for each row execute function public.prevent_tenant_id_change();
create trigger platform_documents_touch_updated_at before update on public.platform_documents for each row execute function public.touch_platform_row();
create trigger platform_documents_prevent_id_change before update on public.platform_documents for each row execute function public.prevent_id_change();
create trigger platform_documents_prevent_tenant_id_change before update on public.platform_documents for each row execute function public.prevent_tenant_id_change();
create trigger platform_document_comments_touch_updated_at before update on public.platform_document_comments for each row execute function public.touch_platform_row();
create trigger platform_document_comments_prevent_id_change before update on public.platform_document_comments for each row execute function public.prevent_id_change();
create trigger platform_document_comments_prevent_tenant_id_change before update on public.platform_document_comments for each row execute function public.prevent_tenant_id_change();
create trigger notification_templates_touch_updated_at before update on public.notification_templates for each row execute function public.touch_platform_row();
create trigger notification_templates_prevent_id_change before update on public.notification_templates for each row execute function public.prevent_id_change();
create trigger notification_templates_prevent_tenant_id_change before update on public.notification_templates for each row execute function public.prevent_tenant_id_change();
create trigger notification_outbox_touch_updated_at before update on public.notification_outbox for each row execute function public.touch_platform_row();
create trigger notification_outbox_prevent_id_change before update on public.notification_outbox for each row execute function public.prevent_id_change();
create trigger notification_outbox_prevent_tenant_id_change before update on public.notification_outbox for each row execute function public.prevent_tenant_id_change();
create trigger file_attachments_touch_updated_at before update on public.file_attachments for each row execute function public.touch_platform_row();
create trigger file_attachments_prevent_id_change before update on public.file_attachments for each row execute function public.prevent_id_change();
create trigger file_attachments_prevent_tenant_id_change before update on public.file_attachments for each row execute function public.prevent_tenant_id_change();
create trigger searchable_entities_touch_updated_at before update on public.searchable_entities for each row execute function public.touch_platform_row();
create trigger searchable_entities_prevent_id_change before update on public.searchable_entities for each row execute function public.prevent_id_change();
create trigger searchable_entities_prevent_tenant_id_change before update on public.searchable_entities for each row execute function public.prevent_tenant_id_change();
create trigger numbering_sequences_touch_updated_at before update on public.numbering_sequences for each row execute function public.touch_platform_row();
create trigger numbering_sequences_prevent_id_change before update on public.numbering_sequences for each row execute function public.prevent_id_change();
create trigger numbering_sequences_prevent_tenant_id_change before update on public.numbering_sequences for each row execute function public.prevent_tenant_id_change();
create trigger export_jobs_touch_updated_at before update on public.export_jobs for each row execute function public.touch_platform_row();
create trigger export_jobs_prevent_id_change before update on public.export_jobs for each row execute function public.prevent_id_change();
create trigger export_jobs_prevent_tenant_id_change before update on public.export_jobs for each row execute function public.prevent_tenant_id_change();
create trigger background_jobs_touch_updated_at before update on public.background_jobs for each row execute function public.touch_platform_row();
create trigger background_jobs_prevent_id_change before update on public.background_jobs for each row execute function public.prevent_id_change();

alter table public.workflow_definitions enable row level security;
alter table public.workflow_transition_history enable row level security;
alter table public.approval_policies enable row level security;
alter table public.approval_instances enable row level security;
alter table public.approval_steps enable row level security;
alter table public.approval_history enable row level security;
alter table public.platform_documents enable row level security;
alter table public.platform_document_comments enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.file_attachments enable row level security;
alter table public.searchable_entities enable row level security;
alter table public.numbering_sequences enable row level security;
alter table public.export_jobs enable row level security;
alter table public.background_jobs enable row level security;

alter table public.workflow_definitions force row level security;
alter table public.workflow_transition_history force row level security;
alter table public.approval_policies force row level security;
alter table public.approval_instances force row level security;
alter table public.approval_steps force row level security;
alter table public.approval_history force row level security;
alter table public.platform_documents force row level security;
alter table public.platform_document_comments force row level security;
alter table public.notification_templates force row level security;
alter table public.notification_outbox force row level security;
alter table public.file_attachments force row level security;
alter table public.searchable_entities force row level security;
alter table public.numbering_sequences force row level security;
alter table public.export_jobs force row level security;
alter table public.background_jobs force row level security;

create policy workflow_definitions_member_select on public.workflow_definitions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy workflow_definitions_member_insert on public.workflow_definitions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy workflow_definitions_member_update on public.workflow_definitions for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy workflow_transition_history_member_select on public.workflow_transition_history for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy workflow_transition_history_member_insert on public.workflow_transition_history for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy approval_policies_member_select on public.approval_policies for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_policies_member_insert on public.approval_policies for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_policies_member_update on public.approval_policies for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy approval_instances_member_select on public.approval_instances for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_instances_member_insert on public.approval_instances for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_instances_member_update on public.approval_instances for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy approval_steps_member_select on public.approval_steps for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_steps_member_insert on public.approval_steps for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_steps_member_update on public.approval_steps for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy approval_history_member_select on public.approval_history for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy approval_history_member_insert on public.approval_history for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy platform_documents_member_select on public.platform_documents for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy platform_documents_member_insert on public.platform_documents for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy platform_documents_member_update on public.platform_documents for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy platform_document_comments_member_select on public.platform_document_comments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy platform_document_comments_member_insert on public.platform_document_comments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy platform_document_comments_member_update on public.platform_document_comments for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy notification_templates_member_select on public.notification_templates for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy notification_templates_member_insert on public.notification_templates for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy notification_templates_member_update on public.notification_templates for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy notification_outbox_member_select on public.notification_outbox for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy notification_outbox_member_insert on public.notification_outbox for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy notification_outbox_member_update on public.notification_outbox for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy file_attachments_member_select on public.file_attachments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy file_attachments_member_insert on public.file_attachments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy file_attachments_member_update on public.file_attachments for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy searchable_entities_member_select on public.searchable_entities for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy searchable_entities_member_insert on public.searchable_entities for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy searchable_entities_member_update on public.searchable_entities for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy numbering_sequences_member_select on public.numbering_sequences for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy numbering_sequences_member_insert on public.numbering_sequences for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy numbering_sequences_member_update on public.numbering_sequences for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy export_jobs_member_select on public.export_jobs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy export_jobs_member_insert on public.export_jobs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));
create policy export_jobs_member_update on public.export_jobs for update to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id)) with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id));

create policy background_jobs_member_select on public.background_jobs for select to authenticated using (is_active = true and deleted_at is null and (tenant_id is null or public.is_tenant_member(tenant_id)));
create policy background_jobs_member_insert on public.background_jobs for insert to authenticated with check (is_active = true and deleted_at is null and (tenant_id is null or public.is_tenant_member(tenant_id)));
create policy background_jobs_member_update on public.background_jobs for update to authenticated using (is_active = true and deleted_at is null and (tenant_id is null or public.is_tenant_member(tenant_id))) with check (is_active = true and deleted_at is null and (tenant_id is null or public.is_tenant_member(tenant_id)));
