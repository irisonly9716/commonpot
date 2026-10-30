# AGENTS.md — CommonPot

<!--
  Shared rules for every AI tool on this repo. Main tool: VS Code + GitHub Copilot (Agent mode); Claude Code reads CLAUDE.md,
  which contains only "@AGENTS.md". Tool folders (.agents/, .github/instructions/, .claude/) hold only path-scoped rules or skills.
  Both partners own this file: change it only through a PR both approve, review it at every retro, keep it under 200 lines.
-->

## 0. Before you start

<!-- A fixed marker shows at a glance whether the agent actually loaded this file. -->
- Start every reply with 🪙.
- Read the GitHub issue you are working on and the user story it links to in `docs/PRD.md`. Restate its acceptance criteria before writing code.
- For changes that touch more than one file, show a plan first and wait for approval.
- Implement every acceptance criterion in the issue. If one is out of scope for this change, list it in your reply; never drop it silently.

## 1. Project context

CommonPot is a web app where a household, roommates or any small group share one expense account. Members log and split expenses, see who owes whom and get budget alerts in real time; each user also has a private personal ledger. Full requirements: [docs/PRD.md](docs/PRD.md). Two developers, Arianna and Jay Choudhary, review each other's PRs; sprint roles are recorded in `docs/sprints/sprint-N/planning.md`.

### Tech stack

