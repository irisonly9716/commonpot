# Sprint 2 review and retrospective

## Review

<!-- Which issues reached Done, what was demoed, which moved to the next sprint and why. -->

Planned for 2026-11-10 to 2026-11-12, and re-planned twice when the deadline moved to 2026-11-15 (#43). Written on 2026-11-15 and updated on 2026-11-16 after the final merges.

Reached Done:

| #   | Issue                                                                                   | PR  | Owner   |
| --- | --------------------------------------------------------------------------------------- | --- | ------- |
| 5   | Add DESIGN.md and mockups for the main screens                                          | #36 | Jay     |
| 6   | Let users sign up, sign in and sign out (US1)                                           | #35 | Jay     |
| 7   | Create a group and invite members with a link (US2)                                     | #40 | Jay     |
| 9   | Show balances and suggest settle-up payments (US5)                                      | #31 | Arianna |
| 10  | Edit and delete expenses with role checks and deletion alerts (US6)                     | #34 | Arianna |
| 11  | Update expenses, balances and the activity feed in real time (US4)                      | #44 | Arianna |
| 12  | Track personal expenses and totals across groups (US10)                                 | #51 | Arianna |
| 13  | Publish the public REST API docs and API sign-in (US13)                                 | #41 | Jay     |
| 15  | Show Me and Group spending charts (US8)                                                 | #47 | Jay     |
| 16  | Let group admins manage members, roles and categories (US11)                            | #54 | Jay     |
| 17  | Build the site admin dashboard with account suspension (US12)                           | #48 | Jay     |
| 18  | Show each member's monthly share (US9)                                                  | #61 | Jay     |
| 19  | Write the README, setup guide, architecture and schema diagrams                         | #55 | Arianna |
| 29  | Fix expense API and page issues from the #28 review                                     | #30 | Arianna |
| 32  | Record the Sprint 1 review and the Sprint 2 plan                                        | #33 | Arianna |
| 39  | Style the auth, expenses and balances pages with the design tokens                      | #58 | Arianna |
| 42  | Update the Sprint 2 plan for the 2026-11-15 deadline                                    | #43 | Arianna |
| 45  | Fix: DESIGN.md spacing tokens override Tailwind max-w sizes                             | #46 | Jay     |
| 49  | Keep the production Supabase project from pausing                                       | #50 | Jay     |
| 52  | Fix: the schema migration fails on hosted Supabase                                      | #53 | Jay     |
| 56  | Fix: signing in from the home page lands on an empty placeholder                        | #57 | Arianna |
| 59  | Link the group page to Insights                                                         | #60 | Jay     |
| 62  | Record the standups and the Sprint 1 and 2 retrospectives                               | #63 | Arianna |
| 64  | Fix: the expenses page doesn't catch up when the first request after reconnecting fails | #65 | Arianna |

Two more PRs had no issue of their own: Jay's #66 refreshed the contribution log, and his #67 made an admin test check field names instead of searching the response text.

Deploy (#3) is done in practice: production runs at <https://commonpot.vercel.app> from `main`, every PR gets a Vercel preview, Jay set up the hosted Supabase project, its migrations and the keep-alive, and Arianna connected Vercel and set its variables. We close #3 after we both check the live site.

Not done, moved to the next sprint:

- **#14 Budgets with 80% and 100% alerts (US7, Should).** Dropped on the last day to keep every Must story. The `budgets` table, its RLS policies and the alert columns already exist, so only the API and the UI are left.
- **#38 axe accessibility scan (chore).** Deferred. Accessibility was checked through labels, roles, 44px targets and keyboard focus instead.
- **#37 `next dev` rewrites AGENTS.md (chore).** Worked around with `git checkout -- AGENTS.md`, which `docs/setup.md` explains.

Demo: the live app at <https://commonpot.vercel.app> and the demo video.

## Retrospective

Written on 2026-11-15 and updated on 2026-11-16, from our standups, PR reviews and Slack messages. Each of us checked our own feedback in review.

### What went well

- **A lot shipped in a few days.** Every Must story (US1 to US6, US10, US13), three Should stories (US8, US11, US12) and the Could story US9 are built, tested first and reviewed.
- **Reviews found real bugs.** #35 dropped `next` between sign-in and sign-up, so someone invited by link would land on `/groups` without joining. #40 added a second `Forbidden` response that Git merged silently but that broke `api:lint` and Swagger UI. #47 picked the server's UTC month instead of the visitor's.
- **Checks on the combined code.** Before merging related PRs we ran the full suite on a local merge, and the contract test from #41 fails if a route is missing from `openapi.yaml`. Together they caught problems that each PR's own CI could not see.
- **Deploying found what tests couldn't.** The first `db push` to the hosted project showed a migration that only worked locally (#52), and the first sign-in on production showed the empty home page (#56). Both were fixed with tests that prevent them from coming back.
- **A flaky test fixed at its root.** Instead of re-running the offline E2E test until it passed, Arianna logged its requests and page loads under load and found the cause: a server refresh that ran offline reloaded the page into the browser's error page. #65 fixed it, with tests committed first, and Jay's #67 made a fragile admin test check field names.
- **Clear writing.** PR descriptions listed honest limits and what was tested, standups named issue numbers, and the ADRs recorded why we chose each design.

### What didn't

- **Deadline confusion.** We planned for 11/12, then 11/13, then 11/15, and re-planned each time (#43).
- **Merging two green PRs broke `main`.** #35 and #36 passed on their own, but together our spacing tokens overrode Tailwind's `max-w-*` sizes and squeezed the pages (#45). Arianna merged them without running E2E on the combined code.
- **Merge order.** #41 merged before #47 and #48, which then conflicted in `package.json`, `package-lock.json` and `openapi.yaml`, and had to be untangled on the last day. On 11/16, #57 and #58 were merged before Jay's second check.
- **Deploy and styling came last.** Vercel was connected only on 11/15, and most pages had little styling until #58, so the demo-ready version came very late.
- **Standups were irregular.** They were often long catch-up messages a few days apart instead of short daily ones, so the other person sometimes learned about a blocker late.
- **The flaky test cost hours.** The offline E2E test failed in most CI runs on 11/15 and blocked several merges before its cause was found.
- **Previews share the production database.** That was fine for the deadline, but a PR preview can change real data.

### Partner feedback

- **Arianna to Jay:** You caught up fast: three PRs with green CI in one night, and your PR descriptions listed their limits honestly, which made reviewing quick. You took production seriously: the hosted Supabase project, the keep-alive, and the migration fix you found by actually pushing (#52). Next time I'd like us to deploy on the first day and agree on a merge order before PRs pile up, so neither of us is untangling conflicts at the deadline.
- **Jay to Arianna:** Your issues and PRD were clear enough that I could review without asking questions, and your PR descriptions said what was tested. Your reviews caught real bugs in my PRs, like the invite link lost between sign-in and sign-up. Next time I want us to agree on a merge order before PRs pile up and to deploy on day one.

### Agent mistakes and rule changes

<!-- Mistakes the agents repeated this sprint, and the AGENTS.md change (PR #) that addresses each one. -->

| Mistake                                                                                                      | Rule or fix                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DESIGN.md named its spacing tokens `sm` and `xl`, and the exported theme overrode Tailwind's `max-w-*` sizes | Tokens renamed to `space-1` to `space-6`, a unit test rejects names that clash with Tailwind, and an E2E test checks page widths at phone size (#45, PR #46) |
| A migration called `gen_random_bytes` without its schema, which works locally but not on hosted Supabase     | `extensions.` prefix, plus a unit test that checks every migration (#52, PR #53)                                                                             |
| Two PRs each added an OpenAPI response with the same name, and Git merged both without a conflict            | The contract test (#41) and `npm run api:lint` catch it. Reviewers run them on the combined code                                                             |
| `next dev` rewrites AGENTS.md on start                                                                       | Not committed. Undo it with `git checkout -- AGENTS.md` (#37, still open)                                                                                    |
| Some pages hard-coded Tailwind colors (`text-red-800`, `bg-black`) instead of DESIGN.md tokens               | Replaced with tokens, and a unit test fails on Tailwind palette or hex colors (#39, PR #58)                                                                  |
| A test searched a whole response for words like "Groceries", so names created by other tests could fail it   | It checks field names instead (PR #67)                                                                                                                       |
| The final mockups and DESIGN.md were not named in AGENTS.md                                                  | v6: the screens table names each mockup, and DESIGN.md is added (#5, PR #36)                                                                                 |

### Actions for Sprint 3

- Build #14 (budget alerts) and #38 (axe scan), and rebuild the group home to match `group-home.png` (balance, budgets, then activity, with the bottom navigation).
- Add a rule to AGENTS.md: before merging two related PRs, run the full suite on the combined code (new issue).
- Give PR previews their own Supabase project, so a preview can't change production data.
- Deploy on the first day of a sprint, and agree on a merge order whenever two open PRs touch the same files.
- Move the month and percent helpers that `spending.ts` and `personal-spending.ts` both have into one module (Jay's follow-up from the #51 review).
- Post a short standup every day, even on quiet days.
