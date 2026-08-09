-- Keep product associations when a proposal is converted into an invoice.
-- Public proposal approval inserts invoice lines from proposal_items, so the
-- line must inherit the source product even when the RPC only copies pricing.

create or replace function public.sync_invoice_item_product_from_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_id uuid;
begin
  if new.product_id is not null then
    return new;
  end if;

  select i.proposal_id
    into v_proposal_id
  from public.invoices i
  where i.id = new.invoice_id;

  if v_proposal_id is null then
    return new;
  end if;

  select pi.product_id
    into new.product_id
  from public.proposal_items pi
  where pi.proposal_id = v_proposal_id
    and pi.company_id = new.company_id
    and pi.sort_order = new.sort_order
    and pi.product_id is not null
  order by pi.created_at asc
  limit 1;

  return new;
end;
$$;

drop trigger if exists invoice_items_sync_proposal_product
on public.invoice_items;

create trigger invoice_items_sync_proposal_product
before insert on public.invoice_items
for each row
execute function public.sync_invoice_item_product_from_proposal();

update public.invoice_items ii
set product_id = (
  select pi.product_id
  from public.invoices i
  join public.proposal_items pi
    on pi.proposal_id = i.proposal_id
   and pi.company_id = i.company_id
   and pi.sort_order = ii.sort_order
  where i.id = ii.invoice_id
    and i.proposal_id is not null
    and pi.product_id is not null
  order by pi.created_at asc
  limit 1
)
where ii.product_id is null
  and exists (
    select 1
    from public.invoices i
    join public.proposal_items pi
      on pi.proposal_id = i.proposal_id
     and pi.company_id = i.company_id
     and pi.sort_order = ii.sort_order
    where i.id = ii.invoice_id
      and i.proposal_id is not null
      and pi.product_id is not null
  );
