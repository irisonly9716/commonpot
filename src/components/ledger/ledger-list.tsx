"use client";

import { useState } from "react";

import type { PersonalExpense } from "@/lib/data/personal";
import { formatMoney } from "@/lib/format-money";
import { PERSONAL_CURRENCY } from "@/lib/domain/personal-spending";

type LedgerListProps = {
  expenses: PersonalExpense[];
  monthLabel: string;
  onEdit: (expense: PersonalExpense) => void;
  onChanged: () => void;
};

/** My personal expenses for the month, with Edit and a confirmed Delete (US10). */
export function LedgerList({
  expenses,
  monthLabel,
  onEdit,
  onChanged,
}: LedgerListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(expense: PersonalExpense) {
    setError(null);
    const response = await fetch(`/api/v1/personal-expenses/${expense.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setConfirmingId(null);
    if (!response?.ok) {
      setError("Could not delete the expense. Try again.");
      return;
    }
    onChanged();
  }

  return (
    <section aria-labelledby="ledger-heading" className="flex flex-col gap-3">
      <h2 className="text-title font-semibold" id="ledger-heading">
        Personal expenses
      </h2>
      {expenses.length === 0 ? (
        <p className="text-muted">No personal expenses in {monthLabel}.</p>
      ) : (
        <ul className="flex flex-col">
          {expenses.map((expense) => (
            <li
              className="border-line flex flex-col gap-2 border-t py-3"
              key={expense.id}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{expense.description}</span>
                <span>
                  {formatMoney(expense.amountCents, PERSONAL_CURRENCY)}
                </span>
              </div>
              <p className="text-label text-muted">
                {expense.category} ·{" "}
                <time dateTime={expense.expenseDate}>
                  {expense.expenseDate}
                </time>
              </p>
              {confirmingId === expense.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Delete {expense.description}?</span>
                  <button
                    className="border-owes text-owes min-h-11 rounded-sm border px-4"
                    onClick={() => remove(expense)}
                    type="button"
                  >
                    Delete expense
                  </button>
                  <button
                    className="border-line min-h-11 rounded-sm border px-4"
                    onClick={() => setConfirmingId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    aria-label={`Edit ${expense.description}`}
                    className="border-line min-h-11 rounded-sm border px-4"
                    onClick={() => onEdit(expense)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Delete ${expense.description}`}
                    className="border-line min-h-11 rounded-sm border px-4"
                    onClick={() => setConfirmingId(expense.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="text-owes" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
