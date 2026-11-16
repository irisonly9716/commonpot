"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActivityFeed } from "@/components/activity/activity-feed";
import { AlertList } from "@/components/alerts/alert-list";
import { GroupNav } from "@/components/groups/group-nav";
import { ConnectionStatus } from "@/components/realtime/connection-status";
import type { ActivityItem } from "@/lib/data/activity";
import type { AlertItem } from "@/lib/data/alerts";
import type {
  ExpenseCategory,
  ExpenseListItem,
  ExpenseMember,
} from "@/lib/data/expenses";
import type { GroupRole } from "@/lib/domain/expenses";
import { useGroupRealtime } from "@/lib/realtime/use-group-realtime";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";

type ExpensesPageProps = {
  groupId: string;
  currentUserId: string;
  currentUserRole: GroupRole;
  members: ExpenseMember[];
  categories: ExpenseCategory[];
  expenses: ExpenseListItem[];
  activity: ActivityItem[];
  alerts: AlertItem[];
  currency: string;
};

export function ExpensesPage({
  groupId,
  currentUserId,
  currentUserRole,
  members,
  categories,
  expenses: initialExpenses,
  activity,
  alerts,
  currency,
}: ExpensesPageProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);

  /** Refetches the page; false when it failed, so live updates try again. */
  async function refreshExpenses(): Promise<boolean> {
    const response = await fetch(`/api/v1/groups/${groupId}/expenses`).catch(
      () => null,
    );
    // The network is down: keep the page as it is. A server refresh would fail
    // too and reload the whole page; useGroupRealtime tries again (#64).
    if (!response) return false;
    if (response.ok) {
      setExpenses((await response.json()) as ExpenseListItem[]);
    }
    // The network can drop while the request is in flight. An offline server
    // refresh makes Next.js reload the whole page into the browser's offline
    // error page, so leave it to the "online" catch-up instead (#64).
    if (!navigator.onLine) return false;
    // Re-renders the server data, including the activity feed and alerts.
    router.refresh();
    return response.ok;
  }

  // Other members' changes arrive live and refresh the page the same way (US4).
  const { status } = useGroupRealtime(groupId, {
    userId: currentUserId,
    onChange: refreshExpenses,
  });

  return (
    <main>
      <GroupNav current="expenses" groupId={groupId} />
      <ConnectionStatus status={status} />
      <AlertList alerts={alerts} />
      <ExpenseForm
        categories={categories}
        currency={currency}
        currentUserId={currentUserId}
        groupId={groupId}
        members={members}
        onCreated={refreshExpenses}
      />
      <ExpenseList
        currency={currency}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        expenses={expenses}
        groupId={groupId}
        members={members}
        onDeleted={(expenseId) =>
          setExpenses((current) =>
            current.filter((expense) => expense.id !== expenseId),
          )
        }
      />
      <ActivityFeed
        currency={currency}
        currentUserId={currentUserId}
        items={activity}
      />
    </main>
  );
}
