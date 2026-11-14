/** Spending totals for the insights page (US8). Pure: amounts are integer cents. */

export const UNCATEGORIZED = "Uncategorized";

export type SpendingExpense = {
  id: string;
  /** ISO date, `2026-10-31`. */
  expenseDate: string;
  amountCents: number;
  categoryName: string | null;
  shares: Array<{ userId: string; amountCents: number }>;
};

/** Group: what the group spent. Me: my share of each expense, not what I paid. */
export type SpendingScope = { kind: "group" } | { kind: "me"; userId: string };

export type CategorySpending = {
  category: string;
  amountCents: number;
  /** Whole-number percent of the month's total. */
  percent: number;
};

export type MonthSpending = { month: string; amountCents: number };

/** `2026-10-31` becomes `2026-10`. */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Moves a `YYYY-MM` month forward or back, across years. */
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + (number - 1) + delta;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

function countedCents(expense: SpendingExpense, scope: SpendingScope): number {
  if (scope.kind === "group") return expense.amountCents;
  return expense.shares
    .filter((share) => share.userId === scope.userId)
    .reduce((sum, share) => sum + share.amountCents, 0);
}

export function monthTotal(
  expenses: readonly SpendingExpense[],
  scope: SpendingScope,
  month: string,
): number {
  return expenses
    .filter((expense) => monthOf(expense.expenseDate) === month)
    .reduce((sum, expense) => sum + countedCents(expense, scope), 0);
}

/** Largest category first. Categories that add up to nothing are left out. */
export function spendingByCategory(
  expenses: readonly SpendingExpense[],
  scope: SpendingScope,
  month: string,
): CategorySpending[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (monthOf(expense.expenseDate) !== month) continue;
    const cents = countedCents(expense, scope);
    if (cents === 0) continue;
    const category = expense.categoryName ?? UNCATEGORIZED;
    totals.set(category, (totals.get(category) ?? 0) + cents);
  }

  const total = [...totals.values()].reduce((sum, cents) => sum + cents, 0);
  return [...totals.entries()]
    .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
    .map(([category, amountCents]) => ({
      category,
      amountCents,
      percent: Math.round((amountCents / total) * 100),
    }));
}

/** The chosen month and the five before it, oldest first. Empty months are 0. */
export function monthlyTrend(
  expenses: readonly SpendingExpense[],
  scope: SpendingScope,
  endMonth: string,
  months = 6,
): MonthSpending[] {
  return Array.from({ length: months }, (_, i) => {
    const month = shiftMonth(endMonth, i - (months - 1));
    return { month, amountCents: monthTotal(expenses, scope, month) };
  });
}
