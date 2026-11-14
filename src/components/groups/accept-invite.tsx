"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { INVITE_UNAVAILABLE_MESSAGE } from "@/lib/groups/messages";

/** Joins the group as soon as the page opens, then goes to it. Safe to run twice. */
export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function join() {
      const response = await fetch("/api/v1/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const { groupId } = (await response.json()) as { groupId: string };
        router.replace(`/groups/${groupId}`);
        router.refresh();
        return;
      }
      setMessage(
        response.status === 410
          ? INVITE_UNAVAILABLE_MESSAGE
          : "Something went wrong. Try opening the link again.",
      );
    }
    void join();
  }, [token, router]);

  return (
    <main className="mx-auto w-full max-w-xl p-6">
      {message ? (
        <p role="alert" className="font-medium text-red-800">
          {message}
        </p>
      ) : (
        <p role="status">Joining the group…</p>
      )}
    </main>
  );
}
