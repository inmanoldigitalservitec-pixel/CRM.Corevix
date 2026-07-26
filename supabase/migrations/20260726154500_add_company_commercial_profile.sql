-- Extiende el perfil comercial usado por Settings, facturas y recibos.
-- Todas las columnas son opcionales para no romper empresas existentes.

alter table public.companies
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists website text,
  add column if not exists logo_url text;

comment on column public.companies.email is
  'Correo comercial o de facturación mostrado en documentos.';

comment on column public.companies.phone is
  'Teléfono principal de la empresa mostrado en documentos.';

comment on column public.companies.address is
  'Dirección principal de la empresa mostrada en documentos.';

comment on column public.companies.city is
  'Ciudad asociada con la dirección comercial de la empresa.';

comment on column public.companies.country is
  'País asociado con la dirección comercial de la empresa.';

comment on column public.companies.website is
  'Sitio web público mostrado en documentos comerciales.';

comment on column public.companies.logo_url is
  'Ruta o URL del logo utilizado en documentos comerciales.';
