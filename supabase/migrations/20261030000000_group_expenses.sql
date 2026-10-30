create extension if not exists pgcrypto with schema extensions;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 200),
  category text not null check (length(trim(category)) between 1 and 40),
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null,
  split_type text not null check (split_type in ('equal', 'exact')),
  paid_by_user_id uuid not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, group_id),
  foreign key (group_id, paid_by_user_id)
    references public.group_members(group_id, user_id),
  foreign key (group_id, created_by)
    references public.group_members(group_id, user_id)
);

create table public.expense_shares (
  expense_id uuid not null,
  group_id uuid not null,
  user_id uuid not null,
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, user_id),
  foreign key (expense_id, group_id)
    references public.expenses(id, group_id) on delete cascade,
  foreign key (group_id, user_id)
    references public.group_members(group_id, user_id)
);

create index expenses_group_date_idx
  on public.expenses(group_id, expense_date desc, created_at desc);
create index expense_shares_group_idx
  on public.expense_shares(group_id, expense_id);

create function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;

create policy "Members can read their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "Members can read group members"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members can read group expenses"
  on public.expenses for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members can read group expense shares"
  on public.expense_shares for select to authenticated
  using (public.is_group_member(group_id));

grant select on public.groups, public.group_members, public.expenses, public.expense_shares
  to authenticated;
revoke insert, update, delete on public.groups, public.group_members, public.expenses, public.expense_shares
  from anon, authenticated;

create function public.create_group_expense(
  p_group_id uuid,
  p_description text,
  p_category text,
  p_expense_date date,
  p_amount_cents integer,
  p_split_type text,
  p_paid_by_user_id uuid,
  p_shares jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_expense_id uuid := gen_random_uuid();
  share_count integer;
  unique_share_count integer;
  total_share_cents bigint;
  smallest_share_cents integer;
  largest_share_cents integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  ) then
    raise exception 'Group membership required' using errcode = '42501';
  end if;

  if p_amount_cents <= 0
     or length(trim(p_description)) not between 1 and 200
     or length(trim(p_category)) not between 1 and 40
     or p_split_type not in ('equal', 'exact')
     or not exists (
       select 1 from public.group_members
       where group_id = p_group_id and user_id = p_paid_by_user_id
     )
     or jsonb_typeof(p_shares) <> 'array'
     or jsonb_array_length(p_shares) = 0 then
    raise exception 'Invalid expense details' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct share.user_id)::integer,
    coalesce(sum(share.amount_cents), 0),
    min(share.amount_cents),
    max(share.amount_cents)
  into
    share_count,
    unique_share_count,
    total_share_cents,
    smallest_share_cents,
    largest_share_cents
  from jsonb_to_recordset(p_shares) as share(user_id uuid, amount_cents integer);

  if share_count = 0
     or share_count <> unique_share_count
     or total_share_cents <> p_amount_cents
     or exists (
       select 1
       from jsonb_to_recordset(p_shares) as share(user_id uuid, amount_cents integer)
       left join public.group_members member
         on member.group_id = p_group_id and member.user_id = share.user_id
       where member.user_id is null or share.amount_cents < 0
     )
     or (
       p_split_type = 'equal'
       and largest_share_cents - smallest_share_cents > 1
     ) then
    raise exception 'Expense shares are invalid' using errcode = '23514';
  end if;

  insert into public.expenses (
    id,
    group_id,
    description,
    category,
    amount_cents,
    expense_date,
    split_type,
    paid_by_user_id,
    created_by
  ) values (
    new_expense_id,
    p_group_id,
    trim(p_description),
    trim(p_category),
    p_amount_cents,
    p_expense_date,
    p_split_type,
    p_paid_by_user_id,
    (select auth.uid())
  );

  insert into public.expense_shares (expense_id, group_id, user_id, amount_cents)
  select new_expense_id, p_group_id, share.user_id, share.amount_cents
  from jsonb_to_recordset(p_shares) as share(user_id uuid, amount_cents integer);

  return new_expense_id;
end;
$$;

revoke all on function public.create_group_expense(
  uuid, text, text, date, integer, text, uuid, jsonb
) from public, anon;
grant execute on function public.create_group_expense(
  uuid, text, text, date, integer, text, uuid, jsonb
) to authenticated;
