begin;

alter table public.lead_products
  alter column product_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.lead_products'::regclass
      and conname = 'lead_products_has_interest'
  ) then
    alter table public.lead_products
      add constraint lead_products_has_interest
      check (product_id is not null or nullif(trim(custom_name), '') is not null);
  end if;
end $$;

commit;
