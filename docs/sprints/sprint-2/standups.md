# Sprint 2 standups

<!-- Standups are posted in Slack, starting with "Here is my daily standup", and copied here. At least 3 per partner per sprint. Always name issue numbers. -->

Copied from our Slack channel, lightly trimmed. Times are Pacific. Sprint 2 ran from 2026-11-10 to 2026-11-15, and the last merges happened on 2026-11-16. Each of us posted three standups this sprint.

## 2026-11-11 · Jay

- **Yesterday (11/10):**
  - Opened #35 for #6 (sign up, sign in, sign out, API 401). CI is green, including 6 browser tests. It uses `getAuthenticatedSupabase` and `apiError`.
  - Opened #36 for #5 (DESIGN.md, five mockups, the Tailwind theme export). DESIGN.md lints with 0 errors and 0 warnings. CI is green.
  - Opened #40 for #7 (groups, invite links, members with roles), stacked on #35. CI is green.
  - Reviewed and approved #30, #31, #33 and #34. Ran each one, and tried #31's balances page in a browser on top of #35.
  - Opened #37 (stop `next dev` rewriting AGENTS.md), #38 (axe accessibility scan) and #39 (restyle the pages with the design tokens).
- **Today (11/11):** #13: the API sign-in endpoint (`POST /api/v1/auth/token`) and a contract test are done on `feature/13-public-api`. The contract test checks that every route is in `openapi.yaml` and answers 401 in the shared error shape. Swagger UI at `/api/docs` comes next, then #16 and #15.
- **Need from you / blockers:**
  - Please review #35 first, then #40 and #36. #40 builds on #35, and sign-in unblocks the browser tests.
  - Merge order that avoids most conflicts: #30, #31, #34, #35, #40, #36. I'll resolve any `openapi.yaml` or AGENTS.md conflict on my side after each merge.
  - For #3, who creates the production Supabase and Vercel projects?

## 2026-11-13 · Arianna

- **Today:**
  - Re-reviewed and merged #35 (sign-in) and #36 (DESIGN.md).
  - Finished #11 and opened #44: when one of us adds, edits or deletes an expense or records a payment, the other sees it within about 2 seconds. If the connection drops, the page says "Reconnecting…" and catches up. Unit, integration and a two-browser E2E test are in.
  - Bad news: since #35 and #36 landed together, the sign-in form and `/groups` are squeezed to almost no width, and `main`'s E2E is red. Our DESIGN.md spacing tokens (`sm`, `xl`, …) override Tailwind's `max-w-sm` and `max-w-xl`, which become 8px and 20px. That one is on me: I merged both without re-running E2E on the combined code.
- **Next:** #12 (personal ledger), then #19 (docs).
- **Need from you / blockers:**
  - Could you take the width bug first? Renaming the spacing tokens in DESIGN.md and re-exporting `theme.css` should fix it, and it fails E2E on every PR.
  - My review notes on #40 are still open (the duplicate `Forbidden`, reusing `requireGroupMember` and `readJsonBody`, the balances link). #41 needs a rebase.
  - #44 and #43 are waiting for your review.
  - For #3, Vercel only lets the repo owner connect the repo, so I'll do that step. Supabase pauses free projects after a week without activity and the app has to stay up for six months, so we need a keep-alive.

## 2026-11-14 · Jay

