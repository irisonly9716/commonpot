import { ExpensesPage } from "../../../../components/expenses/expenses-page";
import { getExpensePageData } from "../../../../lib/data/expenses";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupExpensesPage({ params }: PageProps) {
  const { groupId } = await params;
  const data = await getExpensePageData(groupId);

  if (!data.user) {
    return <p>Sign in to view this group&apos;s expenses.</p>;
  }

  return (
    <ExpensesPage
      categories={data.categories}
      currency={data.currency}
      currentUserId={data.user.id}
      expenses={data.expenses}
      groupId={groupId}
      members={data.members}
    />
  );
}
