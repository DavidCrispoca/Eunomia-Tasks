# Migraciones (Supabase)

> `supabase/schema.sql` es el **esquema base** de la app (perfiles, tareas, bloques,
> preferencias, notificaciones, Google Calendar). Los cambios posteriores (gamificación,
> campañas, hitos, NFC) viven aquí como migraciones aplicadas. Tras crear un entorno
> nuevo: ejecutar `schema.sql` y luego estas migraciones **en orden**.

## Historial aplicado

| Orden | Migración | Qué hace | Estado |
| ----- | --------- | -------- | ------ |
| 1 | `gamification_core` (aplicada vía MCP, Fase 2) | `user_gamification`, `gamification_events`, `achievements`, `user_achievements`, RPC `grant_reward`/`spend_coins`/`level_for_xp`, trigger de perfil y RLS | aplicada |
| 2 | `campaign_world` (aplicada vía MCP, Fase 3) | `islands`, `campaign_unlocks`, RPC `unlock_island`, seed de islas y RLS | aplicada |
| 3 | `unlock_island_out_column` + `unlock_island_prefixed_out` (Fase 3) | Fixes del RPC `unlock_island` (columnas OUT con prefijo `s_` por ambigüedad plpgsql) | aplicada |
| 4 | `20261009120000_tasks_milestone.sql` | `tasks.is_milestone` (hitos → recompensa `milestone`) | por aplicar |
| 5 | `20261009130000_activity_modes_nfc.sql` | Modos + tarjetas NFC + sesiones (Fase 4) | por aplicar |

> Las migraciones 1–3 se aplicaron con el MCP de Supabase antes de versionarlas como
> fichero; 4–5 ya están versionadas. Si el proyecto Supabase quedó con 1–3, basta con
> aplicar 4 y 5.

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
