begin;

revoke all privileges on table public.careflow_staff_users from PUBLIC, anon, authenticated;
revoke select (user_id, created_at), insert (user_id, created_at), update (user_id, created_at), references (user_id, created_at)
on table public.careflow_staff_users from PUBLIC, anon, authenticated;

revoke all privileges on table public.queue_private from PUBLIC, anon, authenticated;
revoke select (queue_id, patient_name, created_at, updated_at),
  insert (queue_id, patient_name, created_at, updated_at),
  update (queue_id, patient_name, created_at, updated_at),
  references (queue_id, patient_name, created_at, updated_at)
on table public.queue_private from PUBLIC, anon, authenticated;

grant select (queue_id, patient_name) on public.queue_private to authenticated;

revoke all privileges on table public.queue from PUBLIC, anon, authenticated;
revoke select (id, code, created_at, status, priority, room_location, patient_name, internal_reference, phone_number),
  insert (id, code, created_at, status, priority, room_location, patient_name, internal_reference, phone_number),
  update (id, code, created_at, status, priority, room_location, patient_name, internal_reference, phone_number),
  references (id, code, created_at, status, priority, room_location, patient_name, internal_reference, phone_number)
on table public.queue from PUBLIC, anon, authenticated;

grant select (id, code, created_at, status, room_location) on public.queue to anon;
grant select (id, code, created_at, status, priority, room_location) on public.queue to authenticated;
grant update (code, status, room_location, internal_reference) on public.queue to authenticated;

do $$
declare
  legacy_policy record;
begin
  for legacy_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'queue'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (
        'public' = any (roles)
        or 'anon' = any (roles)
      )
  loop
    execute format('drop policy if exists %I on public.queue', legacy_policy.policyname);
  end loop;
end $$;

drop policy if exists "CareFlow queue read access" on public.queue;
drop policy if exists "CareFlow queue insert access" on public.queue;
drop policy if exists "CareFlow queue update access" on public.queue;
drop policy if exists "CareFlow queue delete access" on public.queue;

create policy "CareFlow queue read access"
on public.queue for select
to anon, authenticated
using (true);

create policy "CareFlow queue update access"
on public.queue for update
to authenticated
using (public.careflow_is_staff())
with check (public.careflow_is_staff());

revoke all on function public.careflow_is_staff() from PUBLIC, anon, authenticated;
grant execute on function public.careflow_is_staff() to authenticated;

revoke all on function public.careflow_create_queue_item(text, text, text, text, text) from PUBLIC, anon, authenticated;
grant execute on function public.careflow_create_queue_item(text, text, text, text, text) to authenticated;

revoke all on function public.careflow_delete_queue_private_on_completed() from PUBLIC, anon, authenticated;

commit;
