# HW4 plan: budget progress and thresholds (#14, US7)

Written in Plan mode before any code, after exploring the repo (HW4, part 2).

## What exploring found

- `lib/domain/*.ts` holds pure functions on integer cents, for example `spending.ts`. A new `budgets.ts` fits there and imports nothing from React, Next or Supabase.
- Group routes start with `requireGroupMember` and `requireAdmin` from `lib/api/group-access.ts`, validate the body with a Zod schema from `lib/validation/`, and answer errors through `apiError`. The categories route is the model to copy.
- The `budgets` table, its RLS policies and the `alerts` table (unique on user, budget, month and threshold) already exist, so no migration is needed.
- Tests live in `tests/unit` (domain) and `tests/integration` (API, local Supabase).

## Acceptance criteria from US7 that this slice covers

1. A group admin can set or change a monthly budget for a category. Every member can read the budgets.
2. Each budget shows spent and limit for the month, the amount left, and the percent used.
3. The 80% and 100% thresholds are detected exactly, and a threshold already alerted this month is not reported again.

Out of scope here and left for later: the budgets screen, real-time alert delivery, removing a budget, and past-month history in the UI.

## Files

| File                                               | Change                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/domain/budgets.ts`                        | New. `budgetProgress`, `thresholdsReached`, `newThresholds`. |
| `tests/unit/budgets-domain.test.ts`                | New. Written first.                                          |
| `src/lib/validation/budgets.ts`                    | New. Zod schema for the PUT body and the month query.        |
| `src/app/api/v1/groups/[groupId]/budgets/route.ts` | New. `GET` and `PUT`.                                        |
| `tests/integration/budgets-api.test.ts`            | New. Written first.                                          |
| `docs/api/openapi.yaml`                            | Budget paths and schemas.                                    |

## Order of work (red, green, refactor)

1. Failing unit tests for the domain functions. Commit.
2. Smallest domain code that passes. Commit.
3. Failing integration tests for the API. Commit.
4. Smallest API code that passes, with the OpenAPI entry. Commit.
5. Refactor with everything green. Commit.
