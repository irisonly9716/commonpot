@AGENTS.md

AGENTS.md holds what Claude Code and other agents both need: the tech stack, the architecture and key patterns, naming and code style, the testing strategy (TDD on every issue), the PRD and design references, the Git workflow, and the do's and don'ts. The requirements are in `docs/PRD.md` and the design rules in `DESIGN.md`. Open them when the issue needs them.

## Claude Code only

- Use Plan mode for any change that touches more than one file.
- Path-scoped rules and skills live in `.claude/`; general rules stay in AGENTS.md.
- Permissions are in `.claude/settings.json`. Checks and read-only git commands are allowed by exact command. Reading `.env` files, force pushes, `supabase db push` and Vercel commands are denied. Do not widen an allow rule to a `:*` prefix for commands that can print files, such as `git diff` or `git log`.

## Workflow for every issue

1. **Explore.** Read only. Find how similar code is built, for example a nearby route in `src/app/api/v1` or a pure function in `src/lib/domain`. Do not edit anything.
2. **Plan.** Use Plan mode. Restate the acceptance criteria from `docs/PRD.md`, list the files, and wait for approval. For bigger work, commit the plan to `docs/plans/`.
3. **Implement with TDD.** Failing tests first (`test(...)` commit), the smallest code that passes (`feat(...)` or `fix(...)`), then `refactor(...)` with the tests green.
4. **Commit.** Conventional Commit messages that end with the issue number. One logical change per commit.

## Context management

- Start each issue in a fresh session, or run `/clear` when switching issues, so old files do not crowd out the new task.
- Run `/compact` when a session passes about 60% of the context window. Tell it what to keep: the acceptance criteria, the files in play and the failing test names.
- Resume an interrupted session with `claude --continue`, or pick an older one with `claude --resume`.
- Put anything that must survive a `/clear` in a file, not in the chat: the plan in `docs/plans/`, rules in AGENTS.md, and decisions in `docs/decisions/`.
- Prefer a subagent for wide searches ("find every route that checks admin") so the file dumps stay out of the main context.
- Never put secrets in a prompt, a file Claude reads, or a commit.
