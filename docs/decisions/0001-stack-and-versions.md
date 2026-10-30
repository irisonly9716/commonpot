# 0001 · Stack and versions

Date: 2026-10-29 · Status: accepted

## Decision

Next.js (App Router) + React + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth, Realtime), deployed on Vercel. Every dependency uses the latest stable version that works with the rest of the stack, checked on the npm registry before installing.

## Why

- This is the stack recommended in class: it has the most examples in model training data, so agents write it well, and classmates can help each other.
- Supabase gives PostgreSQL, JWT auth and real-time updates in one service, and Vercel gives a preview deploy for every PR, both on free tiers.

## Version holds (checked 2026-10-29)

| Package | Newest | Using | Reason |
| --- | --- | --- | --- |
| TypeScript | 7.0 | 6.0 | typescript-eslint supports TypeScript < 6.1 |
| ESLint | 10 | 9.39 | the plugins inside eslint-config-next support ESLint 9 at most |
| Node.js | 26 (LTS since 2026-10-28) | 26 | LTS and Vercel's default |

Revisit these holds at each sprint retro.
