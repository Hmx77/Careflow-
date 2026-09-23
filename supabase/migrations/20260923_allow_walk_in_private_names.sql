begin;

create or replace function public.careflow_create_queue_item(
  input_category text,
  input_priority text default 'normal',
  input_patient_name text default null,
  input_internal_reference text default null,
  input_phone_number text default null
)
returns table (
  id uuid,
  code text,
  created_at timestamptz,
  status text,
  priority text,
  room_location text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  queue_prefix text;
  queue_location text;
  next_number integer;
  next_code text;
  trimmed_patient_name text;
  created_queue public.queue%rowtype;
begin
  if not public.careflow_is_staff() then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  if input_category is null
    or input_category not in ('general_walk_in', 'dental_walk_in', 'general_appointment', 'dental_appointment')
  then
    raise exception 'Invalid queue category.' using errcode = '22023';
  end if;

  if coalesce(input_priority, 'normal') not in ('normal', 'urgent', 'follow_up') then
    raise exception 'Invalid queue priority.' using errcode = '22023';
  end if;

  queue_prefix := case input_category
    when 'general_appointment' then 'AG'
    when 'dental_appointment' then 'AD'
    when 'dental_walk_in' then 'D'
    else 'G'
  end;

  queue_location := case
    when input_category in ('dental_walk_in', 'dental_appointment') then 'Dental Clinic'
    else 'Nurse Station'
  end;

  trimmed_patient_name := nullif(btrim(coalesce(input_patient_name, '')), '');

  if input_category in ('general_appointment', 'dental_appointment') and trimmed_patient_name is null then
    raise exception 'Patient name is required for appointment queue numbers.' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtext('careflow_queue_code_' || queue_prefix));

  with public_codes as (
    select
      case
        when q.room_location like '__careflow_completed__:%' then replace(q.room_location, '__careflow_completed__:', '')
        else replace(q.code, '-', '')
      end as public_code
    from public.queue q
    where not (
      q.status = 'completed'
      and (
        q.room_location = '__careflow_cleared__'
        or q.room_location like '__careflow_cleared__:%'
      )
    )
  ),
  matching_numbers as (
    select substring(public_code from ('^' || queue_prefix || '([0-9]+)$'))::integer as queue_number
    from public_codes
    where public_code ~ ('^' || queue_prefix || '[0-9]+$')
  )
  select coalesce(max(queue_number), 0) + 1
  into next_number
  from matching_numbers;

  next_code := queue_prefix || '-' || lpad(next_number::text, 3, '0');

  insert into public.queue (
    code,
    status,
    priority,
    room_location,
    internal_reference,
    phone_number
  )
  values (
    next_code,
    'waiting',
    coalesce(input_priority, 'normal'),
    queue_location,
    nullif(btrim(coalesce(input_internal_reference, '')), ''),
    nullif(btrim(coalesce(input_phone_number, '')), '')
  )
  returning *
  into created_queue;

  if trimmed_patient_name is not null then
    insert into public.queue_private (queue_id, patient_name)
    values (created_queue.id, trimmed_patient_name);
  end if;

  return query
  select
    created_queue.id,
    created_queue.code,
    created_queue.created_at,
    created_queue.status,
    created_queue.priority,
    created_queue.room_location;
end;
$$;

commit;
