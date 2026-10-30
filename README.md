# CommonPot

CommonPot lets authenticated group members record expenses and split them
equally or by exact amounts.

## Run locally

1. Install Node.js 26 or newer and run `npm install`.
2. Create a Supabase project and copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local`.
4. Apply the migration in `supabase/migrations/` to the project.
5. Add groups and group-member rows, associating members with Supabase Auth user
   IDs. This feature expects an authenticated Supabase session and an existing
   group membership.
6. Run `npm run dev`, then open `/groups/<group-id>`.

All expense writes go through the authenticated `/api/v1/groups/<group-id>/expenses`
route and its transactional database function. Amounts and shares are stored as
integer cents.

## Validate

- `npm test` runs domain and expense-validation tests.
- `npm run typecheck` checks the TypeScript project.
- `npm run build` creates a production build.
