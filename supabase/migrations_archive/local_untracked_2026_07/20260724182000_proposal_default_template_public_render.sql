-- Normaliza templates de propuestas, crea una plantilla predeterminada por compañía
-- y expone los campos de template en la vista pública de propuestas.

create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade
);

alter table public.proposal_templates
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists content_html text not null default '',
  add column if not exists content_json jsonb not null default '{}'::jsonb,
  add column if not exists is_default boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'proposal_templates'
      and column_name = 'name'
  ) then
    execute 'update public.proposal_templates set title = coalesce(nullif(title, ''''), nullif(name, ''''), ''Template sin título'') where title is null or title = ''''';
    execute 'update public.proposal_templates set name = coalesce(nullif(name, ''''), nullif(title, ''''), ''Template sin título'') where name is null or name = ''''';
    execute 'alter table public.proposal_templates alter column name set default ''Template sin título''';
  else
    update public.proposal_templates
    set title = coalesce(nullif(title, ''), 'Template sin título')
    where title is null or title = '';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'proposal_templates'
      and column_name = 'slug'
  ) then
    execute $sql$
      update public.proposal_templates
      set slug = lower(
        regexp_replace(
          coalesce(nullif(title, ''), nullif(name, ''), 'template') || '-' || left(id::text, 8),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        )
      )
      where slug is null or slug = ''
    $sql$;
    execute 'alter table public.proposal_templates alter column slug set default (''template-'' || replace((gen_random_uuid())::text, ''-'', ''''))';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'proposal_templates'
      and column_name = 'template_key'
  ) then
    execute 'update public.proposal_templates set template_key = coalesce(nullif(template_key, ''''), ''custom_html'') where template_key is null or template_key = ''''';
    execute 'alter table public.proposal_templates alter column template_key set default ''custom_html''';
  end if;
end $$;

alter table public.proposal_templates
  alter column title set default 'Template sin título',
  alter column title set not null;

alter table public.proposals
  add column if not exists template_id uuid,
  add column if not exists template_key text;

create index if not exists proposal_templates_company_active_idx
  on public.proposal_templates(company_id, is_active, updated_at desc);

create index if not exists proposals_template_id_idx
  on public.proposals(template_id);

create or replace function public.set_proposal_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_proposal_template_updated_at on public.proposal_templates;
create trigger set_proposal_template_updated_at
before update on public.proposal_templates
for each row execute function public.set_proposal_workspace_updated_at();

alter table public.proposal_templates enable row level security;

drop policy if exists proposal_templates_company_select on public.proposal_templates;
create policy proposal_templates_company_select
on public.proposal_templates
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_insert on public.proposal_templates;
create policy proposal_templates_company_insert
on public.proposal_templates
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_update on public.proposal_templates;
create policy proposal_templates_company_update
on public.proposal_templates
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_delete on public.proposal_templates;
create policy proposal_templates_company_delete
on public.proposal_templates
for delete
using (company_id = public.get_current_company_id());

with default_template as (
  select $template$
<section style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
  <header style="display:flex; justify-content:space-between; gap:32px; border-bottom:1px solid #e2e8f0; padding-bottom:28px; margin-bottom:32px;">
    <div>
      <div style="font-size:28px; font-weight:800; color:#1d62f9;">Corevix</div>
      <div style="margin-top:6px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:.14em;">CRM & Automatización</div>
      <div style="margin-top:28px; font-size:13px; line-height:1.55;">
        <strong>Corevix Agency</strong><br />
        Santo Domingo, República Dominicana<br />
        corevix.rd@gmail.com
      </div>
    </div>
    <div style="text-align:right; font-size:13px; line-height:1.55;">
      <div style="font-size:34px; line-height:1; font-weight:800; color:#1d62f9; text-transform:uppercase;">Propuesta</div>
      <div style="margin-top:18px; color:#64748b;">{proposal_number}</div>
      <div style="margin-top:24px; text-transform:uppercase; color:#64748b; font-size:12px; letter-spacing:.08em;">Para</div>
      <strong>{client_name}</strong><br />
      {client_address}<br />
      {client_phone}<br />
      {client_email}
    </div>
  </header>

  <section style="margin-bottom:28px;">
    <h1>{proposal_title}</h1>
    <p style="color:#475569;">{proposal_description}</p>
  </section>

  {proposal_items}

  <section style="display:grid; grid-template-columns:1fr 280px; gap:32px; margin-top:28px;">
    <div style="font-size:13px; line-height:1.65; color:#475569;">
      <strong style="color:#0f172a;">Resumen</strong>
      <p>{proposal_content}</p>
    </div>
    <div style="font-size:14px;">
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:10px 0;">
        <strong>Subtotal</strong><strong>{proposal_subtotal}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding:10px 0;">
        <span>Impuestos</span><strong>{proposal_tax_total}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:14px; background:#0f172a; color:white; padding:14px 16px;">
        <strong>Total</strong><strong>{proposal_total}</strong>
      </div>
    </div>
  </section>

  <section style="margin-top:38px; padding-top:24px; border-top:1px solid #e2e8f0; font-size:13px; line-height:1.6; color:#475569;">
    <strong style="color:#0f172a;">Condiciones</strong>
    <p>Esta propuesta está sujeta a validación final de alcance, disponibilidad del equipo y aprobación del cliente.</p>
    <div style="margin-top:42px;">Firma autorizada ______________________________________</div>
  </section>
</section>
$template$::text as content_html
)
insert into public.proposal_templates (
  company_id,
  title,
  description,
  content_html,
  content_json,
  is_default,
  is_active
)
select
  c.id,
  'Propuesta estándar Corevix',
  'Plantilla predeterminada para propuestas públicas tipo documento.',
  dt.content_html,
  jsonb_build_object('editor', 'default_html', 'version', 1),
  true,
  true
