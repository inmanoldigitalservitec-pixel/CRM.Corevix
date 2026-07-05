#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No existe .env.local"
  exit 1
fi

SUPABASE_URL=$(grep -E '^VITE_SUPABASE_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
SUPABASE_ANON_KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ]; then
  echo "ERROR: No encontré VITE_SUPABASE_URL en .env.local"
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERROR: No encontré VITE_SUPABASE_ANON_KEY en .env.local"
  exit 1
fi

echo "Supabase URL usada por la app:"
echo "$SUPABASE_URL"
echo ""

echo "Probando lectura directa con la anon key del frontend..."
echo ""

curl -sS \
  "$SUPABASE_URL/rest/v1/agent_widget_contracts?select=id,cycle_date,schema_version,status,generated_by,created_at,contract_json&order=created_at.desc&limit=5" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool

echo ""
echo "=========================================="
echo "Interpretación:"
echo "=========================================="
echo ""
echo "Si ves []:"
echo "- La app está apuntando a otro Supabase, o la anon key no puede leer filas."
echo ""
echo "Si ves un error de permiso/RLS:"
echo "- Hay que ajustar permisos/RLS."
echo ""
echo "Si ves la fila manual_test:"
echo "- El frontend debería poder leerla y el problema está en el query del código."
