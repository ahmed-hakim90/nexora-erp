-- Nexora Platform Review Fix Gate.
-- Tightens early platform engine RLS policies that were tenant-member only.

insert into public.permissions (permission_key, label, description, risk_level)
values
  ('platform.workflow.view', 'View platform workflow definitions', 'Allows reading generic platform workflow definitions.', 'standard'),
  ('platform.workflow.manage', 'Manage platform workflow definitions', 'Allows creating and updating generic platform workflow definitions.', 'high'),
  ('platform.approval.view', 'View platform approval policies', 'Allows reading generic platform approval policies and history.', 'standard'),
  ('platform.approval.manage', 'Manage platform approval policies', 'Allows creating and updating generic platform approval policies.', 'high'),
  ('platform.document.view', 'View platform documents', 'Allows reading generic platform document envelopes.', 'standard'),
  ('platform.document.manage', 'Manage platform documents', 'Allows creating and updating generic platform document envelopes.', 'high'),
  ('platform.notification.view', 'View platform notifications', 'Allows reading platform notification templates and outbox records.', 'standard'),
  ('platform.notification.manage', 'Manage platform notifications', 'Allows managing platform notification templates.', 'high'),
  ('platform.notification.dispatch', 'Dispatch platform notifications', 'Allows enqueueing and updating platform notification delivery records.', 'high'),
  ('platform.file.view', 'View platform file metadata', 'Allows reading platform file attachment metadata.', 'standard'),
  ('platform.file.manage', 'Manage platform file metadata', 'Allows creating and updating platform file attachment metadata.', 'high'),
  ('platform.search.view', 'View platform search metadata', 'Allows reading platform searchable entity metadata.', 'standard'),
  ('platform.search.manage', 'Manage platform search metadata', 'Allows creating and updating platform searchable entity metadata.', 'high'),
  ('platform.numbering.view', 'View platform numbering sequences', 'Allows reading platform numbering sequences.', 'standard'),
  ('platform.numbering.manage', 'Manage platform numbering sequences', 'Allows creating and updating platform numbering sequences.', 'critical'),
  ('platform.export.view', 'View platform export jobs', 'Allows reading platform export job metadata.', 'standard'),
  ('platform.export.manage', 'Manage platform export jobs', 'Allows creating and updating platform export jobs.', 'high'),
  ('platform.background-job.view', 'View platform background jobs', 'Allows reading platform background job metadata.', 'standard'),
  ('platform.background-job.manage', 'Manage platform background jobs', 'Allows creating and updating platform background jobs.', 'high')
on conflict do nothing;

drop policy if exists workflow_definitions_member_select on public.workflow_definitions;
drop policy if exists workflow_definitions_member_insert on public.workflow_definitions;
drop policy if exists workflow_definitions_member_update on public.workflow_definitions;
create policy workflow_definitions_permission_select on public.workflow_definitions for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.workflow.view', tenant_id) or public.has_permission('platform.workflow.manage', tenant_id)));
create policy workflow_definitions_permission_insert on public.workflow_definitions for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.workflow.manage', tenant_id));
create policy workflow_definitions_permission_update on public.workflow_definitions for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.workflow.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.workflow.manage', tenant_id));

drop policy if exists workflow_transition_history_member_select on public.workflow_transition_history;
drop policy if exists workflow_transition_history_member_insert on public.workflow_transition_history;
create policy workflow_transition_history_permission_select on public.workflow_transition_history for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.workflow.view', tenant_id) or public.has_permission('platform.workflow.manage', tenant_id)));
create policy workflow_transition_history_permission_insert on public.workflow_transition_history for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.workflow.manage', tenant_id));

drop policy if exists approval_policies_member_select on public.approval_policies;
drop policy if exists approval_policies_member_insert on public.approval_policies;
drop policy if exists approval_policies_member_update on public.approval_policies;
create policy approval_policies_permission_select on public.approval_policies for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.approval.view', tenant_id) or public.has_permission('platform.approval.manage', tenant_id)));
create policy approval_policies_permission_insert on public.approval_policies for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.approval.manage', tenant_id));
create policy approval_policies_permission_update on public.approval_policies for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id));

drop policy if exists approval_instances_member_select on public.approval_instances;
drop policy if exists approval_instances_member_insert on public.approval_instances;
drop policy if exists approval_instances_member_update on public.approval_instances;
create policy approval_instances_permission_select on public.approval_instances for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.approval.view', tenant_id) or public.has_permission('platform.approval.manage', tenant_id)));
create policy approval_instances_permission_insert on public.approval_instances for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.approval.manage', tenant_id));
create policy approval_instances_permission_update on public.approval_instances for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id));

