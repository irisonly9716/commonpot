"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  checkExactSplit,
  parseAmountToCents,
  splitEqually,
} from "@/lib/domain/expenses";
import { formatMoney } from "@/lib/format-money";
import {
  expenseCreateSchema,
  expenseFormSchema,
  type ExpenseFormInput,
} from "@/lib/validation/expenses";

type Member = { id: string; displayName: string };
type Category = { id: string; name: string };

type ExpenseFormProps = {
  groupId: string;
  currentUserId: string;
  members: Member[];
  categories: Category[];
  currency: string;
  onCreated?: () => void;
};

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultValues(
  currentUserId: string,
  members: Member[],
  categories: Category[],
): ExpenseFormInput {
  return {
    amount: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    expenseDate: getLocalDateString(),
    paidBy: currentUserId,
    splitMode: "equal",
    memberIds: members.map((member) => member.id),
    exactAmounts: {},
  };
}

export function ExpenseForm({
  groupId,
  currentUserId,
  members,
  categories,
  currency,
  onCreated,
}: ExpenseFormProps) {
  const defaults = useMemo(
    () => getDefaultValues(currentUserId, members, categories),
    [categories, currentUserId, members],
  );
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm<ExpenseFormInput>({
    defaultValues: defaults,
    resolver: zodResolver(expenseFormSchema),
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const amount = useWatch({ control, name: "amount" });
  const splitMode = useWatch({ control, name: "splitMode" });
  const memberIds = useWatch({ control, name: "memberIds" });
  const exactAmounts = useWatch({ control, name: "exactAmounts" });

  const amountCents = useMemo(() => {
    try {
      return amount ? parseAmountToCents(amount) : 0;
    } catch {
      return 0;
    }
  }, [amount]);

  const selectedMembers = members.filter((member) =>
    memberIds.includes(member.id),
  );
  const equalShares = amountCents
    ? splitEqually(
        amountCents,
        selectedMembers.map((member) => member.id),
      )
    : [];
  const exactShares = selectedMembers.map((member) => {
    let shareAmountCents = 0;
    try {
      shareAmountCents = exactAmounts[member.id]
        ? parseAmountToCents(exactAmounts[member.id])
        : 0;
    } catch {
      shareAmountCents = 0;
    }
    return { userId: member.id, amountCents: shareAmountCents };
  });
  const exactDifference = checkExactSplit(
    amountCents,
    exactShares.map((share) => share.amountCents),
  ).differenceCents;
  const exactValid = splitMode === "equal" || exactDifference === 0;
  const shares = splitMode === "equal" ? equalShares : exactShares;

  function toggleMember(memberId: string) {
    const next = memberIds.includes(memberId)
      ? memberIds.filter((id) => id !== memberId)
      : [...memberIds, memberId];
    setValue("memberIds", next, { shouldValidate: true });
    clearErrors("memberIds");
  }

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    let parsedAmountCents: number;
    try {
      parsedAmountCents = parseAmountToCents(values.amount);
    } catch {
      setError("amount", {
        message: "Enter an amount greater than $0 with at most 2 decimals",
      });
      return;
    }

    const result = expenseCreateSchema.safeParse({
      amountCents: parsedAmountCents,
      description: values.description,
      categoryId: values.categoryId || null,
      expenseDate: values.expenseDate,
      paidBy: values.paidBy,
      shares,
    });
    if (!result.success || !exactValid) {
      if (!result.success) {
        const issue = result.error.issues[0];
        if (issue?.path[0] === "description") {
          setError("description", { message: issue.message });
        } else if (issue?.path[0] === "shares") {
          setSubmitError(issue.message);
        }
      }
      if (!exactValid) {
        setSubmitError(
          `Exact amounts must add up to ${formatMoney(amountCents, currency)}.`,
        );
      }
      return;
    }

    try {
      const response = await fetch(`/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.data),
      });
      if (!response.ok) {
        setSubmitError("Could not save expense.");
        return;
      }
      reset(defaults);
      onCreated?.();
    } catch {
      setSubmitError("Could not save expense.");
    }
  });

  return (
    <form className="expense-form" onSubmit={submit} noValidate>
      <h1>Add expense</h1>
      <label>
        Amount
        <input
          aria-describedby={errors.amount ? "amount-error" : undefined}
          aria-invalid={Boolean(errors.amount)}
          inputMode="decimal"
          {...register("amount")}
        />
      </label>
      {errors.amount && <p id="amount-error">{errors.amount.message}</p>}

      <label>
        Description
        <input
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          aria-invalid={Boolean(errors.description)}
          maxLength={200}
          {...register("description")}
        />
      </label>
      {errors.description && (
        <p id="description-error">{errors.description.message}</p>
      )}

      <label>
        Category
        <select {...register("categoryId")}>
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input
          aria-describedby={errors.expenseDate ? "date-error" : undefined}
          aria-invalid={Boolean(errors.expenseDate)}
          type="date"
          {...register("expenseDate")}
        />
      </label>
      {errors.expenseDate && (
        <p id="date-error">{errors.expenseDate.message}</p>
      )}

      <label>
        Paid by
        <select {...register("paidBy")}>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Split</legend>
        <label>
          <input type="radio" value="equal" {...register("splitMode")} />
          Equally
        </label>
        <label>
          <input type="radio" value="exact" {...register("splitMode")} />
          Exact amounts
        </label>
      </fieldset>

      <fieldset>
        <legend>Shared by</legend>
        {members.map((member) => {
          const share = shares.find((item) => item.userId === member.id);
          const isSelected = memberIds.includes(member.id);
          return (
            <label key={member.id}>
              <input
                checked={isSelected}
                onChange={() => toggleMember(member.id)}
                type="checkbox"
              />
              {member.displayName}
              {isSelected ? (
                splitMode === "exact" ? (
                  <input
                    aria-label={`${member.displayName} exact amount`}
                    inputMode="decimal"
                    {...register(`exactAmounts.${member.id}`)}
                  />
                ) : (
                  <span>{formatMoney(share?.amountCents ?? 0, currency)}</span>
                )
              ) : (
                <span>not sharing</span>
              )}
            </label>
          );
        })}
      </fieldset>

      {splitMode === "equal" && amountCents > 0 && (
        <p>
          {formatMoney(amountCents, currency)} is split equally; leftover cents
          go to members one at a time.
        </p>
      )}
      {splitMode === "exact" && (
        <p aria-live="polite">
          <span>
            {formatMoney(exactDifference, currency)} left to assign. Exact
            amounts must add up to {formatMoney(amountCents, currency)}.
          </span>
        </p>
      )}
      {submitError && <p role="alert">{submitError}</p>}
      <button disabled={isSubmitting || !exactValid} type="submit">
        Save expense
      </button>
    </form>
  );
}