- **Done since my last standup:**
  - Fixed the width bug: renamed the DESIGN.md spacing tokens to `space-1` … `space-6` (#45, merged as #46). A new test checks the sign-in form, sign-up form and `/groups` at phone width.
  - Fixed the review notes on #40 and #41, and both are merged. API sign-in no longer returns a refresh token.
  - Reviewed and approved #44 (merged) and commented on #43.
  - Opened #47 for #15 (Me and Group charts with table views) and fixed the four review notes, including the month picker, the visitor's own month and percents that add up to 100.
  - Opened #48 for #17 (site admin dashboard and suspension) and fixed the three notes. A suspended user is now locked out of every table, not only the API.
  - Opened #54 for #16 (member roles, removing members, leaving and categories), tests first, with a `leave_group` migration and API docs.
  - Added a keep-alive for Supabase (#49, merged as #50).
  - Created the production Supabase project. The first push failed on a pgcrypto call, so I fixed it in #52 (PR #53) and pushed the schema and realtime migrations to production from that branch.
- **Next:** #18 (each member's monthly share) and the Insights link on the group page once #47 is merged, another `db push` after #48 and #54, and the README deploy section for #19.
- **Need from you / blockers:**
  - Please review #53 and #54, and merge #53 first, because production already has that fix. Suggested order: #53, #47, #48, #54.
  - On #48, may I add the `server-only` package? On #54, I added an optional `balanceCents` to the shared `ApiError` schema.
  - For #3, the Supabase project is ready. I'll invite you to the org so you can copy the keys into Vercel yourself.
  - PR previews would use the production database unless we make a second free project. Do you want one?
  - For the keep-alive, please add the repo secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` and run the workflow once by hand.
  - #37, #38 and #39 have no owners. I suggest leaving #38 and #39 for after the deadline.

## 2026-11-15 · Arianna (morning)

- **Yesterday:**
  - #11 live updates merged (#44).
  - Finished #12, the personal ledger and My spending page. It's up as #51.
  - #41 merging first caused conflicts in #47 and #48, so I merged `main` into both branches, then merged #47 and #48.
  - Reviewed and approved #53 and #54, fixed #54's `openapi.yaml` conflict with `main`, and merged both.
  - Opened #55 for #19: README, setup guide, architecture and schema diagrams, contribution log.
- **Today:** Connect Vercel and add the keep-alive secrets. Put the production URL in the README and merge #55, #51 and #43 once approved. Feature freeze, then a full pass on the deployed app. Then the Sprint 2 review and retro, standups into the repo, the contribution log, the demo video and the reflection, and submit. Dropping #14 (budgets, a Should): not enough time, noted in the retro.
- **Need from you / blockers:** Reviews on #51, #43 and #55. Production still needs a `db push` for the #48 and #54 migrations, plus the Auth Site URL and "Confirm email" settings.

## 2026-11-15 · Arianna (afternoon)

- **Done since this morning:**
  - We're live at <https://commonpot.vercel.app>. Vercel deploys production from `main` and builds a preview for every PR. The keys are set for Production and Preview.
  - Added the keep-alive secrets and ran the workflow by hand: Supabase answered 200.
  - Found that signing in from `/` landed on the empty placeholder page from the scaffold. Opened #56 and fixed it in #57, tests first.
  - Styled the pages with the DESIGN.md tokens (#39, PR #58): base styles for every page, your own balance first on the balances page, and one group nav on every group page.
  - Wrote the standups and both retros into the repo (#62).
- **Next:** Merge #43, #51 and #55 (approved), then #57, #58, #60 and #61 once reviewed. Refresh the contribution log, record the demo video, write the reflection and submit.
- **Need from you / blockers:**
  - Reviews on #57, #58 and #62. In #62, please add or rewrite your feedback for me in both retros, and add today's standup.
  - #58 and #60 both change the group page's navigation and conflict there: #58's group nav already links Insights from every group page. Shall I merge #58 first and update #60, or would you rather close #60?
  - #58 and #61 both touch `insights-view.tsx`. Git merges them cleanly, but I'll run the tests on the combined code before merging.

## 2026-11-16 · Jay

- **Since my last standup (11/14):**
  - Reviewed and approved #55 (README and docs), #43 (Sprint 2 plan) and #51 (personal ledger). I ran #51 on a merge with `main` and all checks passed. On #55 I pushed one commit with fixes to the deploy section.
  - Opened #60 for #59: it links the group page to Insights, which was only reachable by typing the address.
  - Opened #61 for #18 (each member's monthly share, chart and table in the Group view). It is a Could and the freeze has passed, so it is Arianna's call whether to merge it.
  - Checked what is left to push to production. A dry run shows three migrations waiting: the two for #48 and the one for #54.
- **Today:** Push those three migrations with `db push`. In Supabase, turn Confirm email off, set the minimum password length to 8, and set the Auth Site URL and redirect URLs. Make my account the first site admin and check the live site end to end. Then my reflection, the Sprint 2 retro and the demo.
- **Need from you / blockers:**
  - Please review #60 and #61.
  - Confirm email goes off, because the app expects a session right after sign-up. Previews sharing the production database is fine for today.
  - After the last merges, please refresh the counts in the contribution log.
  - Once we have both checked the live site, #3 can be closed.

## Other updates

These were posted in the same channel but not as standups:

- **2026-11-11 · Jay (1:06 am):** #35, #36 and #40 are open with CI green. Approved #30, #31, #33 and #34, proposed a merge order and a freeze at noon on 11/12, and asked who creates the production Supabase and Vercel projects.
- **2026-11-11 · Arianna:** Reviews on #35 (the `next` value is dropped between sign-in and sign-up), #40 (duplicate `Forbidden` response in `openapi.yaml`), #41 (rebase after #35 and #40) and #36 (6-month bars, changelog version). The deadline moved to 11/15, so the freeze moved to the evening of 11/14 (#43). For #3, Arianna creates the Vercel project and Jay the production Supabase project.
- **2026-11-14 · Jay:** Asked to be added to the Vercel project to set the variables himself. Vercel Hobby can't add team members, so Arianna copied the keys from the Supabase dashboard instead.
- **2026-11-15 · Arianna:** "We're live", with the checks on production and the next steps for Jay (`db push`, Auth settings, reviews).
- **2026-11-16 · Jay (2:57 am):** Reviewed and approved #57, #58, #63 and #65, and asked to merge #67, #65, #66 and #63 in that order. The three migrations are on production, Confirm email is off, the minimum password is 8, and his account is the site admin. The Auth Site URL and redirect URLs were still to do.
