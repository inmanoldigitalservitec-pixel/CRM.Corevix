-- Hotfix: seed missing Won/Lost stages for the current company so internal
-- pipeline actions can close deals without relying on non-existent columns.

insert into public.deal_stages (company_id, name, display_order, color)
select
  'e80e863c-5ace-443e-a75e-198d51403c62'::uuid,
  seeded.name,
  seeded.display_order,
  seeded.color
from (
  values
    ('Won', 6, '#16a34a'),
    ('Lost', 7, '#e11d48')
) as seeded(name, display_order, color)
where not exists (
  select 1
  from public.deal_stages existing
  where existing.company_id = 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid
    and lower(existing.name) = lower(seeded.name)
);
