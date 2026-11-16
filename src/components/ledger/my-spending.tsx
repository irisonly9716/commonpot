"use client";

import { useEffect, useState } from "react";

import type { PersonalExpense } from "@/lib/data/personal";
import type { MySpending as MySpendingData } from "@/lib/domain/personal-spending";
import { getLocalMonthString } from "@/lib/local-date";
import { monthSchema } from "@/lib/validation/personal";
import { LedgerList } from "./ledger-list";
import { PersonalExpenseForm } from "./personal-expense-form";
import { SpendingTables } from "./spending-tables";

const longMonth = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthLabelOf(month: string): string {
  return longMonth.format(new Date(`${month}-01T00:00:00Z`));
}

const SUGGESTED_CATEGORIES = ["Groceries", "Dining", "Transport", "Personal"];

type Loaded = {
  month: string;
  spending: MySpendingData;
  expenses: PersonalExpense[];
};

/**
 * My spending (US10): my personal ledger plus my share of every group expense
 * for one month. Without `initialMonth` the month is this month in the
 * browser's own time zone.
 */
export function MySpending({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(
    () => initialMonth ?? getLocalMonthString(),
  );
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failedMonth, setFailedMonth] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<PersonalExpense | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [spendingResponse, expensesResponse] = await Promise.all([
        fetch(`/api/v1/me/spending?month=${month}`).catch(() => null),
        fetch(`/api/v1/personal-expenses?month=${month}`).catch(() => null),
      ]);
      if (cancelled) return;
      if (!spendingResponse?.ok || !expensesResponse?.ok) {
        setFailedMonth(month);
        return;
      }
      const [spending, expenses] = (await Promise.all([
        spendingResponse.json(),
        expensesResponse.json(),
      ])) as [MySpendingData, PersonalExpense[]];
      if (cancelled) return;
      setFailedMonth(null);
      setLoaded({ month, spending, expenses });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [month, version]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function chooseMonth(value: string) {
    if (!monthSchema.safeParse(value).success) return;
    setMonth(value);
    setEditing(null);
    window.history.replaceState(null, "", `?month=${value}`);
  }

  const monthLabel = monthLabelOf(month);
  const current = loaded?.month === month ? loaded : null;
  const categories = [
    ...new Set([
      ...SUGGESTED_CATEGORIES,
      ...(current?.expenses.map((expense) => expense.category) ?? []),
    ]),
  ];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-display font-semibold">My spending</h1>
        <p className="text-muted">
          Your personal expenses plus your share of every group expense. Only
          you can see your personal expenses.
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-label font-semibold">Month</span>
          <input
            className="border-line bg-surface min-h-11 rounded-sm border px-3"
            onChange={(event) => chooseMonth(event.target.value)}
            suppressHydrationWarning
            type="month"
            value={month}
          />
        </label>
      </header>

      {failedMonth === month && (
        <p className="text-owes" role="alert">
          Could not load your spending. Try again.
        </p>
      )}
      {!current && failedMonth !== month && <p role="status">Loading…</p>}

      {current && (
        <>
          {current.spending.currencies.map((spending) => (
            <SpendingTables
              key={spending.currency}
              monthLabel={monthLabel}
              showCurrency={current.spending.currencies.length > 1}
              spending={spending}
            />
          ))}
          <LedgerList
            expenses={current.expenses}
            monthLabel={monthLabel}
            onChanged={refresh}
            onEdit={setEditing}
          />
        </>
      )}

      <PersonalExpenseForm
        categories={categories}
        expense={editing}
        key={editing?.id ?? "new"}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    </main>
  );
}
