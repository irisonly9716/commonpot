# Sprint 2 planning

<!-- Draft by Arianna. Becomes final when both partners approve the PR that adds it. -->

|               |                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Dates         | 2026-11-10 → 2026-11-16 (milestone "Sprint 2"; provisional until the P2 due date is confirmed) |
| Product Owner | Jay Choudhary                                                                                  |
| Scrum Master  | Arianna                                                                                        |
| Roles         | Swapped from Sprint 1, as planned                                                              |

## Sprint goal

Every Must story works end to end on the deployed app: sign in, groups and invites, logging, editing and deleting expenses, balances and settle-up, live updates, the personal ledger and the public API. The Should and Could stories follow in the order below.

## Selected issues

Carried over from Sprint 1:

| #   | Issue                                                                   | Estimate | Owner   | At sprint start   |
| --- | ----------------------------------------------------------------------- | -------- | ------- | ----------------- |
| 3   | Deploy the app to Vercel with PR previews and per-environment variables | S        | Jay     | Not started       |
| 5   | Add DESIGN.md and mockups for the main screens                          | M        | Jay     | Placeholders only |
| 6   | Let users sign up, sign in and sign out (US1)                           | M        | Jay     | Not started       |
| 7   | Create a group and invite members with a link (US2)                     | M        | Jay     | Not started       |
| 9   | Show balances and suggest settle-up payments (US5)                      | M        | Arianna | In review (#31)   |
| 10  | Edit and delete expenses with role checks and deletion alerts (US6)     | M        | Arianna | Not started       |
| 29  | Fix expense API and page issues from the #28 review                     | S        | Arianna | In review (#30)   |

New in Sprint 2:

| #   | Issue                                                              | Estimate | Owner   |
| --- | ------------------------------------------------------------------ | -------- | ------- |
| 11  | Update expenses, balances and the activity feed in real time (US4) | M        | Arianna |
| 12  | Track personal expenses and totals across groups (US10)            | L        | Arianna |
| 13  | Publish the public REST API docs and API sign-in (US13)            | M        | Jay     |
| 14  | Set monthly category budgets with 80% and 100% alerts (US7)        | M        | Arianna |
| 15  | Show Me and Group spending charts (US8)                            | M        | Arianna |
| 16  | Let group admins manage members, roles and categories (US11)       | M        | Jay     |
| 17  | Build the site admin dashboard with account suspension (US12)      | M        | Jay     |
| 18  | Show each member's monthly share (US9)                             | S        | Arianna |
| 19  | Write the README, setup guide, architecture and schema diagrams    | M        | Arianna |
| 32  | Record the Sprint 1 review and the Sprint 2 plan                   | S        | Arianna |

Estimates: S < 1 h, M 1–4 h, L > 4 h. #12 is L, so it is split into two issues before work starts (the ledger itself, then the totals across groups).

## How the work is split

- **Jay: accounts and roles.** Sign-in, groups and invites, members and roles, the site admin dashboard and API sign-in share the auth and membership code; design and deploy also sit here.
- **Arianna: money.** Expenses, balances, real time, budgets, the personal ledger and the charts share `src/lib/domain` and the expense data.
- Each of us mostly works in our own files, so PRs rarely conflict. Jay starts with four carried-over issues, so Arianna takes more of the new ones.

## Order and interfaces

1. Review and merge #30 and #31 first. They don't touch the same files, so either can go first.
2. #6, then #7, are the top priority: until there is a sign-in page and a group page, nothing can be tried in a browser and the E2E tests can't run. #3 goes in alongside them so each PR gets a preview deploy, and #5 lands before any styling work.
3. Arianna: #10 → #11 → #12 → #14 → #15 and #18 → #19.
4. Jay: #6 → #7 → #3 and #5 → #13 (reuses #6's auth) → #16 (builds on #7) → #17.
5. Interfaces:
   - #6 provides the signed-in user helper and the redirect to the sign-in page that every page uses.
   - #7 provides the group pages and navigation that link to the expenses and balances pages.
   - New group routes check access with `requireGroupMember` in `src/lib/api/group-access.ts` (added in #31).
   - #10 shows the first in-app alert (an admin deleted my expense); #14 reuses it for budget alerts, and #11 makes alerts and the activity feed live.
6. Any API change updates `docs/api/openapi.yaml` in the same PR, so #13 only has to publish it.

## Definition of done

- The issue's acceptance criteria are checked off
- Failing tests were committed before the implementation
- CI is green and the partner approved the PR
- The card is in Done on the board
- Unfinished issues move to the next sprint at the sprint review, with the reason written in `retro.md`
