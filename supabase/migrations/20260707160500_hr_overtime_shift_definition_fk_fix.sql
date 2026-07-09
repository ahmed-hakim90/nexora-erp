-- Fix overtime shift reference to use workforce shift definitions (hr_shifts table never existed).

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_shift_id_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_shift_id_fkey
  foreign key (shift_id) references public.hr_shift_definitions(id) on delete restrict;
