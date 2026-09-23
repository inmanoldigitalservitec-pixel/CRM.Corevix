-- Let signed-in users read activity only for their own company.
create policy "activity_logs_select_company"
on public.activity_logs
for select
to authenticated
using (company_id = public.get_user_company_id((select auth.uid())));
