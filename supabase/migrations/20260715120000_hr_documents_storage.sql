-- HR employee documents storage bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-documents',
  'hr-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy hr_documents_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'hr-documents' and (storage.foldername(name))[1] = auth.uid()::text or public.has_app_access((storage.foldername(name))[1]::uuid, 'hr'));

create policy hr_documents_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hr-documents');

create policy hr_documents_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'hr-documents');

create policy hr_documents_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'hr-documents');
