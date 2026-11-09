"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { parseAmountToCents } from "@/lib/domain/expenses";
import { getLocalDateString } from "@/lib/local-date";
import {
  paymentFormSchema,
  type PaymentFormInput,
} from "@/lib/validation/payments";

type Member = { id: string; displayName: string };

export type PaymentDraft = {
  paidBy: string;
  paidTo: string;
  amountCents: number;
};

type PaymentFormProps = {
  groupId: string;
  currentUserId: string;
  members: Member[];
  draft: PaymentDraft | null;
};

const NOT_A_PARTY = "You can only record a payment you made or received.";

export function PaymentForm({
  groupId,
  currentUserId,
  members,
  draft,
}: PaymentFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstOther = members.find((member) => member.id !== currentUserId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paidBy: currentUserId,
      paidTo: firstOther?.id ?? currentUserId,
      amount: "",
      paymentDate: getLocalDateString(),
    },
  });

  useEffect(() => {
    if (!draft) return;
    reset({
      paidBy: draft.paidBy,
      paidTo: draft.paidTo,
      amount: (draft.amountCents / 100).toFixed(2),
      paymentDate: getLocalDateString(),
    });
  }, [draft, reset]);

  async function submit(values: PaymentFormInput) {
    setStatus(null);
    setSubmitError(null);
    if (![values.paidBy, values.paidTo].includes(currentUserId)) {
      setSubmitError(NOT_A_PARTY);
      return;
    }

    const response = await fetch(`/api/v1/groups/${groupId}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paidBy: values.paidBy,
        paidTo: values.paidTo,
        amountCents: parseAmountToCents(values.amount),
        paymentDate: values.paymentDate,
      }),
    }).catch(() => null);

    if (!response) {
      setSubmitError("Could not record the payment. Check your connection.");
      return;
    }
    if (response.status === 403) {
      setSubmitError(NOT_A_PARTY);
      return;
    }
    if (!response.ok) {
      setSubmitError("Could not record the payment.");
      return;
    }

    reset({ ...values, amount: "" });
    setStatus("Payment recorded.");
    router.refresh();
  }

  return (
    <form
      aria-labelledby="record-payment"
      noValidate
      onSubmit={handleSubmit(submit)}
    >
      <h2 id="record-payment">Record a payment</h2>
      <p>CommonPot records the payment; it doesn&apos;t move any money.</p>

      <label htmlFor="payment-paid-by">Paid by</label>
      <select id="payment-paid-by" {...register("paidBy")}>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.id === currentUserId ? "You" : member.displayName}
          </option>
        ))}
      </select>

      <label htmlFor="payment-paid-to">Paid to</label>
      <select
        aria-describedby={errors.paidTo ? "payment-paid-to-error" : undefined}
        aria-invalid={Boolean(errors.paidTo)}
        id="payment-paid-to"
        {...register("paidTo")}
      >
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.id === currentUserId ? "You" : member.displayName}
          </option>
        ))}
      </select>
      {errors.paidTo && (
        <p id="payment-paid-to-error">{errors.paidTo.message}</p>
      )}

      <label htmlFor="payment-amount">Amount</label>
      <input
        aria-describedby={errors.amount ? "payment-amount-error" : undefined}
        aria-invalid={Boolean(errors.amount)}
        id="payment-amount"
        inputMode="decimal"
        {...register("amount")}
      />
      {errors.amount && (
        <p id="payment-amount-error">{errors.amount.message}</p>
      )}

      <label htmlFor="payment-date">Date</label>
      <input id="payment-date" type="date" {...register("paymentDate")} />

      <button disabled={isSubmitting} type="submit">
        Record payment
      </button>
      <p aria-live="polite">{status}</p>
      {submitError && <p role="alert">{submitError}</p>}
    </form>
  );
}
