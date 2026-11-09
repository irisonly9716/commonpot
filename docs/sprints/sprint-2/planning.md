# Sprint 2 planning

<!-- Draft by Arianna. Becomes final when both partners approve the PR that adds it. -->

|               |                                                                         |
| ------------- | ----------------------------------------------------------------------- |
| Dates         | 2026-11-10 → 2026-11-12 (milestone "Sprint 2"); P2 is due on 2026-11-13 |
| Product Owner | Jay Choudhary                                                           |
| Scrum Master  | Arianna                                                                 |
| Roles         | Swapped from Sprint 1, as planned                                       |

## Sprint goal

Every Must story works end to end on the deployed app: sign in, groups and invites, logging, editing and deleting expenses, balances and settle-up, live updates, the personal ledger and the public API. The Should and Could stories follow if there is time, in the order below.

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
| 15  | Show Me and Group spending charts (US8)                            | M        | Jay     |
| 16  | Let group admins manage members, roles and categories (US11)       | M        | Jay     |
| 17  | Build the site admin dashboard with account suspension (US12)      | M        | Jay     |
| 18  | Show each member's monthly share (US9)                             | S        | Jay     |
| 19  | Write the README, setup guide, architecture and schema diagrams    | M        | Arianna |
| 32  | Record the Sprint 1 review and the Sprint 2 plan                   | S        | Arianna |

Estimates: S < 1 h, M 1–4 h, L > 4 h. #12 is L, so it is split into two issues before work starts (the ledger itself, then the totals across groups).

## How the work is split

- **Arianna: the money core.** Edit and delete, real time, the personal ledger and budgets all build on the expense, balance and alert code from #8, #9 and #10.
- **Jay: accounts, roles and insights.** Sign-in, groups and invites, members and roles, the site admin dashboard and API sign-in share the auth and membership code. The insights page (#15, #18) is a separate page of read-only queries and Recharts charts, and goes with the design work in #5. Deploy (#3) is also Jay's, and he writes the deploy and environment section of the README in #19.
- Sprint 1 work was mostly Arianna's (#1, #4, #8, #9, #29), so Jay takes more of the remaining issues. Each of us mostly works in our own files, so PRs rarely conflict, and each partner reviews the other's PRs.

## Schedule

| Day        | Jay                                   | Arianna             | Both                                   |
| ---------- | ------------------------------------- | ------------------- | -------------------------------------- |
| 2026-11-10 | #6 sign-in, then #7 groups; #3 deploy | #10                 | Review and merge #30, #31 and #33      |
| 2026-11-11 | #13, #5, #16                          | #11, #12            | Review each other's PRs the same day   |
| 2026-11-12 | #15, #17, #18                         | #14                 | Feature freeze in the evening          |
| 2026-11-13 | README deploy section, own reflection | #19, own reflection | E2E pass, 10-minute demo video, submit |

- #6 and #7 come first: until there is a sign-in page and a group page, nothing can be tried in a browser and the E2E tests can't run. If #6 has no PR by the evening of 2026-11-10, we move it to whoever is free.
- If we run out of time, we drop #18 (Could) first, then #17 and #15 (Should). The Must stories (#6, #7, #10, #11, #12, #13) and #3 are not dropped.

## Interfaces

- #6 provides the signed-in user helper and the redirect to the sign-in page that every page uses.
- #7 provides the group pages and navigation that link to the expenses and balances pages.
- New group routes check access with `requireGroupMember` in `src/lib/api/group-access.ts` (added in #31).
- #10 shows the first in-app alert (an admin deleted my expense); #14 reuses it for budget alerts, and #11 makes alerts and the activity feed live.
- #12 adds the monthly-totals-by-category function in `src/lib/domain`; the Me view in #15 uses it. #15 builds `SpendingChart` and `ChartTable`; until it merges, #12 shows its totals as a table.
- Any API change updates `docs/api/openapi.yaml` in the same PR, so #13 only has to publish it.

## Definition of done

- The issue's acceptance criteria are checked off
- Failing tests were committed before the implementation
- CI is green and the partner approved the PR
- The card is in Done on the board
- Unfinished issues are listed in `retro.md` at the sprint review, with the reason
