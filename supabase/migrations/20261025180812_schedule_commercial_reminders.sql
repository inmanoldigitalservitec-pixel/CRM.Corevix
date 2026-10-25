-- Apply only after the core commercial follow-up migration. This explicitly
-- activates one-minute in-app reminder delivery when deployed. pg_cron runs
-- this as the migration owner (postgres); clients cannot execute dispatcher.
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_extension where extname='pg_cron') then
    raise exception 'pg_cron must be enabled before scheduling commercial reminders';
  end if;
  if to_regprocedure('public.commercial_dispatch_due_reminders(integer)') is null then
    raise exception 'Commercial reminder dispatcher is missing';
  end if;
  perform cron.schedule(
    'corevix-commercial-reminders',
    '* * * * *',
    'select public.commercial_dispatch_due_reminders(100)'
  );
end;
$$;
