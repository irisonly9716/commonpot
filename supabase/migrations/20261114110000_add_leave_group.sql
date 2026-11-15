-- US11 (#16): a member can leave a group.
--
-- The group_members delete policy only lets an admin remove someone else, and
-- it refuses to let anyone remove their own row. Leaving is the one case where
-- a person deletes their own membership, so it goes through this function. It
-- removes only the caller's own row. The deferred trigger group_requires_admin
-- still refuses to leave a group without an admin, so the last admin cannot
-- leave. The zero-balance rule is checked by the API, not here.

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = (select auth.uid());
  if not found then
    raise exception 'not a member of this group' using errcode = 'P0002';
  end if;

  -- Run the "at least one admin" check now, so the error comes from this call.
  set constraints public.group_requires_admin immediate;
end;
$$;

revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;
