-- OP-06: Assignment resolver runtime — allow employment profile cache rebuild from assignment engine.

create or replace function public.prevent_hr_employment_profile_history_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.metadata ->> 'assignment_cache_rebuild', 'false') = 'true' then
    if old.employee_id is distinct from new.employee_id
      or old.company_id is distinct from new.company_id
      or old.branch_id is distinct from new.branch_id
      or old.employment_type is distinct from new.employment_type
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
      or old.status is distinct from new.status
    then
      raise exception 'Assignment cache rebuild cannot mutate employment profile anchor fields.';
    end if;

    return new;
  end if;

  if old.status in ('active', 'expired', 'superseded', 'cancelled')
    and (
      old.employee_id is distinct from new.employee_id
      or old.company_id is distinct from new.company_id
      or old.branch_id is distinct from new.branch_id
      or old.department_id is distinct from new.department_id
      or old.section_id is distinct from new.section_id
      or old.team_id is distinct from new.team_id
      or old.position_id is distinct from new.position_id
      or old.grade_id is distinct from new.grade_id
      or old.employment_type is distinct from new.employment_type
      or old.work_location_id is distinct from new.work_location_id
      or old.cost_center_id is distinct from new.cost_center_id
      or old.reporting_manager_employee_id is distinct from new.reporting_manager_employee_id
      or old.reporting_manager_override is distinct from new.reporting_manager_override
      or old.effective_from is distinct from new.effective_from
      or old.effective_to is distinct from new.effective_to
    )
  then
    raise exception 'Historical HR employment profiles are immutable; create a superseding effective-dated profile instead.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_hr_employment_profile_history_rewrite() from public;
grant execute on function public.prevent_hr_employment_profile_history_rewrite() to authenticated;
