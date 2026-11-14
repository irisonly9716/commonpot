-- US12 (#17): lists for the site admin dashboard.
--
-- Site admins see accounts and counts only, never amounts or expense details
-- (AGENTS.md section 2). These functions are the only way they read user and
-- group rows with counts, and they return nothing but ids, names, dates and
-- counts. The caller must be a site admin or the function raises.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  suspended_at timestamptz,
  is_site_admin boolean,
  group_count bigint,
  expense_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'site admin access required' using errcode = '42501';
  end if;
  return query
    select
      p.id,
      u.email::text,
      p.display_name,
      p.created_at,
      p.suspended_at,
      p.is_site_admin,
      (select count(*) from public.group_members gm where gm.user_id = p.id),
      (select count(*) from public.expenses e where e.created_by = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc, p.id;
end;
$$;

create or replace function public.admin_list_groups()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  member_count bigint,
  expense_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'site admin access required' using errcode = '42501';
  end if;
  return query
    select
      g.id,
      g.name,
      g.created_at,
      (select count(*) from public.group_members gm where gm.group_id = g.id),
      (select count(*) from public.expenses e where e.group_id = g.id)
    from public.groups g
    order by g.created_at desc, g.id;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_list_groups() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_groups() to authenticated;
