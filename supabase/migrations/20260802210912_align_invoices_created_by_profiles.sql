-- Align invoices.created_by with the rest of the CRM ownership model.
-- Older environments may still have invoices_created_by_fkey pointing to
-- auth.users(id), while the current finance RPCs write public.profiles.id.
alter table public.invoices
  drop constraint if exists invoices_created_by_fkey;

update public.invoices invoice
set created_by = profile.id
from public.profiles profile
where invoice.created_by = profile.user_id;

update public.invoices invoice
set created_by = null
where invoice.created_by is not null
  and not exists (
    select 1
    from public.profiles profile
    where profile.id = invoice.created_by
  );

alter table public.invoices
  add constraint invoices_created_by_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete set null;
