"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { formatMoney } from "@/lib/format-money";

type RemoveMemberDialogProps = {
  name: string;
  /** Positive: they are owed money. Negative: they owe money. */
  balanceCents: number;
  currency: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirmation before removing someone whose balance is not zero. The balance
 * is said in words, not only with a sign or a color. Focus starts on Cancel,
 * Tab stays inside the dialog, and Escape cancels; the caller returns focus.
 */
export function RemoveMemberDialog({
  name,
  balanceCents,
  currency,
  busy,
  onCancel,
  onConfirm,
}: RemoveMemberDialogProps) {
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

  const amount = formatMoney(Math.abs(balanceCents), currency);
  const words =
    balanceCents > 0
      ? `${name} is owed ${amount} in this group.`
      : `${name} owes ${amount} in this group.`;

  return (
    <div
      aria-describedby="remove-member-description"
      aria-labelledby="remove-member-title"
      aria-modal="true"
      className="border-line bg-surface flex flex-col gap-2 border p-4"
      onKeyDown={onKeyDown}
      role="alertdialog"
    >
      <h3 id="remove-member-title" className="font-semibold">
        Remove {name}?
      </h3>
      <div id="remove-member-description">
        <p>{words}</p>
        <p>If you remove them, that balance stays unsettled.</p>
      </div>
      <div className="flex gap-2">
        <button
          className="border-primary text-primary min-h-11 border px-4 font-semibold"
          onClick={onCancel}
          ref={cancelRef}
          type="button"
        >
          Cancel
        </button>
        <button
          className="bg-accent text-surface min-h-11 px-4 font-semibold"
          disabled={busy}
          onClick={onConfirm}
          ref={confirmRef}
          type="button"
        >
          Remove anyway
        </button>
      </div>
    </div>
  );
}
