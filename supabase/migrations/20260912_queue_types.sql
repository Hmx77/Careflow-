alter table if exists public.patients add column if not exists queue_type text, add column if not exists scheduled_at timestamptz;
update public.patients set queue_type = case when lower(coalesce(appointment_type,'')) like '%scheduled%' then 'appointment' else 'walk-in' end where queue_type is null;
alter table if exists public.patients alter column queue_type set default 'walk-in';
do $$ begin if not exists (select 1 from pg_constraint where conname='patients_queue_type_check') then alter table public.patients add constraint patients_queue_type_check check (queue_type in ('appointment','walk-in')); end if; end $$;
create index if not exists patients_queue_type_idx on public.patients(queue_type);
create index if not exists patients_scheduled_at_idx on public.patients(scheduled_at);
