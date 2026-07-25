-- Store the Google Drive folder created for each client.

alter table public.clients
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text;
