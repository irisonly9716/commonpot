"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export type RealtimeStatus = "connecting" | "live" | "reconnecting";

type GroupRealtimeOptions = {
  /** The signed-in user, so their own alerts arrive live too. */
  userId: string;
  /** Called after other members change something; refetch the page data here. */
  onChange: () => void;
};

/** Changes that land within this window trigger one refetch, not one each. */
const REFETCH_DELAY_MS = 200;
/** How long to wait before opening a new channel after an unexpected close. */
const RESUBSCRIBE_DELAY_MS = 1000;

/**
 * Live updates for one group (US4). Every expense add, edit and delete and every
 * payment writes one row to `activity`, so the hook listens for new activity in
 * the group and for the user's own new alerts, then calls `onChange` to refetch.
 *
 * Refetching instead of applying event payloads means the page never shows a
 * duplicate. Refetching each time the channel (re)subscribes, and when the
 * browser comes back online, means nothing that happened meanwhile is missed.
 * Row level security limits the events to members of the group.
 */
export function useGroupRealtime(
  groupId: string,
  { userId, onChange }: GroupRealtimeOptions,
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let channel: RealtimeChannel | null = null;
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    let resubscribeTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleRefetch() {
      // Offline fetches would fail; the "online" handler catches up instead.
      // The network can also drop during the delay, so check again when it ends.
      if (!active || !navigator.onLine) return;
      clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        if (active && navigator.onLine) onChangeRef.current();
      }, REFETCH_DELAY_MS);
    }

    function resubscribe(closed: RealtimeChannel) {
      clearTimeout(resubscribeTimer);
      resubscribeTimer = setTimeout(() => {
        if (!active) return;
        void supabase.removeChannel(closed);
        void subscribe();
      }, RESUBSCRIBE_DELAY_MS);
    }

    async function subscribe() {
      // Realtime checks row level security with the signed-in user's token.
      await supabase.realtime.setAuth();
      if (!active) return;

      const current = supabase
        .channel(`group-${groupId}-${crypto.randomUUID()}`, {
          // Report SUBSCRIBED only once the server is streaming changes, so the
          // catch-up refetch below can't run before events start to arrive.
          config: { postgres_changes_options: { wait: true } },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "activity",
            filter: `group_id=eq.${groupId}`,
          },
          scheduleRefetch,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "alerts",
            filter: `user_id=eq.${userId}`,
          },
          scheduleRefetch,
        );
      channel = current;

      current.subscribe((state) => {
        if (!active || channel !== current) return;
        if (state === "SUBSCRIBED") {
          setStatus("live");
          scheduleRefetch();
        } else if (state === "CLOSED") {
          setStatus("reconnecting");
          resubscribe(current);
        } else {
          // CHANNEL_ERROR or TIMED_OUT: the client rejoins on its own.
          setStatus("reconnecting");
        }
      });
    }

    function handleOffline() {
      setStatus("reconnecting");
    }

    function handleOnline() {
      if (channel?.state === "joined") setStatus("live");
      scheduleRefetch();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    void subscribe();

    return () => {
      active = false;
      clearTimeout(refetchTimer);
      clearTimeout(resubscribeTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [groupId, userId]);

  return { status };
}
