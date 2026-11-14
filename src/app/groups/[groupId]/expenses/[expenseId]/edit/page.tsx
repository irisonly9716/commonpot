import { notFound } from "next/navigation";
import { z } from "zod";

import { EditExpenseView } from "@/components/expenses/edit-expense-view";
import { getExpenseEditData } from "@/lib/data/expenses";
import { canEditExpense } from "@/lib/domain/expenses";

type PageProps = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

export default async function EditExpensePage({ params }: PageProps) {
  const { groupId, expenseId } = await params;
  if (
    !z.uuid().safeParse(groupId).success ||
    !z.uuid().safeParse(expenseId).success
  ) {
    notFound();
  }

  const data = await getExpenseEditData(groupId, expenseId);
  if (!data.user) return <p>Sign in to edit this expense.</p>;
  // RLS hides expenses in groups the user isn't in, so a missing one is a 404.
  if (!data.expense) notFound();

  const expensesPath = `/groups/${groupId}/expenses`;
  if (!canEditExpense({ userId: data.user.id }, data.expense)) {
    return (
      <main>
        <p>Only the person who logged this expense can edit it.</p>
        <a href={expensesPath}>Back to expenses</a>
      </main>
    );
  }

  return (
    <EditExpenseView
      categories={data.categories}
      currency={data.currency}
      currentUserId={data.user.id}
      expense={data.expense}
      groupId={groupId}
      members={data.members}
    />
  );
}
