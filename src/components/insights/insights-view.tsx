"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  monthTotal,
  monthlyTrend,
  shiftMonth,
  spendingByCategory,
  type SpendingExpense,
  type SpendingScope,
} from "@/lib/domain/spending";
import { formatMonth } from "@/lib/format-month";
import { formatMoney } from "@/lib/format-money";
import { ChartTable } from "./chart-table";
import { SpendingChart } from "./spending-chart";

type InsightsViewProps = {
  groupName: string;
  currency: string;
  currentUserId: string;
  /** The month shown, `2026-10`. */
  month: string;
  /** The newest month the server offers: its own current month. */
  latestMonth: string;
  /**
   * True when `month` came from the address. When it did not, the server
   * guessed this month from its own (UTC) date, and the browser's local month
   * replaces it if the two differ.
   */
  monthFromUrl: boolean;
  /** Expenses for `month` and the five months before it. */
  expenses: SpendingExpense[];
};

const PICKER_MONTHS = 12;

function subscribeToNothing(): () => void {
  return () => {};
}

function currentLocalMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`border-primary min-h-11 flex-1 border px-4 font-semibold ${
            value === option ? "bg-primary text-surface" : "text-primary"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function InsightsView({
  groupName,
  currency,
  currentUserId,
  month,
  latestMonth,
  monthFromUrl,
  expenses,
}: InsightsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [who, setWho] = useState<"Me" | "Group">("Group");
  const [display, setDisplay] = useState<"Chart" | "Table">("Chart");
  // "This month" means the visitor's month. New expenses default to the
  // browser's date, so the server's UTC month can be a day off near month end.
  // It is null while rendering on the server and before hydration.
  const localMonth = useSyncExternalStore(
    subscribeToNothing,
    currentLocalMonth,
    () => null,
  );

  useEffect(() => {
    if (!monthFromUrl && localMonth && localMonth !== month) {
      router.replace(`${pathname}?month=${localMonth}`);
    }
  }, [monthFromUrl, localMonth, month, pathname, router]);

  const scope: SpendingScope =
    who === "Me" ? { kind: "me", userId: currentUserId } : { kind: "group" };
  const total = monthTotal(expenses, scope, month);
  const categories = spendingByCategory(expenses, scope, month);
  const trend = monthlyTrend(expenses, scope, month);
  const monthName = formatMonth(month);
  const newest = [latestMonth, month, localMonth ?? latestMonth].sort().at(-1)!;
  const pickerMonths = Array.from({ length: PICKER_MONTHS }, (_, i) =>
    shiftMonth(newest, -i),
  );
  // The page accepts any past month, so the picker must be able to show it.
  if (!pickerMonths.includes(month)) pickerMonths.push(month);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <header>
        <p className="text-muted text-sm tracking-wide uppercase">
          {groupName}
        </p>
        <h1 className="text-2xl font-semibold">Insights</h1>
      </header>

      <div className="flex flex-col gap-3">
        <Toggle
          label="Whose spending"
          options={["Me", "Group"] as const}
          value={who}
          onChange={setWho}
        />
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col">
            <label htmlFor="insights-month" className="text-muted text-sm">
              Month
            </label>
            <select
              id="insights-month"
              value={month}
              onChange={(event) =>
                router.push(`${pathname}?month=${event.target.value}`)
              }
              className="border-line bg-surface min-h-11 border px-3"
            >
              {pickerMonths.map((value) => (
                <option key={value} value={value}>
                  {formatMonth(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 self-end">
            <Toggle
              label="How to show it"
              options={["Chart", "Table"] as const}
              value={display}
              onChange={setDisplay}
            />
          </div>
        </div>
      </div>

      <section aria-labelledby="by-category" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2
            id="by-category"
            className="text-muted text-sm font-semibold tracking-wide uppercase"
          >
            By category
          </h2>
          <p className="text-muted text-sm">
            Total {formatMoney(total, currency)}
          </p>
        </div>
        {categories.length === 0 ? (
          <p>No spending in {monthName}.</p>
        ) : display === "Chart" ? (
          <>
            <SpendingChart
              direction="rows"
              currency={currency}
              description={`Spending by category, ${monthName}. Switch to Table for exact numbers.`}
              points={categories.map((row) => ({
                label: row.category,
                amountCents: row.amountCents,
              }))}
            />
            <ul className="flex flex-col gap-1">
              {categories.map((row) => (
                <li key={row.category} className="flex justify-between">
                  <span>{row.category}</span>
                  <span>
                    {formatMoney(row.amountCents, currency)} · {row.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ChartTable
            caption={`Spending by category, ${monthName}`}
            firstColumn="Category"
            currency={currency}
            totalCents={total}
            rows={categories.map((row) => ({
              label: row.category,
              amountCents: row.amountCents,
              detail: `${row.percent}%`,
            }))}
          />
        )}
      </section>

      <section aria-labelledby="last-six" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2
            id="last-six"
            className="text-muted text-sm font-semibold tracking-wide uppercase"
          >
            Last 6 months
          </h2>
          <p className="text-muted text-sm">
            {who === "Me" ? "My share" : "Group total"}
          </p>
        </div>
        {display === "Chart" ? (
          <SpendingChart
            direction="columns"
            currency={currency}
            description="Spending in each of the last 6 months. Switch to Table for exact numbers."
            points={trend.map((point) => ({
              label: formatMonth(point.month).split(" ")[0].slice(0, 3),
              amountCents: point.amountCents,
              highlight: point.month === month,
            }))}
          />
        ) : (
          <ChartTable
            caption="Spending by month"
            firstColumn="Month"
            currency={currency}
            rows={trend.map((point) => ({
              label: formatMonth(point.month),
              amountCents: point.amountCents,
            }))}
          />
        )}
      </section>
    </main>
  );
}
