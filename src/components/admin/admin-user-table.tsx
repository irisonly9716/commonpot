"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminUser } from "@/lib/data/admin";
import { formatDate } from "@/lib/format-date";
import { sendAdminRequest } from "./api-call";

type AdminUserTableProps = {
  users: AdminUser[];
  currentUserId: string;
};

/** Accounts with sign-up date, status and counts. Never any amounts. */
export function AdminUserTable({ users, currentUserId }: AdminUserTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function setSuspended(user: AdminUser, suspended: boolean) {
    setPendingId(user.id);
    setError("");
    setStatus("");
    const message = await sendAdminRequest(
      `/api/v1/admin/users/${user.id}`,
      "PATCH",
      { suspended },
    );
    setPendingId(null);
    if (message) {
      setError(message);
      return;
    }
    setStatus(
      suspended
        ? `${user.displayName} is suspended.`
        : `${user.displayName} is active again.`,
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {status}
      </p>
      {error ? (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left">
          <caption className="text-muted pb-2 text-left text-sm">Users</caption>
          <thead>
            <tr className="border-line border-b">
              <th scope="col" className="py-2 pr-4">
                Name
              </th>
              <th scope="col" className="py-2 pr-4">
                Email
              </th>
              <th scope="col" className="py-2 pr-4">
                Joined
              </th>
              <th scope="col" className="py-2 pr-4 text-right">
                Groups
              </th>
              <th scope="col" className="py-2 pr-4 text-right">
                Expenses
              </th>
              <th scope="col" className="py-2 pr-4">
                Status
              </th>
              <th scope="col" className="py-2">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-line border-b">
                <th scope="row" className="py-2 pr-4 font-semibold">
                  {user.displayName || "Unnamed"}
                </th>
                <td className="py-2 pr-4">{user.email}</td>
                <td className="py-2 pr-4">{formatDate(user.createdAt)}</td>
                <td className="py-2 pr-4 text-right">{user.groupCount}</td>
                <td className="py-2 pr-4 text-right">{user.expenseCount}</td>
                <td className="py-2 pr-4">
                  {user.suspendedAt ? "Suspended" : "Active"}
                </td>
                <td className="py-2">
                  {user.id === currentUserId ? (
                    <span>You</span>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingId === user.id}
                      aria-label={`${user.suspendedAt ? "Reactivate" : "Suspend"} ${user.displayName}`}
                      onClick={() => setSuspended(user, !user.suspendedAt)}
                      className="border-primary text-primary min-h-11 border px-3 font-semibold"
                    >
                      {user.suspendedAt ? "Reactivate" : "Suspend"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
