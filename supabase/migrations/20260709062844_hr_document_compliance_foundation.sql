-- HR document compliance runtime: link contract types to required document sets.

alter table public.hr_contract_types
  add column if not exists required_document_set_id uuid
  references public.hr_required_document_sets(id) on delete restrict;

create index if not exists hr_contract_types_document_set_idx
  on public.hr_contract_types (required_document_set_id)
  where deleted_at is null and required_document_set_id is not null;
