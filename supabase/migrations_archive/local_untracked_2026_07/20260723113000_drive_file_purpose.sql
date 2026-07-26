alter table public.drive_files
  add column if not exists file_purpose text not null default 'deliverable';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drive_files_file_purpose_check'
      and conrelid = 'public.drive_files'::regclass
  ) then
    alter table public.drive_files
      add constraint drive_files_file_purpose_check
      check (file_purpose in ('resource', 'deliverable'));
  end if;
end $$;

create index if not exists idx_drive_files_company_linked_purpose
  on public.drive_files(company_id, linked_type, linked_id, file_purpose, created_at desc);
