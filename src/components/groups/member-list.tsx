"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { GroupMember, GroupRole } from "@/lib/data/groups";
import { formatMoney } from "@/lib/format-money";
import { sendRequest } from "./api-call";
import { RemoveMemberDialog } from "./remove-member-dialog";

type MemberListProps = {
  groupId: string;
  currentUserId: string;
  currentUserRole: GroupRole;
  currency: string;
  members: GroupMember[];
};

type PendingRemoval = { member: GroupMember; balanceCents: number };

const buttonClass =
  "min-h-11 border border-primary px-3 font-semibold text-primary";

/**
 * Members with their roles. Admins can promote and remove others; everyone can
 * leave. A removal that needs confirmation shows the balance first.
 */
export function MemberList({
  groupId,
  currentUserId,
  currentUserRole,
  currency,
  members,
}: MemberListProps) {
  const router = useRouter();
  const isAdmin = currentUserRole === "admin";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const openers = useRef<Record<string, HTMLButtonElement | null>>({});

  const memberUrl = (userId: string) =>
    `/api/v1/groups/${groupId}/members/${userId}`;

  function reset() {
    setStatus("");
    setError("");
  }

  async function promote(member: GroupMember) {
    reset();
    setBusy(true);
    const result = await sendRequest(memberUrl(member.userId), "PATCH", {
      role: "admin",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStatus(`${member.displayName} is now an admin.`);
    router.refresh();
  }

  async function remove(member: GroupMember, confirmed: boolean) {
    reset();
    setBusy(true);
    const url = memberUrl(member.userId) + (confirmed ? "?confirm=true" : "");
    const result = await sendRequest(url, "DELETE");
    setBusy(false);
    if (result.ok) {
      setPending(null);
      setStatus(`${member.displayName} was removed.`);
      router.refresh();
      return;
    }
    if (result.code === "BALANCE_NOT_ZERO" && result.balanceCents) {
      setPending({ member, balanceCents: result.balanceCents });
      return;
    }
    setPending(null);
    setError(result.message);
  }

  async function leave() {
    reset();
    setBusy(true);
    const result = await sendRequest(memberUrl(currentUserId), "DELETE");
    setBusy(false);
    if (result.ok) {
      router.push("/groups");
      return;
    }
    if (result.code === "BALANCE_NOT_ZERO" && result.balanceCents) {
      const amount = formatMoney(Math.abs(result.balanceCents), currency);
      setError(
        result.balanceCents < 0
          ? `You owe ${amount}. Settle up before you leave.`
          : `You are owed ${amount}. Settle up before you leave.`,
      );
      return;
    }
    if (result.code === "LAST_ADMIN") {
      setError(
        "You are the only admin. Promote another member before you leave.",
      );
      return;
    }
    setError(result.message);
  }

  function cancelRemoval() {
    const userId = pending?.member.userId;
    setPending(null);
    if (userId) {
      // Wait for the dialog to unmount, then put focus back on its button.
      queueMicrotask(() => openers.current[userId]?.focus());
    }
  }

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <h2 id="members-heading" className="text-lg font-semibold">
        Members
      </h2>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {status}
      </p>
      {error ? (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isYou = member.userId === currentUserId;
          return (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-2"
            >
              <span>
                {member.displayName}
                {isYou ? " (you)" : ""}
              </span>
              <span className="text-muted text-sm">
                {member.role === "admin" ? "Admin" : "Member"}
              </span>
              {isAdmin && !isYou && member.role === "member" ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  aria-label={`Promote ${member.displayName}`}
                  onClick={() => promote(member)}
                >
                  Promote
                </button>
              ) : null}
              {isAdmin && !isYou ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  aria-label={`Remove ${member.displayName}`}
                  ref={(element) => {
                    openers.current[member.userId] = element;
                  }}
                  onClick={() => remove(member, false)}
                >
                  Remove
                </button>
              ) : null}
              {isYou ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy}
                  onClick={leave}
                >
                  Leave group
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {pending ? (
        <RemoveMemberDialog
          name={pending.member.displayName}
          balanceCents={pending.balanceCents}
          currency={currency}
          busy={busy}
          onCancel={cancelRemoval}
          onConfirm={() => remove(pending.member, true)}
        />
      ) : null}
    </section>
  );
}
