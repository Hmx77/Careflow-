# CareFlow — Newcastle Medical Centre

Final queue model:
- Appointments: A001, A002, ...
- Walk-ins: W001, W002, ...
- One shared Nurse Station
- Appointments become eligible 10 minutes before scheduled time
- Walk-ins stay first-come-first-served
- Urgent cases can be prioritized by staff
- Public display shows queue numbers only
- 57 mm thermal ticket layout

If Supabase is enabled, apply `supabase/migrations/20260912_queue_types.sql` before deployment.
