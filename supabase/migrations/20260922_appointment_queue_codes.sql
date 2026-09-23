begin;

alter table public.queue
  add column if not exists patient_name text;

do $$
declare
  code_column_attnum smallint;
  constraint_to_drop text;
begin
  select attnum
  into code_column_attnum
  from pg_attribute
  where attrelid = 'public.queue'::regclass
    and attname = 'code'
    and not attisdropped;

  for constraint_to_drop in
    select conname
    from pg_constraint
    where conrelid = 'public.queue'::regclass
      and contype = 'c'
      and conkey @> array[code_column_attnum]
  loop
    execute format('alter table public.queue drop constraint %I', constraint_to_drop);
  end loop;
end $$;

alter table public.queue
  add constraint queue_code_appointment_dental_general_check
  check (code ~ '^(NC|AD|AG|D|G)-[0-9]+$');

create index if not exists queue_patient_name_idx on public.queue (patient_name)
where patient_name is not null;

commit;
