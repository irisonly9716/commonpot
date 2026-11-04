insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, email_change,
  email_change_token_new, recovery_token, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'admin@example.com', crypt('password123', gen_salt('bf')), now(), '{}', '{}',
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
    'member@example.com', crypt('password123', gen_salt('bf')), now(), '{}', '{}',
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'site-admin@example.com', crypt('password123', gen_salt('bf')), now(), '{}', '{}',
    '', '', '', '', now(), now()
  );

update public.profiles
set display_name = 'Admin User'
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles
set display_name = 'Member User'
where id = '22222222-2222-4222-8222-222222222222';

update public.profiles
set display_name = 'Site Admin', is_site_admin = true
where id = '33333333-3333-4333-8333-333333333333';

insert into public.default_categories (name)
values ('Groceries'), ('Utilities'), ('Dining');

insert into public.groups (id, name, currency, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Iris household',
  'USD',
  '11111111-1111-4111-8111-111111111111'
);

insert into public.group_members (group_id, user_id, role)
values (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'member'
);

insert into public.invites (
  id, group_id, created_by, token, expires_at
)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'seed-invite-token',
  now() + interval '7 days'
);

insert into public.expenses (
  id, group_id, created_by, paid_by, category_id, amount_cents, description, expense_date
)
select
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  id,
  8400,
  'Groceries',
  date '2026-11-01'
from public.categories
where group_id = '11111111-1111-4111-8111-111111111111'
  and name = 'Groceries';

insert into public.expense_shares (expense_id, user_id, amount_cents)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    4200
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    4200
  );

insert into public.personal_expenses (
  id, user_id, category, amount_cents, description, expense_date
)
values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'Personal',
  2500,
  'Personal expense',
  date '2026-11-01'
);