from public.companies c
cross join default_template dt
where not exists (
  select 1
  from public.proposal_templates t
  where t.company_id = c.id
    and t.is_default = true
    and t.is_active = true
    and t.archived_at is null
);

with defaults as (
  select distinct on (company_id)
    id,
    company_id,
    content_html
  from public.proposal_templates
  where is_default = true
    and is_active = true
    and archived_at is null
  order by company_id, updated_at desc
)
update public.proposals p
set
  template_id = d.id,
  template_key = 'custom_html',
  content = d.content_html,
  updated_at = now()
from defaults d
where p.company_id = d.company_id
  and p.template_id is null
  and coalesce(p.template_key, '') = ''
  and coalesce(nullif(p.content, ''), '') = '';

create or replace function public.get_proposal_public(
  p_proposal_public_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  if p_proposal_public_token is null or btrim(p_proposal_public_token) = '' then
    return jsonb_build_object('proposal', null, 'items', '[]'::jsonb);
  end if;

  select p.*
    into v_proposal
  from public.proposals p
  where p.public_token = p_proposal_public_token
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('proposal', null, 'items', '[]'::jsonb);
  end if;

  update public.proposals p
  set
    viewed_at = coalesce(p.viewed_at, now()),
    status = case when p.status = 'Sent' then 'Viewed' else p.status end,
    updated_at = now()
  where p.id = v_proposal.id;

  if v_proposal.client_id is not null then
    select coalesce(to_jsonb(c), '{}'::jsonb)
      into v_client
    from public.clients c
    where c.id = v_proposal.client_id
      and c.company_id = v_proposal.company_id
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pi.id,
        'product_id', pi.product_id,
        'item_name', pi.item_name,
        'description', pi.description,
        'quantity', pi.quantity,
        'unit_type', pi.unit_type,
        'rate', pi.rate,
        'tax_rate', pi.tax_rate,
        'tax_id', pi.tax_id,
        'tax_name', pi.tax_name,
        'tax_amount', pi.tax_amount,
        'is_optional', pi.is_optional,
        'sort_order', pi.sort_order,
        'amount', pi.amount,
        'document_currency', pi.document_currency,
        'original_currency', pi.original_currency,
        'original_rate', pi.original_rate,
        'converted_rate', pi.converted_rate,
        'exchange_rate', pi.exchange_rate,
        'exchange_rate_source', pi.exchange_rate_source,
        'exchange_rate_updated_at', pi.exchange_rate_updated_at
      )
      order by pi.sort_order asc, pi.created_at asc
    ),
    '[]'::jsonb
  )
    into v_items
  from public.proposal_items pi
  where pi.proposal_id = v_proposal.id
    and pi.company_id = v_proposal.company_id;

  return jsonb_build_object(
    'proposal',
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', v_proposal.id,
        'company_id', v_proposal.company_id,
        'title', v_proposal.title,
        'number', v_proposal.number,
        'status', case when v_proposal.status = 'Sent' then 'Viewed' else v_proposal.status end,
        'amount', v_proposal.amount,
        'currency', v_proposal.currency,
        'base_currency', v_proposal.base_currency,
        'exchange_rate', v_proposal.exchange_rate,
        'exchange_rate_source', v_proposal.exchange_rate_source,
        'exchange_rate_updated_at', v_proposal.exchange_rate_updated_at,
        'subtotal', v_proposal.subtotal,
        'tax_total', v_proposal.tax_total,
        'total', v_proposal.total,
        'subtotal_base', v_proposal.subtotal_base,
        'tax_base', v_proposal.tax_base,
        'total_base', v_proposal.total_base,
        'template_id', v_proposal.template_id,
        'template_key', v_proposal.template_key,
        'content', v_proposal.content,
        'description', v_proposal.description,
        'notes', v_proposal.notes,
        'proposal_date', v_proposal.proposal_date,
        'proposal_data', coalesce(v_proposal.proposal_data, '{}'::jsonb),
        'valid_until', v_proposal.valid_until,
        'approved_at', v_proposal.approved_at,
        'public_token', v_proposal.public_token,
        'recipient_name', v_proposal.recipient_name,
        'recipient_email', v_proposal.recipient_email,
        'recipient_phone', v_proposal.recipient_phone,
        'recipient_address', v_proposal.recipient_address,
        'recipient_city', v_proposal.recipient_city,
        'recipient_state', v_proposal.recipient_state,
        'recipient_country', v_proposal.recipient_country,
        'recipient_zip_code', v_proposal.recipient_zip_code,
        'client_id', v_proposal.client_id,
        'client', v_client,
        'created_at', v_proposal.created_at,
        'updated_at', now()
      )
    ),
    'items',
    v_items
  );
end;
$$;

revoke all on function public.get_proposal_public(text) from public;
grant execute on function public.get_proposal_public(text) to anon, authenticated;

notify pgrst, 'reload schema';
