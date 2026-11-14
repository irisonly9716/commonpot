"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useGroupRealtime } from "@/lib/realtime/use-group-realtime";
import { ConnectionStatus } from "./connection-status";

type GroupLiveRefreshProps = {
  groupId: string;
  userId: string;
};

/**
 * For pages rendered on the server, such as balances: when another member
 * changes something, re-render the page's server data (US4).
 */
export function GroupLiveRefresh({ groupId, userId }: GroupLiveRefreshProps) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const { status } = useGroupRealtime(groupId, { userId, onChange: refresh });
  return <ConnectionStatus status={status} />;
}
