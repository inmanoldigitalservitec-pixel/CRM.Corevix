# Investigación tamaño correcto de agent.autopilot

Objetivo:
Medir el alto real del contenido y calcular cuántas filas necesita React Grid Layout.

Datos relevantes:
- rowHeight = 92
- marginY = 10
- Fórmula altura RGL:
  px = rowHeight * h + marginY * (h - 1)

Comando de navegador principal:
- browser-measure-autopilot-size.js

Buscar:
- agent_scroll_h
- agent_offset_h
- grid_item_h
- desired_rows_exact
- desired_rows_plus_24px

Con eso elegimos h real para Supabase, probablemente h 5 o h 6, no h 3 ni h 12.
