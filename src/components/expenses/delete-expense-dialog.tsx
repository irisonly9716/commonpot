"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import type { ExpenseListItem } from "@/lib/data/expenses";
import {
  deletionAlertsCreator,
  type ExpenseActor,
} from "@/lib/domain/expenses";
import { formatMoney } from "@/lib/format-money";

type DeleteExpenseDialogProps = {
  actor: ExpenseActor;
  expense: ExpenseListItem;
  creatorName: string;
  currency: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation before deleting an expense. Focus starts on Cancel, Tab stays
 * inside the dialog, and Escape cancels; the caller returns focus on close.
 */
export function DeleteExpenseDialog({
  actor,
  expense,
  creatorName,
  currency,
  busy,
  onCancel,
  onConfirm,
}: DeleteExpenseDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const next =
      document.activeElement === cancelRef.current
        ? confirmRef.current
        : cancelRef.current;
    next?.focus();
  }

  return (
    <div
      aria-describedby="delete-expense-description"
      aria-labelledby="delete-expense-title"
      aria-modal="true"
      onKeyDown={onKeyDown}
      role="alertdialog"
    >
      <h2 id="delete-expense-title">Delete this expense?</h2>
      <div id="delete-expense-description">
        <p>
          {`${expense.description} (${formatMoney(expense.amountCents, currency)})`}{" "}
          will be removed for everyone, and balances will update. This
          can&apos;t be undone.
        </p>
        {deletionAlertsCreator(actor, expense) && (
          <p>
            {creatorName.charAt(0).toUpperCase() + creatorName.slice(1)} will
            get an alert that you deleted it.
          </p>
        )}
      </div>
      <button onClick={onCancel} ref={cancelRef} type="button">
        Cancel
      </button>
      <button
        disabled={busy}
        onClick={onConfirm}
        ref={confirmRef}
        type="button"
      >
        Delete expense
      </button>
    </div>
  );
}
