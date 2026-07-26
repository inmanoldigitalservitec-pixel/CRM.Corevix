# Migraciones locales archivadas — julio 2026

Estas migraciones existían en el repositorio local, pero no estaban registradas
en el historial remoto de Supabase al 26 de julio de 2026.

Se movieron fuera de `supabase/migrations/` para evitar que `supabase db push`
intentara ejecutarlas automáticamente contra producción.

Esto no significa necesariamente que sus cambios no existan en la base remota.
Algunas pudieron haberse aplicado manualmente, mediante SQL Editor, herramientas
externas o migraciones con otro historial.

No deben eliminarse hasta confirmar individualmente si:

1. sus objetos ya existen en producción;
2. fueron aplicadas manualmente;
3. todavía son necesarias;
4. deben consolidarse en una migración base futura.

Los archivos permanecen versionados en Git como referencia histórica.
