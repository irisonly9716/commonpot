"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { ExpenseListItem, ExpenseMember } from "@/lib/data/expenses";
import {
  canDeleteExpense,
  canEditExpense,
  type GroupRole,
} from "@/lib/domain/expenses";
import { formatMoney } from "@/lib/format-money";
import { DeleteExpenseDialog } from "./delete-expense-dialog";

type ExpenseListProps = {
  groupId: string;
  currentUserId: string;
  currentUserRole: GroupRole;
  currency: string;
  members: ExpenseMember[];
  expenses: ExpenseListItem[];
  onDeleted: (expenseId: string) => void;
};

export function ExpenseList({
  groupId,
  currentUserId,
  currentUserRole,
  currency,
  members,
  expenses,
  onDeleted,
}: ExpenseListProps) {
  const router = useRouter();
  const [pending, setPending] = useState<ExpenseListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const actor = { userId: currentUserId, role: currentUserRole };

  const nameOf = (userId: string) =>
    userId === currentUserId
      ? "you"
      : (members.find((member) => member.id === userId)?.displayName ??
        "a former member");

  function close(returnFocus: boolean) {
    setPending(null);
    if (returnFocus) opener.current?.focus();
  }

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setError(null);
    setStatus(null);
    const response = await fetch(
      `/api/v1/groups/${groupId}/expenses/${pending.id}`,
      { method: "DELETE" },
    ).catch(() => null);
    setDeleting(false);

    if (!response || !response.ok) {
      setError(
        response?.status === 403
          ? "You can't delete this expense."
          : "Could not delete the expense.",
      );
      close(true);
      return;
    }

    onDeleted(pending.id);
    close(false);
    heading.current?.focus();
    setStatus("Expense deleted.");
    router.refresh();
  }

  return (
    <section aria-labelledby="expenses-heading">
      <h2 id="expenses-heading" ref={heading} tabIndex={-1}>
        Recent expenses
      </h2>
      <p aria-live="polite">{status}</p>
      {error && <p role="alert">{error}</p>}
      {expenses.length === 0 && <p>No expenses yet.</p>}
      {expenses.map((expense) => {
        const titleId = `expense-${expense.id}`;
        return (
          <article aria-labelledby={titleId} key={expense.id}>
            <h3 id={titleId}>{expense.description}</h3>
            <p>{formatMoney(expense.amountCents, currency)}</p>
            <p>
              Paid by {nameOf(expense.paidBy)} on{" "}
              <time dateTime={expense.expenseDate}>{expense.expenseDate}</time>
            </p>
            {canEditExpense(actor, expense) && (
              <a
                aria-label={`Edit ${expense.description}`}
                href={`/groups/${groupId}/expenses/${expense.id}/edit`}
              >
                Edit
              </a>
            )}
            {canDeleteExpense(actor, expense) && (
              <button
                aria-label={`Delete ${expense.description}`}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setError(null);
                  setPending(expense);
                }}
                type="button"
              >
                Delete
              </button>
            )}
          </article>
        );
      })}

      {pending && (
        <DeleteExpenseDialog
          actor={actor}
          busy={deleting}
          creatorName={nameOf(pending.createdBy)}
          currency={currency}
          expense={pending}
          onCancel={() => close(true)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}
