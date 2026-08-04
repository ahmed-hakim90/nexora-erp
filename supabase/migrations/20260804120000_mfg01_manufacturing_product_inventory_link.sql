-- MFG-01: harden manufacturing product ↔ inventory product link
-- Additive only. Does not mutate inventory quantities.

alter table public.manufacturing_products
  add column if not exists inventory_product_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manufacturing_products_inventory_product_id_fkey'
  ) then
    alter table public.manufacturing_products
      add constraint manufacturing_products_inventory_product_id_fkey
      foreign key (inventory_product_id)
      references public.inventory_products(id)
      on delete restrict;
  end if;
exception
  when duplicate_object then
    null;
end $$;

create unique index if not exists manufacturing_products_inventory_product_uq
  on public.manufacturing_products (tenant_id, company_id, inventory_product_id)
  where inventory_product_id is not null
    and deleted_at is null
    and coalesce(is_active, true);

comment on column public.manufacturing_products.inventory_product_id is
  'Required for active manufacturing products. Canonical product identity remains inventory_products.';
