-- Add idempotency and external-provider identifiers to payments.

alter table public.payments
  add column if not exists provider text,
  add column if not exists external_payment_id text,
  add column if not exists idempotency_key text;

comment on column public.payments.provider
is 'Normalized payment provider, for example manual, stripe, paypal or bank.';

comment on column public.payments.external_payment_id
is 'Unique payment identifier assigned by an external provider.';

comment on column public.payments.idempotency_key
is 'Request-level idempotency key used to safely retry payment registration.';

-- Empty identifiers are not meaningful.
alter table public.payments
  drop constraint if exists payments_provider_not_blank;

alter table public.payments
  add constraint payments_provider_not_blank
  check (
    provider is null
    or btrim(provider) <> ''
  );

alter table public.payments
  drop constraint if exists payments_external_payment_id_not_blank;

alter table public.payments
  add constraint payments_external_payment_id_not_blank
  check (
    external_payment_id is null
    or btrim(external_payment_id) <> ''
  );

alter table public.payments
  drop constraint if exists payments_idempotency_key_not_blank;

alter table public.payments
  add constraint payments_idempotency_key_not_blank
  check (
    idempotency_key is null
    or btrim(idempotency_key) <> ''
  );

-- An external identifier must always be accompanied by its provider.
alter table public.payments
  drop constraint if exists payments_provider_external_pair;

alter table public.payments
  add constraint payments_provider_external_pair
  check (
    (
      provider is null
      and external_payment_id is null
    )
    or
    (
      provider is not null
      and external_payment_id is not null
    )
  );

create unique index if not exists
  payments_company_idempotency_key_uidx
on public.payments (
  company_id,
  idempotency_key
)
where idempotency_key is not null;

create unique index if not exists
  payments_company_provider_external_uidx
on public.payments (
  company_id,
  provider,
  external_payment_id
)
where provider is not null
  and external_payment_id is not null;
