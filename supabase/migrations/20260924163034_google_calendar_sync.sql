-- Google Calendar: conexión OAuth y mapeo bloque ↔ evento
create table if not exists public.google_calendar_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  google_account_email text not null,
  calendar_id text not null default 'primary',
  refresh_token_encrypted text not null,
  blocks_hash text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.google_event_links (
  user_id uuid not null references public.profiles (id) on delete cascade,
  block_id uuid not null,
  google_event_id text not null,
  calendar_id text not null default 'primary',
  synced_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, block_id)
);

create index if not exists google_event_links_user_idx
  on public.google_event_links (user_id);

alter table public.google_calendar_connections enable row level security;
drop policy if exists "select own google connection" on public.google_calendar_connections;
create policy "select own google connection" on public.google_calendar_connections
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own google connection" on public.google_calendar_connections;
create policy "insert own google connection" on public.google_calendar_connections
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own google connection" on public.google_calendar_connections;
create policy "update own google connection" on public.google_calendar_connections
  for update using ((select auth.uid()) = user_id);
drop policy if exists "delete own google connection" on public.google_calendar_connections;
create policy "delete own google connection" on public.google_calendar_connections
  for delete using ((select auth.uid()) = user_id);

alter table public.google_event_links enable row level security;
drop policy if exists "select own google event links" on public.google_event_links;
create policy "select own google event links" on public.google_event_links
  for select using ((select auth.uid()) = user_id);
drop policy if exists "insert own google event links" on public.google_event_links;
create policy "insert own google event links" on public.google_event_links
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "update own google event links" on public.google_event_links;
create policy "update own google event links" on public.google_event_links
  for update using ((select auth.uid()) = user_id);
drop policy if exists "delete own google event links" on public.google_event_links;
create policy "delete own google event links" on public.google_event_links
  for delete using ((select auth.uid()) = user_id);
