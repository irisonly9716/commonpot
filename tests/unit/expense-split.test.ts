import { describe, expect, it } from "vitest";
import {
  createExpense,
  splitEqually,
  validateExactSplit,
} from "../../src/lib/domain/expense-split.js";

describe("US3 log and split an expense", () => {
  it("distributes leftover cents one at a time in member order", () => {
    expect(splitEqually(100, ["alex", "blair", "casey"])).toEqual([
      { memberId: "alex", amountCents: 34 },
      { memberId: "blair", amountCents: 33 },
      { memberId: "casey", amountCents: 33 },
    ]);
  });

  it("supports an exact split only when shares equal the total", () => {
    expect(validateExactSplit(1000, [250, 750])).toEqual({ valid: true });
    expect(validateExactSplit(1000, [250, 700])).toEqual({
      valid: false,
      differenceCents: 50,
    });
  });

  it("creates an equal-split expense with required fields", () => {
    expect(
      createExpense({
        amount: "12.34",
        description: "Groceries",
        category: "food",
        date: "2026-10-30",
        paidBy: "alex",
        sharedBy: ["alex", "blair"],
        splitType: "equal",
      }),
    ).toEqual({
      amountCents: 1234,
      description: "Groceries",
      category: "food",
      date: "2026-10-30",
      paidBy: "alex",
      shares: [
        { memberId: "alex", amountCents: 617 },
        { memberId: "blair", amountCents: 617 },
      ],
    });
  });

  it("rejects malformed amounts and incomplete exact splits", () => {
    expect(() =>
      createExpense({
        amount: "0.001",
        description: "Coffee",
        category: "food",
        date: "2026-10-30",
        paidBy: "alex",
        sharedBy: ["alex"],
        splitType: "equal",
      }),
    ).toThrow("Amount must be greater than 0 and have at most 2 decimals");

    expect(() =>
      createExpense({
        amount: "10.00",
        description: "",
        category: "food",
        date: "2026-10-30",
        paidBy: "alex",
        sharedBy: ["alex", "blair"],
        splitType: "exact",
        exactAmounts: { alex: "4.00", blair: "5.00" },
      }),
    ).toThrow("Description is required");
  });
});
