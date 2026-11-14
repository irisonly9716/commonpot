"use client";

import { useRouter } from "next/navigation";

import type { ExpenseCategory, ExpenseMember } from "@/lib/data/expenses";
import { ExpenseForm, type ExpenseFormExpense } from "./expense-form";

type EditExpenseViewProps = {
  groupId: string;
  currentUserId: string;
  currency: string;
  members: ExpenseMember[];
  categories: ExpenseCategory[];
  expense: ExpenseFormExpense;
};

export function EditExpenseView({ groupId, ...props }: EditExpenseViewProps) {
  const router = useRouter();
  const expensesPath = `/groups/${groupId}/expenses`;

  return (
    <main>
      <nav aria-label="Group pages">
        <a href={expensesPath}>Back to expenses</a>
      </nav>
      <ExpenseForm
        {...props}
        groupId={groupId}
        onSaved={() => {
          router.push(expensesPath);
          router.refresh();
        }}
      />
    </main>
  );
}
