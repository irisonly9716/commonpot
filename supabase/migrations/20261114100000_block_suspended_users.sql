-- US12 (#17): a suspended user is locked out of the database at once.
--
-- The Auth ban stops new sign-ins, but an access token that was already issued
-- stays valid until it expires (up to an hour). Nothing in the database looked
-- at profiles.suspended_at, so that token could still read and write through
-- PostgREST and call functions. This migration closes that window:
--
-- 1. is_active_user() says whether the caller's account is not suspended.
-- 2. One restrictive policy per table is ANDed with every existing policy, so
--    a suspended user sees no rows and can write none, whatever token they hold.
-- 3. The helper functions that policies and functions use return false for a
--    suspended user, so a suspended site admin loses admin access too.
-- 4. accept_invite runs as its owner and bypasses RLS, so it checks directly.

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and suspended_at is not null
  );
$$;

revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_site_admin and suspended_at is null
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.invites;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if not public.is_active_user() then
    raise exception 'account suspended' using errcode = '42501';
  end if;
  select * into invite_row from public.invites
  where token = p_token and revoked_at is null and expires_at > now();
  if not found then raise exception 'invite is expired or revoked'; end if;
  insert into public.group_members (group_id, user_id, role)
  values (invite_row.group_id, (select auth.uid()), 'member')
  on conflict (group_id, user_id) do nothing;
  return invite_row.group_id;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'groups', 'group_members', 'default_categories', 'categories',
    'invites', 'expenses', 'expense_shares', 'payments', 'budgets', 'alerts',
    'activity', 'personal_expenses'
  ]
  loop
    execute format(
      'create policy suspended_users_blocked on public.%I as restrictive for all to authenticated using (public.is_active_user()) with check (public.is_active_user())',
      table_name
    );
  end loop;
end;
$$;
