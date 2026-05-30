# Deploy a `dist/` build to Hostinger (Static)

This project can be deployed as a static SPA (single-page app). Supabase stays as the backend.

## 1) Build locally

```bash
npm ci
npm run build
```

Vite outputs the static client build into `dist/client/` (and an SSR build into `dist/server/`, which you can ignore for static hosting).

## 2) Ensure SPA routing works on Hostinger

Client-side routes like `/dashboard` must not 404 on refresh.

This repo includes `public/.htaccess` which is copied into `dist/client/` during build so Apache will rewrite all non-file requests to `index.html`.

## 3) Upload to Hostinger

Upload the **contents** of `dist/client/` to your domain's `public_html/` directory.

## 4) Environment variables

Do not upload `.env`.

Set the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` **before building** (they are baked into the static bundle at build time).
