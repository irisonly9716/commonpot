# Sprint 1 review and retrospective

## Review

<!-- Which issues reached Done, what was demoed, which moved to Sprint 2 and why. -->

Planned 2026-10-31 → 2026-11-04; the last Sprint 1 PRs merged on 2026-11-09.

Reached Done:

| #   | Issue                                                    | PR  | Merged     |
| --- | -------------------------------------------------------- | --- | ---------- |
| 20  | Update AGENTS.md with lessons from the before/after test | #21 | 2026-10-31 |
| 1   | Scaffold the Next.js app                                 | #24 | 2026-11-07 |
| 2   | CI pipeline with tests and security scanning             | #23 | 2026-11-09 |
| 4   | Database schema, RLS policies and seed data              | #25 | 2026-11-09 |
| 8   | Add an expense with an equal or exact split (US3)        | #28 | 2026-11-09 |
| 26  | AGENTS.md version table for `@hookform/resolvers` 7      | #27 | 2026-11-09 |

Placeholder mockups for #5 merged in #22; #5 stays open for DESIGN.md and the final mockups.

Moved to Sprint 2:

- In review: #9 balances and settle-up (#31) and #29, the follow-ups from the #28 review (#30).
- Not started: #3 deploy, #6 sign-in, #7 groups and invites, #10 edit and delete.

Why: both partners had access to the repo from 2026-11-03, and the scaffold (#1) and schema (#4) that every feature builds on took until 2026-11-07 and 2026-11-09 to get through review, so the feature issues started late.

Demo: none yet. The app isn't deployed (#3) and has no sign-in page (#6), so the finished work was checked through the test suites and CI rather than in a browser.

## Retrospective

Written on 2026-11-15 from our standups, PR reviews and Slack messages. Each partner checks their own feedback in the review of #62.

### What went well

- **Planning before code.** The PRD with acceptance criteria, AGENTS.md, the 19 issues and the board existed before the first feature, so either of us could pick up an issue and know what "done" meant. Jay said the same in Slack (see partner feedback).
- **Rules backed by evidence.** The HW3 before/after test on #8 showed exactly where the agent still drifted with the rules loaded, and each gap became an AGENTS.md v2 rule (#20, PR #21).
- **CI before features.** The pipeline from #23 had all six jobs, including `npm audit` and CodeQL, before the first feature merged, and branch protection made them required.
- **TDD visible from the start.** From the schema (#25) on, every feature PR has a failing-test commit before the implementation.
- **Reviews with substance.** Jay's review of #25 asked how someone leaves a group, what happens to suspended users and who may execute the functions. The function permissions were fixed in #25, and the other two became #16 and #17. His review of #28 found three real issues (#29).

### What didn't

- **A late start.** Both of us had repo access only from 2026-11-03, and the scaffold (#1) and schema (#4) took until 11/07 and 11/09 to merge, so most feature issues slid into Sprint 2.
- **Uneven work.** Arianna did most of the Sprint 1 issues while Jay waited for the base to merge. We rebalanced in the Sprint 2 plan.
- **Stacked branches and waiting.** #25 was built on #24, #28 on #25, and #23 couldn't run until #24 merged. Each of us spent time waiting on the other's merge instead of reviewing the same day.
- **Owner-only settings.** Only the repo owner could set branch protection, so Jay had to ask for it in his standup before #2 could be finished.

### Partner feedback

- **Arianna → Jay:** Your reviews were careful and specific. The three questions you asked on #25 all turned into real work later, and the pipeline you set up in #23 had the security job from day one, which we relied on all project. What would help me: start your first issue earlier in the sprint, and post a short standup every day, even when you're waiting on a merge, so I know what's blocking you.
- **Jay → Arianna:** _From Jay's Slack message of 2026-11-07; Jay edits or replaces this in the review of #62._ "Your PRD, the 19 issues and the rules file made it really easy to pick things up, and it was great to see you act on my comments so quickly on #22 and #25."

### Agent mistakes and rule changes

<!-- Mistakes the agents repeated this sprint, and the AGENTS.md change (PR #) that addresses each one. -->

| Mistake                                                                                                                                     | Rule or fix                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| With the rules loaded, the agent still skipped an acceptance criterion ("the new expense appears at the top of the list") without saying so | v2: implement every acceptance criterion, or list the ones left out (#20, PR #21)              |
| It validated amounts and dates with hand-written regex instead of the shared Zod schemas                                                    | v2: validate with the schemas in `lib/validation` (#20, PR #21)                                |
| An error message said "difference: 400 cents"                                                                                               | v2: messages shown to users never contain raw cents (#20, PR #21)                              |
| The version table listed `@hookform/resolvers` 6.0.x, an old major, so agents would install it                                              | v4: 7.0.x, the latest stable release that works with Zod 4 and React Hook Form 7 (#26, PR #27) |
| An equal split gave the leftover cent depending on the order members were listed in                                                         | v5: leftover cents go to members sorted by user id (#29, PR #30)                               |

### Actions for Sprint 2

- Review each other's PRs the same day, and agree on a merge order when PRs depend on each other.
- Jay takes more of the remaining issues (#3, #5–#7, #13, #15–#18).
- Do sign-in (#6) and groups (#7) first: until they exist, nothing can be tried in a browser and there are no E2E tests.
- Swap roles: Jay is Product Owner and Arianna Scrum Master.
