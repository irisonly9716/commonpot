create extension if not exists "pgcrypto";

create type public.group_member_role as enum ('member', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  is_site_admin boolean not null default false,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.default_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  paid_by uuid not null references public.profiles (id),
  category_id uuid references public.categories (id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  description text not null check (length(trim(description)) > 0),
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents >= 0),
  primary key (expense_id, user_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  paid_by uuid not null references public.profiles (id),
  paid_to uuid not null references public.profiles (id),
  amount_cents bigint not null check (amount_cents > 0),
  payment_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (paid_by <> paid_to)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  limit_cents bigint not null check (limit_cents > 0),
  effective_from date not null check (effective_from = date_trunc('month', effective_from)::date),
  created_at timestamptz not null default now(),
  unique (group_id, category_id, effective_from)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  kind text not null,
  message text not null,
  budget_id uuid references public.budgets (id) on delete cascade,
  threshold_percent integer,
  alert_month date,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, budget_id, alert_month, threshold_percent)
);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null,
  description text not null,
  amount_cents bigint check (amount_cents is null or amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (length(trim(category)) > 0),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null check (length(trim(description)) > 0),
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_site_admin
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role')
     and (new.is_site_admin is distinct from old.is_site_admin
     or new.suspended_at is distinct from old.suspended_at) then
    raise exception 'profile privileges can only be changed by a trusted server';
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create or replace function public.add_group_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger add_group_creator
  after insert on public.groups
  for each row execute function public.add_group_creator();

create or replace function public.copy_default_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (group_id, name, is_archived)
  select new.id, name, is_archived from public.default_categories;
  return new;
end;
$$;

create trigger copy_default_categories
  after insert on public.groups
  for each row execute function public.copy_default_categories();

create or replace function public.validate_expense_relationships()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.group_members
    where group_id = new.group_id and user_id = new.paid_by
  ) then
    raise exception 'payer must belong to expense group';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.categories
    where id = new.category_id and group_id = new.group_id
  ) then
    raise exception 'category must belong to expense group';
  end if;
  if tg_op = 'UPDATE' and (new.group_id <> old.group_id or new.created_by <> old.created_by) then
    raise exception 'expense group and creator cannot change';
  end if;
  return new;
end;
$$;

create trigger validate_expense_relationships
  before insert or update on public.expenses
  for each row execute function public.validate_expense_relationships();

create or replace function public.validate_share_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expense_group uuid;
begin
  select group_id into expense_group from public.expenses where id = new.expense_id;
  if expense_group is null or not exists (
    select 1 from public.group_members
    where group_id = expense_group and user_id = new.user_id
  ) then
    raise exception 'share member must belong to expense group';
  end if;
  return new;
end;
$$;

create trigger validate_share_relationship
  before insert or update on public.expense_shares
  for each row execute function public.validate_share_relationship();

create or replace function public.check_expense_shares()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_expense_id uuid;
  expected bigint;
  actual bigint;
begin
  if tg_table_name = 'expenses' then
    target_expense_id := coalesce(new.id, old.id);
  else
    target_expense_id := coalesce(new.expense_id, old.expense_id);
  end if;
  select amount_cents into expected from public.expenses where id = target_expense_id;
  if expected is null then
    return null;
  end if;
  select coalesce(sum(amount_cents), 0) into actual
  from public.expense_shares where expense_id = target_expense_id;
  if actual <> expected then
    raise exception 'expense shares must equal expense amount';
  end if;
  return null;
end;
$$;

create constraint trigger expense_shares_total
  after insert or update or delete on public.expense_shares
  deferrable initially deferred
  for each row execute function public.check_expense_shares();

create constraint trigger expense_amount_matches_shares
  after update of amount_cents on public.expenses
  deferrable initially deferred
  for each row execute function public.check_expense_shares();

create or replace function public.reject_unshared_expense()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.expense_shares where expense_id = new.id) then
    raise exception 'expense must have shares';
  end if;
  return new;
end;
$$;

create constraint trigger expense_requires_shares
  after insert on public.expenses
  deferrable initially deferred
  for each row execute function public.reject_unshared_expense();

create or replace function public.validate_payment_relationships()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid_by = new.paid_to then
    raise exception 'payment parties must differ';
  end if;
  if not exists (
    select 1 from public.group_members
    where group_id = new.group_id and user_id = new.paid_by
  ) or not exists (
    select 1 from public.group_members
    where group_id = new.group_id and user_id = new.paid_to
  ) then
    raise exception 'payment parties must belong to payment group';
  end if;
  return new;
end;
$$;

create trigger validate_payment_relationships
  before insert or update on public.payments
  for each row execute function public.validate_payment_relationships();

create or replace function public.validate_budget_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories
    where id = new.category_id and group_id = new.group_id
  ) then
    raise exception 'budget category must belong to budget group';
  end if;
  return new;
end;
$$;

create trigger validate_budget_category
  before insert or update on public.budgets
  for each row execute function public.validate_budget_category();

