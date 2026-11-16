# CommonPot

Shared expense accounts for households, roommates and small groups. Members log and split expenses, see who owes whom and get alerts as things change, and each person also keeps a private personal ledger.

**Live app:** https://commonpot.vercel.app · **API docs (Swagger UI):** https://commonpot.vercel.app/api/docs

## What it does

| Who            | What they can do                                                                                                                       | Story          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Everyone       | Sign up and sign in with email and password; signed-out visitors are sent to sign-in and back                                          | US1            |
| Group member   | Create a group or join one with an invite link; log an expense and split it equally or by exact amounts; edit or delete their own ones | US2, US3, US6  |
| Group member   | See expenses, balances and the activity feed update live, with "Reconnecting…" while offline; settle up with suggested payments        | US4, US5       |
| Group member   | See where the money goes: Me and Group views by category and a 6-month trend, each chart with a table                                  | US8            |
| Group member   | Keep a private ledger: personal expenses plus their share of every group, by category and by source, per month                         | US10           |
| Group admin    | Invite people, promote members, remove members (with the balance shown first), add, rename and archive categories, delete any expense  | US2, US6, US11 |
| Site admin     | See users and groups with sign-up dates and counts, never amounts; suspend and reactivate accounts; edit the default categories        | US12           |
| Other software | Use the same REST API as the web app with a bearer token; every route is documented in OpenAPI 3.1                                     | US13           |

Not built in this release: US7 (budget alerts) and US9 (each member's share). The full requirements are in [docs/PRD.md](docs/PRD.md).

## Run it locally

You need Node.js 26 and Docker (for the local Supabase stack).

```bash
npm ci
npx supabase start            # starts Postgres, Auth and Realtime in Docker
cp .env.example .env.local    # then fill it in from: npx supabase status
npx supabase db reset         # runs every migration and loads supabase/seed.sql
npm run dev                   # http://localhost:3000
```

In `.env.local`, `NEXT_PUBLIC_SUPABASE_URL` is the local API URL, `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon key and `SUPABASE_SERVICE_ROLE_KEY` is the service role key, all from `npx supabase status`. Never commit `.env.local`.

The seed creates these local accounts. Their password is in [supabase/seed.sql](supabase/seed.sql); they exist only on your machine, never in production.

| Email                      | Role                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `admin@example.com`        | Admin of "Iris household"                                     |
| `member@example.com`       | Member of "Iris household"                                    |
| `third-member@example.com` | Member of "Iris household"                                    |
| `other-member@example.com` | Admin of "Other household", a separate group for checking RLS |
| `site-admin@example.com`   | Site admin, in no group                                       |

More detail, troubleshooting and the full deployment guide: [docs/setup.md](docs/setup.md).

## Tests

| Command                    | What it runs                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm test`                 | Unit tests (Vitest, React Testing Library)                                              |
| `npm run test:coverage`    | Unit tests with coverage; `src/lib/domain` must stay at 80% of lines or more            |
| `npm run test:integration` | API and RLS tests against the local Supabase stack (it must be running)                 |
| `npm run test:e2e`         | Playwright, including a two-browser live update; starts its own dev server on port 3100 |
| `npm run check`            | Lint, typecheck, unit and integration tests: run this before opening a PR               |
| `npm run api:lint`         | Lints `docs/api/openapi.yaml` with Redocly                                              |

The first E2E run needs a browser: `npx playwright install chromium`.

## API

The web app and other software use the same REST API under `/api/v1`. Swagger UI is at `/api/docs`, and the spec is [docs/api/openapi.yaml](docs/api/openapi.yaml). To call it from a script, get a token first:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/token \
  -H "content-type: application/json" \
  -d '{"email":"member@example.com","password":"<password>"}'
# → { "tokenType": "bearer", "accessToken": "…", "expiresIn": 3600, "user": { … } }

curl -s http://localhost:3000/api/v1/groups -H "authorization: Bearer <accessToken>"
```

Errors always look like `{ "error": { "code": "…", "message": "…" } }`.

## Deployment

Production runs on Vercel from `main`, and every pull request gets a preview deploy. The database, auth and realtime are a hosted Supabase project. Schema changes reach production only as migration files, with `npx supabase db push`; the seed is never pushed. The step-by-step guide, the environment variables for each environment and the keep-alive job are in [docs/setup.md](docs/setup.md#deploy).

## CI/CD

Every pull request and every push to `main` runs [.github/workflows/ci.yml](.github/workflows/ci.yml): lint and format → typecheck → unit and integration tests (against a fresh local Supabase) → build → E2E, plus a security job with `npm audit` and CodeQL. `main` is protected: a PR needs green CI and the partner's approval, and is merged with a merge commit so the failing-test commits stay in the history. A scheduled job pings the production database so the free Supabase project doesn't pause.

## Docs

| What                                | Where                                                |
| ----------------------------------- | ---------------------------------------------------- |
| Product requirements (US1–US13)     | [docs/PRD.md](docs/PRD.md)                           |
| Architecture and diagrams           | [docs/architecture.md](docs/architecture.md)         |
| Database schema, RLS and functions  | [docs/database.md](docs/database.md)                 |
| Setup and deployment guide          | [docs/setup.md](docs/setup.md)                       |
| API spec                            | [docs/api/openapi.yaml](docs/api/openapi.yaml)       |
| Decisions (ADRs)                    | [docs/decisions/](docs/decisions/)                   |
| Sprints: planning, standups, retros | [docs/sprints/](docs/sprints/)                       |
| Contribution log                    | [docs/contributions.md](docs/contributions.md)       |
| Design system and mockups           | [DESIGN.md](DESIGN.md), [docs/design/](docs/design/) |
| Rules for AI agents                 | [AGENTS.md](AGENTS.md)                               |
| Project proposal                    | [docs/proposal.md](docs/proposal.md)                 |

## Stack

Next.js 16 (App Router) + React 19 + TypeScript 6, Tailwind CSS 4 with a theme generated from DESIGN.md, Supabase (PostgreSQL with RLS, Auth, Realtime), Zod, Recharts, Vitest and Playwright, deployed on Vercel. Exact versions and every command are in [AGENTS.md](AGENTS.md).

## Team

Arianna Ge and Jay Choudhary. Who did what is in the [contribution log](docs/contributions.md).
