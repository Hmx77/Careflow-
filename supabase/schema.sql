create extension if not exists pgcrypto;

create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^NC-[0-9]+$'),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'called', 'in_progress', 'completed', 'delayed')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent', 'follow_up')),
  room_location text not null default '',
  internal_reference text,
  phone_number text
);

create index if not exists queue_active_idx on public.queue (status, priority, created_at);
create index if not exists queue_code_idx on public.queue (code);

alter table public.queue enable row level security;

drop policy if exists "CareFlow queue read access" on public.queue;
drop policy if exists "CareFlow queue insert access" on public.queue;
drop policy if exists "CareFlow queue update access" on public.queue;

create policy "CareFlow queue read access"
on public.queue for select
to anon
using (true);

create policy "CareFlow queue insert access"
on public.queue for insert
to anon
with check (true);

create policy "CareFlow queue update access"
on public.queue for update
to anon
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queue'
  ) then
    alter publication supabase_realtime add table public.queue;
  end if;
end $$;
