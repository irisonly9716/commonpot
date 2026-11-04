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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated',
    'other-member@example.com', crypt('password123', gen_salt('bf')), now(), '{}', '{}',
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

update public.profiles
set display_name = 'Other Member'
where id = '55555555-5555-4555-8555-555555555555';

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

insert into public.personal_expenses (
  id, user_id, category, amount_cents, description, expense_date
)
values (
  '77777777-7777-4777-8777-777777777777',
  '33333333-3333-4333-8333-333333333333',
  'Personal',
  1800,
  'Site admin personal expense',
  date '2026-11-02'
);

insert into public.groups (id, name, currency, created_by)
values (
  '99999999-9999-4999-8999-999999999999',
  'Other household',
  'USD',
  '55555555-5555-4555-8555-555555555555'
);

insert into public.categories (id, group_id, name)
values (
  '88888888-8888-4888-8888-888888888888',
  '99999999-9999-4999-8999-999999999999',
  'Other groceries'
);

insert into public.expenses (
  id, group_id, created_by, paid_by, category_id, amount_cents, description, expense_date
)
values (
  '66666666-6666-4666-8666-666666666666',
  '99999999-9999-4999-8999-999999999999',
  '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555',
  '88888888-8888-4888-8888-888888888888',
  1200,
  'Other groceries',
  date '2026-11-01'
);

insert into public.expense_shares (expense_id, user_id, amount_cents)
values (
  '66666666-6666-4666-8666-666666666666',
  '55555555-5555-4555-8555-555555555555',
  1200
);
