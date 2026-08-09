begin;

alter table public.deal_products
  add column if not exists custom_name text,
  add column if not exists custom_description text;

alter table public.deal_products
  alter column product_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.deal_products'::regclass
      and conname = 'deal_products_has_interest'
  ) then
    alter table public.deal_products
      add constraint deal_products_has_interest
      check (product_id is not null or nullif(trim(custom_name), '') is not null);
  end if;
end $$;

commit;