drop policy if exists approval_steps_member_select on public.approval_steps;
drop policy if exists approval_steps_member_insert on public.approval_steps;
drop policy if exists approval_steps_member_update on public.approval_steps;
create policy approval_steps_permission_select on public.approval_steps for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.approval.view', tenant_id) or public.has_permission('platform.approval.manage', tenant_id)));
create policy approval_steps_permission_insert on public.approval_steps for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.approval.manage', tenant_id));
create policy approval_steps_permission_update on public.approval_steps for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.approval.manage', tenant_id));

drop policy if exists approval_history_member_select on public.approval_history;
drop policy if exists approval_history_member_insert on public.approval_history;
create policy approval_history_permission_select on public.approval_history for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.approval.view', tenant_id) or public.has_permission('platform.approval.manage', tenant_id)));
create policy approval_history_permission_insert on public.approval_history for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.approval.manage', tenant_id));

drop policy if exists platform_documents_member_select on public.platform_documents;
drop policy if exists platform_documents_member_insert on public.platform_documents;
drop policy if exists platform_documents_member_update on public.platform_documents;
create policy platform_documents_permission_select on public.platform_documents for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.document.view', tenant_id) or public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.view', tenant_id)));
create policy platform_documents_permission_insert on public.platform_documents for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.create', tenant_id)));
create policy platform_documents_permission_update on public.platform_documents for update to authenticated using (is_active = true and deleted_at is null and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.update', tenant_id))) with check (is_active = true and deleted_at is null and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.update', tenant_id)));

drop policy if exists platform_document_comments_member_select on public.platform_document_comments;
drop policy if exists platform_document_comments_member_insert on public.platform_document_comments;
drop policy if exists platform_document_comments_member_update on public.platform_document_comments;
create policy platform_document_comments_permission_select on public.platform_document_comments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.document.view', tenant_id) or public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.view', tenant_id)));
create policy platform_document_comments_permission_insert on public.platform_document_comments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.comment', tenant_id)));
create policy platform_document_comments_permission_update on public.platform_document_comments for update to authenticated using (is_active = true and deleted_at is null and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.comment', tenant_id))) with check (is_active = true and deleted_at is null and (public.has_permission('platform.document.manage', tenant_id) or public.has_permission('documents.comment', tenant_id)));

drop policy if exists notification_templates_member_select on public.notification_templates;
drop policy if exists notification_templates_member_insert on public.notification_templates;
drop policy if exists notification_templates_member_update on public.notification_templates;
create policy notification_templates_permission_select on public.notification_templates for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.notification.view', tenant_id) or public.has_permission('platform.notification.manage', tenant_id)));
create policy notification_templates_permission_insert on public.notification_templates for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.notification.manage', tenant_id));
create policy notification_templates_permission_update on public.notification_templates for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.notification.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.notification.manage', tenant_id));

drop policy if exists notification_outbox_member_select on public.notification_outbox;
drop policy if exists notification_outbox_member_insert on public.notification_outbox;
drop policy if exists notification_outbox_member_update on public.notification_outbox;
create policy notification_outbox_permission_select on public.notification_outbox for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.notification.view', tenant_id) or public.has_permission('platform.notification.dispatch', tenant_id)));
create policy notification_outbox_permission_insert on public.notification_outbox for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.notification.dispatch', tenant_id));
create policy notification_outbox_permission_update on public.notification_outbox for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.notification.dispatch', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.notification.dispatch', tenant_id));

drop policy if exists file_attachments_member_select on public.file_attachments;
drop policy if exists file_attachments_member_insert on public.file_attachments;
drop policy if exists file_attachments_member_update on public.file_attachments;
create policy file_attachments_permission_select on public.file_attachments for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.file.view', tenant_id) or public.has_permission('platform.file.manage', tenant_id) or public.has_permission('documents.view', tenant_id) or public.has_permission('party.parties.view', tenant_id)));
create policy file_attachments_permission_insert on public.file_attachments for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.file.manage', tenant_id) or public.has_permission('documents.attach', tenant_id) or public.has_permission('party.attachments.manage', tenant_id)));
create policy file_attachments_permission_update on public.file_attachments for update to authenticated using (is_active = true and deleted_at is null and (public.has_permission('platform.file.manage', tenant_id) or public.has_permission('documents.attach', tenant_id) or public.has_permission('party.attachments.manage', tenant_id))) with check (is_active = true and deleted_at is null and (public.has_permission('platform.file.manage', tenant_id) or public.has_permission('documents.attach', tenant_id) or public.has_permission('party.attachments.manage', tenant_id)));

