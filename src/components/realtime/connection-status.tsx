import type { RealtimeStatus } from "@/lib/realtime/use-group-realtime";

/**
 * Says "Reconnecting…" while live updates are down (US4). The region is always
 * in the page, so screen readers announce the message when it appears.
 */
export function ConnectionStatus({ status }: { status: RealtimeStatus }) {
  return (
    <p
      aria-live="polite"
      className="text-label text-warn"
      data-status={status}
      role="status"
    >
      {status === "reconnecting" ? "Reconnecting…" : ""}
    </p>
  );
}
