# HW4 annotated Claude Code session log (issue #14, budgets)

A shortened log of the real session. Each step has a note on which part of the workflow it shows. Commit hashes are on the branch `feature/14-budgets-domain`.

## 1. Explore (read only)

- Looked at the shape of an existing route and an existing domain file: `src/app/api/v1/groups/[groupId]/categories/route.ts`, `src/lib/api/group-access.ts`, `src/lib/domain/spending.ts`, `src/lib/validation/members.ts`.
- Read the `budgets` and `alerts` tables and their RLS policies in the first migration, and the US7 acceptance criteria in `docs/PRD.md`.
- **Note:** nothing was edited. The result was three facts: domain code is pure cents math, group routes start with `requireGroupMember` and `requireAdmin`, and no migration is needed.

## 2. Plan (Plan mode, then a committed plan)

- Showed a plan first, as AGENTS.md requires for changes that touch more than one file, and waited for approval.
- Committed the plan as `docs/plans/hw4-budgets.md` (f1d002f), with the acceptance criteria it covers, what is left out, the file list and the order of work.
- **Note:** the plan file is what survives a `/clear`. The chat does not.

## 3. Implement with TDD

| Step     | Commit  | What happened                                                                                                 |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Red      | b6a99e7 | 9 domain tests written. The run failed because `@/lib/domain/budgets` did not exist.                          |
| Green    | 0b1c205 | The smallest `budgets.ts` that passes. All 9 tests pass, lint and typecheck are clean.                        |
| Refactor | f308fb3 | A nested ternary became a named `statusFor` function. Tests stayed green.                                     |
| Red      | 79d8411 | 7 integration tests for `GET` and `PUT` on the budgets route. The run failed because the route did not exist. |
| Green    | 8152213 | The route, the Zod schema and the OpenAPI entry. The contract test and `api:lint` pass.                       |
| Red      | 14cdd43 | A new test: a category from another group. It failed with 500, where 404 is right.                            |
| Green    | 2499be7 | A guard that checks the category belongs to the group.                                                        |

- **Note on the last three rows:** the extra test was a gap the first tests did not cover. Writing it first showed a real bug (500 instead of 404) before any fix existed.

## 4. Commit

- Every commit is one logical change, in Conventional Commit form, and ends with the issue number.
- Tests and code are never in the same commit, so the history reads red, green, refactor.

## 5. Project setup (Part 1)

- `.claude/settings.json` (95ee87b) allows checks and read-only git commands and denies `.env` reads, force pushes, `supabase db push` and Vercel commands.
- An automated security review of that commit found the allowlist too loose: `git diff --no-index` and `git log -p` can print any file, which bypasses the `.env` deny. I tightened it (60834d8) to exact commands, limited `prettier` to `--check` and `vitest` to `run`, and added deny rules for the file-printing git forms.
- `CLAUDE.md` (cde2689) imports AGENTS.md with `@AGENTS.md` and adds the four-step workflow and the context strategy: `/clear` between issues, `/compact` at about 60%, `--continue` to resume, and plans and decisions kept in files.

## 6. Checks

- Unit: 287 pass. Integration: 125 pass. Lint, typecheck, prettier and `api:lint` are clean.
- One integration test, `database.test.ts` "handles invite acceptance", failed. It also failed on `main` without my changes. It depends on a seed invite that expires, and it passed after `supabase db reset`. It is a local data state problem, not a code problem.