drop policy if exists searchable_entities_member_select on public.searchable_entities;
drop policy if exists searchable_entities_member_insert on public.searchable_entities;
drop policy if exists searchable_entities_member_update on public.searchable_entities;
create policy searchable_entities_permission_select on public.searchable_entities for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.search.view', tenant_id) or public.has_permission('platform.search.manage', tenant_id)));
create policy searchable_entities_permission_insert on public.searchable_entities for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and public.has_permission('platform.search.manage', tenant_id));
create policy searchable_entities_permission_update on public.searchable_entities for update to authenticated using (is_active = true and deleted_at is null and public.has_permission('platform.search.manage', tenant_id)) with check (is_active = true and deleted_at is null and public.has_permission('platform.search.manage', tenant_id));

drop policy if exists numbering_sequences_member_select on public.numbering_sequences;
drop policy if exists numbering_sequences_member_insert on public.numbering_sequences;
drop policy if exists numbering_sequences_member_update on public.numbering_sequences;
create policy numbering_sequences_permission_select on public.numbering_sequences for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.numbering.view', tenant_id) or public.has_permission('platform.numbering.manage', tenant_id) or public.has_permission('financial.numbering.view', tenant_id)));
create policy numbering_sequences_permission_insert on public.numbering_sequences for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.numbering.manage', tenant_id) or public.has_permission('financial.numbering.manage', tenant_id)));
create policy numbering_sequences_permission_update on public.numbering_sequences for update to authenticated using (is_active = true and deleted_at is null and (public.has_permission('platform.numbering.manage', tenant_id) or public.has_permission('financial.numbering.manage', tenant_id) or public.has_permission('documents.create', tenant_id) or public.has_permission('documents.update', tenant_id))) with check (is_active = true and deleted_at is null and (public.has_permission('platform.numbering.manage', tenant_id) or public.has_permission('financial.numbering.manage', tenant_id) or public.has_permission('documents.create', tenant_id) or public.has_permission('documents.update', tenant_id)));

drop policy if exists export_jobs_member_select on public.export_jobs;
drop policy if exists export_jobs_member_insert on public.export_jobs;
drop policy if exists export_jobs_member_update on public.export_jobs;
create policy export_jobs_permission_select on public.export_jobs for select to authenticated using (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.export.view', tenant_id) or public.has_permission('platform.export.manage', tenant_id) or public.has_permission('documents.export', tenant_id)));
create policy export_jobs_permission_insert on public.export_jobs for insert to authenticated with check (is_active = true and deleted_at is null and public.is_tenant_member(tenant_id) and (public.has_permission('platform.export.manage', tenant_id) or public.has_permission('documents.export', tenant_id)));
create policy export_jobs_permission_update on public.export_jobs for update to authenticated using (is_active = true and deleted_at is null and (public.has_permission('platform.export.manage', tenant_id) or public.has_permission('documents.export', tenant_id))) with check (is_active = true and deleted_at is null and (public.has_permission('platform.export.manage', tenant_id) or public.has_permission('documents.export', tenant_id)));

drop policy if exists background_jobs_member_select on public.background_jobs;
drop policy if exists background_jobs_member_insert on public.background_jobs;
drop policy if exists background_jobs_member_update on public.background_jobs;
create policy background_jobs_permission_select on public.background_jobs for select to authenticated using (is_active = true and deleted_at is null and (tenant_id is null or (public.is_tenant_member(tenant_id) and (public.has_permission('platform.background-job.view', tenant_id) or public.has_permission('platform.background-job.manage', tenant_id)))));
create policy background_jobs_permission_insert on public.background_jobs for insert to authenticated with check (is_active = true and deleted_at is null and (tenant_id is null or (public.is_tenant_member(tenant_id) and public.has_permission('platform.background-job.manage', tenant_id))));
create policy background_jobs_permission_update on public.background_jobs for update to authenticated using (is_active = true and deleted_at is null and (tenant_id is null or public.has_permission('platform.background-job.manage', tenant_id))) with check (is_active = true and deleted_at is null and (tenant_id is null or public.has_permission('platform.background-job.manage', tenant_id)));
