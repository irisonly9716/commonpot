"use client";

import { useMemo, useState } from "react";

import {
  checkExactSplit,
  parseAmountToCents,
  splitEqually,
} from "../../lib/domain/expenses";
import { expenseCreateSchema } from "../../lib/validation/expenses";

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

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({
  groupId,
  currentUserId,
  members,
  categories,
  currency,
  onCreated,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [expenseDate, setExpenseDate] = useState(today);
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [selectedMemberIds, setSelectedMemberIds] = useState(
    () => new Set(members.map((member) => member.id)),
  );
  const [splitMode, setSplitMode] = useState<"equal" | "exact">("equal");
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const amountCents = useMemo(() => {
    try {
      return amount ? parseAmountToCents(amount) : 0;
    } catch {
      return 0;
    }
  }, [amount]);

  const selectedMembers = members.filter((member) =>
    selectedMemberIds.has(member.id),
  );
  const equalShares = amountCents
    ? splitEqually(
        amountCents,
        selectedMembers.map((member) => member.id),
      )
    : [];
  const exactShares = selectedMembers.map((member) => ({
    userId: member.id,
    amountCents: (() => {
      try {
        return exactAmounts[member.id]
          ? parseAmountToCents(exactAmounts[member.id])
          : 0;
      } catch {
        return 0;
      }
    })(),
  }));
  const exactDifference = checkExactSplit(
    amountCents,
    exactShares.map((share) => share.amountCents),
  ).differenceCents;
  const shares = splitMode === "equal" ? equalShares : exactShares;
  const exactValid = splitMode === "equal" || exactDifference === 0;

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = expenseCreateSchema.safeParse({
      amountCents,
      description,
      categoryId: categoryId || null,
      expenseDate,
      paidBy,
      shares,
    });
    if (!result.success || !exactValid) {
      setErrors({
        ...(result.success
          ? {}
          : Object.fromEntries(
              result.error.issues.map((issue) => [
                String(issue.path[0] ?? "form"),
                issue.message,
              ]),
            )),
        ...(exactValid
          ? {}
          : {
              shares: `Exact amounts must add up to ${formatMoney(amountCents, currency)}.`,
            }),
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.data),
      });
      if (!response.ok) {
        setErrors({ form: "Could not save expense." });
        return;
      }
      onCreated?.();
    } catch {
      setErrors({ form: "Could not save expense." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={submit} noValidate>
      <h1>Add expense</h1>
      <label>
        Amount
        <input
          aria-describedby={errors.amountCents ? "amount-error" : undefined}
          aria-invalid={Boolean(errors.amountCents)}
          inputMode="decimal"
          name="amount"
          onChange={(event) => setAmount(event.target.value)}
          value={amount}
        />
      </label>
      {errors.amountCents && <p id="amount-error">{errors.amountCents}</p>}

      <label>
        Description
        <input
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          aria-invalid={Boolean(errors.description)}
          name="description"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      {errors.description && <p id="description-error">{errors.description}</p>}

      <label>
        Category
        <select
          name="category"
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId}
        >
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
          name="date"
          onChange={(event) => setExpenseDate(event.target.value)}
          type="date"
          value={expenseDate}
        />
      </label>
      {errors.expenseDate && <p id="date-error">{errors.expenseDate}</p>}

      <label>
        Paid by
        <select
          name="paidBy"
          onChange={(event) => setPaidBy(event.target.value)}
          value={paidBy}
        >
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
          <input
            checked={splitMode === "equal"}
            name="splitMode"
            onChange={() => setSplitMode("equal")}
            type="radio"
          />
          Equally
        </label>
        <label>
          <input
            checked={splitMode === "exact"}
            name="splitMode"
            onChange={() => setSplitMode("exact")}
            type="radio"
          />
          Exact amounts
        </label>
      </fieldset>

      <fieldset>
        <legend>Shared by</legend>
        {members.map((member) => {
          const share = shares.find((item) => item.userId === member.id);
          return (
            <label key={member.id}>
              <input
                checked={selectedMemberIds.has(member.id)}
                onChange={() => toggleMember(member.id)}
                type="checkbox"
              />
              {member.displayName}
              {selectedMemberIds.has(member.id) ? (
                splitMode === "exact" ? (
                  <input
                    aria-label={`${member.displayName} exact amount`}
                    inputMode="decimal"
                    onChange={(event) =>
                      setExactAmounts((current) => ({
                        ...current,
                        [member.id]: event.target.value,
                      }))
                    }
                    value={exactAmounts[member.id] ?? ""}
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
        <p role="alert">
          {formatMoney(exactDifference, currency)} left to assign. Exact amounts
          must add up to {formatMoney(amountCents, currency)}.
        </p>
      )}
      {errors.shares && <p role="alert">{errors.shares}</p>}
      {errors.form && <p role="alert">{errors.form}</p>}
      <button disabled={submitting || !exactValid} type="submit">
        Save expense
      </button>
    </form>
  );
}
