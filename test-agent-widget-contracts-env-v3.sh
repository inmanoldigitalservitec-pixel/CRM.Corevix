#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.local"

echo "=========================================="
echo " Testing agent_widget_contracts from app env v3"
echo "=========================================="
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No existe .env.local"
  exit 1
fi

SUPABASE_URL="$(
  grep -E '^(VITE_SUPABASE_URL|SUPABASE_URL|PUBLIC_SUPABASE_URL)=' "$ENV_FILE" \
    | tail -1 \
    | cut -d= -f2- \
    | sed 's/^["'\'']//; s/["'\'']$//'
)"

SUPABASE_KEY="$(
  grep -E '^(VITE_SUPABASE_PUBLISHABLE_KEY|SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY|PUBLIC_SUPABASE_ANON_KEY)=' "$ENV_FILE" \
    | tail -1 \
    | cut -d= -f2- \
    | sed 's/^["'\'']//; s/["'\'']$//'
)"

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "ERROR: No encontré URL Supabase."
  exit 1
fi

if [ -z "${SUPABASE_KEY:-}" ]; then
  echo "ERROR: No encontré publishable/anon key Supabase."
  exit 1
fi

echo "Supabase URL usada por la app:"
echo "$SUPABASE_URL"
echo ""

echo "Probando tabla agent_widget_contracts..."
echo ""

HTTP_RESPONSE_FILE="$(mktemp)"
HTTP_STATUS="$(
  curl -sS -o "$HTTP_RESPONSE_FILE" -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/agent_widget_contracts?select=id,cycle_date,schema_version,status,generated_by,created_at,contract_json&order=created_at.desc&limit=5" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
)"

echo "HTTP status:"
echo "$HTTP_STATUS"
echo ""

echo "Respuesta:"
cat "$HTTP_RESPONSE_FILE" | python3 -m json.tool || cat "$HTTP_RESPONSE_FILE"
echo ""

echo "=========================================="
echo " Interpretación"
echo "=========================================="
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  if grep -q "manual_test" "$HTTP_RESPONSE_FILE"; then
    echo "OK: La app SÍ puede leer la fila manual_test desde agent_widget_contracts."
    echo "Entonces el problema está en el frontend/runtime."
  elif grep -q "agent_widget_contract_v1" "$HTTP_RESPONSE_FILE"; then
    echo "OK: La app SÍ puede leer contratos agent_widget_contract_v1."
    echo "Pero no encontré manual_test específicamente."
  elif grep -q "^\[\]$" "$HTTP_RESPONSE_FILE"; then
    echo "PROBLEMA: La app lee la tabla, pero devuelve []."
    echo "Casi seguro insertaste la fila en otro proyecto Supabase distinto al .env.local."
  else
    echo "Respuesta 200, revisa el JSON arriba."
  fi
else
  echo "PROBLEMA: La API respondió con status $HTTP_STATUS."
  echo "Si ves permission denied/RLS, hay que ajustar permisos."
fi

rm -f "$HTTP_RESPONSE_FILE"
