-- Corevix CRM — Finance Flow
-- Estimate -> Invoice -> Payment -> Credit Note -> Revenue reporting.

alter table public.invoices
  add column if not exists estimate_id uuid references public.estimates(id) on delete set null;

create index if not exists invoices_estimate_id_idx on public.invoices(estimate_id);

create or replace view public.invoice_finance_summary as
select
  i.id as invoice_id,
  i.company_id,
  i.client_id,
  i.number,
  i.status,
  i.total,
  i.date_issued,
  i.due_date,
  coalesce(p.paid_amount, 0)::numeric(14,2) as paid_amount,
  coalesce(c.credit_amount, 0)::numeric(14,2) as credit_amount,
  greatest(coalesce(i.total, 0) - coalesce(p.paid_amount, 0) - coalesce(c.credit_amount, 0), 0)::numeric(14,2) as balance_due,
  case
    when coalesce(i.total, 0) <= 0 then i.status
    when coalesce(p.paid_amount, 0) + coalesce(c.credit_amount, 0) >= coalesce(i.total, 0) then 'Paid'
    when coalesce(p.paid_amount, 0) + coalesce(c.credit_amount, 0) > 0 then 'Partial'
    when i.due_date < current_date and i.status not in ('Paid','Cancelled') then 'Overdue'
    else i.status
  end as finance_status
from public.invoices i
left join (
  select invoice_id, company_id, sum(amount) as paid_amount
  from public.payments
  where invoice_id is not null and status = 'Completed'
  group by invoice_id, company_id
) p on p.invoice_id = i.id and p.company_id = i.company_id
left join (
  select invoice_id, company_id, sum(amount) as credit_amount
  from public.credit_notes
  where invoice_id is not null and status in ('Issued','Applied')
  group by invoice_id, company_id
) c on c.invoice_id = i.id and c.company_id = i.company_id;

create or replace function public.refresh_invoice_finance_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_allowed_partial boolean := false;
begin
  if p_invoice_id is null then
    return;
  end if;

  select finance_status into v_status
  from public.invoice_finance_summary
  where invoice_id = p_invoice_id;

  if v_status is null then
    return;
  end if;

  select exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'invoices'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%Partial%'
  ) into v_allowed_partial;

  if v_status = 'Partial' and not v_allowed_partial then
    v_status := 'Sent';
  end if;

  update public.invoices
  set status = v_status,
      paid_at = case when v_status = 'Paid' then coalesce(paid_at, now()) else paid_at end
  where id = p_invoice_id
    and status not in ('Cancelled')
    and status is distinct from v_status;
end;
$$;

create or replace function public.finance_flow_refresh_invoice_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);
  perform public.refresh_invoice_finance_status(v_invoice_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists payments_refresh_invoice_finance on public.payments;
create trigger payments_refresh_invoice_finance
after insert or update or delete on public.payments
for each row execute function public.finance_flow_refresh_invoice_trigger();

drop trigger if exists credit_notes_refresh_invoice_finance on public.credit_notes;
create trigger credit_notes_refresh_invoice_finance
after insert or update or delete on public.credit_notes
for each row execute function public.finance_flow_refresh_invoice_trigger();

create or replace function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns table(invoice_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  existing_id uuid;
  new_id uuid;
  current_profile public.profiles%rowtype;
begin
  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null then
    raise exception 'No active profile found';
  end if;

  select * into e
  from public.estimates
  where id = p_estimate_id
    and company_id = current_profile.company_id;

  if e.id is null then
    raise exception 'Estimate not found';
  end if;

  select id into existing_id
  from public.invoices
  where estimate_id = e.id
    and company_id = e.company_id
  limit 1;

  if existing_id is not null then
    invoice_id := existing_id;
    created := false;
    return next;
    return;
  end if;

  insert into public.invoices (
    company_id,
    number,
    client_id,
    subtotal,
    tax,
    discount,
    total,
    status,
    date_issued,
    due_date,
    notes,
    created_by,
    estimate_id
  ) values (
    e.company_id,
    'INV-EST-' || e.number::text,
    e.client_id,
    coalesce(e.subtotal, 0),
    coalesce(e.tax, 0),
    0,
    coalesce(e.total, 0),
    'Draft',
    current_date,
    current_date + interval '30 days',
    e.notes,
    current_profile.user_id,
    e.id
  ) returning id into new_id;

  update public.estimates
  set status = 'Converted'
  where id = e.id;

  invoice_id := new_id;
  created := true;
  return next;
end;
$$;