create or replace function public.ensure_group_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_group uuid := coalesce(new.group_id, old.group_id);
begin
  if exists (select 1 from public.groups where id = target_group)
     and not exists (
       select 1 from public.group_members
       where group_id = target_group and role = 'admin'
     ) then
    raise exception 'group must retain at least one admin';
  end if;
  return null;
end;
$$;

create constraint trigger group_requires_admin
  after insert or update or delete on public.group_members
  deferrable initially deferred
  for each row execute function public.ensure_group_admin();

create or replace function public.record_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := coalesce((select auth.uid()), new.created_by);
begin
  insert into public.activity (group_id, actor_id, action, description, amount_cents)
  values (new.group_id, actor, case when tg_op = 'INSERT' then 'added' else 'edited' end,
    new.description, new.amount_cents);
  return new;
end;
$$;

create trigger expense_activity
  after insert or update on public.expenses
  for each row execute function public.record_expense_activity();

create or replace function public.record_expense_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_name text;
begin
  select display_name into actor_name from public.profiles where id = actor;
  insert into public.activity (group_id, actor_id, action, description, amount_cents)
  values (old.group_id, actor, 'deleted', old.description, old.amount_cents);
  if actor is not null and actor is distinct from old.created_by then
    insert into public.alerts (user_id, group_id, kind, message)
    values (old.created_by, old.group_id, 'expense_deleted',
      coalesce(actor_name, 'A group administrator') || ' deleted your expense: ' ||
      old.description);
  end if;
  return old;
end;
$$;

create trigger expense_deletion_activity
  after delete on public.expenses
  for each row execute function public.record_expense_deletion();

create or replace function public.protect_alert_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.group_id is distinct from old.group_id
     or new.kind is distinct from old.kind
     or new.message is distinct from old.message
     or new.budget_id is distinct from old.budget_id
     or new.threshold_percent is distinct from old.threshold_percent
     or new.alert_month is distinct from old.alert_month
     or new.created_at is distinct from old.created_at then
    raise exception 'only alert read state can change';
  end if;
  return new;
end;
$$;

create trigger protect_alert_update
  before update on public.alerts
  for each row execute function public.protect_alert_update();

create or replace function public.record_payment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payer_name text;
  payee_name text;
begin
  select display_name into payer_name from public.profiles where id = new.paid_by;
  select display_name into payee_name from public.profiles where id = new.paid_to;
  insert into public.activity (group_id, actor_id, action, description, amount_cents)
  values (new.group_id, (select auth.uid()), 'payment_recorded',
    coalesce(payer_name, 'A member') || ' paid ' || coalesce(payee_name, 'a member'),
    new.amount_cents);
  return new;
end;
$$;

create trigger payment_activity
  after insert on public.payments
  for each row execute function public.record_payment_activity();

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
  select * into invite_row from public.invites
  where token = p_token and revoked_at is null and expires_at > now();
  if not found then raise exception 'invite is expired or revoked'; end if;
  insert into public.group_members (group_id, user_id, role)
  values (invite_row.group_id, (select auth.uid()), 'member')
  on conflict (group_id, user_id) do nothing;
  return invite_row.group_id;
end;
$$;

