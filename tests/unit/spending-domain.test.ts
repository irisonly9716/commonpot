import { describe, expect, it } from "vitest";

import {
  UNCATEGORIZED,
  monthTotal,
  monthlyTrend,
  shiftMonth,
  spendingByCategory,
  type SpendingExpense,
} from "@/lib/domain/spending";

const me = "user-me";
const other = "user-other";

function expense(
  id: string,
  date: string,
  amountCents: number,
  categoryName: string | null,
  shares: Array<[string, number]>,
): SpendingExpense {
  return {
    id,
    expenseDate: date,
    amountCents,
    categoryName,
    shares: shares.map(([userId, cents]) => ({ userId, amountCents: cents })),
  };
}

const expenses: SpendingExpense[] = [
  // I paid the whole 90.00 but my share is only 30.00.
  expense("a", "2026-10-03", 9000, "Groceries", [
    [me, 3000],
    [other, 6000],
  ]),
  // The other person paid; my share is 10.01.
  expense("b", "2026-10-31", 2001, "Utilities", [
    [me, 1001],
    [other, 1000],
  ]),
  expense("c", "2026-10-15", 500, null, [[other, 500]]),
  expense("d", "2026-09-01", 4000, "Groceries", [
    [me, 2000],
    [other, 2000],
  ]),
];

describe("US8 see where the money goes", () => {
  describe("monthTotal", () => {
    it("adds up the whole group's expenses for the Group view", () => {
      expect(monthTotal(expenses, { kind: "group" }, "2026-10")).toBe(11501);
    });

    it("counts my share, not what I paid, for the Me view", () => {
      expect(monthTotal(expenses, { kind: "me", userId: me }, "2026-10")).toBe(
        4001,
      );
    });

    it("includes the first and last day of the month and nothing else", () => {
      const edges = [
        expense("x", "2026-10-01", 100, "Other", [[me, 100]]),
        expense("y", "2026-10-31", 200, "Other", [[me, 200]]),
        expense("z", "2026-11-01", 400, "Other", [[me, 400]]),
        expense("w", "2026-09-30", 800, "Other", [[me, 800]]),
      ];
      expect(monthTotal(edges, { kind: "group" }, "2026-10")).toBe(300);
    });

    it("is zero for a month with no expenses", () => {
      expect(monthTotal(expenses, { kind: "group" }, "2025-01")).toBe(0);
    });
  });

  describe("spendingByCategory", () => {
    it("groups by category, largest first, and the rows add up to the total", () => {
      const rows = spendingByCategory(expenses, { kind: "group" }, "2026-10");
      expect(rows.map((r) => [r.category, r.amountCents])).toEqual([
        ["Groceries", 9000],
        ["Utilities", 2001],
        [UNCATEGORIZED, 500],
      ]);
      expect(rows.reduce((sum, r) => sum + r.amountCents, 0)).toBe(
        monthTotal(expenses, { kind: "group" }, "2026-10"),
      );
    });

    it("uses my shares in the Me view and leaves out categories I have no share in", () => {
      const rows = spendingByCategory(
        expenses,
        { kind: "me", userId: me },
        "2026-10",
      );
      expect(rows.map((r) => [r.category, r.amountCents])).toEqual([
        ["Groceries", 3000],
        ["Utilities", 1001],
      ]);
    });

    it("gives each row a whole-number percent that adds up to 100", () => {
      const rows = spendingByCategory(expenses, { kind: "group" }, "2026-10");
      // 78.3%, 17.4% and 4.3%: the leftover point goes to the largest remainder.
      expect(rows.map((r) => r.percent)).toEqual([78, 18, 4]);
      expect(rows.reduce((sum, r) => sum + r.percent, 0)).toBe(100);
    });

    it.each([
      [[3333, 3333, 3334]],
      [[1, 1, 1, 1, 1, 1, 1]],
      [[5000, 2500, 2500]],
      [[999, 1, 1]],
      [[100]],
    ])("makes the percents add up to 100 for %j", (amounts) => {
      const many = amounts.map((cents, i) =>
        expense(`e${i}`, "2026-10-05", cents, `Category ${i}`, [[me, cents]]),
      );
      const rows = spendingByCategory(many, { kind: "group" }, "2026-10");
      expect(rows.reduce((sum, r) => sum + r.percent, 0)).toBe(100);
    });

    it("returns no rows for an empty month", () => {
      expect(
        spendingByCategory(expenses, { kind: "group" }, "2025-01"),
      ).toEqual([]);
    });
  });

  describe("monthlyTrend", () => {
    it("returns the last 6 months oldest first, ending with the chosen month", () => {
      const trend = monthlyTrend(expenses, { kind: "group" }, "2026-10");
      expect(trend.map((t) => t.month)).toEqual([
        "2026-05",
        "2026-06",
        "2026-07",
        "2026-08",
        "2026-09",
        "2026-10",
      ]);
    });

    it("shows months without expenses as zero", () => {
      const trend = monthlyTrend(expenses, { kind: "group" }, "2026-10");
      expect(trend.map((t) => t.amountCents)).toEqual([
        0, 0, 0, 0, 4000, 11501,
      ]);
    });

    it("crosses a year boundary", () => {
      const trend = monthlyTrend([], { kind: "group" }, "2026-02");
      expect(trend.map((t) => t.month)).toEqual([
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
      ]);
    });

    it("uses my shares in the Me view", () => {
      const trend = monthlyTrend(
        expenses,
        { kind: "me", userId: me },
        "2026-10",
      );
      expect(trend.at(-1)?.amountCents).toBe(4001);
      expect(trend.at(-2)?.amountCents).toBe(2000);
    });

    it("agrees with monthTotal for every month", () => {
      const scope = { kind: "group" } as const;
      for (const point of monthlyTrend(expenses, scope, "2026-10")) {
        expect(point.amountCents).toBe(
          monthTotal(expenses, scope, point.month),
        );
      }
    });
  });

  describe("shiftMonth", () => {
    it("moves back and forward across years", () => {
      expect(shiftMonth("2026-01", -1)).toBe("2025-12");
      expect(shiftMonth("2025-12", 1)).toBe("2026-01");
      expect(shiftMonth("2026-10", -5)).toBe("2026-05");
    });
  });
});
