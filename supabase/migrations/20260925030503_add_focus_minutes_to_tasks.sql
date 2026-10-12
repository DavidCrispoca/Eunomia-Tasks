alter table public.tasks
  add column if not exists focus_minutes integer not null default 0;
