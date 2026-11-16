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

export type MemberShare = {
  userId: string;
  amountCents: number;
  /** Whole-number percent of the month's total; 0 for everyone when it is 0. */
  percent: number;
};

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
  const sorted = [...totals.entries()].sort(
    ([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB),
  );
  const percents = wholePercents(
    sorted.map(([, amountCents]) => amountCents),
    total,
  );
  return sorted.map(([category, amountCents], index) => ({
    category,
    amountCents,
    percent: percents[index],
  }));
}

/**
 * Whole-number percents that always add up to 100. Each amount gets its share
 * rounded down, then the points that are left go one at a time to the largest
 * remainders (ties go to the earlier row), like the leftover-cents rule.
 */
function wholePercents(amounts: readonly number[], total: number): number[] {
  const exact = amounts.map((amount) => amount * 100);
  const percents = exact.map((value) => Math.floor(value / total));
  let leftover = 100 - percents.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value % total }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (leftover === 0) break;
    percents[index] += 1;
    leftover -= 1;
  }
  return percents;
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

/**
 * What each person's shares came to in a month (US9). Every current member is
 * listed, with 0 if they had no share. Someone who has left but still holds a
 * share is kept, so the rows always add up to the month's total. Largest first,
 * equal amounts by user id.
 */
export function memberShares(
  expenses: readonly SpendingExpense[],
  month: string,
  memberIds: readonly string[],
): MemberShare[] {
  const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (const expense of expenses) {
    if (monthOf(expense.expenseDate) !== month) continue;
    for (const share of expense.shares) {
      totals.set(
        share.userId,
        (totals.get(share.userId) ?? 0) + share.amountCents,
      );
    }
  }

  const sorted = [...totals.entries()].sort(
    ([idA, a], [idB, b]) => b - a || idA.localeCompare(idB),
  );
  const total = sorted.reduce((sum, [, cents]) => sum + cents, 0);
  const percents =
    total === 0
      ? sorted.map(() => 0)
      : wholePercents(
          sorted.map(([, cents]) => cents),
          total,
        );
  return sorted.map(([userId, amountCents], index) => ({
    userId,
    amountCents,
    percent: percents[index],
  }));
}
