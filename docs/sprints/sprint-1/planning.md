# Sprint 1 planning

<!-- Draft by Arianna. Becomes final when both partners approve the PR that adds it. -->

| | |
| --- | --- |
| Dates | [[2026-10-31]] → [[2026-11-04]] (milestone "Sprint 1") |
| Product Owner | Arianna |
| Scrum Master | Jay Choudhary |
| Roles next sprint | PO and SM swap in Sprint 2 |

## Sprint goal

A signed-in member can create a group, invite someone, log a split expense and see correct balances on a deployed app, with CI running on every PR.

## Selected issues

| # | Issue | Estimate | Owner |
| --- | --- | --- | --- |
| 1 | Scaffold the Next.js app with TypeScript, Tailwind, ESLint, Prettier and Vitest | M | Arianna |
| 2 | Set up the CI pipeline with tests and security scanning | M | Jay |
| 3 | Deploy the app to Vercel with PR previews and per-environment variables | S | Jay |
| 4 | Create the database schema, RLS policies and seed data | M | Arianna |
| 5 | Add DESIGN.md and mockups for the main screens | M | Jay |
| 6 | Let users sign up, sign in and sign out (US1) | M | Jay |
| 7 | Create a group and invite members with a link (US2) | M | Jay |
| 8 | Add an expense with an equal or exact split (US3) | M | Arianna |
| 9 | Show balances and suggest settle-up payments (US5) | M | Arianna |
| 10 | Edit and delete expenses with role checks and deletion alerts (US6) | M | Arianna |

Estimates: S < 1 h, M 1–4 h. Each partner has 5 issues.

## Order and interfaces

- #1 goes first; every other branch starts from it.
- #4 defines the tables and the TypeScript types that #6–#10 use. Before splitting the feature work, both partners agree on the API shapes in `docs/api/openapi.yaml` for groups, expenses and balances.
- #2 and #3 go in early, so every later PR gets CI and a preview deploy.

## Definition of done

- The issue's acceptance criteria are checked off
- Failing tests were committed before the implementation
- CI is green and the partner approved the PR
- The card is in Done on the board
