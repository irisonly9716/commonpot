import { ExpenseManager } from "@/components/expenses/expense-manager";

export default async function GroupExpensesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return <ExpenseManager groupId={groupId} />;
}
