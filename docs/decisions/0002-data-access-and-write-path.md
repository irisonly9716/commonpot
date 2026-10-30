# 0002 · Data access and one write path

Date: 2026-10-29 · Status: accepted

## Decision

- Use the Supabase JS client with generated TypeScript types; no ORM.
- Every table has row-level security (RLS), with its policies in the same migration.
- The web UI writes only through the public REST API under `/api/v1`; no Server Actions.
- Business logic (splits, balances, settle-up, budgets, personal totals) lives in pure functions in `src/lib/domain`.
- Money is stored as integer cents.

## Why

- An ORM such as Prisma connects with a database role that bypasses RLS, so permissions would rely on application code alone.
- One write path means permissions are checked in one place, and the public API is used by our own app every day.
- Pure functions are the easiest code to test first and to cover.
- Integer cents avoid floating-point errors, so balances always add up to exactly zero.
