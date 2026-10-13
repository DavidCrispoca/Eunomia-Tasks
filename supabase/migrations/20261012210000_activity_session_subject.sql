-- Atribuye sesiones de Enfoque/Estudio a una materia (task_groups).
-- La elección es opcional; borrar una materia conserva la sesión sin asignación.
alter table public.activity_sessions
  add column if not exists group_id uuid
  references public.task_groups (id) on delete set null;

create index if not exists activity_sessions_user_group_idx
  on public.activity_sessions (user_id, group_id)
  where ended_at is not null and group_id is not null;