create or replace function public.create_expense(p_expense jsonb, p_shares jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  expense_id uuid;
begin
  insert into public.expenses (
    group_id, created_by, paid_by, category_id, amount_cents, description, expense_date
  )
  values (
    (p_expense ->> 'group_id')::uuid, (select auth.uid()),
    (p_expense ->> 'paid_by')::uuid, nullif(p_expense ->> 'category_id', '')::uuid,
    (p_expense ->> 'amount_cents')::bigint, p_expense ->> 'description',
    (p_expense ->> 'expense_date')::date
  )
  returning id into expense_id;
  insert into public.expense_shares (expense_id, user_id, amount_cents)
  select expense_id, user_id, amount_cents
  from jsonb_to_recordset(p_shares) as shares(user_id uuid, amount_cents bigint);
  return expense_id;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid, p_expense jsonb, p_shares jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  update public.expenses
  set paid_by = (p_expense ->> 'paid_by')::uuid,
      category_id = nullif(p_expense ->> 'category_id', '')::uuid,
      amount_cents = (p_expense ->> 'amount_cents')::bigint,
      description = p_expense ->> 'description',
      expense_date = (p_expense ->> 'expense_date')::date,
      updated_at = now()
  where id = p_expense_id;
  delete from public.expense_shares where expense_id = p_expense_id;
  insert into public.expense_shares (expense_id, user_id, amount_cents)
  select p_expense_id, user_id, amount_cents
  from jsonb_to_recordset(p_shares) as shares(user_id uuid, amount_cents bigint);
  return p_expense_id;
end;
$$;

create or replace function public.platform_counts()
returns table (user_count bigint, group_count bigint, expense_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'site admin access required';
  end if;
  select
    count(*) from public.profiles into user_count;
  select count(*) from public.groups into group_count;
  select count(*) from public.expenses into expense_count;
  return next;
end;
$$;

create or replace function public.group_member_profiles(p_group_id uuid)
returns table (id uuid, display_name text)
language sql
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.profiles p
  join public.group_members gm on gm.user_id = p.id
  where gm.group_id = p_group_id
    and public.is_group_member(p_group_id);
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.default_categories enable row level security;
alter table public.categories enable row level security;
alter table public.invites enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.payments enable row level security;
alter table public.budgets enable row level security;
alter table public.alerts enable row level security;
alter table public.activity enable row level security;
alter table public.personal_expenses enable row level security;

create policy profiles_select on public.profiles for select
  using (id = (select auth.uid()) or public.is_site_admin());
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy groups_select on public.groups for select
  using (public.is_group_member(id) or public.is_site_admin());
create policy groups_insert on public.groups for insert
  with check (created_by = (select auth.uid()));
create policy groups_update on public.groups for update
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy group_members_select on public.group_members for select
  using (public.is_group_member(group_id));
create policy group_members_update on public.group_members for update
  using (public.is_group_admin(group_id) and user_id <> (select auth.uid()))
  with check (public.is_group_admin(group_id) and user_id <> (select auth.uid()));
create policy group_members_delete on public.group_members for delete
  using (public.is_group_admin(group_id) and user_id <> (select auth.uid()));

create policy default_categories_site_admin_select on public.default_categories for select
  using (public.is_site_admin());
create policy default_categories_site_admin_insert on public.default_categories for insert
  with check (public.is_site_admin());
create policy default_categories_site_admin_update on public.default_categories for update
  using (public.is_site_admin()) with check (public.is_site_admin());
create policy default_categories_site_admin_delete on public.default_categories for delete
  using (public.is_site_admin());

create policy categories_select on public.categories for select
  using (public.is_group_member(group_id));
create policy categories_admin_insert on public.categories for insert
  with check (public.is_group_admin(group_id));
create policy categories_admin_update on public.categories for update
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy categories_admin_delete on public.categories for delete
  using (public.is_group_admin(group_id));

create policy invites_admin_select on public.invites for select
  using (public.is_group_admin(group_id));
create policy invites_admin_insert on public.invites for insert
  with check (public.is_group_admin(group_id) and created_by = (select auth.uid()));
create policy invites_admin_update on public.invites for update
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy invites_admin_delete on public.invites for delete
  using (public.is_group_admin(group_id));

create policy expenses_member_select on public.expenses for select
  using (public.is_group_member(group_id) and not public.is_site_admin());
create policy expenses_member_insert on public.expenses for insert
  with check (public.is_group_member(group_id) and created_by = (select auth.uid()));
create policy expenses_creator_update on public.expenses for update
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()) and public.is_group_member(group_id));
create policy expenses_creator_delete on public.expenses for delete
  using (created_by = (select auth.uid()) or public.is_group_admin(group_id));

create policy shares_member_select on public.expense_shares for select
  using (exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id) and not public.is_site_admin()));
create policy shares_member_insert on public.expense_shares for insert
  with check (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = (select auth.uid())));
create policy shares_creator_update on public.expense_shares for update
  using (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = (select auth.uid())))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = (select auth.uid())));
create policy shares_creator_delete on public.expense_shares for delete
  using (exists (select 1 from public.expenses e where e.id = expense_id and e.created_by = (select auth.uid())));

create policy payments_member_select on public.payments for select
  using (public.is_group_member(group_id) and not public.is_site_admin());
create policy payments_member_insert on public.payments for insert
  with check (public.is_group_member(group_id) and (paid_by = (select auth.uid()) or public.is_group_admin(group_id)));
create policy payments_member_update on public.payments for update
  using (paid_by = (select auth.uid())) with check (paid_by = (select auth.uid()) and public.is_group_member(group_id));
create policy payments_member_delete on public.payments for delete
  using (paid_by = (select auth.uid()) or public.is_group_admin(group_id));

create policy budgets_member_select on public.budgets for select
  using (public.is_group_member(group_id) and not public.is_site_admin());
create policy budgets_admin_insert on public.budgets for insert
  with check (public.is_group_admin(group_id));
create policy budgets_admin_update on public.budgets for update
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy budgets_admin_delete on public.budgets for delete
  using (public.is_group_admin(group_id));

create policy alerts_owner_select on public.alerts for select
  using (user_id = (select auth.uid()) and not public.is_site_admin());
create policy alerts_owner_update on public.alerts for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activity_member_select on public.activity for select
  using (public.is_group_member(group_id) and not public.is_site_admin());

create policy personal_expenses_owner_select on public.personal_expenses for select
  using (user_id = (select auth.uid()) and not public.is_site_admin());
create policy personal_expenses_owner_insert on public.personal_expenses for insert
  with check (user_id = (select auth.uid()));
create policy personal_expenses_owner_update on public.personal_expenses for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy personal_expenses_owner_delete on public.personal_expenses for delete
  using (user_id = (select auth.uid()));

revoke all on function public.platform_counts() from public;
revoke execute on function public.platform_counts() from anon;
grant execute on function public.platform_counts() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.create_expense(jsonb, jsonb) to authenticated;
grant execute on function public.update_expense(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.group_member_profiles(uuid) to authenticated;
