# 0004 · Live updates come from the activity table

Date: 2026-11-13 · Status: accepted

## Decision

Group pages get live updates (US4, #11) through one hook, `useGroupRealtime(groupId, { userId, onChange })` in `src/lib/realtime/use-group-realtime.ts`.

- **What it listens to.** Supabase Postgres Changes, INSERT events only, on two tables: `activity` filtered by `group_id`, and `alerts` filtered by the user's own `user_id`. The migration `20261114035217_enable_realtime_activity_alerts.sql` adds both tables to the `supabase_realtime` publication.
- **What it does with an event.** It ignores the payload and calls `onChange`, which refetches the page data. Events that arrive within 200 ms trigger one refetch, not one each.
- **Catching up.** It also refetches every time the channel reports `SUBSCRIBED` (the first time and after every reconnect) and when the browser comes back online. The channel uses `postgres_changes_options: { wait: true }`, so `SUBSCRIBED` only arrives once the server is streaming changes.
- **Status.** It shows "Reconnecting…" on `CHANNEL_ERROR`, on `TIMED_OUT`, on an unexpected `CLOSED` (it opens a new channel after 1 s) and while the browser is offline. It skips refetches while offline.

## Why

- **One table covers every change.** Every expense insert, edit and delete and every payment already writes exactly one `activity` row with the `group_id`, through the triggers from #4. Subscribing to `expenses` and `expense_shares` directly would not work as well: shares have no `group_id` to filter on, and DELETE events can't be filtered and aren't checked against RLS.
- **RLS still applies.** Realtime checks each INSERT against the subscriber's select policies (`activity_member_select`, `alerts_owner_select`). People outside the group never receive the group's events, and the integration test checks this.
- **Refetching avoids the hard cases.** Because the page reloads from the same API routes it already uses, it never shows a duplicate and never has to merge partial rows. Postgres Changes doesn't replay missed events, so a refetch after each (re)subscribe is how the page catches up.
- **Why not Broadcast.** Supabase recommends Broadcast from the database for large apps (Postgres Changes authorizes each event for each subscriber on a single thread; the docs suggest switching above about 3,000 concurrent subscribers). A household group has a handful of members, so Postgres Changes is enough and needs no `realtime.messages` policies or private-channel setup. If CommonPot grows, the triggers can call `realtime.broadcast_changes` instead and the hook keeps the same interface.
- **Offline.** A server refresh (`router.refresh()`) that runs while the network is down makes Next.js reload the whole page. So the hook waits for the "online" event, and the expenses page skips the server refresh when its own fetch fails.

Sources: https://supabase.com/docs/guides/realtime/postgres-changes, https://supabase.com/docs/guides/realtime/subscribing-to-database-changes, https://supabase.com/docs/reference/javascript/setauth
