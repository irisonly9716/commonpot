# Setup and deployment guide

The short version is in the [README](../README.md). This page has the details: local setup, the environments, troubleshooting and how production is deployed.

## Local development

### What you need

- **Node.js 26.x**, the version in `package.json` `engines` and the Vercel default.
- **Docker**, running. The Supabase CLI (pinned in `devDependencies`, so `npx supabase` needs no global install) runs Postgres, Auth and Realtime in containers.
- **Git**. `npm ci` also installs the Husky pre-commit hook, which runs Prettier and ESLint on staged files.

### First run

```bash
npm ci
npx supabase start            # the first run downloads the images and takes a few minutes
cp .env.example .env.local
npx supabase status           # copy the API URL, anon key and service role key into .env.local
npx supabase db reset         # runs supabase/migrations/* and supabase/seed.sql
npm run dev                   # http://localhost:3000
```

`.env.local` takes three values:

| Variable                        | Local value from `npx supabase status` | Used by                                                                      |
| ------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | API URL                                | Browser and server                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                               | Browser and server; RLS decides what each user can do                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | service role key                       | Server only: suspending and reactivating accounts, and the integration tests |

The service role key bypasses RLS, so it is never in a `NEXT_PUBLIC_` variable and never reaches the browser. `.env*` files are ignored by Git and must never be committed.

Sign in with one of the seeded accounts listed in the README. They exist only in the local database.

### Everyday commands

| Task                                     | Command                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Start over with a clean, seeded database | `npx supabase db reset`                                                                    |
| Add a schema change                      | `npx supabase migration new <name>`, then write the SQL with its RLS policies in that file |
| Regenerate the database types            | `npm run db:types` (after any schema change)                                               |
| Re-export the Tailwind theme             | `npx @google/design.md export --format css-tailwind DESIGN.md > src/app/theme.css`         |
| Everything CI checks before E2E          | `npm run check`, then `npx prettier --check .` and `npm run api:lint`                      |
| Stop the local stack                     | `npx supabase stop`                                                                        |

Never edit a migration that is already on `main`; add a new one. The one exception so far is #52, which the issue asked for because that migration had never run anywhere but local databases.

### Troubleshooting

- **`supabase start` fails or hangs.** Docker isn't running, or an old stack is still up: `npx supabase stop`, then start again.
- **Integration or E2E tests can't connect.** The local stack must be running, and `.env.local` must have its current keys.
- **`next dev` changed `AGENTS.md`.** A known Next.js behavior (#37). Undo it with `git checkout -- AGENTS.md` and never commit that change.
- **Playwright says the browser is missing.** Run `npx playwright install chromium` once.
- **E2E can't start its server.** It always starts its own dev server on port 3100 and never reuses one, so free that port.
- **TypeScript errors about tables or RPC functions after pulling.** Someone added a migration: run `npx supabase db reset`, then `npm run db:types`.
- **A live-update test fails right after `db reset`.** Locally, the first Realtime events after a reset are sometimes missed. Run the test again; CI starts a fresh stack, so it doesn't hit this.

## Environments

| Environment | Database                               | Where the keys come from                                                                                     | Seed data |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| Local       | Local Supabase in Docker               | `npx supabase status` → `.env.local`                                                                         | Yes       |
| CI          | A fresh local Supabase inside each job | [`.github/scripts/supabase-env.sh`](../.github/scripts/supabase-env.sh) exports the job's own throwaway keys | Yes       |
| Preview     | The same hosted project as Production  | Vercel environment variables, Preview scope                                                                  | No        |
| Production  | The hosted Supabase project            | Vercel environment variables, Production scope                                                               | No        |

CI never uses production keys. Preview deploys share the production database for now, so a pull request preview can change real data: don't try destructive things there. A second free Supabase project, with its own keys in the Preview scope, would separate them.

## Deploy

### 1. The hosted Supabase project (once)

1. Create a project in the Supabase dashboard.
2. Link the repo to it and push the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --linked   # applies every migration the project doesn't have yet
   ```

   `db push` never runs `supabase/seed.sql`, so production starts empty. Never run `supabase db reset` or `db push --include-seed` against the hosted project: the seed creates test accounts with a known password. Run `npx supabase db push --dry-run --linked` first to see which migrations it would apply. The migrations call pgcrypto functions as `extensions.gen_random_bytes(...)`, because on hosted Supabase that schema isn't on the CLI's search path (#52); a unit test fails if a migration forgets the prefix.

3. In **Authentication → URL Configuration**, set the Site URL to the production URL and add the preview URLs to the redirect URLs.
4. In **Authentication → Sign In / Providers → Email**, turn **Confirm email** off and set **Minimum password length** to 8. The app expects a session right after sign-up, as the local setup does. With confirmation on, a new user lands on a dead end until they click a link in the email. Hosted projects have it on by default.
5. After the first deploy, sign up in the app once. Then make that account the first site admin in the **SQL editor** (the app itself can never set this flag):

   ```sql
   update public.profiles set is_site_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### 2. Vercel (once)

1. On the Hobby plan only the repository owner can connect it: **Add New → Project → Import** `irisonly9716/commonpot`. Vercel detects Next.js and uses Node 26 from `engines`.
2. In **Settings → Environment Variables**, add for both **Production** and **Preview**:

   | Variable                        | Value from the Supabase project (**Settings → API**) |
   | ------------------------------- | ---------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                                          |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key                               |
   | `SUPABASE_SERVICE_ROLE_KEY`     | service_role / secret key (server only)              |

   The service-role key is used only to suspend users (site admin dashboard). Without it, suspending fails with a JSON error and the rest of the app works.

3. Production deploys from `main` on every merge. Every pull request gets a preview deploy, and Vercel posts its URL on the PR.

### 3. Every schema change

After a PR with a new migration merges, run `npx supabase db push --linked` from an up-to-date `main` with the project linked. Until then, production runs the new code against the old schema, so do it right away. This is the only way the production schema changes: never edit tables in the dashboard.

### 4. Keep-alive

Free Supabase projects pause after a week without activity, and the app has to stay up after the course. [`supabase-keep-alive.yml`](../.github/workflows/supabase-keep-alive.yml) sends one small read request every 3 days and can also be run by hand from the Actions tab. It needs two repository secrets, which only a repo admin can add (**Settings → Secrets and variables → Actions**):

- `SUPABASE_URL`: the project URL
- `SUPABASE_ANON_KEY`: the anon / publishable key

Without them the job only prints a warning. GitHub also turns off scheduled workflows after 60 days without activity in the repository; turn it back on from the Actions tab if that happens.

### 5. Check a deploy

1. Open the production URL, sign up, create a group and log an expense.
2. Open `/api/docs`: Swagger UI loads the spec.
3. `curl -i <production-url>/api/v1/me` without a token returns `401` with the JSON error shape.
