# Migraciones (Supabase)

> `supabase/schema.sql` es el **esquema base** de la app (perfiles, tareas, bloques,
> preferencias, notificaciones, Google Calendar). Los cambios posteriores (gamificación,
> campañas, hitos, NFC) viven aquí como migraciones aplicadas. Tras crear un entorno
> nuevo: ejecutar `schema.sql` y luego estas migraciones **en orden**.

## Historial aplicado

| Orden | Migración | Qué hace | Estado |
| ----- | --------- | -------- | ------ |
| 1 | `20260924163034_google_calendar_sync.sql` | Sincronización con Google Calendar (tokens, eventos, RLS) | aplicada |
| 2 | `20260925030503_add_focus_minutes_to_tasks.sql` | `tasks.focus_minutes` (minutos de enfoque por tarea) | aplicada |
| 3 | `20261009040151_gamification_core.sql` | `user_gamification`, `gamification_events`, `achievements`, `user_achievements`, RPC `grant_reward`/`spend_coins`/`level_for_xp`, trigger de perfil y RLS | aplicada |
| 4 | `20261009043801_campaign_world.sql` | `islands`, `campaign_unlocks`, RPC `unlock_island`, seed de islas y RLS | aplicada |
| 5 | `20261009044541_unlock_island_out_column.sql` + `20261009044557_unlock_island_prefixed_out.sql` | Fixes del RPC `unlock_island` (columnas OUT con prefijo `s_` por ambigüedad plpgsql) | aplicada |
| 6 | `20261012201932_tasks_milestone.sql` | `tasks.is_milestone` (hitos → recompensa `milestone`) | aplicada |
| 7 | `20261012201939_activity_modes_nfc.sql` | Modos + tarjetas NFC + sesiones (Fase 4) | aplicada |

> Todas las migraciones del historial remoto tienen su fichero local, con el **mismo
> prefijo de versión** que `supabase_migrations.schema_migrations` (necesario para que la
> comprobación "Supabase Preview" no falle).

> Algunas migraciones (1–5) se aplicaron con el MCP de Supabase / SQL Editor antes de
> versionarlas como fichero; el SQL de esos ficheros se recuperó de
> `supabase_migrations.schema_migrations` (`statements`) para que el historial remoto y el
> repo coincidan.
>
> **Importante:** el nombre del fichero local debe usar **el mismo prefijo de versión** que
> registra el servidor en `supabase_migrations.schema_migrations`. Si aplicas una migración
> vía MCP o SQL Editor, renombra el fichero local con la versión registrada (o crea uno
> nuevo con ese prefijo) para que la comprobación "Supabase Preview" no falle con
> "Remote migration versions not found in local migrations directory".

## Cómo aplicar

1. **Dashboard**: Supabase → SQL Editor → New query → pegar el fichero → Run.
2. **MCP de Supabase** (opencode): activar `supabase.enabled: true` en `opencode.json`,
   reiniciar opencode y usar `apply_migration` con el nombre y el SQL.
3. Nunca se ejecutan desde el cliente: las mutaciones pasan por Server Actions con
   `readyUser()` (service role).

## Crear una tarjeta NFC

1. Elige un **modo** (`activity_modes.code`: `focus`, `work`, `study`, `sleep`, `break`,
   `review`) y genera un **token** aleatorio (p. ej. `openssl rand -hex 16`).
2. Inserta la tarjeta (Dashboard → SQL Editor):

   ```sql
   insert into public.nfc_tags (token, mode_code, label)
   values ('<TOKEN>', 'focus', 'Tarjeta Enfoque');
   ```

3. Con **NFC Tools** (Android) o **NFC TagWriter by NXP**, escribe en la NTAG un
   **NDEF URL**: `https://<tu-dominio>/scan/<TOKEN>`.
4. Toca la tarjeta con el móvil: abre la app y activa/desactiva el modo (toggle).
   Para desactivar una tarjeta, `update public.nfc_tags set active = false where token = '<TOKEN>';`.
