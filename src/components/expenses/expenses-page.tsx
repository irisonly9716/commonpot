"use client";

import { useState } from "react";

import type {
  ExpenseCategory,
  ExpenseListItem,
  ExpenseMember,
} from "@/lib/data/expenses";
import { formatMoney } from "@/lib/format-money";
import { ExpenseForm } from "./expense-form";

type ExpensesPageProps = {
  groupId: string;
  currentUserId: string;
  members: ExpenseMember[];
  categories: ExpenseCategory[];
  expenses: ExpenseListItem[];
  currency: string;
};

export function ExpensesPage({
  groupId,
  currentUserId,
  members,
  categories,
  expenses: initialExpenses,
  currency,
}: ExpensesPageProps) {
  const [expenses, setExpenses] = useState(initialExpenses);

  async function refreshExpenses() {
    const response = await fetch(`/api/v1/groups/${groupId}/expenses`);
    if (!response.ok) return;
    const nextExpenses = (await response.json()) as Array<{
      id: string;
      amountCents: number;
      description: string;
      expenseDate: string;
      createdAt: string;
      paidBy: string;
      categoryId: string | null;
    }>;
    setExpenses(nextExpenses);
  }

  return (
    <main>
      <nav aria-label="Group pages">
        <a href={`/groups/${groupId}/balances`}>Balances and settle up</a>
      </nav>
      <ExpenseForm
        categories={categories}
        currency={currency}
        currentUserId={currentUserId}
        groupId={groupId}
        members={members}
        onCreated={refreshExpenses}
      />
      <section aria-label="Expenses">
        <h2>Recent expenses</h2>
        {expenses.map((expense) => (
          <article key={expense.id}>
            <h3>{expense.description}</h3>
            <p>{formatMoney(expense.amountCents, currency)}</p>
            <time dateTime={expense.expenseDate}>{expense.expenseDate}</time>
          </article>
        ))}
      </section>
    </main>
  );
}
