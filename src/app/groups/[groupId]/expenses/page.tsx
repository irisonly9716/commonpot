import { notFound } from "next/navigation";
import { z } from "zod";

import { ExpensesPage } from "@/components/expenses/expenses-page";
import { getExpensePageData } from "@/lib/data/expenses";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupExpensesPage({ params }: PageProps) {
  const { groupId } = await params;
  if (!z.uuid().safeParse(groupId).success) notFound();
  const data = await getExpensePageData(groupId);

  if (!data.user) {
    return <p>Sign in to view this group&apos;s expenses.</p>;
  }
  if (!data.group || !data.role) notFound();

  return (
    <ExpensesPage
      activity={data.activity}
      alerts={data.alerts}
      categories={data.categories}
      currency={data.currency}
      currentUserId={data.user.id}
      currentUserRole={data.role}
      expenses={data.expenses}
      groupId={groupId}
      members={data.members}
    />
  );
}
