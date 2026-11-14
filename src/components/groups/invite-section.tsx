"use client";

import { useState } from "react";

type Invite = { id: string; url: string; expiresAt: string };

export function InviteSection({
  groupId,
  initialInvites,
}: {
  groupId: string;
  initialInvites: Invite[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function createInvite() {
    setError(null);
    const response = await fetch(`/api/v1/groups/${groupId}/invites`, {
      method: "POST",
    });
    if (!response.ok) {
      setError("We couldn't create the invite link. Try again.");
      return;
    }
    const invite = (await response.json()) as Invite;
    setInvites((current) => [invite, ...current]);
  }

  async function revokeInvite(id: string) {
    setError(null);
    const response = await fetch(`/api/v1/groups/${groupId}/invites/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("We couldn't revoke the invite link. Try again.");
      return;
    }
    setInvites((current) => current.filter((invite) => invite.id !== id));
  }

  async function copyInvite(invite: Invite) {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiedId(invite.id);
    } catch {
      setError("Copying isn't available here. Select the link and copy it.");
    }
  }

  return (
    <section aria-labelledby="invites-heading" className="flex flex-col gap-3">
      <h2 id="invites-heading" className="text-lg font-semibold">
        Invite links
      </h2>
      <p className="text-sm text-gray-700">
        Anyone with a link can join this group after signing in. Links expire
        after 7 days, and you can revoke one at any time.
      </p>

      <div>
        <button
          type="button"
          onClick={createInvite}
          className="min-h-11 rounded bg-black px-4 text-white"
        >
          Create invite link
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {invites.length === 0 ? (
        <p className="text-sm text-gray-700">There are no active links.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-col gap-2">
              <label
                htmlFor={`invite-${invite.id}`}
                className="text-sm font-medium"
              >
                Invite link
              </label>
              <input
                id={`invite-${invite.id}`}
                readOnly
                value={invite.url}
                className="min-h-11 rounded border border-gray-400 px-3"
              />
              <p className="text-sm text-gray-700">
                Expires {invite.expiresAt.slice(0, 10)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyInvite(invite)}
                  className="min-h-11 rounded border border-gray-400 px-4"
                >
                  {copiedId === invite.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => revokeInvite(invite.id)}
                  className="min-h-11 rounded border border-gray-400 px-4"
                >
                  Revoke invite link
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
