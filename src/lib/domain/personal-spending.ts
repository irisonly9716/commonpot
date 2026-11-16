/**
 * My spending (US10): my personal expenses plus my share of every group
 * expense, by month. Pure functions on integer cents; dates are YYYY-MM-DD
 * strings, so months are compared as text and no time zone is involved.
 */

/** Personal expenses have no currency column; they count as this one. */
export const PERSONAL_CURRENCY = "USD";
export const PERSONAL_SOURCE = "personal";
export const UNCATEGORIZED = "Uncategorized";
export const TREND_MONTHS = 6;

export type PersonalSpendingItem = {
  amountCents: number;
  category: string;
  expenseDate: string;
};

export type GroupShareItem = {
  /** My share of the expense, not what anyone paid up front. */
  amountCents: number;
  expenseDate: string;
  groupId: string;
  groupName: string;
  currency: string;
  category: string | null;
};

export type SpendingBreakdown = {
  key: string;
  label: string;
  amountCents: number;
  percent: number;
};

export type MonthTotal = { month: string; amountCents: number };

export type CurrencySpending = {
  currency: string;
  totalCents: number;
  byCategory: SpendingBreakdown[];
  bySource: SpendingBreakdown[];
  trend: MonthTotal[];
};

export type MySpending = { month: string; currencies: CurrencySpending[] };

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = (index % 12) + 1;
  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}`;
}

/** The `count` months that end with `month`, oldest first. */
export function previousMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    shiftMonth(month, index - count + 1),
  );
}

/** Dates from the first day of the oldest month to the day after `month` ends (exclusive). */
export function monthRange(
  month: string,
  count: number,
): { from: string; to: string } {
  return {
    from: `${shiftMonth(month, 1 - count)}-01`,
    to: `${shiftMonth(month, 1)}-01`,
  };
}

/**
 * Whole percentages that add up to exactly 100 (largest remainder): each part
 * is rounded down, then the leftover points go to the parts with the biggest
 * remainders, earlier parts first on a tie.
 */
export function splitPercent(amounts: number[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return amounts.map(() => 0);

  const exact = amounts.map((amount) => (amount * 100) / total);
  const parts = exact.map(Math.floor);
  let left = 100 - parts.reduce((sum, part) => sum + part, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (left === 0) break;
    parts[index] += 1;
    left -= 1;
  }
  return parts;
}

type Entry = {
  currency: string;
  month: string;
  amountCents: number;
  category: string;
  sourceKey: string;
  sourceLabel: string;
};

function toBreakdown(
  totals: Map<string, { label: string; amountCents: number }>,
): SpendingBreakdown[] {
  const rows = [...totals.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .filter((row) => row.amountCents > 0)
    .sort(
      (a, b) => b.amountCents - a.amountCents || a.label.localeCompare(b.label),
    );
  const percents = splitPercent(rows.map((row) => row.amountCents));
  return rows.map((row, index) => ({ ...row, percent: percents[index] }));
}

function add(
  totals: Map<string, { label: string; amountCents: number }>,
  key: string,
  label: string,
  amountCents: number,
) {
  const current = totals.get(key);
  totals.set(key, {
    label,
    amountCents: (current?.amountCents ?? 0) + amountCents,
  });
}

/**
 * My totals for `month`, one block per currency (USD first): the month's
 * total, by category, by source (personal and each group) and the 6-month
 * trend that ends with `month`.
 */
export function buildMySpending({
  month,
  personal,
  shares,
}: {
  month: string;
  personal: PersonalSpendingItem[];
  shares: GroupShareItem[];
}): MySpending {
  const months = previousMonths(month, TREND_MONTHS);
  const inWindow = new Set(months);

  const entries: Entry[] = [
    ...personal.map((item) => ({
      currency: PERSONAL_CURRENCY,
      month: item.expenseDate.slice(0, 7),
      amountCents: item.amountCents,
      category: item.category.trim() || UNCATEGORIZED,
      sourceKey: PERSONAL_SOURCE,
      sourceLabel: "Personal",
    })),
    ...shares.map((item) => ({
      currency: item.currency,
      month: item.expenseDate.slice(0, 7),
      amountCents: item.amountCents,
      category: item.category?.trim() || UNCATEGORIZED,
      sourceKey: item.groupId,
      sourceLabel: item.groupName,
    })),
  ].filter((entry) => entry.amountCents > 0 && inWindow.has(entry.month));

  const currencies = [
    PERSONAL_CURRENCY,
    ...[...new Set(entries.map((entry) => entry.currency))]
      .filter((currency) => currency !== PERSONAL_CURRENCY)
      .sort(),
  ];

  return {
    month,
    currencies: currencies.map((currency) => {
      const mine = entries.filter((entry) => entry.currency === currency);
      const thisMonth = mine.filter((entry) => entry.month === month);
      const byCategory = new Map<
        string,
        { label: string; amountCents: number }
      >();
      const bySource = new Map<
        string,
        { label: string; amountCents: number }
      >();
      for (const entry of thisMonth) {
        add(byCategory, entry.category, entry.category, entry.amountCents);
        add(bySource, entry.sourceKey, entry.sourceLabel, entry.amountCents);
      }

      return {
        currency,
        totalCents: thisMonth.reduce(
          (sum, entry) => sum + entry.amountCents,
          0,
        ),
        byCategory: toBreakdown(byCategory),
        bySource: toBreakdown(bySource),
        trend: months.map((trendMonth) => ({
          month: trendMonth,
          amountCents: mine
            .filter((entry) => entry.month === trendMonth)
            .reduce((sum, entry) => sum + entry.amountCents, 0),
        })),
      };
    }),
  };
}
