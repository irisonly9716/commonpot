import { describe, expect, it } from "vitest";

import {
  buildMySpending,
  monthRange,
  previousMonths,
  splitPercent,
  type GroupShareItem,
  type PersonalSpendingItem,
} from "@/lib/domain/personal-spending";

const household = "11111111-1111-4111-8111-111111111111";
const trip = "99999999-9999-4999-8999-999999999999";

function personal(
  amountCents: number,
  expenseDate: string,
  category = "Books",
): PersonalSpendingItem {
  return { amountCents, expenseDate, category };
}

function share(
  amountCents: number,
  expenseDate: string,
  overrides: Partial<GroupShareItem> = {},
): GroupShareItem {
  return {
    amountCents,
    expenseDate,
    groupId: household,
    groupName: "Iris household",
    currency: "USD",
    category: "Groceries",
    ...overrides,
  };
}

describe("US10 my personal ledger: months", () => {
  it("lists the six months that end with the chosen one, oldest first", () => {
    expect(previousMonths("2026-02", 6)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("gives a half-open date range covering those months", () => {
    expect(monthRange("2026-02", 6)).toEqual({
      from: "2025-09-01",
      to: "2026-03-01",
    });
    expect(monthRange("2026-12", 1)).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    });
  });
});

describe("US10 my personal ledger: percentages", () => {
  it("always adds up to exactly 100", () => {
    expect(splitPercent([1000, 1000, 1000])).toEqual([34, 33, 33]);
    expect(splitPercent([7800, 1700, 450, 50])).toEqual([78, 17, 5, 0]);
    const parts = splitPercent([333, 333, 334]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(100);
  });

  it("gives zeros when nothing was spent", () => {
    expect(splitPercent([0, 0])).toEqual([0, 0]);
    expect(splitPercent([])).toEqual([]);
  });
});

describe("US10 my personal ledger: totals", () => {
  it("adds my personal expenses and my group shares for the month", () => {
    const spending = buildMySpending({
      month: "2026-11",
      personal: [personal(1000, "2026-11-03")],
      shares: [share(600, "2026-11-10")],
    });

    expect(spending.month).toBe("2026-11");
    expect(spending.currencies).toHaveLength(1);
    const usd = spending.currencies[0];
    expect(usd.currency).toBe("USD");
    expect(usd.totalCents).toBe(1600);
    expect(usd.bySource).toEqual([
      { key: "personal", label: "Personal", amountCents: 1000, percent: 63 },
      {
        key: household,
        label: "Iris household",
        amountCents: 600,
        percent: 37,
      },
    ]);
  });

  it("counts only the first to the last day of the chosen month", () => {
    const usd = buildMySpending({
      month: "2026-11",
      personal: [
        personal(100, "2026-10-31"),
        personal(200, "2026-11-01"),
        personal(300, "2026-11-30"),
        personal(400, "2026-12-01"),
      ],
      shares: [],
    }).currencies[0];

    expect(usd.totalCents).toBe(500);
  });

  it("works across a year boundary", () => {
    const usd = buildMySpending({
      month: "2027-01",
      personal: [personal(100, "2026-12-31"), personal(250, "2027-01-01")],
      shares: [],
    }).currencies[0];

    expect(usd.totalCents).toBe(250);
    expect(usd.trend.map((month) => month.month)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(usd.trend.at(-2)).toEqual({ month: "2026-12", amountCents: 100 });
  });

  it("shows a 6-month trend with zero for months without spending", () => {
    const usd = buildMySpending({
      month: "2026-11",
      personal: [personal(500, "2026-09-15")],
      shares: [share(700, "2026-11-02")],
    }).currencies[0];

    expect(usd.trend).toEqual([
      { month: "2026-06", amountCents: 0 },
      { month: "2026-07", amountCents: 0 },
      { month: "2026-08", amountCents: 0 },
      { month: "2026-09", amountCents: 500 },
      { month: "2026-10", amountCents: 0 },
      { month: "2026-11", amountCents: 700 },
    ]);
  });

  it("merges a category used in several places and names a missing one", () => {
    const usd = buildMySpending({
      month: "2026-11",
      personal: [personal(400, "2026-11-01", "Groceries")],
      shares: [
        share(600, "2026-11-02", { category: "Groceries" }),
        share(250, "2026-11-03", { category: null }),
      ],
    }).currencies[0];

    expect(usd.byCategory).toEqual([
      { key: "Groceries", label: "Groceries", amountCents: 1000, percent: 80 },
      {
        key: "Uncategorized",
        label: "Uncategorized",
        amountCents: 250,
        percent: 20,
      },
    ]);
  });

  it("keeps each currency separate and treats personal expenses as USD", () => {
    const spending = buildMySpending({
      month: "2026-11",
      personal: [personal(1000, "2026-11-01")],
      shares: [
        share(500, "2026-11-02"),
        share(800, "2026-11-03", {
          groupId: trip,
          groupName: "Paris trip",
          currency: "EUR",
          category: "Dining",
        }),
      ],
    });

    expect(spending.currencies.map((entry) => entry.currency)).toEqual([
      "USD",
      "EUR",
    ]);
    expect(spending.currencies[0].totalCents).toBe(1500);
    expect(spending.currencies[1]).toMatchObject({
      currency: "EUR",
      totalCents: 800,
      bySource: [
        { key: trip, label: "Paris trip", amountCents: 800, percent: 100 },
      ],
    });
  });

  it("still returns USD with zero totals when nothing was spent", () => {
    const spending = buildMySpending({
      month: "2026-11",
      personal: [],
      shares: [],
    });

    expect(spending.currencies).toHaveLength(1);
    expect(spending.currencies[0]).toMatchObject({
      currency: "USD",
      totalCents: 0,
      byCategory: [],
      bySource: [],
    });
    expect(spending.currencies[0].trend).toHaveLength(6);
  });

  it("ignores zero shares", () => {
    const usd = buildMySpending({
      month: "2026-11",
      personal: [],
      shares: [share(0, "2026-11-02")],
    }).currencies[0];

    expect(usd.bySource).toEqual([]);
    expect(usd.byCategory).toEqual([]);
  });
});
