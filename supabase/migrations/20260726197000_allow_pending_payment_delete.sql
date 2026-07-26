drop policy if exists "payments pending delete" on public.payments;

create policy "payments pending delete"
on public.payments
for delete
to authenticated
using (
  company_id = public.get_user_company_id((select auth.uid()))
  and status = 'Pending'
  and public.has_permission((select auth.uid()), 'payments.create')
);
