# 0003 · Merge commits keep the TDD history

Date: 2026-10-29 · Status: accepted

## Decision

PRs are merged with "Create a merge commit". Squash merging is disabled in the repository settings.

## Why

Each issue is built test-first: a `test(...)` commit with failing tests, then a `feat(...)` commit that makes them pass, then `refactor(...)`. Squash merging would collapse these into one commit, and the history would no longer show that the tests came first.
