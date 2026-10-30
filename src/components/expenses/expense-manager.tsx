"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  formatMoney,
  parseAmountToCents,
  splitEqually,
} from "@/lib/domain/expenses";
import {
  apiErrorSchema,
  createExpenseResponseSchema,
  expenseInputSchema,
  groupExpensesResponseSchema,
  type ExpenseInput,
  type GroupExpensesResponse,
} from "@/lib/validation/expenses";

function localDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function ExpenseManager({ groupId }: { groupId: string }) {
  const [data, setData] = useState<GroupExpensesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [expenseDate, setExpenseDate] = useState(localDate);
  const [paidByUserId, setPaidByUserId] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "exact">("equal");
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    async function loadExpenses() {
      setLoading(true);
      setLoadError("");
      const response = await fetch(
        `/api/v1/groups/${encodeURIComponent(groupId)}/expenses`,
        { signal: controller.signal },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(body);
        setLoadError(
          parsedError.success
            ? parsedError.data.error.message
            : "Group expenses could not be loaded.",
        );
        setLoading(false);
        return;
      }

      const parsed = groupExpensesResponseSchema.safeParse(body);
      if (!parsed.success) {
        setLoadError("The server returned an invalid expense list.");
        setLoading(false);
        return;
      }

      setData(parsed.data);
      setPaidByUserId(parsed.data.currentUserId);
      setParticipantUserIds(parsed.data.members.map((member) => member.userId));
      setLoading(false);
    }

    loadExpenses().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setLoadError("Group expenses could not be loaded. Please try again.");
      setLoading(false);
    });

    return () => controller.abort();
  }, [groupId]);

  const amountCents = parseAmountToCents(amount);
  const selectedMemberIds = data
    ? data.members
        .map((member) => member.userId)
        .filter((userId) => participantUserIds.includes(userId))
    : [];
  const equalPreview =
    amountCents !== null && amountCents > 0 && selectedMemberIds.length > 0
      ? splitEqually(amountCents, selectedMemberIds)
      : [];
  const exactShareAmounts = selectedMemberIds.map((userId) =>
    parseAmountToCents(exactAmounts[userId] ?? ""),
  );
  const exactShareDifference =
    amountCents !== null &&
    exactShareAmounts.every((shareAmount): shareAmount is number => shareAmount !== null)
      ? amountCents -
        exactShareAmounts.reduce((total, shareAmount) => total + shareAmount, 0)
      : null;

  function updateParticipants(userId: string, selected: boolean) {
    setParticipantUserIds((currentIds) =>
      selected
        ? [...currentIds, userId]
        : currentIds.filter((currentId) => currentId !== userId),
    );
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    setSavedMessage("");
    setFieldErrors({});

    if (amountCents === null) {
      setFieldErrors({
        amountCents: "Enter an amount with no more than two decimal places.",
      });
      return;
    }

    const input: ExpenseInput = {
      amountCents,
      description,
      category,
      expenseDate,
      paidByUserId,
      splitType,
      participantUserIds: selectedMemberIds,
      ...(splitType === "exact"
        ? {
            exactShares: selectedMemberIds.map((userId) => ({
              userId,
              amountCents: parseAmountToCents(exactAmounts[userId] ?? "") ?? -1,
            })),
          }
        : {}),
    };
    const validation = expenseInputSchema.safeParse(input);
    if (!validation.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string" && !nextErrors[fieldName]) {
          nextErrors[fieldName] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/v1/groups/${encodeURIComponent(groupId)}/expenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        const parsedError = apiErrorSchema.safeParse(body);
        setSaveError(
          parsedError.success
            ? parsedError.data.error.message
            : "The expense could not be saved. Please try again.",
        );
        return;
      }

      const createdExpense = createExpenseResponseSchema.safeParse(body);
      if (!createdExpense.success) {
        setSaveError("The server returned an invalid save confirmation.");
        return;
      }

      const listResponse = await fetch(
        `/api/v1/groups/${encodeURIComponent(groupId)}/expenses`,
      );
      const listBody: unknown = await listResponse.json();
      const updatedList = groupExpensesResponseSchema.safeParse(listBody);
      if (!listResponse.ok || !updatedList.success) {
        setSaveError("The expense was saved, but the list could not be refreshed.");
        return;
      }

      setData(updatedList.data);
      setDescription("");
      setAmount("");
      setSavedMessage("Expense added.");
    } catch (error) {
      console.error(
        "Could not confirm the group expense save:",
        error instanceof Error ? error.message : error,
      );
      setSaveError(
        "The save could not be confirmed. Refresh the expense list before trying again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p role="status">Loading group expenses…</p>
      </main>
    );
  }
  if (loadError || !data) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h1>Group expenses</h1>
          <p className="error-message" role="alert">
            {loadError || "Group expenses could not be loaded."}
          </p>
        </section>
      </main>
    );
  }

  const memberNames = new Map(
    data.members.map((member) => [member.userId, member.displayName]),
  );

  return (
    <main className="page-shell">
      <p className="eyebrow">CommonPot · Group expenses</p>
      <h1>{data.group.name}</h1>
      <div className="expense-layout">
        <section className="panel" aria-labelledby="add-expense-heading">
          <h2 id="add-expense-heading">Add an expense</h2>
          <form className="expense-form" onSubmit={submitExpense}>
            <div className="field">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                required
                maxLength={200}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={
                  fieldErrors.description ? "description-error" : undefined
                }
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              {fieldErrors.description && (
                <span className="error-message" id="description-error" role="alert">
                  {fieldErrors.description}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="amount">Amount ({data.group.currency})</label>
              <input
                id="amount"
                required
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.amountCents)}
                aria-describedby={
                  fieldErrors.amountCents ? "amount-error" : undefined
                }
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {fieldErrors.amountCents && (
                <span className="error-message" id="amount-error" role="alert">
                  {fieldErrors.amountCents}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <input
                id="category"
                required
                maxLength={40}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={
                  fieldErrors.category ? "category-error" : undefined
                }
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
              {fieldErrors.category && (
                <span className="error-message" id="category-error" role="alert">
                  {fieldErrors.category}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="expense-date">Date</label>
              <input
                id="expense-date"
                type="date"
                required
                aria-invalid={Boolean(fieldErrors.expenseDate)}
                aria-describedby={
                  fieldErrors.expenseDate ? "expense-date-error" : undefined
                }
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
              />
              {fieldErrors.expenseDate && (
                <span
                  className="error-message"
                  id="expense-date-error"
                  role="alert"
                >
                  {fieldErrors.expenseDate}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="paid-by">Paid by</label>
              <select
                id="paid-by"
                required
                value={paidByUserId}
                onChange={(event) => setPaidByUserId(event.target.value)}
              >
                {data.members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userId === data.currentUserId
                      ? `${member.displayName} (you)`
                      : member.displayName}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="field radio-list">
              <legend>Split method</legend>
              <label className="radio-row">
                <input
                  type="radio"
                  name="split-type"
                  value="equal"
                  checked={splitType === "equal"}
                  onChange={() => setSplitType("equal")}
                />
                Split equally
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  name="split-type"
                  value="exact"
                  checked={splitType === "exact"}
                  onChange={() => setSplitType("exact")}
                />
                Enter exact amounts
              </label>
            </fieldset>
            <fieldset className="field member-list">
              <legend>Shared by</legend>
              {fieldErrors.participantUserIds && (
                <span className="error-message" role="alert">
                  {fieldErrors.participantUserIds}
                </span>
              )}
              {data.members.map((member) => (
                <div className="member-row" key={member.userId}>
                  <label className="member-row">
                    <input
                      type="checkbox"
                      checked={participantUserIds.includes(member.userId)}
                      onChange={(event) =>
                        updateParticipants(member.userId, event.target.checked)
                      }
                    />
                    {member.displayName}
                  </label>
                  {splitType === "exact" &&
                    participantUserIds.includes(member.userId) && (
                      <div className="field">
                        <label
                          className="muted"
                          htmlFor={`share-${member.userId}`}
                        >
                          Share for {member.displayName} ({data.group.currency})
                        </label>
                        <input
                          id={`share-${member.userId}`}
                          inputMode="decimal"
                          placeholder="0.00"
                          value={exactAmounts[member.userId] ?? ""}
                          onChange={(event) =>
                            setExactAmounts((current) => ({
                              ...current,
                              [member.userId]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                </div>
              ))}
            </fieldset>
            {splitType === "equal" && equalPreview.length > 0 && (
              <div className="amount-hint" aria-live="polite">
                {equalPreview.map((share) => (
                  <p key={share.userId}>
                    {memberNames.get(share.userId)}:{" "}
                    {formatMoney(share.amountCents, data.group.currency)}
                  </p>
                ))}
              </div>
            )}
            {splitType === "exact" && (
              <div className="amount-hint" aria-live="polite">
                <p>
                  Exact shares must add up to{" "}
                  {amountCents !== null && amountCents > 0
                    ? formatMoney(amountCents, data.group.currency)
                    : "the expense total"}
                  .
                </p>
                {exactShareDifference !== null && exactShareDifference !== 0 && (
                  <p className="error-message">
                    Shares are{" "}
                    {formatMoney(
                      Math.abs(exactShareDifference),
                      data.group.currency,
                    )}{" "}
                    {exactShareDifference > 0 ? "short" : "over"} the total.
                  </p>
                )}
                {fieldErrors.exactShares && (
                  <p className="error-message" role="alert">
                    {fieldErrors.exactShares}
                  </p>
                )}
              </div>
            )}
            {saveError && (
              <p className="error-message" role="alert">
                {saveError}
              </p>
            )}
            {savedMessage && (
              <p className="success-message" role="status">
                {savedMessage}
              </p>
            )}
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving…" : "Add expense"}
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="expense-list-heading">
          <h2 id="expense-list-heading">Recent expenses</h2>
          {data.expenses.length === 0 ? (
            <p className="muted">No expenses yet. Add the first one.</p>
          ) : (
            <div className="expense-list">
              {data.expenses.map((expense) => (
                <article className="expense-card" key={expense.id}>
                  <h3>{expense.description}</h3>
                  <p>
                    {formatMoney(expense.amountCents, data.group.currency)} ·{" "}
                    {expense.category} · {expense.expenseDate}
                  </p>
                  <p className="muted">
                    Paid by {memberNames.get(expense.paidByUserId) ?? "a member"}{" "}
                    · {expense.splitType} split
                  </p>
                  <ul className="share-list">
                    {expense.shares.map((share) => (
                      <li key={share.userId}>
                        {memberNames.get(share.userId) ?? "A member"}:{" "}
                        {formatMoney(share.amountCents, data.group.currency)}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
