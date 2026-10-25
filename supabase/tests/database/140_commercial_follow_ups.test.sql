begin;
set local search_path = "$user", public, extensions;
create extension if not exists pgtap;
select plan(20);

select has_table('public', 'commercial_follow_ups', 'commercial follow-ups table exists');
select has_table('public', 'commercial_interactions', 'commercial interactions table exists');
select has_table('public', 'commercial_follow_up_events', 'commercial audit events table exists');
select has_table('public', 'commercial_reminder_outbox', 'reminder outbox exists');
select has_table('public', 'commercial_action_idempotency', 'idempotency ledger exists');
select has_view('public', 'commercial_timeline', 'commercial timeline view exists');
select has_function('public', 'commercial_follow_up_action', array['text','jsonb','uuid'], 'atomic action RPC exists');
select has_function('public', 'commercial_follow_up_metrics', array[]::text[], 'server-side metrics RPC exists');
select has_function('public', 'commercial_dispatch_due_reminders', array['integer'], 'reminder dispatcher exists');

select is((select relrowsecurity from pg_class where oid='public.commercial_follow_ups'::regclass), true, 'follow-ups enforce RLS');
select is((select relrowsecurity from pg_class where oid='public.commercial_interactions'::regclass), true, 'interactions enforce RLS');
select is((select relrowsecurity from pg_class where oid='public.commercial_follow_up_events'::regclass), true, 'audit events enforce RLS');
select is((select relrowsecurity from pg_class where oid='public.commercial_reminder_outbox'::regclass), true, 'outbox enforces RLS');
select is((select relrowsecurity from pg_class where oid='public.commercial_action_idempotency'::regclass), true, 'idempotency ledger enforces RLS');

select ok(not has_table_privilege('authenticated', 'public.commercial_follow_ups', 'INSERT'), 'clients cannot write follow-ups directly');
select ok(not has_table_privilege('authenticated', 'public.commercial_interactions', 'INSERT'), 'clients cannot write interactions directly');
select ok(not has_table_privilege('authenticated', 'public.commercial_reminder_outbox', 'SELECT'), 'clients cannot read reminder outbox');
select ok(has_function_privilege('authenticated', 'public.commercial_follow_up_action(text,jsonb,uuid)', 'EXECUTE'), 'authenticated users can invoke guarded action RPC');
select ok(not has_function_privilege('authenticated', 'public.commercial_dispatch_due_reminders(integer)', 'EXECUTE'), 'authenticated users cannot dispatch reminders');
select ok(exists(select 1 from cron.job where jobname='corevix-commercial-reminders'), 'minute scheduler is installed');

select * from finish();
rollback;