<!-- Checked on npm, nodejs.org and Vercel's docs on 2026-10-29. "Latest stable" = newest release that works with the stack:
  TypeScript stays on 6.0 (typescript-eslint supports < 6.1); ESLint stays on 9 (eslint-config-next's plugins support ≤ 9). -->

| Area | Choice | Version |
| --- | --- | --- |
| Runtime | Node.js LTS (Vercel default) | 26.x |
| Framework | Next.js (App Router) + React | 16.4.x / 19.3.x |
| Language | TypeScript, strict mode | 6.0.x |
| Styling | Tailwind CSS (theme generated from DESIGN.md) + shadcn/ui | 4.3.x / CLI 4.x |
| Backend | Next.js route handlers under `src/app/api/v1` | — |
| Database, auth, real time | Supabase (PostgreSQL, Auth with JWT, Realtime): `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI | 2.118.x / 0.12.x / 2.122.x |
| Validation and forms | Zod, React Hook Form + `@hookform/resolvers` | 4.6.x / 7.91.x / 6.0.x |
| Charts | Recharts | 3.10.x |
| API docs | OpenAPI 3.1 in `docs/api/openapi.yaml`, `swagger-ui-react`, Redocly CLI (lint) | 5.34.x / 2.72.x |
| Tests | Vitest + `@vitest/coverage-v8`, React Testing Library, Playwright + `@axe-core/playwright` | 5.0.x / 16.3.x / 1.64.x / 4.14.x |
| Lint and format | ESLint (flat config) + `eslint-config-next`, Prettier, Husky + lint-staged | 9.39.x / 16.4.x / 3.9.x / 9.1.x / 17.6.x |
| Hosting | Vercel: production from `main`, a preview deploy for every PR | — |

- Exact versions live in `package-lock.json`. Never upgrade a major version inside a feature PR.
- Your training data may be older than these versions. For Next.js 16, Tailwind 4, Zod 4 and Supabase APIs, check the official docs for the installed version instead of relying on memory.

### Commands

<!-- Exact commands so the agent never guesses. The scaffold issue creates these npm scripts; keep this table in sync with package.json. -->

| Task | Command |
| --- | --- |
| Install · dev server | `npm ci` · `npm run dev` |
| Local Supabase (needs Docker) | `npx supabase start` |
| Reset local DB (migrations + seed) · new migration | `npx supabase db reset` · `npx supabase migration new <name>` |
| Regenerate DB types | `npm run db:types` → `src/lib/db/database.types.ts` |
| Lint · format · type-check · API spec | `npm run lint` · `npm run format` · `npm run typecheck` · `npm run api:lint` |
| Tests: unit · coverage · integration · E2E | `npm test` · `npm run test:coverage` · `npm run test:integration` (local Supabase running) · `npm run test:e2e` |
| Lint DESIGN.md · export Tailwind theme | `npx @google/design.md lint DESIGN.md` · `npx @google/design.md export --format css-tailwind DESIGN.md > src/app/theme.css` |
| Everything before opening a PR | `npm run check` (lint, typecheck, unit, integration) |

CI runs on every PR: lint and format → typecheck → unit and integration tests → build → E2E, plus a security job (`npm audit --audit-level=high` and CodeQL).

### Architecture

```
src/
  app/                 pages (App Router) and route handlers
    api/v1/            public REST API; the web UI calls the same routes
    api/docs/          Swagger UI page for docs/api/openapi.yaml
  components/
    ui/                shadcn/ui primitives, styled with DESIGN.md tokens
    <feature>/         groups/, expenses/, balances/, budgets/, insights/, ledger/, admin/
  lib/
    domain/            pure business logic (splits, balances, settle-up, budgets, personal totals); no React/Next/Supabase imports
    data/              data access with the signed-in user's Supabase client (RLS applies)
    db/                Supabase clients and generated types
    validation/        Zod schemas shared by forms and API routes
    api/               route helpers: auth, permission checks, error responses
supabase/
  migrations/          schema and RLS policies (SQL), one file per change
  seed.sql             seed data used by both partners and CI
tests/unit/  tests/integration/  e2e/
docs/                  PRD.md, design/, api/openapi.yaml, architecture.md, decisions/, sprints/
```

Key patterns:
- **Route handler shape:** validate input with Zod → get the user from the session or the `Authorization: Bearer` token → check permission → call `lib/data` and `lib/domain` → return JSON. Errors go through one helper and always look like `{ "error": { "code": "...", "message": "..." } }` with the right status (400, 401, 403, 404, 409, 422).
- **One write path:** UI mutations call `/api/v1` (no Server Actions), so permissions are checked in one place. Server Components may read through `lib/data` with the user's Supabase client, so RLS still applies.
- **Money:** integer cents everywhere (`amountCents`). Format only for display with `formatMoney(cents, currency)` (`Intl.NumberFormat`); messages shown to users never contain raw cents.
- **Derived numbers:** balances, budget progress and personal totals are calculated by `lib/domain` from expenses and payments, never stored or edited by hand.
- **Real time:** client components subscribe to a group through one hook, `useGroupRealtime(groupId)`, update state from events, show "Reconnecting…" while disconnected, and unsubscribe on unmount.

### Naming and code style

- Files and folders: kebab-case (`expense-form.tsx`). Components: PascalCase. Variables and functions: camelCase. Hooks start with `use`.
- Database: snake_case, plural table names (`expenses`, `expense_shares`); timestamps are `timestamptz` named `created_at` / `updated_at`.
- API paths: plural nouns nested under the group, e.g. `/api/v1/groups/{groupId}/expenses/{expenseId}`. JSON fields are camelCase.
- Money fields end with `Cents`. Dates are ISO strings (`2026-10-29`).
- Prettier defaults with 2-space indent; ESLint passes with zero warnings; TypeScript strict with no `any` and no `@ts-ignore` (use `unknown` and narrow it).

### Testing strategy

<!-- Reviewers check TDD in the git history: the failing tests must be committed before the code that makes them pass. -->
- **TDD on every issue:**
  1. Write tests from the issue's acceptance criteria. Run them and show that they fail.
  2. Commit: `test(<scope>): add failing tests for <behavior> (#N)`.
  3. Write the smallest code that passes. Commit: `feat(<scope>): <summary> (#N)`.
  4. Refactor with the tests green. Commit: `refactor(<scope>): <summary> (#N)`.
- **Unit (Vitest):** all of `lib/domain` and `lib/validation`, plus components with logic (React Testing Library, query by role and label). Coverage of `src/lib/domain` stays at 80% of lines or more; CI fails below that.
- **Integration (Vitest + local Supabase):** every API route: success, validation error, 401, 403, and RLS (a user in group A can't read group B; no one but the owner can read a personal ledger).
- **E2E (Playwright):** the user flows in section 2, including a two-browser test that a new expense reaches another member within 2 s, and an axe scan of every main page.
- Name tests by behavior and group them by story: `describe("US3 log and split an expense")`, `it("gives leftover cents to members one at a time")`.
- Never weaken, skip or delete a test to make it pass; if a test looks wrong, stop and ask. Test data comes from `supabase/seed.sql` or helpers in `tests/`, never from production.

## 2. PRD and design references

- **PRD:** [docs/PRD.md](docs/PRD.md) has US1–US13 with acceptance criteria, the roles and the out-of-scope list. The acceptance criteria are the spec: build what they say and nothing from the out-of-scope list.
- **Design system:** UI work follows [DESIGN.md](DESIGN.md) (colors, type, spacing, components). Use its tokens through the Tailwind theme; never hard-code colors or font sizes.
- **Mockups:** `docs/design/`, one image per screen. They are the source of truth for layout. If a mockup and the PRD disagree, follow the PRD and point out the difference.
  - Placeholders until #5: `group-home.png` (balance first, then budgets, live feed, Add expense button), `add-expense-equal.png` (shares listed per member), `add-expense-exact.png` (amount left shown live, Save disabled until it is $0.00). Source: `mockup.html`.
- **Avoid the generic AI look:** no colored side stripes on cards, no rows of three identical cards, no oversized rounded corners, no gradients that DESIGN.md doesn't define.
- **Mobile first:** one column on phones, two columns from 1024 px.

Screens and key components:

| Screen | Components | Expected behavior |
| --- | --- | --- |
| Group home | `BalanceSummary`, `BudgetBar`, `ActivityFeed`, "Add expense" | What I owe or am owed comes first, without scrolling, in words and +/− signs, not color alone. The feed is newest first and updates live. |
| Add / edit expense | `ExpenseForm`, `SplitEditor` | Amount, description, category, date, paid by (default me), shared by (default everyone). Equal or exact split; an exact split shows the amount left live and can't be saved until it is 0. Errors appear next to their fields. |
| Settle up | `SettleUpList`, `PaymentForm` | Suggested payments; "Record payment" updates both balances. Never suggests that money is sent. |
| Insights | `SpendingChart`, `ChartTable` | Me and Group views, a month picker, a chart by category and a 6-month trend; every chart has a table toggle. |
| My spending | `LedgerList`, `SpendingChart` | Private ledger plus my shares from every group; totals by category and by source. |
| Group settings | `MemberList`, `InviteLink`, `CategoryList`, `BudgetForm` | Admin-only controls are not rendered for members. |
| Site admin | `AdminUserTable`, `AdminGroupTable` | Counts and account status only, never amounts. |
| Every page | `AlertToast`, `ConnectionStatus` | In-app alerts (budget at 80% / 100%, an admin deleted my expense); "Reconnecting…" when real time drops. |

User flows to follow:
1. **First run:** sign up → empty state with "Create a group" → create the group (I become admin) → copy the invite link.
2. **Join:** open an invite link → sign in or sign up → join as a member → land on group home. An expired or revoked link shows a clear message.
3. **Log an expense:** group home → "Add expense" → save → it appears at the top of the list for every member within 2 s, and balances update.
4. **Settle up:** balances → "Settle up" → choose a suggested payment → record it → both balances update.
5. **Admin deletes someone else's expense:** confirm → it disappears for everyone, the person who logged it gets an alert, and the feed shows who deleted it.
6. **Budget alert:** an admin sets a monthly category budget → spending reaches 80%, then 100% → every member gets one alert per threshold per month.
7. **Personal ledger:** "My spending" → add a personal expense → monthly totals by category and source update.

Permissions (enforced in API routes and RLS, not only by hiding buttons):
- Only the person who logged an expense can edit it. They can delete it, and a group admin can delete any expense in the group.
- Only group admins manage members, roles, invites, categories and budgets. A group always keeps at least one admin.
- A personal ledger is visible only to its owner, not to group admins or site admins.
- Site admins see counts and account status only, never amounts or expense details.

## 3. Scrum and Git workflow

<!-- Board columns: Backlog → Sprint Todo → In Progress → In Review → Done. One issue = one branch = one PR. -->
- **Branches:** one per issue, named `<type>/<issue#>-<short-description>`: `feature/12-equal-split`, `fix/31-balance-rounding`, `chore/3-ci-pipeline`, `docs/40-setup-guide`.
- **Commits:** Conventional Commits ending with the issue number: `type(scope): summary (#N)`, imperative, 72 characters at most, e.g. `feat(expenses): add exact-amount split (#12)`.
  - Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Scopes: `auth`, `groups`, `expenses`, `balances`, `budgets`, `insights`, `ledger`, `admin`, `api`, `db`, `ui`.
- **Before opening a PR:** run `npm run check`, then review your own diff for bugs, security issues and violations of this file, and list what you found.
- **Pull requests:** the title uses the commit format; the body follows `.github/pull_request_template.md`, starts with `Closes #N`, says how it was tested and has screenshots for UI changes. Merge only when CI is green and the partner has approved. Merge with **"Create a merge commit"**, never squash, so the failing-test commits stay in history.
- **Referencing issues:** commits end with `(#N)`, PR bodies use `Closes #N`, and every TODO names an issue: `// TODO(#N): ...`.
- **Stay in scope:** work only on the current issue. If you find a bug or a missing piece, collect the error and logs and open a new issue labeled `bug` with `gh issue create` (steps, expected, actual); don't fix it in this branch.
- **Labels:** a type (`feature`, `bug`, `chore`, `docs`), a priority (`priority:high`, `priority:medium`, `priority:low`) and an estimate (`size:S` < 1 h, `size:M` 1–4 h, `size:L` > 4 h, which should be split). Sprints are milestones, not labels.
- API changes update `docs/api/openapi.yaml` in the same PR. Schema changes are new migration files; never edit a migration that is already on `main`.

## 4. Do's and don'ts

**Do**
- Reuse `lib/domain` functions and the shared Zod schemas instead of re-implementing logic in components or routes.
- Validate input with the Zod schemas in `lib/validation` (forms, routes and domain entry points), not hand-written regex checks.
- Use Server Components by default; add `"use client"` only for forms, charts, real time and other interactivity.
- Handle loading, empty and error states on every screen.
- Before adding any dependency: check its latest stable version (`npm view <pkg> version` and its docs) and that it works with our versions, explain why we need it, and wait for approval. Then run `npm audit`.
- Prefer what we already use: shadcn/ui, Zod, React Hook Form, Recharts, the Supabase client, native `fetch`, and `Intl` for money and dates.

**Don't**
- Don't add another UI kit, CSS-in-JS, a state library (Redux, Zustand), an ORM (Prisma, Drizzle), axios, moment or lodash.
- Don't use Server Actions for mutations, floats for money, or `any`; don't write to Supabase from client components (writes go through `/api/v1`).
- Don't edit AGENTS.md, DESIGN.md, `docs/PRD.md`, `.github/workflows/` or merged migrations unless the issue asks for it.
- Don't run `git push --force`, deploy, or touch the production database.

**Security**
- Never read, print or commit `.env*` files or secrets. `.env.example` lists variable names only; local, preview and production each have their own values in Vercel and Supabase.
- The Supabase secret (service-role) key is server-only and never goes in a `NEXT_PUBLIC_` variable.
- Every table has RLS enabled, with its policies in the same migration. Never trust a user id or role sent by the client; read it from the verified token.
- Validate every request body, query and path parameter with Zod on the server. No SQL built from strings.
- Keep sign-in errors generic. Never log tokens, passwords or whole request bodies.

**Accessibility (WCAG 2.1 AA)**
- Every input has a visible `<label>`; error messages are linked with `aria-describedby`.
- Everything works by keyboard with a visible focus ring; dialogs trap focus and give it back when they close.
- Text contrast is at least 4.5:1, touch targets at least 44 px, and color is never the only signal (owes / is owed, budget states).
- Every chart has a table view; live updates are announced with `aria-live="polite"`. Critical axe violations fail CI.

## Changelog

<!-- Each change to this file goes through a PR approved by both partners and adds a line here. -->
- v1 · 2026-10-30 · Arianna · First draft, based on PRD v0.2.
- v2 · 2026-10-30 · Arianna · After the before/after test on #8: cover every acceptance criterion, Zod for all validation, no raw cents in messages, describe the placeholder mockups (#20).
