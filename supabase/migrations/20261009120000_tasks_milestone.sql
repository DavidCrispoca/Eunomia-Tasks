-- Eunomia Tasks · Migración: hitos de tarea (Fase 4)
-- Aplicar en: Supabase Dashboard → SQL Editor → New query → Run
-- (o vía MCP de Supabase con `apply_migration`).
--
-- Añade `tasks.is_milestone`: al completar una tarea marcada como hito se
-- otorga la recompensa `milestone` (+50 XP / +5 Euno Coins) además de la de
-- `task_completed`, de forma idempotente (`ref_id = {taskId}:milestone`).
-- La lógica vive en el servidor (`awardTaskCompleted`, `src/lib/gamification`).

alter table public.tasks
  add column if not exists is_milestone boolean not null default false;
