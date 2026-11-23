# Sprint 1 standups

<!-- Standups are posted in Slack, starting with "Here is my daily standup", and copied here. At least 3 per partner per sprint. Always name issue numbers. -->

Copied from our Slack channel, lightly trimmed. Times are Pacific. Sprint 1 was planned for 2026-10-31 to 2026-11-04, and its last PRs merged on 2026-11-09.

Arianna posted three standups this sprint (11/03, 11/07 and 11/09) and Jay posted two (11/03 and 11/06), one short of the three we aimed for. Jay's message of 11/07 covers the same ground, but it wasn't posted as a standup, so it is listed under "Other updates" and not counted.

## 2026-11-03 · Jay

- **Yesterday:** Read the repo, AGENTS.md and the Sprint 1 plan, and set up my access.
- **Today:** Accepted the repo invite and opened PR #23 for #2: the CI pipeline with lint, typecheck, tests, build, E2E, and a security job with `npm audit` and CodeQL. Reviewed PR #22 (placeholder mockups for #5).
- **Need from you / blockers:** PR #23 can't run in CI until the #1 scaffold is merged, because it uses the npm scripts from AGENTS.md. Branch protection for #2 needs admin rights: Arianna, could you set it or make me an admin? Waiting on #1 and #4 before I can start #6 and #7.

## 2026-11-03 · Arianna

- **Done:**
  - #1: the scaffold is in PR #24.
  - #4: the database schema, RLS and seed are in PR #25, based on #24. I checked it against the database myself and fixed what I found.
  - #5: updated PR #22 with Jay's comments.
  - #2: reviewed PR #23 and left comments.
  - Set branch protection on `main`: a PR and one approval are required, admins included. CI becomes a required check once it runs green. Squash merging is off.
  - Assigned #2, #3, #5, #6 and #7 to Jay.
- **Next:** Wait on reviews, then start #8.
- **Need from you / blockers:**
  1. Please review #24 first, because everything else depends on it.
  2. After #24 merges, please update #23 from `main` and address my comments. Tests read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so map those from `supabase status`, and use `npx supabase` (the CLI is pinned in package.json).
  3. Please review #25. It's the base for #6 and #7: `accept_invite(token)` for joining, a trigger that makes a group's creator its first admin, and `group_member_profiles(group_id)` for member names.

## 2026-11-06 · Jay

- **Yesterday:** Went through Arianna's standup and the open PRs.
- **Today:** Reviewed #24 (ran lint, typecheck, tests and build, and all pass) and #25 (read the migration and RLS policies against the PRD). Updated #23 for the review comments (latest action versions, pinned Supabase CLI, `NEXT_PUBLIC_` variable mapping), and will push it after #24 merges.
- **Need from you / blockers:** Waiting on #24 and #25 before I start #6 and #7. My questions on #25 are in the review: leaving a group, suspended users, and function permissions.

## 2026-11-07 · Arianna

- **Yesterday:** Reviewed all updates.
- **Today:**
  - Added the AGENTS.md changelog line Jay asked for and merged #24 (#1 is closed).
  - Fixed the #25 comments: only the payer or the payee can record or delete a payment, and `anon`/`public` execute is revoked on every callable function. All 13 integration tests pass, and I replied to each point on the PR.
  - We're behind the plan, so I'm starting #8 on top of the #25 branch instead of waiting for it to merge, and will rebase once #25 is in.
- **Need from you / blockers:**
  1. Please review and approve #25. It's the last thing blocking `main` for #6, #7 and #8.
  2. You can start #6 and #7 from the #25 branch now, so neither of us is waiting.
  3. Please push your #23 update so I can review it and get CI running.

## 2026-11-09 · Arianna

- **Done:**
  - Merged #23 (CI), #25 (schema), #27, #22 and #28 after Jay's approvals. `main` now requires the 6 CI jobs plus 1 approval.
  - Opened #30: fixes for Jay's #28 review points 1 to 3 (401 before 422, a 404 page for non-members, leftover cents ordered by user id, written into AGENTS.md).
  - Opened #31 for #9: balances, settle-up suggestions and recording payments (payer or payee only), with the OpenAPI spec and a balances page. CI is green.
  - Closed Sprint 1 and moved its open issues to Sprint 2. The Sprint 2 plan is in #33: Jay is PO and Arianna is SM, swapped as planned.
- **Next (Sprint 2 plan):** Jay takes #3, #5, #6, #7, #13, #15, #16, #17 and #18 (accounts, roles, design, deploy and insights). Arianna takes #10, #11, #12, #14 and #19 (expenses, real time, personal ledger, budgets, README). I did most of the Sprint 1 issues, so Jay gets more of the rest. If we run out of time, we drop #18 first, then #17 and #15. The Must stories stay.
- **Need from you / blockers:**
  - Reviews on #30, #31 and #33. They don't touch the same files, so any order works.
  - #6 and #7 are the biggest blockers: without them nothing can be tried in a browser and we can't write E2E tests. Can you open the #6 PR by tomorrow evening?
  - Please add your part of the Sprint 1 retro, including your feedback for me.

## Other updates

These were posted in the same channel but not as standups:

- **2026-11-07 · Jay:** Approved #22, #25, #27 and #28, and updated #23 so its CI run is fully green (lint, typecheck, unit and integration tests, build, E2E, security with CodeQL). Asked to merge #22, #25, #23 and #27 in that order. Review notes on #28: check auth before validating the group id, 404 for people outside the group, and sort members before splitting so the leftover cent is stable. His #6 branch would switch to `getAuthenticatedSupabase` and `apiError` after #28 merges.
